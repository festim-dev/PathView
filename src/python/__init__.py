"""
Fuel Cycle Simulation Package

A Python package for fuel cycle simulation with pathsim integration.
"""

from importlib import metadata

try:
    __version__ = metadata.version("fuel_cycle_sim")
except Exception:
    __version__ = "unknown"

# Import main functions for easy access
from .pathsim_utils import make_pathsim_model, map_str_to_object
from .convert_to_python import convert_graph_to_python

# Define what gets exported when someone does "from python import *"
__all__ = [
    "make_pathsim_model",
    "map_str_to_object",
    "convert_graph_to_python",
]
