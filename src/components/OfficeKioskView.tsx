import React, { useState } from 'react';
import { SokoLogo } from './SokoLogo';
import {
  Building2,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Star,
  FileText,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  Tablet,
  Check,
  AlertCircle,
  X,
  MessageSquare,
  Bookmark,
  Share2,
  Printer,
  ChevronRight,
  Table,
  LayoutGrid,
  List,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
} from 'lucide-react';
import { OfficeKioskVisit, UserProfile, CommunityContact } from '../types';

interface OfficeKioskViewProps {
  visits: OfficeKioskVisit[];
  onUpdateVisits: (visits: OfficeKioskVisit[]) => void;
  currentUser: UserProfile;
  onStartMessageWith: (userId: string, name: string) => void;
  onAddContactToRolodex?: (contact: Partial<CommunityContact>) => void;
}

export const OfficeKioskView: React.FC<OfficeKioskViewProps> = ({
  visits,
  onUpdateVisits,
  currentUser,
  onStartMessageWith,
  onAddContactToRolodex,
}) => {
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked-in' | 'in-meeting' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [editingNotesVisitId, setEditingNotesVisitId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [tempRating, setTempRating] = useState(5);
  const [tempActionItem, setTempActionItem] = useState('');
  const [generatedBadge, setGeneratedBadge] = useState<OfficeKioskVisit | null>(null);

  // VMS View Mode: Table List (default) vs Cards Feed
  const [vmsViewMode, setVmsViewMode] = useState<'table' | 'cards'>('table');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedVisitIds, setSelectedVisitIds] = useState<Set<string>>(new Set());
  const [exportToast, setExportToast] = useState<string | null>(null);
  const isBuyerOrSupplier = currentUser?.role === 'buyer' || currentUser?.role === 'supplier';

  const handleToggleSelectVisit = (visitId: string) => {
    setSelectedVisitIds((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) {
        next.delete(visitId);
      } else {
        next.add(visitId);
      }
      return next;
    });
  };

  const handleSelectAllVisits = () => {
    if (selectedVisitIds.size === filteredVisits.length) {
      setSelectedVisitIds(new Set());
    } else {
      setSelectedVisitIds(new Set(filteredVisits.map((v) => v.id)));
    }
  };

  const handleExportCSV = () => {
    const targetVisits =
      selectedVisitIds.size > 0
        ? filteredVisits.filter((v) => selectedVisitIds.has(v.id))
        : filteredVisits;

    const csvRows = [
      ['SOKO.ae - Visitor Management System (VMS) Reception Register'],
      [`Export Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`],
      [`Branch: ${selectedOffice}`],
      [`Total Selected Records: ${targetVisits.length}`],
      [],
      [
        'Badge #',
        'Visitor Status',
        'Supplier Company',
        'Representative Name',
        'Phone',
        'Email',
        'Host Executive',
        'Department',
        'Office Location',
        'Purpose of Visit',
        'Check-In Time',
        'Check-Out Time',
        'NDA Status',
        'Vendor Score',
        'Discussion Agenda',
        'Meeting Minutes',
      ],
      ...targetVisits.map((v) => [
        `"${v.badgeNumber}"`,
        `"${v.visitorStatus}"`,
        `"${v.supplierCompany}"`,
        `"${v.supplierName}"`,
        `"${v.supplierPhone}"`,
        `"${v.supplierEmail}"`,
        `"${v.buyerHostName}"`,
        `"${v.buyerDepartment}"`,
        `"${v.officeLocation}"`,
        `"${v.purposeOfVisit}"`,
        `"${v.checkInTime}"`,
        `"${v.checkOutTime || 'Active In-Office'}"`,
        `"${v.ndaSigned ? 'Signed' : 'Pending'}"`,
        v.vendorScore || 'Unrated',
        `"${(v.agendaDiscussion || '').replace(/"/g, '""')}"`,
        `"${(v.meetingNotes || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `soko_vms_visitor_register_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast(`Downloaded ${targetVisits.length} visitor records as CSV`);
    setTimeout(() => setExportToast(null), 3500);
  };

  // Kiosk Check-In Form State
  const [kioskForm, setKioskForm] = useState({
    supplierName: '',
    supplierCompany: '',
    supplierPhone: '',
    supplierEmail: '',
    buyerHostName: currentUser.name || 'Marcus Vance',
    buyerDepartment: 'Strategic Sourcing & EPC Contracts',
    officeLocation: 'SoKo HQ - Tower 2, Sheikh Zayed Rd, Dubai',
    purposeOfVisit: 'Sample Demonstration' as OfficeKioskVisit['purposeOfVisit'],
    agendaDiscussion: '',
    ndaSigned: true,
  });

  const officeLocations = [
    'All Offices',
    'SoKo HQ - Tower 2, Sheikh Zayed Rd, Dubai',
    'Abu Dhabi Sourcing Hub - Al Maryah Island',
    'SoKo Hub - JAFZA Logistics Center, Dubai',
  ];

  // Filtering
  const filteredVisits = visits.filter((visit) => {
    if (selectedOffice !== 'All Offices' && visit.officeLocation !== selectedOffice) {
      return false;
    }
    if (statusFilter !== 'all' && visit.visitorStatus !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSupplier = visit.supplierCompany.toLowerCase().includes(q) || visit.supplierName.toLowerCase().includes(q);
      const matchBadge = visit.badgeNumber.toLowerCase().includes(q);
      const matchHost = visit.buyerHostName.toLowerCase().includes(q);
      const matchAgenda = visit.agendaDiscussion.toLowerCase().includes(q);
      if (!matchSupplier && !matchBadge && !matchHost && !matchAgenda) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const checkedInCount = visits.filter((v) => v.visitorStatus === 'checked-in').length;
  const inMeetingCount = visits.filter((v) => v.visitorStatus === 'in-meeting').length;
  const completedTodayCount = visits.filter(
    (v) => v.visitorStatus === 'completed' && v.date.toLowerCase().includes('today')
  ).length;

  // Actions
  const handleUpdateStatus = (visitId: string, newStatus: OfficeKioskVisit['visitorStatus']) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = visits.map((v) => {
      if (v.id === visitId) {
        return {
          ...v,
          visitorStatus: newStatus,
          checkOutTime: newStatus === 'completed' ? nowTime : v.checkOutTime,
        };
      }
      return v;
    });
    onUpdateVisits(updated);
  };

  const handleSaveNotes = (visitId: string) => {
    const updated = visits.map((v) => {
      if (v.id === visitId) {
        return {
          ...v,
          meetingNotes: tempNotes,
          vendorScore: tempRating,
          actionItems: tempActionItem.trim()
            ? [...(v.actionItems || []), tempActionItem.trim()]
            : v.actionItems,
        };
      }
      return v;
    });
    onUpdateVisits(updated);
    setEditingNotesVisitId(null);
    setTempActionItem('');
  };

  const handleKioskCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskForm.supplierName || !kioskForm.supplierCompany) return;

    const badgeNum = `SK-KIOSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newVisit: OfficeKioskVisit = {
      id: `vst_${Date.now()}`,
      badgeNumber: badgeNum,
      checkInTime: nowTime,
      date: 'Today, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      supplierName: kioskForm.supplierName,
      supplierCompany: kioskForm.supplierCompany,
      supplierAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      supplierPhone: kioskForm.supplierPhone || '+971 50 000 0000',
      supplierEmail: kioskForm.supplierEmail || 'supplier@company.com',
      buyerHostId: currentUser.id,
      buyerHostName: kioskForm.buyerHostName,
      buyerDepartment: kioskForm.buyerDepartment,
      officeLocation: kioskForm.officeLocation,
      purposeOfVisit: kioskForm.purposeOfVisit,
      agendaDiscussion: kioskForm.agendaDiscussion || 'General sourcing catalog presentation and procurement alignment.',
      visitorStatus: 'checked-in',
      meetingNotes: 'Supplier checked in via Reception Kiosk. Waiting in Executive Reception Lounge.',
      actionItems: [],
      vendorScore: 5,
      ndaSigned: kioskForm.ndaSigned,
    };

    onUpdateVisits([newVisit, ...visits]);
    setGeneratedBadge(newVisit);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" />
            Vendor Management System (VMS) & Reception Check-in
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            In-Office Supplier Visits & Kiosk Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Record, track, and manage all visiting suppliers across your offices. Logged through physical or simulated reception kiosks placed in your lobbies, allowing suppliers to register, state visit purpose, and record discussion notes directly into the SoKo vendor ecosystem.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
          <button
            onClick={() => {
              setGeneratedBadge(null);
              setShowKioskModal(true);
            }}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <Tablet className="w-4 h-4" />
            Launch Reception Kiosk (Touch Mode)
          </button>
        </div>
      </div>

      {/* Live Reception Status Dashboard */}
      <div className={`grid gap-4 ${isBuyerOrSupplier ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        {/* Waiting in Lobby */}
        {!isBuyerOrSupplier && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Waiting in Lobby</span>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{checkedInCount}</span>
              <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                Check-ins
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Suppliers awaiting meeting</p>
          </div>
        )}

        {/* In Meeting */}
        {!isBuyerOrSupplier && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">In Active Meeting</span>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{inMeetingCount}</span>
              <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                Live Rooms
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Discussions in progress</p>
          </div>
        )}

        {/* Completed Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{completedTodayCount}</span>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              Minutes Logged
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Notes and score saved</p>
        </div>

        {/* Total Historical */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Visits Logged</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{visits.length}</span>
            <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
              VMS Records
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ecosystem audit history</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Status Pills, Branch Selector, and View Mode / Export Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Visits' },
              { id: 'checked-in', label: 'In Lobby (Checked In)' },
              { id: 'in-meeting', label: 'In Meeting' },
              { id: 'completed', label: 'Completed Meetings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Controls: Branch Selector, View Switcher & Export */}
          <div className="flex items-center gap-2 flex-wrap justify-between xl:justify-end">
            {/* View Mode Toggle: Table Register vs Cards */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setVmsViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  vmsViewMode === 'table'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table Register List View"
              >
                <Table className="w-3.5 h-3.5 text-blue-400" />
                <span>Table Register</span>
              </button>

              <button
                type="button"
                onClick={() => setVmsViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  vmsViewMode === 'cards'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card Detail View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Office Branch Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-hidden"
              >
                {officeLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV & Print */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Export VMS register to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                title="Print Reception Register"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search Bar & Record Count Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search visiting company, representative name, badge #, host executive, or discussion agenda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-semibold">
              Showing <strong className="text-slate-900 font-extrabold">{filteredVisits.length}</strong>{' '}
              {filteredVisits.length === 1 ? 'visit' : 'visits'}
            </span>
            {selectedVisitIds.size > 0 && (
              <span className="text-xs text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {selectedVisitIds.size} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Export Toast if CSV generated */}
      {exportToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{exportToast}</span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Visitor Log Records List */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No visitor records match your filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Simulate or log a new supplier office check-in using the Reception Kiosk touch mode.
            </p>
          </div>
          <button
            onClick={() => {
              setGeneratedBadge(null);
              setShowKioskModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
          >
            Launch Reception Kiosk Check-in
          </button>
        </div>
      ) : vmsViewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                  <th className="w-10 px-3.5 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedVisitIds.size === filteredVisits.length &&
                        filteredVisits.length > 0
                      }
                      onChange={handleSelectAllVisits}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select all records"
                    />
                  </th>
                  <th className="px-3.5 py-3.5 w-40">Badge & Status</th>
                  <th className="px-3.5 py-3.5 min-w-[240px]">Visiting Supplier & Rep</th>
                  <th className="px-3.5 py-3.5 min-w-[200px]">Purpose & Agenda</th>
                  <th className="px-3.5 py-3.5 min-w-[200px]">Host Executive & Office</th>
                  <th className="px-3.5 py-3.5 w-36">Check-in / Time</th>
                  <th className="px-3.5 py-3.5 w-28 text-center">Score & NDA</th>
                  <th className="px-3.5 py-3.5 w-36 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((visit) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const isSelected = selectedVisitIds.has(visit.id);
                  const isEditing = editingNotesVisitId === visit.id;

                  return (
                    <React.Fragment key={visit.id}>
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70'
                            : isExpanded
                            ? 'bg-slate-50'
                            : 'hover:bg-slate-50/80 bg-white'
                        }`}
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                      >
                        <td
                          className="px-3.5 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectVisit(visit.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Badge & Status */}
                        <td className="px-3.5 py-3">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded inline-block">
                              {visit.badgeNumber}
                            </span>
                            <div>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                                  visit.visitorStatus === 'checked-in'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                    : visit.visitorStatus === 'in-meeting'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {visit.visitorStatus === 'checked-in'
                                  ? '• In Lobby'
                                  : visit.visitorStatus === 'in-meeting'
                                  ? '• In Meeting'
                                  : '✓ Completed'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Visiting Supplier & Representative */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-start gap-2.5">
                            <img
                              src={visit.supplierAvatar}
                              alt={visit.supplierName}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0 mt-0.5"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {visit.supplierName}
                              </h4>
                              <p className="text-xs font-bold text-blue-700 truncate">
                                {visit.supplierCompany}
                              </p>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {visit.supplierPhone} • {visit.supplierEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Purpose & Agenda */}
                        <td className="px-3.5 py-3">
                          <div className="space-y-1 max-w-xs">
                            <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              {visit.purposeOfVisit}
                            </span>
                            <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                              {visit.agendaDiscussion}
                            </p>
                          </div>
                        </td>

                        {/* Host Executive & Office */}
                        <td className="px-3.5 py-3">
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {visit.buyerHostName}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[190px]">
                              {visit.buyerDepartment}
                            </span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{visit.officeLocation}</span>
                            </div>
                          </div>
                        </td>

                        {/* Time In / Out */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                          <div className="font-semibold text-slate-800">{visit.date}</div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>In: {visit.checkInTime}</span>
                          </div>
                          {visit.checkOutTime && (
                            <div className="text-emerald-700 text-[10px] font-semibold">
                              Out: {visit.checkOutTime}
                            </div>
                          )}
                        </td>

                        {/* Rating & NDA */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800 text-xs">
                              {visit.vendorScore ? `${visit.vendorScore}.0` : '—'}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              visit.ndaSigned
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {visit.ndaSigned ? 'NDA Signed' : 'NDA Pending'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-3.5 py-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Live Flow Button */}
                            {visit.visitorStatus === 'checked-in' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(visit.id, 'in-meeting')}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Start Meeting"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Start</span>
                              </button>
                            )}

                            {visit.visitorStatus === 'in-meeting' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(visit.id, 'completed')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Conclude Meeting"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Checkout</span>
                              </button>
                            )}

                            {visit.visitorStatus === 'completed' && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Logged
                              </span>
                            )}

                            {/* Message Button */}
                            <button
                              type="button"
                              onClick={() =>
                                onStartMessageWith(
                                  visit.supplierId || 'sup_01',
                                  visit.supplierName
                                )
                              }
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-md cursor-pointer transition-colors"
                              title="Message Supplier on SoKo"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            </button>

                            {/* Add to Rolodex */}
                            {onAddContactToRolodex && (
                              <button
                                type="button"
                                onClick={() =>
                                  onAddContactToRolodex({
                                    name: visit.supplierName,
                                    company: visit.supplierCompany,
                                    phone: visit.supplierPhone,
                                    email: visit.supplierEmail,
                                    title: 'Visiting Representative',
                                    role: 'supplier',
                                    tags: ['VMS', 'Office Met'],
                                  })
                                }
                                className="p-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-md cursor-pointer transition-colors"
                                title="Save to Rolodex"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-purple-600" />
                              </button>
                            )}

                            {/* Expand Row Details */}
                            <button
                              type="button"
                              onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                                isExpanded
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title={isExpanded ? 'Collapse row' : 'Expand full minutes & notes'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-blue-200 animate-in fade-in duration-200">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
                              {/* Top Bar inside Drawer */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md">
                                    {visit.badgeNumber}
                                  </span>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {visit.supplierName} • {visit.supplierCompany}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                      Host: {visit.buyerHostName} ({visit.buyerDepartment}) | Location: {visit.officeLocation}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setGeneratedBadge(visit)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                                    <span>View Kiosk Badge Pass</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedVisitId(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Close Details ▲
                                  </button>
                                </div>
                              </div>

                              {/* Discussion Agenda */}
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Reception Kiosk Stated Agenda:
                                </span>
                                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                                  &ldquo;{visit.agendaDiscussion}&rdquo;
                                </p>
                              </div>

                              {/* Meeting Minutes & Buyer Vendor Evaluation */}
                              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-800" />
                                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                      Buyer Meeting Minutes & Vendor Evaluation
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-white border border-amber-200 px-2 py-0.5 rounded-md">
                                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                      <span className="text-xs font-bold text-slate-800">
                                        {visit.vendorScore ? `${visit.vendorScore}.0` : 'Unrated'}
                                      </span>
                                    </div>

                                    {!isEditing ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingNotesVisitId(visit.id);
                                          setTempNotes(visit.meetingNotes || '');
                                          setTempRating(visit.vendorScore || 5);
                                        }}
                                        className="text-xs text-amber-800 underline font-bold hover:text-amber-950 cursor-pointer"
                                      >
                                        {visit.meetingNotes ? 'Edit Minutes & Action Items' : '+ Add Minutes'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSaveNotes(visit.id)}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold cursor-pointer"
                                      >
                                        Save Minutes
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3 pt-2">
                                    <div>
                                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                        Meeting Summary / Discussion Outcome:
                                      </label>
                                      <textarea
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        placeholder="Record key negotiation points, pricing agreements, sample quality, and delivery dates..."
                                        rows={3}
                                        className="w-full bg-white border border-amber-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                          Vendor Capability & Demo Score:
                                        </label>
                                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-amber-200">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => setTempRating(star)}
                                              className="p-1 cursor-pointer hover:scale-110 transition-transform"
                                            >
                                              <Star
                                                className={`w-5 h-5 ${
                                                  star <= tempRating
                                                    ? 'fill-amber-500 text-amber-500'
                                                    : 'text-slate-300'
                                                }`}
                                              />
                                            </button>
                                          ))}
                                          <span className="text-xs font-bold text-amber-900 ml-2">
                                            {tempRating}.0 / 5.0
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                                          Add Follow-Up Action Item:
                                        </label>
                                        <div className="flex gap-1.5">
                                          <input
                                            type="text"
                                            value={tempActionItem}
                                            onChange={(e) => setTempActionItem(e.target.value)}
                                            placeholder="e.g. Issue PO for 200MT steel"
                                            className="flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-amber-950 font-medium leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-200/60">
                                    {visit.meetingNotes || 'No buyer minutes logged yet. Click "+ Add Minutes" to record.'}
                                  </div>
                                )}

                                {/* Action items display */}
                                {visit.actionItems && visit.actionItems.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center flex-wrap gap-2">
                                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                      Action Items:
                                    </span>
                                    {visit.actionItems.map((item, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[11px] font-semibold bg-white text-slate-800 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => {
            const isEditing = editingNotesVisitId === visit.id;

            return (
              <div
                key={visit.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300"
              >
                {/* Header Row: Badge, Status, Date/Time, Office */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md">
                      {visit.badgeNumber}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        visit.visitorStatus === 'checked-in'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : visit.visitorStatus === 'in-meeting'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {visit.visitorStatus === 'checked-in'
                        ? '• Waiting in Lobby'
                        : visit.visitorStatus === 'in-meeting'
                        ? '• Meeting In Progress'
                        : '✓ Meeting Completed'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      In: {visit.checkInTime} {visit.checkOutTime ? `| Out: ${visit.checkOutTime}` : ''}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700">{visit.officeLocation}</span>
                  </div>
                </div>

                {/* Middle Grid: Supplier Info & Purpose */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4">
                  {/* Supplier Card (col 4) */}
                  <div className="lg:col-span-4 flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <img
                      src={visit.supplierAvatar}
                      alt={visit.supplierName}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{visit.supplierName}</h4>
                      <p className="text-xs font-bold text-blue-700 truncate">{visit.supplierCompany}</p>
                      <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{visit.supplierPhone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{visit.supplierEmail}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visit Details & Agenda (col 8) */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Host Executive:
                        </span>
                        <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {visit.buyerHostName} ({visit.buyerDepartment})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Purpose:
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                          {visit.purposeOfVisit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Discussion Agenda (Logged at Kiosk):
                      </span>
                      <p className="text-xs text-slate-800 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                        &ldquo;{visit.agendaDiscussion}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meeting Minutes & Buyer Vendor Notes */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Buyer Meeting Minutes & Vendor Evaluation
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Vendor Rating */}
                      <div className="flex items-center gap-1 bg-white border border-amber-200 px-2 py-0.5 rounded-md">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-bold text-slate-800">
                          {visit.vendorScore ? `${visit.vendorScore}.0` : 'Unrated'}
                        </span>
                      </div>

                      {!isEditing ? (
                        <button
                          onClick={() => {
                            setEditingNotesVisitId(visit.id);
                            setTempNotes(visit.meetingNotes || '');
                            setTempRating(visit.vendorScore || 5);
                          }}
                          className="text-xs text-amber-800 underline font-bold hover:text-amber-950 cursor-pointer"
                        >
                          {visit.meetingNotes ? 'Edit Minutes & Action Items' : '+ Add Minutes'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveNotes(visit.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold cursor-pointer"
                        >
                          Save Minutes
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          Meeting Summary / Discussion Outcome:
                        </label>
                        <textarea
                          rows={3}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="e.g. Reviewed steel heat logs, approved trial run of 400 MT, agreed to Net 45 payment terms..."
                          className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-1">
                            Vendor Performance Rating:
                          </label>
                          <select
                            value={tempRating}
                            onChange={(e) => setTempRating(Number(e.target.value))}
                            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-hidden font-bold"
                          >
                            <option value={5}>5 Stars - Outstanding Presentation & Spec Match</option>
                            <option value={4}>4 Stars - High Capability / Minor Clarification Needed</option>
                            <option value={3}>3 Stars - Satisfactory Commercial Terms</option>
                            <option value={2}>2 Stars - Spec Inconsistencies / High Price</option>
                            <option value={1}>1 Star - Non-Compliant with Project Standards</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-1">
                            Add Action Item / Next Step:
                          </label>
                          <input
                            type="text"
                            value={tempActionItem}
                            onChange={(e) => setTempActionItem(e.target.value)}
                            placeholder="e.g. Supplier to submit official bid on Opportunities tab by Friday"
                            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-amber-900/90 leading-relaxed italic">
                        {visit.meetingNotes || 'No notes logged yet. Click to record meeting outcomes.'}
                      </p>

                      {visit.actionItems && visit.actionItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center flex-wrap gap-2">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            Action Items:
                          </span>
                          {visit.actionItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold bg-white text-slate-800 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls: Live Meeting Progression */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Meeting Flow:</span>
                    {visit.visitorStatus === 'checked-in' && (
                      <button
                        onClick={() => handleUpdateStatus(visit.id, 'in-meeting')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Start Meeting with Supplier
                      </button>
                    )}

                    {visit.visitorStatus === 'in-meeting' && (
                      <button
                        onClick={() => handleUpdateStatus(visit.id, 'completed')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Conclude Meeting & Check-Out
                      </button>
                    )}

                    {visit.visitorStatus === 'completed' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Meeting Completed & Archived in VMS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartMessageWith(visit.supplierId || 'sup_01', visit.supplierName)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      Message on SoKo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reception Tablet Kiosk Simulation Modal */}
      {showKioskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border-4 border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto text-white relative">
            <button
              onClick={() => setShowKioskModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tablet Kiosk Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <SokoLogo size="lg" className="border border-white/20 shadow-md" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                  Office Lobby Tablet Terminal
                </span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  SOKO Office Reception Check-in Kiosk
                </h2>
                <p className="text-xs text-slate-400">
                  Welcome visiting suppliers. Please register your details to alert your host executive.
                </p>
              </div>
            </div>

            {/* If badge is generated, show printed pass */}
            {generatedBadge ? (
              <div className="py-6 space-y-6 text-center">
                <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl max-w-md mx-auto border-2 border-blue-500 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="text-left flex items-center gap-2.5">
                      <SokoLogo size="xs" />
                      <div>
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">
                          SOKO.ae Visitor Pass
                        </span>
                        <h3 className="text-base font-extrabold">{generatedBadge.supplierCompany}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {generatedBadge.badgeNumber}
                      </span>
                    </div>
                  </div>

                  <div className="py-4 flex items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-slate-800" />
                    </div>
                    <div className="text-left text-xs space-y-1">
                      <p className="font-bold text-slate-900 text-sm">{generatedBadge.supplierName}</p>
                      <p className="text-slate-500">Host: <strong>{generatedBadge.buyerHostName}</strong></p>
                      <p className="text-slate-500">Dept: {generatedBadge.buyerDepartment}</p>
                      <p className="text-blue-600 font-bold">{generatedBadge.purposeOfVisit}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Checked In: {generatedBadge.checkInTime}</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> NDA Acknowledged
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-bold text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Check-in Successful! Host Has Been Notified.
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Please take a seat in the Executive Sourcing Lounge. Your host <strong>{generatedBadge.buyerHostName}</strong> has received the push notification.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setGeneratedBadge(null);
                      setShowKioskModal(false);
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Return to Vendor Dashboard
                  </button>
                </div>
              </div>
            ) : (
              /* Kiosk Registration Form */
              <form onSubmit={handleKioskCheckInSubmit} className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Visiting Representative Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={kioskForm.supplierName}
                      onChange={(e) => setKioskForm({ ...kioskForm, supplierName: e.target.value })}
                      placeholder="e.g. Elena Rostova"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:bg-slate-750 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Supplier Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={kioskForm.supplierCompany}
                      onChange={(e) => setKioskForm({ ...kioskForm, supplierCompany: e.target.value })}
                      placeholder="e.g. Apex Industrial Castings"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:bg-slate-750 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Mobile Phone (for SMS notifications)
                    </label>
                    <input
                      type="text"
                      value={kioskForm.supplierPhone}
                      onChange={(e) => setKioskForm({ ...kioskForm, supplierPhone: e.target.value })}
                      placeholder="+971 50 123 4567"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      value={kioskForm.supplierEmail}
                      onChange={(e) => setKioskForm({ ...kioskForm, supplierEmail: e.target.value })}
                      placeholder="representative@supplier.com"
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Select Host Executive to Meet
                    </label>
                    <select
                      value={kioskForm.buyerHostName}
                      onChange={(e) => setKioskForm({ ...kioskForm, buyerHostName: e.target.value })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden"
                    >
                      <option value="Marcus Vance">Marcus Vance - Director of Strategic Sourcing</option>
                      <option value="Sarah Jenkins">Sarah Jenkins - Procurement & Subcontracts Director</option>
                      <option value="David Sterling">David Sterling - Energy & MEP Contracts Lead</option>
                      <option value="Tariq Al-Hashemi">Tariq Al-Hashemi - Head of Regional Procurement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Purpose of Visit *
                    </label>
                    <select
                      value={kioskForm.purposeOfVisit}
                      onChange={(e) =>
                        setKioskForm({
                          ...kioskForm,
                          purposeOfVisit: e.target.value as OfficeKioskVisit['purposeOfVisit'],
                        })
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden font-bold"
                    >
                      <option value="Sample Demonstration">Sample Demonstration (Material / Prototype)</option>
                      <option value="Contract Negotiation">Contract Negotiation & Terms Review</option>
                      <option value="RFQ Discussion">RFQ / Tender Clarification Meeting</option>
                      <option value="Vendor Onboarding">Vendor Onboarding & Compliance Audit</option>
                      <option value="Facility Inspection">Facility & Logistics Review</option>
                      <option value="Commercial Review">Annual Commercial Review & Rebates</option>
                      <option value="Other">Other Procurement Purpose</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    What is to be discussed during this meeting? *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={kioskForm.agendaDiscussion}
                    onChange={(e) => setKioskForm({ ...kioskForm, agendaDiscussion: e.target.value })}
                    placeholder="e.g. Presenting ASTM A615 Grade 60 rebar metallurgical test coupons and discussing phased shipment schedules for Q4 viaduct piers."
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="nda-checkbox"
                    checked={kioskForm.ndaSigned}
                    onChange={(e) => setKioskForm({ ...kioskForm, ndaSigned: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="nda-checkbox" className="text-slate-300 text-xs cursor-pointer">
                    I acknowledge visitor health & safety guidelines and commercial non-disclosure confidentiality.
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">
                    Kiosk ID: KIOSK-DXB-T2-01 | Online
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Kiosk Check-In & Print Badge
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
