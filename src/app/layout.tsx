import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Private question bank and assignment workspace",
  icons: { icon: "/api/branding/favicon" },
};

const themeScript = `(function(){try{var saved=localStorage.getItem('aoma-theme');var theme=saved==='dark'||saved==='light'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
