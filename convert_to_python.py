from jinja2 import Environment, FileSystemLoader

environment = Environment(loader=FileSystemLoader("templates/"))
template = environment.get_template("template.py")


results_filename = "generated_script.py"

import json

data = json.load(open("saved_graphs/test3.json"))

context = {
    "blocks": data["nodes"],
}

with open(results_filename, mode="w", encoding="utf-8") as results:
    results.write(template.render(context))
    print(f"... wrote {results_filename}")
