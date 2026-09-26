import React, { useState } from 'react';
import {
  X,
  Send,
  Upload,
  CheckCircle2,
  DollarSign,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  Building,
  Briefcase,
  QrCode,
  Download,
  Copy,
  Check,
  Sparkles,
  Phone,
  PhoneCall,
  Mail,
  Award,
  Star,
} from 'lucide-react';
import {
  FeedPost,
  OpportunityItem,
  JobListingItem,
  SupplierItem,
  SupplierReview,
  UserProfile,
  UserRole,
} from '../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialType?: 'general' | 'rfq' | 'surplus' | 'tender';
  onSubmitPost: (post: Partial<FeedPost>) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialType = 'general',
  onSubmitPost,
}) => {
  const [postType, setPostType] = useState<'general' | 'rfq' | 'surplus' | 'tender'>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryTag, setCategoryTag] = useState('Raw Materials & Metals');
  const [quantity, setQuantity] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [moq, setMoq] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSubmitPost({
      type: postType,
      title: title.trim() || undefined,
      content: content.trim(),
      categoryTag,
      metrics:
        postType !== 'general'
          ? {
              quantity: quantity || undefined,
              targetPrice: targetPrice || undefined,
              deadline: deadline || undefined,
              location: location || undefined,
              moq: moq || undefined,
              specSheetName: 'Specification_Package_Rev1.pdf',
            }
          : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              PL
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Procurement Announcement</h3>
              <p className="text-xs text-slate-500">Broadcast to 10,000+ verified industrial stakeholders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Post Type Selector Tabs */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">
              Announcement Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'general', label: 'Update / Insight' },
                { id: 'rfq', label: 'Urgent RFQ' },
                { id: 'surplus', label: 'Material Surplus' },
                { id: 'tender', label: 'Subcontract Tender' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setPostType(t.id as any)}
                  className={`py-2 px-2 rounded-lg font-semibold text-center cursor-pointer transition-colors ${
                    postType === t.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Headline / RFQ Title</label>
            <input
              type="text"
              placeholder="e.g. Sourcing 450 MT ASTM A36 Structural Steel or Surplus 12x Transformers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Trade Category */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Trade Category</label>
            <select
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="Raw Materials & Metals">Raw Materials & Metals</option>
              <option value="Electrical & Power Systems">Electrical & Power Systems</option>
              <option value="Construction & MEP Services">Construction & MEP Services</option>
              <option value="Chemicals & Polymers">Chemicals & Polymers</option>
              <option value="Heavy Machinery & Fleet">Heavy Machinery & Fleet</option>
              <option value="Packaging & Logistics">Packaging & Logistics</option>
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Detailed Scope & Requirements</label>
            <textarea
              rows={4}
              required
              placeholder="Detail your engineering specifications, delivery timeline, compliance certifications (ISO/BABA/IEEE), and bidding terms..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:bg-white focus:outline-hidden resize-none"
            />
          </div>

          {/* Spec details if RFQ or Surplus */}
          {postType !== 'general' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <span className="font-bold text-[10px] uppercase text-slate-500 block">
                Procurement Parameters
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Quantity Needed</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 Metric Tons"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Target Price / Budget</label>
                  <input
                    type="text"
                    placeholder="e.g. $850 / MT or $250k"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Deadline / Lead Time</label>
                  <input
                    type="text"
                    placeholder="e.g. Proposals due in 7 days"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">FOB / Delivery Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Joliet, IL"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SubmitProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityItem | null;
  currentUser: UserProfile;
  onSubmit: (oppId: string, proposal: any) => void;
}

export const SubmitProposalModal: React.FC<SubmitProposalModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  currentUser,
  onSubmit,
}) => {
  const [unitPrice, setUnitPrice] = useState('');
  const [totalBid, setTotalBid] = useState('');
  const [leadTime, setLeadTime] = useState('3 Weeks');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('12 Months standard manufacturing warranty');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(opportunity.id, {
      unitPrice,
      totalBid: totalBid || '$850,000',
      leadTime,
      complianceNotes,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
              {opportunity.rfqNumber}
            </span>
            <h3 className="text-base font-bold text-slate-900">Submit Sealed Commercial Proposal</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Commercial Proposal Submitted!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your sealed tender proposal has been delivered to {opportunity.issuerCompany}. You will receive status updates in your procurement messages.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Tender Subject</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{opportunity.title}</p>
              <p className="text-slate-500 mt-1">Target Budget: <strong>{opportunity.budgetRange}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Binding Bid ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. $1,340,000"
                  value={totalBid}
                  onChange={(e) => setTotalBid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Guaranteed Lead Time</label>
                <input
                  type="text"
                  required
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Warranty & Liability Terms</label>
              <input
                type="text"
                value={warrantyTerms}
                onChange={(e) => setWarrantyTerms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Technical Exceptions / Value Engineering Notes</label>
              <textarea
                rows={3}
                placeholder="List ASTM / ISO compliance certificates attached, factory acceptance dates, or freight logistics concessions..."
                value={complianceNotes}
                onChange={(e) => setComplianceNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white resize-none"
              />
            </div>

            <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Attach Detailed Spec / Pricing Schedule</span>
                  <span className="text-[10px] text-slate-400">PDF, XLS, or CAD (Max 25MB)</span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Upload File
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Formal Bid
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface EasyApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListingItem | null;
  currentUser: UserProfile;
  onSubmitApplication: (jobId: string) => void;
}

export const EasyApplyModal: React.FC<EasyApplyModalProps> = ({
  isOpen,
  onClose,
  job,
  currentUser,
  onSubmitApplication,
}) => {
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [coverNote, setCoverNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitApplication(job.id);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
              ProcureLink Easy Apply
            </span>
            <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Application Submitted!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your profile and credentials have been forwarded to {job.company}'s recruitment committee.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-11 h-11 rounded-full object-cover border border-white shadow-xs"
              />
              <div>
                <span className="font-bold text-slate-900 text-sm block">{currentUser.name}</span>
                <span className="text-slate-600 text-xs">{currentUser.title}</span>
                <span className="text-blue-600 font-bold text-[10px] block mt-0.5">
                  Verified {currentUser.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Brief Introduction & Sourcing Achievements
              </label>
              <textarea
                rows={3}
                placeholder="Highlight your relevant annual spend under management, FIDIC/NEC contract experience, or category certifications..."
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Application
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface SupplierCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierItem | null;
  currentUser: UserProfile;
  onStartMessage: (supplierId: string, name: string) => void;
  onAddReview?: (supplierId: string, review: SupplierReview) => void;
}

export const SupplierCardModal: React.FC<SupplierCardModalProps> = ({
  isOpen,
  onClose,
  supplier,
  currentUser,
  onStartMessage,
  onAddReview,
}) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews'>('specs');
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [performanceCategory, setPerformanceCategory] = useState<
    'Overall Performance' | 'On-Time Delivery' | 'Material Quality' | 'Pricing & Terms'
  >('Overall Performance');
  const [verifiedPO, setVerifiedPO] = useState('PO-2026-884');
  const [comment, setComment] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [showContactChannels, setShowContactChannels] = useState(false);
  const [copiedPhoneModal, setCopiedPhoneModal] = useState(false);

  if (!isOpen || !supplier) return null;

  const defaultReviews: SupplierReview[] = [
    {
      id: 'rev_default_1',
      authorName: 'Marcus Vance',
      authorCompany: 'Vance Infrastructure Group',
      authorRole: 'Buyer',
      rating: 5,
      date: '2 weeks ago',
      performanceCategory: 'On-Time Delivery',
      verifiedPO: 'PO-2026-884',
      comment: 'Delivered 300 MT of ASTM A36 beams with full ultrasonic testing certificates 4 days ahead of scheduled site crane mobilization. Flawless material test reports.',
    },
    {
      id: 'rev_default_2',
      authorName: 'David Chen',
      authorCompany: 'Bridgepoint Contractors',
      authorRole: 'Buyer',
      rating: 5,
      date: '1 month ago',
      performanceCategory: 'Material Quality',
      verifiedPO: 'PO-2026-612',
      comment: 'High grade steel melt with full BABA domestic certification. Zero rejections during third-party metallurgy audits on the transit bridge package.',
    },
    {
      id: 'rev_default_3',
      authorName: 'Sarah Jenkins',
      authorCompany: 'Apex Industrial Mechanical GC',
      authorRole: 'Contractor',
      rating: 4,
      date: '2 months ago',
      performanceCategory: 'Pricing & Terms',
      verifiedPO: 'PO-2025-992',
      comment: 'Competitive pricing and transparent Net 30 billing. Lead time was consistent with commitments even amid national freight backlogs.',
    },
  ];

  const currentReviews: SupplierReview[] =
    supplier.reviews && supplier.reviews.length > 0 ? supplier.reviews : defaultReviews;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const review: SupplierReview = {
      id: `rev_${Date.now()}`,
      authorName: currentUser.name,
      authorCompany: currentUser.company,
      authorRole: currentUser.role === 'buyer' ? 'Buyer' : currentUser.role === 'contractor' ? 'Contractor' : 'Supplier',
      rating: newRating,
      date: 'Just now',
      performanceCategory,
      verifiedPO: verifiedPO.trim() || undefined,
      comment: comment.trim(),
    };

    if (onAddReview) {
      onAddReview(supplier.id, review);
    }

    setSubmittedMessage(true);
    setIsWritingReview(false);
    setComment('');
    setTimeout(() => {
      setSubmittedMessage(false);
    }, 3500);
  };

  const ratingDescriptions: Record<number, string> = {
    1: '1.0 — Subpar / SLA Missed',
    2: '2.0 — Below Expectations',
    3: '3.0 — Satisfactory Performance',
    4: '4.0 — Very Good / Met Standards',
    5: '5.0 — Exceptional / Exceeded SLA',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Card Header Banner */}
        <div className="h-24 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1.5 rounded-full bg-black/40 backdrop-blur-xs cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-4 flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
              {supplier.tier}
            </span>
            <span className="px-2.5 py-0.5 bg-slate-800/80 text-blue-200 text-[10px] font-medium rounded">
              DUNS: {supplier.duns}
            </span>
          </div>
        </div>

        {/* Supplier Profile Header */}
        <div className="px-6 pt-0 pb-3 relative shrink-0 border-b border-slate-100">
          <div className="-mt-9 flex items-end justify-between mb-2">
            <div className="w-18 h-18 rounded-2xl border-4 border-white bg-white shadow-md p-1.5 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={supplier.logo || supplier.avatar}
                alt={supplier.company}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Audited Enterprise
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                {supplier.company}
                {supplier.verified && <CheckCircle2 className="w-4 h-4 text-blue-600 inline" />}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {supplier.category} • Certified Industrial Supplier
              </p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {supplier.location}
              </p>
            </div>

            {/* 5-Star Rating Pill (Clickable to switch tab) */}
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className="mt-1 sm:mt-0 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full cursor-pointer transition-colors text-left"
              title="Click to view verified buyer reviews"
            >
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(supplier.rating)
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-amber-900">{supplier.rating.toFixed(1)}</span>
              <span className="text-[11px] text-amber-700 font-medium underline">
                ({supplier.reviewCount} reviews)
              </span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 border-b border-slate-200 -mb-3 text-xs font-bold">
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Capabilities & SLAs
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              Verified Reviews ({currentReviews.length})
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {submittedMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your verified buyer review and rating have been posted to this supplier profile!</span>
            </div>
          )}

          {activeTab === 'specs' ? (
            <div className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{supplier.description}</p>

              {/* Key Specs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">On-Time SLA</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{supplier.otdRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Output</span>
                  <span className="font-bold text-slate-800 text-[11px] truncate block">
                    {supplier.annualCapacity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Min Order (MOQ)</span>
                  <span className="font-bold text-slate-800 text-[11px]">{supplier.moq}</span>
                </div>
              </div>

              {/* Core Capabilities */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Technical Capabilities & Production Lines
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {supplier.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ISO Certifications */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Audited Standards & Certifications
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {supplier.isoCertifications.map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200"
                    >
                      <Award className="w-3 h-3 text-blue-600" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick review prompt */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Have you procured with this supplier?</span>
                  <span className="text-slate-500 text-[11px]">Leave a verified 5-star performance rating.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsWritingReview(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5" />
                  Rate Supplier
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reviews Summary Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900 block leading-none">
                      {supplier.rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">out of 5</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(supplier.rating)
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Based on <strong>{supplier.reviewCount}</strong> audited procurement transactions
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWritingReview(!isWritingReview)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  {isWritingReview ? 'Close Review Form' : 'Write Verified Review'}
                </button>
              </div>

              {/* Write Review Form */}
              {isWritingReview && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-blue-700 fill-blue-700" />
                      <span className="font-bold text-slate-900 text-xs">
                        Leave Verified Buyer Performance Review
                      </span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                      Audited Evaluation
                    </span>
                  </div>

                  {/* Star Rating Interactive Selector */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Overall Supplier Rating (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setNewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                (hoverRating || newRating) >= star
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {ratingDescriptions[hoverRating || newRating]}
                      </span>
                    </div>
                  </div>

                  {/* Performance Category & Purchase Order # */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Performance Focus</label>
                      <select
                        value={performanceCategory}
                        onChange={(e) => setPerformanceCategory(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-hidden cursor-pointer"
                      >
                        <option value="Overall Performance">Overall Performance</option>
                        <option value="On-Time Delivery">On-Time Delivery & Logistics</option>
                        <option value="Material Quality">Material Quality & Compliance</option>
                        <option value="Pricing & Terms">Pricing & Commercial Terms</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Verified PO / Contract #</label>
                      <input
                        type="text"
                        placeholder="e.g. PO-2026-884 or RFQ-910"
                        value={verifiedPO}
                        onChange={(e) => setVerifiedPO(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Review Text */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Detailed Commercial Feedback
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Comment on metallurgy test certificates, packaging condition, communication with sales desk, and adherence to delivery deadlines..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Posting as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.company})
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Review
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews Feed List */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Recent Verified Buyer Evaluations ({currentReviews.length})
                </span>

                {currentReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{rev.authorName}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">{rev.authorCompany}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
                            {rev.authorRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          {rev.performanceCategory && (
                            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                              {rev.performanceCategory}
                            </span>
                          )}
                          {rev.verifiedPO && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Order #{rev.verifiedPO}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0">{rev.date}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed text-xs">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direct Contact Channels Drawer */}
        {showContactChannels && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                Direct Communication Channels
              </span>
              <button
                type="button"
                onClick={() => setShowContactChannels(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Channel 1: Mobile Call */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile Call</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-800 font-bold truncate">
                    {supplier.phone || '+971 4 881 2290'}
                  </div>
                </div>

                <div className="flex items-center gap-1 pt-1">
                  <a
                    href={`tel:${(supplier.phone || '+971 4 881 2290').replace(/\s+/g, '')}`}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg text-center shadow-xs"
                  >
                    Call
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(supplier.phone || '+971 4 881 2290');
                      setCopiedPhoneModal(true);
                      setTimeout(() => setCopiedPhoneModal(false), 2000);
                    }}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    {copiedPhoneModal ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Channel 2: WhatsApp */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>WhatsApp</span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    Direct estimation chat
                  </div>
                </div>

                <a
                  href={`https://wa.me/${(supplier.phone || '971508812290').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${supplier.company}, I am inquiring about your products & services via SOKO Directory.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg text-center shadow-xs"
                >
                  Chat WhatsApp
                </a>
              </div>

              {/* Channel 3: In-App Messaging */}
              <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-1">
                    <Send className="w-3.5 h-3.5" />
                    <span>SOKO Chat</span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    Verified live thread
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartMessage(supplier.id, supplier.company || supplier.name);
                  }}
                  className="w-full py-1.5 px-2 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg text-center shadow-xs cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer CTAs */}
        <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0 bg-slate-50/50">
          <button
            onClick={() => setShowContactChannels(!showContactChannels)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            {showContactChannels ? 'Hide Channels' : 'Contact Us'}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
