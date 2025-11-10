// Icons from Reshot
import trashcan from "$assets/trashcan.svg";
import duplicate from "$assets/duplicate.svg";
import { useContext } from "react";
import { NodeActionsCtx } from "./NodeActionsContext";


function TopButton({icon, callback}) {
    // TODO: Link button side with wrapper size
    return (
      <button className="bg-transparent my-auto px-0.5 py-0" onClick={callback}>
        <img src={icon} className="w-3 h-3"></img>
      </button>
    );
}

export default function NodeTop({ data }) {
  // TODO: The delete node and duplicate node feature should be rewritten in future refactor work
  //       to directly use the nodes id
  const { deleteSelectedNode, duplicateNode } = useContext(NodeActionsCtx);
  return (
    <div className="bg-inherit flex">
      <div className="text-xs m-auto">{data.label}</div>
      <div className="flex justify-end w-10">
        <TopButton
          icon={duplicate}
          callback={() => {
            duplicateNode(data.id);
          }}
        />
        <TopButton icon={trashcan} callback={deleteSelectedNode} />
      </div>
    </div>
  );
}
