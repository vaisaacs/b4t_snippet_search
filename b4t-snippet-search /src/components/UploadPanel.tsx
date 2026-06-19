import React, { useState, useRef } from 'react';
import { Upload, Clipboard, Code, AlertTriangle, Check, BookOpen, Key, Database, RefreshCw } from 'lucide-react';
import { convertCsvToClientRecords } from '../utils';
import { ClientRecord } from '../types';

interface UploadPanelProps {
  onDataLoaded: (records: ClientRecord[]) => void;
  currentCount: number;
}

export default function UploadPanel({ onDataLoaded, currentCount }: UploadPanelProps) {
  const [csvText, setCsvText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [syncMode, setSyncMode] = useState<'csv' | 'api'>('csv');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextParse = () => {
    try {
      if (!csvText.trim()) {
        setStatusMessage({ type: 'error', text: 'Please enter or paste CSV content first.' });
        return;
      }
      const records = convertCsvToClientRecords(csvText);
      if (records.length === 0) {
        setStatusMessage({ type: 'error', text: 'No client records were found. Check if the headers match the standard Bill4Time Master report.' });
        return;
      }
      onDataLoaded(records);
      setStatusMessage({ type: 'success', text: `Successfully loaded ${records.length} client records!` });
      setCsvText('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Parsing failed: ${err?.message || 'Invalid format'}` });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const records = convertCsvToClientRecords(text);
        if (records.length === 0) {
          setStatusMessage({ type: 'error', text: 'No valid rows found. Ensure CSV has correct Bill4Time table headers.' });
          return;
        }
        onDataLoaded(records);
        setStatusMessage({ type: 'success', text: `Successfully loaded ${records.length} client records from file!` });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: `Failed parsing file: ${err?.message || 'Invalid CSV structure'}` });
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          const records = convertCsvToClientRecords(text);
          if (records.length === 0) {
            setStatusMessage({ type: 'error', text: 'No client records mapped. Check column headers.' });
            return;
          }
          onDataLoaded(records);
          setStatusMessage({ type: 'success', text: `Successfully parsed ${records.length} records dropped directly!` });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Parsing failure: ${err?.message}` });
        }
      };
      reader.readAsText(file);
    }
  };

  // Live Sync request against Express server
  const handleLiveSassSync = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: null, text: '' });
    
    try {
      const response = await fetch('/api/bill4time/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: apiKeyInput })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server rejected the live API synchronizer call');
      }

      onDataLoaded(data);
      setStatusMessage({
        type: 'success',
        text: `Successfully downloaded from Bill4Time APIs! Reconstructed, joined, and loaded ${data.length} client files seamlessly.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `API sync pipeline failure: ${err?.message || 'Check firewalls / key authenticity'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const copySqlQuery = () => {
    const sql = `SELECT
    ClientName AS \`Client Name\`,
    Email AS \`Email\`,
    Phone AS \`Phone\`,
    CAST(COALESCE(TotalBalance, 0) AS DECIMAL(15,2)) AS \`Total Balance\`,
    CAST(COALESCE(RetainerPaid, 0) AS DECIMAL(15,2)) AS \`Retainer Paid\`,
    CAST(COALESCE(TotalAmountPaid, 0) AS DECIMAL(15,2)) AS \`Total Amount Paid\`,
    Status AS \`Status\`,
    AssignedTo AS \`Assigned To\`,
    CAST(COALESCE(OutstandingBalance, 0) AS DECIMAL(15,2)) AS \`Outstanding Balance\`,
    CAST(COALESCE(UnbilledBalance, 0) AS DECIMAL(15,2)) AS \`Unbilled Balance\`,
    DateOpened AS \`Date Opened\`,
    ClientID AS \`Client ID\`,
    Type AS \`Type\`,
    PaymentType AS \`Payment Type\`,
    PaymentTerms AS \`Payment Terms\`,
    Last5Amounts AS \`Last Payment\`,
    Last5Dates AS \`Last Payment Date\`,
    ROUND(COALESCE(TotalLaborHours, 0), 2) AS \`Total Labor Hours\`,
    ROUND(COALESCE(TotalBillableHours, 0), 2) AS \`Total Billable Hours\`,
    FirstAttorney AS \`First Attorney\`,
    LastAttorney AS \`Last Attorney\`,
    AdminWelcomeCall AS \`Admin Welcome Call\`,
    AdminWelcomeDate AS \`Date Of Admin Welcome Call\`,
    AttyWelcomeDate AS \`Date Time Of Atty WC\`,
    CallNotes AS \`Call_Notes_Plain\`,
    T_ClientCare_Notes AS \`T_ClientCare_Notes\`
FROM dyn_snippet_search_master
ORDER BY ClientName ASC;`;

    navigator.clipboard.writeText(sql);
    alert('SQL query copied to clipboard! Paste it inside your virtual desktop DB connection.');
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 id="import-title" className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Importer & Dynamic ETL Pipelines
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose whether to load local MySQL records exported via virtual desktop, or call secure server-side APIs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
            {currentCount} Clients Active
          </span>
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="text-xs flex items-center gap-1 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 transition font-medium"
          >
            <Code className="w-3.5 h-3.5" />
            {showSqlGuide ? 'Hide ETL MySQL Schema' : 'Get MySQL ETL Query'}
          </button>
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="flex border-b border-slate-100 p-0.5 space-x-1 bg-slate-100/60 rounded-lg max-w-sm">
        <button
          type="button"
          onClick={() => setSyncMode('csv')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition ${
            syncMode === 'csv'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:bg-slate-200/50'
          }`}
        >
          📄 Option A: CRM CSV Loader
        </button>
        <button
          type="button"
          onClick={() => setSyncMode('api')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition ${
            syncMode === 'api'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:bg-slate-200/50'
          }`}
        >
          ⚡ Option B: Secure Live API Sync
        </button>
      </div>

      {/* SQL Guide Section */}
      {showSqlGuide && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-700 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">SQL ETL Script</span>
            <button
              type="button"
              onClick={copySqlQuery}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-[11px] transition text-indigo-600 font-sans"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copy Query
            </button>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed max-h-48 text-slate-600 p-2 bg-white rounded border border-slate-100">
{`SELECT 
    ClientName AS \`Client Name\`,
    Email AS \`Email\`,
    Phone AS \`Phone\`,
    TotalBalance AS \`Total Balance\`,
    RetainerPaid AS \`Retainer Paid\`,
    TotalAmountPaid AS \`Total Amount Paid\`,
    Status AS \`Status\`,
    AssignedTo AS \`Assigned To\`,
    OutstandingBalance AS \`Outstanding Balance\`,
    UnbilledBalance AS \`Unbilled Balance\`,
    DateOpened AS \`Date Opened\`,
    ClientID AS \`Client ID\`,
    Type AS \`Type\`,
    PaymentType AS \`Payment Type\`,
    PaymentTerms AS \`Payment Terms\`,
    Last5Amounts AS \`Last Payment\`,
    Last5Dates AS \`Last Payment Date\`...`}
          </pre>
          <div className="flex gap-2 items-start font-sans text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              To populate live data securely, run this query inside your MySQL virtual desktop database, export the output grid as a standard <span className="font-semibold">CSV</span> and paste or drag-and-drop it below! This avoids all API and firewall issues.
            </p>
          </div>
        </div>
      )}

      {/* Content based on selected mode */}
      {syncMode === 'csv' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Upload Column */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer relative ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/30'
                : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-800 text-sm">Drag & Drop CRM CSV Export</span>
            <span className="text-xs text-slate-500 mt-1">or click to browse your desktop storage</span>
            <span className="text-[10px] text-slate-400 mt-3 uppercase tracking-wider font-bold bg-slate-100 px-2 py-0.5 rounded">
              Supports exact query exports
            </span>
          </div>

          {/* Copy Paste Column */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>Option B: Direct Copy-Paste CSV Grid</span>
              <span className="text-xs text-slate-400 font-normal">Includes headers</span>
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste your CSV row stream directly here..."
              className="text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[100px] max-h-[140px] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-y"
            />
            <button
              type="button"
              onClick={handleTextParse}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs py-2 px-3 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Parse & Refresh Active Memory
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/30 space-y-4 animate-fade-in">
          <div id="api-panel-header" className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-100/60 text-indigo-700 rounded-lg mt-0.5">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-800 block">Direct API Live Collector</span>
              <span className="text-xs text-slate-500 block">
                Connects directly to the official <span className="font-medium text-indigo-600">secure.bill4time.com/b4t-api</span> to reconstruct tables on the fly.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Transient Bill4Time API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter secure API secret to override env defaults..."
                  className="w-full bg-white border border-slate-200 text-xs font-mono p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-700"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleLiveSassSync}
              disabled={isSyncing}
              className={`w-full py-2.5 px-4 font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-2 ${
                isSyncing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Accessing API & Compiling View...' : 'One-Click Live Sync'}
            </button>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed bg-white/70 rounded-lg p-3 border border-slate-150">
            <span className="font-semibold text-slate-700 block mb-1">How it compiles behind the scenes:</span>
            Our server-side node controller acts as your automated ETL orchestrator. It executes concurrent parallel fetches across five separate endpoints: <span className="font-mono text-xs">/clients</span>, <span className="font-mono text-xs">/projects</span>, <span className="font-mono text-xs">/clientnotes</span>, <span className="font-mono text-xs">/paymentsandbalanceadjustments</span>, and <span className="font-mono text-xs">/invoices</span>. It aggregates them synchronously, and formats the output client records. This is identical to running the SQL query inside your virtual desktop storage.
          </div>
        </div>
      )}

      {/* Success/Error Alert Overlay */}
      {statusMessage.type && (
        <div
          className={`p-3.5 rounded-lg border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-5 border-emerald-100 text-emerald-800'
              : 'bg-rose-5 border-rose-100 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1 font-medium">{statusMessage.text}</span>
          <button
            type="button"
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest pl-2"
            onClick={() => setStatusMessage({ type: null, text: '' })}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
