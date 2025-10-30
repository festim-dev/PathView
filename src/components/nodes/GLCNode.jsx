import { Handle } from '@xyflow/react';

export function GLCNode({ data }) {
    return (
        <div
            style={{
                width: 180,
                height: 100,
                background: data.nodeColor || '#DDE6ED',
                color: 'black',
                borderRadius: 0,
                padding: 10,
                fontWeight: 'bold',
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div style={{ top: '30%', textAlign: 'center' }}>{data.label}</div>


            <div style={{
                left: '6px',
                position: 'absolute',
                top: '25%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                c_T_inlet
            </div>

            <div style={{
                left: '6px',
                position: 'absolute',
                top: '58%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                P_T2_in
            </div>

            <Handle type="target" position="left" id="c_T_inlet" style={{ background: '#555', top: '33%' }} />
            <Handle type="target" position="left" id="P_T2_in" style={{ background: '#555', top: '66%' }} />


            <div style={{
                right: '6px',
                position: 'absolute',
                top: '25%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                T_out_liquid
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '58%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                T_out_gas
            </div>

            <Handle type="source" position="right" id="T_out_liquid" style={{ background: '#555', top: '33%' }} />
            <Handle type="source" position="right" id="T_out_gas" style={{ background: '#555', top: '66%' }} />
        </div>
    );
}