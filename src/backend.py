import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from convert_to_python import convert_graph_to_python
import matplotlib

matplotlib.use("Agg")  # Use non-interactive backend
import matplotlib.pyplot as plt
import io
import base64

from pathsim import Simulation, Connection
from pathsim.blocks import ODE, Scope, Block


# app = Flask(__name__)
# CORS(app, supports_credentials=True)

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
)


# CUSTOM BLOCK ==========================================================================


class Process(ODE):
    def __init__(self, alpha=0, betas=[], gen=0, ic=0):
        super().__init__(
            func=lambda x, u, t: alpha * x
            + sum(_u * _b for _u, _b in zip(u, betas))
            + gen,
            jac=lambda x, u, t: alpha,
            initial_value=ic,
        )


# Function to compute functions in the nodes
@app.route("/compute", methods=["POST"])
def compute():
    data = request.json
    node_id = data.get("id")
    params = data.get("params", {})
    incoming_outputs = data.get("incomingOutputs", [])

    # Convert parameters to floats
    values = []
    for val in params.values():
        try:
            values.append(float(val))
        except ValueError:
            return jsonify({"id": node_id, "output": "Invalid input"})

    # Add outputs from incoming nodes
    for val in incoming_outputs:
        try:
            values.append(float(val))
        except ValueError:
            continue

    total = sum(values)

    return jsonify({"id": node_id, "output": total})


# Creates directory for saved graphs
SAVE_DIR = "saved_graphs"
os.makedirs(SAVE_DIR, exist_ok=True)


# Function to save graphs
@app.route("/save", methods=["POST"])
def save_graph():
    data = request.json
    filename = data.get(
        "filename", "file_1"
    )  # sets file_1 as default filename if not provided
    graph_data = data.get("graph")

    # Enforces .json extension and valid filenames
    valid_name = f"{filename}.json" if not filename.endswith(".json") else filename
    file_path = os.path.join(SAVE_DIR, valid_name)

    with open(file_path, "w") as f:
        json.dump(graph_data, f, indent=2)

    return jsonify({"message": f"Graph saved as {valid_name}"})


# Function to load saved graphs
@app.route("/load", methods=["POST"])
def load_graph():
    data = request.json
    filename = data.get("filename")
    validname = filename if not filename.endswith(".json") else filename[:-5]
    filepath = os.path.join(SAVE_DIR, f"{validname}.json")

    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    with open(filepath, "r") as f:
        graph_data = json.load(f)

    return jsonify(graph_data)


# Function to convert graph to Python script
@app.route("/convert-to-python", methods=["POST"])
def convert_to_python():
    try:
        data = request.json
        graph_data = data.get("graph")

        if not graph_data:
            return jsonify({"error": "No graph data provided"}), 400

        # Generate the Python script directly using the imported function
        script_content = convert_graph_to_python(graph_data)

        return jsonify(
            {
                "success": True,
                "script": script_content,
                "message": "Python script generated successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


# Function to convert graph to pathsim and run simulation
@app.route("/run-pathsim", methods=["POST"])
def run_pathsim():
    try:
        data = request.json
        graph_data = data.get("graph")

        if not graph_data:
            return jsonify({"error": "No graph data provided"}), 400

        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        def find_node_by_id(node_id: str) -> dict:
            for node in nodes:
                if node["id"] == node_id:
                    return node
            return None

        def find_block_by_id(block_id: str) -> Block:
            for block in blocks:
                if hasattr(block, "id") and block.id == block_id:
                    return block
            return None

        # Create blocks
        connections = {node["id"]: [] for node in nodes}
        blocks = []

        for node in nodes:
            betas = []

            # Find all the edges connected to this node
            for edge in edges:
                f = 1  # default value for f
                if edge["target"] == node["id"]:
                    source_node = find_node_by_id(edge["source"])
                    if source_node and source_node["data"].get("residence_time"):
                        betas.append(f / float(source_node["data"]["residence_time"]))
                    connections[edge["source"]].append(edge["target"])

            block = Process(
                alpha=(
                    -1 / float(node["data"]["residence_time"])
                    if node["data"].get("residence_time")
                    and node["data"]["residence_time"] != ""
                    else 0
                ),
                betas=betas,
                ic=(
                    float(node["data"]["initial_value"])
                    if node["data"].get("initial_value")
                    and node["data"]["initial_value"] != ""
                    else 0
                ),
                gen=(
                    float(node["data"]["source_term"])
                    if node["data"].get("source_term")
                    and node["data"]["source_term"] != ""
                    else 0
                ),
            )
            block.id = node["id"]
            block.label = node["data"]["label"]
            blocks.append(block)

        # Add a Scope block
        scope = Scope(
            labels=[node["data"]["label"] for node in nodes],
        )
        scope.id = "scope"
        blocks.append(scope)

        next_outputs = {block.id: 0 for block in blocks}

        # Create connections based on the edges
        connections_pathsim = []
        for source, targets in connections.items():
            source_block = find_block_by_id(source)
            for target in targets:
                target_block = find_block_by_id(target)
                if source_block and target_block:
                    connection = Connection(
                        source_block, target_block[next_outputs[target_block.id]]
                    )
                    connections_pathsim.append(connection)
                    next_outputs[target_block.id] += 1

        # Add connections to scope
        for block in blocks:
            if block.id != "scope":
                connection = Connection(block, scope[next_outputs[scope.id]])
                connections_pathsim.append(connection)
                next_outputs[scope.id] += 1

        # Create the simulation
        my_simulation = Simulation(blocks, connections_pathsim, log=False)

        # Run the simulation
        my_simulation.run(50)

        # Generate the plot
        fig, ax = scope.plot()

        # Convert plot to base64 string
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png", dpi=150, bbox_inches="tight")
        buffer.seek(0)
        plot_data = base64.b64encode(buffer.getvalue()).decode()
        plt.close(fig)

        return jsonify(
            {
                "success": True,
                "plot": plot_data,
                "message": "Pathsim simulation completed successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)
