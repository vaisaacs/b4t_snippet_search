import { ClientRecord, ClientCareNotesParsed } from './types';

// Premium high-fidelity mock dataset mimicking the MySQL snippet query response
export const DEMO_CLIENTS: ClientRecord[] = [
  {
    clientId: "10984",
    clientName: "David Jenkins",
    email: "david.jenkins@example.com",
    phone: "248-555-0143",
    totalBalance: 4500.00,
    retainerPaid: 1500.00,
    totalAmountPaid: 2500.00,
    status: "Open - Paying",
    assignedTo: "Jessica Miller, Esq.",
    outstandingBalance: 2000.00,
    unbilledBalance: 2500.00,
    dateOpened: "2023-04-12",
    type: "Divorce with Children",
    paymentType: "Hourly",
    paymentTerms: "Partial Payment",
    lastPayment: "$1,000.00",
    lastPaymentDate: "2026-05-10",
    totalLaborHours: 18.5,
    totalBillableHours: 15.0,
    firstAttorney: "Mark Robbins",
    lastAttorney: "Jessica Miller",
    adminWelcomeCall: "Sarah Conner",
    adminWelcomeDate: "2023-04-13",
    attyWelcomeDate: "2023-04-15 14:30:00",
    callNotes: "Client called today on June 18, 2026. Checked in on trial prep. David requested update on opposing party response to settlement proposal.",
    tClientCareNotes: `* [T1] 2023-04-16: Client completed intake packet. Admin welcome call verified.
* [TIER 2] 2024-02-12: Spoke to David about temporary alimony calculations. Assured him attorney is drafting proposal.
* [T3] 2025-08-30: David reports opposing party is threatening non-compliance. Transferred to litigation counsel.
* [T4] 2026-01-22: Client payment failed. Checked card on file. Updated terms with a partial billing alert.
* [TIER 5] 2026-05-02: Escalated care check. Client expressed great satisfaction with Jessica Miller's response times.`
  },
  {
    clientId: "11245",
    clientName: "Amanda Vance",
    email: "avance@corporatesolutions.net",
    phone: "313-555-0988",
    totalBalance: 0.00,
    retainerPaid: 5000.00,
    totalAmountPaid: 5000.00,
    status: "Open - Hourly",
    assignedTo: "Robert Vance, Esq.",
    outstandingBalance: 0.00,
    unbilledBalance: 0.00,
    dateOpened: "2024-01-08",
    type: "Business Litigation",
    paymentType: "Retainer",
    paymentTerms: "Paid in Full",
    lastPayment: "$5,000.00",
    lastPaymentDate: "2024-01-10",
    totalLaborHours: 25.4,
    totalBillableHours: 0.0,
    firstAttorney: "Robert Vance",
    lastAttorney: "Robert Vance",
    adminWelcomeCall: "Thomas Cook",
    adminWelcomeDate: "2024-01-09",
    attyWelcomeDate: "2024-01-11 10:00:00",
    callNotes: "Corporation file remains highly stable. All retainer charges finalized. No current disputes reported.",
    tClientCareNotes: `* [T1] 2024-01-12: Signed engagement contract. First retainer deposited.
* [Tier 1] 2024-06-15: Operational review completed successfully.`
  },
  {
    clientId: "10744",
    clientName: "Marcus Sterling",
    email: "marcus.sterling@gmail.com",
    phone: "586-555-1211",
    totalBalance: 8750.00,
    retainerPaid: 2500.00,
    totalAmountPaid: 2500.00,
    status: "Open",
    assignedTo: "Aria Sterling, Esq.",
    outstandingBalance: 6250.00,
    unbilledBalance: 2500.00,
    dateOpened: "2023-09-22",
    type: "Child Custody Dispute",
    paymentType: "Hourly",
    paymentTerms: "Partial Payment",
    lastPayment: "$2,500.00",
    lastPaymentDate: "2023-09-23",
    totalLaborHours: 32.0,
    totalBillableHours: 28.5,
    firstAttorney: "Liam Neeson",
    lastAttorney: "Aria Sterling",
    adminWelcomeCall: "Sarah Conner",
    adminWelcomeDate: "2023-09-25",
    attyWelcomeDate: "2023-09-28 16:15:00",
    callNotes: "Marcus expressed extreme anxiety surrounding the upcoming mediation date. Urged attorney to submit secondary motions.",
    tClientCareNotes: `* [T3] 2023-11-10: Marcus frustrated with motion delays. Scheduled calming touchpoint.
* [T4] 2024-04-18: Opposing counsel filed an emergency order. Tier 4 escalation active. Completed Strategy Session.
* [T4] 2025-10-05: Marcus called in crisis regarding school transfer disagreement.
* [TIER 5] 2026-02-14: Account on tight collections check. Alert issued regarding $6,250 outstanding.`
  },
  {
    clientId: "12301",
    clientName: "Elena Rostova",
    email: "elena.ro@mail.ru",
    phone: "734-555-7033",
    totalBalance: 1200.00,
    retainerPaid: 2000.00,
    totalAmountPaid: 2000.00,
    status: "Pending Close",
    assignedTo: "Jessica Miller, Esq.",
    outstandingBalance: 300.00,
    unbilledBalance: 900.00,
    dateOpened: "2025-11-05",
    type: "Mutual Consent Divorce",
    paymentType: "Flat Fee",
    paymentTerms: "Partial Payment",
    lastPayment: "$1,000.00",
    lastPaymentDate: "2026-03-01",
    totalLaborHours: 10.2,
    totalBillableHours: 8.0,
    firstAttorney: "Jessica Miller",
    lastAttorney: "Jessica Miller",
    adminWelcomeCall: "Thomas Cook",
    adminWelcomeDate: "2025-11-06",
    attyWelcomeDate: "2025-11-10 11:30:00",
    callNotes: "Final settlement decree submitted to chambers. Awaiting judge's signature.",
    tClientCareNotes: `* [T1] 2025-11-06: File set up. Welcome call completed.
* [T2] 2026-02-11: Draft documents reviewed with client.`
  },
  {
    clientId: "11599",
    clientName: "William Bradley",
    email: "wbradley@horizontech.com",
    phone: "248-555-8844",
    totalBalance: 350.00,
    retainerPaid: 0.00,
    totalAmountPaid: 0.00,
    status: "Open - Hourly",
    assignedTo: "Frank Castle, Esq.",
    outstandingBalance: 350.00,
    unbilledBalance: 0.00,
    dateOpened: "2026-02-18",
    type: "Contract Dispute",
    paymentType: "Hourly",
    paymentTerms: "Outstanding",
    lastPayment: "$0.00",
    lastPaymentDate: "N/A",
    totalLaborHours: 1.5,
    totalBillableHours: 1.5,
    firstAttorney: "Frank Castle",
    lastAttorney: "Frank Castle",
    adminWelcomeCall: "Sarah Conner",
    adminWelcomeDate: "2026-02-19",
    attyWelcomeDate: "2026-02-22 09:00:00",
    callNotes: "Intake file complete. Frank completed welcome session. Bradley states opposing vendor failed delivery.",
    tClientCareNotes: `* [T1] 2026-02-19: Admin check-in completed.
* [T2] 2026-03-05: Spoke to William on standard process roadmap.`
  }
];

// High quality quote-aware CSV Row Parser
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  // Strip outer quotes and handle double-quotes
  return result.map(s => {
    let cleaned = s;
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned.replace(/""/g, '"');
  });
}

// Map CSV rows into typed ClientRecord list with flexible, case-insensitive headers support
export function convertCsvToClientRecords(csvText: string): ClientRecord[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const records: ClientRecord[] = [];

  // Helper to match headers flexibly
  const getIndex = (aliases: string[]): number => {
    const lowerAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    
    // First try: Exact match index
    const exactIdx = headers.findIndex(h => {
      const lh = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
      return lowerAliases.some(la => lh === la);
    });
    if (exactIdx !== -1) return exactIdx;

    // Second try: Containment with safety check to prevent over-eager matching
    return headers.findIndex(h => {
      const lh = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
      return lowerAliases.some(la => {
        // Prevent matching 'lastpayment' to 'lastpaymentdate' (and vice-versa)
        if (la === 'lastpayment' && lh.includes('date')) return false;
        if (lh === 'lastpayment' && la.includes('date')) return false;
        return lh.includes(la) || la.includes(lh);
      });
    });
  };

  const clientNameIdx = getIndex(["Client Name", "clientname", "_raw_client_name"]);
  const emailIdx = getIndex(["Email", "email", "Email Address"]);
  const phoneIdx = getIndex(["Phone", "phone", "Phone Number"]);
  const totalBalanceIdx = getIndex(["Total Balance", "totalbalance", "Total_Balance"]);
  const retainerPaidIdx = getIndex(["Retainer Paid", "retainerpaid", "Retainer Paid Amount", "RetainerPaid"]);
  const totalAmountPaidIdx = getIndex(["Total Amount Paid", "totalamountpaid", "TotalAmountPaid"]);
  const statusIdx = getIndex(["Status", "MatterStatus", "status"]);
  const assignedToIdx = getIndex(["Assigned To", "AssignedTo", "Assigned Attorney", "Assigned_To"]);
  const outstandingBalanceIdx = getIndex(["Outstanding Balance", "outstandingbalance", "OutstandingBalance"]);
  const unbilledBalanceIdx = getIndex(["Unbilled Balance", "unbilledbalance", "UnbilledBalance"]);
  const dateOpenedIdx = getIndex(["Date Opened", "dateopened", "DateOpened", "Date_Opened"]);
  const clientIdIdx = getIndex(["Client ID", "ClientID", "clientid", "Client_ID", "Client Id Internal"]);
  const typeIdx = getIndex(["Type", "MatterType", "type", "Matter_Type"]);
  const paymentTypeIdx = getIndex(["Payment Type", "paymenttype"]);
  const paymentTermsIdx = getIndex(["Payment Terms", "paymentterms"]);
  
  // Last payments
  const lastPaymentIdx = getIndex(["Last Payment", "lastpayment", "Last5Amounts"]);
  const lastPaymentDateIdx = getIndex(["Last Payment Date", "lastpaymentdate", "Last5Dates"]);
  
  const totalLaborHoursIdx = getIndex(["Total Labor Hours", "totallaborhours"]);
  const totalBillableHoursIdx = getIndex(["Total Billable Hours", "totalbillablehours"]);
  
  const firstAttorneyIdx = getIndex(["First Attorney", "firstattorney"]);
  const lastAttorneyIdx = getIndex(["Last Attorney", "lastattorney"]);
  
  const adminWelcomeCallIdx = getIndex(["Admin Welcome Call", "adminwelcomecall"]);
  const adminWelcomeDateIdx = getIndex(["Date Of Admin Welcome Call", "AdminWelcomeDate", "Admin Welcome Date"]);
  const attyWelcomeDateIdx = getIndex(["Date Time Of Atty WC", "AttyWelcomeDate", "Atty Welcome Date"]);
  
  const callNotesIdx = getIndex(["Call_Notes_Plain", "CallNotes", "callnotes", "Call Notes", "Call_Notes"]);
  const tClientCareNotesIdx = getIndex(["T_ClientCare_Notes", "T_Notes", "tclientcarenotes"]);

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 2) continue;

    const getValue = (idx: number, fallback: string = ''): string => {
      if (idx === -1 || idx >= row.length) return fallback;
      return row[idx] || fallback;
    };

    const getNumber = (idx: number, fallback: number = 0): number => {
      const val = getValue(idx);
      if (!val) return fallback;
      const parsed = parseFloat(val.replace(/[$,\s]/g, ''));
      return isNaN(parsed) ? fallback : parsed;
    };

    const record: ClientRecord = {
      clientId: getValue(clientIdIdx, `M-${Math.floor(Math.random() * 90000) + 10000}`),
      clientName: getValue(clientNameIdx, `Row ${i} Client`),
      email: getValue(emailIdx, "N/A"),
      phone: getValue(phoneIdx, "N/A"),
      totalBalance: getNumber(totalBalanceIdx, 0),
      retainerPaid: getNumber(retainerPaidIdx, 0),
      totalAmountPaid: getNumber(totalAmountPaidIdx, 0),
      status: getValue(statusIdx, "Unknown"),
      assignedTo: getValue(assignedToIdx, "Staff"),
      outstandingBalance: getNumber(outstandingBalanceIdx, 0),
      unbilledBalance: getNumber(unbilledBalanceIdx, 0),
      dateOpened: getValue(dateOpenedIdx, "N/A"),
      type: getValue(typeIdx, "General Matter"),
      paymentType: getValue(paymentTypeIdx, "Hourly"),
      paymentTerms: getValue(paymentTermsIdx, "Pending"),
      lastPayment: getValue(lastPaymentIdx, "$0.00"),
      lastPaymentDate: getValue(lastPaymentDateIdx, "N/A"),
      totalLaborHours: getNumber(totalLaborHoursIdx, 0),
      totalBillableHours: getNumber(totalBillableHoursIdx, 0),
      firstAttorney: getValue(firstAttorneyIdx, ""),
      lastAttorney: getValue(lastAttorneyIdx, ""),
      adminWelcomeCall: getValue(adminWelcomeCallIdx, ""),
      adminWelcomeDate: getValue(adminWelcomeDateIdx, ""),
      attyWelcomeDate: getValue(attyWelcomeDateIdx, ""),
      callNotes: getValue(callNotesIdx, ""),
      tClientCareNotes: getValue(tClientCareNotesIdx, "")
    };

    records.push(record);
  }

  return records;
}

// Standard parsing algorithm that groups client care strings into individual T1-T5 arrays
export function parseClientCareNotes(rawNotes: string): ClientCareNotesParsed {
  const result: ClientCareNotesParsed = {
    t1: [],
    t2: [],
    t3: [],
    t4: [],
    t5: []
  };

  if (!rawNotes || !rawNotes.trim()) return result;

  // Replace " | * " with "\n* " to properly break concatenated notes into distinct lines
  const normalizedNotes = rawNotes.replace(/\s*\|\s*\*/g, '\n*');

  // Split rawNotes by newlines
  const rawLines = normalizedNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentTier: keyof ClientCareNotesParsed = 't1';

  for (let line of rawLines) {
    // Strip bullet markers (*, -)
    const cleanLine = line.replace(/^[*-\s]+/, '').trim();
    if (!cleanLine) continue;
    
    const lowerLine = cleanLine.toLowerCase();

    // Determine the tier of the line by looking for [TIER X] or [TX] tags.
    // We check in order of importance, or just search for the specific tier.
    if (/\[?t(ier\s*)?5\]?/i.test(lowerLine)) {
      currentTier = 't5';
      line = cleanLine.replace(/^\[?t(ier\s*)?5\]?:?\s*(-)?\s*/i, '').trim();
    } else if (/\[?t(ier\s*)?4\]?/i.test(lowerLine)) {
      currentTier = 't4';
      line = cleanLine.replace(/^\[?t(ier\s*)?4\]?:?\s*(-)?\s*/i, '').trim();
    } else if (/\[?t(ier\s*)?3\]?/i.test(lowerLine)) {
      currentTier = 't3';
      line = cleanLine.replace(/^\[?t(ier\s*)?3\]?:?\s*(-)?\s*/i, '').trim();
    } else if (/\[?t(ier\s*)?2\]?/i.test(lowerLine)) {
      currentTier = 't2';
      line = cleanLine.replace(/^\[?t(ier\s*)?2\]?:?\s*(-)?\s*/i, '').trim();
    } else if (/\[?t(ier\s*)?1\]?/i.test(lowerLine)) {
      currentTier = 't1';
      line = cleanLine.replace(/^\[?t(ier\s*)?1\]?:?\s*(-)?\s*/i, '').trim();
    } else {
      line = cleanLine;
    }

    if (line) {
       result[currentTier].push(line);
    }
  }

  return result;
}

// Utility formatting currencies properly
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

// Strips out markdown bullet prefixes or wraps elegantly
export function formatList(bulletsText: string | undefined): string[] {
  if (!bulletsText) return [];
  return bulletsText
    .split(/\n/)
    .map(b => b.trim())
    .map(b => b.replace(/^[*-\s]+/, '').trim())
    .filter(Boolean);
}
