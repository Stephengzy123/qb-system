import Workspace from "@/components/workspace";

export default function ImportsPage() {
  return <Workspace view="library"><header className="page-header compact"><div><p className="eyebrow">CONTENT</p><h1>Import history</h1><p className="lede">Review question-set uploads and any files that need attention.</p></div><a className="primary-button" href="/question-bank">Upload a set</a></header><section className="panel"><div className="panel-heading"><div><h2>Recent imports</h2><p>Completed uploads and validation outcomes</p></div></div><div className="empty-state"><span>↑</span><h2>No imports yet</h2><p>Your folder and ZIP uploads will appear here.</p></div></section></Workspace>;
}
