import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckCheck,
  Paperclip,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Conversation, MessageItem, UserProfile, UserRole } from '../types';

interface MessagingViewProps {
  conversations: Conversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  currentUser: UserProfile;
  onSendMessage: (conversationId: string, text: string) => void;
  onAcceptQuote: (conversationId: string, messageId: string) => void;
  onViewCard: () => void;
  onOpenCreateQuoteModal?: (conversationId: string) => void;
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  conversations,
  activeConversationId,
  setActiveConversationId,
  currentUser,
  onSendMessage,
  onAcceptQuote,
  onViewCard,
  onOpenCreateQuoteModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'quotes' | 'unread'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleSend = () => {
    if (!inputText.trim() || !activeConv) return;
    onSendMessage(activeConv.id, inputText.trim());
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    if (!activeConv) return;
    onSendMessage(activeConv.id, text);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.participant.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.participant.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.rfqSubject && c.rfqSubject.toLowerCase().includes(searchFilter.toLowerCase()));

    if (!matchesSearch) return false;

    if (tabFilter === 'unread') return c.unreadCount > 0;
    if (tabFilter === 'quotes') {
      return c.messages.some((m) => m.isQuote);
    }
    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'supplier':
        return <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Supplier</span>;
      case 'buyer':
        return <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Buyer</span>;
      case 'contractor':
        return <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Contractor</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden h-[calc(100vh-140px)] min-h-[580px] grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Conversation Directory */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          {/* Header & Search */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Procurement Messages</h2>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                {conversations.reduce((acc, c) => acc + c.unreadCount, 0)} Unread
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="message-search-input"
                type="text"
                placeholder="Search vendor, RFQ, or quotes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Sub filter tabs */}
            <div className="flex gap-1 pt-1">
              {(['all', 'quotes', 'unread'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTabFilter(t)}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                    tabFilter === t
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'quotes' ? 'Active Quotes' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === activeConversationId;
                const hasQuote = c.messages.some((m) => m.isQuote);

                return (
                  <button
                    key={c.id}
                    id={`conversation-item-${c.id}`}
                    onClick={() => setActiveConversationId(c.id)}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-blue-600'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.participant.avatar}
                        alt={c.participant.name}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                      {c.participant.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {c.participant.name}
                          </span>
                          {c.participant.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {c.lastMessageTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-slate-600 font-medium truncate">
                          {c.participant.company}
                        </span>
                        {getRoleBadge(c.participant.role)}
                      </div>

                      {c.rfqSubject && (
                        <div className="text-[10px] font-semibold text-blue-700 truncate bg-blue-100/50 px-1.5 py-0.5 rounded mb-1">
                          {c.rfqSubject}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 truncate leading-tight">
                        {c.lastMessage}
                      </p>

                      {hasQuote && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1">
                          <DollarSign className="w-3 h-3" />
                          Commercial Quote Attached
                        </span>
                      )}
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={activeConv.participant.avatar}
                      alt={activeConv.participant.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {activeConv.participant.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900">
                        {activeConv.participant.name}
                      </h3>
                      {activeConv.participant.verified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                      {getRoleBadge(activeConv.participant.role)}
                    </div>
                    <p className="text-xs text-slate-500">
                      {activeConv.participant.company} • Avg Response:{' '}
                      <span className="text-emerald-700 font-semibold">
                        {activeConv.participant.responseTime}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="chat-view-card-btn"
                    onClick={onViewCard}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Digital Card
                  </button>
                  <button
                    onClick={() => handleQuickReply('Please provide your ISO 9001 audit certificate and latest MTR.')}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Request Compliance Spec
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
                {/* RFQ Subject banner if present */}
                {activeConv.rfqSubject && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">Negotiation Thread for:</span>
                      <span>{activeConv.rfqSubject}</span>
                    </div>
                    <span className="bg-blue-200/70 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Commercial Review
                    </span>
                  </div>
                )}

                {activeConv.messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700">{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Regular Message or Quote Card */}
                      {msg.isQuote && msg.quoteDetails ? (
                        <div className="w-full max-w-lg bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              Official Commercial Quotation
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Valid {msg.quoteDetails.validityDays} Days
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Item Specification</span>
                              <span className="font-bold text-slate-900 text-sm">{msg.quoteDetails.item}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg">
                              <div>
                                <span className="text-slate-400 text-[10px] block">Order Quantity</span>
                                <span className="font-semibold text-slate-800">{msg.quoteDetails.quantity}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Unit Price (FOB)</span>
                                <span className="font-bold text-slate-900">${msg.quoteDetails.unitPrice} / MT</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Lead Time</span>
                                <span className="font-semibold text-slate-800">{msg.quoteDetails.leadTimeWeeks} Weeks to Dispatch</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Total Binding Price</span>
                                <span className="font-extrabold text-emerald-700 text-sm">
                                  ${msg.quoteDetails.totalPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-200/50">
                              <span className="font-bold text-amber-900">Commercial Terms: </span>
                              {msg.quoteDetails.terms}
                            </div>

                            {/* Quote Action Buttons */}
                            <div className="pt-2 flex items-center justify-between gap-2">
                              {msg.quoteDetails.status === 'accepted' ? (
                                <div className="w-full py-2 bg-emerald-100 text-emerald-900 font-bold text-center rounded-lg text-xs flex items-center justify-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                  Quotation Accepted & PO Drafted
                                </div>
                              ) : (
                                <>
                                  <button
                                    id={`accept-quote-btn-${msg.id}`}
                                    onClick={() => onAcceptQuote(activeConv.id, msg.id)}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Accept Binding Quote
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleQuickReply(
                                        `We received quotation ${msg.quoteDetails?.rfqId}. We would like to propose a 4% volume discount at $${(msg.quoteDetails?.unitPrice || 0) * 0.96}/unit.`
                                      )
                                    }
                                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                                  >
                                    Counter Offer
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Inquiry Prompts */}
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
                  Quick Prompts:
                </span>
                {[
                  'What is your firm lead time?',
                  'Can you send the Material Test Report?',
                  'Are Buy America (BABA) certs included?',
                  'Can we schedule an on-site audit?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(prompt)}
                    className="text-[11px] bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickReply(
                        'Attached: Formal Vance Infrastructure Purchase Specification Rev.B (ASTM-A36-RevB.pdf)'
                      )
                    }
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    title="Attach Spec Sheet or CAD"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <input
                    id="chat-message-input"
                    type="text"
                    placeholder="Type an RFQ inquiry, specification question, or counter..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    className="flex-1 bg-slate-100 border border-transparent focus:border-blue-500 focus:bg-white px-3.5 py-2.5 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-hidden transition-all"
                  />

                  <button
                    id="chat-send-btn"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <p className="text-sm">Select a conversation to begin procurement messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
