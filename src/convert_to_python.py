from jinja2 import Environment, FileSystemLoader
import json
import os
from inspect import signature

from .pathsim_utils import map_str_to_object, make_blocks
from pathsim import Connection
from pathsim.blocks import Scope
from .custom_pathsim_blocks import Process, Splitter


# TODO this is not needed...
def process_graph_data(json_file: str) -> dict:
    """Process the JSON graph data and prepare it for template rendering."""
    data = json.load(open(json_file))

    return process_graph_data_from_dict(data)


def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, "templates")

    environment = Environment(loader=FileSystemLoader(templates_dir))
    template = environment.get_template("template_with_macros.py")

    results_filename = os.path.join(current_dir, "..", "generated_script.py")

    # Process the graph data
    test_file_path = os.path.join(current_dir, "..", "saved_graphs", "test3.json")
    context = process_graph_data(test_file_path)

    # Render the template
    with open(results_filename, mode="w", encoding="utf-8") as results:
        results.write(template.render(context))
        print(f"... wrote {results_filename}")


def convert_graph_to_python_str(graph_data: dict) -> str:
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


def convert_graph_to_python(
    graph_data: dict, output_filename: str = "generated_script.py"
) -> str:
    """Convert graph data to Python script and return the generated code."""
    # Get the directory of this file to properly reference templates
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Render the template
    generated_code = convert_graph_to_python_str(graph_data)

    # Write to file
    output_path = os.path.join(current_dir, "..", output_filename)
    with open(output_path, mode="w", encoding="utf-8") as results:
        results.write(generated_code)

    return generated_code


# TODO this is a dubplicate of the function in backend.py
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

        block = next((b for b in blocks if b.id == node["id"]), None)

        for edge in outgoing_edges:
            target_block = next((b for b in blocks if b.id == edge["target"]), None)
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


def process_graph_data_from_dict(data: dict) -> dict:
    """Process graph data from a dictionary (same as process_graph_data but takes dict instead of file path)."""
    # Clean up labels for variable names
    data_with_var_names = data.copy()

    edges = data_with_var_names.get("edges", [])
    nodes = data_with_var_names["nodes"]
    for node in nodes:
        node["var_name"] = node["data"]["label"].lower().replace(" ", "_")
        node["class_name"] = map_str_to_object[node["type"]].__name__

        node["expected_arguments"] = signature(
            map_str_to_object[node["type"]]
        ).parameters
        if node["type"] == "scope":
            incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
            incoming_edges.sort(key=lambda x: x["source"])
            node["children"] = []
            for incoming_edge in incoming_edges:
                source_node = next(
                    (n for n in nodes if n["id"] == incoming_edge["source"])
                )

                # TODO take care of duplicated labels
                node["children"].append(source_node["data"]["label"])

    # edges
    blocks, events = make_blocks(nodes, edges)
    connections = make_connections(nodes, edges, blocks)

    # we can simply read the ports id from the actual pathsim connections
    for node in nodes:
        outgoing_edges = [edge for edge in edges if edge["source"] == node["id"]]
        outgoing_edges.sort(key=lambda x: x["target"])

        incoming_edges = [edge for edge in edges if edge["target"] == node["id"]]
        incoming_edges.sort(key=lambda x: x["source"])

        for edge in outgoing_edges:
            target_node = next((n for n in nodes if n["id"] == edge["target"]), None)

            # find corresponding connection
            connection = next(
                (
                    c
                    for c in connections
                    if c.source.block.id == node["id"]
                    and c.targets[0].block.id == edge["target"]
                ),
                None,
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

    return data_with_var_names


if __name__ == "__main__":
    main()
