import { Handle } from '@xyflow/react';
import NodeWrapper from './nodecomponents/NodeWrapper';

export default function DefaultNode({ data }) {
  return (
    <NodeWrapper data={data}>
        <Handle type="target" position="left" style={{ background: "#555" }} />
        <Handle type="source" position="right" style={{ background: "#555" }} />
    </NodeWrapper>
  );
}
