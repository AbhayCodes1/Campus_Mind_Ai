# CampusMind AI

CampusMind AI is a full-stack college operations dashboard built around a local SQLite database containing clearly labeled, synthetic demo records. It includes a student directory, report views, attendance, fees, assignments, exams, results, exports, role-aware demo access, and a natural-language assistant.

## Free demo mode

The app does not require paid services, a subscription, billing, or an AI API key. The assistant is intentionally labeled **Rule-based demo mode** and resolves requests with parameterized, read-only SQLite queries. If a request matches more than one synthetic student, it asks for a student ID rather than guessing.

All records contain the label:

> SYNTHETIC DEMO DATA — NOT A REAL PERSON

The first seeded record is `CM2026001` / `Abhay Singh`. The generated dataset contains 500 fictional students and linked courses, semesters, fee structures, payments, attendance, assignments, submissions, exams, and results.

## Run

The Replit workflows start the API and web app automatically. Useful commands:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/campusmind-ai run typecheck
pnpm run typecheck
```

The API creates and seeds `artifacts/api-server/data/campusmind-demo.sqlite` on first start. The file is ignored by Git. To use another local path, copy `artifacts/api-server/.env.example` and set `CAMPUSMIND_SQLITE_PATH`.

## Main API routes

- `GET /api/dashboard/summary`
- `GET /api/students?search=...`
- `GET /api/students/:studentId/report`
- `POST /api/assistant/query`
- `GET /api/students/:studentId/report.pdf`
- `GET /api/students/:studentId/report.csv`
- `POST /api/auth/demo` with `{ "role": "student" | "faculty" | "accountant" | "admin" }`

The backend enforces demo-role scope. Student demo access is limited to `CM2026001`; faculty demo access is limited to assigned classes; accountant access redacts academic records and exposes authorized fee data; admin access can view the complete synthetic reports.

## Security notes

- The SQLite database is local and ignored from source control.
- Frontend code never contains database passwords, service credentials, or API keys.
- Assistant data access is read-only and uses bound SQLite parameters.
- The optional Clerk variables are server-managed; the local demo mode is available without an external identity provider.