import React from 'react';
import { Handle } from '@xyflow/react';

export default function CustomNode({ data }) {
  return (
    <div
      style={{
        width: 180,
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

      <Handle type="target" position="top" style={{ background: '#555' }} />
      <Handle type="source" position="bottom" style={{ background: '#555' }} />
    </div>
  );
}
