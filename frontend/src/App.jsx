import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Activity, BarChart2, Calendar, Database, Clock, Filter, ChevronLeft, ChevronRight, Check, RotateCcw, Sun, Moon, Download, Play, Pause, X, Palette, ZoomIn, ZoomOut } from 'lucide-react';
import DatabaseView from './DatabaseView';

const COLORMAPS = [
  { name: 'americana', label: 'Americana', gradient: 'linear-gradient(to right, #67001f, #b2182b, #d6604d, #f4a582, #fddbc7, #f7f7f7, #d1e5f0, #92c5de, #4393c3, #2166ac, #053061)' },
  { name: 'Blues', label: 'Blues', gradient: 'linear-gradient(to right, #eff3ff, #bdd7e7, #6baed6, #3182bd, #08519c)' },
  { name: 'bone_r', label: 'Bone', gradient: 'linear-gradient(to right, #ffffff, #c7c7c7, #929292, #636363, #363636, #000000)' },
  { name: 'Dark2_r', label: 'Dark 2', gradient: 'linear-gradient(to right, #e6ab02, #66a61e, #e7298a, #7570b3, #d95f02, #1b9e77)' },
  { name: 'elegant', label: 'Elegant', gradient: 'linear-gradient(to right, #543005, #8c510a, #bf812d, #dfc27d, #f6e8c3, #f5f5f5, #c7eae5, #80cdc1, #35978f, #01665e, #003c30)' },
  { name: 'Greens', label: 'Greens', gradient: 'linear-gradient(to right, #edf8e9, #bae4b3, #74c476, #31a354, #006d2c)' },
  { name: 'Greys', label: 'Greys', gradient: 'linear-gradient(to right, #f7f7f7, #cccccc, #969696, #636363, #252525)' },
  { name: 'IN1', label: 'IN1', gradient: 'linear-gradient(to right, #ebac23, #b80058, #008cf9, #006e00, #00bbad, #d163e6, #b24502, #ff9287, #5954d6, #00c6f8, #878500, #00a76c, #bdbdbd)' },
  { name: 'Paired', label: 'Paired', gradient: 'linear-gradient(to right, #a6cee3, #1f78b4, #b2df8a, #33a02c, #fb9a99, #e31a1c)' },
  { name: 'Purples', label: 'Purples', gradient: 'linear-gradient(to right, #f2f0f7, #cbc9e2, #9e9ac8, #756bb1, #54278f)' },
  { name: 'RdPu_r', label: 'Red-Purple', gradient: 'linear-gradient(to right, #7a0177, #c51b8a, #f768a1, #fbb4b9, #feebe2)' },
  { name: 'Reds', label: 'Reds', gradient: 'linear-gradient(to right, #fee5d9, #fcae91, #fb6a4a, #de2d26, #a50f15)' },
  { name: 'royal', label: 'Royal', gradient: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee090, #ffffbf, #ffffff, #e0f3f8, #abd9e9, #74add1, #4575b4, #313695)' },
  { name: 'verdant', label: 'Verdant', gradient: 'linear-gradient(to right, #008066, #66b366, #ccff66, #ffff66)' },
  { name: 'summer2', label: 'Summer2', gradient: 'linear-gradient(to right, #a50026, #d73027, #f46d43, #fdae61, #fee08b, #ffffbf, #ffffff, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)' },
  { name: 'tab20', label: 'Tab 20', gradient: 'linear-gradient(to right, #1f77b4, #aec7e8, #ff7f0e, #ffbb78, #2ca02c, #98df8a)' },
  { name: 'YlGnBu_r', label: 'Yellow-Green-Blue', gradient: 'linear-gradient(to right, #081d58, #225ea8, #41b6c4, #7fcdbb, #c7e9b4, #ffffcc)' }
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

const TimelineBrush = ({ appliedRange, appliedMsics, appliedMssns, appliedEvstrs, appliedAcqHosts, fetchTrigger, stagedRange, onRangeChange, isRelativeMode, setIsRelativeMode, relativeValue, setRelativeValue, relativeUnit, setRelativeUnit, onZoomIn, onZoomOut }) => {
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
      if (appliedMsics !== null) {
        if (appliedMsics.length === 0) params.append('msics', '__NONE__');
        else appliedMsics.forEach(m => params.append('msics', m));
      }
      if (appliedMssns !== null) {
        if (appliedMssns.length === 0) params.append('mssns', '__NONE__');
        else appliedMssns.forEach(m => params.append('mssns', m));
      }
      if (appliedEvstrs !== null) {
        if (appliedEvstrs.length === 0) params.append('evstrs', '__NONE__');
        else appliedEvstrs.forEach(e => params.append('evstrs', e));
      }
      if (appliedAcqHosts !== null) {
        if (appliedAcqHosts.length === 0) params.append('acq_hosts', '__NONE__');
        else appliedAcqHosts.forEach(h => params.append('acq_hosts', h));
      }
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
  }, [appliedRange, appliedMsics, appliedMssns, appliedEvstrs, appliedAcqHosts, fetchTrigger]);

  // Sync inputs when stagedRange changes externally
  useEffect(() => {
    if (stagedRange.start) setManualStart(formatDt(stagedRange.start));
    if (stagedRange.end) setManualEnd(formatDt(stagedRange.end));
  }, [stagedRange]);

  const handlePointerDown = (e, thumb) => {
    e.preventDefault();
    setDraggingThumb(thumb);
    if (isRelativeMode) setIsRelativeMode(false);
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
    <div style={{ width: '600px', display: 'flex', alignItems: 'flex-end', gap: '0.8rem' }}>
      
      <div style={{ display: 'flex', gap: '0.1rem', minWidth: '320px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={() => setIsRelativeMode(false)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', background: !isRelativeMode ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: !isRelativeMode ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Absolute</button>
          <button onClick={() => setIsRelativeMode(true)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', background: isRelativeMode ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isRelativeMode ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Relative</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          {!isRelativeMode ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '48px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>From:</div>
                <input 
                  type="text" 
                  value={manualStart} 
                  onChange={e => setManualStart(e.target.value)} 
                  onBlur={handleManualApply}
                  onKeyDown={e => e.key === 'Enter' && handleManualApply()}
                  style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', fontFamily: 'monospace', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '36px', boxSizing: 'border-box' }} 
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
                  style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', fontFamily: 'monospace', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '36px', boxSizing: 'border-box' }} 
                  placeholder="YYYY-MM-DD HH:MM:SS"
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '48px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Last:</div>
                <input 
                  type="text" 
                  value={relativeValue} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setRelativeValue(val ? parseInt(val) : '');
                  }} 
                  style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '36px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '48px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Unit:</div>
                <select 
                  value={relativeUnit} 
                  onChange={e => setRelativeUnit(e.target.value)} 
                  style={{ flex: 1, padding: '0.36rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '1.08rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '36px', boxSizing: 'border-box' }}
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </>
          )}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', marginLeft: '0.2rem' }}>
        <button onClick={onZoomIn} style={{ padding: '0.3rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Zoom In"><ZoomIn size={20} /></button>
        <button onClick={onZoomOut} style={{ padding: '0.3rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Zoom Out"><ZoomOut size={20} /></button>
      </div>
    </div>
  );
};



const ImageWithStatus = ({ src, alt, style, onLoadingChange }) => {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    
    return () => {
      if (onLoadingChange) onLoadingChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handleLoadComplete = () => {
    setLoading(false);
    if (onLoadingChange) onLoadingChange(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {loading && <div style={{ position: 'absolute', opacity: 0.6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Rendering...</div>}
      <img 
        src={src} 
        alt={alt} 
        style={{ ...style, opacity: loading ? 0.3 : 1, transition: 'opacity 0.2s' }} 
        onLoad={handleLoadComplete}
        onError={handleLoadComplete}
      />
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
  const [isRelativeMode, setIsRelativeMode] = useState(false);
  const [relativeValue, setRelativeValue] = useState(24);
  const [relativeUnit, setRelativeUnit] = useState('hours');
  const [maxCoverageDuration, setMaxCoverageDuration] = useState(1);
  const [coverageData, setCoverageData] = useState([]);
  const [colormap, setColormap] = useState('Paired');
  const [showPalette, setShowPalette] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(0);

  const handleImageLoadingChange = (isLoading) => {
    setImagesLoading(prev => isLoading ? prev + 1 : Math.max(0, prev - 1));
  };
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Staged Filters (UI state)
  const [stagedRange, setStagedRange] = useState({ start: null, end: null });
  const [stagedMsics, setStagedMsics] = useState(null);
  const [stagedMssns, setStagedMssns] = useState(null);
  const [stagedEvstrs, setStagedEvstrs] = useState(null);
  const [stagedAcqHosts, setStagedAcqHosts] = useState(null);

  // Applied Filters (API state)
  const [appliedRange, setAppliedRange] = useState({ start: null, end: null });
  const [appliedMsics, setAppliedMsics] = useState(null);
  const [appliedMssns, setAppliedMssns] = useState(null);
  const [appliedEvstrs, setAppliedEvstrs] = useState(null);
  const [appliedAcqHosts, setAppliedAcqHosts] = useState(null);
  
  // Available filter options
  const [availableMsics, setAvailableMsics] = useState([]);
  const [availableMssns, setAvailableMssns] = useState([]);
  const [availableEvstrs, setAvailableEvstrs] = useState([]);
  const [availableAcqHosts, setAvailableAcqHosts] = useState([]);
  
  const [gridMaxHeight, setGridMaxHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      const gridContainer = document.getElementById('ag-grid-container');
      if (gridContainer) {
        const top = gridContainer.getBoundingClientRect().top;
        const available = window.innerHeight - top - 64; // 60px padding buffer for page bottom
        setGridMaxHeight(Math.max(300, available));
      }
    };
    
    // Slight delay to allow DOM to render and flex to settle
    const timer = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [activeTab]);

  const [imgKey, setImgKey] = useState(Date.now());
  
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [globalBounds, setGlobalBounds] = useState({ start: null, end: null });

  const getActiveTimeRange = (useRealTime = false) => {
    if (isRelativeMode) {
      const anchor_ms = useRealTime ? Date.now() : imgKey;
      const end_u = anchor_ms * 1000;
      let multiplier = 60 * 1000000;
      if (relativeUnit === 'seconds') multiplier = 1000000;
      if (relativeUnit === 'hours') multiplier = 60 * 60 * 1000000;
      if (relativeUnit === 'days') multiplier = 24 * 60 * 60 * 1000000;
      if (relativeUnit === 'weeks') multiplier = 7 * 24 * 60 * 60 * 1000000;
      if (relativeUnit === 'months') multiplier = 30 * 24 * 60 * 60 * 1000000;
      const val = parseInt(relativeValue) || 1;
      const start_u = end_u - (val * multiplier);
      return { start: start_u, end: end_u };
    }
    return appliedRange;
  };

  const fetchFilters = async () => {
    const params = new URLSearchParams();
    const r = getActiveTimeRange(true);
    if (r.start) params.append('start_unix', r.start);
    if (r.end) params.append('end_unix', r.end);
    
    try {
      const res = await fetch('/api/stats/filters?' + params.toString());
      const json = await res.json();
      if (json.msics) setAvailableMsics(json.msics);
      if (json.mssns) setAvailableMssns(json.mssns);
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
      if (isRelativeMode) {
        setFetchTrigger(t => t + 1);
      } else {
        fetch('/api/stats/filters').then(r => r.json()).then(json => {
          if (json.max_unix && globalBounds.end && json.max_unix > globalBounds.end) {
            setGlobalBounds(prev => ({ ...prev, end: json.max_unix }));
            setAppliedRange(prev => ({ ...prev, end: json.max_unix }));
            setStagedRange(prev => ({ ...prev, end: json.max_unix }));
          }
        }).catch(e => console.error("Live fetch error", e));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isLiveMode, isRelativeMode, globalBounds.end]);

  const fetchData = async () => {
    const r = getActiveTimeRange(true);
    if (!r.start && !r.end) return;

    const params = new URLSearchParams();
    params.append('limit', 10000);
    if (r.start) params.append('start_unix', r.start);
    if (r.end) params.append('end_unix', r.end);
    if (appliedMsics !== null) {
      if (appliedMsics.length === 0) params.append('msics', '__NONE__');
      else appliedMsics.forEach(m => params.append('msics', m));
    }
    if (appliedMssns !== null) {
      if (appliedMssns.length === 0) params.append('mssns', '__NONE__');
      else appliedMssns.forEach(m => params.append('mssns', m));
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
      setIsFetching(true);
      const res = await fetch(`/api/data?${params.toString()}`);
      const json = await res.json();
      setData(json.data);
      setTotalRows(json.total);
      setImgKey(Date.now());
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appliedRange, appliedMsics, appliedMssns, appliedEvstrs, appliedAcqHosts, fetchTrigger]);


  const handleZoomIn = () => {
    setIsRelativeMode(false);
    const r = getActiveTimeRange(true);
    if (!r.start || !r.end) return;
    const dur = r.end - r.start;
    const mid = r.start + dur / 2;
    const newDur = dur / 2;
    const newStart = mid - newDur / 2;
    const newEnd = mid + newDur / 2;
    setStagedRange({ start: newStart, end: newEnd });
    setAppliedRange({ start: newStart, end: newEnd });
  };

  const handleZoomOut = () => {
    setIsRelativeMode(false);
    const r = getActiveTimeRange(true);
    if (!r.start || !r.end) return;
    const dur = r.end - r.start;
    const mid = r.start + dur / 2;
    const newDur = dur * 2;
    let newStart = mid - newDur / 2;
    let newEnd = mid + newDur / 2;
    if (globalBounds.start && newStart < globalBounds.start) newStart = globalBounds.start;
    if (globalBounds.end && newEnd > globalBounds.end) newEnd = globalBounds.end;
    setStagedRange({ start: newStart, end: newEnd });
    setAppliedRange({ start: newStart, end: newEnd });
  };

  const fetchCoverage = async () => {
    const params = new URLSearchParams();
    const r = getActiveTimeRange(true);
    if (r.start) params.append('start_unix', r.start);
    if (r.end) params.append('end_unix', r.end);
    if (appliedMsics !== null) appliedMsics.length === 0 ? params.append('msics', '__NONE__') : appliedMsics.forEach(m => params.append('msics', m));
    if (appliedMssns !== null) appliedMssns.length === 0 ? params.append('mssns', '__NONE__') : appliedMssns.forEach(m => params.append('mssns', m));
    if (appliedEvstrs !== null) appliedEvstrs.length === 0 ? params.append('evstrs', '__NONE__') : appliedEvstrs.forEach(e => params.append('evstrs', e));
    if (appliedAcqHosts !== null) appliedAcqHosts.length === 0 ? params.append('acq_hosts', '__NONE__') : appliedAcqHosts.forEach(h => params.append('acq_hosts', h));
    
    try {
      setIsFetching(true);
      const res = await fetch('/api/stats/coverage_table?' + params.toString());
      const json = await res.json();
      setCoverageData(json);
      const maxVal = Math.max(...json.map(d => d.total_duration || 0), 1);
      setMaxCoverageDuration(maxVal);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'coverage') fetchCoverage();
  }, [activeTab, appliedRange, isRelativeMode, relativeValue, relativeUnit, appliedMsics, appliedMssns, appliedEvstrs, appliedAcqHosts, fetchTrigger]);

  const handleApplyFilters = () => {
    setAppliedRange(stagedRange);
    setAppliedMsics(stagedMsics);
    setAppliedMssns(stagedMssns);
    setAppliedEvstrs(stagedEvstrs);
    setAppliedAcqHosts(stagedAcqHosts);
    setFetchTrigger(t => t + 1);
  };

  const handleResetFilters = () => {
    setStagedRange(globalBounds);
    setStagedMsics(null);
    setStagedMssns(null);
    setStagedEvstrs(null);
    setStagedAcqHosts(null);
    setAppliedRange(globalBounds);
    setAppliedMsics(null);
    setAppliedMssns(null);
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


  const buildUrlParams = () => {
    const params = new URLSearchParams();
    const r = getActiveTimeRange();
    if (r.start) params.append('start_unix', r.start);
    if (r.end) params.append('end_unix', r.end);
    
    if (appliedMsics !== null) {
      if (appliedMsics.length === 0) params.append('msics', '__NONE__');
      else appliedMsics.forEach(m => params.append('msics', m));
    }
    if (appliedMssns !== null) {
      if (appliedMssns.length === 0) params.append('mssns', '__NONE__');
      else appliedMssns.forEach(m => params.append('mssns', m));
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

  const getActivityCoverageHistUrl = () => {
    const params = buildUrlParams();
    params.append('cb', imgKey);
    params.append('theme', theme);
    params.append('colormap', colormap);
    return `/api/stats/activity_coverage_hist?${params.toString()}`;
  };

  const getReceiversPieUrl = () => {
    const params = buildUrlParams();
    params.append('cb', imgKey);
    params.append('theme', theme);
    params.append('colormap', colormap);
    return `/api/stats/receivers_nested_pie?${params.toString()}`;
  };
  const getGanttUrl = () => {
    const params = buildUrlParams();
    params.append('cb', imgKey);
    params.append('buckets', 512);
    params.append('theme', theme);
    params.append('colormap', colormap);
    // Explicitly enforce timeline edges
    const r = getActiveTimeRange();
    if (r.start) params.set('start_unix', r.start);
    if (r.end) params.set('end_unix', r.end);
    return `/api/stats/gantt?${params.toString()}`;
  };

  const getBinSizeStr = () => {
    const r = getActiveTimeRange();
    let start = r.start || globalBounds.start;
    let end = r.end || globalBounds.end;
    if (!start || !end) return "";
    let diff = end - start;
    let bucket_size = diff / 512;
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
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/pistol.svg" alt="Logo" style={{ height: '36px', width: 'auto', marginRight: '4px' }} />
          Activity Dashboard
          <a href="/docs" target="_blank" rel="noreferrer" style={{ fontSize: '8pt', color: 'var(--text-secondary)', textDecoration: 'none', marginLeft: '0.2rem', fontWeight: 'normal' }}>(API)</a>
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {(isFetching || imagesLoading > 0) && (
            <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
              {isFetching ? 'Querying...' : 'Rendering...'}
            </div>
          )}
          <div style={{ color: 'var(--text-secondary)' }}>
            Total records: {totalRows.toLocaleString()}
          </div>
          <button 
            onClick={() => setIsLiveMode(!isLiveMode)} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid', borderColor: isLiveMode ? 'var(--accent-primary)' : 'var(--border-color)', background: isLiveMode ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isLiveMode ? '#fff' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', height: '42px', fontSize: '1.08rem', fontWeight: 'bold' }}
          >
            {isLiveMode ? <Pause size={18} /> : <Play size={18} />}
            {isLiveMode ? 'Live Mode On' : 'Live Mode Off'}
          </button>
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', height: '42px', fontSize: '1.08rem', fontWeight: 'bold' }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowPalette(!showPalette)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', height: '42px', fontSize: '1.08rem', fontWeight: 'bold' }}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {cm.label} {colormap === cm.name && <span style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>*</span>}
                    </div>
                    <div style={{ height: '12px', width: '100%', borderRadius: '3px', background: cm.gradient }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="filters-bar" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--bg-primary)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <TimelineBrush 
          appliedRange={getActiveTimeRange(false)}
          appliedMsics={appliedMsics} 
          appliedMssns={appliedMssns}
          appliedEvstrs={appliedEvstrs}
          appliedAcqHosts={appliedAcqHosts}
          fetchTrigger={fetchTrigger}
          stagedRange={isRelativeMode ? getActiveTimeRange(false) : stagedRange}
          onRangeChange={setStagedRange} 
          isRelativeMode={isRelativeMode}
          setIsRelativeMode={(val) => {
            if (!val && isRelativeMode) {
              const r = getActiveTimeRange(true);
              setStagedRange(r);
              setAppliedRange(r);
            }
            setIsRelativeMode(val);
          }}
          relativeValue={relativeValue}
          setRelativeValue={setRelativeValue}
          relativeUnit={relativeUnit}
          setRelativeUnit={setRelativeUnit}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '160px', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>MSSN</label>
          <MultiSelect 
            options={availableMssns} 
            selected={stagedMssns} 
            onChange={setStagedMssns} 
            placeholder="All MSSNs" 
          />
        </div>

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
          <button className="btn-primary" onClick={handleApplyFilters} style={{ padding: '0 1rem', height: '36px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
            <Filter size={16} style={{ marginRight: '7px' }} />
            Apply
          </button>
          
          <button className="btn-secondary" onClick={handleResetFilters} style={{ padding: '0 1rem', height: '36px', fontSize: '0.9rem', border: 'none', borderRadius: '4px', background: '#ef4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={16} style={{ marginRight: '7px' }} />
            Reset
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button>
        <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
        <button className={`tab-btn ${activeTab === 'coverage' ? 'active' : ''}`} onClick={() => setActiveTab('coverage')}>Coverage</button>
        <button className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>Table</button>
        <button className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>Database</button>
      </div>
      
      {activeTab === 'database' && <DatabaseView />}

      {activeTab === 'coverage' && (
        <div className="card full-width" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2><Activity size={20} /> Coverage</h2>
          <div id="ag-grid-container" className={theme === 'dark' ? "ag-theme-alpine-dark" : "ag-theme-alpine"} style={{ width: '100%', marginTop: '1rem', height: `${Math.max(10, coverageData.length) * 42 + 100}px`, maxHeight: `${gridMaxHeight}px` }}>
            <AgGridReact
              key={colormap}
              rowData={coverageData}
              pagination={true}
              paginationPageSize={25}
              paginationPageSizeSelector={[25, 50, 100, 500]}

              columnDefs={[
                { 
                  field: 'num_receivers', 
                  headerName: '# of Receivers', 
                  width: 160,
                  cellRenderer: (params) => {
                     const numRecv = params.value || 1;
                     let icon = '⚠️';
                     let title = 'Warning (1 or 2)';
                     if (numRecv === 3) { icon = '✅'; title = 'Good (3)'; }
                     else if (numRecv > 3) { icon = '🚀'; title = 'Great (4+)'; }
                     return <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span title={title} style={{fontSize: '16px'}}>{icon}</span> <span>{numRecv}</span></div>;
                  }
                },
                { field: 'msic_set', headerName: 'Set of Receivers', flex: 1 },
                { field: 'num_periods', headerName: '# of Periods', width: 140 },
                { field: 'num_dates', headerName: '# of Dates', width: 140 },
                { 
                  field: 'total_duration', 
                  headerName: 'Total Duration', 
                  flex: 1,
                  cellRenderer: (params) => {
                     if (params.value === undefined || params.value === null) return '0s';
                     const val = params.value;
                     const numRecv = params.data.num_receivers || 1;
                     
                     const cmap = COLORMAPS.find(c => c.name === colormap) || COLORMAPS[0];
                     const colors = cmap.gradient.match(/#[0-9a-fA-F]{6}/g) || ['var(--accent-primary)'];
                     const barColor = colors[Math.max(0, numRecv - 1) % colors.length];
                     
                     let formatted = val.toFixed(1) + 's';
                     if (val >= 86400) formatted = (val / 86400).toFixed(1) + 'd';
                     else if (val >= 3600) formatted = (val / 3600).toFixed(1) + 'h';
                     else if (val >= 60) formatted = (val / 60).toFixed(1) + 'm';
                     
                     const pct = Math.min((val / maxCoverageDuration) * 100, 100);
                     
                     return (
                       <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', gap: '10px' }}>
                         <span style={{ width: '60px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                           {formatted}
                         </span>
                         <div style={{ flex: 1, background: 'var(--bg-secondary)', height: '12px', borderRadius: '2px', overflow: 'hidden' }}>
                           <div style={{ width: `${pct}%`, background: barColor, height: '100%' }}></div>
                         </div>
                       </div>
                     );
                  }
                }
              ]}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        </div>
      )}

      
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="full-width">
          <div className="card">
            <h2><Activity size={20} /> Activity <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: 'normal' }}>{getBinSizeStr()}</span></h2>
            <div className="gantt-container" style={{ textAlign: 'center', width: '100%' }}>
              <ImageWithStatus src={getGanttUrl()} alt="Gantt Chart" style={{ width: '100%', height: 'auto', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="dashboard-grid">
          <div className="card full-width">
            <h2><BarChart2 size={20}/> Events</h2>
            <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ImageWithStatus src={getHistUrl('evstr')} alt="Events Histogram" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', width: '100%', gridColumn: '1 / -1' }}>
              <div className="card" style={{ flex: '1 1 33%' }}>
                <h2><Calendar size={20}/> Activity by Date</h2>
                <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageWithStatus src={getHistUrl('date8')} alt="Date Histogram" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
                </div>
              </div>
              <div className="card" style={{ flex: '1 1 67%' }}>
                <h2><Clock size={20}/> Activity by Hour</h2>
                <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageWithStatus src={getHistUrl('hour')} alt="Hour Histogram" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
                </div>
              </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', width: '100%', gridColumn: '1 / -1' }}>
              <div className="card" style={{ flex: 1 }}>
                <h2><Database size={20}/> Receivers</h2>
                <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageWithStatus src={getReceiversPieUrl()} alt="Receivers Nested Donut" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
                </div>
              </div>
              
              <div className="card" style={{ flex: 1 }}>
                <h2><Activity size={20} /> Activity Coverage</h2>
                <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageWithStatus src={getActivityCoverageHistUrl()} alt="Activity Coverage Histogram" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
                </div>
              </div>

              <div className="card" style={{ flex: 1 }}>
                <h2><Database size={20}/> Acquisition Hosts</h2>
                <div className="chart-container" style={{ width: '100%', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageWithStatus src={getHistUrl('acq_host')} alt="Acq Host Histogram" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} onLoadingChange={handleImageLoadingChange} />
                </div>
              </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card full-width" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2><Database size={20} /> Data Explorer</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={() => gridApi && gridApi.exportDataAsCsv()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <Download size={16} /> Export CSV
              </button>

              <ColumnSelector columns={colDefs} setColumns={setColDefs} />
            </div>
          </div>

          <div id="ag-grid-container" className={theme === 'dark' ? "ag-theme-alpine-dark" : "ag-theme-alpine"} style={{ width: '100%', height: `${Math.max(10, data.length) * 42 + 100}px`, maxHeight: `${gridMaxHeight}px` }}>
            <AgGridReact
              rowData={data}
              columnDefs={colDefs}
              pagination={true}
              paginationPageSize={25}
              paginationPageSizeSelector={[25, 50, 100, 500]}
              onGridReady={(params) => setGridApi(params.api)}
              onRowClicked={(e) => setSelectedRow(e.data)}
              rowStyle={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {selectedRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '8px', maxWidth: '1200px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}><Database size={20} style={{ marginRight: '8px' }}/> Record Details</h2>
              <button onClick={() => setSelectedRow(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {Object.entries(selectedRow).map(([key, value]) => {
                const strVal = String(value);
                const isLarge = strVal.length > 80;
                let displayVal = strVal;
                let isJson = false;
                if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                  try {
                    const parsed = JSON.parse(value);
                    displayVal = JSON.stringify(parsed, null, 2);
                    isJson = true;
                  } catch (e) {
                    try {
                      const parsed = JSON.parse(value.replace(/'/g, '"'));
                      displayVal = JSON.stringify(parsed, null, 2);
                      isJson = true;
                    } catch (e2) {
                      let inner = value.trim();
                      if (inner.startsWith('{') && inner.endsWith('}')) {
                         inner = inner.substring(1, inner.length - 1);
                         let parts = inner.split(',').map(p => '  ' + p.trim());
                         displayVal = '{\n' + parts.join(',\n') + '\n}';
                         isJson = true;
                      }
                    }
                  }
                }
                
                return (
                  <div key={key} style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: isLarge || isJson ? '1 / -1' : 'auto' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{key}</div>
                    {isJson ? (
                      <pre 
                        style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ 
                          __html: displayVal.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                            let color = 'var(--text-primary)';
                            if (/^"/.test(match)) {
                              if (/:$/.test(match)) color = 'var(--accent-primary)'; // key
                              else color = '#2ca02c'; // string
                            } else if (/true|false/.test(match)) color = '#1f77b4';
                            else if (/null/.test(match)) color = '#7f7f7f';
                            else color = '#ff7f0e'; // number
                            return '<span style="color: ' + color + '">' + match + '</span>';
                          })
                        }}
                      />
                    ) : (
                      <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', wordBreak: 'break-all' }}>{displayVal}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
