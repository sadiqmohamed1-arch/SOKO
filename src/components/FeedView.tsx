import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  MapPin,
  TrendingUp,
  Share2,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Send,
  Sparkles,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  FolderKanban,
  Contact,
  Tablet,
  Fuel,
  Ship,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Video,
  Layers,
} from 'lucide-react';
import { FeedPost, UserProfile, UserRole } from '../types';
import { LinkedInVideoPlayer } from './LinkedInVideoPlayer';
import { ProcurementInfographicCard } from './ProcurementInfographicCard';

interface FeedViewProps {
  posts: FeedPost[];
  currentUser: UserProfile;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onOpenCreatePost: (type?: 'general' | 'rfq' | 'surplus' | 'tender') => void;
  onNavigateToTab: (tab: string, contextId?: string) => void;
  onStartMessageWith: (supplierId: string, supplierName: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  currentUser,
  onLikePost,
  onAddComment,
  onOpenCreatePost,
  onNavigateToTab,
  onStartMessageWith,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'infographic' | 'procurement' | 'news' | 'business'>('all');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [commodityCurrency, setCommodityCurrency] = useState<'AED' | 'USD'>('AED');
  const [showEstimator, setShowEstimator] = useState(false);
  const [calculatorItem, setCalculatorItem] = useState<'rebar' | 'copper' | 'diesel' | 'container'>('rebar');
  const [calculatorQty, setCalculatorQty] = useState<number>(20);
  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'video') return !!post.video;
    if (activeFilter === 'infographic') return !!post.infographic;
    return post.type === activeFilter;
  });

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleShare = (postId: string) => {
    setCopiedPostId(postId);
    navigator.clipboard?.writeText?.(`${window.location.origin}#post-${postId}`);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  const toggleSave = (postId: string) => {
    setSavedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const getRoleBadge = (role: UserRole | 'official', authorName?: string) => {
    if (role === 'official' || authorName?.toLowerCase().includes('soko')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-white shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-cyan-300" />
          soko.ae Official
        </span>
      );
    }
    switch (role) {
      case 'supplier':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">Verified Supplier</span>;
      case 'buyer':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">Verified Buyer</span>;
      case 'contractor':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">General Contractor</span>;
    }
  };

  const getTypeBadge = (type: FeedPost['type'], post?: FeedPost) => {
    if (post?.video) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0A66C2]/15 text-[#0A66C2] border border-[#0A66C2]/30 shadow-2xs">
          <Video className="w-3 h-3" />
          LinkedIn Video
        </span>
      );
    }
    if (post?.infographic) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          <Layers className="w-3 h-3 text-amber-700" />
          Visual Infographic
        </span>
      );
    }
    switch (type) {
      case 'procurement':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">Procurement Knowledge</span>;
      case 'news':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">Market News</span>;
      case 'business':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">Business & Strategy</span>;
      case 'rfq':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Urgent RFQ</span>;
      case 'surplus':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Surplus Capacity</span>;
      case 'tender':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">Contractor Tender</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Industry Brief</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Profile & Sourcing Shortcuts */}
        <aside className="lg:col-span-3 space-y-4">
            {/* User Mini Profile Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="h-20 relative overflow-hidden bg-gradient-to-r from-blue-900 via-slate-900 to-slate-800" />
              <div className="px-4 pb-4 pt-0 relative">
                <div className="-mt-9 mb-2 flex items-end justify-between">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-full border-4 border-white object-cover shadow-xs"
                  />
                  {getRoleBadge(currentUser.role)}
                </div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.verified && <CheckCircle2 className="w-4 h-4 text-blue-600 inline" />}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{currentUser.title}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">{currentUser.company}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <button
                    id="view-my-card-btn"
                    onClick={() => onNavigateToTab('card')}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    My Digital Business Card
                  </button>
                </div>
              </div>
            </div>
          </aside>

        {/* Center Column: soko.ae Wire & Editorial Stream */}
        <main className="lg:col-span-6 space-y-4">
          {/* soko.ae Official Feed Broadcast Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
                  SK
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-base sm:text-lg text-white tracking-tight">
                      Soko.ae Procurement Wire
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      Official Stream
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Curated procurement updates & industrial market intelligence published exclusively by <span className="text-white font-semibold">soko.ae</span> for all .
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Market Wire
                </span>
              </div>
            </div>
          </div>

          {/* Feed Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Knowledge & News' },
              { id: 'video', label: '📹 LinkedIn Video Briefs' },
              { id: 'infographic', label: '📊 Procurement Infographics' },
              { id: 'procurement', label: 'Procurement Strategy' },
              { id: 'news', label: 'Market & Logistics News' },
              { id: 'business', label: 'Business & Commodities' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`filter-chip-${tab.id}`}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Cards Feed View */}

            <div className="space-y-4">
            {filteredPosts.map((post) => {
              const isCommentOpen = activeCommentPostId === post.id;
              const isSaved = savedPosts[post.id];

              return (
                <article
                  key={post.id}
                  id={`post-card-${post.id}`}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 sm:p-5 shadow-xs transition-all"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src="/soko-logo.svg"
                          alt="SOKO"
                          className="w-11 h-11 rounded-full object-cover border-2 border-blue-100 shadow-2xs bg-black"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center text-[9px] font-black border border-white">
                          SK
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{post.authorName}</h4>
                          {post.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {getRoleBadge(post.authorRole, post.authorName)}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{post.authorCompany}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{post.timestamp}</span>
                          <span>•</span>
                          <span>{post.readTime || '3 min read'}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">{post.categoryTag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getTypeBadge(post.type, post)}
                      <button
                        onClick={() => toggleSave(post.id)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md cursor-pointer transition-colors"
                        title={isSaved ? 'Saved Brief' : 'Save Brief'}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mt-3.5">
                    {post.title && (
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 leading-snug hover:text-blue-700 transition-colors">
                        {post.title}
                      </h3>
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  {/* LinkedIn Video Player if post has video */}
                  {post.video && (
                    <LinkedInVideoPlayer video={post.video} postTitle={post.title} />
                  )}

                  {/* Tactical Procurement Infographic if post has infographic */}
                  {post.infographic && (
                    <ProcurementInfographicCard infographic={post.infographic} />
                  )}

                  {/* Key Strategic Takeaway Callout Box */}
                  {post.keyTakeaway && (
                    <div className="mt-3.5 bg-blue-50/70 border-l-4 border-blue-600 rounded-r-lg p-3 sm:p-3.5 text-xs">
                      <span className="font-bold text-blue-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Key Strategic Takeaway
                      </span>
                      <p className="text-blue-950 font-medium leading-relaxed">{post.keyTakeaway}</p>
                    </div>
                  )}

                  {/* Hashtags / Topics */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Procurement Specs Matrix if legacy RFQ / Surplus */}
                  {post.metrics && (
                    <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {post.metrics.quantity && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                            <span className="font-semibold text-slate-900">{post.metrics.quantity}</span>
                          </div>
                        )}
                        {post.metrics.moq && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">MOQ</span>
                            <span className="font-semibold text-slate-900">{post.metrics.moq}</span>
                          </div>
                        )}
                        {post.metrics.targetPrice && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Price / Budget</span>
                            <span className="font-bold text-emerald-700">{post.metrics.targetPrice}</span>
                          </div>
                        )}
                        {post.metrics.deadline && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule / Deadline</span>
                            <span className="font-semibold text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {post.metrics.deadline}
                            </span>
                          </div>
                        )}
                        {post.metrics.location && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">FOB / Jobsite</span>
                            <span className="font-semibold text-slate-900 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {post.metrics.location}
                            </span>
                          </div>
                        )}
                        {post.metrics.specSheetName && (
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Specification File</span>
                            <span className="font-semibold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer">
                              <Download className="w-3 h-3" />
                              {post.metrics.specSheetName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onLikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          post.userLiked
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${post.userLiked ? 'fill-blue-700' : ''}`} />
                        <span>{post.userLiked ? 'Insightful' : 'Insightful'}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({post.likes})</span>
                      </button>

                      <button
                        onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Discussion</span>
                        <span className="text-[11px] text-slate-400 font-normal">({post.comments.length})</span>
                      </button>

                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{copiedPostId === post.id ? 'Copied Link!' : 'Share'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-medium">
                      Published for verified members
                    </div>
                  </div>

                  {/* Comment Section */}
                  {isCommentOpen && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Technical & Industry Discussion ({post.comments.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Responses from verified buyers & suppliers
                        </span>
                      </div>

                      {/* Existing Comments */}
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2.5 text-xs bg-slate-50/90 border border-slate-100 p-3 rounded-lg">
                          <img
                            src={comment.avatar}
                            alt={comment.author}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{comment.author}</span>
                              <span className="text-slate-400 text-[10px]">{comment.time}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">{comment.company}</span>
                            <p className="text-slate-700 mt-1 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Share an industry insight or field observation..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommentSubmit(post.id);
                            }}
                            className="w-full bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white text-xs px-3 py-2 rounded-lg focus:outline-hidden"
                          />
                        </div>
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
      </main>

      {/* Right Column: Commodity Indices, Recommended Suppliers, Bidding Deadlines */}

        <aside className="lg:col-span-3 space-y-4">
          {/* Commodity & Material Market Watch */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            {/* Header with Title and Currency Toggle */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  UAE Commodity & Freight Index
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-mono">
                    SOKO Spot • GST 14:00
                  </span>
                </div>
              </div>

              {/* Currency Toggle AED / USD */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCommodityCurrency('AED')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    commodityCurrency === 'AED'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  AED
                </button>
                <button
                  type="button"
                  onClick={() => setCommodityCurrency('USD')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    commodityCurrency === 'USD'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Indices List */}
            <div className="space-y-3 text-xs">
              {/* 1. Grade 50 Rebar AED Price */}
              <div className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 block truncate">
                        Grade 50 / B500B Rebar
                      </span>
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded shrink-0">
                        Steel
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      BS 4449 / ASTM A615 (Delivered UAE)
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block font-mono">
                      {commodityCurrency === 'AED' ? 'AED 2,520 / MT' : '$686 / MT'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      +1.6% (7d)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">
                  <span>Emirates Steel / Conares Benchmark</span>
                  <span className="font-mono">
                    {commodityCurrency === 'AED' ? 'AED 2.52 / kg' : '$0.69 / kg'}
                  </span>
                </div>
              </div>

              {/* 2. Copper Price */}
              <div className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 block truncate">
                        Copper Cathode & Busbars
                      </span>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                        LME
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      LME Grade A 99.99% / UAE Electrical
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block font-mono">
                      {commodityCurrency === 'AED' ? 'AED 35.85 / kg' : '$9,760 / MT'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      +2.1% (7d)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">
                  <span>Ducab / Riyadh Cables standard</span>
                  <span className="font-mono">
                    {commodityCurrency === 'AED' ? 'AED 35,850 / MT' : '$4.43 / lb'}
                  </span>
                </div>
              </div>

              {/* 3. ADNOC Diesel Price Per Gallon */}
              <div className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-900 block truncate">
                        ADNOC Diesel Fuel
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded shrink-0">
                        Official
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      ADNOC Distribution UAE Regulated
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block font-mono">
                      {commodityCurrency === 'AED' ? 'AED 11.16 / Gal' : '$3.04 / Gal'}
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="w-3 h-3 text-rose-500" />
                      -0.4% (MoM)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">
                  <span>1 US Gal = 3.785 Litres</span>
                  <span className="font-mono">
                    {commodityCurrency === 'AED' ? 'AED 2.95 / Litre' : '$0.80 / Litre'}
                  </span>
                </div>
              </div>

              {/* 4. Shipping / Container from China */}
              <div className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-900 block truncate">
                        China to Jebel Ali Ocean Freight
                      </span>
                      <span className="text-[9px] font-bold bg-indigo-100 text-indigo-900 px-1.5 py-0.2 rounded shrink-0">
                        Freight
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Shanghai / Ningbo → Dubai Port (40ft HC)
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block font-mono">
                      {commodityCurrency === 'AED' ? 'AED 8,625 / 40ft HC' : '$2,350 / FEU'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      +4.3% (7d)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">
                  <span>Transit: 14-18 Days • Direct Port</span>
                  <span className="font-mono">
                    {commodityCurrency === 'AED' ? 'AED 5,140 / 20ft' : '$1,400 / 20ft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Estimator Accordion / Toggle */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEstimator(!showEstimator)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <span>🧮 Procurement Cost Estimator</span>
                <span className="text-xs">{showEstimator ? 'Hide −' : 'Calculate +'}</span>
              </button>

              {showEstimator && (
                <div className="mt-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-200/70 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Commodity
                      </label>
                      <select
                        value={calculatorItem}
                        onChange={(e) => setCalculatorItem(e.target.value as any)}
                        className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                      >
                        <option value="rebar">Grade 50 Rebar (MT)</option>
                        <option value="copper">Copper (MT)</option>
                        <option value="diesel">ADNOC Diesel (Gallons)</option>
                        <option value="container">China 40ft Containers</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={calculatorQty}
                        onChange={(e) => setCalculatorQty(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-md border border-blue-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Estimated Cost:</span>
                    <span className="font-extrabold text-blue-900 font-mono text-sm">
                      {(() => {
                        let totalAED = 0;
                        if (calculatorItem === 'rebar') totalAED = calculatorQty * 2520;
                        if (calculatorItem === 'copper') totalAED = calculatorQty * 35850;
                        if (calculatorItem === 'diesel') totalAED = calculatorQty * 11.16;
                        if (calculatorItem === 'container') totalAED = calculatorQty * 8625;

                        return commodityCurrency === 'AED'
                          ? `AED ${totalAED.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : `$${(totalAED / 3.6725).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform Standards / Verification Notice */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-xl p-4 shadow-xs text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-blue-300 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>SOKO Verification</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Look for the Verified badge on profiles. Verification status is reviewed and managed by the SOKO team.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
