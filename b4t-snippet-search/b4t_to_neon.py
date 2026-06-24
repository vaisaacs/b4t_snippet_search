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
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL", "postgresql://user:pass@host/dbname?sslmode=require")

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

    print("Connecting to Neon PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(NEON_DATABASE_URL)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to Neon PostgreSQL: {e}")
        return

    try:
        # 1. Extract data from MySQL
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
        
        if not rows:
            print("No data found in MySQL dyn_snippet_search_master.")
            return
            
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
        pg_conn.commit()
        
        print(f"Successfully migrated {len(rows)} rows to Neon PostgreSQL!")

    except Exception as e:
        print(f"An error occurred: {e}")
        pg_conn.rollback()
    finally:
        mysql_conn.close()
        pg_cursor.close()
        pg_conn.close()
        print("Connections closed.")

if __name__ == "__main__":
    migrate_data()
