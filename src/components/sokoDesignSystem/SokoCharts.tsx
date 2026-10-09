import React from 'react';
import { sokoTone, type MetricTone } from './SokoComponents';

export interface SokoSegment {
  label: string;
  value: number;
  tone: MetricTone;
}

export const SokoSegmentBar: React.FC<{ segments: SokoSegment[]; height?: string }> = ({ segments, height = 'h-2' }) => {
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
    <li className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
      <span className="text-xs text-slate-700 truncate">{label}</span>
      <div className="h-5 rounded-md bg-slate-100 overflow-hidden" role="presentation">
        <div className={`h-full rounded-md ${sokoTone(tone).bar} flex items-center px-1.5 transition-all duration-500`} style={{ width: `${Math.max(pct, 6)}%` }}>
          <span className="font-mono text-[10px] font-semibold text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-500 tabular-nums text-right w-16 leading-tight">
        <span className="font-semibold text-slate-800">{value}</span> {value === 1 ? unit[0] : unit[1]}
      </span>
    </li>
  );
};

export const SokoWaffle: React.FC<{ cells: MetricTone[]; label: string }> = ({ cells, label }) => (
  <div className="flex gap-[3px] h-6" role="img" aria-label={label}>
    {cells.map((t, i) => <span key={i} className={`flex-1 max-w-6 rounded-[3px] ${sokoTone(t).bar}`} />)}
  </div>
);

export const SokoColumnChart: React.FC<{ values: number[]; startLabel: string; endLabel: string; height?: string; label: string }> = ({ values, startLabel, endLabel, height = 'h-20', label }) => {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className={`flex items-end gap-1.5 ${height}`} role="img" aria-label={`${label}: ${values.join(', ')}`}>
        {values.map((v, i) => {
          const last = i === values.length - 1;
          return (
            <div key={i} className="flex-1 h-full flex items-end">
              <div className={`w-full rounded-t-[4px] rounded-b-[2px] transition-all duration-500 ${last ? 'bg-blue-600' : v > 0 ? 'bg-blue-200' : 'bg-slate-100'}`}
                style={{ height: `${v > 0 ? Math.max((v / max) * 100, 8) : 6}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
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
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => <span key={i} className="font-mono text-[10px] text-slate-400 pb-1">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = dayKey(d);
          const isToday = key === todayKey;
          const isMarked = marked.has(key);
          const past = d < today && !isToday;
          return (
            <span key={i} aria-label={isMarked ? `${d.getDate()}: visit scheduled` : undefined}
              className={`relative h-7 rounded-lg flex items-center justify-center text-xs tabular-nums ${
                isToday ? 'bg-slate-900 text-white font-semibold' : isMarked ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200' : past ? 'text-slate-300' : 'text-slate-700'
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
