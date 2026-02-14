interface HealthGaugeProps {
  grade: string;
  score: number;
}

const gradeColors: Record<string, string> = {
  "A+": "var(--accent-cyan)",
  "A": "var(--accent-green)",
  "B+": "var(--accent-green)",
  "B": "var(--accent-amber)",
  "C": "var(--accent-amber)",
  "D": "var(--accent-red)",
  "F": "var(--accent-red)",
};

export function HealthGauge({ grade, score }: HealthGaugeProps) {
  const color = gradeColors[grade] || "var(--text-muted)";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Health
        </div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {score}/100
        </div>
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
        style={{ background: "var(--bg-surface)", color, border: `2px solid ${color}` }}
      >
        {grade}
      </div>
    </div>
  );
}
