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
{{ block["data"]["label"] }} = Process(
    name="{{block["data"]["label"]}}",
    alpha={% if block.data.residence_time != "" %}-1 / float({{block["data"]["residence_time"]}}){% else %}0{% endif %},
    betas=[],  # TODO implement this
    gen={% if block.data.source_term != "" %}{{block["data"]["source_term"]}}{% else %}0{% endif %},
    ic={% if block.data.initial_value != "" %}{{block["data"]["initial_value"]}}{% else %}0{% endif %},
)
{% endfor %}


Sco = Scope(
    labels=[
        {% for block in blocks %}"{{ block["data"]["label"] }}",{% endfor %}
    ]
)

blocks = [
    {% for block in blocks %}{{ block["data"]["label"] }},{% endfor %}
]


connections = [
    {% for connection in connections %}Connection({{ find_node_by_id(connection["source"])["data"]["label"] }}, {{ find_node_by_id(connection["target"])["data"]["label"] }}),
    {% endfor %}{% for block in blocks %}Connection({{ block["data"]["label"] }}, Sco[{{ loop.index0 }}]),
    {% endfor -%}
]

Sim = Simulation(
    blocks,
    connections,
    log=True,
    Solver=RKF21,
    tolerance_lte_rel=1e-4,
    tolerance_lte_abs=1e-9,
)

if __name__ == "__main__":
    Sim.run(10)

    Sim.save("model.mdl")

    fig, ax = Sco.plot()

    plt.show()