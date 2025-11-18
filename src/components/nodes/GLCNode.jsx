import { Handle } from '@xyflow/react';

export function GLCNode({ data }) {
    return (
        <div
            style={{
                width: 125,
                height: 180,
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
                top: '26%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                c_T_in
            </div>

            <div style={{
                left: '6px',
                position: 'absolute',
                top: '59%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                y_T2_in
            </div>

            <Handle type="target" position="left" id="c_T_in" style={{ background: '#555', top: '33%' }} />
            <Handle type="target" position="left" id="y_T2_in" style={{ background: '#555', top: '66%' }} />

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '-1%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                c_T_out
            </div>
            <div style={{
                right: '6px',
                position: 'absolute',
                top: '10%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                efficiency
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '20%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                Q_l
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '30%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                n_T_out_liquid
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '60%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                y_T2_out
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '70%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                P_out
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '80%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                Q_g_out
            </div>

            <div style={{
                right: '6px',
                position: 'absolute',
                top: '90%',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'right'
            }}>
                n_T_out_gas
            </div>

            <Handle type="source" position="right" id="c_T_out" style={{ background: '#555', top: '5%' }} />
            <Handle type="source" position="right" id="eff" style={{ background: '#555', top: '15%' }} />
            <Handle type="source" position="right" id="Q_l" style={{ background: '#555', top: '25%' }} />
            <Handle type="source" position="right" id="n_T_out_liquid" style={{ background: '#555', top: '35%' }} />
            <Handle type="source" position="right" id="y_T2_out" style={{ background: '#555', top: '65%' }} />
            <Handle type="source" position="right" id="P_out" style={{ background: '#555', top: '75%' }} />
            <Handle type="source" position="right" id="Q_g_out" style={{ background: '#555', top: '85%' }} />
            <Handle type="source" position="right" id="n_T_out_gas" style={{ background: '#555', top: '95%' }} />
        </div>
    );
}