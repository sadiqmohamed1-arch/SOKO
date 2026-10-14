export const INQUIRY_STATUSES = ['new', 'open', 'in_progress', 'waiting', 'resolved', 'closed', 'spam'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
  spam: 'Spam',
};

export const INQUIRY_STATUS_CLASSES: Record<InquiryStatus, string> = {
  new: 'bg-blue-50 text-blue-800 border-blue-200',
  open: 'bg-sky-50 text-sky-800 border-sky-200',
  in_progress: 'bg-amber-50 text-amber-900 border-amber-200',
  waiting: 'bg-violet-50 text-violet-800 border-violet-200',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  spam: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const INQUIRY_USER_TYPES = ['Supplier', 'Buyer', 'Contractor', 'Other'] as const;
export const INQUIRY_CATEGORIES = [
  'General Inquiry',
  'Supplier Support',
  'Buyer Support',
  'Contractor Support',
  'Partnership',
  'Technical Support',
  'Other',
] as const;

export const OPEN_INQUIRY_STATUSES: InquiryStatus[] = ['new', 'open', 'in_progress', 'waiting'];

export interface ContactInquiry {
  id: string;
  reference: string;
  full_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  user_type: string;
  category: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface ContactInquiryNote {
  id: string;
  inquiry_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ContactAssignee {
  user_id: string;
  full_name: string;
}

export interface InquiryAuditRow {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  diff: Record<string, unknown>;
  at: string;
  actor_id: string | null;
}

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}
