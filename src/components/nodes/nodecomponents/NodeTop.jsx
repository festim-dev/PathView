// Icons from Reshot
import trashcan from "$assets/trashcan.svg";
import duplicate from "$assets/duplicate.svg";


function TopButton({icon}) {
    // TODO: Link button side with wrapper size
    return (
      <button className="bg-transparent my-auto px-0.5 py-0">
        <img src={icon} className="w-3 h-3"></img>
      </button>
    );
}

export default function NodeTop({ data }) {
  return (
    <div className="bg-inherit flex">
      <div className="text-xs m-auto">{data.label}</div>
      <div className="flex justify-end w-10">
        <TopButton icon={duplicate} />
        <TopButton icon={trashcan} />
      </div>
    </div>
  );
}
