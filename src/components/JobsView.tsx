import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  MapPin,
  Building,
  Clock,
  DollarSign,
  Bookmark,
  Share2,
  CheckCircle2,
  ExternalLink,
  Award,
  Send,
  PlusCircle,
  Check,
  Users,
  Filter,
  Eye,
  FileText,
  Mail,
  Phone,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Building2,
  X,
  RefreshCw,
  Edit3,
  Download,
  Upload,
  ThumbsUp,
  Star,
  Paperclip,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Globe,
  Trash2,
  ArrowUpRight,
  Layers,
  Compass,
} from 'lucide-react';
import {
  JobListingItem,
  UserProfile,
  CompanyJobApplicant,
  BuyerCareerProfile,
  BuyerJobApplication,
} from '../types';
import {
  INITIAL_COMPANY_JOB_APPLICANTS,
  INITIAL_BUYER_CAREER_PROFILE,
  INITIAL_BUYER_APPLICATIONS,
} from '../mockData';

// Authentic Official LinkedIn SVG Logo Icon
const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

interface JobsViewProps {
  jobs: JobListingItem[];
  currentUser: UserProfile;
  onOpenEasyApply?: (job: JobListingItem) => void;
  onOpenCreateJob?: () => void;
  onUpdateJobs?: (updated: JobListingItem[]) => void;
  onStartMessageWith?: (userId: string, name: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  currentUser,
  onOpenEasyApply,
  onOpenCreateJob,
  onUpdateJobs,
  onStartMessageWith,
}) => {
  const isContractorPersona = currentUser.role === 'contractor';

  // Toggle view between Buyer Career Board (LinkedIn style) and Contractor ATS
  const [viewPersonaOverride, setViewPersonaOverride] = useState<'buyer' | 'contractor'>(
    isContractorPersona ? 'contractor' : 'buyer'
  );

  const isViewingAsContractor = viewPersonaOverride === 'contractor';

  // ----------------------------------------------------
  // BUYER CAREER PROFILE STATE (LinkedIn Synced)
  // ----------------------------------------------------
  const [buyerProfile, setBuyerProfile] = useState<BuyerCareerProfile>(() => {
    const saved = localStorage.getItem('soko_buyer_career_profile_v2');
    return saved ? JSON.parse(saved) : INITIAL_BUYER_CAREER_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem('soko_buyer_career_profile_v2', JSON.stringify(buyerProfile));
  }, [buyerProfile]);

  // ----------------------------------------------------
  // BUYER APPLICATIONS STATE (Tracking ATS)
  // ----------------------------------------------------
  const [buyerApplications, setBuyerApplications] = useState<BuyerJobApplication[]>(() => {
    const saved = localStorage.getItem('soko_buyer_applications_v2');
    return saved ? JSON.parse(saved) : INITIAL_BUYER_APPLICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('soko_buyer_applications_v2', JSON.stringify(buyerApplications));
  }, [buyerApplications]);

  // ----------------------------------------------------
  // LOCAL JOBS LIST STATE (Synced with prop and updates)
  // ----------------------------------------------------
  const [localJobs, setLocalJobs] = useState<JobListingItem[]>(jobs);

  useEffect(() => {
    setLocalJobs(jobs);
  }, [jobs]);

  const updateJobInState = (updatedJob: JobListingItem) => {
    const updated = localJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j));
    setLocalJobs(updated);
    if (onUpdateJobs) {
      onUpdateJobs(updated);
    }
  };

  // ----------------------------------------------------
  // NAVIGATION TABS FOR BUYER
  // ----------------------------------------------------
  type BuyerTab = 'profile_view' | 'jobs_feed' | 'my_applications' | 'saved_jobs';
  const [activeBuyerTab, setActiveBuyerTab] = useState<BuyerTab>('profile_view');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGCFilter, setSelectedGCFilter] = useState('All');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('All');
  const [workTypeFilter, setWorkTypeFilter] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState<string>(localJobs[0]?.id || '');
  const [savedJobIds, setSavedJobIds] = useState<Record<string, boolean>>({
    job_gc_ccc: true,
  });

  // Modal States
  const [applyingJobWithProfile, setApplyingJobWithProfile] = useState<JobListingItem | null>(null);
  const [applyingJobViaLinkedIn, setApplyingJobViaLinkedIn] = useState<JobListingItem | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showResumePreviewModal, setShowResumePreviewModal] = useState(false);
  const [selectedApplicationForView, setSelectedApplicationForView] = useState<BuyerJobApplication | null>(null);
  const [isSyncingLinkedIn, setIsSyncingLinkedIn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // List of top General Contractors in the system
  const TOP_GENERAL_CONTRACTORS = [
    'All',
    'ALEC Engineering & Contracting',
    'Al Naboodah Construction Group',
    'Consolidated Contractors Company (CCC)',
    'BESIX / Six Construct',
    'ASGC Construction',
    'Shapoorji Pallonji Mideast',
    'Target Engineering / Arabtec GC',
    'Dutco Balfour Beatty (DBB)',
  ];

  // Filter Jobs
  const filteredJobs = localJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requirements.some((r) => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.gcProjects && job.gcProjects.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesGC = selectedGCFilter === 'All' || job.company.toLowerCase().includes(selectedGCFilter.toLowerCase());
    const matchesLocation =
      selectedLocationFilter === 'All' || job.location.toLowerCase().includes(selectedLocationFilter.toLowerCase());
    const matchesWorkType = workTypeFilter === 'All' || job.workType === workTypeFilter;

    if (activeBuyerTab === 'saved_jobs') {
      return matchesSearch && matchesGC && matchesLocation && matchesWorkType && savedJobIds[job.id];
    }

    return matchesSearch && matchesGC && matchesLocation && matchesWorkType;
  });

  const selectedJob =
    localJobs.find((j) => j.id === selectedJobId) ||
    filteredJobs[0] ||
    localJobs[0];

  const toggleSave = (jobId: string) => {
    setSavedJobIds((prev) => {
      const next = !prev[jobId];
      showToast(next ? '✓ Job saved to your Career Bookmarks' : 'Removed from Saved Jobs');
      return { ...prev, [jobId]: next };
    });
  };

  // ----------------------------------------------------
  // SUBMIT APPLICATION VIA BUYER PROFILE
  // ----------------------------------------------------
  const handleConfirmApplyWithProfile = (
    job: JobListingItem,
    answers: Record<string, string>,
    coverNote: string
  ) => {
    const newAppRecord: BuyerJobApplication = {
      id: `app_${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location,
      salaryRange: job.salaryRange,
      appliedDate: 'Just now',
      applicationMethod: 'profile',
      status: 'Applied',
      statusUpdateDate: 'Just now',
      resumeUsed: buyerProfile.resume.fileName,
      screeningAnswers: answers,
      coverNote,
      recruiter: job.recruiter
        ? {
            name: job.recruiter.name,
            title: job.recruiter.title,
            avatar: job.recruiter.avatar,
          }
        : {
            name: 'Head of Talent Acquisition',
            title: `${job.company} Recruitment Team`,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          },
    };

    const updatedJob: JobListingItem = {
      ...job,
      applied: true,
      appliedMethod: 'profile',
      applicationStatus: 'Applied',
      applicantsCount: job.applicantsCount + 1,
    };

    updateJobInState(updatedJob);
    setBuyerApplications([newAppRecord, ...buyerApplications]);
    setApplyingJobWithProfile(null);
    showToast(`✓ Application submitted to ${job.company} using your Verified Buyer Profile!`);
  };

  // ----------------------------------------------------
  // SUBMIT APPLICATION VIA LINKEDIN EASY APPLY
  // ----------------------------------------------------
  const handleConfirmApplyViaLinkedIn = (
    job: JobListingItem,
    customNote: string,
    includeProfilePdf: boolean
  ) => {
    const newAppRecord: BuyerJobApplication = {
      id: `app_li_${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location,
      salaryRange: job.salaryRange,
      appliedDate: 'Just now',
      applicationMethod: 'linkedin',
      status: 'Applied',
      statusUpdateDate: 'Just now',
      resumeUsed: includeProfilePdf
        ? `LinkedIn Generated PDF Profile (${buyerProfile.linkedInUsername})`
        : buyerProfile.resume.fileName,
      coverNote: customNote || `Applied via LinkedIn Easy Apply with verified profile and 500+ GCC industry connections.`,
      recruiter: job.recruiter
        ? {
            name: job.recruiter.name,
            title: job.recruiter.title,
            avatar: job.recruiter.avatar,
          }
        : {
            name: 'Head of Talent Acquisition',
            title: `${job.company} Recruitment Team`,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          },
    };

    const updatedJob: JobListingItem = {
      ...job,
      applied: true,
      appliedMethod: 'linkedin',
      applicationStatus: 'Applied',
      applicantsCount: job.applicantsCount + 1,
    };

    updateJobInState(updatedJob);
    setBuyerApplications([newAppRecord, ...buyerApplications]);
    setApplyingJobViaLinkedIn(null);
    showToast(`✓ LinkedIn Easy Apply sent to ${job.company}! Recruiter notified.`);
  };

  // ----------------------------------------------------
  // SYNC WITH LINKEDIN SIMULATION
  // ----------------------------------------------------
  const handleSyncWithLinkedIn = () => {
    setIsSyncingLinkedIn(true);
    setTimeout(() => {
      setIsSyncingLinkedIn(false);
      setBuyerProfile((prev) => ({
        ...prev,
        linkedInLastSynced: 'Just now',
        profileStrength: 97,
      }));
      showToast('✓ Successfully synced profile, recommendations, and MCIPS credentials from LinkedIn!');
    }, 1200);
  };

  // ----------------------------------------------------
  // CONTRACTOR ATS STATE (Preserved for Contractor Role)
  // ----------------------------------------------------
  const [companyJobs, setCompanyJobs] = useState<JobListingItem[]>([
    {
      id: 'job_gc_1',
      title: 'Senior MEP Procurement Engineer & Subcontract Lead',
      company: currentUser.company,
      companyLogo: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=100&auto=format&fit=crop&q=80',
      location: 'Dubai Creek Harbour Site & HQ Office, UAE',
      workType: 'Hybrid',
      employmentType: 'Full-time',
      salaryRange: 'AED 22,000 - AED 26,000 / month',
      department: 'Procurement & Subcontracts',
      postedDate: '3 days ago',
      applicantsCount: 3,
      description: 'Lead sourcing and subcontract execution for MEP packages, HVAC chillers, and cleanroom installations.',
      keyResponsibilities: [
        'Formulate bid comparison matrices and commercial evaluations for mechanical packages.',
        'Negotiate subcontract agreements under FIDIC Red & Yellow Book conditions.',
      ],
      requirements: [
        'Bachelor in Mechanical / Electrical Engineering or CIPS Level 4 certified.',
        '7+ years experience in UAE commercial building MEP subcontracting.',
      ],
      certificationsPreferred: ['CIPS Chartered', 'FIDIC Contracts Management'],
    },
  ]);

  const [applicantsByJob, setApplicantsByJob] = useState<Record<string, CompanyJobApplicant[]>>(
    INITIAL_COMPANY_JOB_APPLICANTS
  );
  const [selectedCompanyJobId, setSelectedCompanyJobId] = useState<string>('job_gc_1');
  const [candidateFilter, setCandidateFilter] = useState<'All' | 'Shortlisted' | 'Reviewing' | 'Interview'>('All');

  // =========================================================================
  // RENDER 1: GENERAL CONTRACTOR ATS (When viewing as Contractor)
  // =========================================================================
  if (isViewingAsContractor) {
    const activeSelectedJob = companyJobs.find((j) => j.id === selectedCompanyJobId) || companyJobs[0];
    const currentApplicants = (applicantsByJob[activeSelectedJob?.id] || []).filter((a) => {
      if (candidateFilter === 'All') return true;
      return a.status === candidateFilter;
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* View Switcher Bar */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-purple-300 font-bold uppercase tracking-wider block">Employer ATS Hub</span>
              <span className="text-sm font-bold text-white">General Contractor Recruitment Portal ({currentUser.company})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewPersonaOverride('buyer')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Switch to Buyer Jobs Board (LinkedIn View)</span>
            </button>
          </div>
        </div>

        {/* ATS Candidates Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeSelectedJob?.title}</h2>
              <p className="text-xs text-slate-500">
                {currentApplicants.length} Inbound Procurement Candidates for this role
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Filter:</span>
              {(['All', 'Reviewing', 'Shortlisted', 'Interview'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCandidateFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    candidateFilter === filter
                      ? 'bg-purple-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {currentApplicants.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No applicants matching this stage filter.</div>
            ) : (
              currentApplicants.map((candidate) => (
                <div key={candidate.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={candidate.candidateAvatar}
                      alt={candidate.candidateName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{candidate.candidateName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {candidate.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        {candidate.currentTitle} • {candidate.currentCompany}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">{candidate.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (onStartMessageWith) {
                          onStartMessageWith(candidate.id, candidate.candidateName);
                        } else {
                          showToast(`Direct message initialized with ${candidate.candidateName}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: BUYER JOBS PAGE (LINKEDIN-STYLE ARCHITECTURE & WORKFLOW)
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top LinkedIn-Style Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Brand Identity & Active Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveBuyerTab('profile_view')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBuyerTab === 'profile_view'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden ring-1 ring-blue-400 shrink-0">
              <img src={buyerProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <span>My CV</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {buyerProfile.profileStrength}% All-Star
            </span>
          </button>

          <button
            onClick={() => setActiveBuyerTab('jobs_feed')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBuyerTab === 'jobs_feed'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>General Contractor Jobs</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-extrabold">
              {localJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveBuyerTab('my_applications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBuyerTab === 'my_applications'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>My Applications</span>
            {buyerApplications.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                {buyerApplications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveBuyerTab('saved_jobs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeBuyerTab === 'saved_jobs'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-4 h-4 text-slate-500" />
            <span>Saved ({Object.values(savedJobIds).filter(Boolean).length})</span>
          </button>
        </div>

        {/* Right Actions: Contractor ATS Switcher & Post Job */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {isContractorPersona && (
            <button
              onClick={() => setViewPersonaOverride('contractor')}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Contractor ATS</span>
            </button>
          )}

          {onOpenCreateJob && currentUser.role !== 'buyer' && (
            <button
              onClick={onOpenCreateJob}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Job</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW A: MY APPLICATIONS TRACKER TAB                                  */}
      {/* ==================================================================== */}
      {activeBuyerTab === 'my_applications' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-blue-600" />
                  Applicant Tracking Telemetry
                </span>
                <span className="text-xs text-slate-500">• {buyerApplications.length} Positions Submitted</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                My General Contractor Applications
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Track your active candidacies with top GCC General Contractors. Review recruiter feedback, scheduled interviews, and whether you applied with your SOKO Profile or via LinkedIn Easy Apply.
              </p>
            </div>

            <button
              onClick={() => setActiveBuyerTab('jobs_feed')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Browse More Openings</span>
            </button>
          </div>

          <div className="space-y-4">
            {buyerApplications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No applications submitted yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Explore verified General Contractor postings from ALEC, Al Naboodah, CCC, and BESIX to apply with 1-click via LinkedIn or your Buyer Profile.
                </p>
                <button
                  onClick={() => setActiveBuyerTab('jobs_feed')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Explore General Contractor Jobs
                </button>
              </div>
            ) : (
              buyerApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-200 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={app.companyLogo}
                        alt={app.company}
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                            {app.jobTitle}
                          </h3>
                          {app.applicationMethod === 'linkedin' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 flex items-center gap-1">
                              <LinkedInIcon className="w-3 h-3 text-[#0A66C2]" />
                              Applied via LinkedIn Easy Apply
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              Applied with Buyer Profile
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-blue-700 mt-0.5">
                          {app.company}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {app.location}
                          </span>
                          <span>•</span>
                          <span>{app.salaryRange}</span>
                          <span>•</span>
                          <span>Submitted: {app.appliedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        onClick={() => setSelectedApplicationForView(app)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        View Submission
                      </button>
                      <button
                        onClick={() => {
                          if (onStartMessageWith) {
                            onStartMessageWith(`rec_${app.company}`, app.recruiter.name);
                          } else {
                            showToast(`Chat opened with ${app.recruiter.name} at ${app.company}`);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Recruiter</span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Progress Bar Pipeline */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                      <span className="text-slate-700 uppercase tracking-wider text-[10px]">Hiring Stage:</span>
                      <span className="text-blue-700 font-extrabold">{app.status}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      {[
                        { label: '1. Application Sent', active: true },
                        {
                          label: '2. Profile Viewed by GC',
                          active:
                            app.status === 'Profile Viewed' ||
                            app.status === 'Shortlisted' ||
                            app.status === 'Interview Scheduled',
                        },
                        {
                          label: '3. Shortlisted for Package',
                          active: app.status === 'Shortlisted' || app.status === 'Interview Scheduled',
                        },
                        {
                          label: '4. Interview Scheduled',
                          active: app.status === 'Interview Scheduled',
                        },
                      ].map((step, idx) => (
                        <div key={idx} className="space-y-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              step.active ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                          <span className={`block font-medium ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recruiter Banner & Resume info */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <img
                        src={app.recruiter.avatar}
                        alt={app.recruiter.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <span className="text-slate-600 text-[11px]">
                        Assigned Talent Lead: <strong>{app.recruiter.name}</strong> ({app.recruiter.title})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>Resume transmitted: {app.resumeUsed}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW B: BUYER CAREER PROFILE TAB (LinkedIn Synced)                   */}
      {/* ==================================================================== */}
      {activeBuyerTab === 'profile_view' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Banner Image */}
            <div className="h-36 sm:h-44 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowProfileEditModal(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl text-xs font-bold border border-white/30 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* Profile Body */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
                {/* Avatar with #OpenToWork Ring */}
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-emerald-500 shadow-xl bg-white p-1">
                    <img
                      src={buyerProfile.avatarUrl}
                      alt={buyerProfile.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  {buyerProfile.isOpenToWork && (
                    <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md border border-white">
                      #OpenToWork
                    </span>
                  )}
                </div>

                {/* Direct Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncWithLinkedIn}
                    disabled={isSyncingLinkedIn}
                    className="px-3.5 py-2 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <LinkedInIcon className={`w-4 h-4 text-white ${isSyncingLinkedIn ? 'animate-spin' : ''}`} />
                    <span>{isSyncingLinkedIn ? 'Syncing...' : 'Sync via LinkedIn'}</span>
                  </button>

                  <button
                    onClick={() => setShowResumePreviewModal(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Preview Executive CV</span>
                  </button>
                </div>
              </div>

              {/* Name, Headline, Verified Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {buyerProfile.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Verified Soko Buyer
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 flex items-center gap-1">
                    <LinkedInIcon className="w-3 h-3 text-[#0A66C2]" />
                    LinkedIn Verified ({buyerProfile.linkedInConnections})
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-700 max-w-3xl leading-relaxed">
                  {buyerProfile.headline}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {buyerProfile.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {buyerProfile.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {buyerProfile.phone}
                  </span>
                  <span>•</span>
                  <a
                    href={buyerProfile.linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0A66C2] font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>linkedin.com/in/{buyerProfile.linkedInUsername}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* LinkedIn Status & CV Strength Meter */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
                      CV Strength & LinkedIn Alignment: All-Star
                    </span>
                    <span className="text-emerald-600 font-extrabold">{buyerProfile.profileStrength}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                      style={{ width: `${buyerProfile.profileStrength}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
                    <span className="text-[11px] text-slate-500 block">
                      Last synced with LinkedIn: <strong className="text-slate-700 font-semibold">{buyerProfile.linkedInLastSynced}</strong> • General Contractors can search and recruit you directly.
                    </span>
                    <button
                      onClick={handleSyncWithLinkedIn}
                      disabled={isSyncingLinkedIn}
                      className="text-xs font-bold text-[#0A66C2] hover:text-[#084e96] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingLinkedIn ? 'animate-spin' : ''}`} />
                      <span>{isSyncingLinkedIn ? 'Syncing...' : 'Sync via LinkedIn'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="font-extrabold text-blue-700 text-sm block">184</span>
                    <span className="text-[10px] text-slate-500">CV Views</span>
                  </div>
                  <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="font-extrabold text-purple-700 text-sm block">26</span>
                    <span className="text-[10px] text-slate-500">GC Inquiries</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details Grid: Summary, Sourcing Portfolio, Skills, Experience */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Columns: Professional Overview & Experience */}
            <div className="lg:col-span-8 space-y-5">
              {/* Executive Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Executive Sourcing Bio & Strategy
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {buyerProfile.summary}
                </p>
              </div>

              {/* Sourcing KPIs & Spend Portfolio */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Annual Sourcing Scope & Categories Under Management
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Spend Managed</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {buyerProfile.spendUnderManagement}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {buyerProfile.yearsOfExperience}+ Years in GCC
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Notice Period</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                      {buyerProfile.jobPreferences.noticePeriod}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-2">
                    Primary Sourcing Categories:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {buyerProfile.categoriesHandled.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Experience Timeline */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Career Experience at General Contractors & Developers
                </h3>

                <div className="divide-y divide-slate-100">
                  {buyerProfile.experienceTimeline.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-slate-900">{item.role}</h4>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.period}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-blue-700">{item.company}</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education & Certifications */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Education & Professional Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Degrees
                    </span>
                    {buyerProfile.education.map((edu) => (
                      <div key={edu.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                        <strong className="text-slate-900 block">{edu.degree}</strong>
                        <span className="text-slate-600">{edu.institution} • {edu.year}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Licenses & Certifications
                    </span>
                    <div className="space-y-1.5">
                      {buyerProfile.certifications.map((cert, idx) => (
                        <div
                          key={idx}
                          className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Skills & Resume Manager */}
            <div className="lg:col-span-4 space-y-5">
              {/* Attached Resume / CV Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    Default Attached CV
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    ATS Score: {buyerProfile.resume.atsScore}%
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-xs text-slate-800 truncate block">
                    {buyerProfile.resume.fileName}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{buyerProfile.resume.fileSize}</span>
                    <span>{buyerProfile.resume.lastUpdated}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowResumePreviewModal(true)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview CV</span>
                  </button>
                  <button
                    onClick={() => {
                      showToast('Simulating resume upload: CV replaced with revised version!');
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 cursor-pointer"
                    title="Upload New Resume File"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dedicated LinkedIn CV Synchronization Card */}
              <div className="bg-gradient-to-br from-[#0A66C2]/5 to-indigo-50/50 rounded-2xl border border-[#0A66C2]/20 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
                    Sync via LinkedIn
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Connected
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Keep your Soko CV updated with your latest LinkedIn credentials, GCC project experience, and sourcing endorsements.
                </p>

                <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Connected Account:</span>
                    <a
                      href={buyerProfile.linkedInUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#0A66C2] hover:underline flex items-center gap-0.5 text-xs"
                    >
                      <span>in/{buyerProfile.linkedInUsername}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Last Synced:</span>
                    <span className="font-semibold text-slate-700">{buyerProfile.linkedInLastSynced}</span>
                  </div>
                </div>

                <button
                  onClick={handleSyncWithLinkedIn}
                  disabled={isSyncingLinkedIn}
                  className="w-full py-2.5 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <LinkedInIcon className={`w-3.5 h-3.5 text-white ${isSyncingLinkedIn ? 'animate-spin' : ''}`} />
                  <span>{isSyncingLinkedIn ? 'Syncing...' : 'Sync via LinkedIn'}</span>
                </button>
              </div>

              {/* Skills & Competencies Tag Cloud */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    Verified Skills
                  </h4>
                  <button
                    onClick={() => setShowProfileEditModal(true)}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {buyerProfile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 flex items-center gap-1"
                    >
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Job Preferences Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                  Recruiter Career Preferences
                </h4>

                <div className="space-y-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Roles</span>
                    <span className="font-semibold text-slate-900">
                      {buyerProfile.jobPreferences.targetTitles.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Locations</span>
                    <span className="font-semibold text-slate-900">
                      {buyerProfile.jobPreferences.targetLocations.join(' • ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Monthly Salary</span>
                    <span className="font-extrabold text-blue-700">
                      {buyerProfile.jobPreferences.expectedSalary}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW C & D: GENERAL CONTRACTOR JOBS FEED & SAVED JOBS (LINKEDIN UX)  */}
      {/* ==================================================================== */}
      {(activeBuyerTab === 'jobs_feed' || activeBuyerTab === 'saved_jobs') && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Search & Location Bar (LinkedIn Standard) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Keyword / Role / Skill Search */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by job title, skill (e.g. FIDIC, Steel, MEP), or General Contractor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* General Contractor Filter Dropdown */}
              <div className="md:col-span-4 relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedGCFilter}
                  onChange={(e) => setSelectedGCFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All General Contractors (GCC & Megaprojects)</option>
                  {TOP_GENERAL_CONTRACTORS.filter((gc) => gc !== 'All').map((gc) => (
                    <option key={gc} value={gc}>
                      {gc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter Dropdown */}
              <div className="md:col-span-3 relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedLocationFilter}
                  onChange={(e) => setSelectedLocationFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All GCC Locations</option>
                  <option value="Dubai">Dubai, UAE</option>
                  <option value="Abu Dhabi">Abu Dhabi, UAE</option>
                  <option value="Riyadh">Riyadh, Saudi Arabia</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Chips (Workplace, Active GCs) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mr-1">Workplace:</span>
                {['All', 'Hybrid', 'On-site', 'Remote'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setWorkTypeFilter(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      workTypeFilter === type
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 font-semibold">
                Showing <strong>{filteredJobs.length}</strong> General Contractor vacancies
              </div>
            </div>
          </div>

          {/* Dual-Panel Layout (LinkedIn Master-Detail UX) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 5 Columns: Scrollable Job Cards List */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100 max-h-[820px] overflow-y-auto scrollbar-thin">
              {filteredJobs.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No General Contractor jobs match your filters</p>
                  <p className="text-[11px] text-slate-400">Try clearing filters or search terms.</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGCFilter('All');
                      setSelectedLocationFilter('All');
                      setWorkTypeFilter('All');
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = job.id === selectedJob.id;
                  const isSaved = !!savedJobIds[job.id];

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-4 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={job.companyLogo}
                          alt={job.company}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                              {job.title}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSave(job.id);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer shrink-0"
                              title={isSaved ? 'Remove from Saved' : 'Save Job'}
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}`} />
                            </button>
                          </div>

                          {/* General Contractor Name & Verified Badge */}
                          <div className="flex items-center gap-1 text-xs text-blue-700 font-bold mt-0.5 truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{job.company}</span>
                          </div>

                          {job.gcProjects && job.gcProjects.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium truncate block mt-0.5">
                              Projects: {job.gcProjects.join(', ')}
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {job.location.split('&')[0]}
                            </span>
                            <span>•</span>
                            <span className="font-extrabold text-slate-800">
                              {job.salaryRange.split('+')[0]}
                            </span>
                          </div>

                          {/* Match Score & Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            {job.matchScore && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                {job.matchScore}% Match
                              </span>
                            )}

                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {job.workType}
                            </span>

                            {job.applied ? (
                              job.appliedMethod === 'linkedin' ? (
                                <span className="text-[10px] font-bold text-[#0A66C2] bg-[#0A66C2]/10 border border-[#0A66C2]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <LinkedInIcon className="w-2.5 h-2.5 text-[#0A66C2]" />
                                  Applied via LinkedIn
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Applied with Profile
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">
                                {job.postedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right 7 Columns: Detailed Sticky Job Description Pane */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sticky top-20 max-h-[820px] overflow-y-auto scrollbar-thin">
              {selectedJob ? (
                <div className="space-y-6">
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-start gap-4">
                      <img
                        src={selectedJob.companyLogo}
                        alt={selectedJob.company}
                        className="w-16 h-16 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            {selectedJob.gcTier || 'Tier 1 General Contractor'}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                          {selectedJob.title}
                        </h2>
                        <div className="text-sm font-bold text-blue-700 mt-0.5">
                          {selectedJob.company}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {selectedJob.location}
                          </span>
                          <span>•</span>
                          <span>{selectedJob.department}</span>
                          <span>•</span>
                          <span>Posted {selectedJob.postedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleSave(selectedJob.id)}
                        className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                        title={savedJobIds[selectedJob.id] ? 'Remove from Saved' : 'Save Job'}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            savedJobIds[selectedJob.id] ? 'fill-blue-600 text-blue-600' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => {
                          showToast(`Job Link Copied: https://soko.ae/jobs/${selectedJob.id}`);
                        }}
                        className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                        title="Share Opening"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Workplace</span>
                      <span className="font-extrabold text-slate-800">{selectedJob.workType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Type</span>
                      <span className="font-extrabold text-slate-800">{selectedJob.employmentType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Pay</span>
                      <span className="font-extrabold text-slate-900">{selectedJob.salaryRange.split('+')[0]}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Applicants</span>
                      <span className="font-extrabold text-blue-700">{selectedJob.applicantsCount} candidates</span>
                    </div>
                  </div>

                  {/* Flagship Projects Bar */}
                  {selectedJob.gcProjects && selectedJob.gcProjects.length > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-blue-900 font-semibold">
                        Flagship GC Projects for this team:{' '}
                        <strong>{selectedJob.gcProjects.join(' • ')}</strong>
                      </span>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* TWO PRIMARY APPLY ACTIONS (LinkedIn vs Profile)           */}
                  {/* ========================================================= */}
                  <div className="space-y-2 pt-1">
                    {selectedJob.applied ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold block">
                              Application Transmitted to {selectedJob.company}
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              {selectedJob.appliedMethod === 'linkedin'
                                ? 'Applied via LinkedIn Easy Apply • Recruiter has viewed your LinkedIn profile'
                                : 'Applied with Verified Soko Buyer Profile & MCIPS credentials'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveBuyerTab('my_applications')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          View Status
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Apply with Buyer Profile */}
                        <button
                          id="apply-with-profile-btn"
                          onClick={() => setApplyingJobWithProfile(selectedJob)}
                          className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 group"
                        >
                          <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          <span>Apply with Buyer Profile</span>
                        </button>

                        {/* Option 2: Apply via LinkedIn */}
                        <button
                          id="apply-via-linkedin-btn"
                          onClick={() => setApplyingJobViaLinkedIn(selectedJob)}
                          className="py-3 px-4 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-xl font-extrabold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <LinkedInIcon className="w-4 h-4 text-white" />
                          <span>Easy Apply via LinkedIn</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recruiter / Hiring Team Card */}
                  {selectedJob.recruiter && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedJob.recruiter.avatar}
                          alt={selectedJob.recruiter.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-2xs"
                        />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Hiring Team at {selectedJob.company}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {selectedJob.recruiter.name}
                          </span>
                          <span className="text-slate-600 text-[11px] block">
                            {selectedJob.recruiter.title}
                          </span>
                          <span className="text-blue-700 font-semibold text-[10px] mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {selectedJob.recruiter.mutualConnections} mutual connections work at {selectedJob.company}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (onStartMessageWith) {
                            onStartMessageWith(
                              `rec_${selectedJob.company}`,
                              selectedJob.recruiter?.name || 'Recruiter'
                            );
                          } else {
                            showToast(`Opening chat with ${selectedJob.recruiter?.name}...`);
                          }
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Message</span>
                      </button>
                    </div>
                  )}

                  {/* Match Breakdown Section */}
                  {selectedJob.matchScore && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>How your profile matches this General Contractor opening:</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                          {selectedJob.matchScore}% Match
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] text-slate-500 font-semibold">Matched Skills from Your Profile:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedJob.matchedSkills || []).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                            >
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {selectedJob.missingSkills && selectedJob.missingSkills.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200">
                          <div className="text-[11px] text-slate-500 font-semibold">Skills you could add to profile:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedJob.missingSkills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700"
                              >
                                + {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Description */}
                  <div className="space-y-5 text-xs text-slate-700 leading-relaxed">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1.5">Role Overview</h4>
                      <p>{selectedJob.description}</p>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1.5">Key Responsibilities</h4>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                        {selectedJob.keyResponsibilities.map((resp, i) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1.5">Candidate Requirements</h4>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                        {selectedJob.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1.5">Preferred Certifications</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.certificationsPreferred.map((cert, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1"
                          >
                            <Award className="w-3 h-3 text-blue-600" />
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Select a General Contractor vacancy from the left to view comprehensive details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: APPLY WITH BUYER PROFILE MODAL                              */}
      {/* ==================================================================== */}
      {applyingJobWithProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <img
                  src={applyingJobWithProfile.companyLogo}
                  alt={applyingJobWithProfile.company}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-wider block">
                    Apply with Verified Buyer Profile
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {applyingJobWithProfile.title}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {applyingJobWithProfile.company} • {applyingJobWithProfile.location}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setApplyingJobWithProfile(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const answers: Record<string, string> = {};
                (applyingJobWithProfile.screeningQuestions || []).forEach((q) => {
                  answers[q.question] = (formData.get(q.id) as string) || q.defaultAnswer || 'Yes';
                });
                const note = (formData.get('coverNote') as string) || '';
                handleConfirmApplyWithProfile(applyingJobWithProfile, answers, note);
              }}
              className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto"
            >
              {/* Applicant Identity Preview */}
              <div className="flex items-center gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <img
                  src={buyerProfile.avatarUrl}
                  alt={buyerProfile.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{buyerProfile.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      MCIPS Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{buyerProfile.headline}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{buyerProfile.phone}</span>
                    <span>•</span>
                    <span>{buyerProfile.email}</span>
                  </div>
                </div>
              </div>

              {/* Resume Attached */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Attached Executive CV *</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="font-bold text-slate-900 block">{buyerProfile.resume.fileName}</span>
                      <span className="text-[10px] text-slate-500">
                        {buyerProfile.resume.fileSize} • ATS Score: {buyerProfile.resume.atsScore}%
                      </span>
                    </div>
                  </div>
                  <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
              </div>

              {/* GC Screening Questions */}
              {applyingJobWithProfile.screeningQuestions && applyingJobWithProfile.screeningQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 block uppercase text-[10px] tracking-wider">
                    General Contractor Screening Questions
                  </span>

                  {applyingJobWithProfile.screeningQuestions.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <label className="font-semibold text-slate-700 block">{q.question}</label>
                      {q.options ? (
                        <select
                          name={q.id}
                          defaultValue={q.defaultAnswer || q.options[0]}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                        >
                          {q.options.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name={q.id}
                          defaultValue={q.defaultAnswer || ''}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Message to Recruiter */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">
                  Introduction / Commercial Highlights to {applyingJobWithProfile.recruiter?.name || 'Hiring Lead'}
                </label>
                <textarea
                  name="coverNote"
                  rows={2}
                  placeholder="e.g. Led AED 180M in steel/MEP packages across Dubai Creek Harbour, available for immediate deployment."
                  defaultValue="Applying with verified MCIPS credentials and 10+ years administering FIDIC Red Book commercial subcontracts across GCC megaprojects."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyingJobWithProfile(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EASY APPLY VIA LINKEDIN MODAL (AUTHENTIC LINKEDIN BRANDING)  */}
      {/* ==================================================================== */}
      {applyingJobViaLinkedIn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* LinkedIn Header */}
            <div className="bg-[#0A66C2] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-[#0A66C2] flex items-center justify-center font-bold">
                  <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white leading-tight flex items-center gap-1.5">
                    <span>Easy Apply with LinkedIn</span>
                  </h3>
                  <span className="text-xs text-blue-100">
                    Applying to {applyingJobViaLinkedIn.company}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setApplyingJobViaLinkedIn(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LinkedIn Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const note = (formData.get('linkedInNote') as string) || '';
                const includePdf = formData.get('includePdf') === 'on';
                handleConfirmApplyViaLinkedIn(applyingJobViaLinkedIn, note, includePdf);
              }}
              className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto"
            >
              {/* Linked Profile Card Preview */}
              <div className="bg-[#0A66C2]/5 p-4 rounded-xl border border-[#0A66C2]/20 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={buyerProfile.avatarUrl}
                    alt={buyerProfile.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0A66C2] shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900">{buyerProfile.name}</span>
                      <LinkedInIcon className="w-3.5 h-3.5 text-[#0A66C2]" />
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">{buyerProfile.headline}</p>
                    <span className="text-[11px] text-[#0A66C2] font-semibold mt-0.5 block">
                      {buyerProfile.linkedInConnections} • {buyerProfile.location}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#0A66C2]/15 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Public Profile URL:</span>
                  <span className="font-mono text-[#0A66C2] font-semibold">
                    linkedin.com/in/{buyerProfile.linkedInUsername}
                  </span>
                </div>
              </div>

              {/* Mutual Connections at GC */}
              {applyingJobViaLinkedIn.recruiter && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700">
                  <Users className="w-4 h-4 text-[#0A66C2] shrink-0" />
                  <span>
                    <strong>{applyingJobViaLinkedIn.recruiter.mutualConnections} mutual LinkedIn connections</strong> work at{' '}
                    {applyingJobViaLinkedIn.company}. They will be notified of your application.
                  </span>
                </div>
              )}

              {/* Contact Information Verified */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email from LinkedIn</label>
                  <input
                    type="email"
                    readOnly
                    value={buyerProfile.email}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    readOnly
                    value={buyerProfile.phone}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Resume Attachment Option */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">Resume Attachment</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" name="includePdf" defaultChecked className="rounded text-[#0A66C2]" />
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block">Generate & Attach LinkedIn Profile PDF</span>
                      <span className="text-[10px] text-slate-500">
                        Includes work experience, verified MCIPS certifications, and recommendations
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quick Note to Recruiter */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Note for {applyingJobViaLinkedIn.company} Recruiter</label>
                <textarea
                  name="linkedInNote"
                  rows={2}
                  defaultValue={`Hi ${applyingJobViaLinkedIn.recruiter?.name || 'Talent Team'}, I am very interested in the ${applyingJobViaLinkedIn.title} role at ${applyingJobViaLinkedIn.company}. Please review my attached LinkedIn profile and commercial track record.`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyingJobViaLinkedIn(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <LinkedInIcon className="w-4 h-4 text-white" />
                  <span>Submit Application via LinkedIn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EXECUTIVE CV / RESUME PREVIEW MODAL                         */}
      {/* ==================================================================== */}
      {showResumePreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {buyerProfile.resume.fileName}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ATS Score: <strong>{buyerProfile.resume.atsScore}%</strong> • Verified CIPS Middle East
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowResumePreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto bg-slate-50/50 font-sans">
              {/* Header inside CV */}
              <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{buyerProfile.name}</h2>
                <p className="font-bold text-blue-700 text-xs">{buyerProfile.headline}</p>
                <p className="text-[11px] text-slate-500">
                  {buyerProfile.location} • {buyerProfile.phone} • {buyerProfile.email} • linkedin.com/in/{buyerProfile.linkedInUsername}
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-blue-800">
                  Executive Summary
                </h4>
                <p className="text-slate-700 leading-relaxed">{buyerProfile.summary}</p>
              </div>

              {/* Core Competencies */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-blue-800">
                  Core Procurement Competencies
                </h4>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                  {buyerProfile.skills.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Professional Experience */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-blue-800">
                  Work History
                </h4>
                {buyerProfile.experienceTimeline.map((exp) => (
                  <div key={exp.id} className="space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{exp.role}</span>
                      <span className="text-slate-500 text-[11px]">{exp.period}</span>
                    </div>
                    <div className="text-blue-700 font-semibold">{exp.company}</div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>

              {/* Certifications */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-blue-800">
                  Certifications
                </h4>
                <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                  {buyerProfile.certifications.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Formatted for GCC General Contractor Applicant Tracking Systems (ATS)</span>
              <button
                onClick={() => {
                  showToast('Downloaded ATS-Optimized PDF Resume');
                  setShowResumePreviewModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: SUBMITTED APPLICATION DETAILS MODAL                         */}
      {/* ==================================================================== */}
      {selectedApplicationForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <img
                  src={selectedApplicationForView.companyLogo}
                  alt={selectedApplicationForView.company}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedApplicationForView.jobTitle}</h3>
                  <span className="text-xs text-slate-500 font-semibold">{selectedApplicationForView.company}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplicationForView(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted</span>
                  <span className="font-bold text-slate-800">{selectedApplicationForView.appliedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Method</span>
                  <span className="font-bold text-blue-700">
                    {selectedApplicationForView.applicationMethod === 'linkedin'
                      ? 'LinkedIn Easy Apply'
                      : 'Buyer Profile'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                  {selectedApplicationForView.status}
                </span>
              </div>

              {selectedApplicationForView.coverNote && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Submitted Cover Pitch</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                    {selectedApplicationForView.coverNote}
                  </p>
                </div>
              )}

              {selectedApplicationForView.screeningAnswers && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Screening Question Answers</span>
                  {Object.entries(selectedApplicationForView.screeningAnswers).map(([q, ans], idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                      <div className="text-slate-500 font-medium">{q}</div>
                      <div className="font-bold text-slate-800 mt-0.5">Answer: {ans}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedApplicationForView(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: EDIT PROFILE DRAWER MODAL                                   */}
      {/* ==================================================================== */}
      {showProfileEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Edit My CV & LinkedIn Info</h3>
              <button
                onClick={() => setShowProfileEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const headline = (formData.get('headline') as string) || buyerProfile.headline;
                const summary = (formData.get('summary') as string) || buyerProfile.summary;
                const spend = (formData.get('spend') as string) || buyerProfile.spendUnderManagement;
                const linkedInUrl = (formData.get('linkedInUrl') as string) || buyerProfile.linkedInUrl;
                const notice = (formData.get('notice') as string) || buyerProfile.jobPreferences.noticePeriod;
                const expectedSalary = (formData.get('expectedSalary') as string) || buyerProfile.jobPreferences.expectedSalary;

                setBuyerProfile((prev) => ({
                  ...prev,
                  headline,
                  summary,
                  spendUnderManagement: spend,
                  linkedInUrl,
                  jobPreferences: {
                    ...prev.jobPreferences,
                    noticePeriod: notice,
                    expectedSalary,
                  },
                }));
                setShowProfileEditModal(false);
                showToast('✓ Profile updated successfully!');
              }}
              className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto"
            >
              <div>
                <label className="font-bold text-slate-800 block mb-1">LinkedIn Headline</label>
                <textarea
                  name="headline"
                  rows={2}
                  defaultValue={buyerProfile.headline}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Executive Summary / Sourcing Strategy</label>
                <textarea
                  name="summary"
                  rows={3}
                  defaultValue={buyerProfile.summary}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Spend Managed</label>
                  <input
                    type="text"
                    name="spend"
                    defaultValue={buyerProfile.spendUnderManagement}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Notice Period</label>
                  <input
                    type="text"
                    name="notice"
                    defaultValue={buyerProfile.jobPreferences.noticePeriod}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Target Monthly Salary</label>
                  <input
                    type="text"
                    name="expectedSalary"
                    defaultValue={buyerProfile.jobPreferences.expectedSalary}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    name="linkedInUrl"
                    defaultValue={buyerProfile.linkedInUrl}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfileEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
