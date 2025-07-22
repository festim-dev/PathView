import pathsim
import numpy as np
import matplotlib.pyplot as plt

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


# Create Process blocks
{% for block in blocks -%}
{% if block["data"]["residence_time"] != "" -%}
tau_{{ block["data"]["label"] }} = {{ block["data"]["residence_time"] }}
{% endif -%}
{%- endfor %}

{% for tf in transfer_fractions -%}
{{ tf["var_name"] }} = {{ tf["value"] }}
{% endfor %}

{% for block in blocks %}
{{ block["data"]["label"] }} = Process(
    name="{{ block["data"]["label"] }}",
    alpha={% if block["data"]["residence_time"] != "" %}-1 / tau_{{ block["data"]["label"] }}{% else %}0{% endif %},
    betas=[{% for tf in block["transfer_fractions"] %}{{ tf["var_name"] }} / tau_{{ tf["source_label"] }}{% if not loop.last %}, {% endif %}{% endfor %}],
    gen={% if block["data"]["source_term"] != "" %}{{ block["data"]["source_term"] }}{% else %}0{% endif %},
    ic={% if block["data"]["initial_value"] != "" %}{{ block["data"]["initial_value"] }}{% else %}0{% endif %},
)
{% endfor %}

# Create Scope block
scope = Scope(
    labels=[{% for block in blocks %}"{{ block["data"]["label"] }}"{% if not loop.last %}, {% endif %}{% endfor %}],
)

# Create blocks list
blocks = [
    {% for block in blocks %}{{ block["data"]["label"] }},
    {% endfor %}scope,
]

# Create connections
connections = [
    # Process-to-process connections
{% for conn in connection_data %}    Connection({{ conn["source"] }}, {{ conn["target"] }}[{{ conn["target_input_index"] }}]),
{% endfor %}
    # Process-to-scope connections
{% for block in blocks %}    Connection({{ block["data"]["label"] }}, scope[{{ loop.index0 }}]),
{% endfor %}]

# Create simulation
my_simulation = Simulation(blocks, connections, log=False)


if __name__ == "__main__":
    my_simulation.run(50)
    
    my_simulation.save("simple.mdl")
    
    fig, ax = scope.plot()
    
    plt.show()
    plt.show()