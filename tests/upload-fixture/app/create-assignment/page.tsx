import AssignmentCreator from '../../../../src/components/assignment-creator';
export default async function Page({searchParams}:{searchParams:Promise<{empty?:string}>}) {
  const {empty}=await searchParams;
  const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  return <AssignmentCreator sets={empty==='sets'?[]:[
    {id:id(1),name:'Cells',path:'Biology / Chapter 1',count:2,answered:2,importing:false},
    {id:id(2),name:'Genetics',path:'Biology / Chapter 2',count:3,answered:1,importing:false},
    {id:id(3),name:'Pending upload',path:'Biology',count:0,answered:0,importing:true},
  ]} classes={empty==='classes'?[]:[{id:id(10),name:'Class A',students:12},{id:id(11),name:'Class B',students:8}]} />;
}
