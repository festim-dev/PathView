from jinja2 import Environment, FileSystemLoader
import os
from inspect import signature

from .pathsim_utils import (
    map_str_to_object,
    make_blocks,
    make_connections,
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

    for node in nodes:
        # Make a variable name from the label
        invalid_chars = set("!@#$%^&*()+=[]{}|;:'\",.-<>?/\\`~")
        node["var_name"] = node["data"]["label"].lower().replace(" ", "_")
        for char in invalid_chars:
            node["var_name"] = node["var_name"].replace(char, "")

        assert node["var_name"].isidentifier(), (
            f"Variable name must be a valid identifier. {node['var_name']}"
        )

        # Add pathsim class name
        node["class_name"] = map_str_to_object[node["type"]].__name__

        # Add expected arguments
        node["expected_arguments"] = signature(
            map_str_to_object[node["type"]]
        ).parameters

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
    connections = make_connections(data["nodes"], data["edges"], blocks)

    # we can simply read the ports id from the actual pathsim connections
    for node in data["nodes"]:
        outgoing_edges = [
            edge for edge in data["edges"] if edge["source"] == node["id"]
        ]
        outgoing_edges.sort(key=lambda x: x["target"])

        for edge in outgoing_edges:
            target_node = next((n for n in data["nodes"] if n["id"] == edge["target"]))

            # find corresponding connection
            connection = next(
                (
                    c
                    for c in connections
                    if c.source.block.id == node["id"]
                    and c.targets[0].block.id == edge["target"]
                )
            )
            source_block_port = connection.source.ports
            assert len(connection.targets) == 1, (
                "Connection must have exactly one target port."
            )
            target_block_port = connection.targets[0].ports
            edge["source_var_name"] = node["var_name"]
            edge["target_var_name"] = target_node["var_name"]
            edge["source_port"] = str(source_block_port)
            edge["target_port"] = str(target_block_port)

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
