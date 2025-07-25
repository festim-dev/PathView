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
from pathsim.blocks import (
    ODE,
    Scope,
    Block,
    Constant,
    StepSource,
    Amplifier,
    Adder,
    Integrator,
    Function,
    Delay,
    RNG,
    PID,
)


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
    # try:
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
    blocks = []

    for node in nodes:
        # TODO this needs serious refactoring
        if node["type"] == "source":
            block = Constant(value=float(node["data"]["value"]))
        elif node["type"] == "stepsource":
            block = StepSource(
                amplitude=float(node["data"]["amplitude"]),
                tau=float(node["data"]["delay"]),
            )
        elif node["type"] == "amplifier":
            block = Amplifier(gain=float(node["data"]["gain"]))
        elif node["type"] == "scope":
            # Find all incoming edges to this node and sort by source id for consistent ordering
            incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
            incoming_edges.sort(key=lambda x: x["source"])
            labels = [
                find_node_by_id(edge["source"])["data"]["label"]
                for edge in incoming_edges
            ]
            block = Scope(
                labels=labels,
            )
        elif node["type"] == "adder":
            # TODO handle custom operations
            block = Adder()
        elif node["type"] == "integrator":
            block = Integrator(
                initial_value=float(node["data"]["initial_value"])
                if node["data"].get("initial_value")
                and node["data"]["initial_value"] != ""
                else 0.0,
            )
        elif node["type"] == "function":
            # Convert the expression string to a lambda function
            expression = node["data"].get("expression", "x")

            # Create a safe lambda function from the expression
            # The expression should use 'x' as the variable
            try:
                # Create a lambda function from the expression string
                # We'll allow common mathematical operations and numpy functions
                import numpy as np
                import math

                # Safe namespace for eval
                safe_namespace = {
                    "x": 0,  # placeholder
                    "np": np,
                    "math": math,
                    "sin": np.sin,
                    "cos": np.cos,
                    "tan": np.tan,
                    "exp": np.exp,
                    "log": np.log,
                    "sqrt": np.sqrt,
                    "abs": abs,
                    "pow": pow,
                    "pi": np.pi,
                    "e": np.e,
                }

                # Test the expression first to ensure it's valid
                eval(expression.replace("x", "1"), safe_namespace)

                # Create the actual function
                def func(x):
                    return eval(expression, {**safe_namespace, "x": x})

            except Exception as e:
                print(f"Error parsing expression '{expression}': {e}")

                raise ValueError(
                    f"Invalid function expression: {expression}. Error: {str(e)}"
                )

            block = Function(func=func)
        elif node["type"] == "delay":
            block = Delay(tau=float(node["data"]["tau"]))
        elif node["type"] == "rng":
            block = RNG(sampling_rate=float(node["data"]["sampling_rate"]))
        elif node["type"] == "pid":
            block = PID(
                Kp=float(node["data"]["Kp"]) if node["data"].get("Kp") else 0,
                Ki=float(node["data"]["Ki"]) if node["data"].get("Ki") else 0,
                Kd=float(node["data"]["Kd"]) if node["data"].get("Kd") else 0,
                f_max=float(node["data"]["f_max"])
                if node["data"].get("f_max")
                else 100,
            )
        elif node["type"] == "custom":
            betas = []

            # Find all incoming edges to this node and sort by source id for consistent ordering
            incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
            incoming_edges.sort(key=lambda x: x["source"])

            # Process incoming edges in sorted order to build betas
            for edge in incoming_edges:
                source_node = find_node_by_id(edge["source"])
                outgoing_edges = [
                    edge for edge in edges if edge["source"] == source_node["id"]
                ]

                if source_node["type"] == "custom":
                    # default transfer fraction split equally
                    f = edge["data"].get("weight", 1 / len(outgoing_edges))

                    if source_node and source_node["data"].get("residence_time"):
                        betas.append(f / float(source_node["data"]["residence_time"]))

                elif source_node["type"] in [
                    "source",
                    "stepsource",
                    "amplifier",
                    "adder",
                    "integrator",
                    "function",
                ]:
                    betas.append(1)
                else:
                    raise ValueError(f"Unsupported source type: {source_node['type']}")

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

    # Add a Scope block if none exists
    # This ensures that there is always a scope to collect outputs
    scope_default = None
    if not any(isinstance(block, Scope) for block in blocks):
        scope_default = Scope(
            labels=[node["data"]["label"] for node in nodes],
        )
        scope_default.id = "scope_default"
        scope_default.label = "Default Scope"
        blocks.append(scope_default)

    # Create connections based on the sorted edges to match beta order
    connections_pathsim = []

    # Process each node and its sorted incoming edges to create connections
    for node in nodes:
        # Find all incoming edges to this node and sort by source id (same as for betas)
        incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
        incoming_edges.sort(key=lambda x: x["source"])

        target_block = find_block_by_id(node["id"])
        target_input_index = 0

        # Create connections in the same order as betas were created
        for edge in incoming_edges:
            source_block = find_block_by_id(edge["source"])
            if source_block and target_block:
                connection = Connection(source_block, target_block[target_input_index])
                connections_pathsim.append(connection)
                target_input_index += 1

    # Add connections to scope
    if scope_default:
        scope_input_index = 0
        for block in blocks:
            if block.id != "scope_default":
                connection = Connection(block, scope_default[scope_input_index])
                connections_pathsim.append(connection)
                scope_input_index += 1

    # Create the simulation
    my_simulation = Simulation(blocks, connections_pathsim, log=False)

    # Run the simulation
    my_simulation.run(50)

    # Generate the plot
    scopes = [block for block in blocks if isinstance(block, Scope)]
    fig, axs = plt.subplots(len(scopes), sharex=True, figsize=(10, 5 * len(scopes)))
    for i, scope in enumerate(scopes):
        plt.sca(axs[i] if len(scopes) > 1 else axs)
        # scope.plot()
        time, data = scope.read()
        # plot the recorded data
        for p, d in enumerate(data):
            lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
            plt.plot(time, d, label=lb)
        plt.legend()
        plt.title(scope.label)

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

    # except Exception as e:
    #     return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)
