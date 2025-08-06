import React from 'react';
import { Handle } from '@xyflow/react';

export function AmplifierNode({ data }) {
  return (
    <div
      style={{
        width: 90,
        height: 80,
        color: 'black',
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,0 100,50 0,100" fill="#DDE6ED" />
      </svg>
      <div style={{ 
        fontSize: '12px',
        textAlign: 'center',
        background: 'transparent',
        transform: 'translate(-80%, -50%)',
        top: '50%',
        left: '50%',
        position: 'absolute',
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

export function AmplifierNodeReverse({ data }) {
  return (
    <div
      style={{
        width: 90,
        height: 80,
        color: 'black',
        fontWeight: 'bold',
        position: 'relative',
        cursor: 'pointer',
      }}
    >

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="0,50 100,100 100,0" fill="#DDE6ED" />
      </svg>
      <div style={{ 
        fontSize: '12px',
        textAlign: 'center',
        background: 'transparent',
        transform: 'translate(-50%, -50%)',
        top: '50%',
        left: '50%',
        position: 'absolute',
      }}>
          {data.label}
      </div>


      <Handle 
        type="target" 
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
      <Handle 
        type="source" 
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
    </div>
  );
}
