import React, { useState, useEffect } from 'react';
import { Database, Server, HardDrive, Key, FileText, Hash, Table } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const DatabaseView = () => {
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/db/info')
      .then(res => res.json())
      .then(data => {
        setDbData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load database info");
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Database Info...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!dbData) return null;

  const { info, schema, indexes, stats } = dbData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="dashboard-grid">
        {/* Info Card */}
        <div className="card">
          <h2><Server size={20} /> Connection Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
              <span style={{ fontWeight: 500 }}>{info.type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Host:</span>
              <span style={{ fontWeight: 500 }}>{info.host}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database:</span>
              <span style={{ fontWeight: 500 }}>{info.db_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>User:</span>
              <span style={{ fontWeight: 500 }}>{info.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Password:</span>
              <span style={{ fontWeight: 500 }}>{info.password}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Path:</span>
              <span style={{ fontWeight: 500, fontSize: '0.85rem', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{info.path}</span>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="card">
          <h2><Database size={20} /> Statistics</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Rows (PRED_info):</span>
              <span style={{ fontWeight: 500, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{stats.total_rows.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>File Size:</span>
              <span style={{ fontWeight: 500, fontSize: '1.2rem', color: '#10b981' }}>{stats.file_size_mb} MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Definitions */}
      <div className="card full-width">
        <h2><Table size={20} /> Schema Definitions</h2>
        {schema.map((t, idx) => (
          <div key={idx} style={{ marginBottom: idx < schema.length - 1 ? '2rem' : 0 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Table: {t.name}</h3>
            <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
              <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', fontSize: '0.9rem' }}>
                {t.sql}
              </SyntaxHighlighter>
            </div>
          </div>
        ))}
      </div>

      {/* Index Definitions */}
      <div className="card full-width">
        <h2><Hash size={20} /> Index Definitions</h2>
        {indexes.map((idx_def, idx) => (
          <div key={idx} style={{ marginBottom: idx < indexes.length - 1 ? '1.5rem' : 0 }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Index: {idx_def.name}</h3>
            <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
              <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', fontSize: '0.9rem' }}>
                {idx_def.sql}
              </SyntaxHighlighter>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default DatabaseView;
