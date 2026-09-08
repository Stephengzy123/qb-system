import Link from 'next/link';
import { accuracy,type HistoryItem } from '@/lib/learning-model';
import LocalTime from '@/components/local-time';
export default function AssignmentHistory({items,studentId,completedOnly=false}:{items:HistoryItem[];studentId?:string;completedOnly?:boolean}) {
  return <section className="panel answer-editor"><h2>{completedOnly?'Completed assignments':'Current and past assignments'}</h2>{!items.length?<p>{completedOnly?'No completed assignments yet.':'No assignments yet.'}</p>:<div className="result-table-wrap"><table className="result-table"><thead><tr><th>Assignment</th><th>Class</th><th>Status</th><th>Accuracy</th><th>Submitted</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><Link href={studentId?`/admin/assignments/${item.id}/students/${studentId}`:`/student/assignments/${item.id}`}>{item.title}</Link></td><td>{item.class_name}</td><td>{item.status.replaceAll('_',' ')}</td><td>{item.status==='submitted'?`${accuracy(item.correct,item.graded)} (${item.correct}/${item.graded})`:'—'}</td><td>{item.submitted_at?<LocalTime value={item.submitted_at.toISOString()} />:'—'}</td></tr>)}</tbody></table></div>}</section>;
}
