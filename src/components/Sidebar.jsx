import React, { useState } from 'react';
import { useDnD } from './DnDContext';
import { nodeCategories, getNodeDisplayName } from '../nodeConfig.js';

export default () => {
  const [_, setType] = useDnD();

  const [expandedCategories, setExpandedCategories] = useState({
    Sources: false,
    Processing: true,
    Math: true,
    Control: false,
    "Fuel Cycle": false,
    Output: true,
  });

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    e.target.style.cursor = "grabbing";
    event.target.classList.add("drag");
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragEnd = (event) => {
    e.target.style.cursor = "grab";
    event.target.classList.remove("drag");
  };



  const toggleCategory = (categoryName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Get CSS class for node based on category
  const getNodeClass = (categoryName) => {
    let category = categoryName.toLowerCase();

    let ret = `dndnode category ${category}`;
    console.log(ret);
    return ret;
  };

  const getNodeColor = (categoryName) => {
    // TODO: JSONIZE this for subassemblies
    const categoryColors = {
      Sources: { border: "#17a2b8", bg: "#1a2a3a" },
      Control: { border: "#6f42c1", bg: "#2a1f3d" },
      "Fuel Cycle": { border: "#fd7e14", bg: "#3a2a1a" },
      Filters: { border: "#20c997", bg: "#1a3a2f" },
      Others: { border: "#ffc107", bg: "#3a3a1a" },
      Input: { border: "#28a745", bg: "#1a2f1a" },
      Output: { border: "#dc3545", bg: "#3a1a1a" },
      Processing: { border: "#007bff", bg: "#1a1a3a" },
      Math: { border: "#17a2b8", bg: "#1a2a3a" },
      Default: { border: "white", bg: "white" },
    };

    let ret = categoryColors[categoryName] || categoryColors.Default;
    return ret;
  };

  return (
    <aside
      style={{
        padding: "16px",
        height: "100%",
        overflowY: "auto",
        backgroundColor: "#1e1e2f",
        borderRight: "1px solid #555",
        boxSizing: "border-box",
      }}
      // className="p-[16px]! h-full overflow-y-auto bg-[#1e1e2f] border-r border-[#555] box-border"
    >
      <div
        className="description"
        style={{
          marginBottom: "16px",
          fontSize: "14px",
          color: "#cccccc",
          textAlign: "center",
        }}
      >
        Drag nodes to the canvas to add them to your graph
      </div>

      {Object.entries(nodeCategories).map(([categoryName, categoryData]) => (
        <div key={categoryName} style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: "8px 12px",
              backgroundColor: "#2c2c54",
              borderRadius: "4px",
              marginBottom: "8px",
              userSelect: "none",
            }}
            onClick={() => toggleCategory(categoryName)}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              {categoryName}
            </h4>
            <span
              className="text-xs"
              style={{
                fontSize: "12px",
                transform: expandedCategories[categoryName]
                  ? "rotate(90deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s ease",
                color: "#cccccc",
              }}
            >
              ▶
            </span>
          </div>

          {expandedCategories[categoryName] && (
            <div style={{ paddingLeft: "8px" }}>
              <div className="sidebar-description">
                {categoryData.description}
              </div>

              {categoryData.nodes.map((nodeType) => (
                <div
                  key={nodeType}
                  className={getNodeClass(categoryName)}
                  draggable
                  style={{
                    margin: "4px 0",
                    borderRadius: "4px",
                    cursor: "grab",
                    fontSize: "13px",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: `${getNodeColor(categoryName).bg}`,
                    borderLeftColor: `${getNodeColor(categoryName).border}`,
                  }}
                  onDragStart={(e) => {
                    onDragStart(e, nodeType);
                  }}
                  onDragEnd={(e) => {
                    onDragEnd(e);
                  }}
                >
                  <span>{getNodeDisplayName(nodeType)}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#888",
                    }}
                  >
                    ⋮⋮
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
};