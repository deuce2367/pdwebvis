import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Activity, BarChart2, Calendar, Database, Clock, Filter, ChevronLeft, ChevronRight, Check, RotateCcw, Sun, Moon, Download, Play, Pause, X, Palette } from 'lucide-react';
import DatabaseView from './DatabaseView';

const COLORMAPS = [
  { name: 'tab20', label: 'Tab 20', gradient: 'linear-gradient(to right, #1f77b4, #aec7e8, #ff7f0e, #ffbb78, #2ca02c, #98df8a)' },
  { name: 'tab10', label: 'Tab 10', gradient: 'linear-gradient(to right, #1f77b4, #ff7f0e, #2ca02c, #d62728, #9467bd, #8c564b)' },
  { name: 'Dark2', label: 'Dark 2', gradient: 'linear-gradient(to right, #1b9e77, #d95f02, #7570b3, #e7298a, #66a61e, #e6ab02)' },
  { name: 'Blues', label: 'Blues', gradient: 'linear-gradient(to right, #eff3ff, #bdd7e7, #6baed6, #3182bd, #08519c)' },
  { name: 'Greens', label: 'Greens', gradient: 'linear-gradient(to right, #edf8e9, #bae4b3, #74c476, #31a354, #006d2c)' },
  { name: 'Reds', label: 'Reds', gradient: 'linear-gradient(to right, #fee5d9, #fcae91, #fb6a4a, #de2d26, #a50f15)' },
  { name: 'Purples', label: 'Purples', gradient: 'linear-gradient(to right, #f2f0f7, #cbc9e2, #9e9ac8, #756bb1, #54278f)' }
];

const MultiSelect = ({ options, selected, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const isAll = selected === null;
  const currentSelected = isAll ? options : selected;

  const toggle = (val) => {
    let list = isAll ? [...options] : [...selected];
    if (list.includes(val)) list = list.filter(x => x !== val);
    else list.push(val);
    
    if (list.length === options.length) onChange(null);
    else onChange(list);
  };
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button style={{ width: '100%', padding: '0.5rem 1rem', fontSize: '1.02rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', minHeight: '36px' }} onClick={() => setOpen(!open)}>
        {isAll ? "All selected" : `${currentSelected.length} selected`}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', marginTop: '4px', minWidth: '150px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
            <button onClick={() => onChange(null)} style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>All</button>
            <button onClick={() => onChange([])} style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>None</button>
          </div>
          {options.map(opt => (
            <label key={opt} style={{ display: 'block', margin: '0.25rem 0', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={currentSelected.includes(opt)} onChange={() => toggle(opt)} style={{ marginRight: '0.5rem' }}/>
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const ColumnSelector = ({ columns, setColumns }) => {
  const [open, setOpen] = useState(false);
  
  const toggleAll = (hide) => setColumns(columns.map(c => ({ ...c, hide })));
  const toggleColumn = (field) => {
    setColumns(columns.map(col => col.field === field ? { ...col, hide: !col.hide } : col));
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        ⚙️ Columns
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem', marginTop: '4px', minWidth: '150px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
            <button onClick={() => toggleAll(false)} style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>All</button>
            <button onClick={() => toggleAll(true)} style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>None</button>
          </div>
          {columns.map(col => (
            <label key={col.field} style={{ display: 'block', margin: '0.25rem 0', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={!col.hide} onChange={() => toggleColumn(col.field)} style={{ marginRight: '0.5rem' }}/>
              {col.field}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const formatDt = (us) => {
  if (!us) return "";
  const d = new Date(us / 1000);
  const pad = (n, w=2) => n.toString().padStart(w, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

const parseDt = (str) => {
  if (!str) return null;
  const ms = new Date(str + "Z").getTime();
  return isNaN(ms) ? null : ms * 1000;
};

const TIMELINE_BUCKETS = 32;

const TimelineBrush = ({ appliedRange, appliedMsics, appliedEvstrs, appliedAcqHosts, stagedRange, onRangeChange }) => {
  const [data, setData] = useState(new Array(TIMELINE_BUCKETS).fill(0));
  const [meta, setMeta] = useState(null);
  
  const [draggingThumb, setDraggingThumb] = useState(null);
  const sliderRef = React.useRef(null);
  
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  useEffect(() => {
    const fetchTimeline = async () => {
      let url = '/api/stats/timeline?';
      const params = new URLSearchParams();
      if (appliedRange.start) params.append('start_unix', appliedRange.start);
      if (appliedRange.end) params.append('end_unix', appliedRange.end);
      params.append('buckets', TIMELINE_BUCKETS);
      
      try {
        const res = await fetch(url + params.toString());
        const json = await res.json();
        
        if (Array.isArray(json.data)) {
          setData(json.data);
        } else {
          setData(new Array(TIMELINE_BUCKETS).fill(0));
        }
        
        if (json.min_unix && json.max_unix) {
            setMeta({ min: json.min_unix, max: json.max_unix });
            
            // If stagedRange isn't set, default to min/max
            if (!stagedRange.start) onRangeChange({ start: json.min_unix, end: json.max_unix });
        }
      } catch (e) {
        console.error("Timeline error", e);
      }
    };
    fetchTimeline();
  }, [appliedRange, appliedMsics, appliedEvstrs, appliedAcqHosts]);

  // Sync inputs when stagedRange changes externally
  useEffect(() => {
    if (stagedRange.start) setManualStart(formatDt(stagedRange.start));
    if (stagedRange.end) setManualEnd(formatDt(stagedRange.end));
  }, [stagedRange]);

  const handlePointerDown = (e, thumb) => {
    e.preventDefault();
    setDraggingThumb(thumb);
  };

  useEffect(() => {
    if (!draggingThumb || !meta) return;
    
    const handlePointerMove = (e) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width);
      pct = Math.max(0, Math.min(1, pct));
      
      const val = meta.min + (pct * (meta.max - meta.min));
      
      if (draggingThumb === 'start') {
        const boundVal = Math.min(val, stagedRange.end - 1);
        onRangeChange({ ...stagedRange, start: boundVal });
      } else {
        const boundVal = Math.max(val, stagedRange.start + 1);
        onRangeChange({ ...stagedRange, end: boundVal });
      }
    };
    
    const handlePointerUp = () => setDraggingThumb(null);
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingThumb, stagedRange, meta, onRangeChange]);

  const maxCount = Math.max(...data, 1);

  const handleManualApply = () => {
    const st = parseDt(manualStart);
    const en = parseDt(manualEnd);
    if (st && en) onRangeChange({ start: st, end: en });
  };

  let startPct = 0;
  let endPct = 100;
  if (meta && stagedRange.start && stagedRange.end) {
    const dur = meta.max - meta.min;
    if (dur > 0) {
      startPct = ((stagedRange.start - meta.min) / dur) * 100;
      endPct = ((stagedRange.end - meta.min) / dur) * 100;
      startPct = Math.max(0, Math.min(100, startPct));
      endPct = Math.max(0, Math.min(100, endPct));
    }
  }

  return (
    <div style={{ width: '600px', display: 'flex', alignItems: 'flex-end', gap: '1.2rem' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '190px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '48px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>From:</div>
          <input 
            type="text" 
            value={manualStart} 
            onChange={e => setManualStart(e.target.value)} 
            onBlur={handleManualApply}
            onKeyDown={e => e.key === 'Enter' && handleManualApply()}
            style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', fontFamily: 'monospace', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} 
            placeholder="YYYY-MM-DD HH:MM:SS"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '48px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>To:</div>
          <input 
            type="text" 
            value={manualEnd} 
            onChange={e => setManualEnd(e.target.value)} 
            onBlur={handleManualApply}
            onKeyDown={e => e.key === 'Enter' && handleManualApply()}
            style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', fontFamily: 'monospace', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} 
            placeholder="YYYY-MM-DD HH:MM:SS"
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="timeline-widget-container" style={{ cursor: 'default', borderBottom: 'none', borderRadius: '6px 6px 0 0', position: 'relative' }}>
          {data.map((count, idx) => {
            const heightPct = count === 0 ? '0%' : `${Math.max((count / maxCount) * 100, 5)}%`;
            const barStartPct = (idx / data.length) * 100;
            const barEndPct = ((idx + 1) / data.length) * 100;
            // A bar is in range if it overlaps with [startPct, endPct]
            const inRange = barEndPct > startPct && barStartPct < endPct;
            
            return (
              <div 
                key={idx}
                className={`timeline-bar`}
                style={{ 
                  height: heightPct,
                  backgroundColor: inRange ? 'var(--accent-primary)' : '#cbd5e1' 
                }}
                title={`Items: ${count}`}
              />
            );
          })}
        </div>
        
        <div ref={sliderRef} style={{ position: 'relative', height: '20px', background: 'var(--bg-primary)', borderRadius: '0 0 6px 6px', border: '1px solid var(--border-color)', borderTop: 'none', userSelect: 'none' }}>
          <div style={{ position: 'absolute', left: `${startPct}%`, right: `${100 - endPct}%`, background: 'var(--accent-primary)', height: '100%', opacity: 0.2, pointerEvents: 'none' }} />
          
          <div 
            onPointerDown={(e) => handlePointerDown(e, 'start')}
            style={{ position: 'absolute', left: `${startPct}%`, width: '14px', height: '24px', background: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', borderRadius: '4px', transform: 'translate(-50%, -2px)', cursor: 'ew-resize', zIndex: 10 }} 
          />
          <div 
            onPointerDown={(e) => handlePointerDown(e, 'end')}
            style={{ position: 'absolute', left: `${endPct}%`, width: '14px', height: '24px', background: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', borderRadius: '4px', transform: 'translate(-50%, -2px)', cursor: 'ew-resize', zIndex: 10 }} 
          />
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [data, setData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  
  const [activeTab, setActiveTab] = useState('summary');
  const [theme, setTheme] = useState('light');
  
  const [gridApi, setGridApi] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [colormap, setColormap] = useState('tab20');
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Staged Filters (UI state)
  const [stagedRange, setStagedRange] = useState({ start: null, end: null });
  const [stagedMsics, setStagedMsics] = useState(null);
  const [stagedEvstrs, setStagedEvstrs] = useState(null);
  const [stagedAcqHosts, setStagedAcqHosts] = useState(null);

  // Applied Filters (API state)
  const [appliedRange, setAppliedRange] = useState({ start: null, end: null });
  const [appliedMsics, setAppliedMsics] = useState(null);
  const [appliedEvstrs, setAppliedEvstrs] = useState(null);
  const [appliedAcqHosts, setAppliedAcqHosts] = useState(null);
  
  // Available filter options
  const [availableMsics, setAvailableMsics] = useState([]);
  const [availableEvstrs, setAvailableEvstrs] = useState([]);
  const [availableAcqHosts, setAvailableAcqHosts] = useState([]);
  
  const [imgKey, setImgKey] = useState(Date.now());
  
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [globalBounds, setGlobalBounds] = useState({ start: null, end: null });

  const fetchFilters = async () => {
    const params = new URLSearchParams();
    if (appliedRange.start) params.append('start_unix', appliedRange.start);
    if (appliedRange.end) params.append('end_unix', appliedRange.end);
    
    try {
      const res = await fetch('/api/stats/filters?' + params.toString());
      const json = await res.json();
      if (json.msics) setAvailableMsics(json.msics);
      if (json.evstrs) setAvailableEvstrs(json.evstrs);
      if (json.acq_hosts) setAvailableAcqHosts(json.acq_hosts);
      
      if (!filtersInitialized) {
          if (json.min_unix && json.max_unix) {
              setGlobalBounds({ start: json.min_unix, end: json.max_unix });
              setStagedRange({ start: json.min_unix, end: json.max_unix });
              setAppliedRange({ start: json.min_unix, end: json.max_unix });
          }
          setFiltersInitialized(true);
      }
    } catch (e) {
      console.error("Error fetching filters", e);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [appliedRange]);

  useEffect(() => {
    if (!isLiveMode) return;
    const timer = setInterval(() => {
      fetch('/api/stats/filters').then(r => r.json()).then(json => {
        if (json.max_unix && globalBounds.end && json.max_unix > globalBounds.end) {
          setGlobalBounds(prev => ({ ...prev, end: json.max_unix }));
          setAppliedRange(prev => ({ ...prev, end: json.max_unix }));
          setStagedRange(prev => ({ ...prev, end: json.max_unix }));
        }
      }).catch(e => console.error("Live fetch error", e));
    }, 5000);
    return () => clearInterval(timer);
  }, [isLiveMode, globalBounds.end]);

  const fetchData = async () => {
    if (!appliedRange.start && !appliedRange.end) return;

    const params = new URLSearchParams();
    params.append('limit', 10000);
    if (appliedRange.start) params.append('start_unix', appliedRange.start);
    if (appliedRange.end) params.append('end_unix', appliedRange.end);
    if (appliedMsics !== null) {
      if (appliedMsics.length === 0) params.append('msics', '__NONE__');
      else appliedMsics.forEach(m => params.append('msics', m));
    }
    if (appliedEvstrs !== null) {
      if (appliedEvstrs.length === 0) params.append('evstrs', '__NONE__');
      else appliedEvstrs.forEach(e => params.append('evstrs', e));
    }
    if (appliedAcqHosts !== null) {
      if (appliedAcqHosts.length === 0) params.append('acq_hosts', '__NONE__');
      else appliedAcqHosts.forEach(h => params.append('acq_hosts', h));
    }

    try {
      const res = await fetch(`/api/data?${params.toString()}`);
      const json = await res.json();
      setData(json.data);
      setTotalRows(json.total);
      
      setImgKey(Date.now());
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appliedRange, appliedMsics, appliedEvstrs, appliedAcqHosts]);

  const handleApplyFilters = () => {
    setAppliedRange(stagedRange);
    setAppliedMsics(stagedMsics);
    setAppliedEvstrs(stagedEvstrs);
    setAppliedAcqHosts(stagedAcqHosts);
  };

  const handleResetFilters = () => {
    setStagedRange(globalBounds);
    setStagedMsics(null);
    setStagedEvstrs(null);
    setStagedAcqHosts(null);
    setAppliedRange(globalBounds);
    setAppliedMsics(null);
    setAppliedEvstrs(null);
    setAppliedAcqHosts(null);
  };

  const [colDefs, setColDefs] = useState([
    { field: 'id', width: 80, hide: false },
    { field: 'evnt', width: 120, hide: false },
    { field: 'unix_us', width: 150, hide: false },
    { field: 'tc_ws', width: 120, hide: false },
    { field: 'tc_fs', width: 120, hide: false },
    { field: 'path', width: 150, hide: false },
    { field: 'mgul', width: 120, hide: false },
    { field: 'pkul', width: 120, hide: false },
    { field: 'msic', width: 100, hide: false },
    { field: 'mssn', width: 100, hide: false },
    { field: 'nelem', width: 120, hide: false },
    { field: 'rx_mhz', width: 120, hide: false },
    { field: 'rx_bw', width: 120, hide: false },
    { field: 'rx_srate', width: 120, hide: false },
    { field: 'if_mhz', width: 120, hide: false },
    { field: 'pdel_nb', width: 120, hide: false },
    { field: 'pdel_wb', width: 120, hide: false },
    { field: 'pdel_dif', width: 120, hide: false },
    { field: 'avg_xdel', width: 120, hide: false },
    { field: 'fmt2', width: 100, hide: false },
    { field: 'rx_band', width: 120, hide: false },
    { field: 'rx_dpath', width: 120, hide: false },
    { field: 'freq8', width: 120, hide: false },
    { field: 'evstr', width: 120, hide: false },
    { field: 'date8', width: 120, hide: false },
    { field: 'time8', width: 120, hide: false },
    { field: 'acq_host', width: 150, hide: false },
    { field: 'tag_gen', width: 200, hide: false },
    { field: 'tag_acq', width: 200, hide: false },
    { field: 'uptime', width: 150, hide: false }
  ]);
  const [pageSize, setPageSize] = useState(20);

  const buildUrlParams = () => {
    const params = new URLSearchParams();
    if (appliedRange.start) params.append('start_unix', appliedRange.start);
    if (appliedRange.end) params.append('end_unix', appliedRange.end);
    
    if (appliedMsics !== null) {
      if (appliedMsics.length === 0) params.append('msics', '__NONE__');
      else appliedMsics.forEach(m => params.append('msics', m));
    }
    
    if (appliedEvstrs !== null) {
      if (appliedEvstrs.length === 0) params.append('evstrs', '__NONE__');
      else appliedEvstrs.forEach(e => params.append('evstrs', e));
    }
    
    if (appliedAcqHosts !== null) {
      if (appliedAcqHosts.length === 0) params.append('acq_hosts', '__NONE__');
      else appliedAcqHosts.forEach(h => params.append('acq_hosts', h));
    }
    
    return params;
  };

  const getHistUrl = (col) => {
    const params = buildUrlParams();
    params.append('cb', imgKey);
    params.append('theme', theme);
    params.append('colormap', colormap);
    return `/api/stats/histogram/${col}?${params.toString()}`;
  };

  const getGanttUrl = () => {
    const params = buildUrlParams();
    params.append('cb', imgKey);
    params.append('buckets', 360);
    params.append('theme', theme);
    params.append('colormap', colormap);
    return `/api/stats/gantt?${params.toString()}`;
  };

  const getBinSizeStr = () => {
    let start = appliedRange.start || globalBounds.start;
    let end = appliedRange.end || globalBounds.end;
    if (!start || !end) return "";
    let diff = end - start;
    let bucket_size = diff / 360;
    if (bucket_size < 5000000) bucket_size = 5000000;
    
    let sec = bucket_size / 1000000;
    if (sec < 60) return `(${sec.toFixed(1)}s)`;
    if (sec < 3600) return `(${Math.round(sec/60)}m)`;
    if (sec < 86400) return `(${Math.round(sec/3600)}h)`;
    return `(${Math.round(sec/86400)}d)`;
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Data Visualization Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Total records: {totalRows.toLocaleString()}
          </div>
          <button 
            onClick={() => setIsLiveMode(!isLiveMode)} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid', borderColor: isLiveMode ? 'var(--accent-primary)' : 'var(--border-color)', background: isLiveMode ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isLiveMode ? '#fff' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {isLiveMode ? <Pause size={18} /> : <Play size={18} />}
            {isLiveMode ? 'Live Mode On' : 'Live Mode Off'}
          </button>
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowPalette(!showPalette)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <Palette size={18} /> Palette
            </button>
            {showPalette && (
              <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', marginTop: '4px', minWidth: '220px', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                {COLORMAPS.map(cm => (
                  <div 
                    key={cm.name} 
                    onClick={() => { setColormap(cm.name); setShowPalette(false); }}
                    style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', background: colormap === cm.name ? 'var(--border-color)' : 'transparent', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cm.label}</div>
                    <div style={{ height: '12px', width: '100%', borderRadius: '3px', background: cm.gradient }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="filters-bar" style={{ display: 'flex', gap: '1.8rem', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--bg-primary)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <TimelineBrush 
          appliedRange={appliedRange}
          appliedMsics={appliedMsics} 
          appliedEvstrs={appliedEvstrs}
          appliedAcqHosts={appliedAcqHosts}
          stagedRange={stagedRange}
          onRangeChange={setStagedRange} 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '160px', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>RECEIVER</label>
          <MultiSelect 
            options={availableMsics} 
            selected={stagedMsics} 
            onChange={setStagedMsics} 
            placeholder="All MSICs" 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '160px', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>EVENT</label>
          <MultiSelect 
            options={availableEvstrs} 
            selected={stagedEvstrs} 
            onChange={setStagedEvstrs} 
            placeholder="All Events" 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '160px', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>HOST</label>
          <MultiSelect 
            options={availableAcqHosts} 
            selected={stagedAcqHosts} 
            onChange={setStagedAcqHosts} 
            placeholder="All Hosts" 
          />
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
          <button className="btn-primary" onClick={handleApplyFilters} style={{ padding: '0.5rem 1rem', fontSize: '1.08rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', height: '42px', borderRadius: '4px' }}>
            <Filter size={18} style={{ marginRight: '7px' }} />
            Apply Filters
          </button>
          
          <button className="btn-secondary" onClick={handleResetFilters} style={{ padding: '0.5rem 1rem', fontSize: '1.08rem', fontWeight: 'bold', border: 'none', borderRadius: '4px', background: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', height: '42px' }}>
            <RotateCcw size={18} style={{ marginRight: '7px' }} />
            Reset
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button>
        <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
        <button className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Data Table</button>
        <button className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>Database</button>
      </div>
      
      {activeTab === 'database' && <DatabaseView />}
      
      {activeTab === 'timeline' && (
        <div className="card full-width">
          <h2><Activity size={20} /> Activity <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: 'normal' }}>{getBinSizeStr()}</span></h2>
          <div className="gantt-container" style={{ textAlign: 'center', width: '100%' }}>
            <img src={getGanttUrl()} alt="Gantt Chart" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="dashboard-grid">
          <div className="card full-width">
            <h2><BarChart2 size={20}/> Events</h2>
            <div className="chart-container" style={{ width: '100%' }}>
              <img src={getHistUrl('evstr')} alt="Events Histogram" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
          <div className="card">
            <h2><Clock size={20}/> Activity by Hour</h2>
            <div className="chart-container" style={{ width: '100%' }}>
              <img src={getHistUrl('hour')} alt="Hour Histogram" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
          <div className="card">
            <h2><Calendar size={20}/> Activity by Date</h2>
            <div className="chart-container" style={{ width: '100%' }}>
              <img src={getHistUrl('date8')} alt="Date Histogram" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
          <div className="card">
            <h2><Database size={20}/> Receivers</h2>
            <div className="chart-container" style={{ width: '100%' }}>
              <img src={getHistUrl('msic')} alt="MSIC Histogram" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
          <div className="card">
            <h2><Database size={20}/> Acquisition Hosts</h2>
            <div className="chart-container" style={{ width: '100%' }}>
              <img src={getHistUrl('acq_host')} alt="Acq Host Histogram" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2><Database size={20} /> Raw Data Explorer</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={() => gridApi && gridApi.exportDataAsCsv()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <Download size={16} /> Export CSV
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Page Size:</label>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  {[10, 20, 50, 100, 500, 1000].map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <ColumnSelector columns={colDefs} setColumns={setColDefs} />
            </div>
          </div>

          <div className={theme === 'dark' ? "ag-theme-alpine-dark" : "ag-theme-alpine"} style={{ height: 600, width: '100%' }}>
            <AgGridReact 
              rowData={data} 
              columnDefs={colDefs} 
              pagination={true} 
              paginationPageSize={pageSize} 
              domLayout="normal"
              onGridReady={(params) => setGridApi(params.api)}
              onRowClicked={(e) => setSelectedRow(e.data)}
              rowStyle={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {selectedRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '8px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}><Database size={20} style={{ marginRight: '8px' }}/> Record Details</h2>
              <button onClick={() => setSelectedRow(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {Object.entries(selectedRow).map(([key, value]) => (
                <div key={key} style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{key}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', wordBreak: 'break-all' }}>{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
