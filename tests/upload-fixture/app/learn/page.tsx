import {cookies} from 'next/headers';
import StudentWork from '../../../../src/components/student-work';
import StudentResult from '../../../../src/components/student-result';
import {workQuestions,learningId,result} from '../../learning-data';
export default async function Page(){
  const value=(await cookies()).get('test-work')?.value;
  const work=value?JSON.parse(decodeURIComponent(value)):{revision:0,answers:[],status:'not_started'};
  return work.status==='submitted'?<StudentResult result={result} assignmentId={learningId(90)} />:<StudentWork studentId={learningId(50)} assignmentId={learningId(90)} questions={workQuestions} revision={work.revision} answers={work.answers.map((a:{questionId:string;choiceId:string|null})=>({question_id:a.questionId,choice_id:a.choiceId}))} />;
}
