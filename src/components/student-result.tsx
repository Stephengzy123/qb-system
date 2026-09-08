/* eslint-disable @next/next/no-img-element */
import { accuracy,type StudentResult as Result } from '@/lib/learning-model';
import LocalTime from '@/components/local-time';
export default function StudentResult({result,assignmentId}:{result:Result;assignmentId:string}) {
  const submitted=result.status==='submitted';
  return <section className="panel answer-editor"><h2>{result.student_name} — {submitted?'Results':result.status.replaceAll('_',' ')}</h2>
    <p className="result-score">{submitted?accuracy(result.correct,result.graded):'Not submitted'}</p><p>{submitted?`${result.correct} correct / ${result.graded} graded questions · ${result.total-result.graded} ungraded`:'Work has not been submitted. Accuracy is available after submission.'}</p>
    {result.submitted_at&&<p><LocalTime value={result.submitted_at.toISOString()} prefix="Submitted " /></p>}
    <p>Accuracy excludes questions without a grading key.</p>
    <div className="result-table-wrap"><table className="result-table"><thead><tr><th>Question</th><th>Selected choice</th><th>Correct choice</th><th>Result</th></tr></thead><tbody>{result.questions.map((q,index)=><tr key={q.id}><td><a href={`#question-${q.id}`}>Question {index+1}</a></td><td>{q.selected_label??'Unanswered'}</td><td>{q.correct_label??'Not set'}</td><td>{!submitted?'Not submitted':q.is_correct===null?'Ungraded':q.is_correct?'Correct':'Incorrect'}</td></tr>)}</tbody></table></div>
    <div className="answer-questions">{result.questions.map((q,index)=><article className="answer-question" id={`question-${q.id}`} key={q.id}><h3>Question {index+1} · {!submitted?'Not submitted':q.is_correct===null?'Ungraded':q.is_correct?'Correct':'Incorrect'}</h3><p>{q.name}</p><p>Selected: {q.selected_label??'Unanswered'} · Correct: {q.correct_label??'Not set'}</p>{q.asset_id&&<img src={`/api/assignments/${assignmentId}/images/${q.asset_id}`} alt={`Question ${index+1}`} loading="lazy" />}</article>)}</div>
  </section>;
}
