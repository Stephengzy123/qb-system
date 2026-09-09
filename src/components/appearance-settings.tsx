"use client";

import { useState } from "react";
import { setPreset, useDusk } from "@/lib/appearance";
import ThemeToggle from "@/components/theme-toggle";
import AdminAppearance from "@/components/admin-appearance";

export default function AppearanceSettings({ admin }: { admin: boolean }) {
  const dusk = useDusk();
  const [message, setMessage] = useState("");
  function choose(preset: "default" | "dusk") {
    const saved = setPreset(preset);
    setMessage(`${preset === "dusk" ? "Dusk applied. Dark mode is locked while Dusk is selected." : "Default restored. Light and dark modes are available."} ${saved ? "Saved in this browser." : "Applied for this session; browser storage is unavailable."}`);
  }
  return <div className="appearance-settings">
    <section className="panel appearance-panel">
      <h2>Appearance</h2><p>Make your workspace feel like yours. Changes apply instantly and are saved in this browser.</p>
      <div className="appearance-options" aria-label="Appearance presets">
        <button type="button" className="preset-card" aria-pressed={!dusk} onClick={() => choose("default")}><span className="preset-preview preset-default" aria-hidden="true"><i /><b /><b /></span><strong>Default {!dusk && "✓"}</strong><small>Your choice of light or dark mode</small></button>
        <button type="button" className="preset-card" aria-pressed={dusk} onClick={() => choose("dusk")}><span className="preset-preview preset-dusk" aria-hidden="true"><i /><b /><b /></span><strong>Dusk {dusk && "✓"}</strong><small>A warm brown to deep indigo gradient · Dark only</small></button>
      </div>
      <div className="appearance-mode"><div><h3>Color mode</h3><p>{dusk ? "Dusk always uses dark mode. Reset to Default to use light mode." : "Switch between light and dark whenever you like."}</p></div><ThemeToggle label /></div>
      <button type="button" className="secondary-button" onClick={() => choose("default")}>Reset to default</button>
      <p role="status">{message}</p>
    </section>
    {admin && <><p className="appearance-note">Your temporary admin palette is kept separately. Dusk takes priority while selected.</p><AdminAppearance /></>}
  </div>;
}
