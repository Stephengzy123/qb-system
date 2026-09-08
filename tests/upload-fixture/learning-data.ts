export const learningId=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const workQuestions=[
  {id:learningId(1),name:'Question1.png',asset_id:'image1',choices:[{id:learningId(11),label:'A'},{id:learningId(12),label:'B'}]},
  {id:learningId(2),name:'Question2.png',asset_id:'image2',choices:[{id:learningId(21),label:'A'},{id:learningId(22),label:'B'}]},
  {id:learningId(3),name:'Question3.png',asset_id:'image3',choices:[{id:learningId(31),label:'A'}]},
];
export const resultQuestions=workQuestions.map((q,index)=>({...q,position:index,selected_label:index===0?'A':null,correct_label:index===2?null:'A',is_correct:index===2?null:index===0}));
export const result={student_id:learningId(50),student_name:'Alex',status:'submitted',correct:1,graded:2,total:3,submitted_at:new Date('2026-09-08T12:00:00Z'),questions:resultQuestions};
export const history=[{id:learningId(90),title:'Biology practice',class_name:'Class A',status:'submitted',assignment_status:'closed',correct:1,graded:2,total:3,submitted_at:result.submitted_at,due_at:null}];
