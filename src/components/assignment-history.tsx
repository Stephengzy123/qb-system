import Link from 'next/link';
import { accuracy,type HistoryItem } from '@/lib/learning-model';
import LocalTime from '@/components/local-time';
export default function AssignmentHistory({items,studentId,completedOnly=false}:{items:HistoryItem[];studentId?:string;completedOnly?:boolean}) {
  return <section className="panel answer-editor"><h2>{completedOnly?'Completed assignments':'Current and past assignments'}</h2>{!items.length?<p>{completedOnly?'No completed assignments yet.':'No assignments yet.'}</p>:<div className="assignment-history-cards">{items.map(item=><Link className="assignment-card-link assignment-history-card" aria-label={item.title} key={item.id} href={studentId?`/admin/assignments/${item.id}/students/${studentId}`:`/student/assignments/${item.id}`}><h3>{item.title}</h3><p>{item.class_name} · {item.status.replaceAll('_',' ')}</p><p>Accuracy: {item.status==='submitted'?`${accuracy(item.correct,item.graded)} (${item.correct}/${item.graded})`:'—'}</p><p>Submitted: {item.submitted_at?<LocalTime value={item.submitted_at.toISOString()} />:'—'}</p></Link>)}</div>}</section>;
}
