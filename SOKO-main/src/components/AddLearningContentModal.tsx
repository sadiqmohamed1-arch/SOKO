import React, { useState } from 'react';
import {
  X,
  Upload,
  Radio,
  Video,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Building,
} from 'lucide-react';
import {
  LearningItem,
  LearningContentType,
  LearningCategory,
  UserProfile,
} from '../types';

interface AddLearningContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onAddContent: (newItem: LearningItem) => void;
}

export const AddLearningContentModal: React.FC<AddLearningContentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddContent,
}) => {
  const [contentType, setContentType] = useState<LearningContentType>('podcast');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LearningCategory>('Roads & Highways');
  const [authorName, setAuthorName] = useState(currentUser.name);
  const [authorCompany, setAuthorCompany] = useState(currentUser.company || 'SoKo Knowledge Hub');
  const [authorRole, setAuthorRole] = useState(currentUser.title || 'Procurement Specialist');
  const [duration, setDuration] = useState('35 mins');
  const [rewardPoints, setRewardPoints] = useState(75);
  const [description, setDescription] = useState('');
  const [takeaway1, setTakeaway1] = useState('');
  const [takeaway2, setTakeaway2] = useState('');
  const [takeaway3, setTakeaway3] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('Oct 28, 2026 · 3:00 PM GST');
  const [webinarStatus, setWebinarStatus] = useState<'upcoming' | 'recorded'>('upcoming');
  const [docFormat, setDocFormat] = useState<'PDF Document' | 'Excel Financial Model' | 'Masterclass Module'>('PDF Document');

  if (!isOpen) return null;

  const handleTypeChange = (type: LearningContentType) => {
    setContentType(type);
    if (type === 'podcast') {
      setRewardPoints(75);
      setDuration('35 mins');
    } else if (type === 'webinar') {
      setRewardPoints(150);
      setDuration('60 mins');
    } else {
      setRewardPoints(100);
      setDuration('45-page guide');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const takeaways = [takeaway1, takeaway2, takeaway3]
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const defaultThumbs: Record<LearningContentType, string> = {
      podcast: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
      webinar: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=800&auto=format&fit=crop&q=80',
      study_material: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    };

    const newItem: LearningItem = {
      id: `learn_${Date.now()}`,
      type: contentType,
      title: title.trim(),
      category,
      author: authorName.trim() || currentUser.name,
      authorRole: authorRole.trim() || 'Procurement Executive',
      authorCompany: authorCompany.trim() || 'SoKo Partner Group',
      authorAvatar: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      publishedDate: 'Just now',
      duration: duration.trim() || (contentType === 'podcast' ? '35 mins' : contentType === 'webinar' ? '60 mins' : '40-page guide'),
      thumbnail: thumbnailUrl.trim() || defaultThumbs[contentType],
      description: description.trim(),
      keyTakeaways: takeaways.length > 0 ? takeaways : [
        'Strategic execution guidelines tailored for UAE infrastructure contracts.',
        'Compliance benchmarks aligned with Dubai Municipality & RTA standards.',
        'Cost optimization and supplier risk mitigation workflows.',
      ],
      rewardPoints: Number(rewardPoints) || 75,
      completed: false,
    };

    if (contentType === 'podcast') {
      newItem.audioUrl = mediaUrl.trim() || 'https://example.com/audio/soko-podcast-episode.mp3';
      newItem.episodeNumber = 15;
      newItem.season = 2;
    } else if (contentType === 'webinar') {
      newItem.webinarStatus = webinarStatus;
      newItem.scheduledTime = scheduledDateTime;
      newItem.scheduledDate = scheduledDateTime.split('·')[0]?.trim() || 'Oct 28, 2026';
      newItem.registered = false;
      newItem.attendeesCount = 1;
      newItem.slidesUrl = mediaUrl.trim() || 'https://example.com/docs/presentation-slides.pdf';
    } else if (contentType === 'study_material') {
      newItem.documentFormat = docFormat;
      newItem.pageCount = 42;
      newItem.fileSize = '5.4 MB';
      newItem.downloadUrl = mediaUrl.trim() || 'https://example.com/docs/procurement-toolkit.pdf';
      newItem.curriculum = [
        { title: 'Chapter 1: Regulatory Foundations & Scope Matrix', duration: '20 mins', completed: false },
        { title: 'Chapter 2: Technical Specifications & Method Statements', duration: '25 mins', completed: false },
        { title: 'Chapter 3: Quality Control & Field Acceptance Criteria', duration: '30 mins', completed: false },
      ];
    }

    onAddContent(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/75">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Publish Learning Content
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  SoKo Team & Network
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Publish a podcast, live webinar, or study material to all buyers and suppliers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Content Type Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Content Type *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleTypeChange('podcast')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  contentType === 'podcast'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-800 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Radio className={`w-5 h-5 mb-1.5 ${contentType === 'podcast' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Podcast Episode</span>
                <span className="text-[10px] text-slate-500 mt-0.5">+75 Reward Pts</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('webinar')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  contentType === 'webinar'
                    ? 'border-purple-600 bg-purple-50/60 text-purple-800 shadow-xs ring-1 ring-purple-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className={`w-5 h-5 mb-1.5 ${contentType === 'webinar' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Webinar / Workshop</span>
                <span className="text-[10px] text-slate-500 mt-0.5">+150 Reward Pts</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('study_material')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  contentType === 'study_material'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className={`w-5 h-5 mb-1.5 ${contentType === 'study_material' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">Study Material / Guide</span>
                <span className="text-[10px] text-slate-500 mt-0.5">+100 Reward Pts</span>
              </button>
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Title / Episode Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  contentType === 'podcast'
                    ? 'e.g. Episode 15: Structural Steel Hedging Strategies in the GCC'
                    : contentType === 'webinar'
                    ? 'e.g. Masterclass: Navigating RTA Highway Construction Pre-qualification'
                    : 'e.g. UAE ICV Audit Checklist & Vendor Evaluation Scorecard 2026'
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LearningCategory)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Roads & Highways">Roads & Highways</option>
                <option value="Building Construction">Building Construction</option>
                <option value="Infrastructure & Utilities">Infrastructure & Utilities</option>
                <option value="ICV & Compliance">ICV & Compliance</option>
                <option value="FIDIC & Contracts">FIDIC & Contracts</option>
                <option value="Procurement Strategy">Procurement Strategy</option>
                <option value="Sustainability & ESG">Sustainability & ESG</option>
              </select>
            </div>
          </div>

          {/* Author Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Instructor / Host Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Eng. Tariq Al-Nuaimi"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Entity / Company
              </label>
              <input
                type="text"
                value={authorCompany}
                onChange={(e) => setAuthorCompany(e.target.value)}
                placeholder="e.g. Vance Infrastructure Group"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Professional Title
              </label>
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="e.g. Senior Asphalt Specialist"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Specific Meta Fields based on Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duration / Length
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 45 mins or 38-page guide"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Member Reward Points
              </label>
              <input
                type="number"
                min={25}
                max={500}
                value={rewardPoints}
                onChange={(e) => setRewardPoints(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden font-bold"
              />
            </div>

            {contentType === 'webinar' && (
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Scheduled Date & Time
                </label>
                <input
                  type="text"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  placeholder="e.g. Nov 12, 2026 · 2:00 PM GST"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            {contentType === 'study_material' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Document Format
                </label>
                <select
                  value={docFormat}
                  onChange={(e) => setDocFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                >
                  <option value="PDF Document">PDF Document</option>
                  <option value="Excel Financial Model">Excel Financial Model</option>
                  <option value="Masterclass Module">Masterclass Module</option>
                </select>
              </div>
            )}

            {contentType === 'podcast' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audio Stream / Media Link
                </label>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://... (.mp3 or audio feed)"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description & Synopsis *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive synopsis of the topics, regulatory frameworks, practical engineering insights, or procurement strategies covered..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Key Takeaways */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Key Learning Takeaways (3 Bullet Points for Members)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 w-4">1.</span>
                <input
                  type="text"
                  value={takeaway1}
                  onChange={(e) => setTakeaway1(e.target.value)}
                  placeholder="e.g. Concrete temperature thresholds for large mass raft pours in UAE summer"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 w-4">2.</span>
                <input
                  type="text"
                  value={takeaway2}
                  onChange={(e) => setTakeaway2(e.target.value)}
                  placeholder="e.g. Standard Clause 20.1 time-bar defense strategies under UAE Civil Code"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 w-4">3.</span>
                <input
                  type="text"
                  value={takeaway3}
                  onChange={(e) => setTakeaway3(e.target.value)}
                  placeholder="e.g. Prequalification milestones to accelerate Dubai Central Laboratory (DCL) approvals"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Custom Thumbnail Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Thumbnail Cover Image URL (Optional)
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... (Leave blank for curated default image)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Visible across all buyer, supplier & contractor logins</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Publish to Academy & Award Points
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
