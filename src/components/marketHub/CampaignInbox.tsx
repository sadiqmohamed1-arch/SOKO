import React, { useMemo, useState } from 'react';
import { BellOff, Bookmark, BookmarkCheck, Building2, CalendarDays, Check, Flag, Inbox, MapPin, Paperclip, Send, X } from 'lucide-react';
import { ResponseInput, inboxFor, muteSender, mutedSenderNames, myResponse, promoPrefs, recordRecipientEvent, setPromoOptIn, submitCampaignResponse, unmuteAll } from '../../data/marketHubService';
import { InboxItem, ResponseAvailability } from '../../data/marketHubTypes';
import { ProfileDialog } from '../ProfileDialog';
import { StatusPill, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls } from '../NetworkShared';
import { EmptyState, Field, Hub, SubTabs, daysAgo, fmtDate } from './MarketHubShared';

type InboxTab = 'all' | 'sourcing' | 'offers' | 'interested' | 'saved';

const small = '!min-h-8 !px-2.5 text-xs';

export const CampaignCard: React.FC<{ item: InboxItem; preview?: boolean; actions?: React.ReactNode }> = ({ item, preview, actions }) => (
  <article className={`rounded-xl border bg-white p-4 ${item.viewed || preview ? 'border-slate-200' : 'border-blue-200 border-l-4 border-l-blue-600'}`}>
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`text-[11px] font-semibold uppercase tracking-wide ${item.kind === 'sourcing' ? 'text-blue-700' : 'text-gold-700'}`}>{item.typeLabel}</span>
      {!item.viewed && !preview && <StatusPill tone="blue">New</StatusPill>}
      {item.responded && <StatusPill tone="blue">Responded</StatusPill>}
      {item.interested && !item.responded && <StatusPill tone="blue">Interested</StatusPill>}
      {item.declined && <StatusPill tone="slate">Declined</StatusPill>}
    </div>
    <h3 className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug">{item.title}</h3>
    <p className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="inline-flex items-center gap-1">
        <Building2 className="w-3.5 h-3.5" />
        {item.senderDisplay}
      </span>
      <span>
        {item.category}
        {item.subcategory && ` · ${item.subcategory}`}
      </span>
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" />
        {item.location}
      </span>
    </p>
    {item.summary && <p className="mt-2 text-sm text-slate-700 line-clamp-2">{item.summary}</p>}
    <p className="mt-2 text-[11px] text-slate-500 inline-flex items-center gap-1">
      <CalendarDays className="w-3.5 h-3.5" />
      {preview ? 'Sent on launch' : daysAgo(item.date)} · {item.kind === 'sourcing' ? 'Respond by' : 'Offer valid until'} {fmtDate(item.expiry)}
    </p>
    {actions && <div className="mt-3 flex flex-wrap items-center gap-1.5">{actions}</div>}
  </article>
);

const AVAILABILITY: { id: ResponseAvailability; label: string }[] = [
  { id: 'available', label: 'Available from stock' },
  { id: 'on_order', label: 'Available on order' },
  { id: 'partial', label: 'Partial quantity available' },
  { id: 'alternative', label: 'Alternative product offered' },
];

const ResponseDialog: React.FC<{ hub: Hub; item: InboxItem; onClose: () => void }> = ({ hub, item, onClose }) => {
  const [f, setF] = useState<ResponseInput>({ message: '', availability: 'available', leadTime: '', quotationName: '', techDocName: '' });
  const submit = () =>
    hub.run(
      submitCampaignResponse(hub.store, hub.actor, item.id, { ...f, quotationName: f.quotationName || undefined, techDocName: f.techDocName || undefined }),
      `Response sent to ${item.senderDisplay}`
    ) && onClose();
  const fileCls =
    'block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold hover:file:bg-slate-200 file:cursor-pointer';
  return (
    <ProfileDialog
      title="Submit Response"
      subtitle={item.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={submit} className={btnPrimary}>
            <Send className="w-4 h-4" />
            Send Response
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className={labelCls} htmlFor="r-msg">
            Short message
          </label>
          <textarea id="r-msg" rows={3} className={`${inputCls} py-2`} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Product, brand and any key note for the buyer." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="r-av">
              Product / service availability
            </label>
            <select id="r-av" className={inputCls} value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value as ResponseAvailability })}>
              {AVAILABILITY.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="r-lead">
              Approximate lead time
            </label>
            <input id="r-lead" className={inputCls} value={f.leadTime} onChange={(e) => setF({ ...f, leadTime: e.target.value })} placeholder="E.g. 7–10 days" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="r-q">
            Quotation (optional)
          </label>
          <input id="r-q" type="file" className={fileCls} onChange={(e) => setF({ ...f, quotationName: e.target.files?.[0]?.name ?? '' })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="r-t">
            Technical document (optional)
          </label>
          <input id="r-t" type="file" className={fileCls} onChange={(e) => setF({ ...f, techDocName: e.target.files?.[0]?.name ?? '' })} />
          <p className="mt-1 text-[11px] text-slate-400">Prototype: only file names are kept; files are not uploaded.</p>
        </div>
      </div>
    </ProfileDialog>
  );
};

const InterestDialog: React.FC<{ hub: Hub; item: InboxItem; onClose: () => void }> = ({ hub, item, onClose }) => {
  const [share, setShare] = useState(true);
  const confirm = () => hub.run(recordRecipientEvent(hub.store, hub.actor, item.id, 'interested', { shareIdentity: share }), 'Marked as interested') && onClose();
  return (
    <ProfileDialog
      title="Mark as Interested"
      subtitle={item.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={confirm} className={btnPrimary}>
            Confirm
          </button>
        </div>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" className="mt-0.5 accent-blue-700" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span className="text-sm text-slate-700">
            Share my company name with <span className="font-semibold">{item.senderDisplay}</span>
            <span className="block text-xs text-slate-500 mt-0.5">If unticked, the sender only sees an anonymous count. Your email and phone are never shared from a campaign.</span>
          </span>
        </label>
      </div>
    </ProfileDialog>
  );
};

const REPORT_REASONS = ['Not relevant to my business', 'Spam or repeated campaign', 'Misleading offer', 'Other'];

const ReportDialog: React.FC<{ hub: Hub; item: InboxItem; onClose: () => void }> = ({ hub, item, onClose }) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const submit = () => hub.run(recordRecipientEvent(hub.store, hub.actor, item.id, 'report', { reason }), 'Report sent to the SOKO moderation team') && onClose();
  return (
    <ProfileDialog
      title="Report Irrelevant Campaign"
      subtitle={item.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={submit} className="inline-flex items-center justify-center min-h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer">
            Send Report
          </button>
        </div>
      }
    >
      <fieldset className="px-5 py-4 space-y-2">
        <legend className="sr-only">Reason</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="radio" name="reason" className="accent-blue-700" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
        <p className="pt-2 text-xs text-slate-500">SOKO reviews reported campaigns and can suspend senders. The sender is not told who reported.</p>
      </fieldset>
    </ProfileDialog>
  );
};

const DetailDialog: React.FC<{ hub: Hub; item: InboxItem; onClose: () => void; actions: React.ReactNode }> = ({ hub, item, onClose, actions }) => {
  const r = myResponse(hub.store, hub.actor, item.id);
  return (
    <ProfileDialog title={item.title} subtitle={`${item.typeLabel} · from ${item.senderDisplay}`} size="lg" onClose={onClose} footer={<div className="flex flex-wrap justify-end gap-2">{actions}</div>}>
      <div className="px-5 py-4 space-y-4">
        {item.offerHighlight && <p className="rounded-xl bg-gold-50 border border-gold-200 px-4 py-3 text-sm font-semibold text-gold-900">{item.offerHighlight}</p>}
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.description}</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Category" value={item.category} />
          <Field label="Subcategory" value={item.subcategory} />
          <Field label={item.kind === 'sourcing' ? 'Delivery location' : 'Location'} value={item.location} />
          <Field label="Quantity" value={item.quantity && `${item.quantity} ${item.unit ?? ''}`} />
          <Field label="Required" value={item.requiredDate && fmtDate(item.requiredDate)} />
          <Field label={item.kind === 'sourcing' ? 'Response deadline' : 'Valid until'} value={fmtDate(item.expiry)} />
        </dl>
        {item.attachmentName && (
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Paperclip className="w-4 h-4 text-slate-400" />
            {item.attachmentName} <span className="text-xs text-slate-400">(prototype attachment)</span>
          </p>
        )}
        {r && (
          <p className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
            You responded {daysAgo(r.at).toLowerCase()} · Status: {r.status}
          </p>
        )}
        <p className="text-[11px] text-slate-400">Delivered through SOKO's Campaign Inbox. The sender cannot see your contact details or export the recipient list.</p>
      </div>
    </ProfileDialog>
  );
};

export const CampaignInbox: React.FC<{ hub: Hub }> = ({ hub }) => {
  const [tab, setTab] = useState<InboxTab>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: 'respond' | 'interest' | 'report'; id: string } | null>(null);
  const items = useMemo(() => inboxFor(hub.store, hub.actor), [hub.store, hub.actor]);
  const prefs = promoPrefs(hub.store, hub.actor);
  const muted = mutedSenderNames(hub.store, hub.actor);
  const byId = (id: string | null) => items.find((i) => i.id === id);

  const shown = items.filter((i) =>
    tab === 'sourcing' ? i.kind === 'sourcing' : tab === 'offers' ? i.kind === 'promotion' : tab === 'interested' ? i.interested || i.responded : tab === 'saved' ? i.saved : true
  );

  const event = (i: InboxItem, type: 'view' | 'click' | 'declined' | 'saved', msg?: string) => hub.run(recordRecipientEvent(hub.store, hub.actor, i.id, type), msg);
  const view = (i: InboxItem) => {
    if (!i.viewed) event(i, 'view');
    setOpen(i.id);
  };
  const viewSupplier = (i: InboxItem) => {
    event(i, 'click');
    if (i.senderSupplierId) hub.openSupplier(i.senderSupplierId);
    else hub.notify('This supplier does not have a public directory profile yet.');
  };

  const actionsFor = (i: InboxItem, inDialog = false) => {
    const btn = inDialog ? '' : small;
    const save = (
      <button type="button" onClick={() => event(i, 'saved', i.saved ? 'Removed from saved' : 'Saved')} className={`${btnGhost} ${btn}`}>
        {i.saved ? <BookmarkCheck className="w-4 h-4 text-blue-700" /> : <Bookmark className="w-4 h-4" />}
        {i.saved ? 'Saved' : 'Save'}
      </button>
    );
    const interested = !i.interested && !i.declined && !i.responded && (
      <button type="button" onClick={() => setDialog({ type: 'interest', id: i.id })} className={`${btnSecondary} ${btn}`}>
        <Check className="w-4 h-4" />
        Interested
      </button>
    );
    if (i.kind === 'sourcing')
      return (
        <>
          {!inDialog && (
            <button type="button" onClick={() => view(i)} className={`${btnSecondary} ${btn}`}>
              View Requirement
            </button>
          )}
          {interested}
          {!i.responded && !i.declined && (
            <button type="button" onClick={() => setDialog({ type: 'respond', id: i.id })} className={`${btnPrimary} ${btn}`}>
              Submit Response
            </button>
          )}
          {!i.responded && !i.declined && (
            <button type="button" onClick={() => event(i, 'declined', 'Declined. The sender only sees this in aggregate.')} className={`${btnGhost} ${btn}`}>
              <X className="w-4 h-4" />
              Decline
            </button>
          )}
          {save}
        </>
      );
    return (
      <>
        {!inDialog && (
          <button type="button" onClick={() => view(i)} className={`${btnSecondary} ${btn}`}>
            View Offer
          </button>
        )}
        <button type="button" onClick={() => viewSupplier(i)} className={`${btnSecondary} ${btn}`}>
          View Supplier
        </button>
        {interested}
        {save}
      </>
    );
  };

  const secondary = (i: InboxItem) => (
    <span className="ml-auto flex items-center gap-1">
      {i.kind === 'promotion' && (
        <button
          type="button"
          onClick={() => hub.run(muteSender(hub.store, hub.actor, i.id), (name) => `${name} muted. You will no longer receive their offers.`)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
        >
          <BellOff className="w-3.5 h-3.5" />
          Mute Supplier
        </button>
      )}
      {!i.reported ? (
        <button
          type="button"
          onClick={() => setDialog({ type: 'report', id: i.id })}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" />
          Report
        </button>
      ) : (
        <span className="text-[11px] text-slate-400 px-2">Reported</span>
      )}
    </span>
  );

  const openItem = byId(open);
  const dialogItem = dialog && byId(dialog.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SubTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All Campaigns', count: items.length },
            { id: 'sourcing', label: 'Sourcing Requirements', count: items.filter((i) => i.kind === 'sourcing').length },
            { id: 'offers', label: 'Supplier Offers', count: items.filter((i) => i.kind === 'promotion').length },
            { id: 'interested', label: 'Interested', count: items.filter((i) => i.interested || i.responded).length },
            { id: 'saved', label: 'Saved', count: items.filter((i) => i.saved).length },
          ]}
        />
      </div>

      {prefs && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
          <span>
            Supplier promotions: <span className={`font-semibold ${prefs.promoOptIn ? 'text-emerald-700' : 'text-slate-900'}`}>{prefs.promoOptIn ? 'On' : 'Off'}</span>
            <span className="text-slate-400"> · based on your followed categories ({[...new Set([...prefs.followedCategories, ...prefs.interestedCategories])].join(', ')})</span>
          </span>
          <button
            type="button"
            onClick={() => hub.run(setPromoOptIn(hub.store, hub.actor, !prefs.promoOptIn), prefs.promoOptIn ? 'Unsubscribed from supplier promotions' : 'Supplier promotions turned on')}
            className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            {prefs.promoOptIn ? 'Unsubscribe from Promotions' : 'Turn on promotions'}
          </button>
          {muted.length > 0 && (
            <span>
              Muted: {muted.join(', ')}{' '}
              <button type="button" onClick={() => hub.run(unmuteAll(hub.store, hub.actor), 'All suppliers unmuted')} className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
                Unmute all
              </button>
            </span>
          )}
        </div>
      )}

      {shown.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {shown.map((i) => (
            <CampaignCard
              key={i.id}
              item={i}
              actions={
                <>
                  {actionsFor(i)}
                  {secondary(i)}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title={items.length ? 'Nothing in this view' : 'Your Campaign Inbox is empty'}
          text={
            items.length
              ? 'Try another tab.'
              : 'Relevant sourcing requirements and supplier offers reach you here, based on your company profile and preferences. Campaigns never appear in the SOKO Home Feed.'
          }
        />
      )}

      <p className="text-[11px] text-slate-400">Campaign Inbox is separate from your personal messages. Prototype: campaigns are delivered inside SOKO only — no emails or texts are sent.</p>

      {openItem && <DetailDialog hub={hub} item={openItem} onClose={() => setOpen(null)} actions={actionsFor(openItem, true)} />}
      {dialogItem && dialog.type === 'respond' && <ResponseDialog hub={hub} item={dialogItem} onClose={() => setDialog(null)} />}
      {dialogItem && dialog.type === 'interest' && <InterestDialog hub={hub} item={dialogItem} onClose={() => setDialog(null)} />}
      {dialogItem && dialog.type === 'report' && <ReportDialog hub={hub} item={dialogItem} onClose={() => setDialog(null)} />}
    </div>
  );
};
