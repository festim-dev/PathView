import React from 'react';
import { Handle } from '@xyflow/react';

export function Splitter2Node({ data }) {
  return (
    <div
      style={{
        width: 100,
        height: 100,
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

      <Handle type="target" position="left" style={{ background: '#555' }} />

      <div style={{ 
        position: 'absolute', 
        right: '4px', 
        top: '12%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal',
        alignContent: 'center',
        verticalAlign: 'middle',
      }}>
        1
      </div>
      <Handle type="source" id="source1" position="right" style={{ background: '#555', top: '20%' }} />

      <div style={{ 
        position: 'absolute', 
        right: '4px', 
        top: '70%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal',
        alignContent: 'center',
        verticalAlign: 'middle',
      }}>
        2
      </div>
      <Handle type="source" id="source2" position="right" style={{ background: '#555', top: '80%' }} />
    </div>
  );
}

export function Splitter3Node({ data }) {
  return (
    <div
      style={{
        width: 100,
        height: 100,
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

      <Handle type="target" position="left" style={{ background: '#555' }} />

      <div style={{ 
        position: 'absolute', 
        right: '4px', 
        top: '12%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal',
        alignContent: 'center',
        verticalAlign: 'middle',
      }}>
        1
      </div>
      <Handle type="source" id="source1" position="right" style={{ background: '#555', top: '20%' }} />

      <div style={{ 
        position: 'absolute', 
        right: '4px', 
        top: '40%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal',
        alignContent: 'center',
        verticalAlign: 'middle',
      }}>
        2
      </div>

      <Handle type="source" id="source2" position="right" style={{ background: '#555', top: '50%' }} />

      <div style={{ 
        position: 'absolute', 
        right: '4px', 
        top: '70%', 
        transform: 'translateX(-50%)', 
        fontSize: '12px',
        fontWeight: 'normal',
        alignContent: 'center',
        verticalAlign: 'middle',
      }}>
        3
      </div>
      <Handle type="source" id="source3" position="right" style={{ background: '#555', top: '80%' }} />
    </div>
  );
}
