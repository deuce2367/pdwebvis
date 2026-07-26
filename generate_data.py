import sqlite3
import argparse
import random
import string
import time
import os
import datetime

def generate_random_string(length):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_data(hours, interval):
    # mssn pool: typically 3 to 12 distinct values, between 2000 and 4999
    num_mssn = random.randint(3, 12)
    mssn_pool = random.sample(range(2000, 5000), num_mssn)
    msic_map = {mssn: mssn * 100 + random.randint(0, 99) for mssn in mssn_pool}
    
    num_acq_hosts = random.randint(2, 6)
    acq_hosts = [f"acqhost{n:02d}" for n in random.sample(range(1, 100), num_acq_hosts)]
    
    end_time = datetime.datetime.now(datetime.timezone.utc)
    start_time = end_time - datetime.timedelta(hours=hours)
    
    epoch_1950 = datetime.datetime(1950, 1, 1, tzinfo=datetime.timezone.utc)
    
    num_days = int(hours / 24)
    if num_days == 0:
        num_days = 1
        
    days_profile = []
    for week_start in range(0, num_days, 7):
        week_days = list(range(week_start, min(week_start + 7, num_days)))
        if len(week_days) >= 3:
            no_data = random.choice(week_days)
            week_days.remove(no_data)
            high_data = random.choice(week_days)
            week_days.remove(high_data)
            low_data = random.choice(week_days)
            week_days.remove(low_data)
            special = {no_data: 'none', high_data: 'high', low_data: 'low'}
        else:
            special = {}
        for d in week_days:
            special[d] = 'normal'
        for d in range(week_start, min(week_start + 7, num_days)):
            days_profile.append(special.get(d, 'normal'))
            
    data = []
    for d in range(num_days):
        mode = days_profile[d]
        if mode == 'none':
            continue
            
        day_start = start_time + datetime.timedelta(days=d)
        
        if mode == 'high':
            active_hours = random.uniform(6.0, 8.0)
        elif mode == 'low':
            active_hours = random.uniform(1.0, 2.0)
        else:
            active_hours = random.uniform(3.0, 6.0)
            
        max_start_offset = 24.0 - active_hours
        start_offset = random.uniform(0, max_start_offset)
        
        current_time = day_start + datetime.timedelta(hours=start_offset)
        active_end_time = current_time + datetime.timedelta(hours=active_hours)
        
        while current_time < active_end_time:
            # Run duration: 5 to 15 minutes
            run_duration_sec = random.randint(5 * 60, 15 * 60)
            
            # 1 to 4 active mssns during this run
            num_active_mssn = random.randint(1, min(4, num_mssn))
            active_mssns = random.sample(mssn_pool, num_active_mssn)
            
            # Align current_time to interval so time8 lands on multiples of interval
            remainder = current_time.timestamp() % interval
            if remainder > 0:
                current_time -= datetime.timedelta(seconds=remainder)

            run_end_time = min(current_time + datetime.timedelta(seconds=run_duration_sec), active_end_time)
            
            t = current_time
            while t <= run_end_time:
                for mssn in active_mssns:
                    if random.random() < 0.01:
                        continue
                
                    # Derive time-based values
                    unix_us = int(t.timestamp() * 1_000_000)
                    tc_ws = (t - epoch_1950).total_seconds()
                    tc_fs = 0.0 # natural second intervals
                    
                    evstr = f"{t.year % 100:02d}{t.month:02d}{t.day:02d}{t.hour:02d}{t.minute // 10}"
                    evnt = int(evstr)
                    
                    date8 = f"{t.year:04d}{t.month:02d}{t.day:02d}"
                    time8 = f"{t.hour:02d}{t.minute:02d}{t.second:02d}"
                    
                    msic = msic_map[mssn]
                    rx_srate_val = 20.0
                    nelem_val = int(rx_srate_val * 1e6 * interval)
                    
                    row = (
                        evnt,
                        unix_us,
                        tc_ws,
                        tc_fs,
                        f'/data/pd/{evnt}/{mssn}/{time8}', # path
                        'pdfile.prm', # mgul
                        'pkfile.prm', # pkul
                        msic, # msic
                        mssn, # mssn
                        nelem_val, # nelem
                        2145.0, # rx_mhz
                        10.0, # rx_bw
                        rx_srate_val, # rx_srate
                        0.0, # if_mhz
                        random.uniform(10000.0, 99999.0), # pdel_nb
                        random.uniform(1e-8, 9e-8), # pdel_wb
                        0.0, # pdel_dif
                        0.0, # avg_xdel
                        'CI', # fmt2
                        generate_random_string(4), # rx_band
                        generate_random_string(4), # rx_dpath
                        '021450', # freq8
                        evstr, # evstr
                        date8, # date8
                        time8, # time8
                        random.choice(acq_hosts), # acq_host
                        f'{{A:MG_EVENT="{evstr}"}}', # tag_gen
                        '{D:RX_BW=10,LD_SNAP_ETF=' + str(random.randint(1000, 3000)) + '}' # tag_acq
                    )
                    data.append(row)
                
                t += datetime.timedelta(seconds=interval)
            
            # Gap between runs during active window (20-40 mins)
            gap_sec = random.randint(20 * 60, 40 * 60)
            current_time = run_end_time + datetime.timedelta(seconds=gap_sec)
        
    return data

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic data for PRED_info table.")
    parser.add_argument("--db", default="test.db", help="Path to SQLite database file.")
    parser.add_argument("--schema", default="schema.sql", help="Path to schema file.")
    parser.add_argument("--hours", type=float, default=168.0, help="Number of hours of data to generate (default 168).")
    default_interval = int(os.environ.get("PRED_SIZE", 5))
    parser.add_argument("--interval", type=int, default=default_interval, help=f"Interval in seconds for time steps (default {default_interval}).")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    
    if os.path.exists(args.schema):
        with open(args.schema, 'r') as f:
            try:
                conn.executescript(f.read())
            except sqlite3.OperationalError as e:
                if "already exists" not in str(e):
                    print(f"Warning/Error when applying schema: {e}")
    else:
        print(f"Schema file {args.schema} not found, assuming table exists.")

    print(f"Generating data over {args.hours} hours with interval {args.interval}s...")
    rows = generate_data(args.hours, args.interval)

    print(f"Generated {len(rows)} rows. Inserting data into database...")
    insert_sql = """
        INSERT INTO PRED_info (
            evnt, unix_us, tc_ws, tc_fs, path, mgul, pkul, msic, mssn, nelem,
            rx_mhz, rx_bw, rx_srate, if_mhz, pdel_nb, pdel_wb, pdel_dif, avg_xdel,
            fmt2, rx_band, rx_dpath, freq8, evstr, date8, time8, acq_host, tag_gen, tag_acq
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """
    
    cursor = conn.cursor()
    # Insert in chunks if it's too large, though sqlite handles large executemany reasonably well
    cursor.executemany(insert_sql, rows)
    conn.commit()
    conn.close()
    
    print(f"Successfully inserted {len(rows)} rows into {args.db}.")

if __name__ == "__main__":
    main()
