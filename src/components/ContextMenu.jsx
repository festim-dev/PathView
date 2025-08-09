import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
 
export default function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onClick,
  onDuplicate,
  onAddInput,
  onAddOutput,
  ...props
}) {
  const { setNodes, setEdges } = useReactFlow();
  
  const duplicateNode = useCallback(() => {
    onDuplicate(id);
  }, [id, onDuplicate]);
 
  const deleteNode = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    onClick && onClick(); // Close menu after action
  }, [id, setNodes, setEdges, onClick]);
 
  const addInput = useCallback(() => {
    onAddInput && onAddInput(id);
    onClick && onClick(); // Close menu after action
  }, [id, onAddInput, onClick]);

  const addOutput = useCallback(() => {
    onAddOutput && onAddOutput(id);
    onClick && onClick(); // Close menu after action
  }, [id, onAddOutput, onClick]);

  return (
    <div
      style={{ top, left, right, bottom }}
      className="context-menu"
      {...props}
    >
      <p style={{ margin: '0.5em' }}>
        <small>node: {id}</small>
      </p>
      <button onClick={duplicateNode}>duplicate</button>
      <button onClick={deleteNode}>delete</button>
      <button onClick={addInput}>add input</button>
      <button onClick={addOutput}>add output</button>
    </div>
  );
}