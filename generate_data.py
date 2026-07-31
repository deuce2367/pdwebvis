import sqlite3
import argparse
import random
import string
import time
import os
import datetime
import json
from db_adapter import SQLiteAdapter, PostgresAdapter, MariaDBAdapter

def generate_random_json():
    num_pairs = random.randint(5, 20)
    data = {}
    keys = ["status", "version", "mode", "temperature", "voltage", "calibration_id", "gain", "offset", "snr", "ber", "modulation", "bandwidth", "frequency", "agc_level", "rx_port", "antenna", "location", "operator", "sw_rev", "hw_rev", "target", "mission", "encryption", "compression"]
    for _ in range(num_pairs):
        key = random.choice(keys) + "_" + generate_random_string(2).lower()
        if random.random() < 0.3:
            value = generate_random_string(8)
        elif random.random() < 0.6:
            value = random.choice(["active", "standby", "offline", "nominal", "critical", "warning", "calibrating"])
        else:
            value = round(random.uniform(0.1, 100.0), 2)
        data[key] = value
    return json.dumps(data)

def generate_random_string(length):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_data(hours, interval):
    # mssn pool: typically 3 to 6 distinct values, between 2000 and 4999
    num_global_mssn = random.randint(3, 6)
    global_mssn_pool = random.sample(range(2000, 5000), num_global_mssn)

    # suffix pool: 6 to 12 distinct values
    num_global_suffix = random.randint(6, 12)
    global_suffix_pool = random.sample(range(0, 100), num_global_suffix)
    
    print(f"[*] Initialized Global Pools:")
    print(f"    MSSNs ({num_global_mssn}): {global_mssn_pool}")
    print(f"    Suffixes ({num_global_suffix}): {[f'{i:02d}' for i in global_suffix_pool]}")
    
    num_acq_hosts = random.randint(2, 6)
    acq_hosts = [f"acqhost{n:02d}" for n in random.sample(range(1, 100), num_acq_hosts)]
    
    end_time = datetime.datetime.now(datetime.timezone.utc)
    start_time = end_time - datetime.timedelta(hours=hours)
    
    epoch_1950 = datetime.datetime(1950, 1, 1, tzinfo=datetime.timezone.utc)

    
    num_days = int(hours / 24)
    if num_days == 0:
        num_days = 1
        
    data = []
    total_hours = int(hours)
    
    current_time = start_time
    
    current_day_date = None
    daily_mssn_pool = []
    msic_map = {}
    
    for h in range(total_hours):
        hour_of_day = current_time.hour
        day_date = current_time.date()
        
        # New Day logic: 3 to 8 MSSN values drawn from global pool
        if day_date != current_day_date:
            current_day_date = day_date
            num_mssn_today = random.randint(3, min(8, len(global_mssn_pool)))
            daily_mssn_pool = random.sample(global_mssn_pool, num_mssn_today)
            
            # MSIC values should use one of those MSSNs for first 4 digits and 2 digit suffix from global_suffix_pool
            msic_map = {mssn: mssn * 100 + random.choice(global_suffix_pool) for mssn in daily_mssn_pool}
        
        # Day/Night cycle probabilities
        if hour_of_day >= 23 or hour_of_day <= 7:
            # Busy period (80% chance of data)
            is_active = random.random() < 0.8
        else:
            # Quiet period (10% chance of data)
            is_active = random.random() < 0.1
            
        if not is_active:
            current_time += datetime.timedelta(hours=1)
            continue
            
        # If active, generate a contiguous run in this hour (5 to 15 mins)
        run_duration_sec = random.randint(5 * 60, 15 * 60)
        num_active_mssn = random.randint(1, min(4, len(daily_mssn_pool)))
        active_mssns = random.sample(daily_mssn_pool, num_active_mssn)
        # Lock the MSIC mappings for this extent
        run_msic_map = {mssn: msic_map[mssn] for mssn in active_mssns}
        
        # Start somewhere in the first half of the hour
        start_offset_sec = random.randint(0, 30 * 60)
        run_start = current_time + datetime.timedelta(seconds=start_offset_sec)
        
        # Align to interval
        remainder = run_start.timestamp() % interval
        if remainder > 0:
            run_start -= datetime.timedelta(seconds=remainder)
            
        run_end = min(run_start + datetime.timedelta(seconds=run_duration_sec), current_time + datetime.timedelta(hours=1))
        
        t = run_start
        while t <= run_end:
            for mssn in active_mssns:
                if random.random() < 0.01:
                    continue
            
                unix_us = int(t.timestamp() * 1_000_000)
                tc_ws = (t - epoch_1950).total_seconds()
                tc_fs = 0.0 
                
                evstr = f"{t.year % 100:02d}{t.month:02d}{t.day:02d}{t.hour:02d}{t.minute // 10}"
                evnt = int(evstr)
                
                date8 = f"{t.year:04d}{t.month:02d}{t.day:02d}"
                time8 = f"{t.hour:02d}{t.minute:02d}{t.second:02d}"
                
                msic = run_msic_map[mssn]
                rx_srate_val = 20.0
                nelem_val = int(rx_srate_val * 1e6 * 5.0) + random.randint(-8192, 8192)
                
                row = (
                    evnt, unix_us, tc_ws, tc_fs,
                    f'/data/pd/{evnt}/{mssn}/{time8}', 'pdfile.prm', 'pkfile.prm',
                    msic, mssn, nelem_val,
                    2145.0, 10.0, rx_srate_val, 0.0,
                    random.uniform(10000.0, 99999.0), random.uniform(1e-8, 9e-8), 0.0, 0.0,
                    'CI', generate_random_string(4), generate_random_string(4), '021450',
                    evstr, date8, time8, random.choice(acq_hosts),
                    generate_random_json(), generate_random_json()
                )
                data.append(row)
            
            t += datetime.timedelta(seconds=interval)
            
        current_time += datetime.timedelta(hours=1)
        
    return data

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic data for PRED_info table.")
    parser.add_argument("--db", default="test.db", help="Path to SQLite database file.")
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"), help="Database URL (e.g. postgresql://...)")
    parser.add_argument("--schema", default="schema.sql", help="Path to schema file (only used for SQLite).")
    parser.add_argument("--hours", type=float, default=168.0, help="Number of hours of data to generate (default 168).")
    default_interval = int(os.environ.get("PRED_SIZE", 5))
    parser.add_argument("--interval", type=int, default=default_interval, help=f"Interval in seconds for time steps (default {default_interval}).")
    args = parser.parse_args()

    if args.db_url and (args.db_url.startswith('postgres://') or args.db_url.startswith('postgresql://')):
        db_adapter = PostgresAdapter(args.db_url)
    elif args.db_url and (args.db_url.startswith('mysql://') or args.db_url.startswith('mariadb://')):
        db_adapter = MariaDBAdapter(args.db_url)
    else:
        db_adapter = SQLiteAdapter(args.db)
        # Apply schema for sqlite if missing
        if os.path.exists(args.schema):
            import sqlite3
            conn = sqlite3.connect(args.db)
            with open(args.schema, 'r') as f:
                try:
                    conn.executescript(f.read())
                except sqlite3.OperationalError as e:
                    pass
            conn.close()

    days = args.hours / 24
    duration_str = f"{int(days)} days" if days >= 1 and days.is_integer() else f"{args.hours} hours"
    print(f"Initializing database: Generating {duration_str} of synthetic records (interval: {args.interval}s)...")
    rows = generate_data(args.hours, args.interval)


    # Prefix PRED_info if DB_SCHEMA is provided
    db_schema = os.environ.get("DB_SCHEMA", "")
    tbl_prefix = f"{db_schema}." if db_schema else ""
    table_name = f"{tbl_prefix}PRED_info"

    print(f"Generated {len(rows)} rows. Bulk inserting data into {table_name}...")
    insert_sql = f"""
        INSERT INTO {table_name} (
            evnt, unix_us, tc_ws, tc_fs, path, mgul, pkul, msic, mssn, nelem,
            rx_mhz, rx_bw, rx_srate, if_mhz, pdel_nb, pdel_wb, pdel_dif, avg_xdel,
            fmt2, rx_band, rx_dpath, freq8, evstr, date8, time8, acq_host, tag_gen, tag_acq
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """

    
    with db_adapter.get_connection() as conn:
        cursor = conn.cursor()
        cursor.executemany(insert_sql, rows)
        conn.commit()
    
    db_target = args.db_url if args.db_url else args.db
    print(f"Successfully inserted {len(rows)} rows into {db_target}.")

if __name__ == "__main__":
    main()
