import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly
import json as plotly_json
import inspect
import io
from contextlib import redirect_stdout, redirect_stderr

from .convert_to_python import convert_graph_to_python
from .pathsim_utils import make_pathsim_model, map_str_to_object
from pathsim.blocks import Scope, Spectrum

# Import pathsim_utils to share eval_namespace
from . import pathsim_utils

# Sphinx imports for docstring processing
from docutils.core import publish_parts


def docstring_to_html(docstring):
    """Convert a Python docstring to HTML using docutils (like Sphinx does)."""
    if not docstring:
        return "<p>No documentation available.</p>"

    try:
        # Use docutils to convert reStructuredText to HTML
        # This is similar to what Sphinx does internally
        overrides = {
            "input_encoding": "utf-8",
            "doctitle_xform": False,
            "initial_header_level": 2,
        }

        parts = publish_parts(
            source=docstring, writer_name="html", settings_overrides=overrides
        )

        # Return just the body content (without full HTML document structure)
        html_content = parts["body"]

        # Clean up the HTML a bit for better display in the sidebar
        html_content = html_content.replace('<div class="document">', "<div>")

        return html_content

    except Exception as e:
        # Fallback in case of any parsing errors
        import html

        escaped = html.escape(docstring)
        return f"<pre>Error parsing docstring: {str(e)}\n\n{escaped}</pre>"


# Configure Flask app for Cloud Run
app = Flask(__name__, static_folder="../dist", static_url_path="")

# Configure CORS based on environment
if os.getenv("FLASK_ENV") == "production":
    # Production: Allow Cloud Run domains and common domains
    CORS(
        app,
        resources={
            r"/*": {
                "origins": ["*"],  # Allow all origins for Cloud Run
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )
else:
    # Development: Only allow localhost
    CORS(
        app,
        resources={
            r"/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}
        },
        supports_credentials=True,
    )


# Creates directory for saved graphs
SAVE_DIR = "saved_graphs"
os.makedirs(SAVE_DIR, exist_ok=True)


# Serve React frontend for production
@app.route("/")
def serve_frontend():
    """Serve the React frontend in production."""
    if os.getenv("FLASK_ENV") == "production":
        return app.send_static_file("index.html")
    else:
        return jsonify({"message": "Fuel Cycle Simulator API", "status": "running"})


# Health check endpoint for Cloud Run
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify(
        {"status": "healthy", "message": "Fuel Cycle Simulator Backend is running"}
    ), 200


# returns default values for parameters of a node
@app.route("/default-values/<string:node_type>", methods=["GET"])
def get_default_values(node_type):
    try:
        if node_type not in map_str_to_object:
            return jsonify({"error": f"Unknown node type: {node_type}"}), 400

        block_class = map_str_to_object[node_type]
        parameters_for_class = inspect.signature(block_class.__init__).parameters
        default_values = {}
        for param in parameters_for_class:
            if param != "self":  # Skip 'self' parameter
                default_value = parameters_for_class[param].default
                if default_value is inspect._empty:
                    default_values[param] = None  # Handle empty defaults
                else:
                    default_values[param] = default_value
                    # check if default value is serializable to JSON
                    if not isinstance(
                        default_value, (int, float, str, bool, list, dict)
                    ):
                        # Attempt to convert to JSON serializable type
                        try:
                            default_values[param] = json.dumps(default_value)
                        except TypeError:
                            # If conversion fails, set to a string 'default'
                            default_values[param] = "default"
        return jsonify(default_values)
    except Exception as e:
        return jsonify(
            {"error": f"Could not get default values for {node_type}: {str(e)}"}
        ), 400


@app.route("/get-docs/<string:node_type>", methods=["GET"])
def get_docs(node_type):
    try:
        if node_type not in map_str_to_object:
            return jsonify({"error": f"Unknown node type: {node_type}"}), 400

        block_class = map_str_to_object[node_type]
        docstring = inspect.getdoc(block_class)

        # If no docstring, provide a basic description
        if not docstring:
            docstring = f"No documentation available for {node_type}."

        # Convert docstring to HTML using docutils/Sphinx-style processing
        html_content = docstring_to_html(docstring)

        return jsonify(
            {
                "docstring": docstring,  # Keep original for backwards compatibility
                "html": html_content,  # New HTML version
            }
        )
    except Exception as e:
        return jsonify({"error": f"Could not get docs for {node_type}: {str(e)}"}), 400


# Function to save graphs
@app.route("/save", methods=["POST"])
def save_graph():
    data = request.json
    filename = data.get(
        "filename", "file_1"
    )  # sets file_1 as default filename if not provided
    graph_data = data.get("graph")

    # Enforces .json extension and valid filenames
    valid_name = f"{filename}.json" if not filename.endswith(".json") else filename
    file_path = os.path.join(SAVE_DIR, valid_name)

    with open(file_path, "w") as f:
        json.dump(graph_data, f, indent=2)

    return jsonify({"message": f"Graph saved as {valid_name}"})


# Function to load saved graphs
@app.route("/load", methods=["POST"])
def load_graph():
    data = request.json
    filename = data.get("filename")
    validname = filename if not filename.endswith(".json") else filename[:-5]
    filepath = os.path.join(SAVE_DIR, f"{validname}.json")

    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    with open(filepath, "r") as f:
        graph_data = json.load(f)

    return jsonify(graph_data)


# Function to convert graph to Python script
@app.route("/convert-to-python", methods=["POST"])
def convert_to_python():
    try:
        data = request.json
        graph_data = data.get("graph")

        if not graph_data:
            return jsonify({"error": "No graph data provided"}), 400

        # Generate the Python script directly using the imported function
        script_content = convert_graph_to_python(graph_data)

        return jsonify(
            {
                "success": True,
                "script": script_content,
                "message": "Python script generated successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


# Helper function to extract CSV payload from scopes
def make_csv_payload(scopes):
    csv_payload = {"time": [], "series": {}}

    max_len = 0
    for scope in scopes:
        time, values = scope.read()
        max_len = max(max_len, len(time))
        csv_payload["time"] = time.tolist()
        for i, series in enumerate(values):
            label = scope.labels[i] if i < len(scope.labels) else f"{scope.label} {i}"
            csv_payload["series"][label] = series.tolist()

    return csv_payload


# Function to convert graph to pathsim and run simulation
@app.route("/run-pathsim", methods=["POST"])
def run_pathsim():
    try:
        data = request.json
        graph_data = data.get("graph")
        if not graph_data:
            return jsonify({"error": "No graph data provided"}), 400

        my_simulation, duration = make_pathsim_model(graph_data)

        # Run the simulation
        my_simulation.run(duration)

        # Generate the plot
        scopes = [block for block in my_simulation.blocks if isinstance(block, Scope)]
        spectra = [
            block for block in my_simulation.blocks if isinstance(block, Spectrum)
        ]

        # FIXME right now only the scopes are converted to CSV
        # extra work is needed since spectra and scopes don't share the same x axis
        csv_payload = make_csv_payload(scopes)

        fig = make_subplots(
            rows=len(scopes) + len(spectra),
            cols=1,
            shared_xaxes=False,
            subplot_titles=[scope.label for scope in scopes]
            + [spec.label for spec in spectra],
            vertical_spacing=0.2,
        )

        # make scope plots
        for i, scope in enumerate(scopes):
            time, data = scope.read()

            for p, d in enumerate(data):
                lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
                if isinstance(scope, Spectrum):
                    d = abs(d)
                fig.add_trace(
                    go.Scatter(x=time, y=d, mode="lines", name=lb), row=i + 1, col=1
                )

            fig.update_xaxes(title_text="Time", row=len(scopes), col=1)

        # make spectrum plots
        for i, spec in enumerate(spectra):
            time, data = spec.read()

            for p, d in enumerate(data):
                lb = spec.labels[p] if p < len(spec.labels) else f"port {p}"
                d = abs(d)
                fig.add_trace(
                    go.Scatter(x=time, y=d, mode="lines", name=lb),
                    row=len(scopes) + i + 1,
                    col=1,
                )
            fig.update_xaxes(title_text="Frequency", row=len(scopes) + i + 1, col=1)

        fig.update_layout(
            height=400 * (len(scopes) + len(spectra)), hovermode="x unified"
        )

        # Convert plot to JSON
        plot_data = plotly_json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

        return jsonify(
            {
                "success": True,
                "plot": plot_data,
                "csv_data": csv_payload,
                "message": "Pathsim simulation completed successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


# Global namespace for user-defined variables and functions
eval_namespace = {}


@app.route("/execute-python", methods=["POST"])
def execute_python():
    """Execute Python code and update the global eval_namespace with any new variables/functions."""
    global eval_namespace

    try:
        data = request.json
        code = data.get("code", "")

        if not code.strip():
            return jsonify({"success": False, "error": "No code provided"}), 400

        # Create a temporary namespace that includes current eval_namespace
        temp_namespace = eval_namespace.copy()
        temp_namespace.update(globals())

        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        # Track variables before execution
        vars_before = set(temp_namespace.keys())

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, temp_namespace)

            # Capture any output
            output = stdout_capture.getvalue()
            error_output = stderr_capture.getvalue()

            if error_output:
                return jsonify({"success": False, "error": error_output}), 400

            # Find new variables and functions
            vars_after = set(temp_namespace.keys())
            new_vars = vars_after - vars_before

            # Filter out built-ins and modules, keep user-defined items
            user_variables = {}
            user_functions = []

            for var_name in new_vars:
                if not var_name.startswith("__"):
                    value = temp_namespace[var_name]
                    if callable(value) and hasattr(value, "__name__"):
                        user_functions.append(var_name)
                        # Add function to eval_namespace
                        eval_namespace[var_name] = value
                    else:
                        # Try to serialize the value for display
                        try:
                            if isinstance(value, (int, float, str, bool, list, dict)):
                                user_variables[var_name] = value
                            else:
                                user_variables[var_name] = str(value)
                            # Add variable to eval_namespace
                            eval_namespace[var_name] = value
                        except Exception:
                            user_variables[var_name] = (
                                f"<{type(value).__name__} object>"
                            )
                            eval_namespace[var_name] = value

            return jsonify(
                {
                    "success": True,
                    "output": output if output else None,
                    "variables": user_variables,
                    "functions": user_functions,
                    "message": f"Executed successfully. Added {len(user_variables)} variables and {len(user_functions)} functions to namespace.",
                }
            )

        except SyntaxError as e:
            return jsonify({"success": False, "error": f"Syntax Error: {str(e)}"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"Runtime Error: {str(e)}"}), 400

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


@app.route("/get-eval-namespace", methods=["GET"])
def get_eval_namespace():
    """Get the current eval_namespace for debugging/inspection."""
    try:
        # Create a serializable version of the namespace
        serializable_namespace = {}

        for key, value in eval_namespace.items():
            if callable(value):
                serializable_namespace[key] = f"<function {key}>"
            else:
                try:
                    if isinstance(value, (int, float, str, bool, list, dict)):
                        serializable_namespace[key] = value
                    else:
                        serializable_namespace[key] = str(value)
                except Exception:
                    serializable_namespace[key] = f"<{type(value).__name__} object>"

        return jsonify({"success": True, "namespace": serializable_namespace})
    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Error retrieving namespace: {str(e)}"}
        ), 500


@app.route("/clear-eval-namespace", methods=["POST"])
def clear_eval_namespace():
    """Clear the eval_namespace."""
    global eval_namespace
    try:
        eval_namespace.clear()
        return jsonify(
            {"success": True, "message": "Eval namespace cleared successfully."}
        )
    except Exception as e:
        return jsonify(
            {"success": False, "error": f"Error clearing namespace: {str(e)}"}
        ), 500


# Catch-all route for React Router (SPA routing)
@app.route("/<path:path>")
def catch_all(path):
    """Serve React app for all routes in production (for client-side routing)."""
    if os.getenv("FLASK_ENV") == "production":
        return app.send_static_file("index.html")
    else:
        return jsonify({"error": "Route not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") != "production")
