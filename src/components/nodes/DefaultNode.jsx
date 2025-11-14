import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { BaseHandle } from "@/components/base-handle";


export default function DefaultNode({ data }) {
  return (
    <BaseNode className="w-40 h-20">
      <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
      <BaseHandle type="target" position={Position.Left} />
      <BaseHandle type="source" position={Position.Right} />
    </BaseNode>
  );
}
