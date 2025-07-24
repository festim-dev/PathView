import React from 'react';
import { Handle } from '@xyflow/react';

export default function AmplifierNode({ data }) {
  return (
    <div
      style={{
        width: 120,
        height: 80,
        background: '#DDE6ED',
        color: 'black',
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
        clipPath: 'polygon(0% 0%, 0% 100%, 100% 50%)',
        border: '3px solid #2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '10px',
      }}
    >
      <div style={{ 
        fontSize: '12px',
        textAlign: 'center',
        transform: 'translateX(-10px)' // Adjust text position in triangle
      }}>
        {data.label}
      </div>

      <Handle 
        type="target" 
        position="left" 
        style={{ 
          background: '#555',
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '12px',
          height: '12px'
        }} 
      />
      <Handle 
        type="source" 
        position="right" 
        style={{ 
          background: '#555',
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '12px',
          height: '12px'
        }} 
      />
    </div>
  );
}
