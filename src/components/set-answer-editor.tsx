"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { SetQuestion } from '@/lib/question-bank-model';

const subscribe = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

export default function SetAnswerEditor({ setId, questions, canEdit }: { setId: string; questions: SetQuestion[]; canEdit: boolean }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const initial = Object.fromEntries(questions.map(question => [question.id, question.correct_choice_id]));
  const [saved, setSaved] = useState<Record<string, string | null>>(initial);
  const [selected, setSelected] = useState<Record<string, string | null>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [brokenImages, setBrokenImages] = useState<string[]>([]);
  const changes = questions.filter(question => selected[question.id] !== saved[question.id]);
  const dirty = changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLeave);
    return () => window.removeEventListener('beforeunload', preventLeave);
  }, [dirty]);
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/question-sets/${setId}/answers`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: changes.map(question => ({ questionId: question.id, versionId: question.version_id, choiceId: selected[question.id], previousChoiceId: saved[question.id] })) }),
      });
      const result = await response.json().catch(() => ({ error: 'Unable to save answers. Please try again.' }));
      if (!response.ok) throw new Error(result.error ?? 'Unable to save answers.');
      setSaved({ ...selected }); setMessage('Answer key saved.'); router.refresh();
    } catch (error) { setError((error as Error).message); }
    finally { setSaving(false); }
  }
  return <section className="panel answer-editor">
    <div className="answer-toolbar"><div><h2>Correct choices</h2><p>{Object.values(saved).filter(Boolean).length} of {questions.length} questions have a saved answer.</p>{dirty && <p className="answer-unsaved">{changes.length} unsaved changes</p>}</div>
      {canEdit && <button className="primary-button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save answer key'}</button>}
    </div>
    {!canEdit && <p>You can review this set. Editing requires permission from its owner.</p>}
    {message && <p className="upload-success" role="status">{message}</p>}
    {error && <p className="upload-warning" role="alert">{error}</p>}
    {!questions.length && <div className="empty-state"><h3>No questions available yet</h3><p>Check the upload review for pending or failed images.</p></div>}
    <div className="answer-questions">{questions.map((question, index) => <article className="answer-question" key={question.id}>
      <h3>Question {index + 1}</h3><p className="question-source">{question.name}</p>
      {question.asset_id && !brokenImages.includes(question.id)
        ? <a href={`/api/question-assets/${question.asset_id}`} target="_blank" rel="noreferrer"><img src={`/api/question-assets/${question.asset_id}`} alt={`Question ${index + 1}: ${question.name}`} loading="lazy" ref={image => { if (image?.complete && image.naturalWidth === 0) setBrokenImages(previous => previous.includes(question.id) ? previous : [...previous, question.id]); }} onError={() => setBrokenImages(previous => [...previous, question.id])} /></a>
        : <p className="upload-warning">The question image is unavailable. Check its upload before selecting an answer.</p>}
      <fieldset disabled={!canEdit || saving || !hydrated}><legend>Correct choice for question {index + 1}</legend><div className="answer-choices">
        {question.choices.map(choice => <label className={selected[question.id] === choice.id ? 'selected' : ''} key={choice.id}><input type="radio" name={`answer-${question.id}`} value={choice.id} checked={selected[question.id] === choice.id} onChange={() => { setSelected(previous => ({ ...previous, [question.id]: choice.id })); setMessage(''); }} />{choice.label}</label>)}
        <label className={!selected[question.id] ? 'selected' : ''}><input type="radio" name={`answer-${question.id}`} checked={selected[question.id] === null} onChange={() => { setSelected(previous => ({ ...previous, [question.id]: null })); setMessage(''); }} />Not set</label>
      </div></fieldset>
    </article>)}</div>
  </section>;
}
