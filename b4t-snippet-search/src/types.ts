export interface ClientRecord {
  clientName: string;
  email: string;
  phone: string;
  totalBalance: number;
  retainerPaid: number;
  totalAmountPaid: number;
  status: string;
  assignedTo: string;
  outstandingBalance: number;
  unbilledBalance: number;
  dateOpened: string;
  clientId: string;
  type: string;
  paymentType: string;
  paymentTerms: string;
  lastPayment: string; // From Last5Amounts or similar
  lastPaymentDate: string; // From Last5Dates or similar
  totalLaborHours: number;
  totalBillableHours: number;
  firstAttorney: string;
  lastAttorney: string;
  adminWelcomeCall: string;
  adminWelcomeDate: string;
  attyWelcomeDate: string;
  callNotes: string; // Plain notes
  tClientCareNotes: string; // Raw string with T1-T5 bullet points
  
  // Last 5 lists from original SQL
  last5Amounts?: string;
  last5Dates?: string;
}

export interface ParsedCareNote {
  cleanText: string;
  tagFound: string;
  description: string;
}

export interface ClientCareNotesParsed {
  t0: ParsedCareNote[];
  t1: ParsedCareNote[];
  t2: ParsedCareNote[];
  t3: ParsedCareNote[];
  t4: ParsedCareNote[];
  t5: ParsedCareNote[];
}

export interface ManualSnippetInputs {
  taskTitle: string;
  purpose: string;
  stepsTaken: string;
  linkCancellationSS: string;
  linkStrategySession: string;
}
