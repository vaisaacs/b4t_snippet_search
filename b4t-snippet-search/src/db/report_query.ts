export const SNIPPET_SEARCH_QUERY = `
WITH
payment_agg AS (
    SELECT
        p.internal_client_id,
        SUM(COALESCE(p.pmt_amount, 0)) AS "TotalAmountPaid",
        (SELECT string_agg('* $' || to_char(p2.pmt_amount, 'FM999,999,999.00'), E'\n') 
         FROM (SELECT pmt_amount FROM b4t_payments WHERE internal_client_id = p.internal_client_id ORDER BY pmt_date DESC LIMIT 5) p2) AS "Last5Amounts",
        (SELECT string_agg('* ' || to_char(p2.pmt_date, 'MM/DD/YYYY'), E'\n') 
         FROM (SELECT pmt_date FROM b4t_payments WHERE internal_client_id = p.internal_client_id ORDER BY pmt_date DESC LIMIT 5) p2) AS "Last5Dates"
    FROM b4t_payments p
    WHERE p.pmt_date IS NOT NULL
    GROUP BY p.internal_client_id
),
first_payment AS (
    SELECT
        internal_client_id,
        pmt_amount AS "RetainerPaid",
        pmt_method AS "PaymentType"
    FROM (
        SELECT
            p.internal_client_id,
            p.pmt_amount,
            p.pmt_method,
            ROW_NUMBER() OVER (
                PARTITION BY p.internal_client_id
                ORDER BY p.pmt_date ASC, p.payment_id ASC
            ) AS rn
        FROM b4t_payments p
        WHERE p.pmt_amount > 0
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
case_assignment_base AS (
    SELECT
        internal_client_id,
        (SELECT REPLACE(note_text, E'\r', '') FROM b4t_clientnote WHERE internal_client_id = n.internal_client_id AND note_text ILIKE '%[CASE ASSIGNMENT]%' ORDER BY created_date DESC LIMIT 1) AS "CaseAssignmentNote"
    FROM b4t_clientnote n
    WHERE note_text ILIKE '%[CASE ASSIGNMENT]%'
    GROUP BY internal_client_id
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
note_agg AS (
    SELECT
        n.internal_client_id,
        (SELECT string_agg('* ' || note_text, E'\n') FROM (SELECT note_text FROM b4t_clientnote WHERE internal_client_id = n.internal_client_id AND note_text ~ '\\[(T|TIER )[0-5]' ORDER BY created_date DESC) n2) AS "T_Notes",
        (SELECT note_text FROM b4t_clientnote WHERE internal_client_id = n.internal_client_id ORDER BY created_date DESC LIMIT 1) AS "LatestNoteText"
    FROM b4t_clientnote n
    GROUP BY n.internal_client_id
),
admin_welcome AS (
    SELECT internal_client_id, created_date AS "AdminWelcomeDate", created_by AS "AdminWelcomeCall"
    FROM (
        SELECT
            n.internal_client_id,
            n.created_date,
            n.created_by,
            ROW_NUMBER() OVER (PARTITION BY n.internal_client_id ORDER BY n.created_date ASC) AS rn
        FROM b4t_clientnote n
        WHERE n.note_subject ILIKE '%Welcome%' OR n.note_text ILIKE '%Welcome%'
    ) ranked_notes
    WHERE rn = 1
),
atty_welcome AS (
    SELECT internal_client_id, created_date AS "AttyWelcomeDate"
    FROM (
        SELECT
            n.internal_client_id,
            n.created_date,
            ROW_NUMBER() OVER (PARTITION BY n.internal_client_id ORDER BY n.created_date ASC) AS rn
        FROM b4t_clientnote n
        WHERE (n.note_subject ILIKE '%Welcome%' OR n.note_text ILIKE '%Welcome%')
          AND (
              n.note_subject ILIKE '%Atty%'
              OR n.note_subject ILIKE '%Attorney%'
              OR n.note_text ILIKE '%Atty%'
              OR n.note_text ILIKE '%Attorney%'
          )
    ) ranked_notes
    WHERE rn = 1
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
    na."LatestNoteText" AS "CallNotes",
    na."T_Notes" AS "T_ClientCare_Notes",
    pa."Last5Amounts",
    pa."Last5Dates"
FROM b4t_clients d
LEFT JOIN b4t_matters m ON d.internal_client_id = m.internal_client_id
LEFT JOIN payment_agg pa ON d.internal_client_id = pa.internal_client_id
LEFT JOIN first_payment fp ON d.internal_client_id = fp.internal_client_id
LEFT JOIN invoice_agg inv ON d.internal_client_id = inv.internal_client_id
LEFT JOIN case_assignment_agg ca ON d.internal_client_id = ca.internal_client_id
LEFT JOIN note_agg na ON d.internal_client_id = na.internal_client_id
LEFT JOIN admin_welcome aw ON d.internal_client_id = aw.internal_client_id
LEFT JOIN atty_welcome tw ON d.internal_client_id = tw.internal_client_id
WHERE m.created_date >= '2023-01-01'
  AND m.status != 'Closed'
ORDER BY m.created_date DESC;
`;
