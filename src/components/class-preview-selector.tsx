"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type PreviewClass = { id: string; name: string };

export default function ClassPreviewSelector({ classes, selectedId }: { classes: PreviewClass[]; selectedId: string }) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  function selectClass(classId: string) {
    startTransition(() => {
      router.replace(classId ? `/student?classId=${encodeURIComponent(classId)}` : "/student");
    });
  }

  return <section className="panel class-preview-picker"><label htmlFor="preview-class"><span>Preview class</span><select id="preview-class" value={selectedId} disabled={loading || classes.length === 0} onChange={(event) => selectClass(event.target.value)}><option value="">Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p>{loading ? "Loading class preview…" : classes.length === 0 ? "Create a class before previewing its student workspace." : "Only classes you are allowed to manage are available."}</p></section>;
}
