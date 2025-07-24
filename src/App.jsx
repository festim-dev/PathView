import React, { useState, useCallback, useEffect } from 'react';
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

// Defining initial nodes and edges. In the data section, we have label, but also parameters specific to the node.
const initialNodes = [];
const initialEdges = [];

// Main App component
export default function App() {
  // State management for nodes and edges: adds the initial nodes and edges to the graph and handles node selection
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');
  const [simulationResults, setSimulationResults] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [nodeCounter, setNodeCounter] = useState(1);

  // Function to save a graph
  const saveGraph = async () => {
    const filename = prompt("Your file will be saved in the saved_graphs folder. Enter a name for your file:");
    // if user cancels the prompt, filename will be null
    if (!filename) {
      alert("Save cancelled.");
      return;
    }
    const graphData = {
      nodes,
      edges,
      nodeCounter
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
      setNodeCounter(nodeCounter ?? loadedNodes.length);
    } catch (error) {
      console.error('Error loading graph:', error);
    }
  };
  // Allows user to clear user inputs and go back to default settings
  const resetGraph = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNode(null);
    setNodeCounter(0);
  };
  // Allows user to save to python script
  const saveToPython = async () => {
    try {
      const graphData = {
        nodes,
        edges,
        nodeCounter
      };

      const response = await fetch('http://localhost:8000/convert-to-python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph: graphData }),
      });

      const result = await response.json();

      if (result.success) {
        // Create a downloadable file with the generated Python script
        const blob = new Blob([result.script], { type: 'text/python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated_fuel_cycle_script.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Python script generated and downloaded successfully!');
      } else {
        alert(`Error generating Python script: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate Python script. Make sure the backend is running.');
    }
  };
  // Function to run pathsim simulation
  const runPathsim = async () => {
    try {
      const graphData = {
        nodes,
        edges
      };

      const response = await fetch('http://localhost:8000/run-pathsim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph: graphData }),
      });

      const result = await response.json();

      if (result.success) {
        // Store results and switch to results tab
        setSimulationResults(result.plot);
        setActiveTab('results');
        alert('Pathsim simulation completed successfully! Check the Results tab.');
      } else {
        alert(`Error running Pathsim simulation: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to run Pathsim simulation. Make sure the backend is running.');
    }
  };
  //When user connects two nodes by dragging, creates an edge according to the styles in our makeEdge function, default weight 1/n
  const onConnect = useCallback(
    (params) => {
      const outgoingEdgesFromSource = edges.filter(e => e.source === params.source);
      const newOutgoingCount = outgoingEdgesFromSource.length + 1;
      const defaultWeight = 1 / newOutgoingCount;

      // Update existing outgoing edges to divide up the new weight
      const updatedEdges = edges.map((e) =>
        e.source === params.source
          ? {
            ...e,
            data: { ...e.data, weight: defaultWeight },
          }
          : e
      );
      const newEdge = makeEdge({
        id: `e${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        weight: defaultWeight,
      });

      setEdges([...updatedEdges, newEdge]);
    },
    [edges, setEdges]
  );
  // Function that when we click on a node, sets that node as the selected node
  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null); // Clear selected edge when selecting a node
    // Reset all edge styles when selecting a node
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...e.style,
          strokeWidth: 2,
          stroke: '#ECDFCC',
        },
        markerEnd: {
          ...e.markerEnd,
          color: '#ECDFCC',
        },
      }))
    );
  };
  // Function that when we click on an edge, sets that edge as the selected edge
  const onEdgeClick = (event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null); // Clear selected node when selecting an edge
    // Update edge styles to highlight the selected edge
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...e.style,
          strokeWidth: e.id === edge.id ? 3 : 2,
          stroke: e.id === edge.id ? '#ffd700' : '#ECDFCC',
        },
        markerEnd: {
          ...e.markerEnd,
          color: e.id === edge.id ? '#ffd700' : '#ECDFCC',
        },
      }))
    );
  };
  // Function to deselect everything when clicking on the background
  const onPaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    // Reset all edge styles when deselecting
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...e.style,
          strokeWidth: 2,
          stroke: '#ECDFCC',
        },
        markerEnd: {
          ...e.markerEnd,
          color: '#ECDFCC',
        },
      }))
    );
  };
  // Function to add a new node to the graph
  const addNode = () => {
    const newNodeId = nodeCounter.toString();
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: { x: 200 + nodes.length * 50, y: 200 },
      data: { label: `Node ${newNodeId}`, residence_time: '', source_term: '', initial_value: '' },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeCounter((count) => count + 1);
  };
  // Function to delete the selected node
  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
      );
      setSelectedNode(null);
    }
  };
  // Function to delete the selected edge
  const deleteSelectedEdge = () => {
    if (selectedEdge) {
      setEdges((eds) => {
        const filteredEdges = eds.filter((edge) => edge.id !== selectedEdge.id);
        // Reset styles for remaining edges
        return filteredEdges.map((e) => ({
          ...e,
          style: {
            ...e.style,
            strokeWidth: 2,
            stroke: '#ECDFCC',
          },
          markerEnd: {
            ...e.markerEnd,
            color: '#ECDFCC',
          },
        }));
      });
      setSelectedEdge(null);
    }
  };
  // Keyboard event handler for deleting selected items
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger deletion if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEdge) {
          deleteSelectedEdge();
        } else if (selectedNode) {
          deleteSelectedNode();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEdge, selectedNode]);

  const computeOutput = async (node) => {
    const params = { ...node.data };
    delete params.label;
    delete params.output;

    // Finds incoming nodes
    const incomingNodeIds = edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);

    // Collects outputs of incoming nodes by iterating through edges
    const incomingOutputs = incomingEdges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const output = sourceNode?.data?.output;
      // If output is null or undefined, returns 0
      if (output === null || output === undefined) return 0;

      // Collects weight from the edge data and multiples output by that
      const weight = edge.data?.weight;
      if (weight != null) {
        return output * weight;
      }
    });

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
      {/* Tab Navigation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: '#2c2c2c',
        display: 'flex',
        alignItems: 'center',
        zIndex: 15,
        borderBottom: '1px solid #ccc'
      }}>
        <button
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: activeTab === 'graph' ? '#78A083' : '#444',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('graph')}
        >
          Graph Editor
        </button>
        <button
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: activeTab === 'results' ? '#78A083' : '#444',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {/* Graph Editor Tab */}
      {activeTab === 'graph' && (
        <div style={{ width: '100%', height: '100%', paddingTop: '50px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
            <button
              style={{
                position: 'absolute',
                left: 20,
                top: 70,
                zIndex: 10,
                padding: '8px 12px',
                backgroundColor: selectedEdge ? '#e74c3c' : '#cccccc',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: selectedEdge ? 'pointer' : 'not-allowed',
              }}
              onClick={deleteSelectedEdge}
              disabled={!selectedEdge}
            >
              Delete Edge
            </button>
            <button
              style={{
                position: 'absolute',
                left: 20,
                top: 120,
                zIndex: 10,
                padding: '8px 12px',
                backgroundColor: selectedNode ? '#e74c3c' : '#cccccc',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: selectedNode ? 'pointer' : 'not-allowed',
              }}
              onClick={deleteSelectedNode}
              disabled={!selectedNode}
            >
              Delete Node
            </button>
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
            <button
              style={{
                position: 'absolute',
                right: 20,
                top: 80,
                zIndex: 10,
                padding: '8px 12px',
                backgroundColor: '#78A083',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
              onClick={saveToPython}
            >
              Save to <br />Python
            </button>
            <button
              style={{
                position: 'absolute',
                right: 20,
                top: 150,
                zIndex: 10,
                padding: '8px 12px',
                backgroundColor: '#78A083',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
              onClick={runPathsim}
            >
              Run
            </button>
          </ReactFlow>
          {selectedNode && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 50,
                height: 'calc(100vh - 50px)',
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

                      }}

                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </div>
                ))}
              {edges
                .filter((edge) => edge.source === selectedNode.id)
                .map((edge) => {
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  const targetLabel = targetNode?.data?.label || `Node ${edge.target}`;

                  return (
                    <div key={edge.id} style={{ marginBottom: 10 }}>
                      <label>Fraction to {targetLabel}:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={edge.data?.weight ?? ''}
                        onChange={(e) => {
                          const newWeight = parseFloat(e.target.value);

                          if (newWeight > 1) {
                            alert('Please enter a value between 0 and 1.');
                          } else {
                            setEdges((eds) =>
                              eds.map((ed) =>
                                ed.id === edge.id
                                  ? { ...ed, data: { ...ed.data, weight: isNaN(newWeight) ? null : newWeight } }
                                  : ed
                              )
                            );
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>
                  );
                })}
              {(() => {
                const outgoingEdges = edges.filter(e => e.source === selectedNode.id);
                const totalWeight = outgoingEdges.reduce((sum, e) => sum + (e.data?.weight ?? 0), 0);

                if (outgoingEdges.length > 0 && totalWeight !== 1) {
                  return (
                    <div style={{ color: 'red', fontSize: '0.85em', marginTop: 10 }}>
                      Warning: f values should add up to 1 (currently {totalWeight.toFixed(2)})
                    </div>
                  );
                }
                
                return null;
              })()}
              <br />
              <button
                style={{ marginTop: 10 }}
                onClick={() => setSelectedNode(null)}
              >
                Close
              </button>
            </div>
          )}
          {selectedEdge && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 20,
                height: '100vh',
                width: '300px',
                background: '#2c2c54',
                color: '#ffffff',
                borderLeft: '1px solid #ccc',
                padding: '20px',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
                zIndex: 10,
              }}
            >
              <h3>Selected Edge</h3>
              <div style={{ marginBottom: '10px' }}>
                <strong>ID:</strong> {selectedEdge.id}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Source:</strong> {selectedEdge.source}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Target:</strong> {selectedEdge.target}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Type:</strong> {selectedEdge.type}
              </div>

              <br />
              <button
                style={{
                  marginTop: 10,
                  marginRight: 10,
                  padding: '8px 12px',
                  backgroundColor: '#78A083',
                  color: 'white',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedEdge(null)}
              >
                Close
              </button>
              <button
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
                onClick={deleteSelectedEdge}
              >
                Delete Edge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div style={{
          width: '100%',
          height: '100%',
          paddingTop: '50px',
          backgroundColor: '#f5f5f5',
          overflow: 'auto',
        }}>
          <div style={{
            padding: '20px',
            textAlign: 'center',
          }}>
            <h1 style={{ color: '#333', marginBottom: '20px' }}>
              Pathsim Simulation Results
            </h1>
            {simulationResults ? (
              <img
                src={`data:image/png;base64,${simulationResults}`}
                alt="Simulation Plot"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: '1px solid #ccc',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  borderRadius: '5px',
                }}
              />
            ) : (
              <p style={{ color: '#666', fontSize: '18px' }}>
                No simulation results yet. Run a simulation from the Graph Editor tab to see results here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}