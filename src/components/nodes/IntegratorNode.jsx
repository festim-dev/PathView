import { Handle, useNodeConnections } from '@xyflow/react';
import NodeWrapper from './NodeWrapper';


export default function IntegratorNode({ data }) {
  const connections = useNodeConnections({
    handleType: "target",
  });

  return (

    <NodeWrapper data={data}>
      <Handle type="target" position="left" style={{ background: '#555' }} isConnectable={connections.length < 1}/>
      <Handle type="source" position="right" style={{ background: '#555' }} />
    </NodeWrapper>
  );
}
