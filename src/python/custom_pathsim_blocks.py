from pathsim.blocks import Block, ODE
import pathsim.blocks
import pathsim.events
from pathsim import Subsystem, Interface, Connection
import numpy as np


class Process(ODE):
    """
    A block that represents a process with a residence time and a source term.

    Args:
        residence_time: Residence time of the process.
        initial_value: Initial value of the process.
        source_term: Source term of the process.
    """

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
    """Splitter block that splits the input signal into multiple outputs based on specified fractions."""

    def __init__(self, n=2, fractions=None):
        super().__init__()
        self.n = n  # number of splits
        self.fractions = np.ones(n) / n if fractions is None else np.array(fractions)
        assert len(self.fractions) == n, "Fractions must match number of outputs"
        assert np.isclose(np.sum(self.fractions), 1), (
            f"Fractions must sum to 1, not {np.sum(self.fractions)}"
        )

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
    """Integrates the input signal using a numerical integration engine like this:

    .. math::

        y(t) = \\int_0^t u(\\tau) \\ d \\tau
    
    or in differential form like this:

    .. math::
        \\begin{eqnarray}
            \\dot{x}(t) &= u(t) \\\\
                   y(t) &= x(t) 
        \\end{eqnarray}

    The Integrator block is inherently MIMO capable, so `u` and `y` can be vectors.
    
    Example
    -------
    This is how to initialize the integrator: 

    .. code-block:: python
    
        #initial value 0.0
        i1 = Integrator()

        #initial value 2.5
        i2 = Integrator(2.5)
    

    Parameters
    ----------
    initial_value : float, array
        initial value of integrator
    reset_times : list, optional
        List of times at which the integrator is reset.
    """

    def __init__(self, initial_value=0.0, reset_times=None):
        """
        Args:
            initial_value: Initial value of the integrator.
            reset_times: List of times at which the integrator is reset. If None, no reset events are created.
        """
        super().__init__(initial_value=initial_value)
        self.reset_times = reset_times

    def create_reset_events(self) -> list[pathsim.events.ScheduleList]:
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

        event = pathsim.events.ScheduleList(times_evt=reset_times, func_act=func_act)
        return [event]


# BUBBLER SYSTEM


class Bubbler(Subsystem):
    """
    Subsystem representing a tritium bubbling system with 4 vials.

    Args:
        conversion_efficiency: Conversion efficiency from insoluble to soluble (between 0 and 1).
        vial_efficiency: collection efficiency of each vial (between 0 and 1).
        replacement_times: List of times at which each vial is replaced. If None, no replacement
            events are created. If a single value is provided, it is used for all vials.
            If a single list of floats is provided, it will be used for all vials.
            If a list of lists is provided, each sublist corresponds to the replacement times for each vial.
    """

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
    ) -> pathsim.events.ScheduleList:
        def reset_itg(_):
            block.reset()

        event = pathsim.events.ScheduleList(times_evt=reset_times, func_act=reset_itg)
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


# GLC block

import numpy as np
from scipy.integrate import solve_bvp
from scipy import constants as const

R = 8.314  # J/(mol·K), Universal gas constant


def solve(params):

    def solve_tritium_extraction(dimensionless_params, y_T2_in):
        """
        Solves the BVP for tritium extraction in a bubble column.

        Args:
            params (dict): A dictionary containing the dimensionless parameters:
                        Bo_l, phi_l, Bo_g, phi_g, psi, nu.
            y_T2_in (float): Inlet tritium molar fraction in the gas phase, y_T2(0-).

        Returns:
            sol: The solution object from scipy.integrate.solve_bvp.
        """

        Bo_l = dimensionless_params["Bo_l"]
        phi_l = dimensionless_params["phi_l"]
        Bo_g = dimensionless_params["Bo_g"]
        phi_g = dimensionless_params["phi_g"]
        psi = dimensionless_params["psi"]
        nu = dimensionless_params["nu"]

        def ode_system(xi, S):
            """
            Defines the system of 4 first-order ODEs.
            S[0] = x_T  (dimensionless liquid concentration)
            S[1] = dx_T/d(xi)
            S[2] = y_T2 (dimensionless gas concentration)
            S[3] = dy_T2/d(xi)
            """
            x_T, dx_T_dxi, y_T2, dy_T2_dxi = S

            # Dimensionless driving force theta. Eq. 8.8
            theta = x_T - np.sqrt(np.maximum(0, (1 - psi * xi) * y_T2 / nu))

            # Equation for d(S[0])/d(xi) = d(x_T)/d(xi)
            dS0_dxi = dx_T_dxi

            # Equation for d(S[1])/d(xi) = d^2(x_T)/d(xi)^2
            dS1_dxi = Bo_l * (phi_l * theta - dx_T_dxi)

            # Equation for d(S[2])/d(xi) = d(y_T2)/d(xi)
            dS2_dxi = dy_T2_dxi

            # Equation for d(S[3])/d(xi) = d^2(y_T2)/d(xi)^2 from eq (11)
            # Avoid division by zero if (1 - psi * xi) is close to zero at xi=1
            denominator = 1 - psi * xi
            denominator = np.where(np.isclose(denominator, 0), 1e-9, denominator)

            term1 = (1 + 2 * psi / Bo_g) * dy_T2_dxi  # Part of Eq. 9.3.3 (fourth line)
            term2 = phi_g * theta  # Part of Eq. 9.3.3 (fourth line)
            dS3_dxi = (Bo_g / denominator) * (term1 - term2)  # Eq. 9.3.3 (fourth line)

            return np.vstack((dS0_dxi, dS1_dxi, dS2_dxi, dS3_dxi))

        def boundary_conditions(Sa, Sb):
            """
            Defines the boundary conditions for the BVP.
            Sa: solution at xi = 0 (liquid outlet)
            Sb: solution at xi = 1 (liquid inlet)
            """
            # Residuals that should be zero for a valid solution.
            # Based on equations (16) and (17) in the paper.

            # At xi = 0: dx_T/d(xi) = 0
            res1 = Sa[1]  # Eq. 10.1

            # At xi = 1: x_T(1) = 1 - (1/Bo_l) * dx_T/d(xi)|_1
            res2 = Sb[0] - (1 - (1 / Bo_l) * Sb[1])  # Eq. 10.2

            # At xi = 0: y_T2(0) = y_T2(0-) + (1/Bo_g) * dy_T2/d(xi)|_0
            res3 = Sa[2] - (y_T2_in + (1 / Bo_g) * Sa[3])  # Eq. 10.3

            # At xi = 1: dy_T2/d(xi) = 0
            res4 = Sb[3]  # Eq. 10.4

            return np.array([res1, res2, res3, res4])

        # Set up the mesh and an initial guess for the solver.
        xi = np.linspace(0, 1, 51)

        # A flat initial guess is often good enough to get the solver started.
        y_guess = np.zeros((4, xi.size))
        y_guess[0, :] = 0.8  # Guess for x_T
        y_guess[2, :] = 1e-5  # Guess for y_T2

        # Run the BVP solver
        sol = solve_bvp(ode_system, boundary_conditions, xi, y_guess, tol=1e-5)

        return sol

    # Unpack parameters
    c_T_inlet = params["c_T_inlet"]
    P_T2_in = params["P_T2_in"]
    P_0 = params["P_0"]
    ρ_l = params["ρ_l"]
    K_s = params["K_s"]

    L = params["L"]
    D = params["D"]
    ε_g = params["ε_g"]

    Q_l = params["Q_l"]
    Q_g = params["Q_g"]

    a = params["a"]

    E_g = params["E_g"]
    E_l = params["E_l"]

    h_l = params["h_l"]

    g = params["g"]
    T = params["T"]

    R = params.get("R", R)  # Ideal gas constant, J/(mol.K)

    # Calculate the superficial flow velocities
    A = np.pi * (D / 2) ** 2  # m^2, Cross-sectional area of the column
    u_g0 = Q_g / A  # m/s, superficial gas inlet velocity
    u_l = Q_l / A  # m/s, superficial liquid inlet velocity

    # Calculate dimensionless values
    ε_l = 1 - ε_g  # Liquid phase fraction
    ψ = (ρ_l * g * ε_l * L) / P_0  # Hydrostatic pressure ratio (Eq. 8.3)
    ν = (c_T_inlet / K_s) ** 2 / P_0  # Tritium partial pressure ratio (Eq. 8.5)
    Bo_l = u_l * L / (ε_l * E_l)  # Bodenstein number, liquid phase (Eq. 8.9)
    phi_l = a * h_l * L / u_l  # Transfer units parameter, liquid phase (Eq. 8.11)
    Bo_g = u_g0 * L / (ε_g * E_g)  # Bodenstein number, gas phase (Eq. 8.10)
    phi_g = (
        0.5 * (R * T * c_T_inlet / P_0) * (a * h_l * L / u_g0)
    )  # Transfer units parameter, gas phase (Eq. 8.12)

    y_T2_in = P_T2_in / P_0  # Inlet tritium molar fraction in gas phase

    dimensionless_params = {
        "Bo_l": Bo_l,
        "phi_l": phi_l,
        "Bo_g": Bo_g,
        "phi_g": phi_g,
        "psi": ψ,
        "nu": ν,
    }

    # Solve the model
    solution = solve_tritium_extraction(dimensionless_params, y_T2_in)

    # --- Results ---
    if solution.success:
        # --- Dimensionless Results ---
        x_T_outlet_dimless = solution.y[0, 0]
        efficiency = 1 - x_T_outlet_dimless
        y_T2_outlet_gas = solution.y[2, -1]  # y_T2 at xi=1

        # --- Dimensional Results ---
        # Liquid concentration at outlet (xi=0)
        c_T_outlet = x_T_outlet_dimless * c_T_inlet

        # Gas partial pressure at outlet (xi=1)
        P_outlet = P_0 * (
            1 - dimensionless_params["psi"]
        )  # Derived from Eq. 8.4 at xi=1
        P_T2_out = y_T2_outlet_gas * P_outlet

        # Mass transfer consistency check
        N_A = const.N_A  # Avogadro's number, 1/mol
        # Tritium molar flow rate into the column via liquid
        n_T_in_liquid = c_T_inlet * Q_l * N_A  # Triton/s

        # Tritium molar flow rate out of the column via liquid
        n_T_out_liquid = c_T_outlet * Q_l * N_A  # Tritons/s

        # Tritium molar flow rate into the column via gas
        n_T2_in_gas = (P_T2_in * Q_g / (R * T)) * N_A  # T2/s
        n_T_in_gas = n_T2_in_gas * 2  # Triton/s

        # Calculate outlet gas volumetric flow rate (gas expands as pressure drops)
        Q_g_out = (P_0 * Q_g) / P_outlet
        # Tritium molar flow rate out of the column via gas
        n_T2_out_gas = (P_T2_out * Q_g_out / (R * T)) * N_A  # T2/s
        n_T_out_gas = n_T2_out_gas * 2  # Triton/s

        T_in = n_T_in_liquid + n_T_in_gas
        T_out = n_T_out_liquid + n_T_out_gas

        print(
            f"Tritum in (liquid phase): {n_T_in_liquid:.4e} Tritons/s"
            f", Tritium in (gas phase): {n_T_in_gas:.4e} Tritons/s"
        )

        print(
            f"Tritium out (liquid phase): {n_T_out_liquid:.4e} Tritons/s"
            f", Tritium out (gas phase): {n_T_out_gas:.4e} Tritons/s"
        )

        print(
            f"Total Tritium in: {T_in:.4e} Tritons/s"
            f", Total Tritium out: {T_out:.4e} Tritons/s"
        )

        results = {
            "extraction_efficiency [%]": efficiency * 100,
            "c_T_inlet [mol/m^3]": c_T_inlet,
            "c_T_outlet [mol/m^3]": c_T_outlet,
            "liquid_vol_flow [m^3/s]": Q_l,
            "P_T2_inlet_gas [Pa]": P_T2_in,
            "P_T2_outlet_gas [Pa]": P_T2_out,
            "total_gas_P_outlet [Pa]": P_outlet,
            "gas_vol_flow [m^3/s]": Q_g,
        }

    else:
        print("BVP solver failed to converge.")

    return results


from pathsim.blocks import Function


class GLC(Function):
    """
    This is the docs
    """

    def __init__(
        self, P_0, L, u_l, u_g0, ε_g, ε_l, E_g, E_l, a, h_l, ρ_l, K_s, D, T, g=9.81
    ):
        self.params = {
            "P_0": P_0,
            "L": L,
            "u_l": u_l,
            "u_g0": u_g0,
            "ε_g": ε_g,
            "ε_l": ε_l,
            "E_g": E_g,
            "E_l": E_l,
            "a": a,
            "h_l": h_l,
            "ρ_l": ρ_l,
            "K_s": K_s,
            "g": g,
            "D": D,
            "T": T,
        }
        super().__init__(func=self.func)

    def func(self, c_T_inlet, P_T2_inlet):
        new_params = self.params.copy()
        new_params["c_T_inlet"] = c_T_inlet
        new_params["P_T2_in"] = P_T2_inlet

        res = solve(new_params)

        c_T_outlet = res["c_T_outlet [mol/m^3]"]
        P_T2_outlet = res["P_T2_outlet_gas [Pa]"]

        return c_T_outlet, P_T2_outlet
