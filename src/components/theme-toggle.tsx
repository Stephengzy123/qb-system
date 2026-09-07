"use client";

import { useSyncExternalStore } from "react";

const storageKey = "aoma-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystemTheme = () => {
    if (!localStorage.getItem(storageKey)) applyTheme(media.matches ? "dark" : "light");
    onChange();
  };
  window.addEventListener("aoma-theme-change", onChange);
  media.addEventListener("change", syncSystemTheme);
  return () => {
    window.removeEventListener("aoma-theme-change", onChange);
    media.removeEventListener("change", syncSystemTheme);
  };
}

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle({ label = false }: { label?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  const dark = theme === "dark";

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    localStorage.setItem(storageKey, next);
    applyTheme(next);
    window.dispatchEvent(new Event("aoma-theme-change"));
  }

  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}><span aria-hidden="true">{dark ? "☀" : "☾"}</span>{label && <b>{dark ? "Light mode" : "Dark mode"}</b>}</button>;
}
