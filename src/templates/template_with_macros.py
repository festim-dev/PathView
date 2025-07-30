import pathsim
import numpy as np
import matplotlib.pyplot as plt

from pathsim import Simulation, Connection
from pathsim.blocks import ODE, Source, Scope, Block, Pulse
from pathsim.solvers import RKBS32, RKF21
from pathsim.events import ZeroCrossingDown, ZeroCrossingUp

{# Import macros #}
{% from 'block_macros.py' import create_block, create_source_block, create_integrator_block, create_function_block, create_scope_block %}

# Create blocks
blocks, events = [], []

{% for node in nodes -%}
{%- if node["type"] == "integrator" -%}
{{ create_integrator_block(node) }}
{%- elif node["type"] == "function" -%}
{{ create_function_block(node) }}
{%- elif node["type"] == "scope" -%}
{{ create_scope_block(node) }}
{%- else -%}
{{ create_block(node) }}
{%- endif %}
blocks.append({{ node["var_name"] }})

{% endfor %}

# Create connections
connections = []

# Create simulation
my_simulation = Simulation(blocks, connections)

if __name__ == "__main__":
    my_simulation.run(50)
