import React from 'react';
import { Handle } from '@xyflow/react';

export default function BubblerNode({ data }) {
  return (
    <div
      style={{
        width: 180,
        height: 180,
        background: '#DDE6ED',
        color: 'black',
        borderRadius: 8,
        padding: 10,
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div style={{ marginTop: '45%', textAlign: 'center' }}>{data.label}</div>

      <Handle type="target" id="sample_in_soluble" position="left" style={{ background: '#555', top: '33%' }} />
      <Handle type="target" id="sample_in_insoluble" position="left" style={{ background: '#555', top: '66%' }} />

      <Handle type="source" id="vial1" position="top" style={{ background: '#555' , left: '15%'}} />
      <Handle type="source" id="vial2" position="top" style={{ background: '#555', left: '30%' }} />
      <Handle type="source" id="vial3" position="top" style={{ background: '#555', left: '60%' }} />
      <Handle type="source" id="vial4" position="top" style={{ background: '#555', left: '75%' }} />

      <Handle type="source" id="sample_out" position="right" style={{ background: '#555' }} />
    </div>
  );
}
