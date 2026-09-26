import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Tablet,
  Calendar,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  MessageSquare,
  Award,
  ChevronRight,
  Download,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Printer,
  ExternalLink,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { OfficeKioskVisit, UserProfile, CommunityContact } from '../types';

interface ContractorNetworkDashboardProps {
  visits: OfficeKioskVisit[];
  onUpdateVisits?: (visits: OfficeKioskVisit[]) => void;
  currentUser: UserProfile;
  onStartMessageWith: (userId: string, name: string) => void;
  contacts: CommunityContact[];
  onUpdateContacts: (contacts: CommunityContact[]) => void;
}

export const ContractorNetworkDashboard: React.FC<ContractorNetworkDashboardProps> = ({
  visits,
  onUpdateVisits,
  currentUser,
  onStartMessageWith,
  contacts,
  onUpdateContacts,
}) => {
  const [activeTab, setActiveTab] = useState<'visits_dashboard' | 'supplier_directory'>('visits_dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHost, setSelectedHost] = useState('All');
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Executive Visit Report Modal State
  const [selectedVisitForReport, setSelectedVisitForReport] = useState<OfficeKioskVisit | null>(null);

  // Filter visits
  const filteredVisits = visits.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      v.supplierName.toLowerCase().includes(q) ||
      v.supplierCompany.toLowerCase().includes(q) ||
      v.badgeNumber.toLowerCase().includes(q) ||
      v.buyerHostName.toLowerCase().includes(q) ||
      v.agendaDiscussion.toLowerCase().includes(q) ||
      (v.meetingNotes && v.meetingNotes.toLowerCase().includes(q));

    const matchesHost = selectedHost === 'All' || v.buyerHostName === selectedHost;
    const matchesPurpose = selectedPurpose === 'All' || v.purposeOfVisit === selectedPurpose;
    const matchesStatus = selectedStatus === 'All' || v.visitorStatus === selectedStatus;

    return matchesSearch && matchesHost && matchesPurpose && matchesStatus;
  });

  // Extract distinct hosts & purposes
  const allHosts = Array.from(new Set(['All', ...visits.map((v) => v.buyerHostName)]));
  const allPurposes = Array.from(new Set(['All', ...visits.map((v) => v.purposeOfVisit)]));

  // Toggle action item completion in visit
  const handleToggleActionItem = (visitId: string, itemIdx: number) => {
    if (!onUpdateVisits) return;
    const updated = visits.map((v) => {
      if (v.id !== visitId || !v.actionItems) return v;
      const items = [...v.actionItems];
      if (items[itemIdx].startsWith('✓ ')) {
        items[itemIdx] = items[itemIdx].replace('✓ ', '');
      } else {
        items[itemIdx] = `✓ ${items[itemIdx]}`;
      }
      return { ...v, actionItems: items };
    });
    onUpdateVisits(updated);
  };

  // KPIs
  const totalVisits = visits.length;
  const completedVisits = visits.filter((v) => v.visitorStatus === 'completed').length;
  const activeNow = visits.filter((v) => v.visitorStatus === 'in-meeting' || v.visitorStatus === 'checked-in').length;
  const avgScore = (
    visits.reduce((sum, v) => sum + (v.vendorScore || 5), 0) / (visits.length || 1)
  ).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-purple-600" />
              Company Visitor Intelligence & Network
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {currentUser.company}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Network & Company Visit Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            All external visits to company headquarters, regional project offices, and site kiosks are logged here with executive visit reports, commercial discussion summaries, and actionable deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Kiosk Security Integration Active</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Company Visits</span>
            <Tablet className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalVisits}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded across all hubs</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Active in Office Now</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeNow}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Checked in & meeting in progress</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>NDA Compliance Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">100%</div>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Signed prior to floor entry</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Avg Vendor Performance</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgScore} <span className="text-xs text-slate-500 font-normal">/ 5.0</span></div>
          <p className="text-[11px] text-slate-500 mt-0.5">Based on host evaluations</p>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('visits_dashboard')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'visits_dashboard'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>Company Visit Reports & Logs ({visits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('supplier_directory')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'supplier_directory'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Approved Supplier Roster ({contacts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Company Visit Reports Dashboard */}
      {activeTab === 'visits_dashboard' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[260px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by visitor, company, badge #, or discussion topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Host:</span>
                <select
                  value={selectedHost}
                  onChange={(e) => setSelectedHost(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-hidden"
                >
                  {allHosts.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Purpose:</span>
                <select
                  value={selectedPurpose}
                  onChange={(e) => setSelectedPurpose(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-hidden"
                >
                  {allPurposes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visit Reports Feed */}
          <div className="space-y-4">
            {filteredVisits.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                No company visits match the current filter.
              </div>
            ) : (
              filteredVisits.map((visit) => {
                const statusBadge = {
                  'in-meeting': { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'In Meeting' },
                  'checked-in': { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Checked In / Waiting' },
                  completed: { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Meeting Completed' },
                  scheduled: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Scheduled Today' },
                }[visit.visitorStatus];

                return (
                  <div
                    key={visit.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-5 sm:p-6 space-y-4"
                  >
                    {/* Top Row: Visitor Info & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={visit.supplierAvatar}
                          alt={visit.supplierName}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {visit.badgeNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                            {visit.ndaSigned && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                NDA Signed
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mt-1">
                            {visit.supplierCompany}
                          </h3>
                          <p className="text-xs text-slate-600 font-medium">
                            Representative: <strong>{visit.supplierName}</strong> • {visit.supplierEmail}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg">
                        <span className="font-bold text-slate-900 block">{visit.date}</span>
                        <span className="text-slate-500 text-[11px] flex items-center sm:justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          In: {visit.checkInTime} {visit.checkOutTime ? `• Out: ${visit.checkOutTime}` : ''}
                        </span>
                        <span className="text-slate-400 text-[11px] flex items-center sm:justify-end gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {visit.officeLocation}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Host & Purpose */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3.5 text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Company Host</span>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {visit.buyerHostName} <span className="text-slate-500 font-normal">({visit.buyerDepartment})</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Purpose of Visit</span>
                        <span className="font-semibold text-purple-800 mt-0.5 inline-block">
                          {visit.purposeOfVisit}
                        </span>
                      </div>
                    </div>

                    {/* Discussion Agenda & Commercial Summary */}
                    <div>
                      <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                        Discussion Agenda & Scope
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {visit.agendaDiscussion}
                      </p>
                    </div>

                    {/* Meeting Notes */}
                    {visit.meetingNotes && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-amber-900">
                          <FileText className="w-3.5 h-3.5 text-amber-700" />
                          Host Meeting Minutes & Notes:
                        </span>
                        <p className="leading-relaxed text-amber-900">
                          {visit.meetingNotes}
                        </p>
                      </div>
                    )}

                    {/* Action Items Checklist */}
                    {visit.actionItems && visit.actionItems.length > 0 && (
                      <div>
                        <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
                          Agreed Action Items & Deliverables:
                        </span>
                        <div className="space-y-1.5">
                          {visit.actionItems.map((item, idx) => {
                            const isDone = item.startsWith('✓ ');
                            return (
                              <div
                                key={idx}
                                onClick={() => handleToggleActionItem(visit.id, idx)}
                                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer group"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 group-hover:text-purple-600 shrink-0" />
                                )}
                                <span className={isDone ? 'line-through text-slate-400' : ''}>
                                  {isDone ? item.replace('✓ ', '') : item}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[11px] mr-1">Vendor Score:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-sm ${
                              star <= (visit.vendorScore || 5) ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedVisitForReport(visit)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700" />
                          <span>View Executive Visit Report</span>
                        </button>

                        <button
                          onClick={() => onStartMessageWith(visit.supplierId || 'sup_01', visit.supplierName)}
                          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message Supplier</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Approved Supplier Directory */}
      {activeTab === 'supplier_directory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Maintained Supplier & Subcontractor Rolodex</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Directory of prequalified trade partners, material suppliers, and specialized subcontractors.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              {contacts.length} Approved Partners
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={contact.avatarUrl}
                    alt={contact.name}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{contact.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {contact.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">{contact.company}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {contact.location}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
                  {contact.bio}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    {contact.phone}
                  </div>
                  <button
                    onClick={() => onStartMessageWith(contact.id, contact.name)}
                    className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Visit Report Modal */}
      {selectedVisitForReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-6">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wider">
                    Executive Visit Audit Report
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    Doc Ref: {selectedVisitForReport.badgeNumber}-AUDIT
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Vendor Visit Memo & Discussion Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Host Organization: {currentUser.company}
                </p>
              </div>

              <button
                onClick={() => setSelectedVisitForReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Entity Dossier */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendor Organization</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedVisitForReport.supplierCompany}</div>
                <div className="text-slate-600 mt-0.5">Attending: {selectedVisitForReport.supplierName}</div>
                <div className="text-slate-500 mt-0.5">{selectedVisitForReport.supplierEmail}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Internal Meeting Host</span>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedVisitForReport.buyerHostName}</div>
                <div className="text-slate-600 mt-0.5">{selectedVisitForReport.buyerDepartment}</div>
                <div className="text-slate-500 mt-0.5">{selectedVisitForReport.officeLocation}</div>
              </div>
            </div>

            {/* Time & Legal Audit Stamp */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">Physical Security & NDA Verification Clear</span>
                  <span className="text-[11px] text-emerald-800">
                    Badge {selectedVisitForReport.badgeNumber} validated at reception kiosk on {selectedVisitForReport.date} at {selectedVisitForReport.checkInTime}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-black uppercase tracking-wider">
                Audited
              </span>
            </div>

            {/* Executive Summary */}
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  1. Scope of Meeting & Purpose
                </h4>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                  {selectedVisitForReport.agendaDiscussion}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  2. Commercial Minutes & Technical Review
                </h4>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-mono text-[11px]">
                  {selectedVisitForReport.meetingNotes || 'Detailed technical notes recorded by lead host.'}
                </p>
              </div>

              {selectedVisitForReport.actionItems && selectedVisitForReport.actionItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                    3. Required Next Steps & Action Deliverables
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    {selectedVisitForReport.actionItems.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Generated via SOKO Intelligence Platform
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setSelectedVisitForReport(null)}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
