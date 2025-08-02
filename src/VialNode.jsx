import React from 'react';
import { Handle } from '@xyflow/react';
import vialIcon from './vial-svgrepo-com.svg';


export default function VialNode({ data }) {
  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    }}>
        <img src={vialIcon} alt="Vial" width="100 px" style={{
            // filter: 'hue-rotate(180deg)',  // Change color
            // // or
            filter: 'invert(1)',           // Invert colors
        }}/>
        <div style={{ 
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '8px',
            color: 'white',
            fontWeight: 'bold',
        }}>
            {data.label}<br></br>Not implemented yet
        </div>
    
        <Handle type="target" position="top" style={{ background: '#555' }} />
        <Handle type="source" position="bottom" style={{ background: '#555' }} />
    </div>
  );
}
