from jinja2 import Environment, FileSystemLoader


environment = Environment(loader=FileSystemLoader("templates/"))
template = environment.get_template("template.py")


results_filename = "generated_script.py"

import json

data = json.load(open("saved_graphs/test3.json"))

for block in data["nodes"]:
    block["data"]["label"] = block["data"]["label"].lower().replace(" ", "_")


def find_node_by_id(node_id: str) -> dict:
    for node in data["nodes"]:
        if node["id"] == node_id:
            return node
    return None


context = {
    "blocks": data["nodes"],
    "connections": data["edges"],
    "find_node_by_id": find_node_by_id,
}

with open(results_filename, mode="w", encoding="utf-8") as results:
    results.write(template.render(context))
    print(f"... wrote {results_filename}")
