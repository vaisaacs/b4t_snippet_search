import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, DollarSign, RefreshCw, Calendar, Briefcase, ChevronRight, User } from 'lucide-react';
import { ClientRecord } from '../types';
import { formatCurrency } from '../utils';

interface ClientListProps {
  clients: ClientRecord[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
}

type SortField = 'name' | 'dateOpened' | 'balance';

export default function ClientList({ clients, selectedClientId, onSelectClient }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [attorneyFilter, setAttorneyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic lists from active dataset
  const uniqueAttorneys = useMemo(() => {
    const list = clients.map(c => c.assignedTo).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [clients]);

  // Compute stats for current filter lists
  const filterStats = useMemo(() => {
    return {
      toWithdraw: clients.filter(c => c.totalBalance >= 2500).length,
      outstanding: clients.filter(c => c.outstandingBalance > 0).length,
      paidInFull: clients.filter(c => c.paymentTerms?.toLowerCase() === 'paid in full').length,
    };
  }, [clients]);

  // Handle Search & Filtering
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Search query match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(q) ||
        c.clientId.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.assignedTo && c.assignedTo.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'TO_WITHDRAW') {
        result = result.filter(c => c.totalBalance >= 2500);
      } else if (statusFilter === 'OUTSTANDING') {
        result = result.filter(c => c.outstandingBalance > 0);
      } else if (statusFilter === 'PAID_IN_FULL') {
        result = result.filter(c => c.paymentTerms?.toLowerCase() === 'paid in full');
      } else {
        result = result.filter(c => c.status.toLowerCase().includes(statusFilter.toLowerCase()));
      }
    }

    // Attorney filter
    if (attorneyFilter !== 'ALL') {
      result = result.filter(c => c.assignedTo === attorneyFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.clientName.localeCompare(b.clientName);
      } else if (sortBy === 'dateOpened') {
        comparison = a.dateOpened.localeCompare(b.dateOpened);
      } else if (sortBy === 'balance') {
        comparison = a.totalBalance - b.totalBalance;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, searchTerm, statusFilter, attorneyFilter, sortBy, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending when changing sort field
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
      {/* Search Input Box */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients, ID, phone, attorney..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
          />
        </div>

        {/* Rapid filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-full border transition whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('TO_WITHDRAW')}
            className={`px-3 py-1 rounded-full border transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'TO_WITHDRAW'
                ? 'bg-rose-600 text-white border-rose-600 font-medium'
                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
            }`}
          >
            <span>To Withdraw</span>
            <span className="text-[10px] bg-rose-200 text-rose-800 rounded-full px-1.5 font-bold">
              {filterStats.toWithdraw}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OUTSTANDING')}
            className={`px-3 py-1 rounded-full border transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'OUTSTANDING'
                ? 'bg-amber-600 text-white border-amber-600 font-medium'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
            }`}
          >
            <span>Outstanding</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 rounded-full px-1.5 font-bold">
              {filterStats.outstanding}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg border transition ${
              showFilters || attorneyFilter !== 'ALL'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle advanced filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Collapsible filters panel */}
        {(showFilters || attorneyFilter !== 'ALL') && (
          <div className="bg-white border border-slate-100 rounded-lg p-3 space-y-3 shadow-xs">
            {/* Attorney Filter */}
            <div>
              <label htmlFor="list-attorney-select" className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Filter by Assigned Attorney
              </label>
              <select
                id="list-attorney-select"
                value={attorneyFilter}
                onChange={(e) => setAttorneyFilter(e.target.value)}
                className="w-full text-xs p-1.5 border border-slate-200 rounded-md bg-white text-slate-700"
              >
                <option value="ALL">All Attorneys ({uniqueAttorneys.length})</option>
                {uniqueAttorneys.map((atty) => (
                  <option key={atty} value={atty}>
                    {atty}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Payment Terms Filter */}
            <div>
              <label htmlFor="list-terms-select" className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Filter by Terms
              </label>
              <select
                id="list-terms-select"
                value={statusFilter === 'PAID_IN_FULL' ? 'PAID_IN_FULL' : 'ALL'}
                onChange={(e) => {
                  if (e.target.value === 'PAID_IN_FULL') {
                    setStatusFilter('PAID_IN_FULL');
                  } else {
                    setStatusFilter('ALL');
                  }
                }}
                className="w-full text-xs p-1.5 border border-slate-200 rounded-md bg-white text-slate-700"
              >
                <option value="ALL">All Payments Statuses</option>
                <option value="PAID_IN_FULL">Paid in Full ({filterStats.paidInFull})</option>
              </select>
            </div>
          </div>
        )}

        {/* Sorters Grid */}
        <div className="grid grid-cols-3 gap-1 border-t border-slate-200 pt-2.5">
          <button
            type="button"
            onClick={() => toggleSort('name')}
            className={`text-[10px] py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition uppercase tracking-wider ${
              sortBy === 'name' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span>Name</span>
            {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('dateOpened')}
            className={`text-[10px] py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition uppercase tracking-wider ${
              sortBy === 'dateOpened' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span>Opened</span>
            {sortBy === 'dateOpened' && (sortOrder === 'asc' ? '▲' : '▼')}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('balance')}
            className={`text-[10px] py-1 px-1.5 rounded flex items-center justify-center gap-1 font-semibold transition uppercase tracking-wider ${
              sortBy === 'balance' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span>Balance</span>
            {sortBy === 'balance' && (sortOrder === 'asc' ? '▲' : '▼')}
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
        {filteredAndSortedClients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm space-y-1">
            <p className="font-medium text-slate-500">No clients matched</p>
            <p className="text-xs">Adjust your search query or filters.</p>
          </div>
        ) : (
          filteredAndSortedClients.map((client) => {
            const isSelected = client.clientId === selectedClientId;
            const hasOverdrawnBalance = client.totalBalance >= 2500;

            return (
              <button
                key={client.clientId}
                onClick={() => onSelectClient(client.clientId)}
                className={`w-full text-left p-4 transition flex items-start gap-3 relative border-l-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-600'
                    : 'bg-white hover:bg-slate-50/50 border-transparent'
                }`}
              >
                {/* Status Indicator */}
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    hasOverdrawnBalance
                      ? 'bg-rose-500 animate-pulse'
                      : client.outstandingBalance > 0
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  title={hasOverdrawnBalance ? 'Balance >= $2500 limit reached' : 'Stable status'}
                />

                {/* Profile Brief Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 text-sm truncate">
                      {client.clientName}
                    </span>
                    <span className="text-[10px] font-semibold font-mono text-slate-400 bg-slate-100 rounded px-1 shrink-0">
                      #{client.clientId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                    <span className="truncate">{client.type || 'Legal Matter'}</span>
                    <span className="font-semibold text-slate-700 shrink-0">
                      {formatCurrency(client.totalBalance)}
                    </span>
                  </div>

                  {/* Operational indicators */}
                  <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {client.status}
                    </span>
                    {hasOverdrawnBalance && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded uppercase tracking-wider">
                        To Withdraw
                      </span>
                    )}
                    {client.paymentTerms?.toLowerCase() === 'paid in full' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded uppercase tracking-wider">
                        Full
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
