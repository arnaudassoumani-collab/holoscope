import { OnlineIcon, OfflineIcon, WarningIcon, LoadingIcon } from "./icons";
import type { LucideIcon } from "lucide-react";

interface StatusCardProps {
  name: string;
  Icon: LucideIcon;
  status: "online" | "offline" | "warning" | "loading";
  detail: string;
}

const statusConfig = {
  online: { color: "var(--accent-green)", Icon: OnlineIcon, label: "online" },
  offline: { color: "var(--accent-red)", Icon: OfflineIcon, label: "offline" },
  warning: { color: "var(--accent-amber)", Icon: WarningIcon, label: "warning" },
  loading: { color: "var(--accent-blue)", Icon: LoadingIcon, label: "loading" },
};

export function StatusCard({ name, Icon, status, detail }: StatusCardProps) {
  const cfg = statusConfig[status];
  return (
    <div
      className="rounded-xl p-3 border flex items-center gap-3 transition-colors hover:border-[var(--border-active)] cursor-default"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <Icon size={18} style={{ color: "var(--text-secondary)" }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{detail}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <cfg.Icon size={12} style={{ color: cfg.color }} />
        <span className="text-[10px]" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
