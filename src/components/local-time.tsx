"use client";

import { useSyncExternalStore } from "react";

type LocalTimeProps = {
  value: string;
  format?: "date" | "time" | "datetime";
  prefix?: string;
};

function formatInBrowser(value: string, format: NonNullable<LocalTimeProps["format"]>) {
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = format === "date"
    ? { year: "numeric", month: "short", day: "numeric" }
    : format === "time"
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export default function LocalTime({ value, format = "datetime", prefix = "" }: LocalTimeProps) {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const formatted = hydrated ? formatInBrowser(value, format) : "";

  return <time dateTime={value} suppressHydrationWarning>{prefix}{formatted || "…"}</time>;
}
