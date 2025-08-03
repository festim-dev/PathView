// * Imports *
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import Plot from 'react-plotly.js';
import { getApiEndpoint } from './config.js';
import Sidebar from './Sidebar';
import { DnDProvider, useDnD } from './DnDContext.jsx';
import ContextMenu from './ContextMenu.jsx';

// Importing node components
import { ProcessNode, ProcessNodeHorizontal } from './ProcessNode';
import DelayNode from './DelayNode';
import SourceNode from './ConstantNode';
import { AmplifierNode, AmplifierNodeReverse } from './AmplifierNode';
import IntegratorNode from './IntegratorNode';
import AdderNode from './AdderNode';
import ScopeNode from './ScopeNode';
import StepSourceNode from './StepSourceNode';
import {createFunctionNode} from './FunctionNode';
import DefaultNode from './DefaultNode';
import { makeEdge } from './CustomEdge';
import MultiplierNode from './MultiplierNode';
import { Splitter2Node, Splitter3Node } from './Splitters';
import BubblerNode from './BubblerNode';
import WallNode from './WallNode';

// * Declaring variables *

// Add nodes as a node type for this script
const nodeTypes = {
  process: ProcessNode,
  process_horizontal: ProcessNodeHorizontal,
  delay: DelayNode,
  constant: SourceNode,
  source: SourceNode,
  stepsource: StepSourceNode,
  pulsesource: SourceNode,
  amplifier: AmplifierNode,
  amplifier_reverse: AmplifierNodeReverse,
  integrator: IntegratorNode,
  adder: AdderNode,
  multiplier: MultiplierNode,
  scope: ScopeNode,
  function: createFunctionNode(1, 1), // Default FunctionNode with 1 input and 1 output
  function2to2: createFunctionNode(2, 2), // FunctionNode with 2 inputs and 2 outputs
  rng: DefaultNode,
  pid: DefaultNode,
  splitter2: Splitter2Node,
  splitter3: Splitter3Node,
  wall: WallNode,
  bubbler: BubblerNode,
  white_noise: SourceNode,
  pink_noise: SourceNode,
};

// Defining initial nodes and edges. In the data section, we have label, but also parameters specific to the node.
const initialNodes = [];
const initialEdges = [];

// Setting up id for Drag and Drop
let id = 0;
const getId = () => `dndnode_${id++}`;

// For Drag and Drop functionality
const DnDFlow = () => {
  // State management for nodes and edges: adds the initial nodes and edges to the graph and handles node selection
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');
  const [simulationResults, setSimulationResults] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [nodeCounter, setNodeCounter] = useState(1);
  const [menu, setMenu] = useState(null);
  const [copiedNode, setCopiedNode] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const ref = useRef(null);
  const [csvData, setCsvData] = useState(null);
  const reactFlowWrapper = useRef(null);
  // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  // const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  // const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };


  // Solver parameters state
  const [solverParams, setSolverParams] = useState({
    dt: '0.01',
    dt_min: '1e-6',
    dt_max: '1.0',
    Solver: 'SSPRK22',
    tolerance_fpi: '1e-6',
    iterations_max: '100',
    log: 'true',
    simulation_duration: '50.0',
    extra_params: '{}'
  });

  // Global variables state
  const [globalVariables, setGlobalVariables] = useState([]);
  const [defaultValues, setDefaultValues] = useState({});
  const [nodeDocumentation, setNodeDocumentation] = useState({});
  const [isDocumentationExpanded, setIsDocumentationExpanded] = useState(false);

  // Function to fetch default values for a node type (with caching)
  const fetchDefaultValues = async (nodeType) => {
    // Check if we already have cached values for this node type
    if (defaultValues[nodeType]) {
      return defaultValues[nodeType];
    }

    try {
      const response = await fetch(getApiEndpoint(`/default-values/${nodeType}`));
      if (response.ok) {
        const defaults = await response.json();
        // Cache the values
        setDefaultValues(prev => ({
          ...prev,
          [nodeType]: defaults
        }));
        return defaults;
      } else {
        console.error('Failed to fetch default values');
        return {};
      }
    } catch (error) {
      console.error('Error fetching default values:', error);
      return {};
    }
  };

  // Function to fetch documentation for a node type
  const fetchNodeDocumentation = async (nodeType) => {
    try {
      const response = await fetch(getApiEndpoint(`/get-docs/${nodeType}`));
      if (response.ok) {
        const result = await response.json();
        return {
          html: result.html || result.docstring || 'No documentation available for this node type.',
          text: result.docstring || 'No documentation available for this node type.'
        };
      } else {
        console.error('Failed to fetch documentation');
        return {
          html: '<p>Failed to load documentation.</p>',
          text: 'Failed to load documentation.'
        };
      }
    } catch (error) {
      console.error('Error fetching documentation:', error);
      return {
        html: '<p>Error loading documentation.</p>',
        text: 'Error loading documentation.'
      };
    }
  };

  // Function to preload all default values at startup
  const preloadDefaultValues = async () => {
    const availableTypes = Object.keys(nodeTypes);
    const promises = availableTypes.map(async (nodeType) => {
      try {
        const response = await fetch(getApiEndpoint(`/default-values/${nodeType}`));
        if (response.ok) {
          const defaults = await response.json();
          return { nodeType, defaults };
        }
      } catch (error) {
        console.warn(`Failed to preload defaults for ${nodeType}:`, error);
      }
      return { nodeType, defaults: {} };
    });

    const results = await Promise.all(promises);
    const defaultValuesCache = {};
    results.forEach(({ nodeType, defaults }) => {
      defaultValuesCache[nodeType] = defaults;
    });

    setDefaultValues(defaultValuesCache);
  };

  // Preload all default values when component mounts
  useEffect(() => {
    preloadDefaultValues();
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      // check if the dropped element is valid
      if (!type) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNodeId = nodeCounter.toString();

      // Fetch default values for this node type
      let defaults = {};

      try {
        defaults = await fetchDefaultValues(type);
      } catch (error) {
        console.warn(`Failed to fetch default values for ${type}, using empty defaults:`, error);
        defaults = {};
      }

      // Create node data with label and initialize all expected fields as empty strings
      let nodeData = { label: `${type} ${newNodeId}` };

      // Initialize all expected parameters as empty strings
      Object.keys(defaults).forEach(key => {
        nodeData[key] = '';
      });

      const newNode = {
        id: newNodeId,
        type: type,
        position: position,
        data: nodeData,
      };

      setNodes((nds) => [...nds, newNode]);
      setNodeCounter((count) => count + 1);
    },
    [screenToFlowPosition, type, nodeCounter, fetchDefaultValues, setDefaultValues, setNodes, setNodeCounter],
  );

  // Function to save a graph to computer with "Save As" dialog
  const saveGraph = async () => {
    const graphData = {
      nodes,
      edges,
      nodeCounter,
      solverParams,
      globalVariables
    };

    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
      try {
        // Modern approach: Use File System Access API for proper "Save As" dialog
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'fuel-cycle-graph.json',
          types: [{
            description: 'JSON files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });

        // Create a writable stream and write the data
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(graphData, null, 2));
        await writable.close();

        // Success message
        alert('Graph saved successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error saving file:', error);
          alert('Failed to save file.');
        }
        // User cancelled the dialog - no error message needed
      }
    } else {
      // Fallback for browsers (like Firefox and Safari) that don't support File System Access API
      const blob = new Blob([JSON.stringify(graphData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fuel-cycle-graph.json';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Graph downloaded successfully!');
    }
  };

  // Function to load a saved graph from computer
  const loadGraph = async () => {
    // Check if File System Access API is supported
    if ('showOpenFilePicker' in window) {
      try {
        // Modern approach: Use File System Access API
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON files',
            accept: {
              'application/json': ['.json']
            }
          }],
          multiple: false
        });

        const file = await fileHandle.getFile();
        const text = await file.text();

        try {
          const graphData = JSON.parse(text);

          // Validate that it's a valid graph file
          if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
            alert("Invalid file format. Please select a valid graph JSON file.");
            return;
          }

          // Load the graph data
          const { nodes: loadedNodes, edges: loadedEdges, nodeCounter: loadedNodeCounter, solverParams: loadedSolverParams, globalVariables: loadedGlobalVariables } = graphData;
          setNodes(loadedNodes || []);
          setEdges(loadedEdges || []);
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
            simulation_duration: '50.0',
            extra_params: '{}'
          });
          setGlobalVariables(loadedGlobalVariables ?? []);

          alert('Graph loaded successfully!');
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('Error reading file. Please make sure it\'s a valid JSON file.');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error opening file:', error);
          alert('Failed to open file.');
        }
        // User cancelled the dialog - no error message needed
      }
    } else {
      // Fallback for browsers that don't support File System Access API
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';

      fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const graphData = JSON.parse(e.target.result);

            if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
              alert("Invalid file format. Please select a valid graph JSON file.");
              return;
            }

            const { nodes: loadedNodes, edges: loadedEdges, nodeCounter: loadedNodeCounter, solverParams: loadedSolverParams, globalVariables: loadedGlobalVariables } = graphData;
            setNodes(loadedNodes || []);
            setEdges(loadedEdges || []);
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
              simulation_duration: '50.0',
              extra_params: '{}'
            });
            setGlobalVariables(loadedGlobalVariables ?? []);

            alert('Graph loaded successfully!');
          } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error reading file. Please make sure it\'s a valid JSON file.');
          }
        };

        reader.readAsText(file);
        document.body.removeChild(fileInput);
      };

      document.body.appendChild(fileInput);
      fileInput.click();
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
      simulation_duration: '50.0',
      extra_params: '{}'
    });
    setGlobalVariables([]);
  };
  const downloadCsv = async () => {
    if (!csvData) return;

    const { time, series } = csvData;
    const labels = Object.keys(series);
    const header = ["time", ...labels].join(",");
    const rows = [header];

    time.forEach((t, i) => {
      const row = [t];
      for (const label of labels) {
        const val = series[label][i] ?? "NaN";
        row.push(val);
      }
      rows.push(row.join(","));
    });

    const csvString = rows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const filename = `simulation_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

    try {
      if ("showSaveFilePicker" in window) {
        const options = {
          suggestedName: filename,
          types: [{
            description: "CSV File",
            accept: { "text/csv": [".csv"] }
          }]
        };

        const handle = await window.showSaveFilePicker(options);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        throw new Error("showSaveFilePicker not supported");
      }
    } catch (err) {
      console.warn("Falling back to automatic download:", err);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
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

      const response = await fetch(getApiEndpoint('/convert-to-python'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph: graphData }),
      });

      const result = await response.json();

      if (result.success) {
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
          try {
            // Modern approach: Use File System Access API for proper "Save As" dialog
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: 'fuel_cycle_script.py',
              types: [{
                description: 'Python files',
                accept: {
                  'text/x-python': ['.py']
                }
              }]
            });

            // Create a writable stream and write the Python script
            const writable = await fileHandle.createWritable();
            await writable.write(result.script);
            await writable.close();

            alert('Python script generated and saved successfully!');
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Error saving Python file:', error);
              alert('Failed to save Python script.');
            }
            // User cancelled the dialog - no error message needed
          }
        } else {
          // Fallback for browsers (Firefox, Safari) that don't support File System Access API
          const blob = new Blob([result.script], { type: 'text/x-python' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'fuel_cycle_script.py';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          alert('Python script generated and downloaded to your default downloads folder!');
        }
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

      const response = await fetch(getApiEndpoint('/run-pathsim'), {
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
        setCsvData(result.csv_data);
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
  const onNodeClick = async (event, node) => {
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

    // Fetch default values and documentation for this node type
    if (node.type && !defaultValues[node.type]) {
      const defaults = await fetchDefaultValues(node.type);
      setDefaultValues(prev => ({ ...prev, [node.type]: defaults }));
    }

    if (node.type && !nodeDocumentation[node.type]) {
      const docs = await fetchNodeDocumentation(node.type);
      setNodeDocumentation(prev => ({ ...prev, [node.type]: docs }));
    }
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
    setMenu(null); // Close context menu when clicking on pane
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
  const addNode = async () => {
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
    
    // Fetch default values and documentation for this node type
    const defaults = await fetchDefaultValues(selectedType);
    const docs = await fetchNodeDocumentation(selectedType);
    
    // Store default values and documentation for this node type
    setDefaultValues(prev => ({
      ...prev,
      [selectedType]: defaults
    }));
    
    setNodeDocumentation(prev => ({
      ...prev,
      [selectedType]: docs
    }));
    
    // Create node data with label and initialize all expected fields as empty strings
    let nodeData = { label: `${selectedType} ${newNodeId}` };

    // Initialize all expected parameters as empty strings
    Object.keys(defaults).forEach(key => {
      nodeData[key] = '';
    });

    const newNode = {
      id: newNodeId,
      type: selectedType,
      position: { x: 200 + nodes.length * 50, y: 200 },
      data: nodeData,
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeCounter((count) => count + 1);
  };

  // Function to pop context menu when right-clicking on a node
  const onNodeContextMenu = useCallback(
    (event, node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenu],
  );

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

  // Function to duplicate a node
  const duplicateNode = useCallback((nodeId, options = {}) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNodeId = nodeCounter.toString();

    // Calculate position based on source (context menu vs keyboard)
    let position;
    if (options.fromKeyboard) {
      // For keyboard shortcuts, place the duplicate at a more visible offset
      position = {
        x: node.position.x + 100,
        y: node.position.y + 100,
      };
    } else {
      // For context menu, use smaller offset
      position = {
        x: node.position.x + 50,
        y: node.position.y + 50,
      };
    }

    const newNode = {
      ...node,
      selected: false,
      dragging: false,
      id: newNodeId,
      position,
      data: {
        ...node.data,
        label: node.data.label ? node.data.label.replace(node.id, newNodeId) : `${node.type} ${newNodeId}`
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeCounter((count) => count + 1);
    setMenu(null); // Close the context menu
  }, [nodes, nodeCounter, setNodeCounter, setNodes, setMenu]);


  // Keyboard event handler for deleting selected items
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger deletion if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Ctrl+C (copy)
      if (event.ctrlKey && event.key === 'c' && selectedNode) {
        event.preventDefault();
        setCopiedNode(selectedNode);
        setCopyFeedback(`Copied: ${selectedNode.data.label || selectedNode.id}`);

        // Clear feedback after 2 seconds
        setTimeout(() => {
          setCopyFeedback('');
        }, 2000);

        console.log('Node copied:', selectedNode.id);
        return;
      }

      // Handle Ctrl+V (paste)
      if (event.ctrlKey && event.key === 'v' && copiedNode) {
        event.preventDefault();
        duplicateNode(copiedNode.id, { fromKeyboard: true });
        return;
      }

      // Handle Ctrl+D (duplicate selected node directly)
      if (event.ctrlKey && event.key === 'd' && selectedNode) {
        event.preventDefault();
        duplicateNode(selectedNode.id, { fromKeyboard: true });
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
  }, [selectedEdge, selectedNode, copiedNode, duplicateNode, setCopyFeedback]);
  
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Navigation */}
      <div style={{
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
        <div style={{
          display: 'flex', flex: 1,
          height: 'calc(100vh - 50px)', // Subtract the tab bar height
          paddingTop: '50px',
          overflow: 'hidden'}}>
          {/* Sidebar */}
          <div style={{
            width: '250px',
            backgroundColor: '#1e1e2f',
            borderRight: '1px solid #ccc',
            padding: '20px',
            overflowY: 'auto'
          }}>
            <Sidebar />
          </div>
          
          {/* Main Graph Area */}
          <div className="dndflow" style={{ flex: 1, position: 'relative' }}>
            <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
              <ReactFlow
                ref={ref}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
                nodeTypes={nodeTypes}
                onDrop={onDrop}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                fitView
              >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />

                {menu && <ContextMenu onClick={onPaneClick} onDuplicate={duplicateNode} {...menu} />}
                {copyFeedback && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#78A083',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: 4,
                      zIndex: 1000,
                      fontSize: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    {copyFeedback}
                  </div>
                )}
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


                <div
                  style={{
                    position: 'absolute',
                    bottom: '50%',
                    right: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.31)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontSize: '12px',
                    zIndex: 10,
                    maxWidth: '200px',
                  }}
                >
                  <strong>Keyboard Shortcuts:</strong><br />
                  Ctrl+C: Copy selected node<br />
                  Ctrl+V: Paste copied node<br />
                  Ctrl+D: Duplicate selected node<br />
                  Del/Backspace: Delete selection<br />
                  Right-click: Context menu
                </div>
              </ReactFlow>
            </div>
          </div>
          {selectedNode && (
            <div
              className="sidebar-scrollable"
              style={{
                position: 'absolute',
                right: 0,
                top: 50,
                height: 'calc(100vh - 50px)',
                width: '300px',
                background: '#1e1e2f',
                color: '#ffffff',
                borderLeft: '1px solid #ccc',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
                zIndex: 10,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              <div style={{ padding: '20px' }}>
                <h3>{selectedNode.data.label}</h3>
              {(() => {
                // Get default values for this node type
                const nodeDefaults = defaultValues[selectedNode.type] || {};

                // Create a list of all possible parameters (both current data and defaults)
                const allParams = new Set([
                  ...Object.keys(selectedNode.data),
                  ...Object.keys(nodeDefaults)
                ]);

                return Array.from(allParams)
                  .map(key => {
                    const currentValue = selectedNode.data[key] || '';
                    const defaultValue = nodeDefaults[key];
                    const placeholder = defaultValue !== undefined && defaultValue !== null ?
                      String(defaultValue) : '';

                    return (
                      <div key={key} style={{ marginBottom: '10px' }}>
                        <label style={{
                          color: '#ffffff',
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '14px'
                        }}>
                          {key}:
                        </label>
                        <input
                          type="text"
                          value={currentValue}
                          placeholder={placeholder}
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
                          style={{
                            width: '100%',
                            marginTop: 4,
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            backgroundColor: '#2a2a3e',
                            color: '#ffffff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    );
                  });
              })()}

              <br />
              <button
                style={{
                  marginTop: 10,
                  padding: '8px 16px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedNode(null)}
              >
                Close
              </button>
              
              {/* Documentation Section */}
              <div style={{ 
                marginTop: '20px',
                borderTop: '1px solid #555',
                paddingTop: '15px'
              }}>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '8px 0',
                    borderRadius: '4px'
                  }}
                  onClick={() => setIsDocumentationExpanded(!isDocumentationExpanded)}
                >
                  <h4 style={{
                    color: '#ffffff',
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    Class Documentation
                  </h4>
                  <span style={{
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    transform: isDocumentationExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    userSelect: 'none'
                  }}>
                    ▶
                  </span>
                </div>
                
                {isDocumentationExpanded && (
                  <div 
                    className="documentation-content"
                    style={{
                      backgroundColor: '#2a2a3e',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      padding: '12px',
                      minHeight: '120px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      color: '#e8e8e8',
                      marginTop: '8px'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: nodeDocumentation[selectedNode.type]?.html || 'Loading documentation...'
                    }}
                  />
                )}
              </div>
              </div>
            </div>
          )}
          {selectedEdge && (
            <div
              className="sidebar-scrollable"
              style={{
                position: 'absolute',
                right: 0,
                top: 20,
                height: '100vh',
                width: '300px',
                background: '#2c2c54',
                color: '#ffffff',
                borderLeft: '1px solid #ccc',
                boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
                zIndex: 10,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              <div style={{ padding: '20px' }}>
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
            </div>
          )}
        </div>
      )}

      {/* Solver Parameters Tab */}
      {activeTab === 'solver' && (
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
                    onChange={(e) => setSolverParams({ ...solverParams, dt: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, dt_min: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, dt_max: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, Solver: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, tolerance_fpi: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, iterations_max: e.target.value })}
                    style={{
                      width: '95%',
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
                    onChange={(e) => setSolverParams({ ...solverParams, simulation_duration: e.target.value })}
                    style={{
                      width: '95%',
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
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={solverParams.log === 'true'}
                      onChange={(e) => setSolverParams({ ...solverParams, log: e.target.checked ? 'true' : 'false' })}
                      style={{
                        marginRight: '10px',
                        transform: 'scale(1.2)',
                        cursor: 'pointer'
                      }}
                    />
                    Enable Logging
                  </label>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    color: '#ffffff',
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    Extra Parameters (JSON):
                  </label>
                  <textarea
                    value={solverParams.extra_params}
                    onChange={(e) => setSolverParams({ ...solverParams, extra_params: e.target.value })}
                    style={{
                      width: '95%',
                      padding: '10px',
                      borderRadius: '5px',
                      border: '1px solid #555',
                      backgroundColor: '#1e1e2f',
                      color: '#ffffff',
                      fontSize: '14px',
                      minHeight: '80px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                    placeholder='{"tolerance_lte_abs": 1e-8, "tolerance_lte_rel": 1e-6}'
                  />
                  <div style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    marginTop: '5px',
                    fontStyle: 'italic'
                  }}>
                    Additional solver parameters as JSON dictionary (e.g., tolerances, custom settings)
                  </div>
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
                <li><strong>extra_params:</strong> Additional solver parameters as JSON dictionary (e.g., tolerance_lte_abs, tolerance_lte_rel for numerical solvers)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Global Variables Tab */}
      {activeTab === 'globals' && (
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

      {activeTab === 'results' && (
        <div style={{
          width: '100%',
          height: 'calc(100vh - 50px)',
          paddingTop: '50px',
          backgroundColor: '#f5f5f5',
          overflow: 'auto',
        }}>
          <div style={{
            padding: '20px',
            textAlign: 'center',
          }}>
            {simulationResults ? (
              <>
                <div style={{ textAlign: 'right', padding: '0 20px 10px 20px' }}>
                  <button
                    style={{
                      backgroundColor: '#78A083',
                      color: 'white',
                      border: 'none',
                      borderRadius: 5,
                      cursor: 'pointer',
                    }}
                    onClick={downloadCsv}
                  >
                    Download CSV
                  </button>
                </div>
                <Plot
                  data={JSON.parse(simulationResults).data}
                  layout={{
                    ...JSON.parse(simulationResults).layout,
                    autosize: true,
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
                  }}
                  style={{ width: '100%', height: '600px' }}
                />

              </>
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

export function App () {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow />
      </DnDProvider>
    </ReactFlowProvider>
  );
}

