import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime


# app = Flask(__name__)
# CORS(app, supports_credentials=True)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# Function to compute functions in the nodes
@app.route('/compute', methods=['POST'])
def compute():
    data = request.json
    node_id = data.get('id')
    params = data.get('params', {})
    incoming_outputs = data.get('incomingOutputs', [])

    # Convert parameters to floats
    values = []
    for val in params.values():
        try:
            values.append(float(val))
        except ValueError:
            return jsonify({'id': node_id, 'output': 'Invalid input'})

    # Add outputs from incoming nodes
    for val in incoming_outputs:
        try:
            values.append(float(val))
        except ValueError:
            continue  

    total = sum(values)

    return jsonify({'id': node_id, 'output': total})

# Creates directory for saved graphs
SAVE_DIR = "saved_graphs"
os.makedirs(SAVE_DIR, exist_ok=True)

# Function to save graphs
@app.route('/save', methods=['POST'])
def save_graph():
    data = request.json
    filename = data.get('filename', 'file_1')  # sets file_1 as default filename if not provided
    graph_data = data.get('graph')

    # Enforces .json extension and valid filenames
    valid_name = f"{filename}.json" if not filename.endswith('.json') else filename
    file_path = os.path.join(SAVE_DIR, valid_name)

    with open(file_path, 'w') as f:
        json.dump(graph_data, f, indent=2)

    return jsonify({'message': f'Graph saved as {valid_name}'})

if __name__ == '__main__':
    app.run(port=8000, debug=True)
