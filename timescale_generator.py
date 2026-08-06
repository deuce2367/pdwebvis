import argparse
import time
import random
import math
import psycopg2
import os
from psycopg2.extras import execute_values
from datetime import datetime, timedelta, timezone

# Plausible metric names for simulation
PLAUSIBLE_METRICS = [
    "cpu_usage_pct", "memory_used_mb", "temperature_c", 
    "humidity_pct", "voltage_v", "current_a", 
    "bytes_sent", "bytes_recv", "disk_io_read", "disk_io_write",
    "fan_speed_rpm", "battery_level_pct", "signal_strength_dbm",
    "pressure_hpa", "vibration_hz", "light_level_lux"
]

# Major US cities for spatial anchoring
ANCHOR_POINTS = [
    ("New York, NY", 40.7128, -74.0060),
    ("Los Angeles, CA", 34.0522, -118.2437),
    ("Chicago, IL", 41.8781, -87.6298),
    ("Houston, TX", 29.7604, -95.3698),
    ("Phoenix, AZ", 33.4484, -112.0740),
    ("Philadelphia, PA", 39.9526, -75.1652),
    ("San Antonio, TX", 29.4241, -98.4936),
    ("San Diego, CA", 32.7157, -117.1611),
    ("Dallas, TX", 32.7767, -96.7970),
    ("San Jose, CA", 37.3382, -121.8863),
    ("Austin, TX", 30.2672, -97.7431),
    ("Jacksonville, FL", 30.3322, -81.6557),
    ("Denver, CO", 39.7392, -104.9903),
    ("Seattle, WA", 47.6062, -122.3321),
    ("Miami, FL", 25.7617, -80.1918)
]

def get_metric_name(index):
    if index < len(PLAUSIBLE_METRICS):
        return PLAUSIBLE_METRICS[index]
    return f"custom_metric_{index}"

def setup_database(conn, table_name, num_metrics, geospatial, retention_days=None, chunk_interval="1 day"):
    """Create the table and turn it into a TimescaleDB hypertable if it doesn't exist."""
    with conn.cursor() as cur:
        # Build column definitions
        columns = [
            "time TIMESTAMPTZ NOT NULL",
            "device_id TEXT NOT NULL"
        ]
        
        if geospatial:
            columns.extend([
                "latitude DOUBLE PRECISION",
                "longitude DOUBLE PRECISION",
                "poi_name TEXT"
            ])
            
        for i in range(num_metrics):
            columns.append(f"{get_metric_name(i)} DOUBLE PRECISION")
            
        create_table_sql = f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                {', '.join(columns)}
            );
        """
        cur.execute(create_table_sql)
        
        # Ensure schema upgrades gracefully if the table already existed before we added geospatial POIs
        if geospatial:
            try:
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS poi_name TEXT;")
            except Exception:
                pass
        
        # Convert to TimescaleDB hypertable
        cur.execute(f"""
            SELECT create_hypertable('{table_name}', 'time', chunk_time_interval => INTERVAL '{chunk_interval}', if_not_exists => TRUE);
        """)
        
        # Ensure chunk time interval is updated if hypertable already existed
        cur.execute(f"""
            SELECT set_chunk_time_interval('{table_name}', INTERVAL '{chunk_interval}');
        """)
        
        # Commit table and hypertable changes first so they aren't rolled back if retention fails
        conn.commit()
        
        # Apply data retention policy if specified
        if retention_days:
            try:
                cur.execute(f"SELECT remove_retention_policy('{table_name}', if_exists => true);")
                conn.commit()
            except Exception:
                conn.rollback()
                
            try:
                cur.execute(f"""
                    SELECT add_retention_policy('{table_name}', INTERVAL '{retention_days} days');
                """)
                conn.commit()
                print(f"[*] Retention policy set: Data older than {retention_days} days will be auto-dropped by TimescaleDB.")
            except Exception as e:
                conn.rollback()
                print(f"[!] Note: Could not set native retention policy. You may need to use pg_cron or upgrade to TimescaleDB Community Edition. Error: {e}")

        # Create an index on device_id and time for faster querying
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS ix_{table_name}_device_time 
            ON {table_name} (device_id, time DESC);
        """)
        
        conn.commit()
        print(f"[*] Setup complete. Table '{table_name}' is ready.")

def generate_record(timestamp, device_id, num_metrics, geospatial):
    """Generate a single row of simulated data."""
    # Base pattern based on time of day (sine wave) + random noise
    hour_of_day = timestamp.hour + (timestamp.minute / 60.0)
    # Sinusoidal diurnal pattern, peaks around 14:00 (2 PM)
    diurnal_factor = math.sin((hour_of_day - 8) * (math.pi / 12)) 
    
    record = [timestamp, device_id]
    
    if geospatial:
        # Pick a random anchor point for this record so the map is nicely populated
        poi_name, base_lat, base_lon = random.choice(ANCHOR_POINTS)
        
        # Scatter loosely around the anchor point (~50 miles)
        lat = base_lat + random.uniform(-0.8, 0.8)
        lon = base_lon + random.uniform(-0.8, 0.8)
        record.extend([round(lat, 4), round(lon, 4), poi_name])
        
    for i in range(num_metrics):
        # Generate some plausible random values influenced by the diurnal factor
        base_val = 50.0 + (i * 10)
        noise = random.uniform(-5.0, 5.0)
        value = base_val + (diurnal_factor * 15.0) + noise
        record.append(round(max(0, value), 2)) # Keep it positive and rounded
        
    return tuple(record)

def insert_batch(conn, table_name, records, num_metrics, geospatial, debug=False):
    """Efficiently insert a batch of records using execute_values."""
    cols = ["time", "device_id"]
    if geospatial:
        cols.extend(["latitude", "longitude", "poi_name"])
    for i in range(num_metrics):
        cols.append(get_metric_name(i))
        
    insert_sql = f"""
        INSERT INTO {table_name} ({', '.join(cols)})
        VALUES %s
    """
    
    if debug:
        print(f"[*] DEBUG: Inserting batch of {len(records)} records...")
        for r in records:
            print(f"    {r}")
            
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, records)
    conn.commit()

def run_backfill(conn, table_name, hours, interval, num_metrics, geospatial, num_devices):
    """Backfill historical data."""
    print(f"[*] Starting backfill for the last {hours} hours...")
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours)
    
    current_time = start_time
    batch = []
    batch_size = 1000
    total_inserted = 0
    
    while current_time < end_time:
        for dev_id in range(1, num_devices + 1):
            record = generate_record(current_time, f"device_{dev_id}", num_metrics, geospatial)
            batch.append(record)
            
            if len(batch) >= batch_size:
                insert_batch(conn, table_name, batch, num_metrics, geospatial, False)
                total_inserted += len(batch)
                batch = []
                
        current_time += timedelta(seconds=interval)
        
    if batch:
        insert_batch(conn, table_name, batch, num_metrics, geospatial, False)
        total_inserted += len(batch)
        
    print(f"[*] Backfill complete. Inserted {total_inserted} historical records.")

def main():
    parser = argparse.ArgumentParser(description="TimescaleDB Time-Series Data Generator")
    parser.add_argument("--url", default=os.environ.get("DATABASE_URL"), help="PostgreSQL connection URL (e.g., postgresql://user:pass@localhost:5432/dbname)")
    parser.add_argument("--table", default=os.environ.get("TABLE_NAME", "sensor_data"), help="Name of the hypertable to insert data into")
    parser.add_argument("--interval", type=int, default=int(os.environ.get("INTERVAL", 5)), help="Interval in seconds between data points (default: 5)")
    parser.add_argument("--metrics", type=int, default=int(os.environ.get("METRICS", 5)), help="Number of metrics to simulate per record (default: 5)")
    
    # Parse boolean string gracefully
    env_geo = os.environ.get("GEOSPATIAL", "false").lower() in ("true", "1", "yes")
    parser.add_argument("--geospatial", action="store_true", default=env_geo, help="Include latitude and longitude in the payload")
    
    parser.add_argument("--backfill", type=int, default=int(os.environ.get("BACKFILL_HOURS", 0)), help="Number of hours of historical data to backfill (default: 0)")
    parser.add_argument("--devices", type=int, default=int(os.environ.get("DEVICES", 3)), help="Number of distinct devices to simulate (default: 3)")
    parser.add_argument("--retention-days", type=int, default=int(os.environ.get("RETENTION_DAYS", 0)), help="Auto-drop data older than this many days (0 to disable)")
    parser.add_argument("--chunk-interval", default=os.environ.get("CHUNK_INTERVAL", "auto"), help="TimescaleDB chunk time interval (default: auto)")
    
    env_debug = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
    parser.add_argument("--debug", action="store_true", default=env_debug, help="Enable debug mode to print inserted data")
    
    args = parser.parse_args()

    if args.chunk_interval == "auto":
        if args.retention_days > 0 and args.retention_days <= 3:
            args.chunk_interval = "12 hours"
        elif args.retention_days > 3 and args.retention_days <= 30:
            args.chunk_interval = "1 day"
        elif args.retention_days > 30:
            args.chunk_interval = "7 days"
        else:
            args.chunk_interval = "1 day"

    if not args.url:
        print("[!] Error: Database URL is required. Provide it via --url or DATABASE_URL environment variable.")
        return

    print("="*50)
    print("   TimescaleDB Time-Series Data Generator")
    print("="*50)
    print(f"[*] Configuration:")
    print(f"    - Database URL : {args.url.split('@')[-1]}")
    print(f"    - Table Name   : {args.table}")
    print(f"    - Interval     : {args.interval} seconds")
    print(f"    - Metrics      : {args.metrics}")
    print(f"    - Devices      : {args.devices}")
    print(f"    - Geospatial   : {'Enabled' if args.geospatial else 'Disabled'}")
    print(f"    - Backfill     : {args.backfill} hours")
    print(f"    - Retention    : {args.retention_days} days")
    print(f"    - Chunk Size   : {args.chunk_interval}")
    print(f"    - Debug Mode   : {'Enabled' if args.debug else 'Disabled'}")
    print("="*50)
    print("\n[*] Connecting to database...")
    try:
        conn = psycopg2.connect(args.url)
    except Exception as e:
        print(f"[!] Failed to connect to database: {e}")
        return

    try:
        setup_database(conn, args.table, args.metrics, args.geospatial, args.retention_days, args.chunk_interval)
        
        if args.backfill > 0:
            run_backfill(conn, args.table, args.backfill, args.interval, args.metrics, args.geospatial, args.devices)
            
        print(f"[*] Starting live data generation every {args.interval} seconds. Press Ctrl+C to stop.")
        
        while True:
            batch = []
            now = datetime.now(timezone.utc)
            for dev_id in range(1, args.devices + 1):
                record = generate_record(now, f"device_{dev_id}", args.metrics, args.geospatial)
                batch.append(record)
                
            insert_batch(conn, args.table, batch, args.metrics, args.geospatial, args.debug)
            if not args.debug:
                print(f"[{now.strftime('%H:%M:%S')}] Inserted {len(batch)} records.")
            
            time.sleep(args.interval)
            
    except KeyboardInterrupt:
        print("\n[*] Stopping data generator.")
    except Exception as e:
        print(f"\n[!] An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
