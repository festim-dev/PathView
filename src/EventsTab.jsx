import { useState } from 'react';

// Define default parameters for each event type
const eventDefaults = {
  'Schedule': {
    t_start: '0',
    t_end: 'None',
    t_period: '1',
    func_act: '',
    tolerance: '1e-16'
  },
  'ZeroCrossingDown': {
    func_evt: '',
    func_act: '',
    tolerance: '1e-8'
  },
  'ZeroCrossingUp': {
    func_evt: '',
    func_act: '',
    tolerance: '1e-8'
  },
  'ZeroCrossing': {
    func_evt: '',
    func_act: '',
    tolerance: '1e-8'
  },
  'Condition': {
    func_evt: '',
    func_act: '',
    tolerance: '1e-8'
  }
};

const EventsTab = ({ events, setEvents }) => {
  // Initialize with defaults for the initial event type
  const initialEventType = 'ZeroCrossingDown';
  const [currentEvent, setCurrentEvent] = useState(() => {
    return {
      name: '',
      type: initialEventType,
      ...eventDefaults[initialEventType]
    };
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

  const handleTypeChange = (newType) => {
    // When type changes, reset the event to defaults for that type
    const defaults = eventDefaults[newType] || {};
    setCurrentEvent({
      name: currentEvent.name, // Keep the name
      type: newType,
      ...defaults
    });
  };

  const addEvent = () => {
    if (currentEvent.name) {
      // Validate required fields based on event type
      const typeDefaults = eventDefaults[currentEvent.type] || {};
      
      // For Schedule, func_act is required
      if (currentEvent.type === 'Schedule' && !currentEvent.func_act) {
        alert('func_act is required for Schedule events');
        return;
      }
      
      // For other event types, both func_evt and func_act are typically required
      if (currentEvent.type !== 'Schedule' && (!currentEvent.func_evt || !currentEvent.func_act)) {
        alert('Both func_evt and func_act are required for this event type');
        return;
      }

      setEvents(prev => [...prev, { ...currentEvent, id: Date.now() }]);
      
      // Reset to defaults for current type
      const resetDefaults = eventDefaults[currentEvent.type] || {};
      setCurrentEvent({
        name: '',
        type: currentEvent.type,
        ...resetDefaults
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
                onChange={(e) => handleTypeChange(e.target.value)}
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

          {/* Dynamic parameter fields based on event type */}
          {(() => {
            const typeDefaults = eventDefaults[currentEvent.type] || {};
            const allParams = new Set([
              ...Object.keys(currentEvent).filter(key => key !== 'name' && key !== 'type'),
              ...Object.keys(typeDefaults)
            ]);

            return Array.from(allParams).map(key => {
              const currentValue = currentEvent[key] || '';
              const defaultValue = typeDefaults[key];
              const placeholder = defaultValue !== undefined && defaultValue !== null ?
                String(defaultValue) : '';
              
              // Check if this is a function parameter (contains 'func' in the name)
              const isFunctionParam = key.toLowerCase().includes('func');

              return (
                <div key={key} style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    {key}:
                  </label>
                  {isFunctionParam ? (
                    <textarea
                      value={currentValue}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={placeholder || `eg. def ${key}(t):\n    # Your code here\n    return result`}
                      style={{
                        width: '100%',
                        minHeight: '120px',
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
                  ) : (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={placeholder}
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
                  )}
                </div>
              );
            });
          })()}

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

                  {/* Display parameters dynamically */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {Object.entries(event)
                      .filter(([key]) => key !== 'id' && key !== 'name' && key !== 'type')
                      .map(([key, value]) => {
                        const isFunctionParam = key.toLowerCase().includes('func');
                        
                        return (
                          <div key={key}>
                            <h4 style={{ 
                              color: '#ccc', 
                              margin: '0 0 8px 0', 
                              fontSize: '14px',
                              textTransform: 'capitalize'
                            }}>
                              {key.replace(/_/g, ' ')}:
                            </h4>
                            {isFunctionParam ? (
                              <pre style={{
                                backgroundColor: '#1e1e2f',
                                padding: '12px',
                                borderRadius: '4px',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                margin: 0,
                                overflow: 'auto',
                                border: '1px solid #555',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {value || '(not defined)'}
                              </pre>
                            ) : (
                              <code style={{
                                backgroundColor: '#1e1e2f',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                color: '#78A083',
                                fontSize: '14px',
                                fontFamily: 'monospace',
                                border: '1px solid #555',
                                display: 'block'
                              }}>
                                {value || '(not set)'}
                              </code>
                            )}
                          </div>
                        );
                      })
                    }
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