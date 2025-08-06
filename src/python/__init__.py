"""
Fuel Cycle Simulation Package

A Python package for fuel cycle simulation with pathsim integration.
"""

# change this to automated versioning if needed
__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

# Import main functions for easy access
from .pathsim_utils import make_pathsim_model, map_str_to_object
from .convert_to_python import convert_graph_to_python

# Define what gets exported when someone does "from python import *"
__all__ = [
    "make_pathsim_model",
    "map_str_to_object",
    "convert_graph_to_python",
]
