import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Private question bank and assignment workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
