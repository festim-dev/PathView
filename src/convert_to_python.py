from jinja2 import Environment, FileSystemLoader
import json
import os


def process_graph_data(json_file: str) -> dict:
    """Process the JSON graph data and prepare it for template rendering."""
    data = json.load(open(json_file))

    return process_graph_data_from_dict(data)


def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, "templates")

    environment = Environment(loader=FileSystemLoader(templates_dir))
    template = environment.get_template("template.py")

    results_filename = os.path.join(current_dir, "..", "generated_script.py")

    # Process the graph data
    test_file_path = os.path.join(current_dir, "..", "saved_graphs", "test3.json")
    context = process_graph_data(test_file_path)

    # Render the template
    with open(results_filename, mode="w", encoding="utf-8") as results:
        results.write(template.render(context))
        print(f"... wrote {results_filename}")


def convert_graph_to_python(
    graph_data: dict, output_filename: str = "generated_script.py"
) -> str:
    """Convert graph data to Python script and return the generated code."""
    # Get the directory of this file to properly reference templates
    current_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(current_dir, "templates")

    environment = Environment(loader=FileSystemLoader(templates_dir))
    template = environment.get_template("template.py")

    # Process the graph data
    context = process_graph_data_from_dict(graph_data)

    # Render the template
    generated_code = template.render(context)

    # Write to file
    output_path = os.path.join(current_dir, "..", output_filename)
    with open(output_path, mode="w", encoding="utf-8") as results:
        results.write(generated_code)

    return generated_code


def process_graph_data_from_dict(data: dict) -> dict:
    """Process graph data from a dictionary (same as process_graph_data but takes dict instead of file path)."""
    # Clean up labels for variable names
    for block in data["nodes"]:
        block["data"]["label"] = block["data"]["label"].lower().replace(" ", "_")

    def find_node_by_id(node_id: str) -> dict:
        for node in data["nodes"]:
            if node["id"] == node_id:
                return node
        return None

    # Process each node to determine its incoming connections and betas
    processed_blocks = []

    for node in data["nodes"]:
        # Find all incoming edges to this node
        incoming_edges = [
            edge for edge in data["edges"] if edge["target"] == node["id"]
        ]

        # Sort incoming edges by source id to ensure consistent ordering
        incoming_edges.sort(key=lambda x: x["source"])

        # Calculate transfer fractions and source blocks for this node
        transfer_fractions = []
        source_block_labels = []

        for edge in incoming_edges:
            source_node = find_node_by_id(edge["source"])
            outgoing_edges = [
                edge for edge in data["edges"] if edge["source"] == source_node["id"]
            ]
            f = 1 / len(outgoing_edges)  # default transfer fraction split equally

            # Create transfer fraction variable name
            f_var_name = f"f_{source_node['data']['label']}_{node['data']['label']}"

            transfer_fractions.append(
                {
                    "var_name": f_var_name,
                    "value": f,
                    "source_label": source_node["data"]["label"],
                    "target_label": node["data"]["label"],
                    "source_has_tau": source_node["data"]["residence_time"] != "",
                }
            )
            source_block_labels.append(source_node["data"]["label"])

        # Create processed block info
        processed_block = {
            "id": node["id"],
            "data": node["data"],
            "transfer_fractions": transfer_fractions,
            "source_block_labels": source_block_labels,
            "incoming_edges": incoming_edges,
        }
        processed_blocks.append(processed_block)

    # Collect all transfer fractions for global variable generation
    all_transfer_fractions = []
    for block in processed_blocks:
        all_transfer_fractions.extend(block["transfer_fractions"])

    # Create connection data with proper indexing
    connection_data = []
    next_outputs = {block["data"]["label"]: 0 for block in processed_blocks}

    for edge in data["edges"]:
        source_label = find_node_by_id(edge["source"])["data"]["label"]
        target_label = find_node_by_id(edge["target"])["data"]["label"]
        target_input_index = next_outputs[target_label]

        connection_data.append(
            {
                "source": source_label,
                "target": target_label,
                "target_input_index": target_input_index,
            }
        )

        next_outputs[target_label] += 1

    return {
        "blocks": processed_blocks,
        "connection_data": connection_data,
        "transfer_fractions": all_transfer_fractions,
        "find_node_by_id": find_node_by_id,
    }


if __name__ == "__main__":
    main()
