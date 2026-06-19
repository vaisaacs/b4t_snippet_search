import React, { useState, useEffect, useMemo } from 'react';
import { FolderPlus, Database, RefreshCw } from 'lucide-react';
import { ClientRecord, ManualSnippetInputs } from './types';
import { DEMO_CLIENTS } from './utils';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import UploadPanel from './components/UploadPanel';

export default function App() {
  const [clients, setClients] = useState<ClientRecord[]>(DEMO_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>(DEMO_CLIENTS[0].clientId);
  const [showImporter, setShowImporter] = useState(false);

  // Maintain custom snippet templates inside active memory per-client
  const [manualInputs, setManualInputs] = useState<ManualSnippetInputs>({
    taskTitle: '',
    purpose: '',
    stepsTaken: '',
    linkCancellationSS: '',
    linkStrategySession: ''
  });

  const activeClient = useMemo(() => {
    return clients.find(c => c.clientId === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  // Synchronize dynamic pre-fills when selecting a different client
  useEffect(() => {
    if (activeClient) {
      setManualInputs({
        taskTitle: `Weekly Status Review - ${activeClient.clientName}`,
        purpose: "Ensuring legal pipeline progression, onboarding compliance, and active retainer monitoring.",
        stepsTaken: "Reviewed trust balance logs, checked timeline for Attorney WC completion",
        linkCancellationSS: "",
        linkStrategySession: ""
      });
    }
  }, [selectedClientId, activeClient?.clientId]);

  const handleDataLoaded = (newRecords: ClientRecord[]) => {
    setClients(newRecords);
    if (newRecords.length > 0) {
      setSelectedClientId(newRecords[0].clientId);
    }
    setShowImporter(false); // Collapsed upon successful load
  };

  const resetToDemoData = () => {
    if (window.confirm('Reset the active list back to the preset Bill4Time high-fidelity samples?')) {
      setClients(DEMO_CLIENTS);
      setSelectedClientId(DEMO_CLIENTS[0].clientId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Dynamic Global Dashboard Title Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-850 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white font-mono font-bold tracking-wider text-sm flex items-center gap-1.5 shadow-sm">
              <Database className="w-4.5 h-4.5" />
              B4T
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Snippet Search & Lookup Panel
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-indigo-500/25 text-indigo-300 rounded border border-indigo-500/25">v2.1</span>
              </h1>
              <p className="text-[10px] text-slate-400">Offline-first portal tracking client care compliance, balances, and welcomelog tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowImporter(!showImporter)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 border ${
                showImporter
                  ? 'bg-slate-850 border-slate-700 text-indigo-400'
                  : 'bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              {showImporter ? 'Hide Importer' : 'Import MySQL CSV'}
            </button>
            
            <button
              type="button"
              onClick={resetToDemoData}
              className="p-2 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-750 bg-slate-850 hover:bg-slate-800 rounded-lg transition"
              title="Reset Sample Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Collapsible Importer Console Accordion */}
        {showImporter && (
          <div className="transition-all duration-300 ease-in-out">
            <UploadPanel 
              onDataLoaded={handleDataLoaded} 
              currentCount={clients.length} 
            />
          </div>
        )}

        {/* Central Swiss Grid Workspace split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column A: Sticky List Selector */}
          <div className="lg:col-span-1 h-fit lg:sticky lg:top-22">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
                <span>Client Directory</span>
                <span>Active: {clients.length}</span>
              </div>
              <ClientList
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
              />
            </div>
          </div>

          {/* Column B: Dynamic Bento Command Cards and Compilation Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
              <span>Selected Case Profile Command Deck</span>
              <span>Compiled locally</span>
            </div>
            
            <ClientDetails
              client={activeClient}
              inputs={manualInputs}
              onInputChange={setManualInputs}
            />
          </div>
          
        </div>
      </main>

      {/* Humble, literal footer context */}
      <footer className="bg-white border-t border-slate-150 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 Office Operations Portal • Compatible with Bill4Time custom reports ETL views</p>
          <p>Created securely without transmitting credentials or exposing private legal records.</p>
        </div>
      </footer>
    </div>
  );
}
