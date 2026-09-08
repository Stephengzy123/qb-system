// Query aliases a=assignments, c=classes; parameters are user ID and admin flag.
export function assignmentReadAccess(userParameter:string,adminParameter:string) {
  return `(${adminParameter}::boolean OR EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=${userParameter} AND cm.role='teacher' AND cm.status='active')
    OR EXISTS(SELECT 1 FROM student_assignments sa WHERE sa.assignment_id=a.id AND sa.student_id=${userParameter} AND sa.status='submitted')
    OR (c.archived_at IS NULL AND a.status='open' AND (a.open_at IS NULL OR a.open_at<=now()) AND EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=${userParameter} AND cm.role='student' AND cm.status='active')))`;
}
