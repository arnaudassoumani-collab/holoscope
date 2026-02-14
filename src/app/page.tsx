import { StatusCard } from "@/components/status-card";
import { HealthGauge } from "@/components/health-gauge";
import {
  SocaIcon, DockerIcon, TailscaleIcon, GitHubIcon,
  DatabaseIcon, MailIcon, ServerIcon,
} from "@/components/icons";

export default function ObservatoryPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--accent-cyan)" }}>
            System Observatory
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Bird&apos;s-eye view of the SOCA HOLOBIONT OS ecosystem
          </p>
        </div>
        <HealthGauge grade="A" score={92} />
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatusCard name="Clawdbot" Icon={SocaIcon} status="online" detail="Opus 4.6 · 18789" />
        <StatusCard name="Docker" Icon={DockerIcon} status="online" detail="8 containers" />
        <StatusCard name="Tailscale" Icon={TailscaleIcon} status="online" detail="3 nodes" />
        <StatusCard name="GitHub" Icon={GitHubIcon} status="online" detail="holoscope · 0 PRs" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatusCard name="Redis" Icon={DatabaseIcon} status="online" detail="localhost:6379" />
        <StatusCard name="PostgreSQL" Icon={DatabaseIcon} status="offline" detail="Not configured" />
        <StatusCard name="Neo4j" Icon={DatabaseIcon} status="offline" detail="Not configured" />
        <StatusCard name="Stalwart" Icon={MailIcon} status="online" detail="SMTP/IMAP" />
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricPanel title="CPU" value="12%" color="var(--accent-green)" />
        <MetricPanel title="Memory" value="4.2 GB / 16 GB" color="var(--accent-blue)" />
        <MetricPanel title="Disk" value="39% used" color="var(--accent-amber)" />
      </div>

      {/* Trust Scores */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <ScoreCard label="ZHV" value={100} unit="%" color="var(--accent-green)" />
        <ScoreCard label="ZHDEEV" value={100} unit="%" color="var(--accent-green)" />
        <ScoreCard label="Trust" value={95} unit="%" color="var(--accent-green)" />
        <ScoreCard label="Drift" value={0} unit="%" color="var(--accent-green)" inverted />
        <ScoreCard label="RSI" value={72} unit="%" color="var(--accent-blue)" />
      </div>

      {/* VPS Info */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      >
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <ServerIcon size={14} />
          VPS — srv937502 (Hostinger)
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
    <div className="rounded-xl p-4 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{title}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function ScoreCard({ label, value, unit, color, inverted }: {
  label: string; value: number; unit: string; color: string; inverted?: boolean;
}) {
  const displayColor = inverted
    ? (value === 0 ? "var(--accent-green)" : value < 5 ? "var(--accent-amber)" : "var(--accent-red)")
    : color;
  return (
    <div className="rounded-xl p-3 border text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xl font-black" style={{ color: displayColor }}>{value}{unit}</div>
    </div>
  );
}
