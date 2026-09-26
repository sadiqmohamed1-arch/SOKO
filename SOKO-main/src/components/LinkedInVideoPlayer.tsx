import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Subtitles,
  RotateCcw,
  Sparkles,
  Check,
  Share2,
} from 'lucide-react';
import { PostVideoData } from '../types';

interface LinkedInVideoPlayerProps {
  video: PostVideoData;
  postTitle?: string;
}

export const LinkedInVideoPlayer: React.FC<LinkedInVideoPlayerProps> = ({ video, postTitle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 198); // 3:18 default
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);
  const simTimerRef = useRef<any>(null);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = () => {
    if (hasVideoError) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: mute and play
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {
            setHasVideoError(true);
            setIsPlaying(true);
          });
        }
      });
      setIsPlaying(true);
    }
  };

  // Simulated playback when video source is unavailable in environment
  useEffect(() => {
    if (hasVideoError && isPlaying) {
      simTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000 / playbackRate);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [hasVideoError, isPlaying, duration, playbackRate]);

  useEffect(() => {
    if (hasVideoError) {
      // Update subtitles in simulation mode
      if (video.subtitles && video.subtitles.length > 0) {
        const match = [...video.subtitles].reverse().find((sub) => currentTime >= sub.time);
        setCurrentSubtitle(match ? match.text : '');
      }
      // Update chapters
      if (video.chapters && video.chapters.length > 0) {
        const chapIdx = video.chapters.findIndex((c, i) => {
          const next = video.chapters![i + 1];
          return currentTime >= c.timeSeconds && (!next || currentTime < next.timeSeconds);
        });
        if (chapIdx !== -1) setActiveChapterIndex(chapIdx);
      }
    }
  }, [currentTime, hasVideoError, video.subtitles, video.chapters]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Update subtitles
    if (video.subtitles && video.subtitles.length > 0) {
      const match = [...video.subtitles].reverse().find((sub) => cur >= sub.time);
      if (match) {
        setCurrentSubtitle(match.text);
      } else {
        setCurrentSubtitle('');
      }
    }

    // Update active chapter
    if (video.chapters && video.chapters.length > 0) {
      const chapIdx = video.chapters.findIndex((c, i) => {
        const next = video.chapters![i + 1];
        return cur >= c.timeSeconds && (!next || cur < next.timeSeconds);
      });
      if (chapIdx !== -1) setActiveChapterIndex(chapIdx);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (!hasVideoError && videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const jumpToChapter = (timeSeconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSeconds;
    setCurrentTime(timeSeconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3200);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handleCopyVideoTimestamp = () => {
    navigator.clipboard?.writeText?.(`${window.location.href}?t=${Math.floor(currentTime)}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="mt-3.5 space-y-2.5">
      {/* Video Container Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative w-full rounded-xl overflow-hidden bg-slate-950 aspect-video shadow-md border border-slate-800 group select-none"
      >
        {/* Working Video Element or Simulated High-Tech Stream */}
        {!hasVideoError ? (
          <video
            ref={videoRef}
            src={video.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
            poster={video.thumbnailUrl}
            playsInline
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          /* Presentation / Interactive Stream mode when MP4 host is unreachable */
          <div
            onClick={togglePlay}
            className="w-full h-full relative cursor-pointer overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-6"
          >
            {/* Background Poster with dark overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-700"
              style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
            />
            {/* Animated Industrial Grid / Soundwave Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#0A66C2_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

            {/* Simulated Live Broadcast Indicator */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-amber-400/30">
                <span className={`w-2 h-2 rounded-full bg-amber-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                Executive Sourcing Keynote Broadcast
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
                Platts & LME Intelligence Series
              </span>
            </div>

            {/* Audio / Spectrum Bars Visualizer during playback */}
            <div className="relative z-10 flex items-center justify-center gap-1.5 py-4">
              {[40, 75, 25, 90, 60, 100, 45, 80, 30, 95, 55, 70, 85, 35, 65].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 via-cyan-400 to-blue-300 transition-all duration-300"
                  style={{
                    height: isPlaying ? `${Math.max(12, (h * ((i % 3) + 1)) % 52)}px` : '10px',
                    opacity: isPlaying ? 0.9 : 0.35,
                  }}
                />
              ))}
            </div>

            {/* Speaker Tag on simulated screen */}
            <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                {video.speakerAvatar && (
                  <img
                    src={video.speakerAvatar}
                    alt={video.speakerName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-400"
                  />
                )}
                <span className="font-semibold text-white">{video.speakerName}</span>
                <span className="text-slate-400 hidden sm:inline">• {video.speakerTitle}</span>
              </div>
              <span className="text-[10px] text-blue-300 font-mono">
                {isPlaying ? '▶ STREAMING AUDIO & SUBTITLES' : '⏸ CLICK TO PLAY KEYNOTE'}
              </span>
            </div>
          </div>
        )}

        {/* LinkedIn Top Header Overlay */}
        <div
          className={`absolute top-0 left-0 right-0 p-3 sm:p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 pointer-events-auto ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* LinkedIn Iconic Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A66C2] text-white text-xs font-bold shadow-sm">
              <span className="font-black text-sm tracking-tight">in</span>
              <span className="text-[11px] font-semibold tracking-wide">Video</span>
            </div>
            <span className="text-xs text-white/90 font-medium hidden sm:inline-flex items-center gap-1.5">
              <span>{video.viewsCount || '14.8K views'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HD 1080p
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyVideoTimestamp}
              className="text-xs text-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy video link at current timestamp"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold text-[11px]">Timestamp Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Share Timestamp</span>
                </>
              )}
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
              {video.badge || 'Executive Brief'}
            </span>
          </div>
        </div>

        {/* Center Play Button Overlay (when paused or hovered) */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer transition-all hover:bg-black/25"
          >
            <div className="relative group/play flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full bg-[#0A66C2]/30 animate-ping opacity-60" />
              <button
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#0A66C2] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-200 border-2 border-white/30"
                aria-label="Play video"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Live Subtitles / Closed Captions Overlay */}
        {showCaptions && currentSubtitle && (
          <div className="absolute bottom-16 left-4 right-4 text-center pointer-events-none transition-all">
            <div className="inline-block max-w-xl mx-auto px-3.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-white text-xs sm:text-sm font-medium tracking-wide shadow-lg border border-white/10">
              {currentSubtitle}
            </div>
          </div>
        )}

        {/* Speaker Card Tag (when playing) */}
        {isPlaying && video.speakerName && (
          <div
            className={`absolute top-14 left-3 transition-opacity duration-300 pointer-events-none ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] text-white">
              {video.speakerAvatar && (
                <img
                  src={video.speakerAvatar}
                  alt={video.speakerName}
                  className="w-5 h-5 rounded-full object-cover border border-white/40"
                />
              )}
              <span className="font-semibold text-white">{video.speakerName}</span>
              {video.speakerTitle && (
                <span className="text-slate-300 hidden md:inline">| {video.speakerTitle}</span>
              )}
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 pointer-events-auto ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress / Seek Scrubber */}
          <div className="relative flex items-center mb-2 group/seek">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#0A66C2] hover:h-2 transition-all"
            />
            {/* Visual buffered bar behind */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#0A66C2] rounded-lg pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls: Play/Pause, Replay 10s, Time */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={togglePlay}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    const target = Math.max(0, videoRef.current.currentTime - 10);
                    videoRef.current.currentTime = target;
                    setCurrentTime(target);
                  }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white/80 hover:text-white"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleMute}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <span className="text-[11px] font-mono text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls: CC, Speed, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Closed Captions toggle */}
              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  showCaptions
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                title="Toggle Subtitles / Captions"
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>CC</span>
              </button>

              {/* Speed toggle */}
              <button
                onClick={handleSpeedChange}
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Video Chapters Pill Strip (LinkedIn style) */}
      {video.chapters && video.chapters.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#0A66C2]" />
              Video Chapters & Key Moments ({video.chapters.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Click to seek timestamp</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {video.chapters.map((chap, idx) => {
              const isActive = activeChapterIndex === idx;
              return (
                <button
                  key={chap.timestamp}
                  onClick={() => jumpToChapter(chap.timeSeconds)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0A66C2] text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-800'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      isActive ? 'text-blue-100' : 'text-[#0A66C2]'
                    }`}
                  >
                    {chap.timestamp}
                  </span>
                  <span>{chap.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
