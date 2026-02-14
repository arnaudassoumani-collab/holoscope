import { StatusCard } from "@/components/status-card";
import { HealthGauge } from "@/components/health-gauge";

export default function ObservatoryPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🌐</span>
            <span style={{ color: "var(--accent-cyan)" }}>System Observatory</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Bird&apos;s-eye view of the SOCA HOLOBIONT OS ecosystem
          </p>
        </div>
        <HealthGauge grade="A" score={92} />
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatusCard name="Clawdbot" icon="🌀" status="online" detail="Opus 4.6 · 18789" />
        <StatusCard name="Docker" icon="🐳" status="online" detail="8 containers" />
        <StatusCard name="Tailscale" icon="🔗" status="online" detail="3 nodes" />
        <StatusCard name="GitHub" icon="📦" status="online" detail="holoscope · 0 PRs" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatusCard name="Redis" icon="🔴" status="online" detail="localhost:6379" />
        <StatusCard name="PostgreSQL" icon="🐘" status="offline" detail="Not configured" />
        <StatusCard name="Neo4j" icon="🕸️" status="offline" detail="Not configured" />
        <StatusCard name="Stalwart" icon="📧" status="online" detail="SMTP/IMAP" />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricPanel title="CPU" value="12%" color="var(--accent-green)" />
        <MetricPanel title="Memory" value="4.2 GB / 16 GB" color="var(--accent-blue)" />
        <MetricPanel title="Disk" value="39% used" color="var(--accent-amber)" />
      </div>

      {/* VPS Info */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
          🖥️ VPS — srv937502 (Hostinger)
        </h2>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <span style={{ color: "var(--text-muted)" }}>OS</span>
            <p>Ubuntu 24.04 LTS</p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Node</span>
            <p>v22.22.0</p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Tailscale IP</span>
            <p>100.64.0.21</p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Uptime</span>
            <p>14d 6h</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPanel({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
    >
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{title}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
