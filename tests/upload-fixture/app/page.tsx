import QuestionUpload from '../../../src/components/question-upload';
import {folders} from '../bank-data';
export default async function Page({searchParams}:{searchParams:Promise<{folder?:string}>}) {return <QuestionUpload folders={folders} initialFolderId={(await searchParams).folder??null} />;}
