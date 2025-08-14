export const styles = {
    // repeated style settings
    app: { width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' },
    topBar: { height: 50, background: '#2c2c2c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 15, borderBottom: '1px solid #ccc' },
    tabBtn: (active) => ({
        padding: '10px 20px', margin: '5px',
        backgroundColor: active ? '#78A083' : '#444',
        color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer'
    }),
};