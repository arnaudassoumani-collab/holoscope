import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

export const metadata: Metadata = {
  title: "HOLOSCOPE 🔭",
  description: "SOCA Holobiont OS — Unified Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        <CommandPalette />
      </body>
    </html>
  );
}
