from src.backend import create_integrator, auto_block_construction, create_function
from src.custom_pathsim_blocks import Process, Splitter

import pathsim.blocks

import pytest


# Node templates with constructor parameters + label for each block type
NODE_TEMPLATES = {
    "constant": {"type": "constant", "data": {"value": "1.0", "label": "Constant"}},
    "stepsource": {
        "type": "stepsource",
        "data": {"amplitude": "1.0", "tau": "1.0", "label": "Step Source"},
    },
    "pulsesource": {
        "type": "pulsesource",
        "data": {"amplitude": "1.0", "tau": "1.0", "label": "Pulse Source"},
    },
    "amplifier": {"type": "amplifier", "data": {"gain": "2.0", "label": "Amplifier"}},
    "adder": {"type": "adder", "data": {"label": "Adder"}},
    "multiplier": {"type": "multiplier", "data": {"label": "Multiplier"}},
    "integrator": {
        "type": "integrator",
        "data": {"initial_value": "0.0", "label": "Integrator", "reset_times": ""},
    },
    "function": {
        "type": "function",
        "data": {"expression": "3*x**2", "label": "Function"},
    },
    "delay": {"type": "delay", "data": {"tau": "1.0", "label": "Delay"}},
    "rng": {"type": "rng", "data": {"seed": "42", "label": "RNG"}},
    "pid": {
        "type": "pid",
        "data": {"kp": "1.0", "ki": "0.0", "kd": "0.0", "label": "PID"},
    },
    "process": {
        "type": "process",
        "data": {
            "residence_time": "1.0",
            "ic": "0.0",
            "gen": "0.0",
            "label": "Process",
        },
    },
    "splitter2": {
        "type": "splitter2",
        "data": {"f1": "0.5", "f2": "0.5", "label": "Splitter 2"},
    },
    "splitter3": {
        "type": "splitter3",
        "data": {"f1": "1/3", "f2": "1/3", "f3": "1/3", "label": "Splitter 3"},
    },
    "scope": {"type": "scope", "data": {"label": "Scope"}},
}


@pytest.fixture
def node_factory():
    """
    Factory fixture that creates node dictionaries for different pathsim block types.

    Usage:
        def test_something(node_factory):
            integrator_node = node_factory("integrator", id="test_1")
            constant_node = node_factory("constant", id="test_2", data_overrides={"value": "5.0"})
    """

    def _create_node(block_type: str, id: str = "1", data_overrides: dict = None):
        if block_type not in NODE_TEMPLATES:
            available_types = list(NODE_TEMPLATES.keys())
            raise ValueError(
                f"Unknown block type: {block_type}. Available types: {available_types}"
            )

        # Start with template
        node = {
            "id": id,
            "type": block_type,
            "data": NODE_TEMPLATES[block_type]["data"].copy(),
        }

        # Apply any data overrides
        if data_overrides:
            node["data"].update(data_overrides)

        return node

    return _create_node


def test_create_integrator():
    node = {
        "data": {"initial_value": "", "label": "IV vial 1", "reset_times": ""},
        "id": "9",
        "type": "integrator",
    }
    integrator, events = create_integrator(node)

    assert isinstance(integrator, pathsim.blocks.Integrator)
    assert integrator.initial_value == 0
    for event in events:
        assert isinstance(event, pathsim.blocks.Schedule)


@pytest.mark.parametrize(
    "block_type,expected_class",
    [
        ("constant", pathsim.blocks.Constant),
        ("amplifier", pathsim.blocks.Amplifier),
        ("adder", pathsim.blocks.Adder),
        ("multiplier", pathsim.blocks.Multiplier),
        ("rng", pathsim.blocks.RNG),
        ("pid", pathsim.blocks.PID),
        ("process", Process),
        ("splitter2", Splitter),
        ("splitter3", Splitter),
    ],
)
def test_auto_block_construction(node_factory, block_type, expected_class):
    node = node_factory(block_type)
    block = auto_block_construction(node)
    assert isinstance(block, expected_class)


@pytest.mark.parametrize(
    "block_type,expected_class",
    [
        ("constant", pathsim.blocks.Constant),
        ("amplifier", pathsim.blocks.Amplifier),
        ("adder", pathsim.blocks.Adder),
        ("multiplier", pathsim.blocks.Multiplier),
        ("rng", pathsim.blocks.RNG),
        ("pid", pathsim.blocks.PID),
        ("process", Process),
        ("splitter2", Splitter),
        ("splitter3", Splitter),
    ],
)
def test_auto_block_construction_with_var(node_factory, block_type, expected_class):
    node = node_factory(block_type)
    # replace one data value with "2*var1"
    for k, v in node["data"].items():
        if k != "label":
            node["data"][k] = "2*var1"
            break
    block = auto_block_construction(node, eval_namespace={"var1": 5.5})
    assert isinstance(block, expected_class)


def test_create_function():
    node = {
        "data": {"expression": "3*x**2 + b", "label": "Function"},
        "id": "10",
        "type": "function",
    }
    block = create_function(node, eval_namespace={"b": 2.5})
    assert isinstance(block, pathsim.blocks.Function)
    assert block.func(2) == 3 * 2**2 + 2.5
