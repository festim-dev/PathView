import React from 'react';
import { Handle } from '@xyflow/react';
import CustomHandle from './CustomHandle';

export default function FunctionNode({ data }) {
  return (
    <div
      style={{
        width: 180,
        background: '#DDE6ED',
        color: 'black',
        borderRadius: 0,
        padding: 10,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginBottom: 4 }}>{data.label}</div>

      <CustomHandle type="target" position="left" style={{ background: '#555' }} connectionCount={1}/>
      <Handle type="source" position="right" style={{ background: '#555' }} />
    </div>
  );
}
