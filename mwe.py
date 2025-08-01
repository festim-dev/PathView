from src.custom_pathsim_blocks import FestimWall

from pathsim import Simulation, Connection
import pathsim.blocks
import numpy as np
import matplotlib.pyplot as plt


# Create blocks
blocks, events = [], []

# Create Festim wall
festim_wall = FestimWall(thickness=1, D_0=1, E_D=0, temperature=300, n_vertices=100)
source_c0 = pathsim.blocks.Constant(0)
source_cL = pathsim.blocks.Constant(1)

scope = pathsim.blocks.Scope(labels=["flux_0", "flux_L"])

blocks = [festim_wall, source_c0, source_cL, scope]

connections = [
    Connection(source_c0, festim_wall[0]),
    Connection(source_cL, festim_wall[1]),
    Connection(festim_wall[0], scope[0]),
    Connection(festim_wall[1], scope[1]),
]

simulation = Simulation(blocks=blocks, connections=connections, dt=0.005)
simulation.run(0.1)

scope.plot(marker="o")
plt.show()
