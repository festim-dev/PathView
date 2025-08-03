import React from 'react';
import { useDnD } from './DnDContext';
 
export default () => {
  const [_, setType] = useDnD();
 
  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
 
  return (
    <aside>
      <div className="description">You can drag these nodes to the pane on the right.</div>
      
      {/* Source Nodes */}
      <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'constant')} draggable>
        Constant Source
      </div>
      <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'stepsource')} draggable>
        Step Source
      </div>
      
      {/* Processing Nodes */}
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'process')} draggable>
        Process Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'delay')} draggable>
        Delay Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'amplifier')} draggable>
        Amplifier
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'integrator')} draggable>
        Integrator
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'adder')} draggable>
        Adder
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'multiplier')} draggable>
        Multiplier
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'function')} draggable>
        Function
      </div>
      
      {/* Special Nodes */}
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'bubbler')} draggable>
        Bubbler
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'wall')} draggable>
        Wall
      </div>
      
      {/* Output Nodes */}
      <div className="dndnode output" onDragStart={(event) => onDragStart(event, 'scope')} draggable>
        Scope
      </div>
    </aside>
  );
};