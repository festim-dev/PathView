import React, { useState } from 'react';

const EventsTab = ({ events, setEvents }) => {
  const [currentEvent, setCurrentEvent] = useState({
    name: '',
    type: 'ZeroCrossingDown',
    func_evt: '',
    func_act: '',
    tolerance: '1e-8'
  });

  const eventTypes = [
    'Condition',
    'Schedule', 
    'ZeroCrossing',
    'ZeroCrossingUp',
    'ZeroCrossingDown'
  ];

  const handleInputChange = (field, value) => {
    setCurrentEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEvent = () => {
    if (currentEvent.name && currentEvent.func_evt && currentEvent.func_act) {
      setEvents(prev => [...prev, { ...currentEvent, id: Date.now() }]);
      setCurrentEvent({
        name: '',
        type: 'ZeroCrossingDown',
        func_evt: '',
        func_act: '',
        tolerance: '1e-8'
      });
    }
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

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
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <h1 style={{ color: '#ffffff', marginBottom: '30px', textAlign: 'center' }}>
          Events
        </h1>

        {/* Add New Event Form */}
        <div style={{
          backgroundColor: '#2a2a3f',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '30px',
          border: '1px solid #444'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '20px' }}>Add New Event</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                Event Name:
              </label>
              <input
                type="text"
                value={currentEvent.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., E1, shutdown_event"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1e1e2f',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                Event Type:
              </label>
              <select
                value={currentEvent.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1e1e2f',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>
              Tolerance:
            </label>
            <input
              type="text"
              value={currentEvent.tolerance}
              onChange={(e) => handleInputChange('tolerance', e.target.value)}
              placeholder="e.g., 1e-8"
              style={{
                width: '200px',
                padding: '10px',
                backgroundColor: '#1e1e2f',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                Event Function (func_evt):
              </label>
              <textarea
                value={currentEvent.func_evt}
                onChange={(e) => handleInputChange('func_evt', e.target.value)}
                placeholder={`eg. def func_evt_down(t):
    *_, x = storage()
    return x`}
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '10px',
                  backgroundColor: '#1e1e2f',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                Action Function (func_act):
              </label>
              <textarea
                value={currentEvent.func_act}
                onChange={(e) => handleInputChange('func_act', e.target.value)}
                placeholder={`eg. def func_act_down(t):
    fusion_reaction_rate.off()`}
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '10px',
                  backgroundColor: '#1e1e2f',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          <button
            onClick={addEvent}
            style={{
              backgroundColor: '#78A083',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '12px 24px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Add Event
          </button>
        </div>

        {/* Events List */}
        <div>
          <h2 style={{ color: '#ffffff', marginBottom: '20px' }}>Defined Events ({events.length})</h2>
          
          {events.length === 0 ? (
            <div style={{
              backgroundColor: '#2a2a3f',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              color: '#888',
              border: '1px solid #444'
            }}>
              No events defined yet. Add an event above to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {events.map((event, index) => (
                <div
                  key={event.id}
                  style={{
                    backgroundColor: '#2a2a3f',
                    borderRadius: '8px',
                    padding: '20px',
                    border: '1px solid #444'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#ffffff', margin: 0 }}>
                      {event.name} ({event.type})
                    </h3>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ color: '#ccc', margin: '0 0 8px 0', fontSize: '14px' }}>Event Function:</h4>
                      <pre style={{
                        backgroundColor: '#1e1e2f',
                        padding: '12px',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        margin: 0,
                        overflow: 'auto',
                        border: '1px solid #555'
                      }}>
                        {event.func_evt}
                      </pre>
                    </div>

                    <div>
                      <h4 style={{ color: '#ccc', margin: '0 0 8px 0', fontSize: '14px' }}>Action Function:</h4>
                      <pre style={{
                        backgroundColor: '#1e1e2f',
                        padding: '12px',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        margin: 0,
                        overflow: 'auto',
                        border: '1px solid #555'
                      }}>
                        {event.func_act}
                      </pre>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <span style={{ color: '#ccc', fontSize: '14px' }}>
                      Tolerance: <code style={{ color: '#78A083' }}>{event.tolerance}</code>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsTab;