import { sqlite, syntheticLabel } from "./sqlite";

type StudentRow = {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  year: number;
  date_of_birth: string;
  enrollment_date: string;
  avatar_seed: string;
  synthetic_label: string;
};

type StudentSummaryRow = Pick<
  StudentRow,
  "student_id" | "first_name" | "last_name" | "email" | "department" | "year" | "avatar_seed"
>;

export type StudentSummary = {
  studentId: string;
  name: string;
  email: string;
  department: string;
  year: number;
  avatarSeed: string;
};

export type StudentReport = {
  profile: {
    studentId: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    year: number;
    dateOfBirth: string;
    enrollmentDate: string;
    syntheticLabel: string;
  };
  semesters: Array<{
    semester: string;
    academicYear: string;
    gpa: number;
    credits: number;
    status: string;
  }>;
  attendance: Array<{
    courseCode: string;
    courseName: string;
    attended: number;
    held: number;
    percentage: number;
    shortage: number;
    status: string;
  }>;
  fees: Array<{
    semester: string;
    total: number;
    paid: number;
    pending: number;
    status: string;
  }>;
  assignments: Array<{
    title: string;
    courseCode: string;
    dueDate: string;
    score: number | null;
    maxMarks: number;
    status: string;
  }>;
  upcomingExams: Array<{
    title: string;
    courseCode: string;
    examDate: string;
    room: string;
  }>;
  results: Array<{
    courseCode: string;
    courseName: string;
    internalMarks: number;
    examMarks: number;
    totalMarks: number;
    grade: string;
    gradePoint: number;
  }>;
  totals: {
    feeTotal: number;
    feePaid: number;
    feePending: number;
    attendancePercentage: number;
    attendanceShortage: number;
  };
  syntheticLabel: string;
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summaryFromRow(row: StudentSummaryRow): StudentSummary {
  return {
    studentId: row.student_id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    department: row.department,
    year: row.year,
    avatarSeed: row.avatar_seed,
  };
}

export function searchStudents(query: {
  search?: string;
  studentId?: string;
  limit?: number;
}): StudentSummary[] {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 500);
  const search = query.search?.trim().toLowerCase();
  const studentId = query.studentId?.trim().toUpperCase();

  if (!search && !studentId) {
    const rows = sqlite
      .prepare(
        `SELECT student_id, first_name, last_name, email, department, year, avatar_seed
         FROM students ORDER BY last_name, first_name LIMIT ?`,
      )
      .all(limit) as StudentSummaryRow[];
    return rows.map(summaryFromRow);
  }

  const match = studentId ?? `%${search}%`;
  const rows = sqlite
    .prepare(
      `SELECT student_id, first_name, last_name, email, department, year, avatar_seed
       FROM students
       WHERE upper(student_id) LIKE ?
          OR lower(first_name || ' ' || last_name) LIKE ?
          OR lower(first_name) LIKE ?
          OR lower(last_name) LIKE ?
       ORDER BY last_name, first_name
       LIMIT ?`,
    )
    .all(
      studentId ? `${match}%` : match,
      search ? `%${search}%` : "__no_name_match__",
      search ? `%${search}%` : "__no_name_match__",
      search ? `%${search}%` : "__no_name_match__",
      limit,
    ) as StudentSummaryRow[];
  return rows.map(summaryFromRow);
}

export function getStudentReport(studentId: string): StudentReport | null {
  const student = sqlite
    .prepare("SELECT * FROM students WHERE upper(student_id) = upper(?)")
    .get(studentId.trim()) as StudentRow | undefined;
  if (!student) return null;

  const semesters = sqlite
    .prepare(
      `SELECT
        se.name AS semester,
        se.academic_year AS academicYear,
        COALESCE(AVG(r.grade_point), 0) AS gpa,
        COALESCE(SUM(c.credits), 0) AS credits,
        CASE WHEN se.is_current = 1 THEN 'current' ELSE 'completed' END AS status
       FROM semesters se
       LEFT JOIN results r ON r.semester_id = se.id AND r.student_id = ?
       LEFT JOIN courses c ON c.id = r.course_id
       GROUP BY se.id
       ORDER BY se.start_date DESC`,
    )
    .all(student.id) as Array<{
    semester: string;
    academicYear: string;
    gpa: number;
    credits: number;
    status: string;
  }>;

  const attendanceRows = sqlite
    .prepare(
      `SELECT c.code AS courseCode, c.name AS courseName,
        a.classes_attended AS attended, a.classes_held AS held,
        ROUND((a.classes_attended * 100.0) / a.classes_held, 1) AS percentage
       FROM attendance a
       JOIN courses c ON c.id = a.course_id
       JOIN semesters se ON se.id = a.semester_id
       WHERE a.student_id = ? AND se.is_current = 1
       ORDER BY percentage ASC, c.code`,
    )
    .all(student.id) as Array<{
    courseCode: string;
    courseName: string;
    attended: number;
    held: number;
    percentage: number;
  }>;

  const attendance = attendanceRows.map((row) => ({
    ...row,
    shortage: Math.max(0, Math.ceil(row.held * 0.75) - row.attended),
    status: row.percentage < 75 ? "shortage" : row.percentage < 80 ? "watch" : "healthy",
  }));

  const fees = sqlite
    .prepare(
      `SELECT se.name AS semester, sf.total AS total,
        COALESCE(SUM(p.amount), 0) AS paid,
        sf.total - COALESCE(SUM(p.amount), 0) AS pending
       FROM student_fees sf
       JOIN semesters se ON se.id = sf.semester_id
       LEFT JOIN payments p ON p.student_fee_id = sf.id
       WHERE sf.student_id = ?
       GROUP BY sf.id
       ORDER BY se.start_date DESC`,
    )
    .all(student.id) as Array<{
    semester: string;
    total: number;
    paid: number;
    pending: number;
  }>;
  const feeReport = fees.map((fee) => ({
    ...fee,
    status: fee.pending <= 0 ? "paid" : fee.paid > 0 ? "partial" : "pending",
  }));

  const assignments = sqlite
    .prepare(
      `SELECT a.title, c.code AS courseCode, a.due_date AS dueDate,
        s.score AS score, a.max_marks AS maxMarks,
        COALESCE(s.status, 'pending') AS status
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       JOIN semesters se ON se.id = a.semester_id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
       WHERE se.is_current = 1
       ORDER BY a.due_date ASC, c.code`,
    )
    .all(student.id) as Array<{
    title: string;
    courseCode: string;
    dueDate: string;
    score: number | null;
    maxMarks: number;
    status: string;
  }>;

  const upcomingExams = sqlite
    .prepare(
      `SELECT e.title, c.code AS courseCode, e.exam_date AS examDate, e.room
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       JOIN semesters se ON se.id = e.semester_id
       JOIN enrollments en ON en.course_id = e.course_id AND en.semester_id = e.semester_id
       WHERE en.student_id = ? AND se.is_current = 1
       ORDER BY e.exam_date ASC
       LIMIT 8`,
    )
    .all(student.id) as Array<{
    title: string;
    courseCode: string;
    examDate: string;
    room: string;
  }>;

  const results = sqlite
    .prepare(
      `SELECT c.code AS courseCode, c.name AS courseName,
        r.internal_marks AS internalMarks, r.exam_marks AS examMarks,
        r.total_marks AS totalMarks, r.grade, r.grade_point AS gradePoint
       FROM results r
       JOIN courses c ON c.id = r.course_id
       JOIN semesters se ON se.id = r.semester_id
       WHERE r.student_id = ? AND se.is_current = 1
       ORDER BY c.code`,
    )
    .all(student.id) as Array<{
    courseCode: string;
    courseName: string;
    internalMarks: number;
    examMarks: number;
    totalMarks: number;
    grade: string;
    gradePoint: number;
  }>;

  const totalsRow = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(sf.total), 0) AS feeTotal,
        COALESCE(SUM(paid.paid), 0) AS feePaid,
        COALESCE(SUM(sf.total - COALESCE(paid.paid, 0)), 0) AS feePending,
        COALESCE(SUM(att.attended), 0) AS attended,
        COALESCE(SUM(att.held), 0) AS held
       FROM student_fees sf
       LEFT JOIN (
         SELECT student_fee_id, SUM(amount) AS paid
         FROM payments GROUP BY student_fee_id
       ) paid ON paid.student_fee_id = sf.id
       LEFT JOIN (
         SELECT student_id, SUM(classes_attended) AS attended, SUM(classes_held) AS held
         FROM attendance WHERE semester_id = (SELECT id FROM semesters WHERE is_current = 1)
         GROUP BY student_id
       ) att ON att.student_id = sf.student_id
       WHERE sf.student_id = ?`,
    )
    .get(student.id) as {
    feeTotal: number;
    feePaid: number;
    feePending: number;
    attended: number;
    held: number;
  };

  const totalHeld = Number(totalsRow.held || 0);
  const totalAttended = Number(totalsRow.attended || 0);
  const attendancePercentage = totalHeld ? round((totalAttended * 100) / totalHeld) : 0;
  const attendanceShortage = attendance.reduce((sum, item) => sum + item.shortage, 0);

  return {
    profile: {
      studentId: student.student_id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
      phone: student.phone,
      department: student.department,
      year: student.year,
      dateOfBirth: student.date_of_birth,
      enrollmentDate: student.enrollment_date,
      syntheticLabel,
    },
    semesters: semesters.map((semester) => ({
      ...semester,
      gpa: round(Number(semester.gpa), 2),
      credits: Number(semester.credits),
    })),
    attendance: attendance.map((item) => ({
      ...item,
      attended: Number(item.attended),
      held: Number(item.held),
      percentage: Number(item.percentage),
    })),
    fees: feeReport.map((fee) => ({
      ...fee,
      total: Number(fee.total),
      paid: Number(fee.paid),
      pending: Number(fee.pending),
    })),
    assignments: assignments.map((assignment) => ({
      ...assignment,
      score: assignment.score == null ? null : Number(assignment.score),
      maxMarks: Number(assignment.maxMarks),
    })),
    upcomingExams,
    results: results.map((result) => ({
      ...result,
      internalMarks: Number(result.internalMarks),
      examMarks: Number(result.examMarks),
      totalMarks: Number(result.totalMarks),
      gradePoint: Number(result.gradePoint),
    })),
    totals: {
      feeTotal: Number(totalsRow.feeTotal),
      feePaid: Number(totalsRow.feePaid),
      feePending: Number(totalsRow.feePending),
      attendancePercentage,
      attendanceShortage,
    },
    syntheticLabel,
  };
}

export function getDashboardSummary() {
  const totalStudents = (sqlite.prepare("SELECT COUNT(*) AS count FROM students").get() as { count: number }).count;
  const totalCourses = (sqlite.prepare("SELECT COUNT(*) AS count FROM courses").get() as { count: number }).count;
  const activeSemesters = (sqlite.prepare("SELECT COUNT(*) AS count FROM semesters WHERE is_current = 1").get() as { count: number }).count;
  const attendanceAtRisk = (
    sqlite
      .prepare(
        `SELECT COUNT(DISTINCT student_id) AS count FROM attendance
         WHERE semester_id = (SELECT id FROM semesters WHERE is_current = 1)
           AND classes_attended * 100.0 / classes_held < 75`,
      )
      .get() as { count: number }
  ).count;
  const pendingFees = (
    sqlite
      .prepare(
        `SELECT COALESCE(SUM(sf.total - COALESCE(p.paid, 0)), 0) AS pending
         FROM student_fees sf
         LEFT JOIN (SELECT student_fee_id, SUM(amount) AS paid FROM payments GROUP BY student_fee_id) p
           ON p.student_fee_id = sf.id
         WHERE sf.semester_id = (SELECT id FROM semesters WHERE is_current = 1)`,
      )
      .get() as { pending: number }
  ).pending;
  const assignmentsDue = (
    sqlite
      .prepare(
        `SELECT COUNT(*) AS count FROM assignments
         WHERE semester_id = (SELECT id FROM semesters WHERE is_current = 1)`,
      )
      .get() as { count: number }
  ).count;

  return {
    totalStudents: Number(totalStudents),
    totalCourses: Number(totalCourses),
    activeSemesters: Number(activeSemesters),
    attendanceAtRisk: Number(attendanceAtRisk),
    pendingFees: Number(pendingFees),
    assignmentsDue: Number(assignmentsDue),
    syntheticLabel,
  };
}

export function reportAsCsv(report: StudentReport): string {
  const escape = (value: string | number | null) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    ["CampusMind AI student report", report.syntheticLabel],
    ["Student ID", report.profile.studentId],
    ["Name", report.profile.name],
    ["Department", report.profile.department],
    [],
    ["Attendance", "", "", "", ""],
    ["Course", "Attended", "Held", "Percentage", "Shortage", "Status"],
    ...report.attendance.map((item) => [
      item.courseCode,
      item.attended,
      item.held,
      item.percentage,
      item.shortage,
      item.status,
    ]),
    [],
    ["Fees", "", "", "", ""],
    ["Semester", "Total", "Paid", "Pending", "Status"],
    ...report.fees.map((item) => [item.semester, item.total, item.paid, item.pending, item.status]),
    [],
    ["Results", "", "", "", ""],
    ["Course", "Internal", "Exam", "Total", "Grade", "Grade point"],
    ...report.results.map((item) => [
      item.courseCode,
      item.internalMarks,
      item.examMarks,
      item.totalMarks,
      item.grade,
      item.gradePoint,
    ]),
  ];
  return lines.map((line) => line.map(escape).join(",")).join("\n");
}

export { syntheticLabel };