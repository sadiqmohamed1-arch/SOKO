import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Award,
  CheckCircle,
  Radio,
  FileText,
  User,
  Share2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { LearningItem } from '../types';

interface PodcastPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  podcast: LearningItem | null;
  onComplete: (podcastId: string, points: number) => void;
}

export const PodcastPlayerModal: React.FC<PodcastPlayerModalProps> = ({
  isOpen,
  onClose,
  podcast,
  onComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressSec, setProgressSec] = useState(140);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Total duration in seconds (mock ~38m = 2280s)
  const totalDurationSec = 2280;

  useEffect(() => {
    if (podcast) {
      setHasClaimed(!!podcast.completed);
      setIsPlaying(true);
      setProgressSec(140);
    }
  }, [podcast]);

  // Simulated playback ticker
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const interval = setInterval(() => {
      setProgressSec((prev) => {
        if (prev >= totalDurationSec) {
          setIsPlaying(false);
          return totalDurationSec;
        }
        return prev + Math.round(1 * playbackSpeed);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, playbackSpeed, totalDurationSec]);

  if (!isOpen || !podcast) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.min(100, (progressSec / totalDurationSec) * 100);

  const speeds = [1, 1.25, 1.5, 2];

  const handleClaimPoints = () => {
    if (hasClaimed) return;
    setHasClaimed(true);
    onComplete(podcast.id, podcast.rewardPoints || 75);
  };

  const handleShare = () => {
    setCopiedLink(true);
    navigator.clipboard?.writeText(window.location.href);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                SoKo Procurement & Infra Cast · Season {podcast.season || 2}, Episode {podcast.episodeNumber || 14}
              </span>
              <span className="text-xs text-slate-500">Audio Player & Show Notes</span>
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
          {/* Episode Banner & Title */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <img
              src={podcast.thumbnail}
              alt={podcast.title}
              className="w-full sm:w-40 h-40 object-cover rounded-xl shadow-md shrink-0"
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {podcast.category}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {podcast.duration}
                </span>
                <span className="text-xs text-slate-500">
                  Published {podcast.publishedDate}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {podcast.title}
              </h2>

              <p className="text-xs text-slate-600 line-clamp-2">
                {podcast.description}
              </p>
            </div>
          </div>

          {/* Player Widget */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 rounded-2xl text-white shadow-lg space-y-4">
            {/* Waveform & Scrubber */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>{formatTime(progressSec)}</span>
                <span className="text-slate-400">{formatTime(totalDurationSec)}</span>
              </div>
              <div
                className="w-full h-2.5 bg-slate-700 rounded-full cursor-pointer relative overflow-hidden group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
                  setProgressSec(Math.round(newPercent * totalDurationSec));
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Animated Audio Equalizer Bars */}
              <div className="flex items-center justify-center gap-1 pt-1 h-6">
                {[...Array(28)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 bg-cyan-400/80 rounded-full transition-all ${
                      isPlaying
                        ? 'animate-pulse'
                        : 'opacity-30'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(4, Math.sin(i + progressSec * 0.5) * 18 + 12)}px` : '4px',
                      animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {/* Speed Toggle */}
                <button
                  onClick={() => {
                    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                    setPlaybackSpeed(speeds[nextIndex]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer transition-colors"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </button>

                {/* Mute Toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Central Play / Skip Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setProgressSec((p) => Math.max(0, p - 15))}
                  className="p-2 rounded-full hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                  title="Rewind 15 seconds"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  onClick={() => setProgressSec((p) => Math.min(totalDurationSec, p + 15))}
                  className="p-2 rounded-full hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                  title="Forward 15 seconds"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              {/* Share / Copy Link */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Reward Points Claim Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Listen & Earn Member Reward
                </span>
                <span className="text-[11px] text-amber-700">
                  Earn +{podcast.rewardPoints || 75} points redeemable for course and material discount vouchers.
                </span>
              </div>
            </div>

            <button
              onClick={handleClaimPoints}
              disabled={hasClaimed}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hasClaimed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              }`}
            >
              {hasClaimed ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Points Awarded!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Claim +{podcast.rewardPoints || 75} Pts
                </>
              )}
            </button>
          </div>

          {/* Guest & Host Information */}
          {podcast.guest && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <img
                src={podcast.guest.avatar}
                alt={podcast.guest.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Featured Guest
                </span>
                <h4 className="text-sm font-bold text-slate-900">{podcast.guest.name}</h4>
                <p className="text-xs text-slate-600">
                  {podcast.guest.role} · <span className="font-semibold">{podcast.guest.company}</span>
                </p>
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              Key Discussion Takeaways
            </h4>
            <div className="space-y-2">
              {podcast.keyTakeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Episode Transcript / Summary */}
          {podcast.transcriptSummary && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Chapters & Timestamp Breakdown
              </h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono leading-relaxed">
                {podcast.transcriptSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
