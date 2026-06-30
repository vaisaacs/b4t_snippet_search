import os
import pymysql
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# MySQL Connection Configuration (Your Local Virtual Desktop DB)
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "b4t")

# Neon DB Connection Configuration
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")
NEON_DATABASE_URL_DISABLED = os.getenv("NEON_DATABASE_URL_DISABLED")
NEON_DATABASE_URL_INOFFICE = os.getenv("NEON_DATABASE_URL_INOFFICE")

def migrate_data():
    print("Connecting to MySQL...")
    try:
        mysql_conn = pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return

    print("Connecting to Neon PostgreSQL (Active)...")
    try:
        pg_conn = psycopg2.connect(NEON_DATABASE_URL)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to Neon PostgreSQL (Active): {e}")
        return

    print("Connecting to Neon PostgreSQL (Disabled)...")
    try:
        pg_conn_disabled = psycopg2.connect(NEON_DATABASE_URL_DISABLED)
        pg_cursor_disabled = pg_conn_disabled.cursor()
    except Exception as e:
        print(f"Failed to connect to Neon PostgreSQL (Disabled): {e}")
        return

    print("Connecting to Neon PostgreSQL (In-Office)...")
    try:
        pg_conn_inoffice = psycopg2.connect(NEON_DATABASE_URL_INOFFICE)
        pg_cursor_inoffice = pg_conn_inoffice.cursor()
    except Exception as e:
        print(f"Failed to connect to Neon PostgreSQL (In-Office): {e}")
        return

    try:
        # 1. Extract data from MySQL (Active Clients)
        print("Extracting dyn_snippet_search_master from MySQL...")
        with mysql_conn.cursor() as mysql_cursor:
            mysql_cursor.execute("""
                SELECT 
                    ClientName AS `Client Name`,
                    Email AS `Email`,
                    Phone AS `Phone`,
                    CAST(COALESCE(TotalBalance, 0) AS DECIMAL(15,2)) AS `Total Balance`,
                    CAST(COALESCE(RetainerPaid, 0) AS DECIMAL(15,2)) AS `Retainer Paid`,
                    CAST(COALESCE(TotalAmountPaid, 0) AS DECIMAL(15,2)) AS `Total Amount Paid`,
                    Status AS `Status`,
                    AssignedTo AS `Assigned To`,
                    CAST(COALESCE(OutstandingBalance, 0) AS DECIMAL(15,2)) AS `Outstanding Balance`,
                    CAST(COALESCE(UnbilledBalance, 0) AS DECIMAL(15,2)) AS `Unbilled Balance`,
                    DateOpened AS `Date Opened`,
                    ClientID AS `Client ID`,
                    Type AS `Type`,
                    PaymentType AS `Payment Type`,
                    PaymentTerms AS `Payment Terms`,
                    Last5Amounts AS `Last Payment`,
                    Last5Dates AS `Last Payment Date`,
                    ROUND(COALESCE(TotalLaborHours, 0), 2) AS `Total Labor Hours`,
                    ROUND(COALESCE(TotalBillableHours, 0), 2) AS `Total Billable Hours`,
                    FirstAttorney AS `First Attorney`,
                    LastAttorney AS `Last Attorney`,
                    AdminWelcomeCall AS `Admin Welcome Call`,
                    AdminWelcomeDate AS `Date Of Admin Welcome Call`,
                    AttyWelcomeDate AS `Date Time Of Atty WC`,
                    CallNotes AS `Call_Notes_Plain`,
                    T_ClientCare_Notes AS `T_ClientCare_Notes`
                FROM dyn_snippet_search_master
                ORDER BY ClientName ASC;
            """)
            rows = mysql_cursor.fetchall()
        
        if rows:
            print(f"Fetched {len(rows)} records from MySQL. Preparing to insert into Neon...")

            # 3. Create table in Neon PostgreSQL
            create_table_sql = """
            DROP TABLE IF EXISTS dyn_snippet_search_master CASCADE;
            CREATE TABLE dyn_snippet_search_master (
                "Client Name" TEXT,
                "Email" TEXT,
                "Phone" TEXT,
                "Total Balance" NUMERIC,
                "Retainer Paid" NUMERIC,
                "Total Amount Paid" NUMERIC,
                "Status" TEXT,
                "Assigned To" TEXT,
                "Outstanding Balance" NUMERIC,
                "Unbilled Balance" NUMERIC,
                "Date Opened" TEXT,
                "Client ID" TEXT,
                "Type" TEXT,
                "Payment Type" TEXT,
                "Payment Terms" TEXT,
                "Last Payment" TEXT,
                "Last Payment Date" TEXT,
                "Total Labor Hours" NUMERIC,
                "Total Billable Hours" NUMERIC,
                "First Attorney" TEXT,
                "Last Attorney" TEXT,
                "Admin Welcome Call" TEXT,
                "Date Of Admin Welcome Call" TEXT,
                "Date Time Of Atty WC" TEXT,
                "Call_Notes_Plain" TEXT,
                "T_ClientCare_Notes" TEXT
            );
            """
            pg_cursor.execute(create_table_sql)
            
            # 4. Prepare the insert query
            insert_sql = """
            INSERT INTO dyn_snippet_search_master (
                "Client Name", "Email", "Phone", "Total Balance", "Retainer Paid", 
                "Total Amount Paid", "Status", "Assigned To", "Outstanding Balance", 
                "Unbilled Balance", "Date Opened", "Client ID", "Type", "Payment Type", 
                "Payment Terms", "Last Payment", "Last Payment Date", "Total Labor Hours", 
                "Total Billable Hours", "First Attorney", "Last Attorney", "Admin Welcome Call", 
                "Date Of Admin Welcome Call", "Date Time Of Atty WC", "Call_Notes_Plain", "T_ClientCare_Notes"
            ) VALUES %s
            """
            
            # Map rows to tuples matching the exact column order
            values = []
            for r in rows:
                values.append((
                    r.get('Client Name', ''),
                    r.get('Email', ''),
                    r.get('Phone', ''),
                    r.get('Total Balance', 0),
                    r.get('Retainer Paid', 0),
                    r.get('Total Amount Paid', 0),
                    r.get('Status', ''),
                    r.get('Assigned To', ''),
                    r.get('Outstanding Balance', 0),
                    r.get('Unbilled Balance', 0),
                    str(r.get('Date Opened', '')),
                    str(r.get('Client ID', '')),
                    r.get('Type', ''),
                    r.get('Payment Type', ''),
                    r.get('Payment Terms', ''),
                    str(r.get('Last Payment', '')),
                    str(r.get('Last Payment Date', '')),
                    r.get('Total Labor Hours', 0),
                    r.get('Total Billable Hours', 0),
                    r.get('First Attorney', ''),
                    r.get('Last Attorney', ''),
                    r.get('Admin Welcome Call', ''),
                    str(r.get('Date Of Admin Welcome Call', '')),
                    str(r.get('Date Time Of Atty WC', '')),
                    r.get('Call_Notes_Plain', ''),
                    r.get('T_ClientCare_Notes', '')
                ))
                
            print("Inserting data into Neon...")
            psycopg2.extras.execute_values(pg_cursor, insert_sql, values, page_size=1000)
            print(f"Successfully migrated {len(rows)} active rows to Neon PostgreSQL!")

        # --- DISABLED CLIENTS ---
        print("Extracting Disabled Clients data from MySQL...")
        with mysql_conn.cursor() as mysql_cursor:
            mysql_cursor.execute("""
                SELECT DISTINCT
                    c.ClientName AS `Client Name`, 
                    c.Email, 
                    c.Phone,
                    CAST(COALESCE(bd.`Total Balance`, 0) AS DECIMAL(15,2)) AS `Total Balance`,
                    CAST(COALESCE(mcl.`Retainer Paid`, 0) AS DECIMAL(15,2)) AS `Retainer Paid`,
                    CAST(COALESCE(p_agg.TotalPaid, 0) AS DECIMAL(15,2)) AS `Total Amount Paid`,
                    m_latest.Status, 
                    m_latest.AssignedToName AS `Assigned To`,
                    CAST(COALESCE(bd.`Outstanding Balance`, 0) AS DECIMAL(15,2)) AS `Outstanding Balance`,
                    CAST(COALESCE(bd.`Unbilled Balance`, 0) AS DECIMAL(15,2)) AS `Unbilled Balance`,
                    CAST(m_latest.CreatedDate AS DATE) AS `Date Opened`, 
                    c.InternalClientID AS `Client ID`, 
                    m_latest.ProjectType AS `Type`,
                    mcl.`Payment Type`, 
                    mcl.`Payment Terms`, 
                    p_agg.Last5Amounts AS `Last Payment`, 
                    p_agg.Last5Dates AS `Last Payment Date`,
                    ROUND(COALESCE(f_agg.TotalLabor, 0), 2) AS `Total Labor Hours`, 
                    ROUND(COALESCE(f_agg.TotalBill, 0), 2) AS `Total Billable Hours`,
                    COALESCE(ca_agg.FirstAttorneyFromNote, m_first.AssignedToName) AS `First Attorney`,
                    COALESCE(ca_agg.LastAttorneyFromNote, m_latest.AssignedToName) AS `Last Attorney`,
                    n_agg.AdminWelcomeCall AS `Admin Welcome Call`,
                    CAST(n_agg.AdminWelcomeDate AS DATE) AS `Date Of Admin Welcome Call`, 
                    CAST(n_agg.AttyWelcomeDate AS DATETIME) AS `Date Time Of Atty WC`,
                    COALESCE(NULLIF(n_agg.LatestNoteText, ''), 'N/A') AS `Latest Call Note`,
                    COALESCE(NULLIF(n_agg.AllNotes, ''), 'N/A') AS `All Call Notes`,
                    COALESCE(NULLIF(n_agg.T1_Notes, ''), 'N/A') AS `T1 Call Notes`,
                    COALESCE(NULLIF(n_agg.T2_Notes, ''), 'N/A') AS `T2 Call Notes`,
                    COALESCE(NULLIF(n_agg.T3_Notes, ''), 'N/A') AS `T3 Call Notes`,
                    COALESCE(NULLIF(n_agg.T4_Notes, ''), 'N/A') AS `T4 Call Notes`,
                    COALESCE(NULLIF(n_agg.T5_Notes, ''), 'N/A') AS `T5 Call Notes`
                FROM b4t_clients c

                -- 1. LATEST MATTER (Exclusion subquery removed since no Status rules apply)
                INNER JOIN (
                    SELECT m1.* FROM b4t_matters m1
                    INNER JOIN (
                        SELECT InternalClientID, MAX(InternalProjectID) as MaxID 
                        FROM b4t_matters 
                        WHERE CreatedDate >= '2023-01-01'
                        GROUP BY InternalClientID
                    ) m2 ON m1.InternalProjectID = m2.MaxID
                ) m_latest ON c.InternalClientID = m_latest.InternalClientID

                -- 2. FIRST MATTER
                LEFT JOIN (
                    SELECT m3.* FROM b4t_matters m3
                    INNER JOIN (
                        SELECT InternalClientID, MIN(InternalProjectID) as MinID 
                        FROM b4t_matters 
                        GROUP BY InternalClientID
                    ) m4 ON m3.InternalProjectID = m4.MinID
                ) m_first ON c.InternalClientID = m_first.InternalClientID

                -- 3. FINANCIAL CONSOLIDATION
                LEFT JOIN (
                    SELECT `Client ID`, 
                           MAX(`Total Balance`) as `Total Balance`, 
                           MAX(`Outstanding Balance`) as `Outstanding Balance`, 
                           MAX(`Unbilled Balance`) as `Unbilled Balance`
                    FROM v_b4t_billing_data GROUP BY `Client ID`
                ) bd ON c.InternalClientID = bd.`Client ID`

                LEFT JOIN (
                    SELECT `Client ID`, 
                           MAX(`Retainer Paid`) as `Retainer Paid`, 
                           MAX(`Payment Type`) as `Payment Type`, 
                           MAX(`Payment Terms`) as `Payment Terms`
                    FROM v_master_client_log GROUP BY `Client ID`
                ) mcl ON c.InternalClientID = mcl.`Client ID`

                -- 4. NOTES AGGREGATION (Hardcoded Rules Applied)
                LEFT JOIN (
                    SELECT 
                        InternalClientID,
                        GROUP_CONCAT(CONCAT('[', CAST(CreatedDate AS DATE), ']: ', NoteText) ORDER BY CreatedDate DESC SEPARATOR '\\n\\n') AS AllNotes,
                        
                        -- Tier-specific Note Groupings (REGEXP hardcoded)
                        GROUP_CONCAT(CASE WHEN NoteText REGEXP '\\\\[(T|TIER )[1]' THEN CONCAT('* ', NoteText) END ORDER BY CreatedDate DESC SEPARATOR '\\n') AS T1_Notes,
                        GROUP_CONCAT(CASE WHEN NoteText REGEXP '\\\\[(T|TIER )[2]' THEN CONCAT('* ', NoteText) END ORDER BY CreatedDate DESC SEPARATOR '\\n') AS T2_Notes,
                        GROUP_CONCAT(CASE WHEN NoteText REGEXP '\\\\[(T|TIER )[3]' THEN CONCAT('* ', NoteText) END ORDER BY CreatedDate DESC SEPARATOR '\\n') AS T3_Notes,
                        GROUP_CONCAT(CASE WHEN NoteText REGEXP '\\\\[(T|TIER )[4]' THEN CONCAT('* ', NoteText) END ORDER BY CreatedDate DESC SEPARATOR '\\n') AS T4_Notes,
                        GROUP_CONCAT(CASE WHEN NoteText REGEXP '\\\\[(T|TIER )[5]' THEN CONCAT('* ', NoteText) END ORDER BY CreatedDate DESC SEPARATOR '\\n') AS T5_Notes,
                        
                        -- Admin Welcome Rule
                        MIN(CASE WHEN NoteSubject LIKE '%Welcome%' 
                                       OR NoteText LIKE '%[CASE ASSIGNMENT]%' 
                                       OR NoteText LIKE '%Welcome%' 
                                       OR NoteText REGEXP '\\\\[(T|TIER )[0-5]' 
                                       OR NoteText REGEXP 'Atty|Attorney' 
                                 THEN CreatedDate END) AS AdminWelcomeDate,
                                 
                        MIN(CASE WHEN NoteSubject LIKE '%Welcome%' 
                                       OR NoteText LIKE '%[CASE ASSIGNMENT]%' 
                                       OR NoteText LIKE '%Welcome%' 
                                       OR NoteText REGEXP '\\\\[(T|TIER )[0-5]' 
                                       OR NoteText REGEXP 'Atty|Attorney' 
                                 THEN CreatedBy END) AS AdminWelcomeCall,
                                 
                        -- Atty Welcome Rule
                        MIN(CASE WHEN NoteText LIKE '%[CASE ASSIGNMENT]%' 
                                       OR NoteText LIKE '%Welcome%' 
                                       OR NoteText REGEXP '\\\\[(T|TIER )[0-5]' 
                                       OR NoteText REGEXP 'Atty|Attorney' 
                                 THEN CreatedDate END) AS AttyWelcomeDate,
                                 
                        SUBSTRING_INDEX(GROUP_CONCAT(NoteText ORDER BY CreatedDate DESC SEPARATOR '|||'), '|||', 1) AS LatestNoteText
                    FROM b4t_clientnote
                    GROUP BY InternalClientID
                ) n_agg ON c.InternalClientID = n_agg.InternalClientID

                -- 5. CASE ASSIGNMENT ATTORNEY PARSING
                LEFT JOIN (
                    SELECT 
                        ca.InternalClientID,
                        NULLIF(TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(ca.CaseAssignmentNote,'(?i)first[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*[^\\n\\r]+'),'(?i)^first[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*','')),'') AS FirstAttorneyFromNote,
                        NULLIF(TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(ca.CaseAssignmentNote,'(?i)last[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*[^\\n\\r]+'),'(?i)^last[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*','')),'') AS LastAttorneyFromNote
                    FROM (
                        SELECT
                            InternalClientID,
                            SUBSTRING_INDEX(GROUP_CONCAT(REPLACE(NoteText, '\\r', '') ORDER BY CreatedDate DESC SEPARATOR '|||'),'|||',1) AS CaseAssignmentNote
                        FROM b4t_clientnote
                        WHERE LOWER(NoteText) LIKE '%[case assignment]%'
                        GROUP BY InternalClientID
                    ) ca
                ) ca_agg ON c.InternalClientID = ca_agg.InternalClientID

                -- 6. PAYMENTS & TIME AGGREGATION
                LEFT JOIN (
                    SELECT 
                        InternalClientID, SUM(PmtAmount) as TotalPaid,
                        SUBSTRING_INDEX(GROUP_CONCAT(CONCAT('* $', FORMAT(PmtAmount, 2)) ORDER BY PmtDate DESC SEPARATOR '\\n'), '\\n', 5) AS Last5Amounts,
                        SUBSTRING_INDEX(GROUP_CONCAT(CONCAT('* ', DATE_FORMAT(PmtDate, '%c/%e/%Y')) ORDER BY PmtDate DESC SEPARATOR '\\n'), '\\n', 5) AS Last5Dates
                    FROM b4t_payments WHERE PmtDate > '1900-01-01' GROUP BY InternalClientID
                ) p_agg ON c.InternalClientID = p_agg.InternalClientID

                LEFT JOIN (
                    SELECT InternalClientID, SUM(LaborTime) as TotalLabor, SUM(BillTime) as TotalBill 
                    FROM b4t_timeentries GROUP BY InternalClientID
                ) f_agg ON c.InternalClientID = f_agg.InternalClientID

                -- Client inclusions and exclusions
                WHERE c.ClientStatus = 'Disabled' 
                  AND c.ClientName NOT LIKE '%Admin%'
                ORDER BY c.ClientName ASC;
            """)
            disabled_rows = mysql_cursor.fetchall()
            
        if disabled_rows:
            print(f"Fetched {len(disabled_rows)} Disabled records from MySQL. Preparing to insert into Neon...")

            create_disabled_table_sql = """
            DROP TABLE IF EXISTS dyn_snippet_disabled_clients CASCADE;
            CREATE TABLE dyn_snippet_disabled_clients (
                "Client Name" TEXT,
                "Email" TEXT,
                "Phone" TEXT,
                "Total Balance" NUMERIC,
                "Retainer Paid" NUMERIC,
                "Total Amount Paid" NUMERIC,
                "Status" TEXT,
                "Assigned To" TEXT,
                "Outstanding Balance" NUMERIC,
                "Unbilled Balance" NUMERIC,
                "Date Opened" TEXT,
                "Client ID" TEXT,
                "Type" TEXT,
                "Payment Type" TEXT,
                "Payment Terms" TEXT,
                "Last Payment" TEXT,
                "Last Payment Date" TEXT,
                "Total Labor Hours" NUMERIC,
                "Total Billable Hours" NUMERIC,
                "First Attorney" TEXT,
                "Last Attorney" TEXT,
                "Admin Welcome Call" TEXT,
                "Date Of Admin Welcome Call" TEXT,
                "Date Time Of Atty WC" TEXT,
                "Latest Call Note" TEXT,
                "All Call Notes" TEXT,
                "T1 Call Notes" TEXT,
                "T2 Call Notes" TEXT,
                "T3 Call Notes" TEXT,
                "T4 Call Notes" TEXT,
                "T5 Call Notes" TEXT
            );
            """
            pg_cursor_disabled.execute(create_disabled_table_sql)
            
            insert_disabled_sql = """
            INSERT INTO dyn_snippet_disabled_clients (
                "Client Name", "Email", "Phone", "Total Balance", "Retainer Paid", 
                "Total Amount Paid", "Status", "Assigned To", "Outstanding Balance", 
                "Unbilled Balance", "Date Opened", "Client ID", "Type", "Payment Type", 
                "Payment Terms", "Last Payment", "Last Payment Date", "Total Labor Hours", 
                "Total Billable Hours", "First Attorney", "Last Attorney", "Admin Welcome Call", 
                "Date Of Admin Welcome Call", "Date Time Of Atty WC", "Latest Call Note", 
                "All Call Notes", "T1 Call Notes", "T2 Call Notes", "T3 Call Notes", "T4 Call Notes", "T5 Call Notes"
            ) VALUES %s
            """
            
            disabled_values = []
            for r in disabled_rows:
                disabled_values.append((
                    r.get('Client Name', ''),
                    r.get('Email', ''),
                    r.get('Phone', ''),
                    r.get('Total Balance', 0),
                    r.get('Retainer Paid', 0),
                    r.get('Total Amount Paid', 0),
                    r.get('Status', ''),
                    r.get('Assigned To', ''),
                    r.get('Outstanding Balance', 0),
                    r.get('Unbilled Balance', 0),
                    str(r.get('Date Opened', '')),
                    str(r.get('Client ID', '')),
                    r.get('Type', ''),
                    r.get('Payment Type', ''),
                    r.get('Payment Terms', ''),
                    str(r.get('Last Payment', '')),
                    str(r.get('Last Payment Date', '')),
                    r.get('Total Labor Hours', 0),
                    r.get('Total Billable Hours', 0),
                    r.get('First Attorney', ''),
                    r.get('Last Attorney', ''),
                    r.get('Admin Welcome Call', ''),
                    str(r.get('Date Of Admin Welcome Call', '')),
                    str(r.get('Date Time Of Atty WC', '')),
                    r.get('Latest Call Note', ''),
                    r.get('All Call Notes', ''),
                    r.get('T1 Call Notes', ''),
                    r.get('T2 Call Notes', ''),
                    r.get('T3 Call Notes', ''),
                    r.get('T4 Call Notes', ''),
                    r.get('T5 Call Notes', '')
                ))
                
            print("Inserting Disabled Clients data into Neon...")
            psycopg2.extras.execute_values(pg_cursor_disabled, insert_disabled_sql, disabled_values, page_size=1000)
            print(f"Successfully migrated {len(disabled_rows)} Disabled rows to Neon PostgreSQL!")

        # --- IN-OFFICE CLIENTS ---
        print("Extracting In-Office Clients data from MySQL...")
        with mysql_conn.cursor() as mysql_cursor:
            mysql_cursor.execute("""
                SELECT DISTINCT
                    c.ClientName AS `Client Name`, 
                    m_latest.ProjectType AS `Matter Type`,
                    m_latest.ProjectID AS `Matter ID`,
                    m_latest.AssignedToName AS `Assigned Attorney`,
                    p_agg.Last5Amounts AS `Last Payment`, 
                    p_agg.Last5Dates AS `Last Payment Date`,
                    CAST(COALESCE(bd.`Total Balance`, 0) AS DECIMAL(15,2)) AS `Total Balance`,
                    CAST(COALESCE(bd.`Outstanding Balance`, 0) AS DECIMAL(15,2)) AS `Outstanding Balance`,
                    CAST(COALESCE(bd.`Unbilled Balance`, 0) AS DECIMAL(15,2)) AS `Unbilled Balance`,
                    CAST(COALESCE(bd.`Total Balance`, 0) AS DECIMAL(15,2)) AS `Balance:`,
                    c.Email AS `Email Address`, 
                    c.Phone AS `Phone Number`,
                    m_latest.Status AS `Status`, 
                    COALESCE(ca_agg.FirstAttorneyFromNote, m_first.AssignedToName) AS `First Attorney`,
                    COALESCE(ca_agg.LastAttorneyFromNote, m_latest.AssignedToName) AS `Last Attorney`
                
                FROM b4t_clients c
                
                INNER JOIN (
                    SELECT m1.* FROM b4t_matters m1
                    INNER JOIN (
                        SELECT InternalClientID, MAX(InternalProjectID) as MaxID 
                        FROM b4t_matters 
                        WHERE CreatedDate >= '2023-01-01' 
                          -- Hardcoded Rule 281: Exclude Closed statuses
                          AND Status != 'Closed'
                        GROUP BY InternalClientID
                    ) m2 ON m1.InternalProjectID = m2.MaxID
                ) m_latest ON c.InternalClientID = m_latest.InternalClientID
                
                LEFT JOIN (
                    SELECT m3.* FROM b4t_matters m3
                    INNER JOIN (
                        SELECT InternalClientID, MIN(InternalProjectID) as MinID 
                        FROM b4t_matters 
                        GROUP BY InternalClientID
                    ) m4 ON m3.InternalProjectID = m4.MinID
                ) m_first ON c.InternalClientID = m_first.InternalClientID
                
                LEFT JOIN (
                    SELECT `Client ID`, MAX(`Total Balance`) as `Total Balance`, MAX(`Outstanding Balance`) as `Outstanding Balance`, MAX(`Unbilled Balance`) as `Unbilled Balance`
                    FROM v_b4t_billing_data GROUP BY `Client ID`
                ) bd ON c.InternalClientID = bd.`Client ID`
                
                LEFT JOIN (
                    SELECT `Client ID`, MAX(`Retainer Paid`) as `Retainer Paid`
                    FROM v_master_client_log GROUP BY `Client ID`
                ) mcl ON c.InternalClientID = mcl.`Client ID`
                
                LEFT JOIN (
                    SELECT ca.InternalClientID,
                        NULLIF(TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(ca.CaseAssignmentNote,'(?i)first[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*[^\\n\\r]+'),'(?i)^first[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*','')),'') AS FirstAttorneyFromNote,
                        NULLIF(TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(ca.CaseAssignmentNote,'(?i)last[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*[^\\n\\r]+'),'(?i)^last[[:space:]]+att(?:ny|y)[[:space:]]*:[[:space:]]*','')),'') AS LastAttorneyFromNote
                    FROM (
                        SELECT InternalClientID, SUBSTRING_INDEX(GROUP_CONCAT(REPLACE(NoteText, '\\r', '') ORDER BY CreatedDate DESC SEPARATOR '|||'),'|||',1) AS CaseAssignmentNote
                        FROM b4t_clientnote WHERE LOWER(NoteText) LIKE '%[case assignment]%' GROUP BY InternalClientID
                    ) ca
                ) ca_agg ON c.InternalClientID = ca_agg.InternalClientID
                
                LEFT JOIN (
                    SELECT 
                        InternalClientID, 
                        SUM(PmtAmount) as TotalPaid,
                        SUBSTRING_INDEX(GROUP_CONCAT(CONCAT('* $', FORMAT(PmtAmount, 2)) ORDER BY PmtDate DESC SEPARATOR '\\n'), '\\n', 5) AS Last5Amounts,
                        SUBSTRING_INDEX(GROUP_CONCAT(CONCAT('* ', DATE_FORMAT(PmtDate, '%c/%e/%Y')) ORDER BY PmtDate DESC SEPARATOR '\\n'), '\\n', 5) AS Last5Dates
                    FROM b4t_payments WHERE PmtDate > '1900-01-01' GROUP BY InternalClientID
                ) p_agg ON c.InternalClientID = p_agg.InternalClientID
                
                WHERE 
                  -- Hardcoded Rule 282: Include only Active client statuses
                  c.ClientStatus = 'Active'
                  -- Hardcoded Rule 280: Exclude Admin accounts
                  AND c.ClientName NOT LIKE '%Admin%'
                
                ORDER BY c.ClientName ASC;
            """)
            inoffice_rows = mysql_cursor.fetchall()
            
        if inoffice_rows:
            print(f"Fetched {len(inoffice_rows)} In-Office records from MySQL. Preparing to insert into Neon...")

            create_inoffice_table_sql = """
            DROP TABLE IF EXISTS dyn_snippet_inoffice_clients CASCADE;
            CREATE TABLE dyn_snippet_inoffice_clients (
                "Client Name" TEXT,
                "Matter Type" TEXT,
                "Matter ID" TEXT,
                "Assigned Attorney" TEXT,
                "Last Payment" TEXT,
                "Last Payment Date" TEXT,
                "Total Balance" NUMERIC,
                "Outstanding Balance" NUMERIC,
                "Unbilled Balance" NUMERIC,
                "Balance:" NUMERIC,
                "Email Address" TEXT,
                "Phone Number" TEXT,
                "Status" TEXT,
                "First Attorney" TEXT,
                "Last Attorney" TEXT
            );
            """
            pg_cursor_inoffice.execute(create_inoffice_table_sql)
            
            insert_inoffice_sql = """
            INSERT INTO dyn_snippet_inoffice_clients (
                "Client Name", "Matter Type", "Matter ID", "Assigned Attorney",
                "Last Payment", "Last Payment Date", "Total Balance", "Outstanding Balance",
                "Unbilled Balance", "Balance:", "Email Address", "Phone Number",
                "Status", "First Attorney", "Last Attorney"
            ) VALUES %s
            """
            
            inoffice_values = []
            for r in inoffice_rows:
                inoffice_values.append((
                    r.get('Client Name', ''),
                    r.get('Matter Type', ''),
                    str(r.get('Matter ID', '')),
                    r.get('Assigned Attorney', ''),
                    str(r.get('Last Payment', '')),
                    str(r.get('Last Payment Date', '')),
                    r.get('Total Balance', 0),
                    r.get('Outstanding Balance', 0),
                    r.get('Unbilled Balance', 0),
                    r.get('Balance:', 0),
                    r.get('Email Address', ''),
                    r.get('Phone Number', ''),
                    r.get('Status', ''),
                    r.get('First Attorney', ''),
                    r.get('Last Attorney', '')
                ))
                
            print("Inserting In-Office Clients data into Neon...")
            psycopg2.extras.execute_values(pg_cursor_inoffice, insert_inoffice_sql, inoffice_values, page_size=1000)
            print(f"Successfully migrated {len(inoffice_rows)} In-Office rows to Neon PostgreSQL!")

        # 5. Update sync metadata (Active)
        pg_cursor.execute("CREATE TABLE IF NOT EXISTS sync_metadata (id SERIAL PRIMARY KEY, last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        pg_cursor.execute("TRUNCATE TABLE sync_metadata")
        pg_cursor.execute("INSERT INTO sync_metadata (last_sync) VALUES (CURRENT_TIMESTAMP)")
        pg_conn.commit()

        # Update sync metadata (Disabled)
        pg_cursor_disabled.execute("CREATE TABLE IF NOT EXISTS sync_metadata (id SERIAL PRIMARY KEY, last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        pg_cursor_disabled.execute("TRUNCATE TABLE sync_metadata")
        pg_cursor_disabled.execute("INSERT INTO sync_metadata (last_sync) VALUES (CURRENT_TIMESTAMP)")
        pg_conn_disabled.commit()

        # Update sync metadata (In-Office)
        pg_cursor_inoffice.execute("CREATE TABLE IF NOT EXISTS sync_metadata (id SERIAL PRIMARY KEY, last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        pg_cursor_inoffice.execute("TRUNCATE TABLE sync_metadata")
        pg_cursor_inoffice.execute("INSERT INTO sync_metadata (last_sync) VALUES (CURRENT_TIMESTAMP)")
        pg_conn_inoffice.commit()
        
        print(f"ETL Complete!")

    except Exception as e:
        print(f"An error occurred: {e}")
        if 'pg_conn' in locals():
            pg_conn.rollback()
        if 'pg_conn_disabled' in locals():
            pg_conn_disabled.rollback()
        if 'pg_conn_inoffice' in locals():
            pg_conn_inoffice.rollback()
    finally:
        if 'mysql_conn' in locals() and mysql_conn.open:
            mysql_conn.close()
        if 'pg_cursor' in locals():
            pg_cursor.close()
        if 'pg_conn' in locals():
            pg_conn.close()
        if 'pg_cursor_disabled' in locals():
            pg_cursor_disabled.close()
        if 'pg_conn_disabled' in locals():
            pg_conn_disabled.close()
        if 'pg_cursor_inoffice' in locals():
            pg_cursor_inoffice.close()
        if 'pg_conn_inoffice' in locals():
            pg_conn_inoffice.close()

if __name__ == "__main__":
    migrate_data()
