from pathsim.blocks import Block, ODE
import pathsim.blocks
import pathsim.events
from pathsim import Subsystem, Interface, Connection
import numpy as np


class Process(ODE):
    _port_map_out = {"inv": 0, "mass_flow_rate": 1}

    def __init__(self, residence_time=0, initial_value=0, source_term=0):
        alpha = -1 / residence_time if residence_time != 0 else 0
        super().__init__(
            func=lambda x, u, t: x * alpha + sum(u) + source_term,
            initial_value=initial_value,
        )
        self.residence_time = residence_time
        self.initial_value = initial_value
        self.source_term = source_term

    def update(self, t):
        x = self.engine.get()
        if self.residence_time == 0:
            mass_rate = 0
        else:
            mass_rate = x / self.residence_time
        # first output is the inv, second is the mass_flow_rate
        outputs = [None, None]
        outputs[self._port_map_out["inv"]] = x
        outputs[self._port_map_out["mass_flow_rate"]] = mass_rate
        # update the outputs
        self.outputs.update_from_array(outputs)


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


class Splitter2(Splitter):
    _port_map_out = {"source1": 0, "source2": 1}

    def __init__(self, f1=0.5, f2=0.5):
        """
        Splitter with two outputs, fractions are f1 and f2.
        """
        super().__init__(n=2, fractions=[f1, f2])


class Splitter3(Splitter):
    _port_map_out = {"source1": 0, "source2": 1, "source3": 2}

    def __init__(self, f1=1 / 3, f2=1 / 3, f3=1 / 3):
        """
        Splitter with three outputs, fractions are f1, f2 and f3.
        """
        super().__init__(n=3, fractions=[f1, f2, f3])


class Integrator(pathsim.blocks.Integrator):
    """Integrator block with a reset method."""

    def __init__(self, initial_value=0.0, reset_times=None):
        """
        Args:
            initial_value: Initial value of the integrator.
            reset_times: List of times at which the integrator is reset. If None, no reset events are created.
        """
        super().__init__(initial_value=initial_value)
        self.reset_times = reset_times

    def create_reset_events(self):
        """Create reset events for the integrator based on the reset times.

        Raises:
            ValueError: If reset_times is not valid.

        Returns:
            list of reset events.
        """
        if self.reset_times is None:
            return []
        if isinstance(self.reset_times, (int, float)):
            reset_times = [self.reset_times]
        elif isinstance(self.reset_times, list) and all(
            isinstance(t, (int, float)) for t in self.reset_times
        ):
            reset_times = self.reset_times
        else:
            raise ValueError("reset_times must be a single value or a list of times")

        def func_act(_):
            self.reset()

        # can be simplified after https://github.com/milanofthe/pathsim/pull/66
        event = pathsim.events.ScheduleList(times_evt=reset_times, func_act=func_act)
        event.func_act = func_act
        event.t_start = 0
        event.t_end = None
        return [event]


# BUBBLER SYSTEM


class Bubbler(Subsystem):
    """Subsystem representing a tritium bubbling system with 4 vials."""

    vial_efficiency: float
    conversion_efficiency: float
    n_soluble_vials: float
    n_insoluble_vials: float

    _port_map_out = {
        "vial1": 0,
        "vial2": 1,
        "vial3": 2,
        "vial4": 3,
        "sample_out": 4,
    }
    _port_map_in = {
        "sample_in_soluble": 0,
        "sample_in_insoluble": 1,
    }

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

        # can be simplified when https://github.com/milanofthe/pathsim/pull/65 is merged
        interface = Interface()
        interface._port_map_in = self._port_map_out
        interface._port_map_out = self._port_map_in
        interface.__init__()  # reinitialize to rebuild registers

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
            Connection(interface["sample_in_soluble"], col_eff1),
            Connection(col_eff1[0], vial_1),
            Connection(col_eff1[1], col_eff2),
            Connection(col_eff2[0], vial_2),
            Connection(col_eff2[1], conversion_eff),
            Connection(conversion_eff[0], add1[0]),
            Connection(conversion_eff[1], add2[0]),
            Connection(interface["sample_in_insoluble"], add1[1]),
            Connection(add1, col_eff3),
            Connection(col_eff3[0], vial_3),
            Connection(col_eff3[1], col_eff4),
            Connection(col_eff4[0], vial_4),
            Connection(col_eff4[1], add2[1]),
            Connection(vial_1, interface["vial1"]),
            Connection(vial_2, interface["vial2"]),
            Connection(vial_3, interface["vial3"]),
            Connection(vial_4, interface["vial4"]),
            Connection(add2, interface["sample_out"]),
        ]
        super().__init__(blocks, connections)

    def _create_reset_events_one_vial(
        self, block, reset_times
    ) -> pathsim.events.ScheduleList:
        def reset_itg(_):
            block.reset()

        event = pathsim.events.ScheduleList(times_evt=reset_times, func_act=reset_itg)
        # won't be needed after https://github.com/milanofthe/pathsim/pull/66
        event.func_act = reset_itg
        event.t_start = 0
        event.t_end = None
        return event

    def create_reset_events(self) -> list[pathsim.events.ScheduleList]:
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
            events.append(self._create_reset_events_one_vial(vial, reset_times[i]))

        return events


# FESTIM wall
from pathsim.utils.register import Register


class FestimWall(Block):
    _port_map_out = {"flux_0": 0, "flux_L": 1}
    _port_map_in = {"c_0": 0, "c_L": 1}

    def __init__(
        self, thickness, temperature, D_0, E_D, surface_area=1, n_vertices=100
    ):
        try:
            import festim as F
        except ImportError:
            raise ImportError("festim is needed for FestimWall node.")
        super().__init__()

        self.inputs = Register(size=2, mapping=self._port_map_in)
        self.outputs = Register(size=2, mapping=self._port_map_out)

        self.thickness = thickness
        self.temperature = temperature
        self.surface_area = surface_area
        self.D_0 = D_0
        self.E_D = E_D
        self.n_vertices = n_vertices
        self.t = 0.0

        self.initialise_festim_model()

    def initialise_festim_model(self):
        import festim as F

        model = F.HydrogenTransportProblem()

        model.mesh = F.Mesh1D(
            vertices=np.linspace(0, self.thickness, num=self.n_vertices)
        )
        material = F.Material(D_0=self.D_0, E_D=self.E_D)

        vol = F.VolumeSubdomain1D(id=1, material=material, borders=[0, self.thickness])
        left_surf = F.SurfaceSubdomain1D(id=1, x=0)
        right_surf = F.SurfaceSubdomain1D(id=2, x=self.thickness)

        model.subdomains = [vol, left_surf, right_surf]

        H = F.Species("H")
        model.species = [H]

        model.boundary_conditions = [
            F.FixedConcentrationBC(left_surf, value=0.0, species=H),
            F.FixedConcentrationBC(right_surf, value=0.0, species=H),
        ]

        model.temperature = self.temperature

        model.settings = F.Settings(
            atol=1e-10, rtol=1e-10, transient=True, final_time=1
        )

        model.settings.stepsize = F.Stepsize(initial_value=1)

        self.surface_flux_0 = F.SurfaceFlux(field=H, surface=left_surf)
        self.surface_flux_L = F.SurfaceFlux(field=H, surface=right_surf)
        model.exports = [self.surface_flux_0, self.surface_flux_L]

        model.show_progress_bar = False

        model.initialise()

        self.dt = model.dt
        self.c_0 = model.boundary_conditions[0].value_fenics
        self.c_L = model.boundary_conditions[1].value_fenics

        self.model = model

    def update_festim_model(self, c_0, c_L, stepsize):
        self.c_0.value = c_0
        self.c_L.value = c_L
        self.dt.value = stepsize

        self.model.iterate()

        return self.surface_flux_0.data[-1], self.surface_flux_L.data[-1]

    def update(self, t):
        # no internal algebraic operator -> early exit
        # if self.op_alg is None:
        #     return 0.0

        # block inputs
        c_0 = self.inputs["c_0"]
        c_L = self.inputs["c_L"]

        if t == 0.0:
            flux_0, flux_L = 0, 0
        else:
            flux_0, flux_L = self.update_festim_model(
                c_0=c_0, c_L=c_L, stepsize=t - self.t
            )

        flux_0 *= self.surface_area
        flux_L *= self.surface_area

        self.outputs["flux_0"] = flux_0
        self.outputs["flux_L"] = flux_L
        return self.outputs
