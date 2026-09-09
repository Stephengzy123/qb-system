"use client";

import { useSyncExternalStore } from "react";

const presetKey = "qb-appearance";
const themeKey = "aoma-theme";
const event = "aoma-theme-change";
let sessionPreset: string | undefined;
let sessionTheme: string | undefined;
function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function isDusk() { return (sessionPreset ?? read(presetKey)) === "dusk"; }
function preferredTheme() {
  const saved = sessionTheme ?? read(themeKey);
  return saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function apply() {
  document.documentElement.dataset.appearance = isDusk() ? "dusk" : "default";
  const theme = isDusk() ? "dark" : preferredTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => { apply(); onChange(); };
  const storage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== presetKey && e.key !== themeKey) return;
    sessionPreset = undefined; sessionTheme = undefined; sync();
  };
  sync();
  window.addEventListener(event, sync);
  window.addEventListener("storage", storage);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener(event, sync);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", sync);
  };
}
export function useDusk() { return useSyncExternalStore(subscribe, isDusk, () => false); }
export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark" ? "dark" : "light", () => "light");
}
export function setPreset(preset: "default" | "dusk") {
  let persisted = true;
  sessionPreset = preset;
  try { localStorage.setItem(presetKey, preset); } catch { persisted = false; }
  apply(); window.dispatchEvent(new Event(event));
  return persisted;
}
export function setTheme(theme: "dark" | "light") {
  if (isDusk()) return;
  sessionTheme = theme;
  try { localStorage.setItem(themeKey, theme); } catch { /* Keep the choice for this session. */ }
  apply(); window.dispatchEvent(new Event(event));
}
