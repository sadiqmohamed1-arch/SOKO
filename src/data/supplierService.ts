import { companyById, documentsOf, findDuplicateCompanies, membersOf, storageAllocationMb, storageUsedMb } from './supplierStore';
import { can, CompanyDocument, CompanyMembership, CompanyProduct, CompanyProfile, CompanyRecord, DocumentAccessLevel, DocumentCategory, Permission, SessionUser, SupplierResult, CompanyRole, SupplierStore, SupplierTier, TIER_CONFIG, AuditEntry, roleMeta } from './supplierTypes';

export interface SupplierCtx {
  store: SupplierStore;
  user: SessionUser;
  companyId: string;
  role: CompanyRole;
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const fail = (error: string) => ({ ok: false as const, error });
const done = <T>(store: SupplierStore, value: T) => ({ ok: true as const, store, value });

const deny = (ctx: SupplierCtx, p: Permission) =>
  can(ctx.role, p) ? undefined : fail(`Your role (${roleMeta(ctx.role).label}) does not allow this action.`);

const log = (ctx: SupplierCtx, action: string, kind: AuditEntry['kind']): AuditEntry => ({ id: uid('aud'), companyId: ctx.companyId, at: now(), actor: ctx.user.name, action, kind });

const touch = (store: SupplierStore, ctx: SupplierCtx, action: string, kind: AuditEntry['kind'], patch: Partial<SupplierStore>): SupplierStore => ({
  ...store,
  ...patch,
  companies: (patch.companies ?? store.companies).map((c) => (c.id === ctx.companyId ? { ...c, updatedAt: now() } : c)),
  audit: [log(ctx, action, kind), ...store.audit].slice(0, 200),
});

const company = (ctx: SupplierCtx) => companyById(ctx.store, ctx.companyId)!;
const premium = (ctx: SupplierCtx) => company(ctx).tier === 'premium';

export const updateProfile = (ctx: SupplierCtx, patch: Partial<CompanyProfile>, label = 'Updated company profile'): SupplierResult<CompanyRecord> => {
  const d = deny(ctx, 'profile.edit');
  if (d) return d;
  if (patch.tradingName !== undefined && !patch.tradingName.trim()) return fail('Trading name is required.');
  if (patch.generalEmail && !/^\S+@\S+\.\S+$/.test(patch.generalEmail)) return fail('Enter a valid general email address.');
  if (patch.website && !/^https?:\/\/\S+\.\S+/.test(patch.website)) return fail('Website must start with http:// or https://');
  const updated = { ...company(ctx), profile: { ...company(ctx).profile, ...patch } };
  const store = touch(ctx.store, ctx, label, 'profile', { companies: ctx.store.companies.map((c) => (c.id === ctx.companyId ? updated : c)) });
  return done(store, updated);
};

export type ProductDraft = Omit<CompanyProduct, 'id' | 'companyId' | 'views' | 'enquiries' | 'updatedAt'> & { id?: string };

export const saveProduct = (ctx: SupplierCtx, draft: ProductDraft): SupplierResult<CompanyProduct> => {
  const d = deny(ctx, 'products.manage');
  if (d) return d;
  if (!draft.name.trim()) return fail('Product name is required.');
  if (!draft.category) return fail('Choose a category.');
  const tier = TIER_CONFIG[company(ctx).tier];
  const existing = draft.id ? ctx.store.products.find((p) => p.id === draft.id && p.companyId === ctx.companyId) : undefined;
  if (!existing && ctx.store.products.filter((p) => p.companyId === ctx.companyId).length >= tier.listingLimit) return fail(`Your plan allows up to ${tier.listingLimit} listings.`);
  if (!premium(ctx) && (draft.images.length > tier.imageLimit || draft.specs.length > tier.specLimit || draft.attachments.length || draft.variations.length))
    return fail('Multiple images, extra specifications, variations and attachments are Supplier Premium features.');
  const product: CompanyProduct = {
    ...draft,
    id: existing?.id ?? uid('prd'),
    companyId: ctx.companyId,
    name: draft.name.trim(),
    specs: draft.specs.filter((s) => s.label.trim() && s.value.trim()),
    views: existing?.views ?? 0,
    enquiries: existing?.enquiries ?? 0,
    updatedAt: now(),
  };
  const products = existing ? ctx.store.products.map((p) => (p.id === product.id ? product : p)) : [product, ...ctx.store.products];
  return done(touch(ctx.store, ctx, `${existing ? 'Updated' : 'Added'} product "${product.name}"`, 'product', { products }), product);
};

export const setProductStatus = (ctx: SupplierCtx, id: string, status: CompanyProduct['status']): SupplierResult => {
  const d = deny(ctx, 'products.manage');
  if (d) return d;
  const p = ctx.store.products.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!p) return fail('Product not found.');
  const products = ctx.store.products.map((x) => (x.id === id ? { ...x, status, updatedAt: now() } : x));
  return done(touch(ctx.store, ctx, `${status === 'active' ? 'Activated' : 'Deactivated'} "${p.name}"`, 'product', { products }), undefined);
};

export const deleteProduct = (ctx: SupplierCtx, id: string): SupplierResult => {
  const d = deny(ctx, 'records.delete');
  if (d) return d;
  const p = ctx.store.products.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!p) return fail('Product not found.');
  return done(touch(ctx.store, ctx, `Deleted product "${p.name}"`, 'product', { products: ctx.store.products.filter((x) => x.id !== id) }), undefined);
};

const docGate = (ctx: SupplierCtx, p: Permission) => {
  if (!premium(ctx)) return fail('The Document Center is part of Supplier Premium.');
  return deny(ctx, p);
};

const editDoc = (ctx: SupplierCtx, id: string, fn: (d: CompanyDocument) => CompanyDocument, action: (d: CompanyDocument) => string, p: Permission = 'documents.manage'): SupplierResult<CompanyDocument> => {
  const g = docGate(ctx, p);
  if (g) return g;
  const doc = ctx.store.documents.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!doc) return fail('Document not found.');
  const next = fn(doc);
  return done(touch(ctx.store, ctx, action(doc), 'document', { documents: ctx.store.documents.map((x) => (x.id === id ? next : x)) }), next);
};

export interface UploadInput {
  name: string;
  category: DocumentCategory;
  fileName: string;
  sizeMb: number;
  expiry?: string;
  reminderDays: number;
  access: DocumentAccessLevel;
}

export const uploadDocument = (ctx: SupplierCtx, input: UploadInput): SupplierResult<CompanyDocument> => {
  const g = docGate(ctx, 'documents.manage');
  if (g) return g;
  if (!input.name.trim()) return fail('Document name is required.');
  const c = company(ctx);
  const used = storageUsedMb(documentsOf(ctx.store, ctx.companyId));
  if (used + input.sizeMb > storageAllocationMb(c)) return fail('Not enough storage available for this file.');
  const doc: CompanyDocument = {
    id: uid('doc'),
    companyId: ctx.companyId,
    name: input.name.trim(),
    category: input.category,
    fileName: input.fileName,
    sizeMb: input.sizeMb,
    uploadedAt: now(),
    uploadedBy: ctx.user.name,
    expiry: input.expiry || undefined,
    reminderDays: input.reminderDays,
    access: input.access,
    archived: false,
    forVerification: false,
    shares: [],
    versions: [{ version: 1, fileName: input.fileName, at: now(), by: ctx.user.name }],
  };
  return done(touch(ctx.store, ctx, `Uploaded "${doc.name}"`, 'document', { documents: [doc, ...ctx.store.documents] }), doc);
};

export const renameDocument = (ctx: SupplierCtx, id: string, name: string) =>
  name.trim() ? editDoc(ctx, id, (d) => ({ ...d, name: name.trim() }), (d) => `Renamed "${d.name}" to "${name.trim()}"`) : fail('Name cannot be empty.');

export const replaceDocument = (ctx: SupplierCtx, id: string, fileName: string, sizeMb: number, expiry?: string) =>
  editDoc(
    ctx,
    id,
    (d) => ({ ...d, fileName, sizeMb, expiry: expiry || d.expiry, uploadedAt: now(), uploadedBy: ctx.user.name, versions: [...d.versions, { version: d.versions.length + 1, fileName, at: now(), by: ctx.user.name }] }),
    (d) => `Uploaded a new version of "${d.name}"`,
  );

export const setDocumentArchived = (ctx: SupplierCtx, id: string, archived: boolean) =>
  editDoc(ctx, id, (d) => ({ ...d, archived }), (d) => `${archived ? 'Archived' : 'Restored'} "${d.name}"`);

export const updateDocumentSettings = (ctx: SupplierCtx, id: string, patch: Pick<CompanyDocument, 'expiry' | 'reminderDays' | 'access' | 'category'>) =>
  editDoc(ctx, id, (d) => ({ ...d, ...patch, expiry: patch.expiry || undefined }), (d) => `Updated settings for "${d.name}"`);

export const shareDocument = (ctx: SupplierCtx, id: string, companyName: string, days: number) =>
  companyName.trim()
    ? editDoc(
        ctx,
        id,
        (d) => ({ ...d, shares: [...d.shares, { id: uid('sh'), company: companyName.trim(), at: now(), until: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10), by: ctx.user.name }] }),
        (d) => `Shared "${d.name}" with ${companyName.trim()} for ${days} days`,
        'documents.share',
      )
    : fail('Choose a company to share with.');

export const revokeShare = (ctx: SupplierCtx, id: string, shareId: string) =>
  editDoc(ctx, id, (d) => ({ ...d, shares: d.shares.filter((s) => s.id !== shareId) }), (d) => `Revoked access to "${d.name}"`, 'documents.share');

export const submitVerification = (ctx: SupplierCtx, fileName: string, sizeMb: number): SupplierResult<CompanyRecord> => {
  const d = deny(ctx, 'profile.edit');
  if (d) return d;
  const c = company(ctx);
  if (!c.profile.licenseNo || !c.profile.licenseExpiry) return fail('Add your trade license number and expiry date first.');
  const docs = ctx.store.documents.filter((x) => !(x.companyId === ctx.companyId && x.forVerification && x.category === 'Trade Licenses'));
  const licenseDoc: CompanyDocument = {
    id: uid('doc'),
    companyId: ctx.companyId,
    name: 'Trade License (verification)',
    category: 'Trade Licenses',
    fileName,
    sizeMb,
    uploadedAt: now(),
    uploadedBy: ctx.user.name,
    expiry: c.profile.licenseExpiry,
    reminderDays: 30,
    access: 'admins',
    archived: false,
    forVerification: true,
    shares: [],
    versions: [{ version: 1, fileName, at: now(), by: ctx.user.name }],
  };
  const updated: CompanyRecord = { ...c, verification: { status: 'pending', licenseFile: fileName, submittedAt: now() } };
  const store = touch(ctx.store, ctx, 'Submitted trade license for SOKO verification', 'verification', {
    companies: ctx.store.companies.map((x) => (x.id === c.id ? updated : x)),
    documents: [licenseDoc, ...docs],
  });
  return done(store, updated);
};

export const simulateVerificationReview = (ctx: SupplierCtx, approve: boolean): SupplierResult<CompanyRecord> => {
  const c = company(ctx);
  if (c.verification.status !== 'pending') return fail('There is no pending verification to review.');
  const updated: CompanyRecord = {
    ...c,
    verification: { ...c.verification, status: approve ? 'verified' : 'rejected', reviewedAt: now(), note: approve ? undefined : 'License image unreadable – please upload a clearer copy.' },
  };
  return done(
    touch(ctx.store, ctx, `SOKO review (simulated): verification ${approve ? 'approved' : 'returned'}`, 'verification', { companies: ctx.store.companies.map((x) => (x.id === c.id ? updated : x)) }),
    updated,
  );
};

const teamGate = (ctx: SupplierCtx) => deny(ctx, 'team.manage');
const activeAdmins = (store: SupplierStore, companyId: string) => membersOf(store, companyId).filter((m) => (m.role === 'supplier_admin' || m.role === 'contractor_admin') && m.status === 'active');

export const inviteMember = (ctx: SupplierCtx, name: string, email: string, role: CompanyRole, title: string): SupplierResult<CompanyMembership> => {
  const g = teamGate(ctx);
  if (g) return g;
  if (!name.trim()) return fail('Enter the person\u2019s name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address.');
  const team = membersOf(ctx.store, ctx.companyId);
  if (team.some((m) => m.email.toLowerCase() === email.toLowerCase())) return fail('This person is already a member or has a pending invitation.');
  if (team.filter((m) => m.status !== 'pending_approval').length >= TIER_CONFIG[company(ctx).tier].teamSeats) return fail('All team seats on your plan are in use.');
  const m: CompanyMembership = { id: uid('mem'), companyId: ctx.companyId, userId: uid('inv'), name: name.trim(), email: email.trim(), title: title.trim(), role, status: 'invited', at: now() };
  return done(touch(ctx.store, ctx, `Invited ${m.name} as ${roleMeta(role).label}`, 'team', { memberships: [...ctx.store.memberships, m] }), m);
};

const editMember = (ctx: SupplierCtx, id: string, fn: (m: CompanyMembership) => CompanyMembership | null, action: (m: CompanyMembership) => string): SupplierResult => {
  const g = teamGate(ctx);
  if (g) return g;
  const m = ctx.store.memberships.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!m) return fail('Team member not found.');
  const next = fn(m);
  const memberships = next ? ctx.store.memberships.map((x) => (x.id === id ? next : x)) : ctx.store.memberships.filter((x) => x.id !== id);
  if (activeAdmins({ ...ctx.store, memberships }, ctx.companyId).length === 0) return fail('A company must keep at least one active Supplier Admin.');
  return done(touch(ctx.store, ctx, action(m), 'team', { memberships }), undefined);
};

export const changeMemberRole = (ctx: SupplierCtx, id: string, role: CompanyRole) =>
  editMember(ctx, id, (m) => ({ ...m, role }), (m) => `Changed ${m.name}'s role to ${roleMeta(role).label}`);

export const removeMember = (ctx: SupplierCtx, id: string) =>
  editMember(ctx, id, () => null, (m) => (m.status === 'invited' ? `Cancelled invitation for ${m.name}` : m.status === 'pending_approval' ? `Declined access request from ${m.name}` : `Removed ${m.name} from the team`));

export const approveRequest = (ctx: SupplierCtx, id: string) =>
  editMember(ctx, id, (m) => ({ ...m, status: 'active', at: now() }), (m) => `Approved access for ${m.name} as ${roleMeta(m.role).label}`);

export const simulateInviteAccepted = (ctx: SupplierCtx, id: string) =>
  editMember(ctx, id, (m) => ({ ...m, status: 'active', at: now() }), (m) => `${m.name} accepted the invitation (simulated)`);

export const respondToContact = (ctx: SupplierCtx, id: string, accept: boolean): SupplierResult => {
  const d = deny(ctx, 'contacts.manage');
  if (d) return d;
  const c = ctx.store.contacts.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!c) return fail('Request not found.');
  const contacts = accept ? ctx.store.contacts.map((x) => (x.id === id ? { ...x, kind: 'connection' as const, at: now() } : x)) : ctx.store.contacts.filter((x) => x.id !== id);
  return done(touch(ctx.store, ctx, `${accept ? 'Accepted' : 'Declined'} connection request from ${c.name}`, 'contact', { contacts }), undefined);
};

export const removeSavedContact = (ctx: SupplierCtx, id: string): SupplierResult => {
  const d = deny(ctx, 'contacts.manage');
  if (d) return d;
  const c = ctx.store.contacts.find((x) => x.id === id && x.companyId === ctx.companyId);
  if (!c) return fail('Contact not found.');
  return done(touch(ctx.store, ctx, `Removed saved contact ${c.name}`, 'contact', { contacts: ctx.store.contacts.filter((x) => x.id !== id) }), undefined);
};

export const addFollowUp = (ctx: SupplierCtx, visitId: string, note: string): SupplierResult => {
  const d = deny(ctx, 'visits.manage');
  if (d) return d;
  if (!note.trim()) return fail('Write a follow-up note first.');
  const company = companyById(ctx.store, ctx.companyId);
  const side: 'supplier' | 'contractor' = company?.kind === 'contractor' ? 'contractor' : 'supplier';
  return done(
    touch(ctx.store, ctx, 'Added a visit follow-up note', 'visit', { followUps: [{ visitId, companyId: ctx.companyId, side, note: note.trim(), at: now(), by: ctx.user.name }, ...ctx.store.followUps] }),
    undefined,
  );
};

export const setTier = (ctx: SupplierCtx, tier: SupplierTier): SupplierResult<CompanyRecord> => {
  const d = deny(ctx, 'plan.manage');
  if (d) return d;
  const updated = { ...company(ctx), tier };
  return done(touch(ctx.store, ctx, `Switched plan to ${TIER_CONFIG[tier].label} (simulated)`, 'plan', { companies: ctx.store.companies.map((x) => (x.id === updated.id ? updated : x)) }), updated);
};

export const setPreviewRole = (store: SupplierStore, companyId: string, role?: CompanyRole): SupplierStore => ({ ...store, previewRole: { ...store.previewRole, [companyId]: role } });

export interface RegistrationInput {
  profile: CompanyProfile;
  licenseFile?: { name: string; sizeMb: number };
}

export const nextSokoId = (store: SupplierStore) => {
  const max = store.companies.reduce((n, c) => Math.max(n, Number(c.sokoId.replace(/\D/g, '')) || 0), 10500);
  return `SK-${max + 1}`;
};

export const registerCompany = (store: SupplierStore, user: SessionUser, input: RegistrationInput): SupplierResult<CompanyRecord> => {
  const p = input.profile;
  if (!p.legalName.trim() || !p.tradingName.trim()) return fail('Legal and trading names are required.');
  if (!p.licenseNo.trim()) return fail('Trade license number is required.');
  if (!p.categories.length) return fail('Choose at least one trade category.');
  if (findDuplicateCompanies(store, p.tradingName, p.licenseNo).length) return fail('This company appears to already exist on SOKO. Request access instead.');
  const id = `sup_${p.tradingName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32)}_${Date.now().toString(36).slice(-4)}`;
  const company: CompanyRecord = {
    id,
    sokoId: nextSokoId(store),
    profile: p,
    kind: 'supplier',
    tier: 'free',
    demo: false,
    createdAt: now(),
    updatedAt: now(),
    verification: input.licenseFile ? { status: 'pending', licenseFile: input.licenseFile.name, submittedAt: now() } : { status: 'not_submitted' },
  };
  const membership: CompanyMembership = { id: uid('mem'), companyId: id, userId: user.id, name: user.name, email: user.email, title: user.title || 'Company Administrator', role: 'supplier_admin', status: 'active', at: now() };
  const documents: CompanyDocument[] = input.licenseFile
    ? [{
        id: uid('doc'), companyId: id, name: 'Trade License (verification)', category: 'Trade Licenses', fileName: input.licenseFile.name, sizeMb: input.licenseFile.sizeMb,
        uploadedAt: now(), uploadedBy: user.name, expiry: p.licenseExpiry || undefined, reminderDays: 30, access: 'admins', archived: false, forVerification: true, shares: [],
        versions: [{ version: 1, fileName: input.licenseFile.name, at: now(), by: user.name }],
      }]
    : [];
  const next: SupplierStore = {
    ...store,
    companies: [...store.companies, company],
    memberships: [...store.memberships, membership],
    documents: [...documents, ...store.documents],
    audit: [{ id: uid('aud'), companyId: id, at: now(), actor: user.name, action: `Registered ${p.tradingName} on SOKO`, kind: 'profile' as const }, ...store.audit],
  };
  return done(next, company);
};

export const requestAccess = (store: SupplierStore, user: SessionUser, companyId: string, role: CompanyRole, note: string): SupplierResult<CompanyMembership> => {
  if (store.memberships.some((m) => m.companyId === companyId && m.userId === user.id)) return fail('You already have a membership or pending request for this company.');
  const m: CompanyMembership = { id: uid('mem'), companyId, userId: user.id, name: user.name, email: user.email, title: user.title, role, status: 'pending_approval', at: now(), note: note.trim() || undefined };
  return done({ ...store, memberships: [...store.memberships, m] }, m);
};

export const leaveCompany = (store: SupplierStore, user: SessionUser, companyId: string): SupplierResult => {
  const mine = store.memberships.find((m) => m.companyId === companyId && m.userId === user.id);
  if (!mine) return fail('You are not a member of this company.');
  const remaining = store.memberships.filter((m) => m.id !== mine.id);
  if (mine.role === 'supplier_admin' && activeAdmins({ ...store, memberships: remaining }, companyId).length === 0) return fail('Assign another Supplier Admin before leaving this company.');
  return done(
    { ...store, memberships: remaining, audit: [{ id: uid('aud'), companyId, at: now(), actor: user.name, action: `${user.name} left the company workspace`, kind: 'team' as const }, ...store.audit] },
    undefined,
  );
};
