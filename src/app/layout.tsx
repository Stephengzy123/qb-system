import type { Metadata } from "next";
import { getOrganizationBranding } from "@/lib/organization";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getOrganizationBranding();
  return {
    title: `${branding.name} Question Bank`,
    description: "Private question bank and assignment workspace",
    icons: { icon: `/api/branding/favicon?v=${branding.logoVersion}` },
  };
}

const themeScript = `(function(){try{var saved=localStorage.getItem('aoma-theme');document.documentElement.dataset.appearance=localStorage.getItem('qb-appearance')==='dusk'?'dusk':'default';var theme=document.documentElement.dataset.appearance==='dusk'?'dark':saved==='dark'||saved==='light'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
