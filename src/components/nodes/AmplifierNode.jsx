import React from 'react';
import { Handle } from '@xyflow/react';

export function AmplifierNode({ data }) {
  return (
    <div
      style={{
        width: 90,
        height: 60,
        background: data.nodeColor || '#DDE6ED',
        color: 'black',
        borderRadius: 8,
        padding: 8,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ 
        fontSize: '12px',
        textAlign: 'center',
      }}>
        {data.label || 'AMP'}
      </div>

      <Handle type="target" position="left" style={{ background: '#555' }} />
      <Handle type="source" position="right" style={{ background: '#555' }} />
    </div>
  );
}

export function AmplifierNodeReverse({ data }) {
  return (
    <div
      style={{
        width: 90,
        height: 60,
        background: data.nodeColor || '#DDE6ED',
        color: 'black',
        borderRadius: 8,
        padding: 8,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ 
        fontSize: '12px',
        textAlign: 'center',
      }}>
        {data.label || 'AMP_R'}
      </div>

      <Handle type="target" position="right" style={{ background: '#555' }} />
      <Handle type="source" position="left" style={{ background: '#555' }} />
    </div>
  );
}
