import React from 'react';
import { Handle } from '@xyflow/react';

export default function DefaultNode({ data }) {
  return (
    <div
      class="node"
      style={{
        background: data.nodeColor,
      }}
    >
      <div style={{ marginBottom: 4 }}>{data.label}</div>

      <Handle type="target" position="left" style={{ background: "#555" }} />
      <Handle type="source" position="right" style={{ background: "#555" }} />
    </div>
  );
}
