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


// Importing node components
import ProcessNode from './ProcessNode';
import DelayNode from './DelayNode';
import SourceNode from './ConstantNode';
import AmplifierNode from './AmplifierNode';
import IntegratorNode from './IntegratorNode';
import AdderNode from './AdderNode';
import ScopeNode from './ScopeNode';
import StepSourceNode from './StepSourceNode';
import FunctionNode from './FunctionNode';
import DefaultNode from './DefaultNode';
import { makeEdge } from './CustomEdge';
import MultiplierNode from './MultiplierNode';
import { Splitter2Node, Splitter3Node } from './Splitters';

// Add nodes as a node type for this script
const nodeTypes = {
  process: ProcessNode,
  delay: DelayNode,
  constant: SourceNode,
  stepsource: StepSourceNode,
  pulsesource: SourceNode,
  amplifier: AmplifierNode,
  integrator: IntegratorNode,
  adder: AdderNode,
  multiplier: MultiplierNode,
  scope: ScopeNode,
  function: FunctionNode,
  rng: DefaultNode,
  pid: DefaultNode,
  splitter2: Splitter2Node,
  splitter3: Splitter3Node,
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
  
  // Solver parameters state
  const [solverParams, setSolverParams] = useState({
    dt: '0.01',
    dt_min: '1e-6',
    dt_max: '1.0',
    Solver: 'SSPRK22',
    tolerance_fpi: '1e-6',
    iterations_max: '100',
    log: 'true',
    simulation_duration: '50.0'
  });

  // Global variables state
  const [globalVariables, setGlobalVariables] = useState([]);

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
      nodeCounter,
      solverParams,
      globalVariables
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

      const { nodes: loadedNodes, edges: loadedEdges, nodeCounter: loadedNodeCounter, solverParams: loadedSolverParams, globalVariables: loadedGlobalVariables } = await response.json();
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setSelectedNode(null);
      setNodeCounter(loadedNodeCounter ?? loadedNodes.length);
      setSolverParams(loadedSolverParams ?? {
        dt: '0.01',
        dt_min: '1e-6',
        dt_max: '1.0',
        Solver: 'SSPRK22',
        tolerance_fpi: '1e-6',
        iterations_max: '100',
        log: 'true',
        simulation_duration: '50.0'
      });
      setGlobalVariables(loadedGlobalVariables ?? []);
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
    setSolverParams({
      dt: '0.01',
      dt_min: '1e-6',
      dt_max: '1.0',
      Solver: 'SSPRK22',
      tolerance_fpi: '1e-6',
      iterations_max: '100',
      log: 'true',
      simulation_duration: '50.0'
    });
    setGlobalVariables([]);
  };
  // Allows user to save to python script
  const saveToPython = async () => {
    try {
      const graphData = {
        nodes,
        edges,
        nodeCounter,
        solverParams,
        globalVariables
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
        edges,
        solverParams,
        globalVariables
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
  
  // Functions for managing global variables
  const isValidPythonIdentifier = (name) => {
    // Check if name is empty
    if (!name) return false;
    
    // Python identifier rules:
    // - Must start with letter or underscore
    // - Can contain letters, digits, underscores
    // - Cannot be a Python keyword
    const pythonKeywords = [
      'False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 
      'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 
      'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 
      'raise', 'return', 'try', 'while', 'with', 'yield'
    ];
    
    // Check if it's a keyword
    if (pythonKeywords.includes(name)) return false;
    
    // Check pattern: must start with letter or underscore, followed by letters, digits, or underscores
    const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return pattern.test(name);
  };

  const addGlobalVariable = () => {
    const newVariable = {
      id: Date.now().toString(),
      name: '',
      value: '',
      nameError: false
    };
    setGlobalVariables([...globalVariables, newVariable]);
  };

  const removeGlobalVariable = (id) => {
    setGlobalVariables(globalVariables.filter(variable => variable.id !== id));
  };

  const updateGlobalVariable = (id, field, value) => {
    setGlobalVariables(globalVariables.map(variable => {
      if (variable.id === id) {
        const updatedVariable = { ...variable, [field]: value };
        
        // Validate name field
        if (field === 'name') {
          updatedVariable.nameError = value !== '' && !isValidPythonIdentifier(value);
        }
        
        return updatedVariable;
      }
      return variable;
    }));
  };

  //When user connects two nodes by dragging, creates an edge according to the styles in our makeEdge function
  const onConnect = useCallback(
    (params) => {
      let edgeId = `e${params.source}-${params.target}`;

      // If sourceHandle or targetHandle is specified, append it to the edge ID
      if (params.sourceHandle) {
        edgeId += `-from_${params.sourceHandle}`;
      }
      
      if (params.targetHandle) {
        edgeId += `-to_${params.targetHandle}`;
      }
      const newEdge = makeEdge({
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });

      setEdges([...edges, newEdge]);
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
    // Get available node types from nodeTypes object
    const availableTypes = Object.keys(nodeTypes);
    
    // Create options string for the prompt
    const typeOptions = availableTypes.map((type, index) => `${index + 1}. ${type}`).join('\n');
    
    const userInput = prompt(
      `Select a node type by entering the number:\n\n${typeOptions}\n\nEnter your choice (1-${availableTypes.length}):`
    );
    
    // If user cancels the prompt
    if (!userInput) {
      return;
    }
    
    // Parse the user input
    const choiceIndex = parseInt(userInput) - 1;
    
    // Validate the choice
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= availableTypes.length) {
      alert('Invalid choice. Please enter a number between 1 and ' + availableTypes.length);
      return;
    }
    
    const selectedType = availableTypes[choiceIndex];
    const newNodeId = nodeCounter.toString();
    
    // Create appropriate data based on node type
    let nodeData = { label: `${selectedType} ${newNodeId}` };
    
    // Add type-specific default parameters
    switch (selectedType) {
      case 'process':
        nodeData = { ...nodeData, residence_time: '', source_term: '', initial_value: '' };
        break;
      case 'constant':
        nodeData = { ...nodeData, value: '' };
        break;
      case 'stepsource':
        nodeData = { ...nodeData, amplitude: '1', delay: '1' };
        break;
      case 'pulsesource':
        nodeData = { ...nodeData, amplitude: '1', T: '1', t_rise: '0.0', t_fall: '0.0', tau: '0.0', duty: '0.5' };
        break;
      case 'amplifier':
        nodeData = { ...nodeData, gain: ''};
        break;
      case 'multiplier':
        break;
      case 'integrator':
        nodeData = { ...nodeData, initial_value: '' };
        break;
      case 'adder':
        break;
      case 'scope':
        nodeData = { ...nodeData };
        break;
      case 'function':
        nodeData = { ...nodeData, expression: '' };
        break;
      case 'delay':
        nodeData = { ...nodeData, tau: '' };
        break;
      case 'rng':
        nodeData = { ...nodeData, sampling_rate: ''};
        break;
      case 'pid':
        nodeData = { ...nodeData, Kp: '', Ki: '', Kd: '', f_max: '' };
        break;
      case 'splitter2':
        nodeData = { ...nodeData, f1: '0.5', f2: '0.5' };
        break;
      case 'splitter3':
        nodeData = { ...nodeData, f1: '1/3', f2: '1/3', f3: '1/3' };
        break;
      default:
        // For any other types, just use basic data
        break;
    }
    
    const newNode = {
      id: newNodeId,
      type: selectedType,
      position: { x: 200 + nodes.length * 50, y: 200 },
      data: nodeData,
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
            backgroundColor: activeTab === 'solver' ? '#78A083' : '#444',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('solver')}
        >
          Solver Parameters
        </button>
        <button
          style={{
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: activeTab === 'globals' ? '#78A083' : '#444',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('globals')}
        >
          Global Variables
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

      {/* Solver Parameters Tab */}
      {activeTab === 'solver' && (
        <div style={{
          width: '100%',
          height: '100%',
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
              Solver Parameters
            </h1>
            <div style={{
              backgroundColor: '#2c2c54',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Time Step (dt):
                  </label>
                  <input
                    type="text"
                    value={solverParams.dt}
                    onChange={(e) => setSolverParams({...solverParams, dt: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="0.01"
                  />
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Minimum Time Step (dt_min):
                  </label>
                  <input
                    type="text"
                    value={solverParams.dt_min}
                    onChange={(e) => setSolverParams({...solverParams, dt_min: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="1e-6"
                  />
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Maximum Time Step (dt_max):
                  </label>
                  <input
                    type="text"
                    value={solverParams.dt_max}
                    onChange={(e) => setSolverParams({...solverParams, dt_max: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="1.0"
                  />
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Solver Type:
                  </label>
                  <select
                    value={solverParams.Solver}
                    onChange={(e) => setSolverParams({...solverParams, Solver: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="SSPRK22">SSPRK22</option>
                    <option value="SSPRK33">SSPRK33</option>
                    <option value="RKF21">RKF21</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    FPI Tolerance:
                  </label>
                  <input
                    type="text"
                    value={solverParams.tolerance_fpi}
                    onChange={(e) => setSolverParams({...solverParams, tolerance_fpi: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="1e-6"
                  />
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Maximum Iterations:
                  </label>
                  <input
                    type="text"
                    value={solverParams.iterations_max}
                    onChange={(e) => setSolverParams({...solverParams, iterations_max: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="100"
                  />
                </div>
                
                <div>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Simulation Duration:
                  </label>
                  <input
                    type="text"
                    value={solverParams.simulation_duration}
                    onChange={(e) => setSolverParams({...solverParams, simulation_duration: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                    placeholder="50.0"
                  />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ 
                    color: '#ffffff', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Enable Logging:
                  </label>
                  <select
                    value={solverParams.log}
                    onChange={(e) => setSolverParams({...solverParams, log: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              </div>
              
              <div style={{ 
                textAlign: 'center',
                marginTop: '30px' 
              }}>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#78A083',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginRight: '15px'
                  }}
                  onClick={() => {
                    // Reset to default values
                    setSolverParams({
                      dt: '0.01',
                      dt_min: '1e-6',
                      dt_max: '1.0',
                      Solver: 'SSPRK22',
                      tolerance_fpi: '1e-6',
                      iterations_max: '100',
                      log: 'true',
                      simulation_duration: '50.0'
                    });
                  }}
                >
                  Reset to Defaults
                </button>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  onClick={() => setActiveTab('graph')}
                >
                  Back to Graph Editor
                </button>
              </div>
            </div>
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#2c2c54',
              borderRadius: '8px',
              border: '1px solid #555'
            }}>
              <h3 style={{ color: '#ffffff', marginBottom: '15px' }}>Parameter Descriptions:</h3>
              <ul style={{ color: '#cccccc', lineHeight: '1.6' }}>
                <li><strong>dt:</strong> Base time step for simulation</li>
                <li><strong>dt_min:</strong> Minimum allowed time step</li>
                <li><strong>dt_max:</strong> Maximum allowed time step</li>
                <li><strong>Solver:</strong> Numerical integration method</li>
                <li><strong>tolerance_fpi:</strong> Tolerance for fixed point iterations</li>
                <li><strong>iterations_max:</strong> Maximum number of iterations per time step</li>
                <li><strong>simulation_duration:</strong> Total duration of the simulation (in time units)</li>
                <li><strong>log:</strong> Enable/disable logging during simulation</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Global Variables Tab */}
      {activeTab === 'globals' && (
        <div style={{
          width: '100%',
          height: '100%',
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
              Global Variables
            </h1>
            <div style={{
              backgroundColor: '#2c2c54',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }}>
              <p style={{ 
                color: '#cccccc', 
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                Define global variables that can be used in node definitions throughout your model.
              </p>
              
              {globalVariables.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#888',
                  padding: '40px 20px',
                  fontStyle: 'italic'
                }}>
                  No global variables defined. Click "Add Variable" to create one.
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  {globalVariables.map((variable) => (
                    <div key={variable.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: '15px',
                      alignItems: 'start',
                      marginBottom: '15px',
                      padding: '15px',
                      backgroundColor: '#1e1e2f',
                      borderRadius: '8px',
                      border: '1px solid #555'
                    }}>
                      <div>
                        <label style={{ 
                          color: '#ffffff', 
                          display: 'block', 
                          marginBottom: '5px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          Variable Name:
                        </label>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateGlobalVariable(variable.id, 'name', e.target.value)}
                          placeholder="variable_name"
                          style={{
                            width: '95%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: variable.nameError ? '2px solid #e74c3c' : '1px solid #666',
                            backgroundColor: '#2c2c54',
                            color: '#ffffff',
                            fontSize: '14px'
                          }}
                        />
                        {variable.nameError && (
                          <div style={{
                            color: '#e74c3c',
                            fontSize: '11px',
                            marginTop: '3px',
                            fontStyle: 'italic'
                          }}>
                            Invalid Python variable name
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ 
                          color: '#ffffff', 
                          display: 'block', 
                          marginBottom: '5px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          Value:
                        </label>
                        <input
                          type="text"
                          value={variable.value}
                          onChange={(e) => updateGlobalVariable(variable.id, 'value', e.target.value)}
                          placeholder="0.5"
                          style={{
                            width: '95%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #666',
                            backgroundColor: '#2c2c54',
                            color: '#ffffff',
                            fontSize: '14px'
                          }}
                        />
                        {/* Placeholder div to maintain alignment */}
                        <div style={{
                          height: variable.nameError ? '20px' : '0px',
                          fontSize: '11px',
                          marginTop: '3px'
                        }}>
                          {/* Empty space to match error message height */}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        paddingTop: '10px' // Align with input field (label height + margin)
                      }}>
                        <button
                          onClick={() => removeGlobalVariable(variable.id)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            minWidth: '40px'
                          }}
                          title="Remove variable"
                        >
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                marginTop: '20px'
              }}>
                <button
                  onClick={addGlobalVariable}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#78A083',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  + Add Variable
                </button>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  onClick={() => setActiveTab('graph')}
                >
                  Back to Graph Editor
                </button>
              </div>
            </div>
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#2c2c54',
              borderRadius: '8px',
              border: '1px solid #555'
            }}>
              <h3 style={{ color: '#ffffff', marginBottom: '15px' }}>Usage Instructions:</h3>
              <ul style={{ color: '#cccccc', lineHeight: '1.6' }}>
                <li><strong>Variable names</strong> must be valid Python identifiers (start with letter/underscore, contain only letters/digits/underscores)</li>
                <li><strong>Cannot use Python keywords</strong> like "if", "for", "class", "def", etc.</li>
                <li>Use meaningful names (e.g., "flow_rate", "temperature", "my_constant")</li>
                <li>Use numeric values, expressions, or references to other variables</li>
                <li>Variables can be referenced in node parameters using their exact names</li>
                <li>Variables are saved and loaded with your graph files</li>
              </ul>
            </div>
          </div>
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