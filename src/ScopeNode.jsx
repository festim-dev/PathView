import React from 'react';
import { Handle } from '@xyflow/react';

export default function ScopeNode({ data }) {
  return (
    <div
      style={{
        width: 180,
        height: 100,
        background: '#DDE6ED',
        color: 'black',
        borderRadius: 12,
        padding: 10,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginBottom: 4 }}>{data.label}</div>

      <Handle type="target" position="left" style={{ background: '#555' }} />
    </div>
  );
}
