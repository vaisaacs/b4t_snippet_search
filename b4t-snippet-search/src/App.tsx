import React, { useState, useEffect, useMemo } from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { ClientRecord, ManualSnippetInputs } from './types';
import { DEMO_CLIENTS } from './utils';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import Auth from './components/Auth';
import AddUserModal from './components/AddUserModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [clients, setClients] = useState<ClientRecord[]>(DEMO_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>(DEMO_CLIENTS[0].clientId);
  const [isLive, setIsLive] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'disabled' | 'inoffice'>('active');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

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

  // Try to load real data initially from backend (Neon DB)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let active = true;
    const fetchLiveSync = async () => {
      setLoadingInitial(true);
      try {
        let endpoint = '/api/bill4time/sync';
        if (viewMode === 'disabled') endpoint = '/api/bill4time/sync_disabled';
        else if (viewMode === 'inoffice') endpoint = '/api/bill4time/sync_inoffice';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const records = Array.isArray(data) ? data : data.records;
          const syncTime = data.lastSync || null;
          
          if (active && Array.isArray(records) && records.length > 0) {
            setClients(records);
            setSelectedClientId(records[0].clientId);
            setIsLive(true);
            setLastSyncDate(syncTime);
            console.log(`[Startup Connect] Successfully auto-fetched ${records.length} live records from Neon DB!`);
          } else if (active && Array.isArray(records) && records.length === 0) {
            setClients(DEMO_CLIENTS); // Fallback to avoid empty state crashes
            setSelectedClientId(DEMO_CLIENTS[0].clientId);
            setIsLive(false);
            console.warn('[Startup Connect] DB sync endpoint returned 0 records. Fallback to demo data.');
          }
        } else {
           console.warn('[Startup Connect] DB sync endpoint returned non-OK status. Fallback to demo data.');
        }
      } catch (err) {
        console.warn('[Startup Connect] Server offline, missing NEON_DATABASE_URL credentials, or connection timeout. Showing sandbox demo data.', err);
      } finally {
        if (active) {
          setLoadingInitial(false);
        }
      }
    };

    fetchLiveSync();
    return () => {
      active = false;
    };
  }, [isAuthenticated, viewMode]);

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

  const resetToDemoData = () => {
    if (window.confirm('Reset the active list back to the preset high-fidelity samples?')) {
      setClients(DEMO_CLIENTS);
      setSelectedClientId(DEMO_CLIENTS[0].clientId);
      setIsLive(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoggedInUser('');
    setIsAdmin(false);
  };

  if (!isAuthenticated) {
    return <Auth onLogin={(username, adminFlag) => {
      setIsAuthenticated(true);
      setLoggedInUser(username);
      setIsAdmin(adminFlag);
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} />
      {/* Dynamic Global Dashboard Title Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-850 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white font-mono font-bold tracking-wider text-sm flex items-center gap-1.5 shadow-sm">
              <Database className="w-4.5 h-4.5" />
              B4T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">
                  Snippet Search & Lookup Panel
                </h1>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-indigo-500/25 text-indigo-300 rounded border border-indigo-500/25">v2.1</span>
                
                {/* Live connection badge indicator */}
                {loadingInitial ? (
                  <span className="text-[9px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Checking pipeline...
                  </span>
                ) : isLive ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-medium animate-fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live API Connected
                    </span>
                    {lastSyncDate && (
                      <span className="text-[9px] text-slate-400 font-medium">
                        Last Updated: {new Date(lastSyncDate).toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Demo Offline Mode
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Secure Live Portal tracking client care compliance, balances, and welcomelog tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isLive && !loadingInitial && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-medium">
                <AlertCircle className="w-4 h-4" />
                Add NEON_DATABASE_URL to AI Studio Secrets to sync live
              </div>
            )}
            
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="text-xs font-semibold px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-lg transition"
              >
                Add User
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`text-xs font-semibold px-3 py-2 border rounded-lg transition ${
                viewMode === 'active'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
              }`}
            >
              Active
            </button>

            <button
              type="button"
              onClick={() => setViewMode('disabled')}
              className={`text-xs font-semibold px-3 py-2 border rounded-lg transition ${
                viewMode === 'disabled' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
              }`}
            >
              Disabled
            </button>

            <button
              type="button"
              onClick={() => setViewMode('inoffice')}
              className={`text-xs font-semibold px-3 py-2 border rounded-lg transition ${
                viewMode === 'inoffice' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
              }`}
            >
              In-Office
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-semibold px-3 py-2 bg-indigo-600 border border-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync DB Live
            </button>
            
            <button
              type="button"
              onClick={resetToDemoData}
              className="p-2 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-750 bg-slate-850 hover:bg-slate-800 rounded-lg transition"
              title="Reset Sample Data"
            >
              <Database className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition ml-2 shadow-xs border border-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
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
