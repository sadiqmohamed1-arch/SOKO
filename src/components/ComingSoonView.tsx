import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ComingSoonViewProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ icon: Icon, title, description }) => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
      <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-md mx-auto">{description}</p>
      <span className="mt-6 inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
        Coming soon
      </span>
    </div>
  </div>
);
