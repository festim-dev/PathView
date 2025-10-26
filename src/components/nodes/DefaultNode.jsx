import { Handle } from '@xyflow/react';
import NodeWrapper from './NodeWrapper';

export default function DefaultNode({ data }) {
  return (
    <NodeWrapper data={data}>
        <div style={{ marginBottom: 4 }}>{data.label}</div>

        <Handle type="target" position="left" style={{ background: "#555" }} />
        <Handle type="source" position="right" style={{ background: "#555" }} />
    </NodeWrapper>
  );
}
