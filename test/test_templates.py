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
        ]
    }

    # Process the data

    code = convert_graph_to_python_str(sample_data)
    print(code)


if __name__ == "__main__":
    test_nested_templates()
