import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Info, QrCode, ScanLine, Search, Share2, SlidersHorizontal, UserPlus, X } from 'lucide-react';
import { CommunityContact, UserProfile } from '../types';
import {
  EMPTY_NETWORK_FILTERS,
  MY_CARD_KEY,
  MyCardSettings,
  NETWORK_SEARCH_EXAMPLES,
  NetworkFilters,
  NetworkTab,
  activeFilterCount,
  applyConnection,
  cardIdFromUrl,
  clearCardParam,
  defaultCardSettings,
  isRecentlyAdded,
  markContacted,
  myCardView,
  myPersonalSokoId,
  personalSokoId,
  saveContact,
  unsaveContact,
  updateContact,
} from '../data/myNetwork';
import { downloadVCard } from '../data/networkImport';
import { BUYER_SUPPLIERS, BuyerSupplier } from '../data/buyerSuppliers';
import { BuyerSupplierProfile, ProfileTab } from './BuyerSupplierProfile';
import { ContactSupplierModal } from './ContactSupplierModal';
import { ProfileDialog } from './ProfileDialog';
import { ConfirmDialog, NetworkHandlers, ProfessionalCard, Toast, btnPrimary, btnSecondary } from './NetworkShared';
import { ScanCardDialog, ShareCardDialog, ShareContactDialog } from './NetworkDialogs';
import { NetworkContactForm } from './NetworkContactForm';
import { NetworkImportDialog } from './NetworkImportDialog';
import { NetworkContactProfile } from './NetworkContactProfile';
import { NetworkContactsTab, NetworkFiltersPanel } from './NetworkContactsTab';
import { NetworkConnectionsTab } from './NetworkConnectionsTab';
import { NetworkCompaniesTab, networkCompanies } from './NetworkCompaniesTab';
import { NetworkCardsTab } from './NetworkCardsTab';

const SAVED_SUPPLIERS_KEY = 'soko_buyer_saved_suppliers_v1';

const readJson = <T,>(key: string, fallback: T, valid: (v: unknown) => boolean): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

const isCardSettings = (v: unknown) => !!v && typeof v === 'object' && 'visibility' in v && typeof (v as MyCardSettings).visibility === 'object';

interface BuyerNetworkViewProps {
  contacts: CommunityContact[];
  onUpdateContacts: (next: CommunityContact[]) => void;
  currentUser: UserProfile;
  onUpdateUser: (patch: Partial<UserProfile>) => void;
  onStartMessageWith: (userId: string, name: string) => void;
  initialTab: NetworkTab;
}

type Confirm = { title: string; message: string; label: string; run: () => void };

const TABS: { id: NetworkTab; label: string }[] = [
  { id: 'contacts', label: 'My Contacts' },
  { id: 'connections', label: 'My Connections' },
  { id: 'companies', label: 'Companies' },
  { id: 'cards', label: 'Digital Business Cards' },
];

export const BuyerNetworkView: React.FC<BuyerNetworkViewProps> = ({ contacts, onUpdateContacts, currentUser, onUpdateUser, onStartMessageWith, initialTab }) => {
  const [tab, setTab] = useState<NetworkTab>(initialTab);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<NetworkFilters>(EMPTY_NETWORK_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ editingId?: string } | null>(null);
  const [shareContactId, setShareContactId] = useState<string | null>(null);
  const [shareMine, setShareMine] = useState(false);
  const [scan, setScan] = useState<{ ref?: string } | null>(null);
  const [publicPreview, setPublicPreview] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [supplier, setSupplier] = useState<{ id: string; tab: ProfileTab } | null>(null);
  const [contactFor, setContactFor] = useState<BuyerSupplier | null>(null);
  const [savedSupplierIds, setSavedSupplierIds] = useState<string[]>(() =>
    readJson(SAVED_SUPPLIERS_KEY, [], (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'))
  );
  const [cardSettings, setCardSettings] = useState<MyCardSettings>(() => readJson(MY_CARD_KEY, defaultCardSettings(currentUser), isCardSettings));
  const [toast, setToast] = useState<string | null>(null);
  const myId = myPersonalSokoId(currentUser);

  useEffect(() => localStorage.setItem(SAVED_SUPPLIERS_KEY, JSON.stringify(savedSupplierIds)), [savedSupplierIds]);
  useEffect(() => localStorage.setItem(MY_CARD_KEY, JSON.stringify(cardSettings)), [cardSettings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [openId, supplier?.id]);

  useEffect(() => {
    const ref = cardIdFromUrl();
    if (!ref) return;
    if (ref.toUpperCase() === myId) setPublicPreview(true);
    else setScan({ ref });
  }, [myId]);

  const counts = useMemo(
    () => ({
      contacts: contacts.filter((c) => c.isMaintained).length,
      connections: contacts.filter((c) => c.connectionStatus === 'connected').length,
      requests: contacts.filter((c) => c.connectionStatus === 'incoming').length,
      companies: networkCompanies(contacts).length,
      recent: contacts.filter((c) => c.isMaintained && isRecentlyAdded(c)).length,
    }),
    [contacts]
  );

  const byId = (id: string | null) => (id ? contacts.find((c) => c.id === id) : undefined);

  const openSupplier = (id: string) => {
    setScan(null);
    clearCardParam();
    setOpenId(null);
    setSupplier({ id, tab: 'overview' });
  };

  const toggleSaveSupplier = (s: BuyerSupplier) => {
    const saved = savedSupplierIds.includes(s.id);
    setSavedSupplierIds((prev) => (saved ? prev.filter((x) => x !== s.id) : [...prev, s.id]));
    setToast(saved ? `${s.name} removed from saved suppliers` : `${s.name} saved to your suppliers`);
  };

  const handlers: NetworkHandlers = {
    onOpen: (c) => {
      setScan(null);
      clearCardParam();
      setOpenId(c.id);
    },
    onToggleSave: (c) => {
      if (!c.isMaintained) {
        onUpdateContacts(saveContact(contacts, c));
        setToast(`${c.name} saved to My Contacts`);
        return;
      }
      setConfirm({
        title: 'Remove from My Contacts?',
        message: `${c.name} will be removed from your saved contacts and your private notes about them will be deleted.${c.connectionStatus === 'connected' ? ' You will stay connected on SOKO.' : ''}`,
        label: 'Remove',
        run: () => {
          const next = unsaveContact(contacts, c.id);
          onUpdateContacts(next);
          if (!next.some((x) => x.id === c.id)) setOpenId(null);
          setToast(`${c.name} removed from My Contacts`);
        },
      });
    },
    onToggleFavorite: (c) => {
      if (!c.isMaintained) return;
      onUpdateContacts(updateContact(contacts, c.id, { favorite: !c.favorite }));
      setToast(c.favorite ? 'Removed from favorites' : 'Added to favorites');
    },
    onShare: (c) => setShareContactId(c.id),
    onContacted: (c) => onUpdateContacts(markContacted(contacts, c.id)),
    onConnection: (c, action) => {
      const run = () => {
        onUpdateContacts(applyConnection(contacts, c.id, action));
        const msg = {
          connect: `Connection request sent to ${c.name}`,
          accept: `You are now connected with ${c.name}`,
          decline: 'Request declined',
          withdraw: 'Request withdrawn',
          remove: `Connection with ${c.name} removed`,
        }[action];
        setToast(msg);
      };
      if (action === 'remove') {
        setConfirm({
          title: 'Remove connection?',
          message: `You and ${c.name} will no longer be connected. ${c.isMaintained ? 'They stay in My Contacts.' : ''}`,
          label: 'Remove Connection',
          run,
        });
      } else run();
    },
    onMessage: (c) => onStartMessageWith(c.id, c.name),
    onOpenCompany: openSupplier,
  };

  const switchTab = (t: NetworkTab, f: NetworkFilters = filters) => {
    setTab(t);
    setFilters(f);
    if (activeFilterCount(f)) setFiltersOpen(true);
  };

  const myPublicCard = myCardView(currentUser, cardSettings, 'public');
  const shareContact = byId(shareContactId);
  const dialogs = (
    <>
      {form && (
        <NetworkContactForm
          contacts={contacts}
          editing={byId(form.editingId ?? null)}
          onClose={() => setForm(null)}
          onSubmit={(next, msg, id) => {
            onUpdateContacts(next);
            setForm(null);
            setToast(msg);
            if (id) setOpenId(id);
          }}
          onViewExisting={(c) => {
            setForm(null);
            setOpenId(c.id);
          }}
        />
      )}
      {shareContact && <ShareContactDialog contact={shareContact} onClose={() => setShareContactId(null)} onNotify={setToast} />}
      {shareMine && (
        <ShareCardDialog
          card={myPublicCard}
          title="Share My Card"
          note="Shows only the details you set to Public."
          onClose={() => setShareMine(false)}
          onNotify={setToast}
        />
      )}
      {scan && (
        <ScanCardDialog
          key={scan.ref ?? 'manual'}
          contacts={contacts}
          myId={myId}
          initialRef={scan.ref}
          onClose={() => {
            setScan(null);
            clearCardParam();
          }}
          onSave={(c) => {
            onUpdateContacts(saveContact(contacts, c));
            setToast(`${c.name} saved to My Contacts`);
          }}
          onConnect={(c) => handlers.onConnection(c, 'connect')}
          onOpenProfile={handlers.onOpen}
          onOpenCompany={openSupplier}
          onShare={(c) => setShareContactId(c.id)}
          onShowMyCard={() => {
            setScan(null);
            clearCardParam();
            setOpenId(null);
            setTab('cards');
          }}
        />
      )}
      {publicPreview && (
        <ProfileDialog
          title="Public card preview"
          subtitle="This is what anyone opening your card link sees."
          onClose={() => {
            setPublicPreview(false);
            clearCardParam();
          }}
        >
          <div className="px-5 py-5 space-y-3">
            <ProfessionalCard card={myPublicCard} showQr={false} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadVCard(myPublicCard);
                  setToast('Contact file (.vcf) downloaded');
                }}
                className={btnSecondary}
              >
                <Download className="w-4 h-4" />
                Save Contact
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublicPreview(false);
                  clearCardParam();
                  setShareMine(true);
                }}
                className={btnPrimary}
              >
                <Share2 className="w-4 h-4" />
                Share Card
              </button>
            </div>
          </div>
        </ProfileDialog>
      )}
      {importOpen && (
        <NetworkImportDialog
          contacts={contacts}
          onClose={() => setImportOpen(false)}
          onImport={(next, msg) => {
            onUpdateContacts(next);
            setImportOpen(false);
            setToast(msg);
            switchTab('contacts', { ...EMPTY_NETWORK_FILTERS, recentlyAdded: true });
          }}
        />
      )}
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.label} onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
      <Toast message={toast} />
    </>
  );

  const selectedSupplier = supplier && BUYER_SUPPLIERS.find((s) => s.id === supplier.id);
  if (selectedSupplier) {
    return (
      <>
        <BuyerSupplierProfile
          key={selectedSupplier.id + supplier!.tab}
          supplier={selectedSupplier}
          matchQuery=""
          initialTab={supplier!.tab}
          saved={savedSupplierIds.includes(selectedSupplier.id)}
          networkContacts={contacts}
          onUpdateNetworkContacts={onUpdateContacts}
          onBack={() => setSupplier(null)}
          onToggleSave={() => toggleSaveSupplier(selectedSupplier)}
          onContact={() => setContactFor(selectedSupplier)}
          onOpenSupplier={(id) => setSupplier({ id, tab: 'overview' })}
          onRequestContact={() => onStartMessageWith(selectedSupplier.id, selectedSupplier.name)}
          onNotify={setToast}
        />
        {contactFor && (
          <ContactSupplierModal
            supplier={contactFor}
            onClose={() => setContactFor(null)}
            onViewContact={() => {
              setContactFor(null);
              setSupplier(null);
            }}
            onRequestContact={() => onStartMessageWith(contactFor.id, contactFor.name)}
            onViewAllContacts={() => {
              setSupplier({ id: contactFor.id, tab: 'contacts' });
              setContactFor(null);
            }}
          />
        )}
        {dialogs}
      </>
    );
  }

  const opened = byId(openId);
  if (opened) {
    return (
      <>
        <NetworkContactProfile
          key={opened.id}
          contact={opened}
          handlers={handlers}
          onBack={() => setOpenId(null)}
          onEdit={() => setForm({ editingId: opened.id })}
          onUpdate={(patch, msg) => {
            onUpdateContacts(updateContact(contacts, opened.id, patch));
            setToast(msg);
          }}
        />
        {dialogs}
      </>
    );
  }

  const metrics = [
    { label: 'Contacts', value: counts.contacts, go: () => switchTab('contacts', EMPTY_NETWORK_FILTERS) },
    { label: 'Connections', value: counts.connections, go: () => switchTab('connections', EMPTY_NETWORK_FILTERS) },
    { label: 'Companies', value: counts.companies, go: () => switchTab('companies', EMPTY_NETWORK_FILTERS) },
    { label: 'Recently Added', value: counts.recent, go: () => switchTab('contacts', { ...EMPTY_NETWORK_FILTERS, recentlyAdded: true }) },
  ];
  const filterCount = activeFilterCount(filters);
  const showFilters = tab === 'contacts' || tab === 'connections';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight">My Network</h1>
          <p className="mt-1 text-sm text-slate-600">Your construction industry contacts, companies and professional connections in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setForm({})} className={btnPrimary}>
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
          <button type="button" onClick={() => setShareMine(true)} className={btnSecondary}>
            <QrCode className="w-4 h-4" />
            <span className="sm:hidden">My QR</span>
            <span className="hidden sm:inline">Share My Card</span>
          </button>
          <button type="button" onClick={() => setScan({})} className={btnSecondary}>
            <ScanLine className="w-4 h-4" />
            Scan QR
          </button>
          <button type="button" onClick={() => setImportOpen(true)} className={btnSecondary}>
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Import Contacts</span>
            <span className="sm:hidden">Import</span>
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={m.go}
            className="text-left rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors cursor-pointer"
          >
            <span className="block text-lg font-semibold text-slate-900 leading-tight">{m.value}</span>
            <span className="block text-xs text-slate-500">{m.label}</span>
          </button>
        ))}
      </div>

      {tab !== 'cards' && (
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, company, designation, category or phone number..."
                aria-label="Search My Network"
                className="w-full min-h-11 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {showFilters && (
              <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`${btnSecondary} !min-h-11 ${filterCount ? '!border-blue-300 !text-blue-700' : ''}`}>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {filterCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-blue-700 text-white text-[11px] inline-flex items-center justify-center">{filterCount}</span>}
              </button>
            )}
          </div>
          {!query && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">Try:</span>
              {NETWORK_SEARCH_EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setQuery(ex)} className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700 hover:border-blue-200 hover:text-blue-700 cursor-pointer">
                  {ex}
                </button>
              ))}
            </div>
          )}
          {showFilters && filtersOpen && <NetworkFiltersPanel contacts={contacts.filter((c) => c.isMaintained || c.connectionStatus === 'connected')} filters={filters} onChange={setFilters} />}
        </div>
      )}

      <nav className="mt-5 border-b border-slate-200 flex gap-1 overflow-x-auto" aria-label="My Network sections">
        {TABS.map((t) => {
          const badge = t.id === 'connections' && counts.requests ? counts.requests : 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`relative shrink-0 px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === t.id ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {t.label}
              {badge > 0 && <span className="ml-1.5 px-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">{badge}</span>}
              {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-700" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 animate-[fadeIn_0.2s_ease-out]" key={tab}>
        {tab === 'contacts' && (
          <NetworkContactsTab
            contacts={contacts}
            query={query}
            filters={filters}
            handlers={handlers}
            onClearAll={() => {
              setQuery('');
              setFilters(EMPTY_NETWORK_FILTERS);
            }}
            onAdd={() => setForm({})}
          />
        )}
        {tab === 'connections' && <NetworkConnectionsTab contacts={contacts} query={query} filters={filters} handlers={handlers} />}
        {tab === 'companies' && (
          <NetworkCompaniesTab
            contacts={contacts}
            query={query}
            savedSupplierIds={savedSupplierIds}
            onToggleSaveSupplier={toggleSaveSupplier}
            onOpenCompany={openSupplier}
            onViewContacts={(company) => {
              setQuery('');
              switchTab('contacts', { ...EMPTY_NETWORK_FILTERS, company });
            }}
          />
        )}
        {tab === 'cards' && (
          <NetworkCardsTab
            user={currentUser}
            settings={cardSettings}
            contacts={contacts}
            onUpdateSettings={setCardSettings}
            onUpdateUser={onUpdateUser}
            onShareMyCard={() => setShareMine(true)}
            onScan={() => setScan({})}
            onOpenReceived={(c) => setScan({ ref: personalSokoId(c) ?? undefined })}
            onNotify={setToast}
          />
        )}
      </div>

      <p className="mt-8 flex items-start gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Demo data: contacts, connections, companies and business cards shown here are sample records for this prototype. Your saved contacts and notes are private to you.
      </p>
      {dialogs}
    </div>
  );
};
