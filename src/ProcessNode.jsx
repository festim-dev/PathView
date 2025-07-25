import React from 'react';
import { Handle } from '@xyflow/react';

export default function ProcessNode({ data }) {
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

      <Handle type="target" position="top" style={{ background: '#555'}} />
      {/* Label for inv handle */}
      <div style={{ 
        position: 'absolute', 
        bottom: '2px', 
        left: '33%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal'
      }}>
        I
      </div>
      <Handle type="source" id="inv" position="bottom" style={{ background: '#555', left: '33%' }} />


      {/* Label for mass_flow_rate handle */}
      <div style={{ 
        position: 'absolute', 
        bottom: '2px', 
        left: '66%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal'
      }}>
        I/τ
      </div>
      <Handle type="source" id="mass_flow_rate" position="bottom" style={{ background: '#555', left: '66%' }} />
    </div>
  );
}
