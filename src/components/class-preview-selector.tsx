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

  return <label className="preview-class-control" htmlFor="preview-class"><span>Preview class</span><select id="preview-class" value={selectedId} disabled={loading || classes.length === 0} onChange={(event) => selectClass(event.target.value)}><option value="">{classes.length === 0 ? "No classes available" : "Select a class"}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{loading && <small>Loading…</small>}</label>;
}
