import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import { auth } from "@/lib/auth";

export type AppUser = {
  id: string;
  authSubject: string;
  email: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
  status: "pending" | "active" | "rejected";
};

let pool: Pool | undefined;

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

export async function getAppUser(): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const database = getDatabase();
  const sessionUser = session.user as typeof session.user & { username?: string | null };
  const initialAdminUsername = process.env.INITIAL_ADMIN_USERNAME?.trim().toLowerCase();
  const isInitialAdmin = Boolean(initialAdminUsername && sessionUser.username?.toLowerCase() === initialAdminUsername);

  const result = await database.query<{
    id: string; auth_subject: string; email: string; display_name: string;
    default_role: AppUser["role"]; approval_status: AppUser["status"];
  }>(`INSERT INTO users (auth_subject, email, display_name, default_role, approval_status, approved_at)
     VALUES ($1, $2, $3, $4::user_role, $5::account_status,
       CASE WHEN $5::account_status = 'active'::account_status THEN now() ELSE NULL END)
     ON CONFLICT (auth_subject) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       default_role = CASE WHEN EXCLUDED.default_role = 'admin' THEN 'admin' ELSE users.default_role END,
       updated_at = now()
     RETURNING id, auth_subject, email, display_name, default_role, approval_status`, [
      session.user.id,
      sessionUser.email,
      session.user.name,
      isInitialAdmin ? "admin" : "student",
      "active",
    ]);

  const row = result.rows[0];
  return {
    id: row.id,
    authSubject: row.auth_subject,
    email: row.email,
    displayName: row.display_name,
    role: row.default_role,
    status: row.approval_status,
  };
}

export type StaffSummary = {
  questions: number;
  assignments: number;
  students: number;
  needsAttention: number;
};

export async function getStaffSummary(user: AppUser): Promise<StaffSummary> {
  const database = getDatabase();
  const admin = user.role === "admin";
  const result = await database.query<{
    questions: number; assignments: number; students: number; needs_attention: number;
  }>(`SELECT
      (SELECT count(*)::int FROM questions q
        WHERE q.deleted_at IS NULL AND ($2::boolean OR q.created_by = $1)) AS questions,
      (SELECT count(*)::int FROM assignments a
        WHERE $2::boolean OR a.created_by = $1) AS assignments,
      (SELECT count(DISTINCT cm.user_id)::int
         FROM class_memberships cm
         JOIN classes c ON c.id = cm.class_id
        WHERE cm.role = 'student' AND cm.status = 'active' AND c.archived_at IS NULL
          AND ($2::boolean OR EXISTS (
            SELECT 1 FROM class_memberships mine
             WHERE mine.class_id = c.id AND mine.user_id = $1
               AND mine.role = 'teacher' AND mine.status = 'active'
          ))) AS students,
      ((SELECT count(*)::int
          FROM class_memberships cm
          JOIN classes c ON c.id = cm.class_id
         WHERE cm.role = 'student' AND cm.status = 'pending' AND c.archived_at IS NULL
           AND ($2::boolean OR EXISTS (
             SELECT 1 FROM class_memberships mine
              WHERE mine.class_id = c.id AND mine.user_id = $1
                AND mine.role = 'teacher' AND mine.status = 'active'
           )))
       + (SELECT CASE WHEN $2::boolean THEN count(*)::int ELSE 0 END
            FROM users u WHERE u.approval_status = 'pending')) AS needs_attention`, [user.id, admin]);

  const row = result.rows[0];
  return {
    questions: row.questions,
    assignments: row.assignments,
    students: row.students,
    needsAttention: row.needs_attention,
  };
}

export async function requireAppUser(options?: { staff?: boolean; active?: boolean }) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (options?.active !== false && user.status !== "active") redirect("/pending");
  if (options?.staff && user.role === "student") redirect("/student");
  return user;
}

export async function getStudentAssignments(userId: string) {
  const database = getDatabase();
  const result = await database.query<{
    id: string; title: string; class_name: string; due_at: Date | null;
    student_status: string | null; submitted_at: Date | null;
  }>(`SELECT a.id, a.title, c.name AS class_name, a.due_at,
            sa.status AS student_status, sa.submitted_at
       FROM class_memberships cm
       JOIN classes c ON c.id = cm.class_id
       JOIN assignments a ON a.class_id = c.id AND a.status = 'open'
       LEFT JOIN student_assignments sa
         ON sa.assignment_id = a.id AND sa.student_id = cm.user_id
      WHERE cm.user_id = $1
        AND cm.role = 'student'
        AND cm.status = 'active'
        AND (a.open_at IS NULL OR a.open_at <= now())
      ORDER BY a.due_at NULLS LAST, a.created_at DESC`, [userId]);
  return result.rows;
}
