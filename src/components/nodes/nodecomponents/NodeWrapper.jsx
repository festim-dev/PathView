import NodeTop from "./NodeTop";

export default function NodeWrapper({ data, children, className, style }) {
    const defaultStyle = {
        background: data.nodeColor ?? '#DDE6ED'
    }
    return (
      <div
        className={`node${className ? ' ' + className.trim(): ''}`}
        style={{
          ...defaultStyle,
          ...style,
        }}
      >
        <NodeTop data={data}/>
        {children}
      </div>
    );
}
