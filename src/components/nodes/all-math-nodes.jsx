import React from 'react';
import { Position, useNodeConnections } from '@xyflow/react';
import {
    BaseNode,
    BaseNodeContent,
    BaseNodeFooter,
    BaseNodeHeader,
    BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { BaseHandle } from "@/components/base-handle";


export function MathNode({ data, displayName }) {

    return (
        <BaseNode className="w-20 h-10">
            <BaseNodeHeaderTitle className="h4 px-2">{displayName}</BaseNodeHeaderTitle>
            <BaseHandle type="target" position={Position.Left} connectionCount={1} />
            <BaseHandle type="source" position={Position.Right} />
        </BaseNode>
    );
}

export function SineNode({ data }) {
    return (
        <MathNode data={data} displayName="Sine" />
    );
}

export function CosineNode({ data }) {
    return (
        <MathNode data={data} displayName="Cosine" />
    );
}

