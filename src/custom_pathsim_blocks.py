from pathsim.blocks import Block, ODE
import numpy as np


class Process(ODE):
    def __init__(self, residence_time=0, ic=0, gen=0):
        alpha = -1 / residence_time if residence_time != 0 else 0
        super().__init__(
            func=lambda x, u, t: x * alpha + sum(u) + gen, initial_value=ic
        )
        self.residence_time = residence_time
        self.ic = ic
        self.gen = gen

    def update(self, t):
        x = self.engine.get()
        if self.residence_time == 0:
            mass_rate = 0
        else:
            mass_rate = x / self.residence_time
        # first output is the state, second is the rate of change (mass rate)
        self.outputs.update_from_array([x, mass_rate])


class Splitter(Block):
    def __init__(self, n=2, fractions=None):
        super().__init__()
        self.n = n  # number of splits
        self.fractions = np.ones(n) / n if fractions is None else np.array(fractions)
        assert len(self.fractions) == n, "Fractions must match number of outputs"
        assert np.sum(self.fractions) == 1, "Fractions must sum to 1"

    def update(self, t):
        # get the input from port '0'
        u = self.inputs[0]
        # mult by fractions and update outputs
        self.outputs.from_array(self.fractions * u)
