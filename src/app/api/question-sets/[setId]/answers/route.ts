import { getAppUser, getDatabase } from '@/lib/app-user';
import { isUuid, validAnswerChanges } from '@/lib/question-bank-model';

export async function PATCH(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const user = await getAppUser();
  if (!user || user.status !== 'active' || user.role === 'student') return Response.json({ error: 'Staff access required.' }, { status: 403 });
  const { setId } = await params;
  const input = await request.json().catch(() => null);
  if (!isUuid(setId) || !validAnswerChanges(input?.answers)) return Response.json({ error: 'Select valid answers for this set.' }, { status: 400 });
  const changes = input.answers;
  const client = await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const set = await client.query(`SELECT s.id FROM question_sets s WHERE s.id=$1 AND s.deleted_at IS NULL
      AND ($3::boolean OR s.created_by=$2 OR EXISTS (SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND p.can_edit)) FOR UPDATE`, [setId, user.id, user.role === 'admin']);
    if (!set.rowCount) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'You do not have permission to edit this set.' }, { status: 403 });
    }
    for (const change of changes) {
      const result = await client.query<{ version_id: string; correct_choice_id: string | null }>(`SELECT q.current_version_id AS version_id,a.correct_choice_id
        FROM set_questions sq JOIN questions q ON q.id=sq.question_id
        LEFT JOIN question_set_answers a ON a.set_question_id=sq.id AND a.question_version_id=q.current_version_id
        WHERE sq.id=$1 AND sq.set_id=$2 AND q.deleted_at IS NULL FOR UPDATE OF sq,q`, [change.questionId, setId]);
      const current = result.rows[0];
      if (!current || current.version_id !== change.versionId || current.correct_choice_id !== change.previousChoiceId) {
        await client.query('ROLLBACK');
        return Response.json({ error: 'This set changed since you opened it. Reload the page and review the current answers before saving.' }, { status: 409 });
      }
      if (change.choiceId && !(await client.query('SELECT 1 FROM question_choices WHERE id=$1 AND question_version_id=$2', [change.choiceId, change.versionId])).rowCount) {
        await client.query('ROLLBACK');
        return Response.json({ error: 'The selected choice does not belong to this question.' }, { status: 400 });
      }
      if (change.choiceId) {
        await client.query(`INSERT INTO question_set_answers(set_question_id,question_version_id,correct_choice_id,updated_by)
          VALUES($1,$2,$3,$4) ON CONFLICT(set_question_id) DO UPDATE SET question_version_id=EXCLUDED.question_version_id,
          correct_choice_id=EXCLUDED.correct_choice_id,updated_by=EXCLUDED.updated_by,updated_at=now()`, [change.questionId, change.versionId, change.choiceId, user.id]);
      } else await client.query('DELETE FROM question_set_answers WHERE set_question_id=$1', [change.questionId]);
    }
    await client.query('UPDATE question_sets SET updated_at=now() WHERE id=$1', [setId]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'question_set.answers_updated','question_set',$2,$3::jsonb)`, [user.id, setId, JSON.stringify({ answers: changes })]);
    await client.query('COMMIT');
    return Response.json({ saved: changes.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save set answers failed', error);
    return Response.json({ error: 'Your answers could not be saved. Please try again.' }, { status: 500 });
  } finally { client.release(); }
}
