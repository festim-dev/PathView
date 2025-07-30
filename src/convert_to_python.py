from jinja2 import Environment, FileSystemLoader
import json
import os
from inspect import signature

from .pathsim_utils import (
    map_str_to_object,
    make_blocks,
    make_connections,
    make_global_variables,
)
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


def process_graph_data_from_dict(data: dict) -> dict:
    """Process graph data from a dictionary (same as process_graph_data but takes dict instead of file path)."""
    # Clean up labels for variable names
    data_with_var_names = data.copy()

    edges = data_with_var_names.get("edges", [])
    nodes = data_with_var_names["nodes"]
    for node in nodes:
        invalid_chars = set("!@#$%^&*()+=[]{}|;:'\",.-<>?/\\`~")
        node["var_name"] = node["data"]["label"].lower().replace(" ", "_")
        for char in invalid_chars:
            node["var_name"] = node["var_name"].replace(char, "")

        assert node["var_name"].isidentifier(), (
            f"Variable name must be a valid identifier. {node['var_name']}"
        )
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
    namespace = make_global_variables(data_with_var_names["globalVariables"])
    blocks, events = make_blocks(nodes, edges, eval_namespace=namespace)
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
