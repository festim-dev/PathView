import React from 'react';
import { Handle } from '@xyflow/react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { BaseHandle } from "@/components/base-handle";
import { Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function StepSourceNode({ data }) {
  return (

    <BaseNode className="w-50 h-50 px-0 py-0">


      <BaseNodeHeader className="border-b">
        <Rocket className="size-4" />
        <BaseNodeHeaderTitle>Step Source</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      {/* <Handle type="source" position="right" style={{ background: '#555' }} /> */}
      <BaseHandle type="source" position="right" />
      <BaseNodeContent className="px-5 py-5">
        {/* <svg width="100%" height="100%" viewBox="0 0 50 30" style={{ display: 'block' }}>
          <path
            d="M 5 25 L 25 25 L 25 5 L 45 5"
            stroke="#333"
            strokeWidth="2"
            fill="none"
          />
        </svg> */}
        <Input
          className="w-full"
          placeholder="Amplitude"
        />
        <Input
          className="w-full"
          placeholder="tau"
        />
      </BaseNodeContent>


    </BaseNode>
  );
}
