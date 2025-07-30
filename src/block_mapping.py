"""Mapping from string names to pathsim block classes."""

from pathsim.blocks import (
    Scope,
    Constant,
    StepSource,
    PulseSource,
    Amplifier,
    Adder,
    Multiplier,
    Integrator,
    Function,
    Delay,
    RNG,
    PID,
)
from .custom_pathsim_blocks import Process, Splitter

map_str_to_object = {
    "constant": Constant,
    "stepsource": StepSource,
    "pulsesource": PulseSource,
    "amplifier": Amplifier,
    "amplifier_reverse": Amplifier,
    "scope": Scope,
    "splitter2": Splitter,
    "splitter3": Splitter,
    "adder": Adder,
    "adder_reverse": Adder,
    "multiplier": Multiplier,
    "process": Process,
    "process_horizontal": Process,
    "rng": RNG,
    "pid": PID,
    "integrator": Integrator,
    "function": Function,
    "delay": Delay,
}
