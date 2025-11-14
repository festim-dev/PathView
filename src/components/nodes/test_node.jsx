import "@xyflow/react/dist/style.css";

import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/nodes/base-node";


export default function TestNode({ data }) {
    return (
        <BaseNode>
            <BaseNodeHeader>
                <BaseNodeHeaderTitle>Base Node</BaseNodeHeaderTitle>
            </BaseNodeHeader>
            <BaseNodeContent>
                This is a base node component that can be used to build other nodes.
            </BaseNodeContent>
        </BaseNode>
    );
}