export type SolutionId = 'professionals' | 'suppliers' | 'contractors';

export const SOLUTIONS: { id: SolutionId; label: string; navLabel: string }[] = [
  { id: 'professionals', label: 'Professionals', navLabel: 'For Professionals' },
  { id: 'suppliers', label: 'Suppliers', navLabel: 'For Suppliers' },
  { id: 'contractors', label: 'Contractors', navLabel: 'For Contractors' },
];

export const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
};
