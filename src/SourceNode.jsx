import React from 'react';
import { Handle } from '@xyflow/react';

export default function SourceNode({ data }) {
  return (
    <div
      style={{
        width: 180,
        background: '#28a745',
        color: 'white',
        borderRadius: 12,
        padding: 10,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginBottom: 4 }}>{data.label}</div>

      <Handle 
        type="source" 
        position="bottom" 
        style={{ background: '#555' }} 
      />
    </div>
  );
}
