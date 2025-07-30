import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly
import json as plotly_json

from pathsim import Simulation, Connection
import pathsim.solvers
from pathsim.blocks import (
    Scope,
    Block,
    Constant,
    StepSource,
    PulseSource,
    Amplifier,
    Adder,
    Multiplier,
    Integrator,
    Function,
    Delay,
    RNG,
    PID,
    Schedule,
)
from .custom_pathsim_blocks import Process, Splitter
from .convert_to_python import convert_graph_to_python

NAME_TO_SOLVER = {
    "SSPRK22": pathsim.solvers.SSPRK22,
    "SSPRK33": pathsim.solvers.SSPRK33,
    "RKF21": pathsim.solvers.RKF21,
}

# app = Flask(__name__)
# CORS(app, supports_credentials=True)

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
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


def find_node_by_id(node_id: str, nodes: list) -> dict:
    for node in nodes:
        if node["id"] == node_id:
            return node
    return None


def find_block_by_id(block_id: str, blocks) -> Block:
    for block in blocks:
        if hasattr(block, "id") and block.id == block_id:
            return block
    return None


def create_integrator(
    node: dict, eval_namespace: dict = None
) -> tuple[Block, list[Schedule]]:
    if eval_namespace is None:
        eval_namespace = globals()

    block = Integrator(
        initial_value=eval(node["data"]["initial_value"], eval_namespace)
        if node["data"].get("initial_value") and node["data"]["initial_value"] != ""
        else 0.0,
    )
    # add events to reset integrator if needed
    events = []
    if node["data"]["reset_times"] != "":

        def reset_itg(_):
            block.reset()

        reset_times = eval(node["data"]["reset_times"], eval_namespace)
        if isinstance(reset_times, (int, float)):
            # If it's a single number, convert it to a list
            reset_times = [reset_times]
        for t in reset_times:
            events.append(Schedule(t_start=t, t_end=t, func_act=reset_itg))
    return block, events


def create_function(node: dict, eval_namespace: dict = None) -> Block:
    if eval_namespace is None:
        eval_namespace = globals()

    # Convert the expression string to a lambda function
    expression = node["data"].get("expression", "x")

    # Create a safe lambda function from the expression
    # The expression should use 'x' as the variable
    try:
        # Create a lambda function from the expression string
        # We'll allow common mathematical operations and numpy functions

        # Safe namespace for eval - merge with global variables
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
            **eval_namespace,  # Include global variables
        }

        # Test the expression first to ensure it's valid
        eval(expression.replace("x", "1"), safe_namespace)

        # Create the actual function
        def func(x):
            return eval(expression, {**safe_namespace, "x": x})

    except Exception as e:
        raise ValueError(f"Invalid function expression: {expression}. Error: {e}")

    block = Function(func=func)
    return block


def create_scope(node: dict, edges, nodes) -> Scope:
    # Find all incoming edges to this node and sort by source id for consistent ordering
    incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
    incoming_edges.sort(key=lambda x: x["source"])

    # create labels for the scope based on incoming edges
    labels = []
    duplicate_labels = []
    connections_order = []  # will be used later to make connections
    for edge in incoming_edges:
        source_node = find_node_by_id(edge["source"], nodes=nodes)
        label = source_node["data"]["label"]

        connections_order.append(edge["id"])

        # If the label already exists, try to append the source handle to it (if it exists)
        if label in labels or label in duplicate_labels:
            duplicate_labels.append(label)
            if edge["sourceHandle"]:
                new_label = label + f" ({edge['sourceHandle']})"
                label = new_label
        labels.append(label)

    for i, (edge, label) in enumerate(zip(incoming_edges, labels)):
        if label in duplicate_labels:
            if edge["sourceHandle"]:
                labels[i] += f" ({edge['sourceHandle']})"

    block = Scope(labels=labels)
    block._connections_order = connections_order

    return block


# Function to convert graph to pathsim and run simulation
@app.route("/run-pathsim", methods=["POST"])
def run_pathsim():
    try:
        data = request.json
        graph_data = data.get("graph")
        if not graph_data:
            return jsonify({"error": "No graph data provided"}), 400

        my_simulation, duration = make_pathsim_model(graph_data)

        # Run the simulation
        my_simulation.run(duration)

        # Generate the plot
        scopes = [block for block in my_simulation.blocks if isinstance(block, Scope)]

        if len(scopes) == 1:
            # Single subplot case
            fig = go.Figure()
            scope = scopes[0]
            time, data = scope.read()

            for p, d in enumerate(data):
                lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
                fig.add_trace(go.Scatter(x=time, y=d, mode="lines", name=lb))

            fig.update_layout(
                title=scope.label,
                xaxis_title="Time",
                yaxis_title="Value",
                hovermode="x unified",
            )
        else:
            # Multiple subplots case
            fig = make_subplots(
                rows=len(scopes),
                cols=1,
                shared_xaxes=True,
                subplot_titles=[scope.label for scope in scopes],
                vertical_spacing=0.1,
            )

            for i, scope in enumerate(scopes):
                time, data = scope.read()

                for p, d in enumerate(data):
                    lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
                    fig.add_trace(
                        go.Scatter(x=time, y=d, mode="lines", name=lb), row=i + 1, col=1
                    )

            fig.update_layout(height=400 * len(scopes), hovermode="x unified")
            fig.update_xaxes(title_text="Time", row=len(scopes), col=1)

        # Convert plot to JSON
        plot_data = plotly_json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

        return jsonify(
            {
                "success": True,
                "plot": plot_data,
                "message": "Pathsim simulation completed successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


def make_global_variables(global_vars):
    # Validate and exec global variables so that they are usable later in this script.
    # Return a namespace dictionary containing the global variables
    global_namespace = {}

    for var in global_vars:
        var_name = var.get("name", "").strip()
        var_value = var.get("value", "")

        # Validate variable name
        if not var_name:
            continue  # Skip empty names

        if not var_name.isidentifier():
            raise ValueError(
                f"Invalid Python variable name: '{var_name}'. "
                "Variable names must start with a letter or underscore, "
                "and contain only letters, digits, and underscores."
            )

        # Check if it's a Python keyword
        import keyword

        if keyword.iskeyword(var_name):
            raise ValueError(
                f"'{var_name}' is a Python keyword and cannot be used as a variable name."
            )

        try:
            # Execute in global namespace for backwards compatibility
            exec(f"{var_name} = {var_value}", globals())
            # Also store in local namespace for eval calls
            global_namespace[var_name] = eval(var_value)
        except Exception as e:
            raise ValueError(f"Error setting global variable '{var_name}': {str(e)}")

    return global_namespace


def make_solver_params(solver_prms, eval_namespace=None):
    extra_params = solver_prms.pop("extra_params", "")
    if extra_params == "":
        extra_params = {}
    else:
        extra_params = eval(extra_params, eval_namespace)
    assert isinstance(extra_params, dict), "extra_params must be a dictionary"

    for k, v in solver_prms.items():
        if k not in ["Solver", "log"]:
            try:
                solver_prms[k] = eval(v, eval_namespace)
            except Exception as e:
                return jsonify(
                    {"error": f"Invalid value for {k}: {v}. Error: {str(e)}"}
                ), 400
        elif k == "log":
            if v == "true":
                solver_prms[k] = True
            elif v == "false":
                solver_prms[k] = False
            else:
                return jsonify(
                    {"error": f"Invalid value for {k}: {v}. Must be 'true' or 'false'."}
                ), 400
        elif k == "Solver":
            if v not in NAME_TO_SOLVER:
                return jsonify(
                    {
                        "error": f"Invalid solver: {v}. Must be one of {list(NAME_TO_SOLVER.keys())}."
                    }
                ), 400
            solver_prms[k] = NAME_TO_SOLVER[v]

    # remove solver duration from solver parameters
    duration = float(solver_prms.pop("simulation_duration"))

    assert not isinstance(solver_prms["Solver"], str), solver_prms["Solver"]

    return solver_prms, extra_params, duration


map_str_to_object = {
    "constant": Constant,
    "stepsource": StepSource,
    "pulsesource": PulseSource,
    "amplifier": Amplifier,
    "amplifier_reverse": Amplifier,
    "scope": Scope,
    "splitter2": Splitter,
    "splitter3": Splitter,
    "adder": Adder,
    "adder_reverse": Adder,
    "multiplier": Multiplier,
    "process": Process,
    "process_horizontal": Process,
    "rng": RNG,
    "pid": PID,
    "integrator": Integrator,
    "function": Function,
    "delay": Delay,
}


def make_blocks(nodes, edges, eval_namespace=None):
    blocks, events = [], []

    for node in nodes:
        block_type = node["type"]

        # Manual construction for some block types
        if block_type == "integrator":
            block, event_int = create_integrator(node, eval_namespace)
            events.extend(event_int)
        elif block_type == "function":
            block = create_function(node, eval_namespace)
        elif block_type == "scope":
            block = create_scope(node, edges, nodes)
        elif block_type == "stepsource":
            block = StepSource(
                amplitude=eval(node["data"]["amplitude"], eval_namespace),
                tau=eval(node["data"]["delay"], eval_namespace),
            )
        elif block_type == "delay":
            block = Delay(tau=eval(node["data"]["delay"], eval_namespace))
        elif block_type == "splitter2":
            block = Splitter(
                n=2,
                fractions=[
                    eval(node["data"]["f1"], eval_namespace),
                    eval(node["data"]["f2"], eval_namespace),
                ],
            )
        elif block_type == "splitter3":
            block = Splitter(
                n=3,
                fractions=[
                    eval(node["data"]["f1"], eval_namespace),
                    eval(node["data"]["f2"], eval_namespace),
                    eval(node["data"]["f3"], eval_namespace),
                ],
            )
        else:  # try automated construction
            block_class = map_str_to_object[block_type]

            # skip 'self'
            parameters_for_class = block_class.__init__.__code__.co_varnames[1:]

            parameters = {
                k: eval(v, eval_namespace)
                for k, v in node["data"].items()
                if k in parameters_for_class
            }
            block = block_class(**parameters)

        block.id = node["id"]
        block.label = node["data"]["label"]
        blocks.append(block)

    return blocks, events


def make_blocks_old(nodes, edges, eval_namespace=None):
    blocks, events = [], []
    for node in nodes:
        # TODO this needs serious refactoring
        if node["type"] == "constant":
            block = Constant(value=eval(node["data"]["value"], eval_namespace))
        elif node["type"] == "stepsource":
            block = StepSource(
                amplitude=eval(node["data"]["amplitude"], eval_namespace),
                tau=eval(node["data"]["delay"], eval_namespace),
            )
        elif node["type"] == "pulsesource":
            block = PulseSource(
                amplitude=eval(node["data"]["amplitude"], eval_namespace),
                T=eval(node["data"]["T"], eval_namespace),
                t_rise=eval(node["data"]["t_rise"], eval_namespace),
                t_fall=eval(node["data"]["t_fall"], eval_namespace),
                tau=eval(node["data"]["tau"], eval_namespace),
                duty=eval(node["data"]["duty"], eval_namespace),
            )
        elif node["type"] in ["amplifier", "amplifier_reverse"]:
            block = Amplifier(gain=eval(node["data"]["gain"], eval_namespace))
        elif node["type"] == "scope":
            block = create_scope(node, edges, nodes)
        elif node["type"] == "splitter2":
            block = Splitter(
                n=2,
                fractions=[
                    eval(node["data"]["f1"], eval_namespace),
                    eval(node["data"]["f2"], eval_namespace),
                ],
            )
        elif node["type"] == "splitter3":
            block = Splitter(
                n=3,
                fractions=[
                    eval(node["data"]["f1"], eval_namespace),
                    eval(node["data"]["f2"], eval_namespace),
                    eval(node["data"]["f3"], eval_namespace),
                ],
            )
        elif node["type"] == "adder":
            # TODO handle custom operations
            block = Adder()
        elif node["type"] == "multiplier":
            block = Multiplier()
        elif node["type"] == "integrator":
            block, events_int = create_integrator(node, eval_namespace)
            events.extend(events_int)
        elif node["type"] == "function":
            block = create_function(node, eval_namespace)
        elif node["type"] == "delay":
            block = Delay(tau=eval(node["data"]["tau"], eval_namespace))
        elif node["type"] == "rng":
            block = RNG(
                sampling_rate=eval(node["data"]["sampling_rate"], eval_namespace)
            )
        elif node["type"] == "pid":
            block = PID(
                Kp=eval(node["data"]["Kp"], eval_namespace)
                if node["data"].get("Kp")
                else 0,
                Ki=eval(node["data"]["Ki"], eval_namespace)
                if node["data"].get("Ki")
                else 0,
                Kd=eval(node["data"]["Kd"], eval_namespace)
                if node["data"].get("Kd")
                else 0,
                f_max=eval(node["data"]["f_max"], eval_namespace)
                if node["data"].get("f_max")
                else 100,
            )
        elif node["type"] in ["process", "process_horizontal"]:
            block = Process(
                residence_time=(
                    eval(node["data"]["residence_time"], eval_namespace)
                    if node["data"].get("residence_time")
                    and node["data"]["residence_time"] != ""
                    else 0
                ),
                ic=(
                    eval(node["data"]["initial_value"], eval_namespace)
                    if node["data"].get("initial_value")
                    and node["data"]["initial_value"] != ""
                    else 0
                ),
                gen=(
                    eval(node["data"]["source_term"], eval_namespace)
                    if node["data"].get("source_term")
                    and node["data"]["source_term"] != ""
                    else 0
                ),
            )
        else:
            raise ValueError(f"Unknown node type: {node['type']}")
        block.id = node["id"]
        block.label = node["data"]["label"]
        blocks.append(block)

    return blocks, events


def make_connections(nodes, edges, blocks) -> list[Connection]:
    # Create connections based on the sorted edges to match beta order
    connections_pathsim = []

    # Process each node and its sorted incoming edges to create connections
    block_to_input_index = {b: 0 for b in blocks}
    for node in nodes:
        outgoing_edges = [edge for edge in edges if edge["source"] == node["id"]]
        outgoing_edges.sort(key=lambda x: x["target"])

        incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
        incoming_edges.sort(key=lambda x: x["source"])

        block = find_block_by_id(node["id"], blocks=blocks)

        for edge in outgoing_edges:
            target_block = find_block_by_id(edge["target"], blocks=blocks)
            if isinstance(block, Process):
                if edge["sourceHandle"] == "inv":
                    output_index = 0
                elif edge["sourceHandle"] == "mass_flow_rate":
                    output_index = 1
                    assert block.residence_time != 0, (
                        "Residence time must be non-zero for mass flow rate output."
                    )
                else:
                    raise ValueError(
                        f"Invalid source handle '{edge['sourceHandle']}' for {edge}."
                    )
            elif isinstance(block, Splitter):
                # Splitter outputs are always in order, so we can use the handle directly
                assert edge["sourceHandle"], edge
                output_index = int(edge["sourceHandle"].replace("source", "")) - 1
                if output_index >= block.n:
                    raise ValueError(
                        f"Invalid source handle '{edge['sourceHandle']}' for {edge}."
                    )
            else:
                output_index = 0

            if isinstance(target_block, Scope):
                input_index = target_block._connections_order.index(edge["id"])
            else:
                input_index = block_to_input_index[target_block]

            connection = Connection(
                block[output_index],
                target_block[input_index],
            )
            connections_pathsim.append(connection)
            block_to_input_index[target_block] += 1

    return connections_pathsim


def make_default_scope(nodes, blocks) -> tuple[Scope, list[Connection]]:
    scope_default = Scope(
        labels=[node["data"]["label"] for node in nodes],
    )
    scope_default.id = "scope_default"
    scope_default.label = "Default Scope"

    # Add connections to scope
    connections_pathsim = []
    input_index = 0
    for block in blocks:
        if block != scope_default:
            connection = Connection(
                block[0],
                scope_default[input_index],
            )
            connections_pathsim.append(connection)
            input_index += 1

    return scope_default, connections_pathsim


def make_pathsim_model(graph_data: dict) -> tuple[Simulation, float]:
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    solver_prms = graph_data.get("solverParams", {})
    global_vars = graph_data.get("globalVariables", {})

    # Get the global variables namespace to use in eval calls
    global_namespace = make_global_variables(global_vars)

    # Create a combined namespace that includes built-in functions and global variables
    eval_namespace = {**globals(), **global_namespace}

    solver_prms, extra_params, duration = make_solver_params(
        solver_prms, eval_namespace
    )

    # Create blocks
    blocks, events = make_blocks(nodes, edges, eval_namespace)

    connections_pathsim = make_connections(nodes, edges, blocks)

    # Add a Scope block if none exists
    # This ensures that there is always a scope to collect outputs
    if not any(isinstance(block, Scope) for block in blocks):
        scope_default, connections_scope_def = make_default_scope(nodes, blocks)
        blocks.append(scope_default)
        connections_pathsim.extend(connections_scope_def)

    # Create the simulation
    simulation = Simulation(
        blocks,
        connections_pathsim,
        events=events,
        **solver_prms,  # Unpack solver parameters
        **extra_params,  # Unpack extra parameters
    )
    return simulation, duration


if __name__ == "__main__":
    app.run(port=8000, debug=True)
