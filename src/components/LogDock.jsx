// components/LogDock.jsx
import React from 'react';

export default function LogDock({ open, onClose, lines, progress }) {
  if (!open) return null; // don’t render if it's closed

  return (
    <div style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      height: '30vh',
      background: '#111',
      color: '#ddd',
      borderTop: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong>Simulation Logs</strong>
        {typeof progress === 'number' && (
          <div style={{ flex: 1, height: 6, background: '#333', borderRadius: 3 }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#78A083',
              borderRadius: 3
            }} />
          </div>
        )}
        <button onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
      </div>

      {/* Log Lines */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 12px',
        whiteSpace: 'pre-wrap'
      }}>
        {lines.length ? lines.join('\n') : 'Waiting for output…'}
      </div>
    </div>
  );
}
