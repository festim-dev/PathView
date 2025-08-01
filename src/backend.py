import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly
import json as plotly_json

from .convert_to_python import convert_graph_to_python
from .pathsim_utils import make_pathsim_model
from pathsim.blocks import Scope

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

        if len(scopes) == 1:
            # Single subplot case
            fig = go.Figure()
            scope = scopes[0]
            time, data = scope.read()

            for p, d in enumerate(data):
                lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
                fig.add_trace(go.Scatter(x=time, y=d, mode="lines", name=lb))

            fig.update_layout(
                title=scope.label,
                xaxis_title="Time",
                yaxis_title="Value",
                hovermode="x unified",
            )
        else:
            # Multiple subplots case
            fig = make_subplots(
                rows=len(scopes),
                cols=1,
                shared_xaxes=True,
                subplot_titles=[scope.label for scope in scopes],
                vertical_spacing=0.1,
            )

            for i, scope in enumerate(scopes):
                time, data = scope.read()

                for p, d in enumerate(data):
                    lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
                    fig.add_trace(
                        go.Scatter(x=time, y=d, mode="lines", name=lb), row=i + 1, col=1
                    )

            fig.update_layout(height=400 * len(scopes), hovermode="x unified")
            fig.update_xaxes(title_text="Time", row=len(scopes), col=1)

        # Convert plot to JSON
        plot_data = plotly_json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

        return jsonify(
            {
                "success": True,
                "plot": plot_data,
                "message": "Pathsim simulation completed successfully",
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


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
