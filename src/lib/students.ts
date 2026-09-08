import { getDatabase,type AppUser } from '@/lib/app-user';
export type ManagedStudent={id:string;name:string;username:string;email:string;disabled_at:Date|null;approval_status:string;duplicate_of_id:string|null;completed:number;correct:number;graded:number};
export async function listStudents(user?:AppUser) {
  return (await getDatabase().query<ManagedStudent>(`SELECT u.id,u.display_name AS name,u.username,u.email,u.disabled_at,u.approval_status,u.duplicate_of_id,
    count(DISTINCT sa.id) FILTER(WHERE sa.status='submitted')::int AS completed,
    count(r.id) FILTER(WHERE sa.status='submitted' AND r.is_correct=true)::int AS correct,
    count(r.id) FILTER(WHERE sa.status='submitted' AND r.is_correct IS NOT NULL)::int AS graded
    FROM users u LEFT JOIN student_assignments sa ON sa.student_id=u.id LEFT JOIN responses r ON r.student_assignment_id=sa.id
    WHERE u.default_role='student' AND ($1::boolean OR EXISTS(SELECT 1 FROM class_memberships teacher JOIN class_memberships student ON student.class_id=teacher.class_id WHERE teacher.user_id=$2 AND teacher.role='teacher' AND teacher.status='active' AND student.user_id=u.id AND student.role='student' AND student.status='active')) GROUP BY u.id ORDER BY u.display_name,u.username`,[!user || user.role==='admin',user?.id??null])).rows;
}
