import ClassResults from '../../../../src/components/class-results';
import StudentResult from '../../../../src/components/student-result';
import AssignmentHistory from '../../../../src/components/assignment-history';
import {learningId,result,history,resultQuestions} from '../../learning-data';
export default function Page(){return <><ClassResults assignmentId={learningId(90)} students={[{id:learningId(50),name:'Alex',username:'alex',status:'submitted',correct:1,graded:2},{id:learningId(51),name:'Sam',username:'sam',status:'not_started',correct:0,graded:0}]} questions={resultQuestions.map(q=>({...q,submitted:1,answered:q.selected_label?1:0,correct:q.is_correct?1:0,graded:q.correct_label?1:0}))} /><StudentResult result={result} assignmentId={learningId(90)} /><AssignmentHistory items={history} completedOnly /></>;}
