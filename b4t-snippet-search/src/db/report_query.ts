export const SNIPPET_SEARCH_QUERY = `
WITH
payment_agg AS (
    SELECT
        internal_client_id,
        SUM(COALESCE(pmt_amount, 0)) AS "TotalAmountPaid"
    FROM b4t_payments
    WHERE pmt_date IS NOT NULL
    GROUP BY internal_client_id
),
payment_last_5 AS (
    SELECT internal_client_id,
        string_agg('* $' || to_char(pmt_amount, 'FM999,999,999.00'), E'\n') AS "Last5Amounts",
        string_agg('* ' || to_char(pmt_date, 'MM/DD/YYYY'), E'\n') AS "Last5Dates"
    FROM (
        SELECT internal_client_id, pmt_amount, pmt_date,
               ROW_NUMBER() OVER(PARTITION BY internal_client_id ORDER BY pmt_date DESC) as rn
        FROM b4t_payments
    ) p
    WHERE rn <= 5
    GROUP BY internal_client_id
),
first_payment AS (
    SELECT
        internal_client_id,
        pmt_amount AS "RetainerPaid",
        pmt_method AS "PaymentType"
    FROM (
        SELECT
            internal_client_id,
            pmt_amount,
            pmt_method,
            ROW_NUMBER() OVER (
                PARTITION BY internal_client_id
                ORDER BY pmt_date ASC, payment_id ASC
            ) AS rn
        FROM b4t_payments
        WHERE pmt_amount > 0
    ) ranked_payments
    WHERE rn = 1
),
invoice_agg AS (
    SELECT
        internal_client_id,
        SUM(invoice_total) AS "TotalInvoiced"
    FROM b4t_invoices
    WHERE invoice_total > 0
    GROUP BY internal_client_id
),
invoice_summary AS (
    SELECT
        internal_client_id,
        SUM(single_invoice_total) as invoice_total
    FROM (
        SELECT
            internal_client_id,
            internal_invoice_id,
            MAX(invoice_total) as single_invoice_total
        FROM b4t_invoices
        WHERE status = 'Finalized'
        GROUP BY internal_client_id, internal_invoice_id
    ) AS unique_invoices
    GROUP BY internal_client_id
),
invoice_payments AS (
    SELECT
        internal_client_id,
        (SUM(COALESCE(credit, 0)) - SUM(COALESCE(debit, 0))) as total_payments
    FROM b4t_payments
    GROUP BY internal_client_id
),
last_payment_summary AS (
    SELECT DISTINCT ON (internal_client_id)
        internal_client_id,
        pmt_amount AS last_payment_amount,
        pmt_date AS last_payment_date
    FROM b4t_payments
    WHERE pmt_amount != 0
    ORDER BY internal_client_id, pmt_date DESC, payment_id DESC
),
unbilled_time AS (
    SELECT
        t.internal_client_id,
        SUM(COALESCE(t.calculated_amount, 0)) AS unbilled_time_amount
    FROM b4t_timeentries t
    WHERE t.status IN ('Ready For Billing', 'Ready For Summary', 'Pending Ticket Close')
      AND t.entry_date IS NOT NULL
      AND t.status != 'Deleted'
    GROUP BY t.internal_client_id
),
unbilled_expenses AS (
    SELECT
        e.internal_client_id,
        SUM(COALESCE(e.sell_price, 0)) AS unbilled_expense_amount
    FROM b4t_expenses e
    WHERE e.billing_status IN ('Ready For Billing', 'Ready For Summary', 'Pending Ticket Close')
      AND e.expense_date IS NOT NULL
    GROUP BY e.internal_client_id
),
trust_summary AS (
    SELECT
        internal_client_id,
        -SUM(CASE WHEN pay_in = true THEN amount ELSE -amount END) AS trust_balance
    FROM b4t_trustaccounting
    WHERE (check_voided != true OR check_voided IS NULL)
    GROUP BY internal_client_id
),
case_assignment_base AS (
    SELECT DISTINCT ON (internal_client_id)
        internal_client_id,
        REPLACE(note_text, E'\r', '') AS "CaseAssignmentNote"
    FROM b4t_clientnote
    WHERE note_text ILIKE '%[CASE ASSIGNMENT]%'
    ORDER BY internal_client_id, created_date DESC
),
case_assignment_agg AS (
    SELECT
        internal_client_id,
        NULLIF(TRIM(COALESCE(
            CASE
                WHEN position('first attny:' in lower("CaseAssignmentNote")) > 0 THEN
                    split_part(substring("CaseAssignmentNote" from position('first attny:' in lower("CaseAssignmentNote")) + length('first attny:')), E'\n', 1)
            END,
            CASE
                WHEN position('first atty:' in lower("CaseAssignmentNote")) > 0 THEN
                    split_part(substring("CaseAssignmentNote" from position('first atty:' in lower("CaseAssignmentNote")) + length('first atty:')), E'\n', 1)
            END
        )), '') AS "FirstAttorneyFromNote",
        NULLIF(TRIM(COALESCE(
            CASE
                WHEN position('last attny:' in lower("CaseAssignmentNote")) > 0 THEN
                    split_part(substring("CaseAssignmentNote" from position('last attny:' in lower("CaseAssignmentNote")) + length('last attny:')), E'\n', 1)
            END,
            CASE
                WHEN position('last atty:' in lower("CaseAssignmentNote")) > 0 THEN
                    split_part(substring("CaseAssignmentNote" from position('last atty:' in lower("CaseAssignmentNote")) + length('last atty:')), E'\n', 1)
            END
        )), '') AS "LastAttorneyFromNote"
    FROM case_assignment_base
),
note_tier_agg AS (
    SELECT
        internal_client_id,
        string_agg('* ' || note_text, E'\n') AS "T_Notes"
    FROM (
        SELECT internal_client_id, note_text
        FROM b4t_clientnote
        WHERE note_text ~ '\\[(T|TIER )[0-5]'
        ORDER BY created_date DESC
    ) sub
    GROUP BY internal_client_id
),
note_latest AS (
    SELECT DISTINCT ON (internal_client_id)
        internal_client_id, note_text AS "LatestNoteText"
    FROM b4t_clientnote
    ORDER BY internal_client_id, created_date DESC
),
admin_welcome AS (
    SELECT DISTINCT ON (internal_client_id)
        internal_client_id, created_date AS "AdminWelcomeDate", created_by AS "AdminWelcomeCall"
    FROM b4t_clientnote
    WHERE note_subject ILIKE '%Welcome%' OR note_text ILIKE '%Welcome%'
    ORDER BY internal_client_id, created_date ASC
),
atty_welcome AS (
    SELECT DISTINCT ON (internal_client_id)
        internal_client_id, created_date AS "AttyWelcomeDate"
    FROM b4t_clientnote
    WHERE (note_subject ILIKE '%Welcome%' OR note_text ILIKE '%Welcome%')
      AND (
          note_subject ILIKE '%Atty%'
          OR note_subject ILIKE '%Attorney%'
          OR note_text ILIKE '%Atty%'
          OR note_text ILIKE '%Attorney%'
      )
    ORDER BY internal_client_id, created_date ASC
)
SELECT
    d.internal_client_id AS "ClientID",
    d.client_name AS "ClientName",
    d.email AS "Email",
    d.phone AS "Phone",
    COALESCE(fp."RetainerPaid", 0) AS "RetainerPaid",
    COALESCE(pa."TotalAmountPaid", 0) AS "TotalAmountPaid",
    m.status AS "Status",
    m.assigned_to_name AS "AssignedTo",
    m.created_date AS "DateOpened",
    m.project_type AS "Type",
    COALESCE(fp."PaymentType", '') AS "PaymentType",
    CASE
        WHEN COALESCE(pa."TotalAmountPaid", 0) >= COALESCE(inv."TotalInvoiced", 0) AND COALESCE(inv."TotalInvoiced", 0) > 0 THEN 'Paid in Full'
        WHEN COALESCE(pa."TotalAmountPaid", 0) > 0 THEN 'Partial Payment'
        WHEN COALESCE(inv."TotalInvoiced", 0) > 0 THEN 'Outstanding'
        ELSE 'Pending'
    END AS "PaymentTerms",
    COALESCE(ca."FirstAttorneyFromNote", m.assigned_to_name) AS "FirstAttorney",
    COALESCE(ca."LastAttorneyFromNote", m.assigned_to_name) AS "LastAttorney",
    aw."AdminWelcomeCall",
    aw."AdminWelcomeDate",
    tw."AttyWelcomeDate",
    nl."LatestNoteText" AS "CallNotes",
    nt."T_Notes" AS "T_ClientCare_Notes",
    pl5."Last5Amounts",
    pl5."Last5Dates",
    COALESCE(lps.last_payment_amount, 0) AS "LastPayment",
    lps.last_payment_date AS "LastPaymentDate",
    (COALESCE(ins.invoice_total, 0) - COALESCE(ip.total_payments, 0)) AS "OutstandingBalance",
    COALESCE(ut.unbilled_time_amount, 0) + COALESCE(ue.unbilled_expense_amount, 0) AS "UnbilledBalance",
    (COALESCE(ins.invoice_total, 0) - COALESCE(ip.total_payments, 0)) + 
    (COALESCE(ut.unbilled_time_amount, 0) + COALESCE(ue.unbilled_expense_amount, 0)) AS "TotalBalance",
    COALESCE(ts.trust_balance, 0) AS "TrustBalance"
FROM b4t_clients d
LEFT JOIN b4t_matters m ON d.internal_client_id = m.internal_client_id
LEFT JOIN payment_agg pa ON d.internal_client_id = pa.internal_client_id
LEFT JOIN payment_last_5 pl5 ON d.internal_client_id = pl5.internal_client_id
LEFT JOIN first_payment fp ON d.internal_client_id = fp.internal_client_id
LEFT JOIN invoice_agg inv ON d.internal_client_id = inv.internal_client_id
LEFT JOIN invoice_summary ins ON d.internal_client_id = ins.internal_client_id
LEFT JOIN invoice_payments ip ON d.internal_client_id = ip.internal_client_id
LEFT JOIN last_payment_summary lps ON d.internal_client_id = lps.internal_client_id
LEFT JOIN unbilled_time ut ON d.internal_client_id = ut.internal_client_id
LEFT JOIN unbilled_expenses ue ON d.internal_client_id = ue.internal_client_id
LEFT JOIN trust_summary ts ON d.internal_client_id = ts.internal_client_id
LEFT JOIN case_assignment_agg ca ON d.internal_client_id = ca.internal_client_id
LEFT JOIN note_tier_agg nt ON d.internal_client_id = nt.internal_client_id
LEFT JOIN note_latest nl ON d.internal_client_id = nl.internal_client_id
LEFT JOIN admin_welcome aw ON d.internal_client_id = aw.internal_client_id
LEFT JOIN atty_welcome tw ON d.internal_client_id = tw.internal_client_id
WHERE m.created_date >= '2023-01-01'
  AND m.status != 'Closed'
ORDER BY m.created_date DESC;
`;
