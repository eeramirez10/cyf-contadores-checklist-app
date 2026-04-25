import { completionLabel, gaugeColor } from "@/lib/progress";

type GaugeProps = {
  label: string;
  value: number;
  subtitle?: string;
};

export function Gauge({ label, value, subtitle }: GaugeProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const status = completionLabel(normalizedValue);
  const needleRotation = -180 + normalizedValue * 1.8;

  return (
    <article className="surface rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="display-title text-sm font-semibold tracking-wide text-[var(--foreground-soft)]">
          {label}
        </h3>
        <span className="status-pill rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--foreground-soft)]">
          {status}
        </span>
      </div>

      <div className="relative mx-auto mt-1 h-[98px] w-[160px] rounded-xl bg-[linear-gradient(180deg,#fcfeff_0%,#f1f6fe_100%)] p-1">
        <svg viewBox="0 0 160 100" className="h-full w-full">
          <path
            d="M 14 88 A 66 66 0 0 1 146 88"
            fill="none"
            stroke="var(--gauge-track)"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength={100}
          />
          <path
            d="M 14 88 A 66 66 0 0 1 146 88"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="60 40"
            pathLength={100}
          />
          <path
            d="M 14 88 A 66 66 0 0 1 146 88"
            fill="none"
            stroke="var(--warning)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="20 80"
            strokeDashoffset={-60}
            pathLength={100}
          />
          <path
            d="M 14 88 A 66 66 0 0 1 146 88"
            fill="none"
            stroke="var(--success)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="20 80"
            strokeDashoffset={-80}
            pathLength={100}
          />
          <path
            d="M 14 88 A 66 66 0 0 1 146 88"
            fill="none"
            stroke={gaugeColor(normalizedValue)}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${normalizedValue} ${100 - normalizedValue}`}
            pathLength={100}
          />
          <g
            transform={`translate(80 88) rotate(${needleRotation})`}
            style={{ transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <line x1="0" y1="0" x2="47" y2="0" stroke="var(--gauge-needle)" strokeWidth="2.5" />
          </g>
          <circle cx="80" cy="88" r="5" fill="var(--gauge-needle)" />
          <text
            x="80"
            y="66"
            textAnchor="middle"
            className="font-mono text-xs"
            fill="var(--foreground-soft)"
          >
            Cumplimiento
          </text>
          <text
            x="80"
            y="79"
            textAnchor="middle"
            className="font-bold text-xl"
            fill="var(--gauge-value)"
          >
            {normalizedValue.toFixed(1)}%
          </text>
        </svg>
      </div>

      {subtitle ? (
        <p className="mt-1 text-xs font-medium tracking-wide text-[var(--foreground-soft)]/90">
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}
