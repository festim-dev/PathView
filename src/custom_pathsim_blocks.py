from pathsim.blocks import Block, ODE
import pathsim.blocks
from pathsim import Subsystem, Interface, Connection
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
        self.outputs.update_from_array(self.fractions * u)


# BUBBLER SYSTEM


class Bubbler(Subsystem):
    """Subsystem representing a tritium bubbling system with 4 vials."""

    vial_efficiency: float
    conversion_efficiency: float
    n_soluble_vials: float
    n_insoluble_vials: float

    def __init__(
        self,
        conversion_efficiency=0.9,
        vial_efficiency=0.9,
        replacement_times=None,
    ):
        """
        Args:
            conversion_efficiency: Conversion efficiency from insoluble to soluble (between 0 and 1).
            vial_efficiency: collection efficiency of each vial (between 0 and 1).
            replacement_times: List of times at which each vial is replaced. If None, no replacement
                events are created. If a single value is provided, it is used for all vials.
                If a single list of floats is provided, it will be used for all vials.
                If a list of lists is provided, each sublist corresponds to the replacement times for each vial.
        """
        self.reset_times = replacement_times
        self.n_soluble_vials = 2
        self.n_insoluble_vials = 2
        self.vial_efficiency = vial_efficiency
        col_eff1 = Splitter(n=2, fractions=[vial_efficiency, 1 - vial_efficiency])
        vial_1 = pathsim.blocks.Integrator()
        col_eff2 = Splitter(n=2, fractions=[vial_efficiency, 1 - vial_efficiency])
        vial_2 = pathsim.blocks.Integrator()

        conversion_eff = Splitter(
            n=2, fractions=[conversion_efficiency, 1 - conversion_efficiency]
        )

        col_eff3 = Splitter(n=2, fractions=[vial_efficiency, 1 - vial_efficiency])
        vial_3 = pathsim.blocks.Integrator()
        col_eff4 = Splitter(n=2, fractions=[vial_efficiency, 1 - vial_efficiency])
        vial_4 = pathsim.blocks.Integrator()

        add1 = pathsim.blocks.Adder()
        add2 = pathsim.blocks.Adder()

        interface = Interface()

        self.vials = [vial_1, vial_2, vial_3, vial_4]

        blocks = [
            vial_1,
            col_eff1,
            vial_2,
            col_eff2,
            conversion_eff,
            vial_3,
            col_eff3,
            vial_4,
            col_eff4,
            add1,
            add2,
            interface,
        ]
        connections = [
            Connection(interface[0], col_eff1),
            Connection(col_eff1[0], vial_1),
            Connection(col_eff1[1], col_eff2),
            Connection(col_eff2[0], vial_2),
            Connection(col_eff2[1], conversion_eff),
            Connection(conversion_eff[0], add1[0]),
            Connection(conversion_eff[1], add2[0]),
            Connection(interface[1], add1[1]),
            Connection(add1, col_eff3),
            Connection(col_eff3[0], vial_3),
            Connection(col_eff3[1], col_eff4),
            Connection(col_eff4[0], vial_4),
            Connection(col_eff4[1], add2[1]),
            Connection(vial_1, interface[0]),
            Connection(vial_2, interface[1]),
            Connection(vial_3, interface[2]),
            Connection(vial_4, interface[3]),
            Connection(add2, interface[4]),
        ]
        super().__init__(blocks, connections)

    def _create_reset_events_one_vial(
        self, block, reset_times
    ) -> list[pathsim.blocks.Schedule]:
        events = []

        def reset_itg(_):
            block.reset()

        for t in reset_times:
            events.append(
                pathsim.blocks.Schedule(t_start=t, t_end=t, func_act=reset_itg)
            )
        return events

    def create_reset_events(self) -> list[pathsim.blocks.Schedule]:
        """Create reset events for all vials based on the replacement times.

        Raises:
            ValueError: If reset_times is not valid.

        Returns:
            list of reset events.
        """
        reset_times = self.reset_times
        events = []
        # if reset_times is a single list use it for all vials
        if reset_times is None:
            return events
        if isinstance(reset_times, (int, float)):
            reset_times = [reset_times]
        # if it's a flat list use it for all vials
        elif isinstance(reset_times, list) and all(
            isinstance(t, (int, float)) for t in reset_times
        ):
            reset_times = [reset_times] * len(self.vials)
        elif isinstance(reset_times, np.ndarray) and reset_times.ndim == 1:
            reset_times = [reset_times.tolist()] * len(self.vials)
        elif isinstance(reset_times, list) and len(reset_times) != len(self.vials):
            raise ValueError(
                "reset_times must be a single value or a list with the same length as the number of vials"
            )
        for i, vial in enumerate(self.vials):
            events.extend(self._create_reset_events_one_vial(vial, reset_times[i]))
        return events
