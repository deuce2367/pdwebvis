from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi_offline import FastAPIOffline
import sqlite3
import os

app = FastAPIOffline(title="PDWeb API", description="Data visualization API for PRED_info records.", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from db_adapter import SQLiteAdapter, PostgresAdapter, MariaDBAdapter
import os

DB_PATH = "test.db"
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL and (DATABASE_URL.startswith('postgres://') or DATABASE_URL.startswith('postgresql://')):
    db_adapter = PostgresAdapter(DATABASE_URL)
elif DATABASE_URL and (DATABASE_URL.startswith('mysql://') or DATABASE_URL.startswith('mariadb://')):
    db_adapter = MariaDBAdapter(DATABASE_URL)
else:
    db_adapter = SQLiteAdapter(DB_PATH)

def get_db():
    return db_adapter.get_connection()

@app.get("/api/db/info", summary="Database Information", description="Returns connection info, schema, indexes, and basic statistics for the underlying SQLite database.")
def get_db_info():
    return {
        "info": db_adapter.get_info(),
        "schema": db_adapter.get_schema(),
        "indexes": db_adapter.get_indexes(),
        "stats": db_adapter.get_stats()
    }

def format_msic(msic: str | int) -> str:
    s = str(msic)
    if len(s) == 6:
        return f"{s[:4]}/{s[4:]}"
    return s

def build_time_filter(start_unix: float | None, end_unix: float | None, msics: list[str] | None = None, evstrs: list[str] | None = None, acq_hosts: list[str] | None = None):
    filters = []
    params = []
    if start_unix is not None:
        filters.append("unix_us >= ?")
        params.append(start_unix)
    if end_unix is not None:
        filters.append("unix_us <= ?")
        params.append(end_unix)
    if msics:
        msics = [m.replace("/", "") for m in msics]
        placeholders = ", ".join("?" * len(msics))
        filters.append(f"msic IN ({placeholders})")
        params.extend(msics)
    if evstrs:
        placeholders = ", ".join("?" * len(evstrs))
        filters.append(f"evstr IN ({placeholders})")
        params.extend(evstrs)
    if acq_hosts:
        placeholders = ", ".join("?" * len(acq_hosts))
        filters.append(f"acq_host IN ({placeholders})")
        params.extend(acq_hosts)
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    return where_clause, params

@app.get("/api/data", summary="Raw Data Records", description="Fetches paginated raw records from the PRED_info table with optional filters.")
def get_data(
    start_unix: float = Query(None, description="Start time in microseconds"),
    end_unix: float = Query(None, description="End time in microseconds"),
    msics: list[str] = Query(None, description="List of MSIC values to filter"),
    evstrs: list[str] = Query(None, description="List of evstr values to filter"),
    acq_hosts: list[str] = Query(None, description="List of acq_host values to filter"),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM PRED_info {where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()["count"]
        
        # Get data
        data_query = f"SELECT * FROM PRED_info {where_clause} ORDER BY unix_us ASC LIMIT ? OFFSET ?"
        cursor.execute(data_query, params + [limit, offset])
        rows = [dict(row) for row in cursor.fetchall()]
        
    return {"total": total, "data": rows}

from fastapi.responses import Response
import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.patheffects as path_effects
from datetime import datetime
import matplotlib.colors as mcolors

plt.rcParams.update({'font.size': 10})
in1_colors = ['#ebac23', '#b80058', '#008cf9', '#006e00', '#00bbad', '#d163e6', '#b24502', '#ff9287', '#5954d6', '#00c6f8', '#878500', '#00a76c', '#bdbdbd']
plt.colormaps.register(cmap=mcolors.ListedColormap(in1_colors, name='IN1'))

@app.get("/api/stats/histogram/{col}", summary="Histogram Plot", description="Generates a matplotlib SVG showing the distribution of the selected column.")
def get_histogram(
    col: str,
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    theme: str = Query("light"),
    colormap: str = Query("IN1")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
    
    if col not in ["date8", "msic", "evstr", "hour", "acq_host"]:
        raise HTTPException(status_code=400, detail="Invalid column")
        
    query = ""
    if col == "hour":
        query = f"SELECT substr(time8, 1, 2) as bin, COUNT(*) as count FROM PRED_info {where_clause} GROUP BY substr(time8, 1, 2) ORDER BY bin"
    else:
        query = f"SELECT {col} as bin, COUNT(*) as count FROM PRED_info {where_clause} GROUP BY {col} ORDER BY bin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

    bins = [str(r["bin"]) for r in rows]
    counts = [r["count"] for r in rows]

    bg_color = '#1e293b' if theme == 'dark' else '#ffffff'
    text_color = '#f8fafc' if theme == 'dark' else '#334155'
    spine_color = '#334155' if theme == 'dark' else '#cbd5e1'
    
    import numpy as np
    try:
        cmap_obj = plt.get_cmap(colormap)
    except ValueError:
        cmap_obj = plt.get_cmap('tab20')
        
    num_items = len(counts)
    if hasattr(cmap_obj, 'colors'):
        colors = [cmap_obj(i % len(cmap_obj.colors)) for i in range(num_items)]
    else:
        colors = [cmap_obj(i / max(1, num_items - 1)) for i in range(num_items)]

    if col in ["msic", "acq_host"]:
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor(bg_color)
        ax.set_facecolor(bg_color)
        
        labels = [format_msic(b) if col == "msic" else b for b in bins]
        
        if not counts or sum(counts) == 0:
            ax.text(0.5, 0.5, "No data available", ha='center', va='center', color=text_color, transform=ax.transAxes)
            ax.axis('off')
        else:
            # Donut plot
            wedges, texts, autotexts = ax.pie(
                counts, 
                labels=None, 
                autopct='%1.1f%%', 
                pctdistance=0.75,
                colors=colors,
                textprops={'color': text_color, 'fontsize': 9},
                wedgeprops={'width': 0.4, 'edgecolor': bg_color},
                radius=1.2
            )
            
            # Ensure percentages are always white and readable against colored wedges
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_weight('bold')
                autotext.set_path_effects([path_effects.withStroke(linewidth=1, foreground='#333333')])
            
            legend_labels = [f"{l} ({c:,})" for l, c in zip(labels, counts)]
            legend = ax.legend(wedges, legend_labels, loc="center left", bbox_to_anchor=(1, 0.5), frameon=False, labelcolor=text_color)
        
        # Adjust layout to fit legend and reduce padding
        fig.subplots_adjust(left=0, right=0.65, top=1, bottom=0)
        
    else:
        if col == "evstr":
            fig, ax = plt.subplots(figsize=(30, 6))
        else:
            fig, ax = plt.subplots(figsize=(15, 6))
            
        fig.patch.set_facecolor(bg_color)
        ax.set_facecolor(bg_color)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_color(spine_color)
        ax.spines['left'].set_color(spine_color)
        ax.tick_params(colors=text_color, labelsize=10)

        grid_color = '#475569' if theme == 'dark' else '#cbd5e1'
        ax.grid(True, axis='y', color=grid_color, linestyle='--', alpha=0.5, zorder=0)

        ax.bar(bins, counts, color=colors, edgecolor=bg_color, zorder=3)
        max_bins = 30 if col == "evstr" else 15
        if len(bins) > max_bins:
            step = max(1, len(bins) // max_bins)
            ax.set_xticks(range(0, len(bins), step))
            x_labels = [bins[i] for i in range(0, len(bins), step)]
            ax.set_xticklabels(x_labels, rotation=45, ha='right', fontsize=10)
        else:
            ax.set_xticks(range(len(bins)))
            x_labels = bins
            ax.set_xticklabels(x_labels, rotation=45, ha='right', fontsize=10)
    
    ax.tick_params(top=False, right=False)
    
    buf = io.BytesIO()
    fig.savefig(buf, format='svg', bbox_inches='tight', transparent=True)
    buf.seek(0)
    plt.close(fig)
    return Response(content=buf.read(), media_type="image/svg+xml")

@app.get("/api/stats/gantt", summary="Gantt Chart", description="Generates a matplotlib SVG timeline Gantt chart for MSIC runs.")
def get_gantt(
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    buckets: int = Query(360),
    theme: str = Query("light"),
    colormap: str = Query("IN1")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM PRED_info {where_clause}", params)
        row = cursor.fetchone()
        min_unix = row["min_unix"]
        max_unix = row["max_unix"]
        
        if not min_unix or not max_unix:
            fig, ax = plt.subplots(figsize=(15, 4))
            buf = io.BytesIO()
            fig.savefig(buf, format='svg', bbox_inches='tight', transparent=True)
            buf.seek(0)
            plt.close(fig)
            return Response(content=buf.read(), media_type="image/svg+xml")

        target_buckets = buckets
        bucket_size = (max_unix - min_unix) / float(target_buckets)
        if bucket_size < 5000000:
            bucket_size = 5000000.0
            buckets = max(1, int((max_unix - min_unix) / bucket_size))
            
        query = f"""
            SELECT 
                msic,
                CAST((unix_us - ?) / ? AS INTEGER) as bucket,
                COUNT(*) as count
            FROM PRED_info
            {where_clause}
            GROUP BY msic, bucket
        """
        
        q_params = [min_unix, bucket_size] + params
        cursor.execute(query, q_params)
        rows = cursor.fetchall()

    msic_buckets = {}
    max_count = 1
    for r in rows:
        msic = r["msic"]
        count = r["count"]
        b = r["bucket"]
        if msic not in msic_buckets:
            msic_buckets[msic] = {}
        if 0 <= b <= buckets: 
            msic_buckets[msic][b] = count
            if count > max_count:
                max_count = count

    fig_height = max(8, len(msic_buckets) * 0.5)
    fig, ax = plt.subplots(figsize=(30, fig_height))
    
    bg_color = '#1e293b' if theme == 'dark' else '#ffffff'
    text_color = '#f8fafc' if theme == 'dark' else '#334155'
    spine_color = '#334155' if theme == 'dark' else '#cbd5e1'
    
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(spine_color)
    ax.spines['left'].set_color(spine_color)
    ax.tick_params(colors=text_color, labelsize=10)
    
    grid_color = '#475569' if theme == 'dark' else '#cbd5e1'
    ax.grid(True, axis='both', color=grid_color, linestyle='--', alpha=0.5, zorder=0)

    y_ticks = []
    y_labels = []
    
    import matplotlib.patches as patches
    try:
        cmap = plt.get_cmap(colormap)
    except ValueError:
        cmap = plt.get_cmap('tab20')
    
    num_msics = len(msic_buckets)
    for i, (msic, b_data) in enumerate(msic_buckets.items()):
        y_pos = i * 10
        if hasattr(cmap, 'colors'):
            color = cmap(i % len(cmap.colors))
        else:
            color = cmap(i / max(1, num_msics - 1))
        
        for b, count in b_data.items():
            start_time = min_unix + (b * bucket_size)
            dt = datetime.utcfromtimestamp(start_time / 1000000.0)
            md_start = mdates.date2num(dt)
            dur_days = (bucket_size / 1000000.0) / (24 * 3600)
            
            alpha = max(0.1, count / max_count)
            edge_color = '#1e293b' if theme == 'dark' else '#334155'
            rect = patches.Rectangle((md_start, y_pos + 1), dur_days, 8, facecolor=color, alpha=alpha, edgecolor=edge_color, linewidth=0.5, zorder=3)
            ax.add_patch(rect)
            
        y_ticks.append(y_pos + 5)
        y_labels.append(f"MSIC {format_msic(msic)}")

    ax.set_yticks(y_ticks)
    ax.set_yticklabels(y_labels, fontsize=10)
    
    min_dt = datetime.utcfromtimestamp(min_unix / 1000000.0)
    
    # Use actual data bounds to let bins stretch and fill the plot
    display_duration_us = max(max_unix - min_unix, bucket_size)
    max_dt = datetime.utcfromtimestamp((min_unix + display_duration_us) / 1000000.0)
    
    ax.set_xlim(mdates.date2num(min_dt), mdates.date2num(max_dt))
    if len(msic_buckets) > 0:
        ax.set_ylim(0, len(msic_buckets) * 10)
    
    ax.xaxis_date()
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator(maxticks=24))
    plt.xticks(rotation=45, ha='right')
    ax.tick_params(top=False, right=False)

    buf = io.BytesIO()
    fig.savefig(buf, format='svg', bbox_inches='tight', transparent=True)
    buf.seek(0)
    plt.close(fig)
    return Response(content=buf.read(), media_type="image/svg+xml")

@app.get("/api/stats/filters", summary="Filter Options", description="Returns distinct values for categorical columns (msic, evstr, acq_host) to populate frontend dropdowns.")
def get_filters(
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM PRED_info {where_clause}", params)
        row = cursor.fetchone()
        
        cursor.execute(f"SELECT DISTINCT msic FROM PRED_info {where_clause} ORDER BY msic", params)
        msics_list = [format_msic(r["msic"]) for r in cursor.fetchall()]
        
        cursor.execute(f"SELECT DISTINCT evstr FROM PRED_info {where_clause} ORDER BY evstr", params)
        evstrs_list = [str(r["evstr"]) for r in cursor.fetchall()]
        
        cursor.execute(f"SELECT DISTINCT acq_host FROM PRED_info {where_clause} ORDER BY acq_host", params)
        acq_hosts_list = [str(r["acq_host"]) for r in cursor.fetchall()]
        
        return {"min_unix": row["min_unix"], "max_unix": row["max_unix"], "msics": msics_list, "evstrs": evstrs_list, "acq_hosts": acq_hosts_list}

@app.get("/api/stats/coverage_table", summary="Coverage Table", description="Generates aggregated coverage table.")
def get_coverage_table(
    start_unix: float = Query(None, description="Start Unix timestamp (us)"),
    end_unix: float = Query(None, description="End Unix timestamp (us)"),
    msics: list[str] = Query(None, description="List of MSIC filters"),
    evstrs: list[str] = Query(None, description="List of EVSTR filters"),
    acq_hosts: list[str] = Query(None, description="List of ACQ_HOST filters")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = f"""
            WITH period_msics AS (
                SELECT 
                    date8, 
                    time8, 
                    GROUP_CONCAT(msic) as msic_set,
                    COUNT(msic) as num_receivers,
                    MAX(nelem / (rx_srate * 1000000.0)) as period_duration
                FROM (
                    SELECT date8, time8, msic, nelem, rx_srate
                    FROM PRED_info
                    {where_clause}
                    ORDER BY date8, time8, msic
                ) AS subq
                GROUP BY date8, time8
            )
            SELECT 
                msic_set,
                MAX(num_receivers) as num_receivers,
                COUNT(*) as num_periods,
                COUNT(DISTINCT date8) as num_dates,
                SUM(period_duration) as total_duration
            FROM period_msics
            GROUP BY msic_set
            ORDER BY total_duration DESC
        """
        
        cursor.execute(query, params)
        rows = []
        for r in cursor.fetchall():
            d = dict(r)
            if d.get("msic_set"):
                msics_list = d["msic_set"].split(",")
                d["msic_set"] = ", ".join([format_msic(m) for m in msics_list])
            rows.append(d)
            
    return rows

@app.get("/api/stats/timeline")
def get_timeline(
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    buckets: int = Query(20)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts)
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM PRED_info {where_clause}", params)
        row = cursor.fetchone()
        min_unix = row["min_unix"]
        max_unix = row["max_unix"]
        
        if not min_unix or not max_unix:
            return {"min_unix": 0, "max_unix": 0, "bucket_size": 1, "data": []}
            
        bucket_size = (max_unix - min_unix) / float(buckets)
        if bucket_size <= 0:
            bucket_size = 1.0
            
        query = f"""
            SELECT 
                CAST((unix_us - ?) / ? AS INTEGER) as bucket,
                COUNT(*) as count
            FROM PRED_info
            {where_clause}
            GROUP BY bucket
            ORDER BY bucket
        """
        
        q_params = [min_unix, bucket_size] + params
        cursor.execute(query, q_params)
        rows = cursor.fetchall()
        
        result_data = [0] * buckets
        for r in rows:
            b = r["bucket"]
            if 0 <= b < buckets:
                result_data[b] = r["count"]
                
        return {"min_unix": min_unix, "max_unix": max_unix, "bucket_size": bucket_size, "data": result_data}



# Mount static frontend if exists
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    def no_frontend():
        return {"message": "Frontend not built yet. Access /api/data for API."}
