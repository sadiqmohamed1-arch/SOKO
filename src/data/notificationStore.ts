import { SupplierStore } from './supplierTypes';

export type NotificationEventType =
  | 'message'
  | 'market_hub_interest'
  | 'market_hub_update'
  | 'visit_request'
  | 'visit_confirmation'
  | 'vendor_review'
  | 'document_shared'
  | 'compliance_expiry'
  | 'team_invite'
  | 'team_change';

export type NotificationFilter = 'all' | 'messages' | 'market_hub' | 'visits' | 'vendors' | 'documents';

export interface SokoNotification {
  id: string;
  recipientPersonId?: string;
  recipientWorkspaceId?: string;
  eventType: NotificationEventType;
  actorName: string;
  actorCompany?: string;
  relatedRecordId?: string;
  relatedRecordTitle?: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  route: string;
}

export interface NotificationStore {
  version: number;
  notifications: SokoNotification[];
}

export const NOTIFICATION_STORE_VERSION = 1;
const STORE_KEY = 'soko_notifications_v1';

const now = () => new Date().toISOString().slice(0, 19);

const seed = (): NotificationStore => ({
  version: NOTIFICATION_STORE_VERSION,
  notifications: [
    {
      id: 'ntf_demo_1',
      recipientWorkspaceId: 'company:sup_gec_dubai',
      eventType: 'market_hub_interest',
      actorName: 'ABC Waterproofing LLC',
      actorCompany: 'ABC Waterproofing LLC',
      relatedRecordId: 'opp_gec_waterproofing_01',
      relatedRecordTitle: 'Podium Waterproofing — Bluewaters Residential Tower',
      title: 'New interest from ABC Waterproofing LLC',
      description: 'ABC Waterproofing LLC expressed interest in "Podium Waterproofing — Bluewaters Residential Tower".',
      createdAt: '2026-10-08T14:23:00',
      read: false,
      route: 'opportunities',
    },
    {
      id: 'ntf_demo_2',
      recipientWorkspaceId: 'company:sup_gec_dubai',
      eventType: 'vendor_review',
      actorName: 'ABC Waterproofing LLC',
      actorCompany: 'ABC Waterproofing LLC',
      relatedRecordId: 'vnd_gec_1',
      relatedRecordTitle: 'ABC Waterproofing LLC vendor review',
      title: 'Vendor review assignment: ABC Waterproofing LLC',
      description: 'ABC Waterproofing LLC is pending vendor approval review. Trade License and ICV Certificate submitted.',
      createdAt: '2026-10-08T10:15:00',
      read: false,
      route: 'sw-vendors',
    },
    {
      id: 'ntf_demo_3',
      recipientWorkspaceId: 'company:sup_gec_dubai',
      eventType: 'compliance_expiry',
      actorName: 'Emirates Steel Industries',
      actorCompany: 'Emirates Steel Industries',
      relatedRecordId: 'vcd_gec_1',
      relatedRecordTitle: 'ISO 9001 Certificate',
      title: 'Compliance document expiring soon',
      description: 'ISO 9001 Certificate from Emirates Steel Industries expires on 2027-03-12.',
      createdAt: '2026-10-07T09:00:00',
      read: true,
      route: 'sw-documents',
    },
    {
      id: 'ntf_demo_4',
      recipientWorkspaceId: 'company:sup_gec_dubai',
      eventType: 'visit_request',
      actorName: 'Ahmed Khan',
      actorCompany: 'ABC Waterproofing LLC',
      relatedRecordId: 'vst_abc_2',
      relatedRecordTitle: 'Vendor onboarding visit',
      title: 'Visit request from ABC Waterproofing',
      description: 'Ahmed Khan (ABC Waterproofing LLC) requested a vendor onboarding visit at GEC Dubai on 2026-10-12.',
      createdAt: '2026-10-06T13:00:00',
      read: false,
      route: 'sw-visits',
    },
    {
      id: 'ntf_demo_5',
      recipientWorkspaceId: 'company:sup_gec_dubai',
      eventType: 'document_shared',
      actorName: 'Ahmed Khan',
      actorCompany: 'ABC Waterproofing LLC',
      relatedRecordId: 'doc_abc_datasheet_mapeproof',
      relatedRecordTitle: 'Mapelastic Cementitious Coating – Technical Datasheet',
      title: 'ABC Waterproofing shared a document with GEC',
      description: 'Ahmed Khan shared "Mapelastic Cementitious Coating – Technical Datasheet" with GEC Dubai. Valid for 22 days.',
      createdAt: '2026-10-01T11:00:00',
      read: true,
      route: 'sw-documents',
    },
  ],
});

export const loadNotificationStore = (): NotificationStore => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as NotificationStore;
    if (parsed.version !== NOTIFICATION_STORE_VERSION) return seed();
    return parsed;
  } catch {
    return seed();
  }
};

export const saveNotificationStore = (store: NotificationStore) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
};

let counter = 0;
const newId = () => `ntf_${Date.now()}_${++counter}`;

export const addNotification = (
  store: NotificationStore,
  input: Omit<SokoNotification, 'id' | 'createdAt' | 'read'>,
): NotificationStore => {
  if (store.notifications.some((n) =>
    n.eventType === input.eventType &&
    n.relatedRecordId === input.relatedRecordId &&
    n.recipientWorkspaceId === input.recipientWorkspaceId &&
    !n.read
  )) return store;

  const notification: SokoNotification = {
    ...input,
    id: newId(),
    createdAt: now(),
    read: false,
  };
  return { ...store, notifications: [notification, ...store.notifications] };
};

export const markNotificationRead = (store: NotificationStore, id: string): NotificationStore => ({
  ...store,
  notifications: store.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
});

export const markAllRead = (store: NotificationStore, filter: NotificationFilter, contextWorkspaceId?: string): NotificationStore => ({
  ...store,
  notifications: store.notifications.map((n) => {
    if (contextWorkspaceId && n.recipientWorkspaceId !== contextWorkspaceId && n.recipientWorkspaceId !== 'personal') return n;
    if (filter === 'all') return { ...n, read: true };
    if (filter === 'messages' && n.eventType === 'message') return { ...n, read: true };
    if (filter === 'market_hub' && (n.eventType === 'market_hub_interest' || n.eventType === 'market_hub_update')) return { ...n, read: true };
    if (filter === 'visits' && (n.eventType === 'visit_request' || n.eventType === 'visit_confirmation')) return { ...n, read: true };
    if (filter === 'vendors' && n.eventType === 'vendor_review') return { ...n, read: true };
    if (filter === 'documents' && (n.eventType === 'document_shared' || n.eventType === 'compliance_expiry')) return { ...n, read: true };
    return n;
  }),
});

export const notificationsForContext = (store: NotificationStore, contextWorkspaceId: string, personId: string): SokoNotification[] => {
  if (contextWorkspaceId === 'personal') {
    return store.notifications.filter((n) => n.recipientWorkspaceId === 'personal' || n.recipientPersonId === personId);
  }
  return store.notifications.filter((n) => n.recipientWorkspaceId === contextWorkspaceId);
};

export const unreadCountForContext = (store: NotificationStore, contextWorkspaceId: string, personId: string): number => {
  if (contextWorkspaceId === 'personal') {
    return store.notifications.filter((n) => !n.read && (n.recipientWorkspaceId === 'personal' || n.recipientPersonId === personId)).length;
  }
  return store.notifications.filter((n) => !n.read && n.recipientWorkspaceId === contextWorkspaceId).length;
};

export const marketHubInterestNotification = (
  store: NotificationStore,
  publisherWorkspaceId: string,
  opportunityId: string,
  opportunityTitle: string,
  responderCompanyName: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId: publisherWorkspaceId,
  eventType: 'market_hub_interest',
  actorName: responderCompanyName,
  actorCompany: responderCompanyName,
  relatedRecordId: opportunityId,
  relatedRecordTitle: opportunityTitle,
  title: `New interest from ${responderCompanyName}`,
  description: `${responderCompanyName} expressed interest in "${opportunityTitle}".`,
  route: 'opportunities',
});

export const marketHubConnectionNotification = (
  store: NotificationStore,
  responderWorkspaceId: string,
  opportunityId: string,
  opportunityTitle: string,
  publisherName: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId: responderWorkspaceId,
  eventType: 'market_hub_interest',
  actorName: publisherName,
  actorCompany: publisherName,
  relatedRecordId: opportunityId,
  relatedRecordTitle: opportunityTitle,
  title: `Connection approved by ${publisherName}`,
  description: `${publisherName} approved your response to "${opportunityTitle}". Contact details are now visible.`,
  route: 'opportunities',
});

export const visitRequestNotification = (
  store: NotificationStore,
  recipientWorkspaceId: string,
  visitorName: string,
  visitorCompany: string,
  visitId: string,
  visitPurpose: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId,
  eventType: 'visit_request',
  actorName: visitorName,
  actorCompany: visitorCompany,
  relatedRecordId: visitId,
  relatedRecordTitle: visitPurpose,
  title: `Visit request from ${visitorCompany}`,
  description: `${visitorName} (${visitorCompany}) requested a ${visitPurpose} visit.`,
  route: 'sw-visits',
});

export const documentSharedNotification = (
  store: NotificationStore,
  recipientWorkspaceId: string,
  sharerName: string,
  sharerCompany: string,
  docId: string,
  docName: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId,
  eventType: 'document_shared',
  actorName: sharerName,
  actorCompany: sharerCompany,
  relatedRecordId: docId,
  relatedRecordTitle: docName,
  title: `${sharerCompany} shared a document with you`,
  description: `${sharerName} shared "${docName}" with your company.`,
  route: 'sw-documents',
});

export const vendorReviewNotification = (
  store: NotificationStore,
  recipientWorkspaceId: string,
  vendorName: string,
  vendorId: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId,
  eventType: 'vendor_review',
  actorName: vendorName,
  actorCompany: vendorName,
  relatedRecordId: vendorId,
  relatedRecordTitle: `${vendorName} vendor review`,
  title: `Vendor review assignment: ${vendorName}`,
  description: `${vendorName} is pending vendor approval review.`,
  route: 'sw-vendors',
});

export const teamInviteNotification = (
  store: NotificationStore,
  recipientPersonId: string,
  inviterName: string,
  companyName: string,
  role: string,
): NotificationStore => addNotification(store, {
  recipientPersonId,
  recipientWorkspaceId: 'personal',
  eventType: 'team_invite',
  actorName: inviterName,
  actorCompany: companyName,
  relatedRecordTitle: `${companyName} team invitation`,
  title: `Invitation to join ${companyName}`,
  description: `${inviterName} invited you to join ${companyName} as ${role}.`,
  route: 'card',
});

export const complianceExpiryNotification = (
  store: NotificationStore,
  recipientWorkspaceId: string,
  supplierName: string,
  docId: string,
  docType: string,
  expiryDate: string,
): NotificationStore => addNotification(store, {
  recipientWorkspaceId,
  eventType: 'compliance_expiry',
  actorName: supplierName,
  actorCompany: supplierName,
  relatedRecordId: docId,
  relatedRecordTitle: docType,
  title: 'Compliance document expiring soon',
  description: `${docType} from ${supplierName} expires on ${expiryDate}.`,
  route: 'sw-documents',
});
