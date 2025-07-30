from jinja2 import Environment, FileSystemLoader
import json
import os

from .block_mapping import map_str_to_object


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
    for block in data_with_var_names["nodes"]:
        block["var_name"] = block["data"]["label"].lower().replace(" ", "_")
        # remove label from data
        del block["data"]["label"]
        block["class_name"] = map_str_to_object[block["type"]].__name__
    return data_with_var_names


if __name__ == "__main__":
    main()
