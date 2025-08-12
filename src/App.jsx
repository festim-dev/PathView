// * Imports *
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles/App.css';
import Plot from 'react-plotly.js';
import { getApiEndpoint } from './config.js';
import Sidebar from './components/Sidebar';
import NodeSidebar from './components/NodeSidebar';
import { DnDProvider, useDnD } from './components/DnDContext.jsx';
import ContextMenu from './components/ContextMenu.jsx';
import EventsTab from './components/EventsTab.jsx';
import GlobalVariablesTab from './components/GlobalVariablesTab.jsx';
import { makeEdge } from './components/CustomEdge';
import { nodeTypes, nodeDynamicHandles } from './nodeConfig.js';
import LogDock from './components/LogDock.jsx';

import { createFunctionNode } from './components/nodes/FunctionNode.jsx';

// * Declaring variables *

// Default solver parameters
const DEFAULT_SOLVER_PARAMS = {
  dt: '0.01',
  dt_min: '1e-16',
  dt_max: '',
  Solver: 'SSPRK22',
  tolerance_fpi: '1e-10',
  iterations_max: '200',
  log: 'true',
  simulation_duration: '10.0',
  extra_params: '{}'
};

// Defining initial nodes and edges. In the data section, we have label, but also parameters specific to the node.
const initialNodes = [];
const initialEdges = [];

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
  const [htmlData, setHtmlData] = useState(null);
  const reactFlowWrapper = useRef(null);
  // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  // const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  // for the log dock
  const [dockOpen, setDockOpen] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const sseRef = useRef(null);
  const append = (line) => setLogLines((prev) => [...prev, line]);

  // for version information
  const [versionInfo, setVersionInfo] = useState(null);

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
  const [solverParams, setSolverParams] = useState(DEFAULT_SOLVER_PARAMS);

  // Global variables state
  const [globalVariables, setGlobalVariables] = useState([]);
  const [events, setEvents] = useState([]);

  // Python code editor state
  const [pythonCode, setPythonCode] = useState("# Define your Python variables and functions here\n# Example:\n# my_variable = 42\n# def my_function(x):\n#     return x * 2\n");

  const [defaultValues, setDefaultValues] = useState({});
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState('');
  const [nodeDocumentation, setNodeDocumentation] = useState({});
  const [isDocumentationExpanded, setIsDocumentationExpanded] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(true);

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

  // Function to fetch version information
  const fetchVersionInfo = async () => {
    try {
      const response = await fetch(getApiEndpoint('/version'));
      if (response.ok) {
        const versionData = await response.json();
        setVersionInfo(versionData);
        return versionData;
      } else {
        console.error('Failed to fetch version information');
        return null;
      }
    } catch (error) {
      console.error('Error fetching version information:', error);
      return null;
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

  // Function to preload all documentation at startup
  const preloadAllDocumentation = async () => {
    const availableTypes = Object.keys(nodeTypes);

    try {
      // Convert types array to a string (or could be sent as JSON array)
      const response = await fetch(getApiEndpoint(`/get-all-docs`));

      if (response.ok) {
        const allDocs = await response.json();
        setNodeDocumentation(allDocs);
      } else {
        console.error('Failed to preload documentation');
        // Fallback: initialize empty documentation for all types
        const documentationCache = {};
        availableTypes.forEach(nodeType => {
          documentationCache[nodeType] = {
            html: '<p>No documentation available for this node type.</p>',
            text: 'No documentation available for this node type.'
          };
        });
        setNodeDocumentation(documentationCache);
      }
    } catch (error) {
      console.error('Error preloading documentation:', error);
      // Fallback: initialize empty documentation for all types
      const documentationCache = {};
      availableTypes.forEach(nodeType => {
        documentationCache[nodeType] = {
          html: '<p>Error loading documentation.</p>',
          text: 'Error loading documentation.'
        };
      });
      setNodeDocumentation(documentationCache);
    }
  };

  // Function to preload all default values at startup
  const preloadDefaultValues = async () => {
    const availableTypes = Object.keys(nodeTypes);

    try {
      const response = await fetch(getApiEndpoint(`/default-values-all`));

      if (response.ok) {
        const allDefaults = await response.json();
        setDefaultValues(allDefaults);
      } else {
        console.error('Failed to preload default values');
        // Fallback: initialize empty defaults for all types
        const defaultValuesCache = {};
        availableTypes.forEach(nodeType => {
          defaultValuesCache[nodeType] = {};
        });
        setDefaultValues(defaultValuesCache);
      }
    } catch (error) {
      console.error('Error preloading default values:', error);
      // Fallback: initialize empty defaults for all types
      const defaultValuesCache = {};
      availableTypes.forEach(nodeType => {
        defaultValuesCache[nodeType] = {};
      });
      setDefaultValues(defaultValuesCache);
    }
  };

  // Preload all default values and documentation when component mounts
  useEffect(() => {
    preloadDefaultValues();
    preloadAllDocumentation();
    fetchVersionInfo(); // Fetch version information on component mount
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
      let nodeData = {
        label: `${type} ${newNodeId}`,
        nodeColor: '#DDE6ED' // Default node color
      };

      // if node in nodeDynamicHandles, ensure add outputCount and inputCount to data
      if (nodeDynamicHandles.includes(type)) {
        nodeData.inputCount = 1;
        nodeData.outputCount = 1;
      }

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
      globalVariables,
      events,
      pythonCode
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

          // Load the graph data and ensure nodeColor exists on all nodes
          const {
            nodes: loadedNodes,
            edges: loadedEdges,
            nodeCounter: loadedNodeCounter,
            solverParams: loadedSolverParams,
            globalVariables: loadedGlobalVariables,
            events: loadedEvents,
            pythonCode: loadedPythonCode
          } = graphData;

          // Ensure all loaded nodes have a nodeColor property
          const nodesWithColors = (loadedNodes || []).map(node => ({
            ...node,
            data: {
              ...node.data,
              nodeColor: node.data.nodeColor || '#DDE6ED'
            }
          }));

          setNodes(nodesWithColors);
          setEdges(loadedEdges || []);
          setSelectedNode(null);
          setNodeCounter(loadedNodeCounter ?? loadedNodes.length);
          setSolverParams(loadedSolverParams ?? DEFAULT_SOLVER_PARAMS);
          setGlobalVariables(loadedGlobalVariables ?? []);
          setEvents(loadedEvents ?? []);
          setPythonCode(loadedPythonCode ?? "# Define your Python variables and functions here\n# Example:\n# my_variable = 42\n# def my_function(x):\n#     return x * 2\n");
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

            const {
              nodes: loadedNodes,
              edges: loadedEdges,
              nodeCounter: loadedNodeCounter,
              solverParams: loadedSolverParams,
              globalVariables: loadedGlobalVariables,
              events: loadedEvents,
              pythonCode: loadedPythonCode
            } = graphData;

            // Ensure all loaded nodes have a nodeColor property
            const nodesWithColors = (loadedNodes || []).map(node => ({
              ...node,
              data: {
                ...node.data,
                nodeColor: node.data.nodeColor || '#DDE6ED'
              }
            }));

            setNodes(nodesWithColors);
            setEdges(loadedEdges || []);
            setSelectedNode(null);
            setNodeCounter(loadedNodeCounter ?? loadedNodes.length);
            setSolverParams(loadedSolverParams ?? DEFAULT_SOLVER_PARAMS);
            setGlobalVariables(loadedGlobalVariables ?? []);
            setEvents(loadedEvents ?? []);
            setPythonCode(loadedPythonCode ?? "# Define your Python variables and functions here\n# Example:\n# my_variable = 42\n# def my_function(x):\n#     return x * 2\n");
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
    setSolverParams(DEFAULT_SOLVER_PARAMS);
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

  const downloadHtml = async () => {
    const blob = new Blob([htmlData], { type: "text/html" });
    const filename = `simulation_${new Date().toISOString().replace(/[:.]/g, "-")}.html`;

    try {
      if ("showSaveFilePicker" in window) {
        const options = {
          suggestedName: filename,
          types: [{
            description: "HTML File",
            accept: { "text/html": [".html"] }
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
        globalVariables,
        pythonCode,
        events
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
    setDockOpen(true);
    setLogLines([]);

    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(getApiEndpoint('/logs/stream'));
    sseRef.current = es;

    es.addEventListener('start', () => append('log stream connected…'));
    es.onmessage = (evt) => append(evt.data);
    es.onerror = () => { append('log stream error'); es.close(); sseRef.current = null; };

    try {
      const graphData = {
        nodes,
        edges,
        solverParams,
        globalVariables,
        events,
        pythonCode
      };

      const response = await fetch(getApiEndpoint('/run-pathsim'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ graph: graphData }),
      });

      const result = await response.json();

      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

      if (result.success) {
        // Store results and switch to results tab
        setSimulationResults(result.plot);
        setCsvData(result.csv_data);
        setHtmlData(result.html);
        setActiveTab('results');
      } else {
        alert(`Error running Pathsim simulation: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to run Pathsim simulation. Make sure the backend is running. : ${error.message}`);
    }
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

  // Function to pop context menu when right-clicking on a node
  const onNodeContextMenu = useCallback(
    (event, node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Get the ReactFlow pane's bounding rectangle to calculate relative position
      const pane = ref.current.getBoundingClientRect();

      // Position the context menu directly at the click coordinates relative to the pane
      setMenu({
        id: node.id,
        top: event.clientY - pane.top,
        left: event.clientX - pane.left,
        right: false,
        bottom: false,
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
        justifyContent: 'space-between',
        zIndex: 15,
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
              backgroundColor: activeTab === 'events' ? '#78A083' : '#444',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
            onClick={() => setActiveTab('events')}
          >
            Events
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

        {/* Help Button */}
        <button
          style={{
            padding: '8px 12px',
            margin: '5px 15px 5px 5px',
            backgroundColor: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: '600',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 6px rgba(74, 144, 226, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#357ABD';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4A90E2';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 6px rgba(74, 144, 226, 0.3)';
          }}
          onClick={() => {
            // Display version information and help
            const pathsimVersion = versionInfo?.pathsim_version || 'Loading...';
            const fcsVersion = versionInfo?.pathview_version || 'Loading...';

            const message = `Help documentation coming soon!\n\n` +
              `Version Information:\n` +
              `• PathSim: ${pathsimVersion}\n` +
              `• PathView: ${fcsVersion}\n\n`;

            alert(message);
          }}
          title="Get help, documentation, and version information"
        >
          ?
        </button>
      </div>

      {/* Graph Editor Tab */}
      {activeTab === 'graph' && (
        <div style={{
          display: 'flex', flex: 1,
          height: 'calc(100vh - 50px)', // Subtract the tab bar height
          overflow: 'hidden'
        }}>
          {/* Sidebar */}
          <div style={{
            width: '250px',
            height: '100%',
            borderRight: '1px solid #ccc'
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
                  onClick={resetGraph}
                >
                  New graph
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={runPathsim}
                >
                  <span style={{ fontSize: '14px', lineHeight: '1' }}>▶</span>
                  Run
                </button>


                {showKeyboardShortcuts && (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong>Keyboard Shortcuts:</strong>
                      <button
                        onClick={() => setShowKeyboardShortcuts(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          padding: '0 0 0 8px',
                          lineHeight: '1',
                        }}
                        title="Close shortcuts panel"
                      >
                        ×
                      </button>
                    </div>
                    Ctrl+C: Copy selected node<br />
                    Ctrl+V: Paste copied node<br />
                    Ctrl+D: Duplicate selected node<br />
                    Del/Backspace: Delete selection<br />
                    Right-click: Context menu
                  </div>
                )}
              </ReactFlow>
            </div>
          </div>
          <NodeSidebar
            selectedNode={selectedNode}
            defaultValues={defaultValues}
            setNodes={setNodes}
            setSelectedNode={setSelectedNode}
            isEditingLabel={isEditingLabel}
            setIsEditingLabel={setIsEditingLabel}
            tempLabel={tempLabel}
            setTempLabel={setTempLabel}
            nodeDocumentation={nodeDocumentation}
            isDocumentationExpanded={isDocumentationExpanded}
            setIsDocumentationExpanded={setIsDocumentationExpanded}
          />
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

      {/* Events tab */}
      {activeTab === 'events' && <EventsTab events={events} setEvents={setEvents} />}

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
                    <option value="SSPRK34">SSPRK34</option>
                    <option value="RK4">RK4</option>
                    <option value="RKBS32">RKBS32</option>
                    <option value="RKCK54">RKCK54</option>
                    <option value="RKDP54">RKDP54</option>
                    <option value="RKDP87">RKDP87</option>
                    <option value="RKF21">RKF21</option>
                    <option value="RKF45">RKF45</option>
                    <option value="RKF78">RKF78</option>
                    <option value="RKV65">RKV65</option>
                    <option value="BDF">BDF</option>
                    <option value="EUF">EUF</option>
                    <option value="EUB">EUB</option>
                    <option value="GEAR21">GEAR21</option>
                    <option value="GEAR32">GEAR32</option>
                    <option value="GEAR43">GEAR43</option>
                    <option value="GEAR54">GEAR54</option>
                    <option value="GEAR52A">GEAR52A</option>
                    <option value="DIRK2">DIRK2</option>
                    <option value="DIRK3">DIRK3</option>
                    <option value="ESDIRK32">ESDIRK32</option>
                    <option value="ESDIRK4">ESDIRK4</option>
                    <option value="ESDIRK43">ESDIRK43</option>
                    <option value="ESDIRK54">ESDIRK54</option>
                    <option value="ESDIRK85">ESDIRK85</option>
                    <option value="STEADYSTATE">SteadyState</option>

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
                      dt_min: '1e-16',
                      dt_max: '',
                      Solver: 'SSPRK22',
                      tolerance_fpi: '1e-10',
                      iterations_max: '200',
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
        <GlobalVariablesTab
          globalVariables={globalVariables}
          setGlobalVariables={setGlobalVariables}
          setActiveTab={setActiveTab}
          pythonCode={pythonCode}
          setPythonCode={setPythonCode}
        />
      )}

      {/* Results Tab */}
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
                      marginRight: '10px',
                    }}
                    onClick={downloadHtml}
                  >
                    Download HTML
                  </button>
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
      <LogDock
        open={dockOpen}
        onClose={() => { setDockOpen(false); if (sseRef.current) sseRef.current.close(); }}
        lines={logLines}
        progress={null}
      />
    </div>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow />
      </DnDProvider>
    </ReactFlowProvider>
  );
}

