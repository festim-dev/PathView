// Node type definitions and categorization
import { ProcessNode, ProcessNodeHorizontal } from './components/nodes/ProcessNode';
import DelayNode from './components/nodes/DelayNode';
import SourceNode from './components/nodes/ConstantNode';
import { AmplifierNode, AmplifierNodeReverse } from './components/nodes/AmplifierNode';
import IntegratorNode from './components/nodes/IntegratorNode';
import AdderNode from './components/nodes/AdderNode';
import ScopeNode from './components/nodes/ScopeNode';
import StepSourceNode from './components/nodes/StepSourceNode';
import { createFunctionNode } from './components/nodes/FunctionNode';
import DefaultNode from './components/nodes/DefaultNode';
import MultiplierNode from './components/nodes/MultiplierNode';
import { Splitter2Node, Splitter3Node } from './components/nodes/Splitters';
import BubblerNode from './components/nodes/BubblerNode';
import WallNode from './components/nodes/WallNode';
import { DynamicHandleNode } from './components/nodes/arbitraryNode';

// Node types mapping
export const nodeTypes = {
  process: ProcessNode,
  process_horizontal: ProcessNodeHorizontal,
  delay: DelayNode,
  constant: SourceNode,
  source: SourceNode,
  stepsource: StepSourceNode,
  trianglewavesource: SourceNode,
  sinusoidalsource: SourceNode,
  gaussianpulsesource: SourceNode,
  sinusoidalphasenoisesource: SourceNode,
  chirpphasenoisesource: SourceNode,
  chirpsource: SourceNode,
  pulsesource: SourceNode,
  clocksource: SourceNode,
  squarewavesource: SourceNode,
  amplifier: AmplifierNode,
  amplifier_reverse: AmplifierNodeReverse,
  integrator: IntegratorNode,
  adder: AdderNode,
  multiplier: MultiplierNode,
  scope: ScopeNode,
  function: createFunctionNode(1, 1), // Default FunctionNode with 1 input and 1 output
  function2to2: createFunctionNode(2, 2), // FunctionNode with 2 inputs and 2 outputs
  rng: SourceNode,
  pid: DefaultNode,
  antiwinduppid: DefaultNode,
  splitter2: Splitter2Node,
  splitter3: Splitter3Node,
  wall: WallNode,
  bubbler: BubblerNode,
  white_noise: SourceNode,
  pink_noise: SourceNode,
  spectrum: ScopeNode,
  differentiator: DefaultNode,
  samplehold: DefaultNode,
  comparator: DefaultNode,
  allpassfilter: DefaultNode,
  butterworthlowpass: DefaultNode,
  butterworthhighpass: DefaultNode,
  butterworthbandpass: DefaultNode,
  butterworthbandstop: DefaultNode,
  fir: DefaultNode,
  arbitrary: DynamicHandleNode,
};

export const nodeMathTypes = {
  sin: DefaultNode,
  cos: DefaultNode,
  sqrt: DefaultNode,
  abs: DefaultNode,
  pow: DefaultNode,
  exp: DefaultNode,
  log: DefaultNode,
  log10: DefaultNode,
  tan: DefaultNode,
  sinh: DefaultNode,
  cosh: DefaultNode,
  tanh: DefaultNode,
  atan: DefaultNode,
  norm: DefaultNode,
  mod: DefaultNode,
  clip: DefaultNode,
}

// add nodeMathTypes to nodeTypes
Object.keys(nodeMathTypes).forEach(type => {
  if (!nodeTypes[type]) {
    nodeTypes[type] = nodeMathTypes[type];
  }
});

export const nodeDynamicHandles = ['arbitrary']; 

// Node categories for better organization
export const nodeCategories = {
  'Sources': {
    nodes: ['constant', 'stepsource', 'source', 'pulsesource', 'trianglewavesource', 'sinusoidalsource', 'gaussianpulsesource', 'sinusoidalphasenoisesource', 'chirpphasenoisesource', 'chirpsource', 'clocksource', 'squarewavesource', 'rng', 'white_noise', 'pink_noise'],
    description: 'Signal and data source nodes'
  },
  'Processing': {
    nodes: ['delay', 'amplifier', 'amplifier_reverse', 'integrator', 'differentiator', 'function', 'function2to2'],
    description: 'Signal processing and transformation nodes'
  },
  'Math': {
    nodes: ['adder', 'multiplier', 'splitter2', 'splitter3'].concat(Object.keys(nodeMathTypes)),
    description: 'Mathematical operation nodes'
  },
  'Control': {
    nodes: ['pid', 'antiwinduppid'],
    description: 'Control system nodes'
  },
  'Filters': {
    nodes: ['allpassfilter', 'butterworthlowpass', 'butterworthhighpass', 'butterworthbandpass', 'butterworthbandstop', 'fir'],
    description: 'Filter and flow control nodes'
  },
  'Fuel Cycle': {
    nodes: ['process', 'process_horizontal', 'bubbler', 'wall'],
    description: 'Fuel cycle specific nodes'
  },
  'Others': {
    nodes: ['samplehold', 'comparator', 'arbitrary'],
    description: 'Miscellaneous nodes'
  },
  'Output': {
    nodes: ['scope', 'spectrum'],
    description: 'Output and visualization nodes'
  }
};

// Utility function to get display name for a node type
export const getNodeDisplayName = (nodeType) => {
  const displayNames = {
    'source': 'Source',
    'constant': 'Constant',
    'stepsource': 'Step',
    'pulsesource': 'Pulse',
    'white_noise': 'White Noise',
    'pink_noise': 'Pink Noise',
    'process': 'Process',
    'process_horizontal': 'Process (Horizontal)',
    'delay': 'Delay',
    'amplifier': 'Amplifier',
    'amplifier_reverse': 'Amplifier (Reverse)',
    'integrator': 'Integrator',
    'function': 'Function',
    'function2to2': 'Function (2→2)',
    'adder': 'Adder',
    'multiplier': 'Multiplier',
    'splitter2': 'Splitter (1→2)',
    'splitter3': 'Splitter (1→3)',
    'rng': 'Random Number Generator',
    'pid': 'PID Controller',
    'bubbler': 'Bubbler',
    'wall': 'Wall',
    'scope': 'Scope',
    'spectrum': 'Spectrum',
    'differentiator': 'Differentiator',
    'sin': 'Sine',
    'cos': 'Cosine',
    'sqrt': 'Square Root',
    'abs': 'Absolute',
    'pow': 'Power',
    'exp': 'Exponential',
    'log': 'Logarithm',
    'log10': 'Logarithm (Base 10)',
    'tan': 'Tangent',
    'sinh': 'Hyperbolic Sine',
    'cosh': 'Hyperbolic Cosine',
    'tanh': 'Hyperbolic Tangent',
    'atan': 'Inverse Tangent',
    'norm': 'Normalization',
    'mod': 'Modulo',
    'clip': 'Clipping',
  };

  return displayNames[nodeType] || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
};

// Utility function to get all available node types
export const getAllNodeTypes = () => Object.keys(nodeTypes);
