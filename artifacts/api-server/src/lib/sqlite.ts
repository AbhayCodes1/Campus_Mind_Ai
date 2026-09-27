import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { logger } from "./logger";

const preferredDataDirCandidates = [
  path.resolve(process.cwd(), "artifacts", "api-server", "data"),
  path.resolve(process.cwd(), "data"),
  path.resolve(process.cwd(), "..", "artifacts", "api-server", "data"),
  path.resolve(process.cwd(), "..", "data"),
];

const dataDir =
  preferredDataDirCandidates.find((candidate) => {
    const maybeApiServerDir = path.join(candidate, "..", "..");
    return (
      candidate.endsWith(path.join("api-server", "data")) ||
      fs.existsSync(path.join(path.dirname(candidate), "api-server")) ||
      fs.existsSync(candidate)
    );
  }) ?? path.resolve(process.cwd(), "artifacts", "api-server", "data");

fs.mkdirSync(dataDir, { recursive: true });

const sqlitePath = process.env.CAMPUSMIND_SQLITE_PATH ??
  path.join(dataDir, "campusmind-demo.sqlite");

logger.info({ sqlitePath }, "Initializing CampusMind SQLite database");

export const sqlite = new Database(sqlitePath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

type SeedStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  year: number;
  dateOfBirth: string;
  enrollmentDate: string;
  avatarSeed: string;
};

const firstNames = [
  "Abhay",
  "Aarav",
  "Aisha",
  "Ananya",
  "Arjun",
  "Diya",
  "Eshan",
  "Fatima",
  "Harsh",
  "Ishita",
  "Kabir",
  "Kavya",
  "Laksh",
  "Meera",
  "Nikhil",
  "Nisha",
  "Om",
  "Pranav",
  "Rhea",
  "Rohan",
  "Saanvi",
  "Sameer",
  "Shreya",
  "Tara",
  "Ved",
  "Yash",
];

const lastNames = [
  "Singh",
  "Sharma",
  "Iyer",
  "Patel",
  "Reddy",
  "Nair",
  "Kapoor",
  "Chatterjee",
  "Das",
  "Verma",
  "Joshi",
  "Bose",
  "Mehta",
  "Menon",
  "Pillai",
  "Rao",
  "Malhotra",
  "Khan",
  "Bhat",
  "Ghosh",
];

const departments = [
  "Computer Science",
  "Business Analytics",
  "Mechanical Engineering",
  "Psychology",
  "Media & Communication",
];

const courses = [
  ["CS101", "Programming Foundations", "Computer Science", 4],
  ["CS204", "Data Structures", "Computer Science", 4],
  ["CS310", "Applied Machine Learning", "Computer Science", 3],
  ["BA110", "Business Statistics", "Business Analytics", 3],
  ["BA220", "Product Strategy", "Business Analytics", 3],
  ["ME120", "Engineering Mechanics", "Mechanical Engineering", 4],
  ["ME245", "Sustainable Design", "Mechanical Engineering", 3],
  ["PSY115", "Cognitive Psychology", "Psychology", 3],
  ["PSY230", "Research Methods", "Psychology", 4],
  ["MC101", "Media Writing", "Media & Communication", 3],
  ["MC205", "Digital Storytelling", "Media & Communication", 3],
  ["GEN150", "Ethics & Society", "General Studies", 2],
] as const;

const faculty = ["Dr. Meera Iyer", "Prof. Arjun Rao", "Dr. Kavya Menon"];
const syntheticLabel = "SYNTHETIC DEMO DATA — NOT A REAL PERSON";

function makeStudents(): SeedStudent[] {
  return Array.from({ length: 500 }, (_, index) => {
    const isAbhay = index === 0;
    const firstName = isAbhay ? "Abhay" : firstNames[index % firstNames.length];
    const lastName = isAbhay ? "Singh" : lastNames[Math.floor(index / 3) % lastNames.length];
    const studentId = `CM${String(2026001 + index)}`;
    return {
      studentId,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index + 1}@demo.campusmind.edu`,
      phone: `+91 90000 ${String(10000 + index).slice(-5)}`,
      department: departments[index % departments.length],
      year: (index % 4) + 1,
      dateOfBirth: `${2000 + (index % 5)}-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 25) + 1).padStart(2, "0")}`,
      enrollmentDate: `${2023 + (index % 3)}-07-15`,
      avatarSeed: `${firstName}-${lastName}-${index}`,
    };
  });
}

export function initializeSqlite(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      date_of_birth TEXT NOT NULL,
      enrollment_date TEXT NOT NULL,
      avatar_seed TEXT NOT NULL,
      synthetic_label TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      credits INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      faculty_name TEXT NOT NULL,
      UNIQUE(student_id, course_id, semester_id)
    );
    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      tuition INTEGER NOT NULL,
      hostel INTEGER NOT NULL,
      lab INTEGER NOT NULL,
      other INTEGER NOT NULL,
      total INTEGER NOT NULL,
      due_date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS student_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      fee_structure_id INTEGER NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
      total INTEGER NOT NULL,
      UNIQUE(student_id, semester_id)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_fee_id INTEGER NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      paid_at TEXT NOT NULL,
      reference TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      classes_held INTEGER NOT NULL,
      classes_attended INTEGER NOT NULL,
      UNIQUE(student_id, course_id, semester_id)
    );
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      max_marks INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      submitted_at TEXT,
      score INTEGER,
      status TEXT NOT NULL,
      UNIQUE(assignment_id, student_id)
    );
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      room TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      internal_marks INTEGER NOT NULL,
      exam_marks INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      grade TEXT NOT NULL,
      grade_point REAL NOT NULL,
      UNIQUE(student_id, course_id, semester_id)
    );
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_user_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
      faculty_name TEXT,
      synthetic_label TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);
    CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
  `);

  const existing = sqlite
    .prepare("SELECT COUNT(*) AS count FROM students")
    .get() as { count: number };
  if (existing.count > 0) return;

  seedSyntheticData();
  logger.info("Seeded CampusMind SQLite database with synthetic demo data");
}

function seedSyntheticData(): void {
  const insertStudent = sqlite.prepare(`
    INSERT INTO students
      (student_id, first_name, last_name, email, phone, department, year,
       date_of_birth, enrollment_date, avatar_seed, synthetic_label)
    VALUES (@studentId, @firstName, @lastName, @email, @phone, @department,
      @year, @dateOfBirth, @enrollmentDate, @avatarSeed, @syntheticLabel)
  `);
  const insertCourse = sqlite.prepare(
    "INSERT INTO courses (code, name, department, credits) VALUES (?, ?, ?, ?)",
  );
  const insertSemester = sqlite.prepare(
    "INSERT INTO semesters (name, academic_year, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)",
  );
  const insertEnrollment = sqlite.prepare(
    "INSERT INTO enrollments (student_id, course_id, semester_id, faculty_name) VALUES (?, ?, ?, ?)",
  );
  const insertFeeStructure = sqlite.prepare(
    "INSERT INTO fee_structures (semester_id, tuition, hostel, lab, other, total, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertStudentFee = sqlite.prepare(
    "INSERT INTO student_fees (student_id, semester_id, fee_structure_id, total) VALUES (?, ?, ?, ?)",
  );
  const insertPayment = sqlite.prepare(
    "INSERT INTO payments (student_fee_id, amount, paid_at, reference, status) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAttendance = sqlite.prepare(
    "INSERT INTO attendance (student_id, course_id, semester_id, classes_held, classes_attended) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAssignment = sqlite.prepare(
    "INSERT INTO assignments (course_id, semester_id, title, due_date, max_marks) VALUES (?, ?, ?, ?, ?)",
  );
  const insertSubmission = sqlite.prepare(
    "INSERT INTO submissions (assignment_id, student_id, submitted_at, score, status) VALUES (?, ?, ?, ?, ?)",
  );
  const insertExam = sqlite.prepare(
    "INSERT INTO exams (course_id, semester_id, title, exam_date, room) VALUES (?, ?, ?, ?, ?)",
  );
  const insertResult = sqlite.prepare(
    "INSERT INTO results (student_id, course_id, semester_id, internal_marks, exam_marks, total_marks, grade, grade_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const transaction = sqlite.transaction(() => {
    const studentIds: number[] = [];
    for (const student of makeStudents()) {
      const result = insertStudent.run({ ...student, syntheticLabel });
      studentIds.push(Number(result.lastInsertRowid));
    }

    const courseIds: number[] = [];
    for (const [code, name, department, credits] of courses) {
      const result = insertCourse.run(code, name, department, credits);
      courseIds.push(Number(result.lastInsertRowid));
    }

    const semesterIds: number[] = [];
    const semesterData = [
      ["Semester 1", "2024-25", "2024-07-15", "2024-12-20", 0],
      ["Semester 2", "2025-26", "2025-01-10", "2025-06-15", 0],
      ["Semester 3", "2026-27", "2026-07-15", "2026-12-20", 1],
    ] as const;
    for (const semester of semesterData) {
      const result = insertSemester.run(...semester);
      semesterIds.push(Number(result.lastInsertRowid));
    }

    const assignmentsByCourseSemester = new Map<string, number[]>();
    const examsByCourseSemester = new Map<string, number[]>();
    for (let semesterIndex = 0; semesterIndex < semesterIds.length; semesterIndex += 1) {
      const semesterId = semesterIds[semesterIndex];
      const semesterCode = semesterIndex === 2 ? "2026" : semesterIndex === 1 ? "2025" : "2024";
      for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex += 1) {
        const courseId = courseIds[courseIndex];
        const assignmentIds: number[] = [];
        for (let assignmentIndex = 0; assignmentIndex < 3; assignmentIndex += 1) {
          const month = String(8 + ((courseIndex + assignmentIndex) % 4)).padStart(2, "0");
          const dueDate = `${semesterCode}-${month}-${String(5 + assignmentIndex * 6).padStart(2, "0")}`;
          const result = insertAssignment.run(
            courseId,
            semesterId,
            `${courses[courseIndex][1]} — Assessment ${assignmentIndex + 1}`,
            dueDate,
            20,
          );
          assignmentIds.push(Number(result.lastInsertRowid));
        }
        assignmentsByCourseSemester.set(`${courseId}-${semesterId}`, assignmentIds);

        const examIds: number[] = [];
        const examDate = `${semesterCode}-${semesterIndex === 2 ? "12" : "06"}-${String(3 + (courseIndex % 18)).padStart(2, "0")}`;
        const examResult = insertExam.run(
          courseId,
          semesterId,
          `${courses[courseIndex][0]} End-Semester Examination`,
          examDate,
          `Block ${String.fromCharCode(65 + (courseIndex % 5))}-${101 + courseIndex}`,
        );
        examIds.push(Number(examResult.lastInsertRowid));
        examsByCourseSemester.set(`${courseId}-${semesterId}`, examIds);
      }
    }

    const feeStructureIds: number[] = [];
    for (let semesterIndex = 0; semesterIndex < semesterIds.length; semesterIndex += 1) {
      const tuition = 42000 + semesterIndex * 1500;
      const hostel = 18000 + semesterIndex * 700;
      const lab = 6500;
      const other = 2500;
      const result = insertFeeStructure.run(
        semesterIds[semesterIndex],
        tuition,
        hostel,
        lab,
        other,
        tuition + hostel + lab + other,
        `${2024 + semesterIndex}-08-20`,
      );
      feeStructureIds.push(Number(result.lastInsertRowid));
    }

    for (let studentIndex = 0; studentIndex < studentIds.length; studentIndex += 1) {
      const studentDbId = studentIds[studentIndex];
      const department = departments[studentIndex % departments.length];
      const eligibleCourseIndexes = courseIds
        .map((_, index) => index)
        .filter((courseIndex) => courses[courseIndex][2] === department || courses[courseIndex][2] === "General Studies");
      const chosenCourseIndexes = eligibleCourseIndexes.slice(0, 4);

      for (let semesterIndex = 0; semesterIndex < semesterIds.length; semesterIndex += 1) {
        const semesterId = semesterIds[semesterIndex];
        const feeTotal = 42000 + semesterIndex * 1500 + 18000 + semesterIndex * 700 + 6500 + 2500;
        const feeResult = insertStudentFee.run(
          studentDbId,
          semesterId,
          feeStructureIds[semesterIndex],
          feeTotal,
        );
        const feeId = Number(feeResult.lastInsertRowid);
        const paidAmount =
          semesterIndex === 2 && studentIndex % 5 === 0
            ? Math.round(feeTotal * 0.58)
            : semesterIndex === 1 && studentIndex % 7 === 0
              ? Math.round(feeTotal * 0.78)
              : feeTotal;
        insertPayment.run(
          feeId,
          paidAmount,
          `${2024 + semesterIndex}-09-${String((studentIndex % 20) + 1).padStart(2, "0")}`,
          `CM-PAY-${studentIndex + 1}-${semesterIndex + 1}`,
          paidAmount === feeTotal ? "paid" : "partial",
        );

        for (let choiceIndex = 0; choiceIndex < chosenCourseIndexes.length; choiceIndex += 1) {
          const courseIndex = chosenCourseIndexes[choiceIndex];
          const courseId = courseIds[courseIndex];
          insertEnrollment.run(
            studentDbId,
            courseId,
            semesterId,
            faculty[(studentIndex + choiceIndex) % faculty.length],
          );
          const held = 42 + ((studentIndex + courseIndex + semesterIndex) % 18);
          const attendanceRatio =
            (studentIndex + courseIndex + semesterIndex) % 11 === 0 ? 0.68 : 0.79 + ((studentIndex + courseIndex) % 18) / 100;
          const attended = Math.min(held, Math.round(held * attendanceRatio));
          insertAttendance.run(studentDbId, courseId, semesterId, held, attended);

          const totalMarks = 58 + ((studentIndex * 3 + courseIndex * 5 + semesterIndex) % 38);
          const internalMarks = Math.round(totalMarks * 0.38);
          const examMarks = totalMarks - internalMarks;
          const grade = totalMarks >= 90 ? "A+" : totalMarks >= 80 ? "A" : totalMarks >= 70 ? "B+" : totalMarks >= 60 ? "B" : "C";
          const gradePoint = grade === "A+" ? 10 : grade === "A" ? 9 : grade === "B+" ? 8 : grade === "B" ? 7 : 6;
          insertResult.run(studentDbId, courseId, semesterId, internalMarks, examMarks, totalMarks, grade, gradePoint);

          const assignmentIds = assignmentsByCourseSemester.get(`${courseId}-${semesterId}`) ?? [];
          for (let assignmentIndex = 0; assignmentIndex < assignmentIds.length; assignmentIndex += 1) {
            const submissionScore = 11 + ((studentIndex + courseIndex + assignmentIndex) % 10);
            const submitted = (studentIndex + assignmentIndex) % 13 !== 0;
            insertSubmission.run(
              assignmentIds[assignmentIndex],
              studentDbId,
              submitted ? `2026-09-${String((assignmentIndex + studentIndex) % 24 + 1).padStart(2, "0")}` : null,
              submitted ? submissionScore : null,
              submitted ? "submitted" : "pending",
            );
          }
        }
      }
    }
  });

  transaction();
}

export { syntheticLabel };