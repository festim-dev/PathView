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
        <div className="mb-1 text-xs">
            {data.label}
        </div>
        {children}
      </div>
    );
}
