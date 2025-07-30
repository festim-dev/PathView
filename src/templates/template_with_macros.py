import pathsim
from pathsim import Simulation, Connection
import numpy as np
import matplotlib.pyplot as plt

{# Import macros #}
{% from 'block_macros.py' import create_block, create_source_block, create_integrator_block, create_function_block, create_scope_block, create_connections %}

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

{{ create_connections(edges) }}

# Create simulation
my_simulation = Simulation(
    blocks,
    connections,
    events=events,
    Solver=pathsim.solvers.{{ solverParams["Solver"] }},
    dt={{ solverParams["dt"] }},
    dt_max={{ solverParams["dt_max"] }},
    dt_min={{ solverParams["dt_min"] }},
    iterations_max={{ solverParams["iterations_max"] }},
    log={{ solverParams["log"].capitalize() }},
    tolerance_fpi={{ solverParams["tolerance_fpi"] }},
    **{{ solverParams["extra_params"] }},
)

if __name__ == "__main__":
    my_simulation.run({{ solverParams["simulation_duration"] }})
