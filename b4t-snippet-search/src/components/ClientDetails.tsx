import React, { useState, useMemo } from 'react';
import { 
  User, Mail, Phone, Calendar, Briefcase, DollarSign, 
  FileText, ShieldCheck, HeartPulse, Sparkles, Clipboard, 
  Clock, CheckCircle, AlertOctagon, RefreshCw, Send, ArrowUpRight
} from 'lucide-react';
import { ClientRecord, ManualSnippetInputs } from '../types';
import { formatCurrency, parseClientCareNotes } from '../utils';
import SnippetGenerator from './SnippetGenerator';

interface ClientDetailsProps {
  client: ClientRecord | undefined;
  inputs: ManualSnippetInputs;
  onInputChange: (inputs: ManualSnippetInputs) => void;
}

type TabType = 'overview' | 'welcome' | 'care' | 'snippet';

export default function ClientDetails({ client, inputs, onInputChange }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const parsedCare = useMemo(() => {
    return client ? parseClientCareNotes(client.tClientCareNotes) : { t1: [], t2: [], t3: [], t4: [], t5: [] };
  }, [client]);

  if (!client) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 h-[550px] shadow-xs">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full animate-bounce">
          <User className="w-8 h-8" />
        </div>
        <div className="max-w-sm space-y-2">
          <h3 className="text-lg font-bold text-slate-800">No client selected</h3>
          <p className="text-xs text-slate-500">
            Use the sidebar on the left to click a client, or upload a new Bill4Time Master report CSV to get started.
          </p>
        </div>
      </div>
    );
  }

  // Calculate invoice paid percentage
  const totalInvoiced = client.totalAmountPaid + client.outstandingBalance;
  const paidPercent = totalInvoiced > 0 ? (client.totalAmountPaid / totalInvoiced) * 100 : 0;

  const isToWithdraw = client.totalBalance >= 2500;

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs space-y-6 p-6">
      {/* Client Quick Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isToWithdraw ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{client.clientName}</h2>
              <span className="text-xs font-semibold font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                Client ID: #{client.clientId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {client.type || 'General Matter'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Opened: {client.dateOpened || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Action Flags */}
        <div className="flex items-center gap-2">
          {isToWithdraw ? (
            <span className="text-xs font-bold px-3 py-1 bg-rose-500 text-white rounded-full flex items-center gap-1 shadow-xs animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5" />
              TO WITHDRAW REVIEW
            </span>
          ) : client.outstandingBalance > 0 ? (
            <span className="text-xs font-bold px-3 py-1 bg-amber-500 text-white rounded-full flex items-center gap-1 shadow-xs">
              <Clock className="w-3.5 h-3.5" />
              OUTSTANDING TERMS
            </span>
          ) : (
            <span className="text-xs font-bold px-3 py-1 bg-emerald-500 text-white rounded-full flex items-center gap-1 shadow-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              PAID IN FULL
            </span>
          )}
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            {client.status}
          </span>
        </div>
      </div>

      {/* Tabs list navigation */}
      <div className="flex items-center border-b border-slate-100 pb-1.5 overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold tracking-wide rounded-lg transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          Overview & Financials
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('welcome')}
          className={`px-4 py-2 text-xs font-semibold tracking-wide rounded-lg transition whitespace-nowrap ${
            activeTab === 'welcome'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          Staff Onboarding & Counsel
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('care')}
          className={`px-4 py-2 text-xs font-semibold tracking-wide rounded-lg transition whitespace-nowrap ${
            activeTab === 'care'
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          Care Notes T1–T5
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('snippet')}
          className={`px-4 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition whitespace-nowrap flex items-center gap-1`}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Snippet Search Tab
        </button>
      </div>

      {/* Tab Contents Frame */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW & FINANCIALS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Contact Bento Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-500" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                  <a href={`mailto:${client.email}`} className="text-sm font-semibold text-slate-700 hover:underline">
                    {client.email || 'N/A'}
                  </a>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center gap-3">
                <Phone className="w-5 h-5 text-indigo-500" />
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                  <a href={`tel:${client.phone}`} className="text-sm font-semibold text-slate-700 hover:underline">
                    {client.phone || 'N/A'}
                  </a>
                </div>
              </div>
            </div>

            {/* Financial Bento Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 relative">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Balance</span>
                <span className={`block text-lg font-bold mt-1 ${isToWithdraw ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatCurrency(client.totalBalance)}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Retainer Paid</span>
                <span className="block text-lg font-bold text-slate-800 mt-1">
                  {formatCurrency(client.retainerPaid)}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Paid</span>
                <span className="block text-lg font-bold text-green-600 mt-1">
                  {formatCurrency(client.totalAmountPaid)}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Outstanding</span>
                <span className="block text-lg font-bold text-amber-600 mt-1">
                  {formatCurrency(client.outstandingBalance)}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 col-span-2 lg:col-span-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Unbilled Work</span>
                <span className="block text-lg font-bold text-indigo-600 mt-1">
                  {formatCurrency(client.unbilledBalance)}
                </span>
              </div>
            </div>

            {/* Paid Ratio Progress Meter */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-600">Retainer Paid & Total Billing Reconciliation</span>
                <span className="font-mono text-slate-400">Total Invoiced Volume: {formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full rounded-r-none transition-all duration-500"
                  style={{ width: `${Math.min(paidPercent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                <span>{paidPercent.toFixed(0)}% Paid to date</span>
                <span className="font-semibold text-slate-700">{client.paymentTerms}</span>
              </div>
            </div>

            {/* Matter stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-semibold text-slate-400 block mb-0.5">Payment Type</span>
                <span className="text-xs font-bold text-slate-700">{client.paymentType || 'Standard'}</span>
              </div>
              <div className="bg-white border rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-semibold text-slate-400 block mb-0.5">Last Payment</span>
                <span className="text-xs font-bold text-slate-700">{client.lastPayment || '$0.00'}</span>
              </div>
              <div className="bg-white border rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-semibold text-slate-400 block mb-0.5">Last Payment Date</span>
                <span className="text-xs font-bold text-slate-700">{client.lastPaymentDate || 'N/A'}</span>
              </div>
              <div className="bg-white border rounded-lg p-3 text-center">
                <span className="text-[9px] uppercase font-semibold text-slate-400 block mb-0.5">Labor Hours</span>
                <span className="text-xs font-bold text-slate-700">{client.totalLaborHours} Hrs ({client.totalBillableHours} Billable)</span>
              </div>
            </div>

            {/* Latest Call Notes Display area */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Latest Call Notes Summary (CRM Log)</span>
              </div>
              <p className="text-xs text-slate-350 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100">
                {client.callNotes || 'No specific call notes logged on file. Generate a check-in using the Care Notes tab.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: STAFF ONBOARDING & WELCOME CALLS */}
        {activeTab === 'welcome' && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-800">Operational Welcome Milestones</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Welcome Call log card */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Admin Welcome Sequence
                  </span>
                  <span className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-full ${client.adminWelcomeCall ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                    {client.adminWelcomeCall ? 'Complete' : 'Pending'}
                  </span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white pb-1">
                    <span className="text-slate-400">Handled By:</span>
                    <span className="font-semibold text-slate-700">{client.adminWelcomeCall || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Completion Date:</span>
                    <span className="font-semibold text-slate-700">{client.adminWelcomeDate || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Atty Welcome call log card */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-violet-600" />
                    Attorney Consultation Check
                  </span>
                  <span className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-full ${client.attyWelcomeDate ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-slate-100 text-slate-400'}`}>
                    {client.attyWelcomeDate ? 'Active' : 'Pending'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white pb-1">
                    <span className="text-slate-400">Date/Time Registered:</span>
                    <span className="font-semibold text-slate-700">{client.attyWelcomeDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Attorney:</span>
                    <span className="font-semibold text-slate-700">{client.assignedTo || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Attorney logs bento */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-4">
              <span className="text-xs font-bold text-slate-700 block">Counsel Assignment & Retention History</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border p-3.5 rounded-lg">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">First Case Intake Attorney</span>
                  <span className="text-xs font-semibold text-slate-700 block mt-1">
                    {client.firstAttorney || client.assignedTo || 'N/A'}
                  </span>
                </div>
                <div className="bg-white border p-3.5 rounded-lg">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Last Active Retained Attorney</span>
                  <span className="text-xs font-semibold text-slate-700 block mt-1">
                    {client.lastAttorney || client.assignedTo || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CARE NOTES T1–T5 COGNITIVE TIMELINES */}
        {activeTab === 'care' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Dynamic Care Notes Streams</h3>
                <p className="text-xs text-slate-500">Categorized automatically using standard client classification criteria</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 rounded text-slate-600">
                Extracted from MySQL group aggregates
              </span>
            </div>

            {/* Render streams beautifully sorted by urgency tiers */}
            <div className="space-y-4">
              {/* Tier 4 Block - Client left a bad/negative review */}
              {parsedCare.t4.length > 0 && (
                <div id="tier-4-panel" className="border border-rose-300 bg-rose-50/75 rounded-xl p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-widest bg-rose-200 px-2.5 py-1 rounded-md">
                      [TIER 4] - Client Left Bad/Negative Review
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 animate-pulse">ACTION REQUIRED</span>
                  </div>
                  <ul className="text-xs text-rose-900 space-y-2 list-disc pl-5 font-medium">
                    {parsedCare.t4.map((note, idx) => (
                      <li key={idx} className="leading-relaxed">{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tier 3 Block - Cancellation of service requests */}
              {parsedCare.t3.length > 0 && (
                <div id="tier-3-panel" className="border border-orange-300 bg-orange-50/75 rounded-xl p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-orange-850 uppercase tracking-widest bg-orange-200 px-2.5 py-1 rounded-md">
                      [TIER 3] - Cancellation of Service Request
                    </span>
                    <span className="text-[10px] font-bold text-orange-700">RETENTION REVIEW</span>
                  </div>
                  <ul className="text-xs text-orange-900 space-y-2 list-none pl-1 space-y-1.5">
                    {parsedCare.t3.map((note, idx) => (
                      <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                        <span className="text-orange-500 shrink-0 mt-1">⚠️</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Tier 2: Upset clients */}
                <div id="tier-2-panel" className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block border-b border-amber-100 pb-2">
                    [TIER 2] - Upset Clients
                  </span>
                  {parsedCare.t2.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">No complaints filed</span>
                  ) : (
                    <ul className="text-[11px] text-amber-900 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                      {parsedCare.t2.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Tier 1: Clients who are not upset */}
                <div id="tier-1-panel" className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 space-y-3 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block border-b border-emerald-100 pb-2">
                    [TIER 1] - Clients Not Upset
                  </span>
                  {parsedCare.t1.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">None on file</span>
                  ) : (
                    <ul className="text-[11px] text-emerald-950 space-y-2 list-disc pl-4 leading-relaxed">
                      {parsedCare.t1.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Other/Uncategorized Fallback (e.g. general collections or Tier 5) */}
                <div id="tier-5-panel" className="border border-slate-150 bg-slate-50/80 rounded-xl p-4 space-y-3 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2">
                    General Care Check / Other Tiers
                  </span>
                  {parsedCare.t5.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">No secondary tiers recorded</span>
                  ) : (
                    <ul className="text-[11px] text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                      {parsedCare.t5.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: COMPILER SNIPPET ROW */}
        {activeTab === 'snippet' && (
          <SnippetGenerator
            client={client}
            inputs={inputs}
            onInputChange={onInputChange}
          />
        )}
      </div>
    </div>
  );
}
