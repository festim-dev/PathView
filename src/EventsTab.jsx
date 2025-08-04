import React from 'react';

const EventsTab = () => {
  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 50px)',
      paddingTop: '50px',
      backgroundColor: '#1e1e2f',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '40px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{ color: '#ffffff', marginBottom: '30px', textAlign: 'center' }}>
          Events
        </h1>
      </div>
    </div>
  );
};

export default EventsTab;