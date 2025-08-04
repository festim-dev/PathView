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


def find_node_by_id(node_id: str, nodes: list[dict]) -> dict:
    return next((node for node in nodes if node["id"] == node_id), None)


def find_block_by_id(block_id: str, blocks: list[Block]) -> Block:
    return next((block for block in blocks if block.id == block_id), None)


def make_global_variables(global_vars):
    # Validate and exec global variables so that they are usable later in this script.
    # Return a namespace dictionary containing the global variables
    global_namespace = globals()

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
    if eval_namespace is None:
        eval_namespace = globals()

    if node["type"] not in map_str_to_object:
        raise ValueError(f"Unknown block type: {node['type']}")

    block_class = map_str_to_object[node["type"]]

    parameters = get_parameters_for_block_class(
        block_class, node, eval_namespace=eval_namespace
    )

    return block_class(**parameters)


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
    if hasattr(block, "name_to_input_port"):
        return block.name_to_input_port[edge["targetHandle"]]
    elif isinstance(block, Function):
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
    if hasattr(block, "name_to_output_port"):
        return block.name_to_output_port[edge["sourceHandle"]]
    elif isinstance(block, Splitter):
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

            connection = Connection(
                source_block[output_index],
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
    blocks, events = make_blocks(nodes, eval_namespace)

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
