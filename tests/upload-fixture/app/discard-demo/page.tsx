import Link from 'next/link';
import DiscardProgress from '../../../../src/components/discard-progress';
import {learningId as id} from '../../learning-data';
export default function Page(){return <main className="student-main"><div className="student-work-row"><Link className="assignment-card-link assignment-history-card" href="/learn">Continue assignment</Link><DiscardProgress studentId={id(50)} assignmentId={id(90)} revision={3} /></div><div className="student-work-row"><Link className="assignment-card-link assignment-history-card" href="/learn">Continue error practice</Link><DiscardProgress studentId={id(50)} assignmentId={id(91)} revision={0} practice /></div></main>;}
