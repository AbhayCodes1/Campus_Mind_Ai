import { getAuth } from "@clerk/express";
import type { Request } from "express";
import { sqlite } from "./sqlite";

export type DemoRole = "student" | "faculty" | "accountant" | "admin";

const roles: DemoRole[] = ["student", "faculty", "accountant", "admin"];

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && roles.includes(value as DemoRole);
}

export function getAccessContext(req: Request): {
  role: DemoRole;
  studentId?: string;
  facultyName?: string;
  source: "demo" | "clerk";
} {
  const signedRole = (req as Request & { signedCookies?: Record<string, unknown> }).signedCookies
    ?.cm_role;
  if (isDemoRole(signedRole)) {
    if (signedRole === "student") {
      return { role: signedRole, studentId: "CM2026001", source: "demo" };
    }
    if (signedRole === "faculty") {
      return { role: signedRole, facultyName: "Dr. Meera Iyer", source: "demo" };
    }
    return { role: signedRole, source: "demo" };
  }

  try {
    const auth = getAuth(req);
    const sessionClaims = auth.sessionClaims as Record<string, unknown> | null | undefined;
    const roleClaim = sessionClaims?.role ?? sessionClaims?.publicMetadataRole;
    if (isDemoRole(roleClaim)) {
      return { role: roleClaim, source: "clerk" };
    }
    if (auth.userId) {
      const appUser = sqlite
        .prepare(
          `SELECT au.role, s.student_id AS studentId, au.faculty_name AS facultyName
           FROM app_users au
           LEFT JOIN students s ON s.id = au.student_id
           WHERE au.external_user_id = ?`,
        )
        .get(auth.userId) as
        | { role: DemoRole; studentId?: string; facultyName?: string }
        | undefined;
      if (appUser && isDemoRole(appUser.role)) {
        return { ...appUser, role: appUser.role, source: "clerk" };
      }
    }
  } catch {
    // Clerk is optional in local demo mode. Synthetic demo access still works.
  }

  return { role: "admin", source: "demo" };
}

export function canViewStudent(
  access: ReturnType<typeof getAccessContext>,
  studentId: string,
): boolean {
  if (access.role === "admin" || access.role === "accountant") return true;
  if (access.role === "student") {
    return access.studentId === studentId;
  }
  if (access.role === "faculty" && access.facultyName) {
    const match = sqlite
      .prepare(
        `SELECT 1 FROM enrollments en
         JOIN students s ON s.id = en.student_id
         WHERE s.student_id = ? AND en.faculty_name = ? LIMIT 1`,
      )
      .get(studentId, access.facultyName);
    return Boolean(match);
  }
  return false;
}