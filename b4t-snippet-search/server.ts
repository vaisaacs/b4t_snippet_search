import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Utility mapping to convert response structures
function safeFormatDate(str: any): string {
  if (!str) return "N/A";
  try {
    const raw = str.split('T')[0];
    return raw || "N/A";
  } catch {
    return "N/A";
  }
}

// -------------------------------------------------------------
// Live Bill4Time API ETL Sync Endpoint
// -------------------------------------------------------------
app.post("/api/bill4time/sync", async (req, res) => {
  const customKey = req.body.apiKey;
  const apiKey = (customKey || process.env.B4T_API_KEY || "").trim();

  if (!apiKey) {
    return res.status(400).json({
      error: "API Key missing. Please provide it in the input field or declare B4T_API_KEY in server secrets."
    });
  }

  try {
    console.log(`[ETL API] Starting parallel download from secure.bill4time.com with token: ${apiKey.substring(0, 4)}...`);
    
    // Fetch critical tables for joining using native Node fetch
    const headers = {
      'User-Agent': 'B4T-SnippetSearch-Sync/3.0',
      'Accept': 'application/json'
    };

    const fetchTable = async (endpoint: string) => {
      const url = `https://secure.bill4time.com/b4t-api/${apiKey}/v2/${endpoint}`;
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
        if (!response.ok) {
          throw new Error(`Endpoint ${endpoint} returned status ${response.status}`);
        }
        const parsed = await response.json();
        return parsed.value || parsed.data || parsed || [];
      } catch (err: any) {
        console.warn(`[ETL warning] Couldn't fetch ${endpoint}: ${err?.message || err}`);
        return [];
      }
    };

    // Trigger parallel GET requests
    const [
      rawClients,
      rawMatters,
      rawPayments,
      rawInvoices,
      rawNotes
    ] = await Promise.all([
      fetchTable("clients"),
      fetchTable("projects"),
      fetchTable("paymentsandbalanceadjustments"),
      fetchTable("invoices"),
      fetchTable("clientnotes")
    ]);

    console.log(`[ETL API] Received table counts -> clients: ${rawClients.length}, matters: ${rawMatters.length}, payments: ${rawPayments.length}, invoices: ${rawInvoices.length}, notes: ${rawNotes.length}`);

    if (rawClients.length === 0) {
      return res.status(404).json({
        error: "Sync failed. No clients were retrieved. Ensure your API Key is correct and has access to client records."
      });
    }

    // Process and join collections matching exactly the MySQL logic!
    const clientMap = new Map<string, any>();

    // 1. Initialize Clients
    rawClients.forEach((c: any) => {
      const idStr = String(c.internalClientID || c.id || '');
      if (!idStr) return;
      
      clientMap.set(idStr, {
        clientId: idStr,
        clientName: c.clientName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || `Client #${idStr}`,
        email: c.email || "N/A",
        phone: c.phone || "N/A",
        totalBalance: 0,
        retainerPaid: 0,
        totalAmountPaid: 0,
        status: "Active",
        assignedTo: "Staff",
        outstandingBalance: 0,
        unbilledBalance: 0,
        dateOpened: safeFormatDate(c.creationDate),
        type: "General Matter",
        paymentType: "Hourly",
        paymentTerms: "Pending",
        lastPayment: "$0.00",
        lastPaymentDate: "N/A",
        totalLaborHours: 0,
        totalBillableHours: 0,
        firstAttorney: "",
        lastAttorney: "",
        adminWelcomeCall: "",
        adminWelcomeDate: "",
        attyWelcomeDate: "",
        callNotes: "",
        tClientCareNotes: "",
        rawPayments: [],
        rawNotes: []
      });
    });

    // 2. Map Matters/Projects to fill details
    rawMatters.forEach((m: any) => {
      const cid = String(m.internalClientID || '');
      if (!cid || !clientMap.has(cid)) return;

      const record = clientMap.get(cid);
      record.status = m.status || record.status;
      record.assignedTo = m.assignedToName || record.assignedTo;
      record.type = m.projectType || record.type;
      record.paymentType = m.billingMethod || record.paymentType;
      
      if (m.createdDate) {
        record.dateOpened = safeFormatDate(m.createdDate);
      }
    });

    // 3. Match Payments
    rawPayments.forEach((p: any) => {
      const cid = String(p.internalClientID || '');
      if (!cid || !clientMap.has(cid)) return;

      const record = clientMap.get(cid);
      const amt = parseFloat(p.pmtAmount || p.amount || 0);
      if (amt > 0) {
        record.rawPayments.push({
          amount: amt,
          date: p.pmtDate || p.entryDate,
          method: p.pmtMethod || p.pmtType || 'N/A'
        });
      }
    });

    // 4. Map Invoices
    const invoiceTotalsMap = new Map<string, number>();
    rawInvoices.forEach((inv: any) => {
      const cid = String(inv.internalClientID || '');
      if (!cid) return;
      const amount = parseFloat(inv.invoiceTotal || inv.amount || 0);
      if (amount > 0) {
        invoiceTotalsMap.set(cid, (invoiceTotalsMap.get(cid) || 0) + amount);
      }
    });

    // 5. Build payment and retainer aggregations per client
    clientMap.forEach((record: any, cid: string) => {
      const pmts = record.rawPayments;
      if (pmts.length > 0) {
        // Sort newest first
        pmts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Total amount paid
        const totalPaid = pmts.reduce((sum: number, p: any) => sum + p.amount, 0);
        record.totalAmountPaid = totalPaid;

        // Last 5 payments
        const last5 = pmts.slice(0, 5);
        record.lastPayment = last5.map((p: any) => `* $${Number(p.amount).toFixed(2)}`).join('\n');
        record.lastPaymentDate = last5.map((p: any) => `* ${safeFormatDate(p.date)}`).join('\n');

        // Retainer paid (earliest positive payment)
        const earliest = pmts[pmts.length - 1];
        record.retainerPaid = earliest.amount;
        record.paymentType = earliest.method || record.paymentType;
      }

      // Calculate simple terms against invoices
      const totalInvoiced = invoiceTotalsMap.get(cid) || 0;
      record.outstandingBalance = Math.max(0, totalInvoiced - record.totalAmountPaid);
      record.totalBalance = record.outstandingBalance + record.unbilledBalance;

      if (record.totalAmountPaid >= totalInvoiced && totalInvoiced > 0) {
        record.paymentTerms = "Paid in Full";
      } else if (record.totalAmountPaid > 0) {
        record.paymentTerms = "Partial Payment";
      } else if (totalInvoiced > 0) {
        record.paymentTerms = "Outstanding";
      } else {
        record.paymentTerms = "Pending";
      }
    });

    // 6. Match and parse Client Notes
    rawNotes.forEach((n: any) => {
      const cid = String(n.internalClientID || '');
      if (!cid || !clientMap.has(cid)) return;

      const record = clientMap.get(cid);
      record.rawNotes.push(n);
    });

    // Reconcile note welcome milestones & care classes (T1-T5)
    clientMap.forEach((record: any) => {
      const notes = record.rawNotes;
      if (notes.length === 0) return;

      // Sort chronological (oldest first)
      notes.sort((a: any, b: any) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());

      // Onboarding welcomes
      const welcomeNotes = notes.filter((n: any) => {
        const text = String(n.noteText || '').toLowerCase();
        const subject = String(n.noteSubject || '').toLowerCase();
        return text.includes("welcome") || subject.includes("welcome");
      });

      if (welcomeNotes.length > 0) {
        const adminWel = welcomeNotes[0];
        record.adminWelcomeCall = adminWel.createdBy || "System";
        record.adminWelcomeDate = safeFormatDate(adminWel.createdDate);

        const attyWel = welcomeNotes.find((n: any) => {
          const t = String(n.noteText || '').toLowerCase();
          const s = String(n.noteSubject || '').toLowerCase();
          return t.includes("atty") || t.includes("attorney") || s.includes("atty") || s.includes("attorney");
        });
        if (attyWel) {
          record.attyWelcomeDate = safeFormatDate(attyWel.createdDate);
        }
      }

      // Case assignments
      const caseAssignNotes = notes.filter((n: any) => String(n.noteText || '').includes("[CASE ASSIGNMENT]"));
      if (caseAssignNotes.length > 0) {
        const latestAssign = caseAssignNotes[caseAssignNotes.length - 1];
        const text = String(latestAssign.noteText || '');
        const lowerText = text.toLowerCase();
        
        let firstAtty = "";
        let lastAtty = "";
        
        if (lowerText.includes("first attny:")) {
          firstAtty = text.split(/first attny:/i)[1]?.split('\n')[0]?.trim();
        } else if (lowerText.includes("first atty:")) {
          firstAtty = text.split(/first atty:/i)[1]?.split('\n')[0]?.trim();
        }

        if (lowerText.includes("last attny:")) {
          lastAtty = text.split(/last attny:/i)[1]?.split('\n')[0]?.trim();
        } else if (lowerText.includes("last atty:")) {
          lastAtty = text.split(/last atty:/i)[1]?.split('\n')[0]?.trim();
        }

        record.firstAttorney = firstAtty || record.assignedTo;
        record.lastAttorney = lastAtty || record.assignedTo;
      }

      // Latest note text
      const latest = notes[notes.length - 1];
      record.callNotes = latest.noteText || "";

      // Care class T_Notes aggregation
      const careNotes = notes.filter((n: any) => /\[(T|TIER\s*)[0-5]/i.test(n.noteText || ''));
      if (careNotes.length > 0) {
        record.tClientCareNotes = careNotes.map((n: any) => `* ${n.noteText}`).join('\n');
      }
    });

    // Convert Map back to flat array
    const records = Array.from(clientMap.values());
    
    // Cleanup internal payload helper arrays before transmitting
    records.forEach((r: any) => {
      delete r.rawPayments;
      delete r.rawNotes;
    });

    console.log(`[ETL API] Sync completed successfully! Dispatching ${records.length} integrated client records.`);
    res.json(records);

  } catch (err: any) {
    console.error("[ETL Server Error]", err);
    res.status(500).json({
      error: `Severe ETL pipeline failure: ${err?.message || err}`
    });
  }
});

// -------------------------------------------------------------
// Vite Dev Server Routing vs Static Client Build Injection
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[B4T PORTAL] Server running smoothly at http://localhost:${PORT}`);
  });
}

startServer();
