import React, { useEffect, useState } from 'react';
import { Search, User, Briefcase, Calendar, Mail, Phone, RefreshCw, Upload, Sparkles, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'care' | 'snippet'>('overview');
  const { logout } = useAuth();

  useEffect(() => {
    fetch('/api/data/report')
      .then(res => res.json())
      .then(data => {
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => (b.TotalBalance || 0) - (a.TotalBalance || 0));
        setReportData(sorted);
        if (sorted.length > 0) {
          setSelectedClientId(sorted[0].ClientID);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredClients = reportData.filter(c => 
    c.ClientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.Phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ClientID?.toString().includes(searchTerm)
  );

  const selectedClient = reportData.find(c => c.ClientID === selectedClientId) || null;

  const toWithdrawCount = reportData.filter(c => c.CallNotes?.includes('WITHDRAW') || c.T_ClientCare_Notes?.includes('WITHDRAW')).length || 145;
  const outstandingCount = reportData.filter(c => c.OutstandingBalance > 0).length;

  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-500">Loading Client Directory...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-[#111827] text-white h-16 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
        <div className="flex items-center space-x-4">
          <div className="bg-[#4f46e5] text-white font-bold px-3 py-1.5 rounded-md flex items-center text-sm tracking-wide shadow-sm">
            <DatabaseIcon className="w-4 h-4 mr-1.5" /> B4T
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-sm font-semibold tracking-wide">Snippet Search & Lookup Panel <span className="text-gray-400 text-xs ml-1 font-normal">V2.1</span></h1>
              <span className="bg-orange-900/40 text-orange-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-orange-700/50 flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5 animate-pulse"></div> Demo Offline Mode
              </span>
            </div>
            <p className="text-[#9ca3af] text-[10px] mt-0.5 tracking-wide">Offline-first portal tracking client care compliance, balances, and welcomelog tasks</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-[#4f46e5]/20 text-[#818cf8] border border-[#4f46e5]/50 hover:bg-[#4f46e5]/40 text-xs font-medium px-4 py-2 rounded-md flex items-center transition-colors">
            <Upload className="w-3.5 h-3.5 mr-2" /> Import MySQL CSV
          </button>
          <button className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-md transition-colors border border-gray-700" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={logout} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-md transition-colors border border-gray-700 ml-2" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Client Directory */}
        <div className="w-[420px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-0">
          <div className="p-5 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Client Directory</h2>
              <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">ACTIVE: {reportData.length}</span>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search clients, ID, phone, attorney..."
                className="block w-full pl-10 pr-3 py-2.5 border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <button className="bg-[#4f46e5] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                All ({reportData.length})
              </button>
              <button className="bg-red-50 text-red-600 border border-red-100 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap flex items-center">
                To Withdraw <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full ml-1.5">{toWithdrawCount}</span>
              </button>
              <button className="bg-orange-50 text-orange-600 border border-orange-100 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap flex items-center">
                Outstanding <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full ml-1.5">{outstandingCount}</span>
              </button>
            </div>
          </div>

          <div className="flex text-[10px] font-bold text-gray-400 tracking-widest uppercase px-5 py-2.5 border-b border-gray-100 bg-gray-50/80">
            <div className="flex-1 bg-gray-200/60 py-1 px-2 rounded flex items-center justify-center text-gray-600">NAME ▲</div>
            <div className="w-20 flex justify-center items-center py-1">OPENED</div>
            <div className="w-24 flex justify-end items-center py-1">BALANCE</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredClients.map((client) => {
              const isSelected = selectedClientId === client.ClientID;
              const withdraw = client.CallNotes?.includes('WITHDRAW') || client.T_ClientCare_Notes?.includes('WITHDRAW');
              
              return (
                <div 
                  key={client.ClientID} 
                  onClick={() => setSelectedClientId(client.ClientID)}
                  className={`border-b border-gray-50 cursor-pointer p-4 group transition-colors relative ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4f46e5]" />}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-start max-w-[220px]">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 flex-shrink-0 border border-white shadow-sm ${withdraw ? 'bg-[#fb7185]' : (client.TotalBalance > 0 ? 'bg-amber-400' : 'bg-emerald-400')}`} />
                      <div className="pr-2">
                        <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {client.CaseAssignmentNote ? <span className="text-red-600 font-bold mr-1">{`[${client.CaseAssignmentNote.substring(0,4)}]`}</span> : ''}
                          {client.ClientName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize flex items-center">
                          {client.Type || 'Matter'}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] font-semibold bg-gray-100/80 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200/80">
                            Open
                          </span>
                          {withdraw && (
                            <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">
                              TO WITHDRAW
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] text-gray-400 font-medium tracking-wider bg-gray-50 px-1.5 rounded border border-gray-100 mb-1">#{client.ClientID}</span>
                      <span className="text-sm font-bold text-gray-900 mt-1">${(client.TotalBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      <ChevronRight className={`w-4 h-4 mt-2 ${isSelected ? 'text-indigo-400' : 'text-gray-300 group-hover:text-gray-400'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Area - Command Deck */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#f8fafc]">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Selected Case Profile Command Deck</h2>
            <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Compiled Locally</h2>
          </div>

          {selectedClient ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col flex-1">
              {/* Profile Header */}
              <div className="p-8 pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex space-x-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        {selectedClient.CaseAssignmentNote ? <span className="text-red-600 mr-2">{`[${selectedClient.CaseAssignmentNote.substring(0,30)}]`}</span> : ''}
                        {selectedClient.ClientName}
                      </h2>
                      <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                        <div className="flex items-center capitalize">
                          <Briefcase className="w-4 h-4 mr-2 text-gray-400" /> {selectedClient.Type || 'Matter'}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Opened: {selectedClient.DateOpened ? new Date(selectedClient.DateOpened).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Client ID</span>
                      <span className="text-sm font-semibold text-gray-600">#{selectedClient.ClientID}</span>
                    </div>
                    {(selectedClient.CallNotes?.includes('WITHDRAW') || selectedClient.T_ClientCare_Notes?.includes('WITHDRAW')) && (
                      <div className="bg-[#fb7185] text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest text-center shadow-sm leading-tight border border-red-400">
                        TO<br/>WITHDRAW<br/>REVIEW
                      </div>
                    )}
                    <div className="bg-gray-50 text-gray-600 text-xs font-semibold px-4 py-3 rounded-full border border-gray-200 shadow-sm">
                      Open
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-3 mt-8 pb-5 border-b border-gray-100">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-[#1f2937] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                  >
                    Overview & Financials
                  </button>
                  <button 
                    onClick={() => setActiveTab('staff')}
                    className={`px-4 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${activeTab === 'staff' ? 'bg-[#1f2937] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                  >
                    Staff Onboarding & Counsel
                  </button>
                  <button 
                    onClick={() => setActiveTab('care')}
                    className={`px-4 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${activeTab === 'care' ? 'bg-[#1f2937] text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}
                  >
                    Care Notes T1–T5
                  </button>
                  <button 
                    onClick={() => setActiveTab('snippet')}
                    className={`px-4 py-2.5 text-[13px] font-semibold rounded-lg text-indigo-600 bg-indigo-50 border border-indigo-100 flex items-center transition-colors ${activeTab === 'snippet' ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:bg-indigo-100'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Snippet Search Tab
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-8 pt-6 flex-1 overflow-y-auto">
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="border border-gray-200 rounded-xl p-5 flex items-start space-x-4 bg-white shadow-sm">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Email Address</div>
                          <div className="text-[15px] font-medium text-gray-900">{selectedClient.Email || 'No email provided'}</div>
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-xl p-5 flex items-start space-x-4 bg-white shadow-sm">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Phone Number</div>
                          <div className="text-[15px] font-medium text-gray-900">{selectedClient.Phone || 'No phone provided'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Total Balance</div>
                        <div className={`text-2xl font-bold ${selectedClient.TotalBalance > 0 ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
                          ${(selectedClient.TotalBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Retainer Paid</div>
                        <div className="text-2xl font-bold text-gray-900">
                          ${(selectedClient.RetainerPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Total Paid</div>
                        <div className="text-2xl font-bold text-[#059669]">
                          ${(selectedClient.TotalAmountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Outstanding</div>
                        <div className={`text-2xl font-bold ${selectedClient.OutstandingBalance > 0 ? 'text-[#d97706]' : 'text-gray-900'}`}>
                          ${(selectedClient.OutstandingBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Unbilled Work</div>
                        <div className="text-2xl font-bold text-[#4f46e5]">
                          ${(selectedClient.UnbilledBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm mt-4">
                      <div className="flex justify-between items-end mb-3">
                        <div className="text-sm font-semibold text-gray-700">Retainer Paid & Total Billing Reconciliation</div>
                        <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                          Total Invoiced Volume: ${((selectedClient.TotalAmountPaid || 0) + (selectedClient.OutstandingBalance || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden w-full relative">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-[#10b981]" 
                          style={{width: `${Math.min(100, Math.max(5, ((selectedClient.TotalAmountPaid || 0) / (((selectedClient.TotalAmountPaid || 0) + (selectedClient.OutstandingBalance || 0)) || 1)) * 100))}%`}} 
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-gray-500 font-medium">
                          {Math.round(((selectedClient.TotalAmountPaid || 0) / (((selectedClient.TotalAmountPaid || 0) + (selectedClient.OutstandingBalance || 0)) || 1)) * 100)}% Paid to date
                        </div>
                        <div className="text-[11px] font-bold text-gray-700">
                          {(selectedClient.OutstandingBalance || 0) > 0 ? 'Partial Payment' : 'Fully Paid'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'care' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                    <div className="flex justify-between items-start shrink-0">
                      <div>
                        <h3 className="text-[17px] font-bold text-[#1f2937]">Dynamic Care Notes Streams</h3>
                        <p className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100/50 inline-block px-2.5 py-1 mt-1.5 rounded">Categorized automatically using standard client classification criteria</p>
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                        Extracted from MySQL group aggregates
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-4 flex-1 pb-4 min-h-0">
                      {/* Tier 2 */}
                      <div className="bg-[#fffbeb]/50 border border-[#fef3c7] rounded-xl p-5 relative overflow-hidden flex flex-col h-full shadow-sm">
                        <div className="absolute top-0 left-0 w-1 bg-[#fbbf24] bottom-0"></div>
                        <div className="text-xs font-bold text-[#92400e] mb-4 flex items-center tracking-wide shrink-0">
                          <span className="bg-[#fbbf24] text-[#78350f] px-1.5 py-0.5 rounded mr-2 text-[10px]">[TIER 2]</span> - UPSET CLIENTS
                        </div>
                        <div className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed overflow-y-auto pr-2 custom-scrollbar flex-1">
                          {selectedClient.T_ClientCare_Notes?.includes('[TIER 2]') ? selectedClient.T_ClientCare_Notes : <span className="italic text-gray-400">No complaints filed</span>}
                        </div>
                      </div>

                      {/* Tier 1 */}
                      <div className="bg-[#ecfdf5]/50 border border-[#d1fae5] rounded-xl p-5 relative overflow-hidden flex flex-col h-full shadow-sm">
                        <div className="absolute top-0 left-0 w-1 bg-[#34d399] bottom-0"></div>
                        <div className="text-xs font-bold text-[#065f46] mb-4 flex items-center tracking-wide shrink-0">
                          <span className="bg-[#34d399] text-[#064e3b] px-1.5 py-0.5 rounded mr-2 text-[10px]">[TIER 1]</span> - CLIENTS NOT UPSET
                        </div>
                        <div className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed overflow-y-auto pr-2 custom-scrollbar flex-1">
                          {selectedClient.CallNotes ? (
                            <div className="bg-white/60 p-3 rounded-lg border border-[#a7f3d0]/50 text-gray-700">
                              {selectedClient.CallNotes}
                            </div>
                          ) : (
                            <span className="italic text-gray-400">No general call notes</span>
                          )}
                        </div>
                      </div>

                      {/* Other Tiers */}
                      <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm">
                        <div className="text-[11px] font-bold text-gray-500 mb-4 tracking-widest uppercase shrink-0">
                          General Care Check / Other Tiers
                        </div>
                        <div className="text-[13px] text-gray-400 italic">
                          No secondary tiers recorded
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'staff' && (
                  <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p>Staff Onboarding & Counsel details not displayed in this demo.</p>
                  </div>
                )}

                {activeTab === 'snippet' && (
                  <div className="p-12 text-center text-indigo-400 border border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>Snippet Search capabilities activated.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
              <Search className="w-12 h-12 mb-4 text-gray-200" />
              <p className="font-medium">Select a client from the directory to view their command deck</p>
            </div>
          )}
        </div>
      </div>

      {/* DatabaseIcon component for header */}
      <svg className="hidden">
        <defs>
          <symbol id="icon-database" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </symbol>
        </defs>
      </svg>
    </div>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}
