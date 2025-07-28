import json

import matplotlib.pyplot as plt

from pathsim import Simulation, Connection
import pathsim.solvers
from pathsim.blocks import (
    Scope,
    Constant,
    Integrator,
    Schedule,
)


nodes = [
    {
        "id": "0",
        "type": "constant",
        "data": {"label": "constant 0", "value": "1"},
    },
    {
        "id": "1",
        "type": "integrator",
        "data": {"label": "integrator 1", "initial_value": ""},
    },
    {
        "id": "2",
        "type": "scope",
        "data": {"label": "scope 2"},
    },
]

blocks = []
events = []

for node in nodes:
    if node["type"] == "constant":
        block = Constant(value=eval(node["data"]["value"]))
    elif node["type"] == "scope":
        block = Scope()
    elif node["type"] == "integrator":
        block = Integrator(
            initial_value=eval(node["data"]["initial_value"])
            if node["data"].get("initial_value") and node["data"]["initial_value"] != ""
            else 0.0,
        )
        # add events to reset integrator if needed
        # if node["data"]["reset_times"] != "":

        def reset_itg(t):
            block.reset()

        reset_times = [10]  # eval(node["data"]["reset_times"])
        for t in reset_times:
            print(f"Adding reset event at {t}")
            print(block)
            events.append(Schedule(t_start=t, t_end=t, func_act=reset_itg))
    blocks.append(block)

# Create connections based on the sorted edges to match beta order
connections_pathsim = []

# Create the simulation
my_simulation = Simulation(
    blocks,
    connections_pathsim,
    events=events,
)

# Run the simulation
my_simulation.run(50)

my_simulation.save("mwe.mdl")
# Generate the plot
scopes = [block for block in blocks if isinstance(block, Scope)]
fig, axs = plt.subplots(len(scopes), sharex=True, figsize=(10, 5 * len(scopes)))
for i, scope in enumerate(scopes):
    plt.sca(axs[i] if len(scopes) > 1 else axs)
    # scope.plot()
    time, data = scope.read()
    # plot the recorded data
    for p, d in enumerate(data):
        lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
        plt.plot(time, d, label=lb)
    plt.legend()

plt.scatter([0], [0], color="red")

plt.show()
