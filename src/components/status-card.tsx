interface StatusCardProps {
  name: string;
  icon: string;
  status: "online" | "offline" | "warning" | "loading";
  detail: string;
}

const statusColors = {
  online: "var(--accent-green)",
  offline: "var(--accent-red)",
  warning: "var(--accent-amber)",
  loading: "var(--accent-blue)",
};

export function StatusCard({ name, icon, status, detail }: StatusCardProps) {
  return (
    <div
      className="rounded-xl p-3 border flex items-center gap-3 transition-colors hover:border-[var(--border-active)] cursor-default"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{detail}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColors[status] }}
        />
        <span className="text-[10px]" style={{ color: statusColors[status] }}>
          {status}
        </span>
      </div>
    </div>
  );
}
