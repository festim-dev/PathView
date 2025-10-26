export default function NodeWrapper({ data, children, className, style }) {
    const defaultStyle = {
        background: data.nodeColor ?? '#DDE6ED'
    }
    return (
        <div
        className={`node ${className}`}
        style={{
            ...defaultStyle, ...style
        }}
        >
        {children}
        </div>
    );
}
