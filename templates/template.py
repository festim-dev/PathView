import pathsim

from pathsim import Simulation, Connection
from pathsim.blocks import ODE, Source, Scope, Block, Pulse
from pathsim.solvers import RKBS32, RKF21
from pathsim.events import ZeroCrossingDown, ZeroCrossingUp

class Process(ODE):
    def __init__(self, alpha=0, betas=[], gen=0, ic=0, name=None):
        self.name = name
        super().__init__(
            func=lambda x, u, t: alpha * x
            + sum(_u * _b for _u, _b in zip(u, betas))
            + gen,
            jac=lambda x, u, t: alpha,
            initial_value=ic,
        )

{% for block in blocks %}
{{ block["data"]["label"].lower().replace(" ", "_") }} = Process(name="{{block["data"]["label"].lower().replace(" ", "_")}}")
{% endfor %}
