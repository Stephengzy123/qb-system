/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import LocalTime from '@/components/local-time';
export default function AssignmentViewer({assignment}:{assignment:{id:string;title:string;class_name:string;instructions:string|null;due_at:Date|null;questions:{id:string;name:string;asset_id:string|null}[]}}) {
  return <><header className="page-header compact"><div><p className="eyebrow">{assignment.class_name}</p><h1>{assignment.title}</h1><p className="lede">{assignment.questions.length} questions · {assignment.due_at?<LocalTime value={assignment.due_at.toISOString()} prefix="Due " />:'No due date'}</p></div></header>
    {assignment.instructions && <section className="panel assignment-form"><h2>Instructions</h2><p className="assignment-instructions">{assignment.instructions}</p></section>}
    <section className="panel answer-editor"><h2>Assigned questions</h2><div className="answer-questions">{assignment.questions.map((question,index)=><article className="answer-question" key={question.id}><h3>Question {index+1}</h3><p className="question-source">{question.name}</p>{question.asset_id?<Link href={`/api/assignments/${assignment.id}/images/${question.asset_id}`} target="_blank"><img src={`/api/assignments/${assignment.id}/images/${question.asset_id}`} alt={`Question ${index+1}: ${question.name}`} loading="lazy" /></Link>:<p className="upload-warning">The image is unavailable. Contact your teacher.</p>}</article>)}</div></section>
  </>;
}
