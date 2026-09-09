"use client";

import { setTheme, useDusk, useTheme } from "@/lib/appearance";

export default function ThemeToggle({ label = false }: { label?: boolean }) {
  const theme = useTheme();
  const dusk = useDusk();
  const dark = theme === "dark";
  const title = dusk ? "Dusk uses dark mode. Choose Default in Appearance to change modes." : `Switch to ${dark ? "light" : "dark"} mode`;
  return <button className="theme-toggle" type="button" disabled={dusk} onClick={() => setTheme(dark ? "light" : "dark")} aria-label={title} title={title}><span aria-hidden="true">{dark ? "☀" : "☾"}</span>{label && <b>{dusk ? "Dark mode · Dusk" : dark ? "Light mode" : "Dark mode"}</b>}</button>;
}
