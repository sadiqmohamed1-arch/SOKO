import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  Video,
  Play,
  Pause,
  Download,
  Award,
  CheckCircle,
  Sparkles,
  Share2,
  FileText,
  Building,
} from 'lucide-react';
import { LearningItem } from '../types';

interface WebinarDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  webinar: LearningItem | null;
  onRegister: (webinarId: string, points: number) => void;
  onComplete: (webinarId: string, points: number) => void;
}

export const WebinarDetailModal: React.FC<WebinarDetailModalProps> = ({
  isOpen,
  onClose,
  webinar,
  onRegister,
  onComplete,
}) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'agenda' | 'slides'>('overview');

  useEffect(() => {
    if (webinar) {
      setIsRegistered(!!webinar.registered);
      setHasWatched(!!webinar.completed);
      setIsPlayingRecorded(false);
    }
  }, [webinar]);

  if (!isOpen || !webinar) return null;

  const isUpcoming = webinar.webinarStatus === 'upcoming';

  const handleRegisterAction = () => {
    setIsRegistered(true);
    onRegister(webinar.id, webinar.rewardPoints || 150);
  };

  const handleWatchAction = () => {
    setHasWatched(true);
    onComplete(webinar.id, webinar.rewardPoints || 150);
  };

  const handleShare = () => {
    setCopiedLink(true);
    navigator.clipboard?.writeText(window.location.href);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadSlides = () => {
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `${webinar.title.slice(0, 30)}-slides.pdf`);
    document.body.appendChild(link);
    alert('Simulating download of presentation slides (PDF)...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
              isUpcoming ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              <Video className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                isUpcoming ? 'text-purple-700' : 'text-blue-700'
              }`}>
                {isUpcoming ? 'Upcoming Live Webinar' : 'On-Demand Recorded Masterclass'}
              </span>
              <span className="text-xs text-slate-500">SoKo Executive Learning Series</span>
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
          {/* Hero Banner / Video Player */}
          {isUpcoming ? (
            <div className="relative rounded-2xl overflow-hidden shadow-md group">
              <img
                src={webinar.thumbnail}
                alt={webinar.title}
                className="w-full h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent p-5 flex flex-col justify-end text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Live Broadcast
                  </span>
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {webinar.attendeesCount || 240} Registered
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white drop-shadow-sm leading-snug">
                  {webinar.title}
                </h3>
              </div>
            </div>
          ) : (
            /* Recorded Video Simulation */
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 shadow-md">
              <div className="w-full h-56 flex flex-col items-center justify-center relative group">
                <img
                  src={webinar.thumbnail}
                  alt={webinar.title}
                  className={`w-full h-full object-cover transition-opacity ${isPlayingRecorded ? 'opacity-40' : 'opacity-60'}`}
                />
                <button
                  onClick={() => setIsPlayingRecorded(!isPlayingRecorded)}
                  className="absolute z-10 w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95"
                >
                  {isPlayingRecorded ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </button>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs z-10">
                  <span className="font-semibold bg-black/60 px-2 py-0.5 rounded-md">
                    {isPlayingRecorded ? 'Playing Simulation (HD 1080p)' : 'Click to Play Full Recording'}
                  </span>
                  <span className="bg-black/60 px-2 py-0.5 rounded-md font-mono">
                    {webinar.duration}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Schedule / Time Badges */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>{webinar.scheduledDate || webinar.publishedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{webinar.scheduledTime || webinar.duration}</span>
              </div>
              <div className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {webinar.category}
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied Link!' : 'Invite Colleague'}</span>
            </button>
          </div>

          {/* Points Claim / Registration Action Banner */}
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-950 block">
                  {isUpcoming ? 'Reserve Seat & Earn Member Points' : 'Watch & Claim Learning Points'}
                </span>
                <span className="text-[11px] text-purple-700">
                  Earn +{webinar.rewardPoints || 150} points towards course discounts and testing vouchers.
                </span>
              </div>
            </div>

            {isUpcoming ? (
              <button
                onClick={handleRegisterAction}
                disabled={isRegistered}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isRegistered
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                }`}
              >
                {isRegistered ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Seat Confirmed (+150 Pts)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Register for Free (+150 Pts)
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleWatchAction}
                disabled={hasWatched}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hasWatched
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                }`}
              >
                {hasWatched ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Watched & Credited (+150 Pts)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Mark Watched (+150 Pts)
                  </>
                )}
              </button>
            )}
          </div>

          {/* Subtabs for Overview, Agenda, Slides */}
          <div className="border-b border-slate-200 flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 text-xs font-bold cursor-pointer transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Session Overview
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`pb-2.5 text-xs font-bold cursor-pointer transition-colors border-b-2 ${
                activeTab === 'agenda'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Key Takeaways
            </button>
            <button
              onClick={() => setActiveTab('slides')}
              className={`pb-2.5 text-xs font-bold cursor-pointer transition-colors border-b-2 ${
                activeTab === 'slides'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Slide Deck & Resources
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {webinar.description}
              </p>

              {/* Speaker Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3.5">
                <img
                  src={webinar.authorAvatar}
                  alt={webinar.author}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-600/20"
                />
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Lead Faculty / Speaker
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{webinar.author}</h4>
                  <p className="text-xs text-slate-600">
                    {webinar.authorRole} · <span className="font-semibold text-slate-800">{webinar.authorCompany}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="space-y-2.5">
              {webinar.keyTakeaways.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'slides' && (
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-purple-600 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Official Presentation Slides & Technical Worksheets
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Full deck containing technical flowcharts, ASTM/BS standards cross-references, and tender checklist.
                </p>
              </div>
              <button
                onClick={handleDownloadSlides}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Presentation Deck (PDF)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
