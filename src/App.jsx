import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';


// Importing CustomNode component
import CustomNode from './CustomNode';
import { makeEdge } from './CustomEdge';

// Add CustomNode as a node type for this script
const nodeTypes = {
  custom: CustomNode,
};

// Defining initial nodes. In the data section, we have label, but also parameters specific to the node.
const initialNodes = [
  // { id: '1', type: 'custom', position: { x: 300, y: 100 }, data: { label: 'Storage', a: '', b: '', output: null } },
  // { id: '2', type: 'custom', position: { x: 500, y: 100 }, data: { label: 'Plasma', c: '', output: null } },
  // { id: '3', type: 'custom', position: { x: 300, y: 250 }, data: { label: 'Tritium Extraction System', a: '', b: '', output: null } },
  // { id: '4', type: 'custom', position: { x: 500, y: 250 }, data: { label: 'Breeding Blanket', a: '', b: '', output: null } },
];

// Defining initial edges
const initialEdges = [
  // makeEdge({ id: 'e1-2', source: '1', target: '2' }),
  // makeEdge({ id: 'e3-1', source: '3', target: '1' }),
  // makeEdge({ id: 'e4-3', source: '4', target: '3' }),
  // makeEdge({ id: 'e2-4', source: '2', target: '4' }),
];

// Main App component
export default function App() {
  // State management for nodes and edges: adds the initial nodes and edges to the graph and handles node selection
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  // Function to save a graph
  const saveGraph = async () => {
    const filename = prompt("Your file will be saved in the saved_graphs folder. Enter a name for your file:") || "file_1";

    const graphData = {
      nodes,
      edges,
    };

    try {
      const response = await fetch('http://localhost:8000/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          graph: graphData,
        }),
      });

      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error saving graph:', error);
    }
  };
  // Function to load a saved graph
  const loadGraph = async () => {
    const filename = prompt("Enter the name of a file from the saved_graphs folder to load:");
    if (!filename) return;

    try {
      const response = await fetch('http://localhost:8000/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        alert("Failed to load file.");
        return;
      }

      const { nodes: loadedNodes, edges: loadedEdges } = await response.json();
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setSelectedNode(null);
    } catch (error) {
      console.error('Error loading graph:', error);
    }
  };

  // Allows user to clear user inputs and go back to default settings
  const resetGraph = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNode(null);
  };

  // When user connects two nodes by dragging, creates an edge according to the styles in our makeEdge function
  const onConnect = useCallback(
    (params) => {
      const newEdge = makeEdge({
        id: `e${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
      });
      setEdges((eds) => [...eds, newEdge]);
    },
    [setEdges]
  );

  // Function that when we click on a node, sets that node as the selected node
  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };
  // Function to add a new node to the graph
  const addNode = () => {
    const newNodeId = (nodes.length + 1).toString();
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: { x: 200 + nodes.length * 50, y: 200 },
      data: { label: `Node ${newNodeId}`, residence_time: '', source_term: '', initial_value: '' },
    };
    setNodes((nds) => [...nds, newNode]);
  };


  const computeOutput = async (node) => {
    const params = { ...node.data };
    delete params.label;
    delete params.output;

    // Finds incoming nodes
    const incomingNodeIds = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);
    // Outputs of incoming nodes
    const incomingOutputs = nodes
      .filter((n) => incomingNodeIds.includes(n.id))
      .map((n) => n.data.output)
      .filter((output) => output !== null); // Ignores nonexistent outputs

    try {
      const response = await fetch('http://localhost:8000/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: node.id,
          params,
          incomingOutputs,
        }),
      });

      const result = await response.json();

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, output: result.output } }
            : n
        )
      );
    } catch (error) {
      console.error('Error computing output:', error);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        <button
          style={{
            position: 'absolute',
            left: 20,
            top: 20,
            zIndex: 10,
            padding: '8px 12px',
            backgroundColor: '#78A083',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={addNode}
        >
          Add Node
        </button>
        <button
          style={{
            position: 'absolute',
            right: 20,
            top: 20,
            zIndex: 10,
            padding: '8px 12px',
            backgroundColor: '#78A083',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={saveGraph}
        >
          Save File
        </button>
        <button
          style={{
            position: 'absolute',
            right: 140,
            top: 20,
            zIndex: 10,
            padding: '8px 12px',
            backgroundColor: '#78A083',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={loadGraph}
        >
          Load File
        </button>
        <button
          style={{
            position: 'absolute',
            left: 130,
            top: 20,
            zIndex: 10,
            padding: '8px 12px',
            backgroundColor: '#78A083',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={resetGraph}
        >
          Reset Graph
        </button>
      </ReactFlow>
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100vh',
            width: '300px',
            background: '#1e1e2f',
            color: '#ffffff',
            borderLeft: '1px solid #ccc',
            padding: '20px',
            boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
            zIndex: 10,
          }}
        >
          <h3>{selectedNode.data.label}</h3>
          {Object.entries(selectedNode.data)
            .filter(([key]) => key !== 'output')
            .map(([key, value]) => (
              <div key={key} style={{ marginBottom: '10px' }}>
                <label>{key}:</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const updatedNode = {
                      ...selectedNode,
                      data: { ...selectedNode.data, [key]: newValue },
                    };

                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id ? updatedNode : node
                      )
                    );
                    setSelectedNode(updatedNode);

                    computeOutput(updatedNode); // Trigger output computation (to backend)
                  }}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            ))}

          <br />
          <button
            style={{ marginTop: 10 }}
            onClick={() => setSelectedNode(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );

}



