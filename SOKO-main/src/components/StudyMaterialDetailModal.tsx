import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Download,
  Award,
  CheckCircle,
  Sparkles,
  FileText,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from 'lucide-react';
import { LearningItem } from '../types';

interface StudyMaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: LearningItem | null;
  onComplete: (materialId: string, points: number) => void;
}

export const StudyMaterialDetailModal: React.FC<StudyMaterialDetailModalProps> = ({
  isOpen,
  onClose,
  material,
  onComplete,
}) => {
  const [curriculum, setCurriculum] = useState<{ title: string; duration: string; completed?: boolean }[]>([]);
  const [hasCompletedCourse, setHasCompletedCourse] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (material) {
      setCurriculum(material.curriculum || []);
      setHasCompletedCourse(!!material.completed);
      setDownloadSuccess(false);
    }
  }, [material]);

  if (!isOpen || !material) return null;

  const toggleChapter = (index: number) => {
    const updated = [...curriculum];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setCurriculum(updated);
  };

  const completedCount = curriculum.filter((c) => c.completed).length;
  const progressPercent = curriculum.length > 0 ? Math.round((completedCount / curriculum.length) * 100) : 100;

  const handleCompleteAll = () => {
    setHasCompletedCourse(true);
    setCurriculum((prev) => prev.map((c) => ({ ...c, completed: true })));
    onComplete(material.id, material.rewardPoints || 100);
  };

  const handleDownload = () => {
    setDownloadSuccess(true);
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `${material.title.slice(0, 30)}.pdf`);
    document.body.appendChild(link);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Technical Study Material & Knowledge Module
              </span>
              <span className="text-xs text-slate-500">SoKo Civil & Commercial Library</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Hero Overview */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <img
              src={material.thumbnail}
              alt={material.title}
              className="w-full sm:w-44 h-44 object-cover rounded-xl shadow-md shrink-0"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {material.category}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {material.documentFormat || 'PDF Document'}
                </span>
                {material.pageCount && (
                  <span className="text-xs text-slate-500">
                    · {material.pageCount} Pages
                  </span>
                )}
                {material.fileSize && (
                  <span className="text-xs text-slate-500 font-mono">
                    · {material.fileSize}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {material.title}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                {material.description}
              </p>
            </div>
          </div>

          {/* Reward Points & Complete Action */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Complete Study Module & Claim Reward
                </span>
                <span className="text-[11px] text-emerald-700">
                  Earn +{material.rewardPoints || 100} points redeemable for course and material discount vouchers.
                </span>
              </div>
            </div>

            <button
              onClick={handleCompleteAll}
              disabled={hasCompletedCourse}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hasCompletedCourse
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              {hasCompletedCourse ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Completed (+100 Pts)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete All (+100 Pts)
                </>
              )}
            </button>
          </div>

          {/* Action Bar: Download Simulated PDF/Model */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {material.documentFormat?.includes('Excel') ? (
                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
              ) : (
                <FileText className="w-7 h-7 text-blue-600" />
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Full Toolkit Package & Workpapers
                </h4>
                <p className="text-[11px] text-slate-500">
                  Includes unlocked spreadsheet calculations, checklist templates, and regulatory cross-reference.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              {downloadSuccess ? 'Downloaded!' : 'Download Package'}
            </button>
          </div>

          {/* Curriculum Checklist */}
          {curriculum.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Course Curriculum & Chapters ({completedCount}/{curriculum.length})
                </h4>
                <span className="text-xs font-bold text-emerald-700">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-2">
                {curriculum.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleChapter(idx)}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0 ml-2">
                      {item.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              Technical Specifications & Key Principles
            </h4>
            <div className="space-y-2">
              {material.keyTakeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Author Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <img
              src={material.authorAvatar}
              alt={material.author}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-600/20"
            />
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Publisher / Editorial Reviewer
              </span>
              <h4 className="text-sm font-bold text-slate-900">{material.author}</h4>
              <p className="text-xs text-slate-600">
                {material.authorRole} · <span className="font-semibold text-slate-800">{material.authorCompany}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
