import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, CreditCard, MapPin, Search, X } from 'lucide-react';
import { UserProfile } from '../types';
import {
  BUYER_FEED_ITEMS,
  BuyerFeedItem,
  BuyerFeedTab,
  DEMO_BUYER_INTERESTS,
  diversifyFeed,
  FEED_TAB_KINDS,
  MY_SOKO_SHORTCUTS,
  scoreFeedItem,
} from '../data/buyerHomeFeed';
import { BuyerFeedCard } from './BuyerFeedCard';
import { BuyerHomeSidebar } from './BuyerHomeSidebar';

interface BuyerHomeViewProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: string) => void;
  onOpenBusinessCard: () => void;
  onStartMessageWith: (supplierId: string, supplierName: string) => void;
}

const TABS: { id: BuyerFeedTab; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'supplier-updates', label: 'Supplier Updates' },
  { id: 'products', label: 'Products' },
  { id: 'market-hub', label: 'Market Hub' },
  { id: 'industry', label: 'Industry Intelligence' },
  { id: 'insights', label: 'SOKO Insights' },
];

const SAVED_KEY = 'soko_buyer_home_saved_v1';

const greetingFor = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

const searchableText = (item: BuyerFeedItem) =>
  [
    item.category,
    item.location,
    'supplier' in item ? item.supplier.name : '',
    'product' in item ? `${item.product.name} ${item.product.brand} ${item.product.type}` : '',
    'title' in item ? item.title : '',
    'headline' in item ? item.headline : '',
  ]
    .join(' ')
    .toLowerCase();

export const BuyerHomeView: React.FC<BuyerHomeViewProps> = ({
  currentUser,
  onNavigateToTab,
  onOpenBusinessCard,
  onStartMessageWith,
}) => {
  const [activeTab, setActiveTab] = useState<BuyerFeedTab>('for-you');
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  const toggleSave = (id: string) =>
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const interestProfile = useMemo(() => {
    const savedItems = BUYER_FEED_ITEMS.filter((i) => savedIds.includes(i.id));
    return {
      ...DEMO_BUYER_INTERESTS,
      savedProductIds: [
        ...DEMO_BUYER_INTERESTS.savedProductIds,
        ...savedItems.flatMap((i) => ('product' in i ? [i.product.id] : [])),
      ],
    };
  }, [savedIds]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scored = BUYER_FEED_ITEMS.filter(
      (item) => activeTab === 'for-you' || FEED_TAB_KINDS[activeTab].includes(item.kind)
    )
      .filter((item) => !q || searchableText(item).includes(q))
      .map((item) => ({ item, ...scoreFeedItem(item, interestProfile) }));

    return activeTab === 'for-you'
      ? diversifyFeed(scored)
      : scored.sort((a, b) => a.item.ageHours - b.item.ageHours);
  }, [activeTab, query, interestProfile]);

  const savedProductExtra = BUYER_FEED_ITEMS.filter((i) => savedIds.includes(i.id) && 'product' in i).length;
  const firstName = currentUser.name.split(' ')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6 bg-white rounded-xl border border-slate-200 shadow-xs px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {greetingFor(new Date().getHours())}, {firstName}
          </p>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight">Your Construction Market</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Supplier updates, products, requirements and market intelligence relevant to you.
          </p>
        </div>
        <label className="relative w-full md:w-96 shrink-0">
          <span className="sr-only">Search the feed</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers, products, companies or market activity..."
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="h-16 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-800" />
            <div className="px-4 pb-4">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="-mt-8 w-16 h-16 rounded-full border-4 border-white object-cover shadow-xs"
              />
              <h2 className="mt-2 font-semibold text-slate-900 text-base flex items-center gap-1">
                {currentUser.name}
                {currentUser.verified && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </h2>
              <span className="inline-flex mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800">
                Verified Buyer
              </span>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{currentUser.title}</p>
              <p className="text-xs font-semibold text-slate-800 mt-1">{currentUser.company}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Dubai, UAE
              </p>
              <button
                id="view-my-card-btn"
                type="button"
                onClick={onOpenBusinessCard}
                className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                My Digital Business Card
              </button>
            </div>
          </div>

          <nav className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs" aria-label="My SOKO">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400">MY SOKO</p>
            {MY_SOKO_SHORTCUTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigateToTab(s.tab)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group cursor-pointer"
              >
                <span>{s.label}</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {s.id === 'saved-products' ? s.count + savedProductExtra : s.count}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="lg:col-span-6 space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1 flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? tab.id === 'insights'
                      ? 'bg-slate-900 text-gold-300'
                      : 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'for-you' && !query && (
            <p className="text-[11px] text-slate-500 px-1">
              Ranked by the categories you follow, suppliers and products you've viewed or saved, your network, Market Hub activity and location.
            </p>
          )}

          {visibleItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">No matching activity</p>
              <p className="text-xs text-slate-500 mt-1">Try a different search or switch to another tab.</p>
            </div>
          ) : (
            visibleItems.map(({ item, reasons }) => (
              <BuyerFeedCard
                key={item.id}
                item={item}
                reasons={activeTab === 'for-you' ? reasons : []}
                isSaved={savedIds.includes(item.id)}
                onToggleSave={toggleSave}
                onNavigate={onNavigateToTab}
                onContact={onStartMessageWith}
              />
            ))
          )}
        </main>

        <BuyerHomeSidebar onNavigate={onNavigateToTab} />
      </div>
    </div>
  );
};
