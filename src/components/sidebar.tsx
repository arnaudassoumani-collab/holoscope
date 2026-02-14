"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ObservatoryIcon,
  AgentsIcon,
  KnowledgeIcon,
  ConstitutionIcon,
  ADEIcon,
  MetricsIcon,
  CommandIcon,
  HoloscopeIcon,
  SocaIcon,
} from "./icons";
import type { LucideIcon } from "lucide-react";

interface Panel {
  id: string;
  Icon: LucideIcon;
  label: string;
  path: string;
  shortcut: string;
  num: number;
}

const panels: Panel[] = [
  { id: "observatory", Icon: ObservatoryIcon, label: "Observatory", path: "/", shortcut: "⌘1", num: 1 },
  { id: "agents", Icon: AgentsIcon, label: "Agents", path: "/agents", shortcut: "⌘2", num: 2 },
  { id: "knowledge", Icon: KnowledgeIcon, label: "Knowledge", path: "/knowledge", shortcut: "⌘3", num: 3 },
  { id: "constitution", Icon: ConstitutionIcon, label: "Constitution", path: "/constitution", shortcut: "⌘4", num: 4 },
  { id: "ade", Icon: ADEIcon, label: "ADE", path: "/ade", shortcut: "⌘5", num: 5 },
  { id: "metrics", Icon: MetricsIcon, label: "Metrics", path: "/metrics", shortcut: "⌘6", num: 6 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
          e.preventDefault();
          const panel = panels.find((p) => p.num === num);
          if (panel) router.push(panel.path);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

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
        <HoloscopeIcon size={20} style={{ color: "var(--accent-cyan)" }} />
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
              <panel.Icon size={16} className="flex-shrink-0" />
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

      {/* Bottom */}
      <div className="p-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
        <button
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          title="Command Palette (⌘K)"
        >
          <CommandIcon size={14} className="flex-shrink-0" />
          {expanded && <span className="animate-fade-in text-xs">⌘K Search</span>}
        </button>

        <div className="flex items-center justify-center mt-2 opacity-40">
          <SocaIcon size={14} />
          {expanded && <span className="ml-1 text-[10px] animate-fade-in">SOCA</span>}
        </div>
      </div>
    </aside>
  );
}
