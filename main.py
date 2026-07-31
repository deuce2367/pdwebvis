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
DB_SCHEMA = os.environ.get('DB_SCHEMA', '')
TBL = f"{DB_SCHEMA}.PRED_info" if DB_SCHEMA else "PRED_info"

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

def build_time_filter(start_unix: float | None, end_unix: float | None, msics: list[str] | None = None, evstrs: list[str] | None = None, acq_hosts: list[str] | None = None, mssns: list[str] | None = None):
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
    if mssns:
        placeholders = ", ".join("?" * len(mssns))
        filters.append(f"mssn IN ({placeholders})")
        params.extend(mssns)
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    return where_clause, params

@app.get("/api/data", summary="Raw Data Records", description="Fetches paginated raw records from the PRED_info table with optional filters.")
def get_data(
    start_unix: float = Query(None, description="Start time in microseconds"),
    end_unix: float = Query(None, description="End time in microseconds"),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    mssns: list[str] = Query(None),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM {TBL} {where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()["count"]
        
        # Get data
        data_query = f"SELECT * FROM {TBL} {where_clause} ORDER BY unix_us ASC LIMIT ? OFFSET ?"
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
    mssns: list[str] = Query(None),
    theme: str = Query("light"),
    colormap: str = Query("Paired")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
    if col not in ["date8", "msic", "evstr", "hour", "acq_host"]:
        raise HTTPException(status_code=400, detail="Invalid column")
        
    query = ""
    if col == "hour":
        query = f"SELECT substr(time8, 1, 2) as bin, COUNT(*) as count FROM {TBL} {where_clause} GROUP BY substr(time8, 1, 2) ORDER BY bin"
    else:
        query = f"SELECT {col} as bin, COUNT(*) as count FROM {TBL} {where_clause} GROUP BY {col} ORDER BY bin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
    if col == "hour":
        # Ensure 00-23
        hour_dict = {f"{h:02d}": 0 for h in range(24)}
        for r in rows:
            hour_dict[str(r["bin"])] = r["count"]
        bins = list(hour_dict.keys())
        counts = list(hour_dict.values())
    else:
        bins = [str(r["bin"]) for r in rows]
        counts = [r["count"] for r in rows]

    bg_color = '#1e293b' if theme == 'dark' else '#ffffff'
    text_color = '#f8fafc' if theme == 'dark' else '#334155'
    spine_color = '#334155' if theme == 'dark' else '#cbd5e1'

    import matplotlib.colors as mcolors
    try:
        cmap_obj = plt.get_cmap(colormap)
    except ValueError:
        cmap_obj = plt.get_cmap("viridis")
        
    if hasattr(cmap_obj, 'colors'):
        primary_color = mcolors.to_hex(cmap_obj.colors[0])
    else:
        primary_color = mcolors.to_hex(cmap_obj(0.0)) # primary accent color
    
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
        
    # Single color logic
    if col in ["evstr", "hour", "date8"]:
        colors = [primary_color] * len(counts)

    if col in ["msic", "acq_host"]:
        fig, ax = plt.subplots(figsize=(12, 8))
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
                pctdistance=0.85,
                colors=colors,
                textprops={'color': text_color, 'fontsize': 16, 'weight': 'bold'},
                wedgeprops={'width': 0.4, 'edgecolor': bg_color},
                radius=1.2
            )
            
            # Ensure percentages are always white and readable against colored wedges
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_weight('bold')
                autotext.set_path_effects([path_effects.withStroke(linewidth=1, foreground='#333333')])
            
            legend_labels = [f"{l} ({c:,})" for l, c in zip(labels, counts)]
            legend = ax.legend(wedges, legend_labels, loc="center left", bbox_to_anchor=(1, 0.5), frameon=False, labelcolor=text_color, fontsize=14)
        
        # Adjust layout to fit legend and reduce padding
        fig.subplots_adjust(left=0, right=0.7, top=1, bottom=0)
        
    else:
        if col == "evstr":
            fig, ax = plt.subplots(figsize=(30, 6))
        elif col == "hour":
            fig, ax = plt.subplots(figsize=(20, 6))
        else:
            fig, ax = plt.subplots(figsize=(10, 6))
            
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
    mssns: list[str] = Query(None),
    buckets: int = Query(360),
    theme: str = Query("light"),
    colormap: str = Query("Paired")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM {TBL} {where_clause}", params)
        row = cursor.fetchone()
        min_unix = row["min_unix"]
        max_unix = row["max_unix"]
        
        # Override with exact requested limits if provided
        if start_unix is not None:
            min_unix = start_unix
        if end_unix is not None:
            max_unix = end_unix
        
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
            FROM {TBL}
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
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d %H:%M'))
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
    acq_hosts: list[str] = Query(None),
    mssns: list[str] = Query(None)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM {TBL} {where_clause}", params)
        row = cursor.fetchone()
        
        cursor.execute(f"SELECT DISTINCT msic FROM {TBL} {where_clause} ORDER BY msic", params)
        msics_list = [format_msic(r["msic"]) for r in cursor.fetchall()]
        
        cursor.execute(f"SELECT DISTINCT mssn FROM {TBL} {where_clause} ORDER BY mssn", params)
        mssns_list = [str(r["mssn"]) for r in cursor.fetchall()]
        
        cursor.execute(f"SELECT DISTINCT evstr FROM {TBL} {where_clause} ORDER BY evstr", params)
        evstrs_list = [str(r["evstr"]) for r in cursor.fetchall()]
        
        cursor.execute(f"SELECT DISTINCT acq_host FROM {TBL} {where_clause} ORDER BY acq_host", params)
        acq_hosts_list = [str(r["acq_host"]) for r in cursor.fetchall()]
        
        return {"min_unix": row["min_unix"], "max_unix": row["max_unix"], "msics": msics_list, "mssns": mssns_list, "evstrs": evstrs_list, "acq_hosts": acq_hosts_list}

@app.get("/api/stats/coverage_table", summary="Coverage Table", description="Generates aggregated coverage table.")
def get_coverage_table(
    start_unix: float = Query(None, description="Start Unix timestamp (us)"),
    end_unix: float = Query(None, description="End Unix timestamp (us)"),
    msics: list[str] = Query(None, description="List of MSIC filters"),
    evstrs: list[str] = Query(None, description="List of EVSTR filters"),
    acq_hosts: list[str] = Query(None, description="List of ACQ_HOST filters"),
    mssns: list[str] = Query(None, description="List of MSSN filters")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
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
                    FROM {TBL}
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
    mssns: list[str] = Query(None),
    buckets: int = Query(20)
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT MIN(unix_us) as min_unix, MAX(unix_us) as max_unix FROM {TBL} {where_clause}", params)
        row = cursor.fetchone()
        min_unix = row["min_unix"]
        max_unix = row["max_unix"]
        
        # Override with exact requested limits if provided
        if start_unix is not None:
            min_unix = start_unix
        if end_unix is not None:
            max_unix = end_unix
        
        if not min_unix or not max_unix:
            return {"min_unix": 0, "max_unix": 0, "bucket_size": 1, "data": []}
            
        bucket_size = (max_unix - min_unix) / float(buckets)
        if bucket_size <= 0:
            bucket_size = 1.0
            
        query = f"""
            SELECT 
                CAST((unix_us - ?) / ? AS INTEGER) as bucket,
                COUNT(*) as count
            FROM {TBL}
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




@app.get("/api/stats/receivers_nested_pie", summary="Nested Donut", description="Outer MSSN, Inner MSIC")
def get_receivers_pie(
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    mssns: list[str] = Query(None),
    theme: str = Query("light"),
    colormap: str = Query("Paired")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
    # Query MSIC counts, extract MSSN
    query = f"SELECT msic, COUNT(*) as c FROM {TBL} {where_clause} GROUP BY msic"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
    msic_counts = {}
    mssn_counts = {}
    
    for r in rows:
        m = str(r["msic"])
        c = r["c"]
        msic_counts[m] = c
        mssn = m[:4] if len(m) >= 4 else m
        mssn_counts[mssn] = mssn_counts.get(mssn, 0) + c
        
    if not msic_counts:
        fig, ax = plt.subplots(figsize=(6, 6))
        buf = io.BytesIO()
        fig.savefig(buf, format='svg', transparent=True)
        buf.seek(0)
        plt.close(fig)
        return Response(content=buf.read(), media_type="image/svg+xml")

    # Prepare nested data
    mssn_labels = list(mssn_counts.keys())
    mssn_vals = list(mssn_counts.values())
    
    msic_labels = []
    msic_vals = []

    import numpy as np
    import matplotlib.colors as mcolors
    try:
        cmap_obj = plt.get_cmap(colormap)
    except ValueError:
        cmap_obj = plt.get_cmap("viridis")
        
    num_items = max(1, len(mssn_labels))
    if hasattr(cmap_obj, 'colors'):
        cmap_list = [mcolors.to_hex(c) for c in cmap_obj.colors]
    else:
        cmap_list = [mcolors.to_hex(cmap_obj(i / max(1, num_items - 1))) for i in range(num_items)]

    outer_colors = []
    inner_colors = []

    for i, mssn in enumerate(mssn_labels):
        outer_colors.append(cmap_list[i % len(cmap_list)])
        # get all msics for this mssn
        sub_msics = [(m, c) for m, c in msic_counts.items() if m.startswith(mssn) or (len(m) < 4 and m == mssn)]
        # sort by count
        sub_msics.sort(key=lambda x: x[1], reverse=True)
        
        for j, (m, c) in enumerate(sub_msics):
            m_str = str(m)
            # Only show last 2 digits if available
            label = m_str[-2:] if len(m_str) >= 2 else m_str
            msic_labels.append(label)
            msic_vals.append(c)
            # Make inner color a lighter/darker version of outer, or just use same colormap with alpha
            inner_colors.append(cmap_list[i % len(cmap_list)])

    fig, ax = plt.subplots(figsize=(8, 8))
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    
    bg_color = '#1e293b' if theme == 'dark' else '#ffffff'
    text_color = '#f8fafc' if theme == 'dark' else '#334155'
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)

    size = 0.3
    
    # Outer ring (MSIC)
    ax.pie(msic_vals, radius=1.3, colors=inner_colors,
           wedgeprops=dict(width=size, edgecolor=bg_color, alpha=0.7),
           labels=msic_labels, labeldistance=1.02, textprops={'color': text_color, 'weight': 'bold', 'fontsize': 14})

    # Inner ring (MSSN)
    # We use a slightly modified color array for inner by reducing alpha or just using same colors but distinct edges
    inner_wedgeprops = dict(width=size, edgecolor=bg_color)
    wedges, texts = ax.pie(mssn_vals, radius=1.3-size, colors=outer_colors,
           wedgeprops=inner_wedgeprops,
           labels=[f"{l}" for l in mssn_labels], labeldistance=0.75, textprops={'color': 'white', 'fontsize': 14, 'weight': 'bold'})
           
    import matplotlib.patheffects as path_effects
    for t in texts:
        t.set_path_effects([path_effects.withStroke(linewidth=1.5, foreground='#333333')])
           
    ax.set(aspect="equal")
    
    buf = io.BytesIO()
    fig.savefig(buf, format='svg', bbox_inches='tight', transparent=True)
    buf.seek(0)
    plt.close(fig)
    return Response(content=buf.read(), media_type="image/svg+xml")



@app.get("/api/stats/activity_coverage_hist", summary="Activity Coverage Histogram")
def get_activity_coverage_hist(
    start_unix: float = Query(None),
    end_unix: float = Query(None),
    msics: list[str] = Query(None),
    evstrs: list[str] = Query(None),
    acq_hosts: list[str] = Query(None),
    mssns: list[str] = Query(None),
    theme: str = Query("light"),
    colormap: str = Query("Paired")
):
    where_clause, params = build_time_filter(start_unix, end_unix, msics, evstrs, acq_hosts, mssns)
    
    query = f"""
        WITH period_msics AS (
            SELECT
                date8,
                time8,
                COUNT(msic) as num_receivers,
                MAX(nelem / (rx_srate * 1000000.0)) as period_duration
            FROM (
                SELECT date8, time8, msic, nelem, rx_srate
                FROM {TBL}
                {where_clause}
                ORDER BY date8, time8, msic
            ) AS subq
            GROUP BY date8, time8
        )
        SELECT
            num_receivers as bucket,
            SUM(period_duration) as duration
        FROM period_msics
        GROUP BY num_receivers
        ORDER BY num_receivers
    """

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
    buckets = [r["bucket"] for r in rows]
    durations = [r["duration"] for r in rows]
    
    bg_color = '#1e293b' if theme == 'dark' else '#ffffff'
    text_color = '#f8fafc' if theme == 'dark' else '#334155'
    spine_color = '#334155' if theme == 'dark' else '#cbd5e1'
    
    import numpy as np
    import matplotlib.colors as mcolors
    try:
        cmap_obj = plt.get_cmap(colormap)
    except ValueError:
        cmap_obj = plt.get_cmap("viridis")
        
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)
    
    if not buckets:
        ax.text(0.5, 0.5, "No data available", ha='center', va='center', color=text_color, transform=ax.transAxes)
        ax.axis('off')
    else:
        num_items = max(1, len(buckets))
        if hasattr(cmap_obj, 'colors'):
            colors = [cmap_obj((i*3) % len(cmap_obj.colors)) for i in range(num_items)]
        else:
            colors = [cmap_obj(i / max(1, num_items - 1)) for i in range(num_items)]
            
        ax.bar([str(b) for b in buckets], durations, color=colors, edgecolor=bg_color, zorder=3)
        ax.set_ylabel("Total Duration (s)", color=text_color, fontsize=16, weight='bold')
        ax.set_xlabel("# of Receivers", color=text_color, fontsize=16, weight='bold')
        
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color(spine_color)
        ax.spines['bottom'].set_color(spine_color)
        ax.tick_params(colors=text_color, labelsize=14)
        ax.grid(axis='y', color=spine_color, linestyle='-', alpha=0.3, zorder=0)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='svg', transparent=True)
    buf.seek(0)
    plt.close(fig)
    return Response(content=buf.read(), media_type="image/svg+xml")


# Mount static frontend if exists
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    def no_frontend():
        return {"message": "Frontend not built yet. Access /api/data for API."}