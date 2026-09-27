import { sqlite, syntheticLabel } from "./sqlite";
import { canViewStudent } from "./access";
import { getStudentReport, searchStudents, type StudentReport, type StudentSummary } from "./reports";

export type AssistantIntent =
  | "student_report"
  | "student_search"
  | "student_count"
  | "attendance"
  | "fees"
  | "results"
  | "assignments"
  | "exams"
  | "general_info"
  | "unsupported";

export type ParsedAssistantQuery = {
  intent: AssistantIntent;
  studentName?: string;
  studentId?: string;
  department?: string;
  threshold?: number;
  courseCode?: string;
  countOnly?: boolean;
  includeDetails?: boolean;
  dueWindowDays?: number;
};

const departmentKeywords: Record<string, string> = {
  cse: "Computer Science",
  "computer science": "Computer Science",
  "cs": "Computer Science",
  "computer-science": "Computer Science",
  btech: "Computer Science",
  "business analytics": "Business Analytics",
  mba: "Business Analytics",
  "mechanical": "Mechanical Engineering",
  "mechanical engineering": "Mechanical Engineering",
  mse: "Mechanical Engineering",
  psychology: "Psychology",
  media: "Media & Communication",
  "media and communication": "Media & Communication",
  "communication": "Media & Communication",
  "general studies": "General Studies",
  "it": "Computer Science",
  "information technology": "Computer Science",
};

const stopWords = new Set([
  "show",
  "find",
  "get",
  "give",
  "pull",
  "display",
  "view",
  "the",
  "a",
  "an",
  "of",
  "for",
  "in",
  "on",
  "at",
  "to",
  "and",
  "or",
  "please",
  "me",
  "student",
  "students",
  "report",
  "profile",
  "details",
  "about",
  "who",
  "what",
  "when",
  "where",
  "which",
  "how",
  "many",
  "much",
  "are",
  "is",
  "this",
  "that",
  "semester",
  "this semester",
  "current",
  "summary",
  "complete",
  "full",
  "attendance",
  "fees",
  "fee",
  "results",
  "grade",
  "grades",
  "exam",
  "exams",
  "assignment",
  "assignments",
  "dues",
  "due",
  "pending",
  "explain",
  "below",
  "above",
  "under",
  "over",
  "more",
  "less",
  "than",
  "percent",
  "percentage",
  "percentile",
  "total",
  "count",
  "enrolled",
  "enrollment",
  "campus",
  "college",
  "department",
  "course",
  "subject",
  "subjects",
  "list",
  "compare",
  "shortage",
  "has",
  "have",
  "schedule",
  "scheduled",
  "timetable",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanEntityText(value: string): string {
  return value
    .replace(/\b(show|find|get|give|display|view|student|students|report|profile|details|of|for|the|please|me|current|semester|complete|full|summary)\b/gi, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStudentId(message: string): string | undefined {
  const match = message.match(/\bCM\d{7}\b/i);
  return match ? match[0].toUpperCase() : undefined;
}

function extractStudentName(message: string): string | undefined {
  const studentId = extractStudentId(message);
  if (studentId) {
    return undefined;
  }

  const cleaned = cleanEntityText(message)
    .split(" ")
    .filter((token) => token && /^[a-z]+$/i.test(token) && !stopWords.has(token))
    .join(" ")
    .trim();

  const synonyms = ["abhay", "singh", "harsh", "meera", "arjun", "kavya"];
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.includes(" ") || synonyms.some((synonym) => cleaned.includes(synonym))) {
    return cleaned;
  }

  return cleaned;
}

function extractDepartment(message: string): string | undefined {
  const normalized = normalizeText(message);
  for (const [key, value] of Object.entries(departmentKeywords)) {
    if (normalized.includes(key)) return value;
  }
  return undefined;
}

function extractThreshold(message: string): number | undefined {
  const match = message.match(/(?:below|under|less than|lesser than|at or below|below\s*\(?\s*)(\d{1,3})(?:\s*%|\s*percent|\s*percentage)?/i);
  const match2 = message.match(/(?:above|over|greater than|more than|at least|above\s*)(\d{1,3})(?:\s*%|\s*percent|\s*percentage)?/i);
  const match3 = message.match(/(\d{1,3})(?:\s*%|\s*percent|\s*percentage)/i);

  if (match) return Number(match[1]);
  if (match2) return Number(match2[1]);
  if (match3) return Number(match3[1]);
  return undefined;
}

function extractCourseCode(message: string): string | undefined {
  const match = message.match(/\b[A-Z]{2,5}\d{2,4}\b/);
  return match ? match[0].toUpperCase() : undefined;
}

function extractCourseSearch(message: string): string | undefined {
  const explicitCode = extractCourseCode(message);
  if (explicitCode) return explicitCode;

  const match = message.match(/(?:for|in)\s+([a-z][a-z0-9 &-]{1,60})[?.!]*$/i);
  return match?.[1].trim();
}

function parseQuery(message: string): ParsedAssistantQuery {
  const studentId = extractStudentId(message);
  const department = extractDepartment(message);
  const threshold = extractThreshold(message);
  const courseCode = extractCourseSearch(message);

  const isCountQuery = /(how many|count|total number|number of|total students|students enrolled|enrolled)/i.test(message);
  const isReportQuery = /(complete report|full report|profile|student report|details of|report of|report for)/i.test(message) || /report/i.test(message);
  const isFeesQuery = /(fee|fees|dues|pending fee|pending fees|due fee|due fees|fee balance|balance)/i.test(message);
  const isAttendanceQuery = /(attendance|absent|absentees|shortage|below|under|above|over|percent)/i.test(message) && /(attendance|shortage|absent|percent)/i.test(message);
  const isResultsQuery = /(result|results|marks|grade|grades|cgpa|gpa|performance)/i.test(message);
  const isAssignmentsQuery = /(assignment|assignments|submission|submissions|deadline|due this week|overdue)/i.test(message);
  const isExamsQuery = /(exam|exams|schedule|scheduled|timetable|upcoming examination|test|exam schedule)/i.test(message);
  const isGeneralInfoQuery = /(campus|college|enrolled|courses|students are enrolled|department|academic|overview)/i.test(message);

  const studentName = studentId ? undefined : extractStudentName(message);

  if (isReportQuery && (studentId || studentName)) {
    return { intent: "student_report", studentId, studentName, department, countOnly: false, includeDetails: true };
  }

  if (department && isCountQuery) {
    return { intent: "student_count", studentId, studentName, department, threshold, countOnly: true };
  }

  if (isCountQuery) {
    return {
      intent: studentName || studentId ? "student_count" : "general_info",
      studentId,
      studentName,
      department,
      threshold,
      countOnly: true,
    };
  }

  if (isAttendanceQuery) {
    return { intent: "attendance", studentId, studentName, department, threshold, courseCode, countOnly: false, includeDetails: true };
  }

  if (isFeesQuery) {
    return { intent: "fees", studentId, studentName, department, threshold, countOnly: false, includeDetails: true };
  }

  if (isResultsQuery) {
    return { intent: "results", studentId, studentName, department, courseCode, countOnly: false, includeDetails: true };
  }

  if (isAssignmentsQuery) {
    return { intent: "assignments", studentId, studentName, department, courseCode, dueWindowDays: 7, countOnly: false, includeDetails: true };
  }

  if (isExamsQuery) {
    return { intent: "exams", studentId, studentName, department, courseCode, countOnly: false, includeDetails: true };
  }

  if (isGeneralInfoQuery) {
    return { intent: "general_info", studentId, studentName, department, threshold, countOnly: false, includeDetails: true };
  }

  if (studentId || studentName) {
    return { intent: "student_search", studentId, studentName, department, countOnly: false, includeDetails: true };
  }

  return { intent: "unsupported" };
}

function getVisibleStudentSummaries(access: { role: string; studentId?: string; facultyName?: string }) {
  const rows = searchStudents({ limit: 1000 });
  return rows.filter((row) => canViewStudent(access as any, row.studentId));
}

function answerUnsupported(): string {
  return "I can help with student records, attendance, fees, results, assignments, exams, and campus overview. Ask about a specific student, department, course, or threshold, and I’ll query the database for the answer.";
}

function answerStudentCount(matches: StudentSummary[], access: { role: string; studentId?: string; facultyName?: string }, department?: string): string {
  const visible = matches.filter((match) => canViewStudent(access as any, match.studentId));
  const count = visible.length;
  if (department) {
    return `I found ${count} visible student${count === 1 ? "" : "s"} in ${department}.`;
  }
  if (count === 1) {
    return "I found 1 matching student.";
  }
  return `I found ${count} matching student${count === 1 ? "" : "s"}.`;
}

function getCurrentSemesterId(): number {
  const row = sqlite
    .prepare("SELECT id FROM semesters WHERE is_current = 1 ORDER BY start_date DESC LIMIT 1")
    .get() as { id: number } | undefined;
  return row?.id ?? 0;
}

export function resolveAssistantQuery(message: string, access: { role: string; studentId?: string; facultyName?: string }) {
  const parsed = parseQuery(message);
  const studentId = parsed.studentId ?? (parsed.studentName ? undefined : undefined);
  const normalized = normalizeText(message);

  if (parsed.intent === "unsupported") {
    return {
      answer: answerUnsupported(),
      intent: "unsupported",
      report: null,
      matches: [],
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "student_report") {
    const target = parsed.studentId
      ? parsed.studentId
      : parsed.studentName
        ? searchStudents({ search: parsed.studentName, limit: 10 }).find((student) => canViewStudent(access as any, student.studentId))?.studentId
        : undefined;

    if (!target) {
      const matches = parsed.studentName ? searchStudents({ search: parsed.studentName, limit: 10 }) : [];
      const visibleMatches = matches.filter((match) => canViewStudent(access as any, match.studentId));
      return {
        answer: `I couldn’t find a matching student record for “${parsed.studentName ?? "that request"}”. Try a full name or student ID such as CM2026001.`,
        intent: "student_report",
        report: null,
        matches: visibleMatches,
        needsClarification: visibleMatches.length > 0,
        syntheticLabel,
      };
    }

    const report = getStudentReport(target);
    if (!report) {
      return {
        answer: "I couldn’t generate a report for that student from the current database.",
        intent: "student_report",
        report: null,
        matches: [],
        needsClarification: false,
        syntheticLabel,
      };
    }

    return {
      answer: `${report.profile.name} (${report.profile.studentId}) is in ${report.profile.department}, year ${report.profile.year}. Attendance is ${report.totals.attendancePercentage}% with ${report.totals.attendanceShortage} classes of shortage. Fees pending total ₹${report.totals.feePending.toLocaleString("en-IN")}; ${report.results.length} results are recorded this semester and ${report.upcomingExams.length} exams are scheduled.`,
      intent: "student_report",
      report,
      matches: [{ ...report.profile, email: report.profile.email, department: report.profile.department, year: report.profile.year, avatarSeed: report.profile.studentId }],
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "student_count") {
    const department = parsed.department;
    const matches = department
      ? searchStudents({ limit: 1000 }).filter((student) => student.department === department)
      : searchStudents({ search: parsed.studentName ?? "", limit: 1000 });
    const visibleMatches = matches.filter((match) => canViewStudent(access as any, match.studentId));
    return {
      answer: answerStudentCount(visibleMatches, access, parsed.department),
      intent: "student_count",
      report: null,
      matches: visibleMatches.slice(0, 10),
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "attendance") {
    const threshold = parsed.threshold ?? 75;
    const studentName = parsed.studentName;
    const selectedStudentId = studentName ? searchStudents({ search: studentName, limit: 10 }).find((s) => canViewStudent(access as any, s.studentId))?.studentId : parsed.studentId;

    if (selectedStudentId) {
      const report = getStudentReport(selectedStudentId);
      if (!report) {
        return { answer: `I couldn’t find attendance data for that student.`, intent: "attendance", report: null, matches: [], needsClarification: false, syntheticLabel };
      }
      const belowThreshold = report.attendance.filter((item) => item.percentage < threshold);
      const summary = belowThreshold.length
        ? `${report.profile.name} has ${belowThreshold.length} course${belowThreshold.length === 1 ? "" : "s"} below ${threshold}%, including ${belowThreshold.slice(0, 3).map((item) => `${item.courseCode} (${item.percentage}%)`).join(", ")}.`
        : `${report.profile.name} is currently above the ${threshold}% threshold in all tracked courses.`;
      return { answer: summary, intent: "attendance", report, matches: [], needsClarification: false, syntheticLabel };
    }

    const rows = sqlite
      .prepare(
        `SELECT s.student_id, s.first_name, s.last_name, ROUND(AVG((a.classes_attended * 100.0) / a.classes_held), 1) AS pct
         FROM students s
         JOIN attendance a ON a.student_id = s.id
         WHERE a.semester_id = ?
         GROUP BY s.id
         HAVING pct < ?
         ORDER BY pct ASC
         LIMIT 10`,
      )
      .all(getCurrentSemesterId(), threshold) as Array<{ student_id: string; first_name: string; last_name: string; pct: number }>;

    const visibleRows = rows.filter((row) => canViewStudent(access as any, row.student_id));
    if (!visibleRows.length) {
      return { answer: `No visible student is below ${threshold}% attendance this semester.`, intent: "attendance", report: null, matches: [], needsClarification: false, syntheticLabel };
    }

    return {
      answer: `The following students are below ${threshold}% attendance: ${visibleRows.map((row) => `${row.first_name} ${row.last_name} (${row.pct}%)`).join(", ")}.`,
      intent: "attendance",
      report: null,
      matches: visibleRows.map((row) => ({ studentId: row.student_id, name: `${row.first_name} ${row.last_name}`, email: "", department: "", year: 0, avatarSeed: row.student_id })),
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "fees") {
    const rows = sqlite
      .prepare(
        `SELECT s.student_id, s.first_name, s.last_name, s.department,
                COALESCE(SUM(sf.total - COALESCE(pa.paid, 0)), 0) AS pending,
                COALESCE(SUM(sf.total), 0) AS total
         FROM students s
         LEFT JOIN student_fees sf ON sf.student_id = s.id AND sf.semester_id = ?
         LEFT JOIN (
           SELECT student_fee_id, SUM(amount) AS paid
           FROM payments
           GROUP BY student_fee_id
         ) pa ON pa.student_fee_id = sf.id
         GROUP BY s.id
         HAVING pending > 0
         ORDER BY pending DESC
         LIMIT 10`,
      )
      .all(getCurrentSemesterId()) as Array<{ student_id: string; first_name: string; last_name: string; department: string; pending: number; total: number }>;

    const visibleRows = rows.filter((row) => canViewStudent(access as any, row.student_id));
    if (!visibleRows.length) {
      return { answer: "There are no pending fee balances for the visible students in the current semester.", intent: "fees", report: null, matches: [], needsClarification: false, syntheticLabel };
    }

    const topStudents = visibleRows.slice(0, 5).map((row) => `${row.first_name} ${row.last_name} (₹${Number(row.pending).toLocaleString("en-IN")})`).join(", ");
    return {
      answer: `Pending fees are outstanding for ${visibleRows.length} student${visibleRows.length === 1 ? "" : "s"}: ${topStudents}.`,
      intent: "fees",
      report: null,
      matches: visibleRows.map((row) => ({ studentId: row.student_id, name: `${row.first_name} ${row.last_name}`, email: "", department: row.department, year: 0, avatarSeed: row.student_id })),
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "results") {
    const target = parsed.studentId ?? (parsed.studentName ? searchStudents({ search: parsed.studentName, limit: 10 }).find((s) => canViewStudent(access as any, s.studentId))?.studentId : undefined);
    if (!target) {
      return { answer: "I can show results for a specific student by name or ID. For example, ask for Abhay Singh’s results or CM2026001.", intent: "results", report: null, matches: [], needsClarification: false, syntheticLabel };
    }
    const report = getStudentReport(target);
    if (!report) {
      return { answer: "I couldn’t find result data for that student.", intent: "results", report: null, matches: [], needsClarification: false, syntheticLabel };
    }
    const best = [...report.results].sort((a, b) => b.totalMarks - a.totalMarks)[0];
    if (!best) {
      return { answer: `${report.profile.name} has no recorded results in the current semester.`, intent: "results", report, matches: [], needsClarification: false, syntheticLabel };
    }
    return { answer: `${report.profile.name} is currently performing strongest in ${best.courseCode} with ${best.totalMarks}/100 (${best.grade}).`, intent: "results", report, matches: [], needsClarification: false, syntheticLabel };
  }

  if (parsed.intent === "assignments") {
    const target = parsed.studentId ?? (parsed.studentName ? searchStudents({ search: parsed.studentName, limit: 10 }).find((s) => canViewStudent(access as any, s.studentId))?.studentId : undefined);
    const days = parsed.dueWindowDays ?? 7;
    const rows = sqlite
      .prepare(
        `SELECT a.title, c.code AS courseCode, a.due_date AS dueDate, s.status, s.student_id
         FROM assignments a
         JOIN courses c ON c.id = a.course_id
         JOIN semesters se ON se.id = a.semester_id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = (SELECT id FROM students WHERE student_id = ?)
         WHERE se.is_current = 1 AND date(a.due_date) BETWEEN date('now') AND date('now', '+' || ? || ' days')
         ORDER BY a.due_date ASC
         LIMIT 10`,
      )
      .all(target ?? "CM2026001", days) as Array<{ title: string; courseCode: string; dueDate: string; status: string | null; student_id: string }>;

    if (!rows.length) {
      return { answer: `There are no assignments due in the next ${days} days for the selected student.`, intent: "assignments", report: null, matches: [], needsClarification: false, syntheticLabel };
    }

    return {
      answer: `Assignments due in the next ${days} days: ${rows.map((row) => `${row.title} (${row.courseCode}, due ${row.dueDate})`).join("; ")}.`,
      intent: "assignments",
      report: null,
      matches: [],
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "exams") {
    const courseFilter = parsed.courseCode?.trim();
    const rows = sqlite
      .prepare(
        `SELECT e.title, c.code AS courseCode, e.exam_date AS examDate, e.room
         FROM exams e
         JOIN courses c ON c.id = e.course_id
         JOIN semesters se ON se.id = e.semester_id
         WHERE se.is_current = 1 AND date(e.exam_date) >= date('now')
           AND (? IS NULL OR UPPER(c.code) = UPPER(?) OR LOWER(c.name) LIKE '%' || LOWER(?) || '%')
         ORDER BY e.exam_date ASC
         LIMIT 10`,
      )
      .all(courseFilter ?? null, courseFilter ?? null, courseFilter ?? null) as Array<{ title: string; courseCode: string; examDate: string; room: string }>;

    if (!rows.length) {
      const answer = courseFilter
        ? `There is no upcoming exam schedule for ${courseFilter.toUpperCase()} in the current dataset.`
        : "There are no upcoming exam dates in the current semester.";
      return { answer, intent: "exams", report: null, matches: [], needsClarification: false, syntheticLabel };
    }

    return {
      answer: `Upcoming exams: ${rows.map((row) => `${row.title} (${row.courseCode}) on ${row.examDate} in ${row.room}`).join("; ")}.`,
      intent: "exams",
      report: null,
      matches: [],
      needsClarification: false,
      syntheticLabel,
    };
  }

  if (parsed.intent === "general_info") {
    const totalStudents = (sqlite.prepare("SELECT COUNT(*) AS count FROM students").get() as { count: number }).count;
    const totalCourses = (sqlite.prepare("SELECT COUNT(*) AS count FROM courses").get() as { count: number }).count;
    const activeSemesters = (sqlite.prepare("SELECT COUNT(*) AS count FROM semesters WHERE is_current = 1").get() as { count: number }).count;
    return {
      answer: `The current campus dataset includes ${totalStudents} students across ${totalCourses} courses and ${activeSemesters} active semester${activeSemesters === 1 ? "" : "s"}.`,
      intent: "general_info",
      report: null,
      matches: [],
      needsClarification: false,
      syntheticLabel,
    };
  }

  return {
    answer: answerUnsupported(),
    intent: "unsupported",
    report: null,
    matches: [],
    needsClarification: false,
    syntheticLabel,
  };
}

export { parseQuery };
