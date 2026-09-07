"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const questions = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  keyed: ![3, 8].includes(index + 1),
}));

export default function AssignmentBuilder() {
  const [selected, setSelected] = useState(() => new Set(questions.map((question) => question.id)));
  const [preview, setPreview] = useState(false);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(true);
  }

  const missingKeys = questions.filter((question) => selected.has(question.id) && !question.keyed).length;

  return <>
    <header className="page-header compact"><div><p className="eyebrow">NEW ASSIGNMENT</p><h1>Create assignment</h1><p className="lede">Choose the class, material, and questions to include.</p></div><Link className="secondary-button" href="/assignments">Cancel</Link></header>
    <form className="builder-layout" onSubmit={submit}>
      <div className="builder-main">
        <section className="panel form-section"><div className="section-number">1</div><div><h2>Assignment details</h2><p>Students will see this information before they begin.</p></div><label><span>Title</span><input name="title" required defaultValue="Integration review" /></label><label><span>Instructions <small>Optional</small></span><textarea name="instructions" rows={3} placeholder="Add any notes for students" /></label><div className="form-grid"><label><span>Class</span><select name="class" required defaultValue="calculus-a"><option value="calculus-a">Calculus 12 · Block A</option><option value="calculus-b">Calculus 12 · Block B</option><option value="statistics">Statistics 12</option></select></label><label><span>Due date <small>Optional</small></span><input name="dueAt" type="datetime-local" /></label></div></section>
        <section className="panel form-section"><div className="section-number">2</div><div><h2>Questions</h2><p>All current questions are selected by default.</p></div><label><span>Source set</span><select name="set" defaultValue="integration"><option value="integration">Integration Practice · 204 questions</option><option value="limits">Limits & Continuity · 120 questions</option></select></label><div className="question-picker"><div className="picker-head"><strong>Preview selection</strong><button type="button" onClick={() => setSelected(new Set(questions.map((question) => question.id)))}>Select all</button></div><div className="question-grid">{questions.map((question) => <label key={question.id} className={selected.has(question.id) ? "selected" : ""}><input type="checkbox" checked={selected.has(question.id)} onChange={() => toggle(question.id)} /><span>{question.id}</span>{!question.keyed && <i title="Missing answer key">!</i>}</label>)}</div><p className="selection-summary">{selected.size} questions selected · {missingKeys} without answer keys</p></div></section>
        <section className="panel form-section"><div className="section-number">3</div><div><h2>Delivery</h2><p>These settings become part of the published snapshot.</p></div><label className="toggle-row"><span><strong>Shuffle question order</strong><small>Each student receives one stable randomized order.</small></span><input type="checkbox" name="shuffle" /></label><label className="toggle-row"><span><strong>Release feedback after submission</strong><small>Show score, correctness, and answers together.</small></span><input type="checkbox" name="releaseFeedback" /></label></section>
      </div>
      <aside className="panel builder-summary"><p className="eyebrow">SUMMARY</p><h2>Ready to review</h2><dl><div><dt>Questions</dt><dd>{selected.size}</dd></div><div><dt>Missing keys</dt><dd className={missingKeys ? "warning-text" : ""}>{missingKeys}</dd></div><div><dt>Attempt</dt><dd>One</dd></div></dl>{missingKeys > 0 && <p className="publish-warning"><b>!</b> Questions without keys will remain ungraded until a key is added.</p>}<button className="primary-button wide" type="submit" disabled={selected.size === 0}>Review assignment</button>{preview && <div className="success-note" role="status"><b>Draft reviewed</b><span>The assignment structure is valid and ready for database publishing.</span></div>}</aside>
    </form>
  </>;
}
