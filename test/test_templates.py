from src.convert_to_python import convert_graph_to_python_str


def test_nested_templates():
    """Test the nested template functionality."""
    # Create sample graph data
    sample_data = {
        "nodes": [
            {
                "id": "1",
                "type": "constant",
                "data": {
                    "label": "input_signal",
                    "value": "1.0",
                },
            },
            {
                "id": "2",
                "type": "integrator",
                "data": {
                    "label": "integrator_1",
                    "initial_value": "0.0",
                    "reset_times": "[10, 20]",
                },
            },
            {"id": "3", "type": "amplifier", "data": {"label": "amp_1", "gain": "2.0"}},
            {
                "id": "4",
                "type": "function",
                "data": {
                    "label": "func_block",
                    "expression": "x * 2 + 1",
                },
            },
            {
                "id": "5",
                "type": "scope",
                "data": {
                    "label": "scope_1",
                },
            },
        ],
        "edges": [
            {"source": "1", "target": "2", "id": "e1-2"},
            {"source": "2", "target": "3", "id": "e2-3"},
            {"source": "3", "target": "4", "id": "e3-4"},
            {"source": "3", "target": "5", "id": "e3-5"},
            {"source": "4", "target": "5", "id": "e4-5"},
        ],
    }

    # Process the data

    code = convert_graph_to_python_str(sample_data)
    print(code)


if __name__ == "__main__":
    test_nested_templates()
