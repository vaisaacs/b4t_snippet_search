"""
This script exports data from the Bill4Time API to a PostgreSQL (Neon) database.
Requirements:
pip install requests pandas python-dotenv psycopg2-binary
"""
import os
import sys
import time
import re
from datetime import datetime
from urllib.parse import quote
import json

import pandas as pd
import numpy as np
import requests
from requests import Session
from dotenv import load_dotenv

import psycopg2
import psycopg2.extras

# Load environment variables
load_dotenv()

API_KEY = os.getenv("B4T_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

BASE_URL = f"https://secure.bill4time.com/b4t-api/{API_KEY}/v2"
MAX_WORKERS = 4

DATE_FIELD_MAP = {
    'users': 'CreatedDate',
    'clients': 'CreationDate', 
    'invoices': 'InvoiceDate',
    'expenses': 'ExpenseDate',
    'paymentsandbalanceadjustments': 'PmtDate',
    'timeEntries': 'CreatedDate',
    'projects': 'CreatedDate',
    'clientnotes': 'CreatedDate',
    'trustAccounting': 'DateCreated',
    'paymentsApplied': 'DateApplied'
}

ENTITY_TABLE_MAP = {
    'users': 'b4t_users',
    'clients': 'b4t_clients',
    'projects': 'b4t_matters',
    'clientnotes': 'b4t_clientnote',
    'invoices': 'b4t_invoices',
    'expenses': 'b4t_expenses',
    'paymentsandbalanceadjustments': 'b4t_payments',
    'timeEntries': 'b4t_timeentries',
    'trustAccounting': 'b4t_trustaccounting',
    'paymentsApplied': 'b4t_paymentsapplied'
}

NO_DATE_FILTER_ENTITIES = []
PARTIAL_REFRESH_MONTHS = 8
PARTIAL_REFRESH_CONFIG = {
    'timeEntries': {'table': 'b4t_timeentries', 'date_column': 'created_date'},
    'clientnotes': {'table': 'b4t_clientnote', 'date_column': 'created_date'}
}

def get_pg_connection():
    return psycopg2.connect(DATABASE_URL)

def truncate_target_tables():
    table_names = [
        'b4t_users',
        'b4t_clients',
        'b4t_expenses',
        'b4t_invoices',
        'b4t_matters',
        'b4t_payments',
        'b4t_paymentsapplied',
        'b4t_trustaccounting',
    ]
    conn = get_pg_connection()
    cursor = conn.cursor()
    try:
        for table in table_names:
            try:
                cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
                print(f"[INFO]  Truncated table: {table}")
            except Exception as e:
                print(f"[WARNING]  Could not truncate table {table}: {e}")
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def delete_recent_records(table: str, date_column: str, start_date: str) -> int:
    if not start_date: return 0
    conn = get_pg_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM {table} WHERE {date_column} >= %s", (start_date,))
        deleted = cursor.rowcount
        conn.commit()
        print(f"[INFO] Removed {deleted} rows from '{table}' where '{date_column}' >= {start_date}.")
        return deleted
    except Exception as exc:
        print(f"[ERROR] Failed to delete recent rows from '{table}': {exc}")
        return 0
    finally:
        cursor.close()
        conn.close()

def cleanup_deleted_timeentries() -> int:
    conn = get_pg_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM b4t_timeentries WHERE status = 'Deleted'")
        deleted = cursor.rowcount
        conn.commit()
        return deleted
    except Exception as exc:
        print(f"[WARNING] Could not clean up 'Deleted' records from 'b4t_timeentries': {exc}")
        return 0
    finally:
        cursor.close()
        conn.close()

def fetch_b4t_data(session: Session, entity: str, start_date=None, end_date=None):
    url = f"{BASE_URL}/{entity}"
    date_field = DATE_FIELD_MAP.get(entity)
    if date_field and start_date and entity not in NO_DATE_FILTER_ENTITIES:
        filter_str = f"{date_field} >= '{start_date}'"
        if end_date:
            filter_str += f" and {date_field} <= '{end_date}'"
        url += f"?$filter={quote(filter_str)}"
    print(f"[INFO] Fetching data for '{entity}'...")
    try:
        response = session.get(url, timeout=90)
        response.raise_for_status()
        data = response.json()
        records = data.get('value', data.get('data', []))
        print(f"[SUCCESS] Retrieved {len(records):,} records for '{entity}'.")
        return records
    except Exception as e:
        print(f"[ERROR] Network error fetching '{entity}': {e}")
    return []

# Helper to convert CamelCase to snake_case for PostgreSQL columns
def to_snake_case(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def convert_to_snake_case_columns(df):
    mapping = {}
    for col in df.columns:
        if col.lower() == 'internalclientid': mapping[col] = 'internal_client_id'
        elif col.lower() == 'internalprojectid': mapping[col] = 'internal_project_id'
        elif col.lower() == 'internalinvoiceid': mapping[col] = 'internal_invoice_id'
        elif col.lower() == 'paidstatus': mapping[col] = 'paid_status'
        else: mapping[col] = to_snake_case(col)
    return df.rename(columns=mapping)

def format_dataframe_dates(df):
    date_columns = {
        'creationdate', 'createddate', 'invoicedate', 'expensedate', 
        'pmtdate', 'entrydate', 'datetransaction', 'datecreated',
        'dateapplied', 'projectduedate', 'closedate', 'startdate',
        'datecleared', 'checkvoiddate', 'qbsyncdate', 'dateupdated', 'updateddate'
    }
    time_columns = {'endtime'}

    for col in df.columns:
        col_lower = col.lower()
        if col_lower in date_columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
        elif col_lower in time_columns:
            # Try extracting time if it's parsed as datetime
            try:
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%H:%M:%S')
            except Exception:
                pass
    return df

def convert_bool_columns(df, entity):
    bool_columns_map = {
        'projects': [
            'HideTimeOnInvoiceDefault', 'HideExpenseOnInvoiceDefault', 'AllowABACodes'
        ],
        'expenses': [
            'Reimburse', 'ExcludeFromInvoice', 'Taxable'
        ],
        'timeEntries': [
            'Billable', 'FlatFeeFlag', 'PercentageFlag', 'HourlyFlag', 'ExcludeFromInvoice', 'OvertimeFlag', 'DoubletimeRateFlag'
        ],
        'trustAccounting': [
            'PayIn', 'Payment', 'Transfer', 'CheckVoided'
        ],
        'paymentsandbalanceadjustments': [],
        'clients': [],
        'invoices': [
            'ShowLaborSummary', 'ShowExpSummary'
        ],
        'clientnotes': [],
        'paymentsApplied': []
    }
    bool_cols = bool_columns_map.get(entity, [])
    for col in df.columns:
        # Case insensitive match to bool columns
        if any(c.lower() == col.lower() for c in bool_cols):
            df[col] = df[col].apply(lambda x: True if str(x).lower() in ['true', '1'] else False if str(x).lower() in ['false', '0'] else None)
    return df

def insert_data_to_pg(table: str, data: list, entity: str):
    if not data: return 0, 0
    df = pd.DataFrame(data)
    df = df.loc[:, df.columns.notna()]
    
    if entity == 'clients' and 'ClientName' in df.columns:
        def extract_prefixes(client_name):
            if pd.isna(client_name): return None
            match = re.match(r'^((?:\[.*?\]|\(.*?\)\s*)*)(.*)', str(client_name))
            if not match: return None
            prefixes = re.findall(r'\[(.*?)\]', match.group(1))
            valid_prefixes = [p.strip() for p in prefixes if not re.fullmatch(r'\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*', p)]
            return ' '.join(valid_prefixes) if valid_prefixes else None
        df['ClientPrefix'] = df['ClientName'].apply(extract_prefixes)
        
    df = format_dataframe_dates(df)
    df = convert_bool_columns(df, entity)
    df = convert_to_snake_case_columns(df)
    
    conn = get_pg_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
    table_columns = [row[0] for row in cursor.fetchall()]
    
    filtered_cols = [col for col in df.columns if col in table_columns]
    if not filtered_cols: return len(data), 0
    df = df[filtered_cols]
    
    if entity == 'timeEntries' and 'status' in df.columns:
        df = df[df['status'] != 'Deleted']
        
    df = df.replace({np.nan: None, 'NaN': None, 'nan': None, 'NULL': None, 'null': None, '': None, 'N/A': None})

    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    before_count = cursor.fetchone()[0]

    columns = ', '.join(df.columns)
    
    # We use execute_values for efficient batch insert
    insert_sql = f"INSERT INTO {table} ({columns}) VALUES %s ON CONFLICT DO NOTHING"
    
    # For UPSERT tables like matters and clients
    if table in ['b4t_clients', 'b4t_matters', 'b4t_users', 'tbl_clientlinks_googledrive_b4t']:
        cursor.execute(f"""
            SELECT a.attname
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = '{table}'::regclass AND i.indisprimary;
        """)
        pk = cursor.fetchone()
        if pk:
            update_set = ', '.join([f"{col} = EXCLUDED.{col}" for col in df.columns if col != pk[0]])
            if update_set:
                insert_sql = f"INSERT INTO {table} ({columns}) VALUES %s ON CONFLICT ({pk[0]}) DO UPDATE SET {update_set}"

    rows = [tuple(x) for x in df.to_numpy()]
    try:
        psycopg2.extras.execute_values(cursor, insert_sql, rows, page_size=1000)
        conn.commit()
    except Exception as e:
        print(f"[ERROR] Insert failed for '{table}': {e}")
        conn.rollback()

    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    actual_inserted = cursor.fetchone()[0] - before_count
    cursor.close()
    conn.close()
    return len(data), actual_inserted

def process_entities(entity_params):
    dependency_order = ['users', 'clients', 'projects', 'clientnotes', 'invoices', 'expenses', 'paymentsandbalanceadjustments', 'timeEntries', 'trustAccounting', 'paymentsApplied']
    results = {}
    with requests.Session() as session:
        session.headers.update({'User-Agent': 'Bill4Time-Export/2.0', 'Accept': 'application/json'})
        for entity in dependency_order:
            if entity not in entity_params: continue
            params = entity_params[entity]
            start_date = params.get('start_date')
            refresh_cfg = PARTIAL_REFRESH_CONFIG.get(entity)
            if refresh_cfg and start_date:
                delete_recent_records(refresh_cfg['table'], refresh_cfg['date_column'], start_date)
            entity_data = fetch_b4t_data(session, entity, start_date, params.get('end_date'))
            table = ENTITY_TABLE_MAP.get(entity, entity)
            fetched, inserted = insert_data_to_pg(table, entity_data, entity)
            results[entity] = {'fetched': fetched, 'inserted': inserted}
    return results

def main():
    if not API_KEY or not DATABASE_URL:
        print("[FATAL] B4T_API_KEY or DATABASE_URL environment variables not set.")
        sys.exit(1)
        
    cleanup_deleted_timeentries()
    truncate_target_tables()

    te_start_date = (datetime.now().replace(day=1) - pd.DateOffset(months=PARTIAL_REFRESH_MONTHS)).strftime('%Y-%m-%d')
    entities = {
        'users': {'start_date': None, 'end_date': None},
        'clients': {'start_date': None, 'end_date': None},
        'projects': {'start_date': None, 'end_date': None},
        'clientnotes': {'start_date': te_start_date, 'end_date': None},
        'invoices': {'start_date': '2020-01-01', 'end_date': None},
        'expenses': {'start_date': '2020-01-01', 'end_date': None},
        'paymentsandbalanceadjustments': {'start_date': '2020-01-01', 'end_date': None},
        'timeEntries': {'start_date': te_start_date, 'end_date': None},
        'trustAccounting': {'start_date': '2020-01-01', 'end_date': None},
        'paymentsApplied': {'start_date': '2020-01-01', 'end_date': None},
    }
    process_entities(entities)
    print("[SUCCESS] Export to Neon PostgreSQL complete.")

if __name__ == "__main__":
    main()
