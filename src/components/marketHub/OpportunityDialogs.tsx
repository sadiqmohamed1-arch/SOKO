import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, Check, Lock, Mail, Paperclip, Phone, User } from 'lucide-react';
import { EMIRATES, OPPORTUNITY_TYPES, TRADE_CATEGORIES, URGENCY_LABEL, opportunityTypeLabel, subcategoriesOf } from '../../data/marketHubCatalog';
import { OpportunityInput, closeOpportunity, expressInterest, postOpportunity, requestOpportunityConnection, reviewInterest, toggleSaveOpportunity } from '../../data/marketHubService';
import { InterestStatus, OpportunityView } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { StatusPill, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { Field, Hub, INTEREST_LABEL, UrgencyPill, daysAgo, fmtDate, fmtMonth, opportunityStatus } from './MarketHubShared';

const STEPS: { id: InterestStatus; label: string }[] = [
  { id: 'interested', label: 'Interested' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'connection_requested', label: 'Connection Requested' },
  { id: 'connected', label: 'Connected' },
];

export const WorkflowSteps: React.FC<{ status: InterestStatus }> = ({ status }) => {
  const idx = STEPS.findIndex((s) => s.id === status);
  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex-1 min-w-0">
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <p className={`mt-1 text-[10px] font-semibold truncate ${i <= idx ? 'text-blue-800' : 'text-slate-400'}`}>{s.label}</p>
        </li>
      ))}
    </ol>
  );
};

export const ExpressInterestDialog: React.FC<{ hub: Hub; o: OpportunityView; onClose: () => void }> = ({ hub, o, onClose }) => {
  const [message, setMessage] = useState('');
  const submit = () => {
    const result = expressInterest(hub.store, hub.actor, o.id, message);
    if (hub.run(result, 'Interest sent. The publisher will review it on SOKO.')) {
      const opp = hub.store.opportunities.find((x) => x.id === o.id);
      const responderName = hub.actor.workspace.companyName ?? hub.actor.workspace.personName;
      if (opp) hub.onInterestExpressed?.(o.id, o.title, opp.publisherWorkspaceId, responderName);
      onClose();
    }
  };
  return (
    <ProfileDialog
      title="Express Interest"
      subtitle={o.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={btnPrimary}>
            Send Interest
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className={labelCls} htmlFor="interest-msg">
            Short message (optional)
          </label>
          <textarea
            id="interest-msg"
            rows={3}
            className={`${inputCls} py-2`}
            placeholder="E.g. We can supply this from stock in Dubai within 2 weeks."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          The publisher sees your company name and message. {o.isConfidential ? 'Their identity stays confidential until they approve a connection.' : 'Contact details are exchanged once a connection is approved.'}
        </p>
      </div>
    </ProfileDialog>
  );
};

export const OpportunityDetailDialog: React.FC<{ hub: Hub; o: OpportunityView; onClose: () => void; onInterest: () => void }> = ({ hub, o, onClose, onInterest }) => {
  const status = opportunityStatus(o);
  const save = () => hub.run(toggleSaveOpportunity(hub.store, hub.actor, o.id), (saved) => (saved ? 'Saved to My Activity' : 'Removed from saved'));
  const canRequest = o.myInterest && ['interested', 'under_review'].includes(o.myInterest.status) && o.status === 'open';
  return (
    <ProfileDialog
      title={o.title}
      subtitle={`${opportunityTypeLabel(o.type)} · Posted ${daysAgo(o.postedAt)}`}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={save} className={btnGhost}>
            {o.saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
            {o.saved ? 'Saved' : 'Save'}
          </button>
          {o.isMine && o.status === 'open' && (
            <button type="button" onClick={() => hub.run(closeOpportunity(hub.store, hub.actor, o.id), 'Opportunity closed')} className={btnSecondary}>
              Close Opportunity
            </button>
          )}
          {canRequest && (
            <button type="button" onClick={() => hub.run(requestOpportunityConnection(hub.store, hub.actor, o.id), 'Connection requested. The publisher will be asked to approve.')} className={btnSecondary}>
              Request Connection
            </button>
          )}
          {!o.isMine && !o.myInterest && o.status === 'open' && (
            <button type="button" onClick={onInterest} className={btnPrimary}>
              Express Interest
            </button>
          )}
        </div>
      }
    >
      <div className="px-5 py-4 space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <UrgencyPill urgency={o.urgency} />
          {o.isConfidential && <StatusPill tone="slate">Confidential buyer</StatusPill>}
        </div>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{o.description}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Opportunity type" value={opportunityTypeLabel(o.type)} />
          <Field label="Trade category" value={o.category} />
          <Field label="Subcategory" value={o.subcategory} />
          <Field label="Location" value={o.location} />
          <Field label="Quantity / scope" value={o.scope} />
          <Field label="Urgency" value={URGENCY_LABEL[o.urgency]} />
          <Field label="Required" value={fmtMonth(o.requiredBy)} />
          <Field label="Response deadline" value={fmtDate(o.responseDeadline)} />
          <Field label="Interested" value={`${o.interestedCount} companies`} />
          <Field label="Project" value={o.projectName} />
        </dl>
        {o.attachmentName && (
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Paperclip className="w-4 h-4 text-slate-400" />
            {o.attachmentName} <span className="text-xs text-slate-400">(prototype attachment)</span>
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Published by</h3>
          <p className="mt-1 text-sm font-semibold text-slate-900">{o.publisherDisplay}</p>
          {o.contact ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                {o.contact.name}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {o.contact.email}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                {o.contact.phone}
              </li>
            </ul>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {o.isConfidential
                ? 'Company, contact person, email, phone and project identity stay hidden until the buyer approves your connection.'
                : 'Contact details are shared once the publisher approves your connection.'}
            </p>
          )}
        </section>

        {o.myInterest && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Your response</h3>
            {o.myInterest.status === 'declined' ? <p className="text-sm text-slate-600">The publisher did not progress this interest.</p> : <WorkflowSteps status={o.myInterest.status} />}
          </section>
        )}

        {o.isMine && <InterestReview hub={hub} o={o} />}
      </div>
    </ProfileDialog>
  );
};

export const InterestReview: React.FC<{ hub: Hub; o: OpportunityView }> = ({ hub, o }) => {
  const list = o.interests ?? [];
  const act = (id: string, action: 'review' | 'approve' | 'decline', msg: string) => hub.run(reviewInterest(hub.store, hub.actor, o.id, id, action), msg);
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Interest received ({list.length})</h3>
      {!list.length && <p className="text-sm text-slate-500">No companies have expressed interest yet.</p>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {list.map((i) => (
          <li key={i.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{i.companyName}</p>
              {i.message && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{i.message}</p>}
              <p className="text-[11px] text-slate-400 mt-0.5">{daysAgo(i.at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={INTEREST_LABEL[i.status].tone}>{INTEREST_LABEL[i.status].label}</StatusPill>
              {i.status === 'interested' && (
                <button type="button" onClick={() => act(i.id, 'review', 'Marked as under review')} className={`${btnSecondary} !min-h-8 !px-2.5 text-xs`}>
                  Review
                </button>
              )}
              {i.status !== 'connected' && i.status !== 'declined' && (
                <>
                  <button type="button" onClick={() => act(i.id, 'approve', `Connected with ${i.companyName}. Your contact details are now shared with them.`)} className={`${btnPrimary} !min-h-8 !px-2.5 text-xs`}>
                    <Check className="w-3.5 h-3.5" />
                    Approve connection
                  </button>
                  <button type="button" onClick={() => act(i.id, 'decline', 'Interest not progressed')} className={`${btnGhost} !min-h-8 !px-2 text-xs`}>
                    Decline
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const EMPTY_POST: OpportunityInput = {
  title: '',
  type: 'material',
  category: '',
  subcategory: '',
  location: 'Dubai',
  description: '',
  scope: '',
  requiredBy: '',
  responseDeadline: '',
  urgency: 'standard',
  attachmentName: '',
  identity: 'public',
  contactVisibility: 'on_connection',
};

export const PostOpportunityDialog: React.FC<{ hub: Hub; onClose: () => void; onPosted: (id: string) => void }> = ({ hub, onClose, onPosted }) => {
  const [f, setF] = useState<OpportunityInput>(EMPTY_POST);
  const set = <K extends keyof OpportunityInput>(k: K, v: OpportunityInput[K]) => setF((p) => ({ ...p, [k]: v, ...(k === 'category' ? { subcategory: '' } : {}) }));
  const publisher = hub.actor.workspace.companyName ?? hub.actor.workspace.personName;
  const publish = () => {
    const result = postOpportunity(hub.store, hub.actor, { ...f, attachmentName: f.attachmentName || undefined, scope: f.scope || undefined });
    if (hub.run(result, 'Opportunity published to Market Hub') && result.ok) onPosted(result.value);
  };
  return (
    <ProfileDialog
      title="Post Opportunity"
      subtitle="Free for all SOKO members. Keep it short — interested companies will contact you through SOKO."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={publish} className={btnPrimary}>
            Publish
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="po-title">
            Opportunity title
          </label>
          <input id="po-title" className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="E.g. Waterproofing membrane for podium slab" />
        </div>
        <div>
          <label className={labelCls} htmlFor="po-type">
            Opportunity type
          </label>
          <select id="po-type" className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value as OpportunityInput['type'])}>
            {OPPORTUNITY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="po-urgency">
            Urgency
          </label>
          <select id="po-urgency" className={inputCls} value={f.urgency} onChange={(e) => set('urgency', e.target.value as OpportunityInput['urgency'])}>
            {Object.entries(URGENCY_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="po-cat">
            Category
          </label>
          <select id="po-cat" className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Select a trade category</option>
            {TRADE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="po-sub">
            Subcategory
          </label>
          <select id="po-sub" className={inputCls} value={f.subcategory} disabled={!f.category} onChange={(e) => set('subcategory', e.target.value)}>
            <option value="">Optional</option>
            {f.category && subcategoriesOf(f.category).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="po-loc">
            Location
          </label>
          <select id="po-loc" className={inputCls} value={f.location} onChange={(e) => set('location', e.target.value)}>
            {EMIRATES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="po-scope">
            Quantity / approximate scope
          </label>
          <input id="po-scope" className={inputCls} value={f.scope} onChange={(e) => set('scope', e.target.value)} placeholder="E.g. Approx. 18,000 m²" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="po-desc">
            Description
          </label>
          <textarea id="po-desc" rows={3} className={`${inputCls} py-2`} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What do you need, and any key specification?" />
        </div>
        <div>
          <label className={labelCls} htmlFor="po-req">
            Required date
          </label>
          <input id="po-req" type="date" className={inputCls} value={f.requiredBy} onChange={(e) => set('requiredBy', e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="po-dead">
            Response deadline
          </label>
          <input id="po-dead" type="date" className={inputCls} value={f.responseDeadline} onChange={(e) => set('responseDeadline', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="po-file">
            Optional attachment
          </label>
          <input
            id="po-file"
            type="file"
            className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold hover:file:bg-slate-200 file:cursor-pointer"
            onChange={(e) => set('attachmentName', e.target.files?.[0]?.name ?? '')}
          />
          <p className="mt-1 text-[11px] text-slate-400">Prototype: only the file name is kept; the file is not uploaded.</p>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={labelCls}>Contact visibility</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['public', `Show company name`, `Posted as ${publisher}. Contact details shared after you approve a connection.`],
                ['confidential', 'Anonymous / Confidential Buyer', 'Company, name, email, phone and project stay hidden until you approve a connection.'],
              ] as const
            ).map(([id, label, hint]) => (
              <label
                key={id}
                className={`flex gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${f.identity === id ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <input type="radio" name="identity" className="mt-0.5 accent-blue-700" checked={f.identity === id} onChange={() => set('identity', id)} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </ProfileDialog>
  );
};
