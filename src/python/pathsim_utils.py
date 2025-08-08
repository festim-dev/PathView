import math
import numpy as np
from pathsim import Simulation, Connection
from pathsim.events import Event
import pathsim.solvers
from pathsim.blocks import (
    Scope,
    Block,
    Constant,
    Source,
    StepSource,
    PulseSource,
    Amplifier,
    Adder,
    Multiplier,
    Function,
    Delay,
    RNG,
    PID,
    Spectrum,
    Differentiator,
    Schedule,
)
import pathsim.blocks
import pathsim.events
from pathsim.blocks.noise import WhiteNoise, PinkNoise
from .custom_pathsim_blocks import (
    Process,
    Splitter,
    Splitter2,
    Splitter3,
    Bubbler,
    FestimWall,
    Integrator,
)
from flask import jsonify
import inspect


NAME_TO_SOLVER = {
    "SSPRK22": pathsim.solvers.SSPRK22,
    "SSPRK33": pathsim.solvers.SSPRK33,
    "RKF21": pathsim.solvers.RKF21,
}
map_str_to_object = {
    "constant": Constant,
    "source": Source,
    "stepsource": StepSource,
    "trianglewavesource": pathsim.blocks.sources.TriangleWaveSource,
    "sinusoidalsource": pathsim.blocks.sources.SinusoidalSource,
    "gaussianpulsesource": pathsim.blocks.sources.GaussianPulseSource,
    "sinusoidalphasenoisesource": pathsim.blocks.sources.SinusoidalPhaseNoiseSource,
    "chirpphasenoisesource": pathsim.blocks.sources.ChirpPhaseNoiseSource,
    "chirpsource": pathsim.blocks.sources.ChirpSource,
    "clocksource": pathsim.blocks.sources.ClockSource,
    "squarewavesource": pathsim.blocks.sources.SquareWaveSource,
    "pulsesource": PulseSource,
    "amplifier": Amplifier,
    "amplifier_reverse": Amplifier,
    "scope": Scope,
    "splitter2": Splitter2,
    "splitter3": Splitter3,
    "adder": Adder,
    "adder_reverse": Adder,
    "multiplier": Multiplier,
    "process": Process,
    "process_horizontal": Process,
    "rng": RNG,
    "pid": PID,
    "antiwinduppid": pathsim.blocks.AntiWindupPID,
    "integrator": Integrator,
    "differentiator": Differentiator,
    "function": Function,
    "function2to2": Function,
    "delay": Delay,
    "bubbler": Bubbler,
    "wall": FestimWall,
    "white_noise": WhiteNoise,
    "pink_noise": PinkNoise,
    "spectrum": Spectrum,
    "samplehold": pathsim.blocks.SampleHold,
    "comparator": pathsim.blocks.Comparator,
    "allpassfilter": pathsim.blocks.AllpassFilter,
    "butterworthlowpass": pathsim.blocks.ButterworthLowpassFilter,
    "butterworthhighpass": pathsim.blocks.ButterworthHighpassFilter,
    "butterworthbandpass": pathsim.blocks.ButterworthBandpassFilter,
    "butterworthbandstop": pathsim.blocks.ButterworthBandstopFilter,
    "fir": pathsim.blocks.FIR,
}

map_str_to_event = {
    "ZeroCrossingDown": pathsim.events.ZeroCrossingDown,
    "ZeroCrossingUp": pathsim.events.ZeroCrossingUp,
    "ZeroCrossing": pathsim.events.ZeroCrossing,
    "Schedule": pathsim.events.Schedule,
    "Condition": pathsim.events.Condition,
}


def find_node_by_id(node_id: str, nodes: list[dict]) -> dict:
    return next((node for node in nodes if node["id"] == node_id), None)


def find_block_by_id(block_id: str, blocks: list[Block]) -> Block:
    return next((block for block in blocks if block.id == block_id), None)


def make_global_variables(global_vars):
    # Validate and exec global variables so that they are usable later in this script.
    # Return a namespace dictionary containing the global variables
    global_namespace = globals().copy()

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
            exec(f"{var_name} = {var_value}", global_namespace)
            # Also store in local namespace for eval calls
            global_namespace[var_name] = eval(var_value, global_namespace)
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


def auto_block_construction(node: dict, eval_namespace: dict = None) -> Block:
    """
    Automatically constructs a block object from a node dictionary.

    Args:
        node: The node dictionary containing block information.
        eval_namespace: A namespace for evaluating expressions. Defaults to None.

    Raises:
        ValueError: If the block type is unknown or if there are issues with evaluation.

    Returns:
        The constructed block object.
    """

    if node["type"] not in map_str_to_object:
        raise ValueError(f"Unknown block type: {node['type']}")

    block_class = map_str_to_object[node["type"]]

    parameters = get_parameters_for_block_class(
        block_class, node, eval_namespace=eval_namespace
    )

    return block_class(**parameters)


def auto_event_construction(event_data: dict, eval_namespace: dict = None) -> Event:
    """
    Automatically constructs an event object from an event data dictionary.

    Args:
        event_data: The event data dictionary containing event information.
        eval_namespace: A namespace for evaluating expressions. Defaults to None.

    Raises:
        ValueError: If the event type is unknown or if there are issues with evaluation.

    Returns:
        The constructed event object.
    """

    if event_data["type"] not in map_str_to_event:
        raise ValueError(f"Unknown event type: {event_data['type']}")

    event_class = map_str_to_event[event_data["type"]]

    parameters = get_parameters_for_event_class(
        event_class, event_data, eval_namespace=eval_namespace
    )

    return event_class(**parameters)


def get_parameters_for_event_class(
    event_class: type, event_data: dict, eval_namespace: dict = None
):
    parameters_for_class = inspect.signature(event_class.__init__).parameters

    # Create a local namespace for executing the event functions
    # we make a copy so that event functions aren't overwritten
    event_namespace = eval_namespace.copy()

    parameters = {}
    for k, value in parameters_for_class.items():
        if k == "self":
            continue

        user_input = event_data[k]
        if user_input == "":
            if value.default is inspect._empty:
                raise ValueError(
                    f"expected parameter for {k} in {event_data['type']} ({event_data['name']})"
                )

            # make a copy of the default value
            if isinstance(value.default, (list, dict)):
                parameters[k] = value.default.copy()
            else:
                parameters[k] = value.default
        else:
            if k in ["func_evt", "func_act"]:
                # Execute func code if provided
                func_code = event_data[k]
                if not func_code:
                    raise ValueError(f"{k} code is required but not provided")

                if func_code in event_namespace:
                    parameters[k] = event_namespace[func_code]
                    # parameters[f"{k}_identifier"] = func_code
                    continue

                try:
                    exec(func_code, event_namespace)
                    if k not in event_namespace:
                        raise ValueError(f"{k} function not found after execution")
                except Exception as e:
                    raise ValueError(f"Error executing {k} code: {str(e)}")

                parameters[k] = event_namespace[k]
                # parameters[f"{k}_identifier"] = k
            else:
                parameters[k] = eval(user_input, event_namespace)
    return parameters


def get_parameters_for_block_class(block_class, node, eval_namespace):
    parameters_for_class = inspect.signature(block_class.__init__).parameters
    parameters = {}
    for k, value in parameters_for_class.items():
        if k == "self":
            continue
        # Skip 'operations' for Adder, as it is handled separately
        # https://github.com/festim-dev/fuel-cycle-sim/issues/73
        if k in ["operations"]:
            continue
        user_input = node["data"][k]
        if user_input == "":
            if value.default is inspect._empty:
                raise ValueError(
                    f"expected parameter for {k} in {node['type']} ({node['label']})"
                )

            # make a copy of the default value
            if isinstance(value.default, (list, dict)):
                parameters[k] = value.default.copy()
            else:
                parameters[k] = value.default
        else:
            parameters[k] = eval(user_input, eval_namespace)
    return parameters


def make_blocks(
    nodes: list[dict], eval_namespace: dict = None
) -> tuple[list[Block], list[Event]]:
    blocks, events = [], []

    for node in nodes:
        block = auto_block_construction(node, eval_namespace)
        if hasattr(block, "create_reset_events"):
            events.extend(block.create_reset_events())

        block.id = node["id"]
        block.label = node["data"]["label"]
        blocks.append(block)

    return blocks, events


def get_input_index(block: Block, edge: dict, block_to_input_index: dict) -> int:
    """
    Get the input index for a block based on the edge data.

    Args:
        block: The block object.
        edge: The edge dictionary containing source and target information.

    Returns:
        The input index for the block.
    """
    
    if edge["targetHandle"] is not None:
        if block._port_map_in:
            return block._port_map_in[edge["targetHandle"]]

    if isinstance(block, Function):
        return int(edge["targetHandle"].replace("target-", ""))
    else:
        # make sure that the target block has only one input port (ie. that targetHandle is None)
        assert edge["targetHandle"] is None, (
            f"Target block {block.id} has multiple input ports, "
            "but connection method hasn't been implemented."
        )
        return block_to_input_index[block]


# TODO here we could only pass edge and not block
def get_output_index(block: Block, edge: dict) -> int:
    """
    Get the output index for a block based on the edge data.

    Args:
        block: The block object.
        edge: The edge dictionary containing source and target information.

    Returns:
        The output index for the block.
    """
    if edge["sourceHandle"] is not None:
        if block._port_map_out:
            return block._port_map_out[edge["sourceHandle"]]

    if isinstance(block, Splitter):
        # Splitter outputs are always in order, so we can use the handle directly
        assert edge["sourceHandle"], edge
        output_index = int(edge["sourceHandle"].replace("source", "")) - 1
        if output_index >= block.n:
            raise ValueError(
                f"Invalid source handle '{edge['sourceHandle']}' for {edge}."
            )
        return output_index
    elif isinstance(block, Function):
        # Function outputs are always in order, so we can use the handle directly
        assert edge["sourceHandle"], edge
        return int(edge["sourceHandle"].replace("source-", ""))
    else:
        # make sure that the source block has only one output port (ie. that sourceHandle is None)
        assert edge["sourceHandle"] is None, (
            f"Source block {block.id} has multiple output ports, "
            "but connection method hasn't been implemented."
        )
        return 0


def make_connections(nodes, edges, blocks) -> list[Connection]:
    # Create connections based on the sorted edges to match beta order
    connections_pathsim = []

    # Process each node and its sorted incoming edges to create connections
    block_to_input_index = {b: 0 for b in blocks}

    scopes_without_labels = []

    for node in nodes:
        outgoing_edges = [edge for edge in edges if edge["source"] == node["id"]]
        outgoing_edges.sort(key=lambda x: x["target"])

        incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
        incoming_edges.sort(key=lambda x: x["source"])

        source_block = find_block_by_id(node["id"], blocks=blocks)

        for edge in outgoing_edges:
            target_block = find_block_by_id(edge["target"], blocks=blocks)
            output_index = get_output_index(source_block, edge)
            input_index = get_input_index(target_block, edge, block_to_input_index)

            # if it's a scope, add labels if not already present
            if isinstance(target_block, (Scope, Spectrum)):
                if target_block.labels == []:
                    scopes_without_labels.append(target_block)
                if target_block in scopes_without_labels:
                    label = node["data"]["label"]
                    if edge["sourceHandle"]:
                        label += f" ({edge['sourceHandle']})"
                    target_block.labels.append(label)
            print(f"Connecting {source_block.id} output {output_index} to {target_block.id} input {input_index}")
            connection = Connection(
                source_block[output_index],
                target_block[input_index],
            )
            connections_pathsim.append(connection)
            block_to_input_index[target_block] += 1

    return connections_pathsim


def make_events(events_data: list[dict], eval_namespace: dict = None) -> list[Event]:
    """
    Create a list of Event objects from the provided event data.

    Args:
        events_data: A list of dictionaries containing event information.
        eval_namespace: A namespace for evaluating expressions. Defaults to None.

    Returns:
        A list of Event objects.
    """
    if eval_namespace is None:
        eval_namespace = globals()

    events = []
    for event_data in events_data:
        event_type = event_data.get("type")
        event_class = map_str_to_event.get(event_type)

        if not event_class:
            raise ValueError(f"Unknown event type: {event_type}")

        event = auto_event_construction(event_data, eval_namespace)
        events.append(event)
    return events


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


def make_var_name(node: dict) -> str:
    """
    Create a variable name from the node label, ensuring it is a valid Python identifier.
    If the label contains invalid characters, they are replaced with underscores.
    If the variable name is not unique, a number is appended to make it unique.

    This is supposed to match the logic in NodeSidebar.jsx makeVarName function.
    """
    # Make a variable name from the label
    invalid_chars = set("!@#$%^&*()+=[]{}|;:'\",.-<>?/\\`~")
    base_var_name = node["data"]["label"].lower().replace(" ", "_")
    for char in invalid_chars:
        base_var_name = base_var_name.replace(char, "")

    # Make the variable name unique by appending a number if needed
    var_name = base_var_name
    var_name = f"{base_var_name}_{node['id']}"

    # Ensure the base variable name is a valid identifier
    if not var_name.isidentifier():
        var_name = f"var_{var_name}"
        if not var_name.isidentifier():
            raise ValueError(
                f"Variable name must be a valid identifier. {node['data']['label']} to {var_name}"
            )

    return var_name


def make_pathsim_model(graph_data: dict) -> tuple[Simulation, float]:
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    solver_prms = graph_data.get("solverParams", {})
    global_vars = graph_data.get("globalVariables", {})

    # Get the global variables namespace to use in eval calls
    global_namespace = make_global_variables(global_vars)

    # Create a combined namespace that includes built-in functions and global variables
    eval_namespace = globals().copy()
    eval_namespace.update(global_namespace)

    # Execute python code first to define any variables that blocks might need
    python_code = graph_data.get("pythonCode", "")
    if python_code:
        try:
            exec(python_code, eval_namespace)
        except Exception as e:
            return jsonify({"error": f"Error executing Python code: {str(e)}"}), 400

    solver_prms, extra_params, duration = make_solver_params(
        solver_prms, eval_namespace
    )

    # Create blocks
    blocks, events = make_blocks(nodes, eval_namespace)

    connections_pathsim = make_connections(nodes, edges, blocks)

    # Add a Scope block if none exists
    # This ensures that there is always a scope to collect outputs
    if not any(isinstance(block, Scope) for block in blocks):
        scope_default, connections_scope_def = make_default_scope(nodes, blocks)
        blocks.append(scope_default)
        connections_pathsim.extend(connections_scope_def)

    # Create additional events
    for node in nodes:
        var_name = make_var_name(node)
        eval_namespace[var_name] = find_block_by_id(node["id"], blocks)

    events += make_events(graph_data.get("events", []), eval_namespace)

    # Create the simulation
    simulation = Simulation(
        blocks,
        connections_pathsim,
        events=events,
        **solver_prms,  # Unpack solver parameters
        **extra_params,  # Unpack extra parameters
    )
    return simulation, duration
