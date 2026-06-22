import React, { useMemo } from 'react';
import { Copy, FileSpreadsheet, LayoutIcon, CheckSquare, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { ClientRecord, ManualSnippetInputs } from '../types';
import { formatCurrency, parseClientCareNotes } from '../utils';

interface SnippetGeneratorProps {
  client: ClientRecord;
  inputs: ManualSnippetInputs;
  onInputChange: (inputs: ManualSnippetInputs) => void;
}

export default function SnippetGenerator({ client, inputs, onInputChange }: SnippetGeneratorProps) {
  const [copiedType, setCopiedType] = React.useState<'tab' | 'text' | null>(null);

  // Parse care notes to populate T1-T5 inside the compiled snippet
  const parsedCare = useMemo(() => {
    return parseClientCareNotes(client.tClientCareNotes);
  }, [client]);

  const handleInputChange = (field: keyof ManualSnippetInputs, value: string) => {
    onInputChange({
      ...inputs,
      [field]: value
    });
  };

  const handleCheckStep = (stepText: string, isChecked: boolean) => {
    const currentSteps = inputs.stepsTaken
      ? inputs.stepsTaken.split(', ').map(s => s.trim()).filter(Boolean)
      : [];
    
    let updatedSteps: string[];
    if (isChecked) {
      updatedSteps = [...currentSteps, stepText];
    } else {
      updatedSteps = currentSteps.filter(s => s !== stepText);
    }
    
    handleInputChange('stepsTaken', updatedSteps.join(', '));
  };

  const sampleSteps = [
    "Reviewed current trust and clientCare flags",
    "Verified welcome call logs & atty timeline",
    "Sent billing summary statement as requested",
    "Drafted litigation milestone checklist",
    "Negotiated payment arrangement threshold"
  ];

  // Helper formatting for T1-T5 lists inside snippet block
  const formatCareNoteSnippetList = (notes: string[]): string => {
    if (notes.length === 0) return 'None on file';
    return notes.map(n => `* ${n}`).join('\n');
  };

  // Compile exact 1-row Tab-Separated layout to copy-paste into Google Sheets cells!
  const tabSeparatedSnippet = useMemo(() => {
    const t1Text = parsedCare.t1.join('; ') || 'None';
    const t2Text = parsedCare.t2.join('; ') || 'None';
    const t3Text = parsedCare.t3.join('; ') || 'None';
    const t4Text = parsedCare.t4.join('; ') || 'None';
    const t5Text = parsedCare.t5.join('; ') || 'None';

    const columns = [
      client.clientName,
      client.email,
      client.phone,
      formatCurrency(client.totalBalance),
      formatCurrency(client.retainerPaid),
      formatCurrency(client.totalAmountPaid),
      client.status,
      client.assignedTo,
      formatCurrency(client.outstandingBalance),
      formatCurrency(client.unbilledBalance),
      client.dateOpened,
      client.clientId,
      client.type,
      client.paymentType,
      client.paymentTerms,
      client.lastPayment || 'N/A',
      client.lastPaymentDate || 'N/A',
      `${client.totalLaborHours} Hrs`,
      `${client.totalBillableHours} Hrs`,
      inputs.taskTitle,
      inputs.purpose,
      client.clientName,
      client.email,
      client.phone,
      client.firstAttorney || 'N/A',
      client.lastAttorney || 'N/A',
      client.adminWelcomeCall || 'N/A',
      client.adminWelcomeDate || 'N/A',
      client.assignedTo,
      client.attyWelcomeDate || 'N/A',
      formatCurrency(client.retainerPaid),
      formatCurrency(client.totalBalance),
      client.callNotes || 'N/A',
      inputs.stepsTaken || 'Pending review',
      inputs.linkCancellationSS || 'No Cancellation SS Linked',
      inputs.linkStrategySession || 'No Strategy Session Linked',
      t1Text,
      t2Text,
      t3Text,
      t4Text,
      t5Text
    ];

    return columns.join('\t');
  }, [client, inputs, parsedCare]);

  // Compile formatted, high-legibility layout for copy-pasting to Slack, email, or Clio task body
  const textDisplaySnippet = useMemo(() => {
    return `Client Name:\t${client.clientName}
Email Address:\t${client.email}
Phone Number:\t${client.phone}
Total Balance:\t${formatCurrency(client.totalBalance)}
Retainer Paid:\t${formatCurrency(client.retainerPaid)}
Total Amount Paid:\t${formatCurrency(client.totalAmountPaid)}
Status:\t${client.status}
Assigned Attorney:\t${client.assignedTo}
Outstanding Balance:\t${formatCurrency(client.outstandingBalance)}
Unbilled Balance:\t${formatCurrency(client.unbilledBalance)}
Date Opened:\t${client.dateOpened}
Client ID:\t${client.clientId}
Matter Type:\t${client.type}
Payment Type:\t${client.paymentType}
Payment Terms:\t${client.paymentTerms}
Last 5 Payment:\t${client.lastPayment || 'N/A'}
Last Payment Date:\t${client.lastPaymentDate || 'N/A'}
Total Labor Hours:\t${client.totalLaborHours} Hours
Total Billable Hours:\t${client.totalBillableHours} Hours

Task title:\t${inputs.taskTitle || 'N/A'}
Purpose:\t${inputs.purpose || 'N/A'}
First Attorney:\t${client.firstAttorney || 'N/A'}
Last Attorney:\t${client.lastAttorney || 'N/A'}
Admin Welcome Call:\t${client.adminWelcomeCall || 'N/A'}
Date of Admin Welcome Call:\t${client.adminWelcomeDate || 'N/A'}
Assigned to Attorney:\t${client.assignedTo}
Date and Time of Atty WC:\t${client.attyWelcomeDate || 'N/A'}
Retainer Amount Paid:\t${formatCurrency(client.retainerPaid)}
Balance:\t${formatCurrency(client.totalBalance)}
Latest Call Note:\t${client.callNotes || 'None recorded'}
Steps Taken:\t${inputs.stepsTaken || 'N/A'}
Link to Cancellation SS:\t${inputs.linkCancellationSS || 'N/A'}
Link to Strategy Session:\t${inputs.linkStrategySession || 'N/A'}

T1 Client Care Notes:
${formatCareNoteSnippetList(parsedCare.t1)}

T2 Client Care Notes:
${formatCareNoteSnippetList(parsedCare.t2)}

T3 Client Care Notes:
${formatCareNoteSnippetList(parsedCare.t3)}

T4 Client Care Notes:
${formatCareNoteSnippetList(parsedCare.t4)}

T5 Client Care Notes:
${formatCareNoteSnippetList(parsedCare.t5)}`;
  }, [client, inputs, parsedCare]);

  // Single action handling copy triggers
  const handleCopy = (text: string, type: 'tab' | 'text') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-100/50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="font-semibold text-slate-800 text-sm">Snippet Search Generator</h3>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          Template Active
        </span>
      </div>

      {/* Manual Input Fields Overlay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="input-task-title" className="text-xs font-semibold text-slate-600">Task Title</label>
          <input
            id="input-task-title"
            type="text"
            value={inputs.taskTitle}
            onChange={(e) => handleInputChange('taskTitle', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="E.g., Client Care Escalation review..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="input-purpose" className="text-xs font-semibold text-slate-600">Purpose</label>
          <input
            id="input-purpose"
            type="text"
            value={inputs.purpose}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="E.g., Routine touchpoint regarding court milestone..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="input-cancel-link" className="text-xs font-semibold text-slate-600">Link to Cancellation SS</label>
          <input
            id="input-cancel-link"
            type="text"
            value={inputs.linkCancellationSS}
            onChange={(e) => handleInputChange('linkCancellationSS', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="E.g., https://drive.google.com/..."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="input-strategy-link" className="text-xs font-semibold text-slate-600">Link to Strategy Session</label>
          <input
            id="input-strategy-link"
            type="text"
            value={inputs.linkStrategySession}
            onChange={(e) => handleInputChange('linkStrategySession', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="E.g., https://drive.google.com/..."
          />
        </div>

        {/* Steps Taken Checklist Option */}
        <div className="md:col-span-2 space-y-2 border-t border-slate-200 pt-3.5">
          <label htmlFor="input-steps-taken" className="text-xs font-semibold text-slate-600 block">Steps Taken (Select or Type below)</label>
          
          <div className="flex flex-wrap gap-1.5">
            {sampleSteps.map((step) => {
              const isChecked = inputs.stepsTaken.includes(step);
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleCheckStep(step, !isChecked)}
                  className={`text-[10px] px-2.5 py-1 rounded transition flex items-center gap-1 font-medium ${
                    isChecked
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className={`w-3 h-3 ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {step}
                </button>
              );
            })}
          </div>

          <input
            id="input-steps-taken"
            type="text"
            value={inputs.stepsTaken}
            onChange={(e) => handleInputChange('stepsTaken', e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded bg-white text-slate-800 font-mono mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Manually typed actions, comma-separated..."
          />
        </div>
      </div>

      {/* Compiler Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
        {/* Cell Paste Format (Perfect for Excel/Google Sheets copy paste) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets Single-Row copy</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Selects all columns tab-separated. Paste into a single Google Sheet row to instantly auto-fill all 42 columns perfectly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(tabSeparatedSnippet, 'tab')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs ${
              copiedType === 'tab'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {copiedType === 'tab' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Copied Grid row!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Sheet Grid Row
              </>
            )}
          </button>
        </div>

        {/* Text Area layout (Perfect for Slack/Emails/Clio task boards) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <LayoutIcon className="w-4 h-4 text-indigo-600" />
              <span>Copy Full Admin Review Text</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Copies a beautiful, structured text report showing T1-T5 Client care notes and complete financial summaries sorted neatly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(textDisplaySnippet, 'text')}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs ${
              copiedType === 'text'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            {copiedType === 'text' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Copied Snippet Log!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Full Snippet Log
              </>
            )}
          </button>
        </div>
      </div>

      {/* Snippet Console Monitor Accordion */}
      <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-lg overflow-x-auto border border-slate-800 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-[10px] text-slate-500 font-sans uppercase font-bold">
          <span>Snippet Compiler Output Log Monitor</span>
          <span className="text-emerald-500/80 animate-pulse">● Live Stream ready</span>
        </div>
        <pre className="max-h-36 overflow-y-auto leading-relaxed text-slate-300">
          {textDisplaySnippet}
        </pre>
      </div>
    </div>
  );
}
