"use client";

import { useState } from "react";

interface AgentTask {
  id: string;
  title: string;
  model: string;
  tier: number;
  status: "todo" | "running" | "review" | "done";
  tokens: number;
  cost: string;
  duration: string;
}

const mockTasks: AgentTask[] = [
  { id: "1", title: "Build HOLOSCOPE sidebar", model: "MiniMax M2.5", tier: 2, status: "done", tokens: 4200, cost: "$0.005", duration: "45s" },
  { id: "2", title: "Implement command palette", model: "MiniMax M2.5", tier: 2, status: "done", tokens: 3800, cost: "$0.004", duration: "38s" },
  { id: "3", title: "Agent kanban board", model: "MiniMax M2.5", tier: 2, status: "running", tokens: 1200, cost: "$0.001", duration: "12s" },
  { id: "4", title: "3D knowledge graph", model: "Opus 4.6", tier: 3, status: "todo", tokens: 0, cost: "-", duration: "-" },
  { id: "5", title: "Constitution parser", model: "MiMo V2 Flash", tier: 0, status: "todo", tokens: 0, cost: "-", duration: "-" },
];

const columns = [
  { key: "todo" as const, label: "📋 TODO", color: "var(--text-muted)" },
  { key: "running" as const, label: "⚡ RUNNING", color: "var(--accent-cyan)" },
  { key: "review" as const, label: "👀 REVIEW", color: "var(--accent-amber)" },
  { key: "done" as const, label: "✅ DONE", color: "var(--accent-green)" },
];

const tierBadge = (tier: number) => {
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "FREE", color: "var(--accent-amber)" },
    1: { label: "T1", color: "var(--accent-amber)" },
    2: { label: "T2", color: "var(--accent-green)" },
    3: { label: "T3", color: "var(--accent-purple)" },
  };
  const t = map[tier] || map[0];
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${t.color}22`, color: t.color }}>
      {t.label}
    </span>
  );
};

export default function AgentsPage() {
  const [tasks] = useState(mockTasks);

  return (
    <div className="h-full overflow-hidden flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🤖</span>
            <span style={{ color: "var(--accent-cyan)" }}>Agent Control</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Launch, monitor, and manage AI agent tasks
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: "var(--accent-cyan)", color: "var(--bg-primary)" }}
        >
          <span>⚡</span> New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="flex-1 min-w-[250px] flex flex-col">
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-sm font-bold" style={{ color: col.color }}>{col.label}</span>
                <span
                  className="text-[10px] px-1.5 rounded-full"
                  style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg p-3 border cursor-pointer transition-all hover:border-[var(--border-active)] hover:translate-y-[-1px]"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
                  >
                    <div className="text-sm font-medium mb-2">{task.title}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {tierBadge(task.tier)}
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{task.model}</span>
                    </div>
                    {task.status !== "todo" && (
                      <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>🔤 {task.tokens.toLocaleString()} tok</span>
                        <span>💰 {task.cost}</span>
                        <span>⏱ {task.duration}</span>
                      </div>
                    )}
                    {task.status === "running" && (
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
                        <div className="h-full rounded-full pulse-glow" style={{ width: "60%", background: "var(--accent-cyan)" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
