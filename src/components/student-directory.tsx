"use client";
import Link from 'next/link';
import {useState} from 'react';
import {accuracy} from '@/lib/learning-model';
import type {ManagedStudent} from '@/lib/students';
export default function StudentDirectory({students}:{students:(Omit<ManagedStudent,'disabled_at'>&{disabled_at:string|null})[]}) {
  const [search,setSearch]=useState('');
  const shown=students.filter(s=>`${s.name} ${s.username}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel answer-editor"><label className="upload-field">Find a student<input type="search" placeholder="Name or username" value={search} onChange={event=>setSearch(event.target.value)} /></label><div className="result-table-wrap"><table className="result-table"><thead><tr><th>Student</th><th>Account</th><th>Completed</th><th>Overall accuracy</th></tr></thead><tbody>{shown.map(student=><tr key={student.id}><td><Link href={`/admin/students/${student.id}`}>{student.name}</Link><small>@{student.username}</small></td><td>{student.disabled_at?'Disabled':student.approval_status}{student.duplicate_of_id&&' · Duplicate'}</td><td>{student.completed}</td><td>{accuracy(student.correct,student.graded)} ({student.correct}/{student.graded})</td></tr>)}</tbody></table></div>{!shown.length&&<p>No matching students.</p>}</section>;
}
