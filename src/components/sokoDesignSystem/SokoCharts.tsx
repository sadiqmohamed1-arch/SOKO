import React, { useId } from 'react';
import { sokoTone, type MetricTone } from './SokoComponents';

export interface SokoSegment {
  label: string;
  value: number;
  tone: MetricTone;
}

export const SokoSegmentBar: React.FC<{ segments: SokoSegment[]; height?: string }> = ({ segments, height = 'h-2.5' }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className={`flex ${height} gap-1`} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
      {total === 0
        ? <div className="flex-1 rounded-full bg-slate-100" />
        : segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className={`${sokoTone(s.tone).bar} rounded-full transition-all duration-500`} style={{ flexGrow: s.value, flexBasis: 0 }} />
        ))}
    </div>
  );
};

export const SokoCoverageRow: React.FC<{ label: string; value: number; total: number; unit: [string, string]; tone?: MetricTone }> = ({ label, value, total, unit, tone = 'blue' }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3">
      <span className="text-[13px] text-slate-700 truncate" title={label}>{label}</span>
      <div className="h-5 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label={`${label}: ${pct}%`}>
        <div className={`h-full rounded-full ${sokoTone(tone).bar} flex items-center px-2 transition-all duration-500`} style={{ width: `${Math.max(pct, 14)}%` }}>
          <span className="font-mono text-[10px] font-semibold text-white">{pct}%</span>
        </div>
      </div>
      <span className="min-w-[4.5rem] text-right font-mono text-[10.5px] text-slate-500 whitespace-nowrap tabular-nums">
        <span className="text-slate-800 font-semibold">{value}</span> {value === 1 ? unit[0] : unit[1]}
      </span>
    </li>
  );
};

export const SokoWaffle: React.FC<{ cells: MetricTone[]; label: string }> = ({ cells, label }) => (
  <div className="flex gap-[3px] h-6" role="img" aria-label={label}>
    {cells.map((t, i) => <span key={i} className={`flex-1 max-w-6 rounded-[3px] ${sokoTone(t).bar}`} />)}
  </div>
);

export const SokoTickBar: React.FC<{ cells: MetricTone[]; label: string; minTicks?: number }> = ({ cells, label, minTicks = 40 }) => {
  const filler = Math.max(0, minTicks - cells.length);
  return (
    <div className="flex gap-[3px] h-7" role="img" aria-label={label}>
      {cells.map((t, i) => <span key={i} className={`flex-1 rounded-[2px] ${sokoTone(t).bar}`} />)}
      {Array.from({ length: filler }, (_, i) => <span key={`f${i}`} className="flex-1 rounded-[2px] bg-slate-100" />)}
    </div>
  );
};

const SPARK_COLORS: Record<'blue' | 'amber' | 'green', string> = { blue: '#2563eb', amber: '#f59e0b', green: '#10b981' };

export const SokoSparkLine: React.FC<{ values: number[]; tone?: keyof typeof SPARK_COLORS; label: string }> = ({ values, tone = 'blue', label }) => {
  const id = useId();
  const color = SPARK_COLORS[tone];
  const w = 100;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * (w - 4) + 2 : w / 2, h - 4 - ((v - min) / span) * (h - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10 overflow-visible" role="img" aria-label={label} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.2" fill="white" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const SokoColumnChart: React.FC<{ values: number[]; startLabel: string; endLabel: string; height?: string; label: string }> = ({ values, startLabel, endLabel, height = 'h-16', label }) => {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className={`flex items-end gap-1.5 ${height}`} role="img" aria-label={`${label}: ${values.join(', ')}`}>
        {values.map((v, i) => {
          const last = i === values.length - 1;
          return (
            <div key={i} className="flex-1 h-full flex items-end">
              <div className={`w-full rounded-md transition-all duration-500 ${last ? 'bg-blue-600' : v > 0 ? 'bg-blue-200' : 'bg-blue-100'}`}
                style={{ height: `${v > 0 ? Math.max((v / max) * 100, 14) : 10}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-400">
        <span>{startLabel}</span><span>{endLabel}</span>
      </div>
    </div>
  );
};

export const SokoSparkColumns: React.FC<{ values: number[]; label: string }> = ({ values, label }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[3px] h-8" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span key={i} className={`flex-1 rounded-sm ${i === values.length - 1 ? 'bg-blue-600' : v > 0 ? 'bg-blue-200' : 'bg-slate-100'}`} style={{ height: `${v > 0 ? Math.max((v / max) * 100, 15) : 10}%` }} />
      ))}
    </div>
  );
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const SokoMiniCalendar: React.FC<{ today: Date; marked: Set<string> }> = ({ today, marked }) => {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1)),
  ];
  const todayKey = dayKey(today);
  return (
    <div>
      <p className="sr-only">{today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      <div className="grid grid-cols-7 gap-x-1.5 gap-y-1 text-center">
        {WEEKDAYS.map((d, i) => <span key={i} className="font-mono text-[10px] text-slate-400 pb-0.5" aria-hidden>{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = dayKey(d);
          const isToday = key === todayKey;
          const isMarked = marked.has(key);
          const past = d < today && !isToday;
          return (
            <span key={i} aria-label={isMarked ? `${d.getDate()}: visit scheduled` : undefined}
              className={`relative h-6 rounded-md flex items-center justify-center font-mono text-[11px] tabular-nums ${
                isToday ? 'bg-slate-900 text-white font-semibold' : isMarked ? 'bg-blue-50 text-blue-700 font-semibold' : past ? 'text-slate-400' : 'text-slate-700'
              }`}>
              {d.getDate()}
              {isMarked && <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-blue-600'}`} />}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const sokoDayKey = dayKey;
