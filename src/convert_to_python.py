from jinja2 import Environment, FileSystemLoader
import os
from inspect import signature

from pathsim.blocks import Scope, Function
from .custom_pathsim_blocks import (
    Process,
    Splitter,
    Bubbler,
    FestimWall,
)
from .pathsim_utils import (
    map_str_to_object,
    make_blocks,
    make_global_variables,
)


def convert_graph_to_python(graph_data: dict) -> str:
    """Convert graph data to a Python script as a string."""
    # Get the directory of this file to properly reference templates
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, "templates")

    environment = Environment(loader=FileSystemLoader(templates_dir))
    template = environment.get_template("template_with_macros.py")

    # Process the graph data
    context = process_graph_data_from_dict(graph_data)

    # Render the template
    return template.render(context)


def process_node_data(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """
    Given a list of node and edge data as dictionaries, process the nodes to create
    variable names, class names, and expected arguments for each node.

    Returns:
        The processed node data with variable names, class names, and expected arguments.
    """
    nodes = nodes.copy()
    used_var_names = set()

    for node in nodes:
        # Make a variable name from the label
        invalid_chars = set("!@#$%^&*()+=[]{}|;:'\",.-<>?/\\`~")
        base_var_name = node["data"]["label"].lower().replace(" ", "_")
        for char in invalid_chars:
            base_var_name = base_var_name.replace(char, "")

        # Ensure the base variable name is a valid identifier
        if not base_var_name.isidentifier():
            raise ValueError(
                f"Variable name must be a valid identifier. {node['data']['label']} to {base_var_name}"
            )

        # Make the variable name unique by appending a number if needed
        var_name = base_var_name
        counter = 1
        while var_name in used_var_names:
            var_name = f"{base_var_name}_{counter}"
            counter += 1

        node["var_name"] = var_name
        used_var_names.add(var_name)

        # Add pathsim class name
        block_class = map_str_to_object.get(node["type"])
        node["class_name"] = block_class.__name__
        node["module_name"] = block_class.__module__

        # Add expected arguments
        node["expected_arguments"] = signature(block_class).parameters

        # if it's a scope, find labels
        if node["type"] == "scope":
            incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
            incoming_edges.sort(key=lambda x: x["source"])
            node["labels"] = []
            for incoming_edge in incoming_edges:
                source_node = next(
                    (n for n in nodes if n["id"] == incoming_edge["source"])
                )

                # TODO take care of duplicated labels
                node["labels"].append(source_node["data"]["label"])
    return nodes


# TODO: this is effectively a duplicate of pathsim_utils.make_connections
# need to refactor
def make_edge_data(data: dict) -> list[dict]:
    """
    Process edges to add source/target variable names and ports.

    Does it by creating pathsim.blocks and Connections from the data with
    ``make_blocks`` and ``make_connections`` functions.

    Then, since the data (source/target blocks, ports) is already in the
    connections, we can simply read the ports id from the actual pathsim
    connections and add them to the edges.

    Args:
        data: The graph data containing "nodes" and "edges".

    Returns:
        The processed edges with source/target variable names and ports.
    """
    data = data.copy()

    # we need the namespace since we call make_blocks
    namespace = make_global_variables(data["globalVariables"])
    blocks, _ = make_blocks(data["nodes"], data["edges"], eval_namespace=namespace)

    # Process each node and its sorted incoming edges to create connections
    block_to_input_index = {b: 0 for b in blocks}
    for node in data["nodes"]:
        outgoing_edges = [
            edge for edge in data["edges"] if edge["source"] == node["id"]
        ]
        outgoing_edges.sort(key=lambda x: x["target"])

        block = next((b for b in blocks if b.id == node["id"]))

        for edge in outgoing_edges:
            target_block = next((b for b in blocks if b.id == edge["target"]))
            target_node = next((n for n in data["nodes"] if n["id"] == edge["target"]))
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
            elif isinstance(block, Bubbler):
                if edge["sourceHandle"] == "vial1":
                    output_index = 0
                elif edge["sourceHandle"] == "vial2":
                    output_index = 1
                elif edge["sourceHandle"] == "vial3":
                    output_index = 2
                elif edge["sourceHandle"] == "vial4":
                    output_index = 3
                elif edge["sourceHandle"] == "sample_out":
                    output_index = 4
                else:
                    raise ValueError(
                        f"Invalid source handle '{edge['sourceHandle']}' for {edge}."
                    )
            elif isinstance(block, FestimWall):
                if edge["sourceHandle"] == "flux_0":
                    output_index = 0
                elif edge["sourceHandle"] == "flux_L":
                    output_index = 1
                else:
                    raise ValueError(
                        f"Invalid source handle '{edge['sourceHandle']}' for {edge}."
                    )
            elif isinstance(block, Function):
                # Function outputs are always in order, so we can use the handle directly
                assert edge["sourceHandle"], edge
                output_index = int(edge["sourceHandle"].replace("source-", ""))
            else:
                # make sure that the source block has only one output port (ie. that sourceHandle is None)
                assert edge["sourceHandle"] is None, (
                    f"Source block {block.id} has multiple output ports, "
                    "but connection method hasn't been implemented."
                )
                output_index = 0

            if isinstance(target_block, Scope):
                input_index = target_block._connections_order.index(edge["id"])
            elif isinstance(target_block, Bubbler):
                if edge["targetHandle"] == "sample_in_soluble":
                    input_index = 0
                elif edge["targetHandle"] == "sample_in_insoluble":
                    input_index = 1
                else:
                    raise ValueError(
                        f"Invalid target handle '{edge['targetHandle']}' for {edge}."
                    )
            elif isinstance(target_block, FestimWall):
                if edge["targetHandle"] == "c_0":
                    input_index = 0
                elif edge["targetHandle"] == "c_L":
                    input_index = 1
                else:
                    raise ValueError(
                        f"Invalid target handle '{edge['targetHandle']}' for {edge}."
                    )
            elif isinstance(target_block, Function):
                # Function inputs are always in order, so we can use the handle directly
                input_index = int(edge["targetHandle"].replace("target-", ""))
            else:
                # make sure that the target block has only one input port (ie. that targetHandle is None)
                assert edge["targetHandle"] is None, (
                    f"Target block {target_block.id} has multiple input ports, "
                    "but connection method hasn't been implemented."
                )
                input_index = block_to_input_index[target_block]

            edge["source_var_name"] = node["var_name"]
            edge["target_var_name"] = target_node["var_name"]
            edge["source_port"] = f"[{output_index}]"
            edge["target_port"] = f"[{input_index}]"
            block_to_input_index[target_block] += 1

    return data["edges"]


def process_graph_data_from_dict(data: dict) -> dict:
    """
    Process graph data from a dictionary.

    Adds variable names, class names, and expected arguments to nodes,
    and processes edges to include source/target variable names and ports.

    This processed data can then be more easily used to generate Python code.
    """
    data = data.copy()

    # Process nodes to create variable names and class names
    data["nodes"] = process_node_data(data["nodes"], data["edges"])

    # Process to add source/target variable names to edges + ports
    data["edges"] = make_edge_data(data)

    return data
