import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Building2, CircleUser, Factory, Handshake, Lightbulb, Package, type LucideIcon } from 'lucide-react';

type NodeId = 'person' | 'company' | 'supplier' | 'product' | 'opportunity' | 'intel';

interface NetworkNode {
  id: NodeId;
  icon: LucideIcon;
  kind: string;
  label: string;
  x: number;
  y: number;
}

const NODES: NetworkNode[] = [
  { id: 'person', icon: CircleUser, kind: 'Person', label: 'Layla H.', x: 16, y: 50 },
  { id: 'company', icon: Building2, kind: 'Company', label: 'Example Contracting', x: 44, y: 15 },
  { id: 'opportunity', icon: Handshake, kind: 'Opportunity', label: 'Supplier visit', x: 79, y: 15 },
  { id: 'intel', icon: Lightbulb, kind: 'Intelligence', label: 'Vendor insight', x: 84, y: 50 },
  { id: 'supplier', icon: Factory, kind: 'Supplier', label: 'Sample Supplies Co.', x: 44, y: 85 },
  { id: 'product', icon: Package, kind: 'Product', label: 'Steel rebar', x: 79, y: 85 },
];

const EDGES: { from: NodeId; to: NodeId; caption: string }[] = [
  { from: 'person', to: 'company', caption: 'Layla works at Example Contracting' },
  { from: 'company', to: 'supplier', caption: 'Example Contracting manages Sample Supplies Co. as a vendor' },
  { from: 'supplier', to: 'product', caption: 'Sample Supplies Co. lists steel rebar' },
  { from: 'company', to: 'opportunity', caption: 'A supplier visit is requested' },
  { from: 'opportunity', to: 'intel', caption: 'Visits and documents build vendor insight' },
  { from: 'product', to: 'intel', caption: 'Product activity feeds supplier intelligence' },
  { from: 'person', to: 'supplier', caption: 'Layla keeps Sample Supplies Co. in her personal network' },
];

const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, NetworkNode>;

const NetworkVisual: React.FC = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<NodeId | null>(null);

  useEffect(() => {
    if (reduce || hovered) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % EDGES.length), 2600);
    return () => window.clearInterval(timer);
  }, [reduce, hovered]);

  const isEdgeActive = (i: number) =>
    hovered ? EDGES[i].from === hovered || EDGES[i].to === hovered : i === active;
  const activeNodes = new Set<NodeId>(
    EDGES.flatMap((e, i) => (isEdgeActive(i) ? [e.from, e.to] : [])),
  );
  const caption = hovered
    ? `${nodeById[hovered].kind}: ${EDGES.filter((e) => e.from === hovered || e.to === hovered).length} connections`
    : EDGES[active].caption;

  return (
    <figure className="relative">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-soko-line bg-soko-mist sm:aspect-[16/11]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--color-soko-line)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {EDGES.map((e, i) => {
            const a = nodeById[e.from];
            const b = nodeById[e.to];
            const on = isEdgeActive(i);
            return (
              <g key={`${e.from}-${e.to}`}>
                <motion.line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="var(--color-soko-line)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, delay: 0.5 + i * 0.12, ease: 'easeOut' }}
                />
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="var(--color-soko-blue)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className={`soko-flow-line transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-0'}`}
                />
              </g>
            );
          })}
        </svg>

        {NODES.map((n, i) => {
          const Icon = n.icon;
          const on = activeNodes.has(n.id);
          return (
            <div key={n.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <motion.button
                type="button"
                aria-label={`${n.kind}: ${n.label}`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                initial={reduce ? false : { opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={`flex w-28 items-center gap-2 rounded-xl border bg-white p-2 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 sm:w-44 sm:gap-2.5 sm:p-2.5 ${
                  on ? 'border-soko-blue shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)]' : 'border-soko-line'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 sm:h-9 sm:w-9 ${
                    on ? 'bg-soko-blue text-white' : 'bg-soko-mist text-soko-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-soko-muted sm:text-[11px]">{n.kind}</span>
                  <span className="block truncate text-xs font-semibold text-soko-ink sm:text-sm">{n.label}</span>
                </span>
              </motion.button>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-3 text-xs text-soko-muted sm:text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-soko-blue" aria-hidden="true" />
          <span className="truncate">{caption}</span>
        </span>
        <span className="shrink-0 rounded-full border border-soko-line px-2 py-0.5 text-[11px] font-medium">Illustrative example</span>
      </figcaption>
    </figure>
  );
};

interface HeroSectionProps {
  onExplore: () => void;
  onJoin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplore, onJoin }) => {
  const reduce = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section id="top" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:px-8 lg:py-14">
        <div>
          <motion.p {...enter(0)} className="inline-flex items-center gap-2 rounded-full border border-soko-line bg-white px-3 py-1 text-xs font-medium text-soko-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-soko-blue" aria-hidden="true" />
            Built in the UAE. Designed for the global construction industry.
          </motion.p>
          <motion.h1
            {...enter(0.06)}
            id="hero-heading"
            className="mt-5 font-[Outfit] text-4xl font-bold leading-[1.05] tracking-tight text-soko-ink text-balance sm:text-5xl lg:text-6xl"
          >
            Your Construction Network. <span className="text-soko-blue">Finally Connected.</span>
          </motion.h1>
          <motion.p {...enter(0.12)} className="mt-5 max-w-xl text-lg leading-relaxed text-soko-muted text-pretty">
            Still managing suppliers, contacts and products across spreadsheets, messages and disconnected systems? Meet SOKO — one intelligent network for the people and businesses that build.
          </motion.p>
          <motion.div {...enter(0.18)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onExplore}
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-soko-blue px-6 py-3.5 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.7)] transition-all hover:-translate-y-0.5 hover:bg-soko-blue/90"
            >
              Explore SOKO Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex items-center justify-center rounded-lg border border-soko-line bg-white px-6 py-3.5 font-semibold text-soko-ink transition-all hover:-translate-y-0.5 hover:border-soko-ink"
            >
              Create Your SOKO Account
            </button>
          </motion.div>
          <motion.p {...enter(0.24)} className="mt-3 text-sm text-soko-muted">
            Explore uses an interactive demo with sample data. No sign-up needed.
          </motion.p>
        </div>

        <NetworkVisual />
      </div>
    </section>
  );
};
