import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetDashboardSummaryResponse,
  GetStudentReportParams,
  GetStudentReportResponse,
  ListStudentsQueryParams,
  ListStudentsResponse,
} from "@workspace/api-zod";
import {
  getDashboardSummary,
  getStudentReport,
  reportAsCsv,
  searchStudents,
  type StudentReport,
} from "../lib/reports";
import { canViewStudent, getAccessContext } from "../lib/access";
import { sqlite, syntheticLabel } from "../lib/sqlite";

const router: IRouter = Router();

function pdfEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]): Buffer {
  const commands = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${pdfEscape(line)}) Tj`]
        : ["0 -20 Td", `(${pdfEscape(line)}) Tj`],
    ),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(commands, "utf8")} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n");
  pdf += `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

router.get("/dashboard/summary", (_req, res): void => {
  res.json(GetDashboardSummaryResponse.parse(getDashboardSummary()));
});

router.get("/students", (req, res): void => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const access = getAccessContext(req);
  const students = searchStudents(parsed.data);
  if (access.role === "student") {
    res.json(
      ListStudentsResponse.parse(
        students.filter((student) => student.studentId === access.studentId),
      ),
    );
    return;
  }
  if (access.role === "faculty" && access.facultyName) {
    const assigned = students.filter((student) => {
      const row = sqlite
        .prepare(
          `SELECT 1 FROM enrollments en
           JOIN students s ON s.id = en.student_id
           WHERE s.student_id = ? AND en.faculty_name = ? LIMIT 1`,
        )
        .get(student.studentId, access.facultyName);
      return Boolean(row);
    });
    res.json(ListStudentsResponse.parse(assigned));
    return;
  }
  res.json(ListStudentsResponse.parse(students));
});

function redactForAccountant(report: StudentReport, role: string): StudentReport {
  if (role !== "accountant") return report;
  return {
    ...report,
    semesters: [],
    attendance: [],
    assignments: [],
    upcomingExams: [],
    results: [],
    totals: {
      ...report.totals,
      attendancePercentage: 0,
      attendanceShortage: 0,
    },
  };
}

function getReportOrRespond(
  req: Request<{ studentId: string }>,
  res: Response,
): StudentReport | null {
  const params = GetStudentReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return null;
  }
  const access = getAccessContext(req);
  if (!canViewStudent(access, params.data.studentId)) {
    res.status(403).json({ error: "Your role is not authorized to view this student record." });
    return null;
  }
  const report = getStudentReport(params.data.studentId);
  if (!report) {
    res.status(404).json({ error: "Student not found" });
    return null;
  }
  return redactForAccountant(report, access.role);
}

router.get("/students/:studentId/report", (req, res): void => {
  const report = getReportOrRespond(req, res);
  if (!report) return;
  res.json(GetStudentReportResponse.parse(report));
});

router.get("/students/:studentId/report.csv", (req, res): void => {
  const report = getReportOrRespond(req, res);
  if (!report) return;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${report.profile.studentId}-campusmind-report.csv"`,
  );
  res.send(reportAsCsv(report));
});

router.get("/students/:studentId/report.pdf", (req, res): void => {
  const report = getReportOrRespond(req, res);
  if (!report) return;
  const lines = [
    "CampusMind AI — SYNTHETIC DEMO REPORT",
    report.profile.name,
    `${report.profile.studentId} | ${report.profile.department} | Year ${report.profile.year}`,
    report.syntheticLabel,
    "",
    `Attendance ${report.totals.attendancePercentage}% | Shortage ${report.totals.attendanceShortage} classes`,
    `Fees total INR ${report.totals.feeTotal} | Paid INR ${report.totals.feePaid} | Pending INR ${report.totals.feePending}`,
    "",
    "Subject-wise attendance",
    ...report.attendance.map(
      (item) => `${item.courseCode} ${item.percentage}% (${item.attended}/${item.held}) ${item.status}`,
    ),
    "",
    "Subject-wise results",
    ...report.results.map(
      (item) => `${item.courseCode} ${item.totalMarks}/100 ${item.grade} (${item.gradePoint})`,
    ),
    "",
    "Generated from the local CampusMind SQLite database. No real-person data is used.",
  ];
  const pdf = buildSimplePdf(lines);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${report.profile.studentId}-campusmind-report.pdf"`,
  );
  res.send(pdf);
});

router.get("/auth/session", (req, res): void => {
  const access = getAccessContext(req);
  res.json({ role: access.role, studentId: access.studentId ?? null, source: access.source, syntheticLabel });
});

router.post("/auth/demo", (req, res): void => {
  const role = req.body?.role;
  if (!["student", "faculty", "accountant", "admin"].includes(role)) {
    res.status(400).json({ error: "Choose student, faculty, accountant, or admin." });
    return;
  }
  res.cookie("cm_role", role, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8,
  });
  res.json({ role, syntheticLabel });
});

export default router;