UPDATE class_memberships membership
SET status = 'removed'
WHERE membership.status = 'rejected'
  AND EXISTS (
    SELECT 1
    FROM audit_logs audit
    WHERE audit.entity_type = 'class_membership'
      AND audit.entity_id = membership.id
      AND audit.action = 'class_member_removed'
  );
