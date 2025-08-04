import React, { useState } from 'react';
import { useDnD } from './DnDContext';
import { nodeCategories, getNodeDisplayName } from './nodeConfig.js';
 
export default () => {
  const [_, setType] = useDnD();
  const [expandedCategories, setExpandedCategories] = useState({
    'Sources': true,
    'Processing': true,
    'Math': true,
    'Control': false,
    'Fuel Cycle': false,
    'Output': true
  });
 
  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Get CSS class for node based on category
  const getNodeClass = (categoryName) => {
    const categoryClasses = {
      'Sources': 'dndnode input',
      'Output': 'dndnode output',
      'Processing': 'dndnode processing',
      'Math': 'dndnode math',
      'Control': 'dndnode control',
      'Fuel Cycle': 'dndnode fuel-cycle'
    };
    return categoryClasses[categoryName] || 'dndnode';
  };
 
  return (
    <aside style={{ 
      padding: '16px',
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      boxSizing: 'border-box'
    }}>
      <div className="description" style={{
        marginBottom: '16px',
        fontSize: '14px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        Drag nodes to the canvas to add them to your graph
      </div>
      
      {Object.entries(nodeCategories).map(([categoryName, categoryData]) => (
        <div key={categoryName} style={{ marginBottom: '16px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              marginBottom: '8px',
              userSelect: 'none'
            }}
            onClick={() => toggleCategory(categoryName)}
          >
            <h4 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#495057'
            }}>
              {categoryName}
            </h4>
            <span style={{
              fontSize: '12px',
              transform: expandedCategories[categoryName] ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: '#6c757d'
            }}>
              ▶
            </span>
          </div>
          
          {expandedCategories[categoryName] && (
            <div style={{ paddingLeft: '8px' }}>
              <div className="sidebar-description">
                {categoryData.description}
              </div>
              
              {categoryData.nodes.map(nodeType => (
                <div 
                  key={nodeType}
                  className={getNodeClass(categoryName)}
                  draggable
                  style={{
                    margin: '4px 0',
                    padding: '8px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'grab',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    display: 'block',
                    color: '#212529',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    const currentBg = window.getComputedStyle(e.target).backgroundColor;
                    const currentBorder = window.getComputedStyle(e.target).borderLeftColor;
                    e.target.style.backgroundColor = currentBg;
                    e.target.style.borderColor = '#78A083';
                    e.target.style.borderLeftColor = currentBorder;
                    e.target.style.transform = 'translateX(4px)';
                    e.target.style.color = '#212529';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                    e.target.style.transform = 'translateX(0px)';
                    e.target.style.color = '#212529';
                    e.target.style.boxShadow = 'none';
                  }}
                  onDragStart={(e) => {
                    e.target.style.cursor = 'grabbing';
                    onDragStart(e, nodeType);
                  }}
                  onDragEnd={(e) => {
                    e.target.style.cursor = 'grab';
                  }}
                >
                  {getNodeDisplayName(nodeType)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
};