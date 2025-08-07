from fuel_cycle_sim.pathsim_utils import make_pathsim_model
import json

import pytest

# find all json files in root example_graphs directory
from pathlib import Path

example_graphs_dir = Path("example_graphs")
all_examples_files = list(example_graphs_dir.glob("*.json"))


@pytest.mark.parametrize(
    "filename", all_examples_files, ids=[f.stem for f in all_examples_files]
)
def test_example(filename):
    """
    Test the example simulation defined in the given filename.
    """
    if "festim" in filename.stem.lower():
        try:
            import festim as F
        except ImportError:
            pytest.skip("Festim examples are not yet supported in this test suite.")

    with open(filename, "r") as f:
        graph_data = json.load(f)

    # Load the example simulation from the specified file
    my_simulation, duration = make_pathsim_model(graph_data)

    # Run the simulation
    my_simulation.run(duration)
