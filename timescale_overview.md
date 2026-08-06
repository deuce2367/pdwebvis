# TimescaleDB Overview & Best Practices

This document summarizes the core mechanics of TimescaleDB, focusing on how it manages time-series data, automates data lifecycles, and compares to native PostgreSQL partitioning.

## 1. What is TimescaleDB?
TimescaleDB is a PostgreSQL extension optimized for time-series data. Under the hood, it heavily automates and extends native PostgreSQL declarative partitioning (`PARTITION BY RANGE (time)`). Instead of forcing you to manually pre-create partitions before data arrives (or relying on extensions like `pg_partman`), Timescale uses **Hypertables** to dynamically create underlying partitions (called **chunks**) on-the-fly exactly when they are needed.

## 2. Hypertables & Chunk Sizing
When you insert data into a Hypertable, TimescaleDB automatically routes it into the correct time-based "chunk".

* **Chunk Size:** By default, TimescaleDB creates chunks that span exactly **7 days**. 
* **The Golden Rule:** The size of your chunks directly impacts your data retention policies. TimescaleDB only deletes data **a full chunk at a time**. It will *never* delete a chunk if any piece of data inside it is newer than your retention policy limit.

> [!WARNING]
> If you set a 3-day retention policy on a table with 7-day chunks, data will remain in the database for up to **10 days** (a 7-day chunk + 3 days of waiting until the *newest* row in that chunk is 3 days old). 

If you need tight, aggressive data pruning (e.g., exactly 3 days), your `chunk_time_interval` must be scaled down accordingly (e.g., to 12 hours or 1 day).

### Sample SQL
```sql
-- Change chunk size for all FUTURE chunks (existing chunks are not resized)
SELECT set_chunk_time_interval('sensor_data', INTERVAL '1 day');

-- Inspect your existing chunks to see their sizes and compression status
SELECT chunk_name, range_start, range_end, is_compressed
FROM timescaledb_information.chunks 
WHERE hypertable_name = 'sensor_data'
ORDER BY range_start DESC;
```

## 3. Data Retention (Age-Off)
TimescaleDB natively supports automated data aging via background worker jobs (cron-like policies). 

* **How it works:** You define a retention policy (e.g., 3 days). A background job periodically wakes up, scans your chunks, and drops any chunk where the *entirety* of the chunk is older than 3 days.
* **Overriding Policies:** If you need to change a retention policy, you must drop the existing one first.

### Sample SQL
```sql
-- Safely set a new retention policy (replacing any existing one)
SELECT remove_retention_policy('sensor_data', if_exists => true);
SELECT add_retention_policy('sensor_data', INTERVAL '3 days');

-- View your active retention background jobs
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

-- Manually force a "flush" immediately, bypassing the cron schedule
SELECT drop_chunks('sensor_data', older_than => INTERVAL '3 days');
```

## 4. Columnar Compression
By default, TimescaleDB stores data row-by-row (just like standard PostgreSQL). However, it includes a powerful native engine that can convert older chunks into a columnar format.

* **Benefits:** Compresses historical data by **90% to 95%** with no data loss, drastically reducing disk footprint and speeding up deep analytical queries.
* **Trade-offs:** When a chunk is compressed, it effectively becomes **read-only**. Updating, inserting, or deleting specific rows in a compressed chunk is extremely slow and difficult (requires manual decompression).
* **When to skip it:** If your data volume is manageable, your retention is short (e.g., 3 to 14 days), and you value the flexibility to backfill or modify data, **forgo compression**. Your queries will still be lightning-fast because Grafana only queries the tiny, active chunk residing entirely in RAM.

### Sample SQL
```sql
-- Enable compression on the hypertable (e.g., segmenting by device for faster queries)
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id'
);

-- Tell the background worker to automatically compress chunks older than 1 day
SELECT add_compression_policy('sensor_data', INTERVAL '1 day');
```

## 5. TimescaleDB vs. Native PostgreSQL
If you can manually partition data in native Postgres (or use `pg_partman`), why use TimescaleDB? 

1. **Zero-Maintenance Partitioning:** No manual table creation scripts. Chunks are automatically generated without the risk of an insert failing because a partition was missing.
2. **Continuous Aggregates:** If you build Grafana dashboards showing hourly averages, native Postgres requires a slow `REFRESH MATERIALIZED VIEW` that locks tables. Timescale automatically and incrementally updates these views in the background as new data streams in.
3. **Advanced Time-Series Functions:** Timescale provides powerful native functions like `time_bucket()` (superior to `date_trunc`), `first()`, `last()`, and `time_bucket_gapfill()` to ensure smooth lines on dashboards even if a sensor goes offline.
4. **Columnar Compression:** Native Postgres has no built-in equivalent to Timescale's massive disk-space-saving columnar compression engine for aging data.
