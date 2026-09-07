import { createHash, randomBytes } from "node:crypto";
import { AppUser, getDatabase } from "@/lib/app-user";

export function normalizeClassCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashClassCode(code: string) {
  return createHash("sha256").update(normalizeClassCode(code)).digest("hex");
}

export function generateClassCode() {
  return `AOMA-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function listClasses(user: AppUser) {
  const database = getDatabase();
  if (user.role === "admin") {
    const result = await database.query<{ id: string; name: string; students: number; pending: number }>(`SELECT c.id, c.name,
      count(cm.id) FILTER (WHERE cm.role = 'student' AND cm.status = 'active')::int AS students,
      count(cm.id) FILTER (WHERE cm.role = 'student' AND cm.status = 'pending')::int AS pending
      FROM classes c LEFT JOIN class_memberships cm ON cm.class_id = c.id
      WHERE c.archived_at IS NULL GROUP BY c.id ORDER BY c.created_at DESC`);
    return result.rows;
  }
  const result = await database.query<{ id: string; name: string; students: number; pending: number }>(`SELECT c.id, c.name,
    count(students.id) FILTER (WHERE students.status = 'active')::int AS students,
    count(students.id) FILTER (WHERE students.status = 'pending')::int AS pending
    FROM class_memberships mine JOIN classes c ON c.id = mine.class_id
    LEFT JOIN class_memberships students ON students.class_id = c.id AND students.role = 'student'
    WHERE mine.user_id = $1 AND mine.role = 'teacher' AND mine.status = 'active' AND c.archived_at IS NULL
    GROUP BY c.id ORDER BY c.created_at DESC`, [user.id]);
  return result.rows;
}

export async function getClassDetail(user: AppUser, classId: string) {
  const database = getDatabase();
  const allowed = user.role === "admin" || Boolean((await database.query("SELECT 1 FROM class_memberships WHERE class_id = $1 AND user_id = $2 AND role = 'teacher' AND status = 'active'", [classId, user.id])).rowCount);
  if (!allowed) return null;
  const classResult = await database.query<{ id: string; name: string }>("SELECT id, name FROM classes WHERE id = $1 AND archived_at IS NULL", [classId]);
  if (!classResult.rowCount) return null;
  const members = await database.query<{ id: string; name: string; email: string; status: string }>(`SELECT cm.id, u.display_name AS name, u.email, cm.status
    FROM class_memberships cm JOIN users u ON u.id = cm.user_id
    WHERE cm.class_id = $1 AND cm.role = 'student'
    ORDER BY CASE cm.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, cm.requested_at`, [classId]);
  return { ...classResult.rows[0], members: members.rows };
}
