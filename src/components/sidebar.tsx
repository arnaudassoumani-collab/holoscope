"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const panels = [
  { id: "observatory", icon: "🌐", label: "Observatory", path: "/", shortcut: "⌘1" },
  { id: "agents", icon: "🤖", label: "Agents", path: "/agents", shortcut: "⌘2" },
  { id: "knowledge", icon: "🧠", label: "Knowledge", path: "/knowledge", shortcut: "⌘3" },
  { id: "constitution", icon: "📜", label: "Constitution", path: "/constitution", shortcut: "⌘4" },
  { id: "ade", icon: "💻", label: "ADE", path: "/ade", shortcut: "⌘5" },
  { id: "metrics", icon: "📊", label: "Metrics", path: "/metrics", shortcut: "⌘6" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className="flex flex-col h-full border-r transition-all duration-200 ease-out select-none"
      style={{
        width: expanded ? "var(--sidebar-expanded)" : "var(--sidebar-width)",
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b" style={{ borderColor: "var(--border-primary)" }}>
        <span className="text-lg" title="HOLOSCOPE">🔭</span>
        {expanded && (
          <span className="ml-2 text-xs font-bold tracking-widest animate-fade-in" style={{ color: "var(--accent-cyan)" }}>
            HOLOSCOPE
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-3">
        {panels.map((panel) => {
          const isActive = pathname === panel.path || (panel.path !== "/" && pathname.startsWith(panel.path));
          return (
            <Link
              key={panel.id}
              href={panel.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[var(--bg-surface)] text-[var(--accent-cyan)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
              title={`${panel.label} (${panel.shortcut})`}
            >
              <span className="text-base w-6 text-center flex-shrink-0">{panel.icon}</span>
              {expanded && (
                <span className="animate-fade-in whitespace-nowrap flex-1">{panel.label}</span>
              )}
              {expanded && (
                <span className="text-[10px] animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  {panel.shortcut}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — Command Palette trigger */}
      <div className="p-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
        <button
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          title="Command Palette (⌘K)"
        >
          <span className="text-base w-6 text-center flex-shrink-0">⌘</span>
          {expanded && <span className="animate-fade-in text-xs">⌘K Search</span>}
        </button>

        {/* SOCA stamp */}
        <div className="flex items-center justify-center mt-2 opacity-40">
          <span className="text-xs">🌀</span>
          {expanded && <span className="ml-1 text-[10px] animate-fade-in">SOCA</span>}
        </div>
      </div>
    </aside>
  );
}
