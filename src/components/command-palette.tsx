"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  icon: string;
  label: string;
  category: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    // Navigation
    { id: "nav-obs", icon: "🌐", label: "Go to Observatory", category: "Navigate", action: () => router.push("/") },
    { id: "nav-agt", icon: "🤖", label: "Go to Agents", category: "Navigate", action: () => router.push("/agents") },
    { id: "nav-kng", icon: "🧠", label: "Go to Knowledge Graph", category: "Navigate", action: () => router.push("/knowledge") },
    { id: "nav-con", icon: "📜", label: "Go to Constitution", category: "Navigate", action: () => router.push("/constitution") },
    { id: "nav-ade", icon: "💻", label: "Go to ADE", category: "Navigate", action: () => router.push("/ade") },
    { id: "nav-met", icon: "📊", label: "Go to Metrics", category: "Navigate", action: () => router.push("/metrics") },
    // Actions
    { id: "act-task", icon: "⚡", label: "Launch New Agent Task", category: "Action", action: () => router.push("/agents?new=1") },
    { id: "act-health", icon: "🏥", label: "Run Health Check", category: "Action", action: () => {} },
    { id: "act-git", icon: "📦", label: "Git Status", category: "Action", action: () => {} },
  ];

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((o) => !o);
      setQuery("");
      setSelected(0);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const execute = (cmd: Command) => {
    cmd.action();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Palette */}
      <div
        className="relative w-[560px] rounded-xl overflow-hidden shadow-2xl animate-fade-in"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-active)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <span style={{ color: "var(--text-muted)" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && filtered[selected]) execute(filtered[selected]);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${
                i === selected ? "bg-[var(--bg-surface)]" : "hover:bg-[var(--bg-hover)]"
              }`}
              style={{ color: i === selected ? "var(--accent-cyan)" : "var(--text-secondary)" }}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelected(i)}
            >
              <span>{cmd.icon}</span>
              <span className="flex-1">{cmd.label}</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{cmd.category}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
