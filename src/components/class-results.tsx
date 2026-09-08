import Link from 'next/link';
import { accuracy } from '@/lib/learning-model';
import type { RosterResult,QuestionResult } from '@/lib/learning';
export default function ClassResults({assignmentId,students,questions}:{assignmentId:string;students:RosterResult[];questions:QuestionResult[]}) {
  const submitted=students.filter(s=>s.status==='submitted');
  const correct=submitted.reduce((sum,s)=>sum+s.correct,0),graded=submitted.reduce((sum,s)=>sum+s.graded,0);
  return <section className="panel answer-editor"><h2>Class results</h2><p>{submitted.length} of {students.length} students submitted · Class accuracy: <strong>{accuracy(correct,graded)}</strong></p><p>Accuracy is correct answers divided by graded answers from submitted work. Unsubmitted work and unkeyed questions are excluded.</p>
    <h3>Students</h3><div className="result-table-wrap"><table className="result-table"><thead><tr><th>Student</th><th>Status</th><th>Accuracy</th><th>Correct / graded</th></tr></thead><tbody>{students.map(s=><tr key={s.id}><td><Link href={`/admin/assignments/${assignmentId}/students/${s.id}`}>{s.name} (@{s.username})</Link></td><td>{s.status.replaceAll('_',' ')}</td><td>{s.status==='submitted'?accuracy(s.correct,s.graded):'—'}</td><td>{s.status==='submitted'?`${s.correct} / ${s.graded}`:'—'}</td></tr>)}</tbody></table></div>{!students.length&&<p>No students are enrolled yet.</p>}
    <h3>By question</h3><div className="result-table-wrap"><table className="result-table"><thead><tr><th>Question</th><th>Answered / submitted</th><th>Correct / graded</th><th>Accuracy</th></tr></thead><tbody>{questions.map((q,index)=><tr key={q.id}><td>Question {index+1}<small>{q.name}</small></td><td>{q.answered} / {q.submitted}</td><td>{q.correct} / {q.graded}</td><td>{accuracy(q.correct,q.graded)}</td></tr>)}</tbody></table></div>
  </section>;
}
