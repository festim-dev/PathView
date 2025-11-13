import pathsim
from pathsim import Simulation, Connection
import numpy as np
import matplotlib.pyplot as plt
import pathview

# Create global variables
import numpy as np

c_T_inlet = 3.09e-2  # mol/m^3 (c_T(L+)), Inlet tritium concentration in liquid just before inlet
y_T2_in = 0.0  # Inlet tritium molar fraction in gas (0 = pure purge gas)
P_0 = 5e5  # Pa, Gas total pressure at inlet
ρ_l = 9000  # kg/m^3, Liquid density
K_s = 2e-6  # Tritium Sievert's constant in liquid

L = 3.0  # m, Height of the bubble column
D = 0.5  # m, Column diameter
ε_g = 0.04  # Gas phase fraction

Q_l = 0.01  # m^3/s, Volumetric flow rate of liquid phase
Q_g = 0.0005  # m^3/s, Volumetric flow rate of gas phase at inlet

a = 20  # m^-1, Specific liquid-gas interfacial area

E_g = 0.05  # m^2/s, Effective axial dispersion coefficient, gas phase
E_l = 0.01  # m^2/s, Effective axial dispersion coefficient, liquid phase

h_l = 1e-4  # m/s, Mass transfer coefficient, tritium liquid - gas

g = 9.81  # m/s^2, Gravitational acceleration

# Calculated parameters
ε_l = 1 - ε_g  # Liquid phase fraction

A = np.pi * (D / 2) ** 2  # m^2, Cross-sectional area of the column
A_l = A * ε_l  # m^2, Cross-sectional area of the liquid phase
A_g = A * ε_g  # m^2, Cross-sectional area of the gas phase

u_l = Q_l / A_l  # m/s, superficial liquid inlet velocity (positive for downward flow)
u_g0 = Q_g / A_g  # m/s, gas inlet velocity (positive for upward flow)
R = 8.314
T = 623
N_A = 6.0221408e23

# Create blocks
blocks, events = [], []

p_t2_inlet_5 = pathsim.blocks.sources.Constant(value=y_T2_in)
blocks.append(p_t2_inlet_5)

blanket_6 = pathview.custom_pathsim_blocks.Process(
    residence_time=2, initial_value=1, source_term=0
)
blocks.append(blanket_6)

storage_7 = pathview.custom_pathsim_blocks.Process(residence_time=0, source_term=0)
blocks.append(storage_7)

to_concentration_14 = pathsim.blocks.amplifier.Amplifier(gain=Q_l**-1)
blocks.append(to_concentration_14)

inventories_16 = pathsim.blocks.scope.Scope(
    labels=["blanket (inv)", "storage (inv)", "adder 20"]
)
blocks.append(inventories_16)

all_t_flow_rates_18 = pathsim.blocks.scope.Scope(labels=["blanket (mass_flow_rate)"])
blocks.append(all_t_flow_rates_18)

adder_20_20 = pathsim.blocks.adder.Adder()
blocks.append(adder_20_20)

glc_21_21 = pathview.custom_pathsim_blocks.GLC(
    P_outlet=5e5,
    L=L,
    u_l=u_l,
    u_g0=u_g0,
    ε_g=ε_g,
    ε_l=ε_l,
    E_g=E_g,
    E_l=E_l,
    a=a,
    h_l=h_l,
    ρ_l=ρ_l,
    K_s=K_s,
    Q_l=Q_l,
    Q_g=Q_g,
    D=D,
    T=T,
    initial_nb_of_elements=20,
)
blocks.append(glc_21_21)


# Create events


# Create connections

connections = [
    Connection(blanket_6["mass_flow_rate"], to_concentration_14[0]),
    Connection(blanket_6["inv"], inventories_16[0]),
    Connection(storage_7["inv"], inventories_16[1]),
    Connection(blanket_6["mass_flow_rate"], all_t_flow_rates_18[0]),
    Connection(blanket_6["inv"], adder_20_20[0]),
    Connection(storage_7["inv"], adder_20_20[1]),
    Connection(adder_20_20[0], inventories_16[2]),
    Connection(to_concentration_14[0], glc_21_21["c_T_inlet"]),
    Connection(p_t2_inlet_5[0], glc_21_21["y_T2_in"]),
    Connection(glc_21_21["T_out_gas"], storage_7[0]),
    Connection(glc_21_21["T_out_liquid"], blanket_6[0]),
]

# Create simulation
my_simulation = Simulation(
    blocks,
    connections,
    events=events,
    Solver=pathsim.solvers.SSPRK22,
    dt=1,
    dt_min=1e-16,
    iterations_max=200,
    log=True,
    tolerance_fpi=1e-10,
    **{},
)

if __name__ == "__main__":
    my_simulation.run(200)

    # Optional: Plotting results
    scopes = [block for block in blocks if isinstance(block, pathsim.blocks.Scope)]
    fig, axs = plt.subplots(
        nrows=len(scopes), sharex=True, figsize=(10, 5 * len(scopes))
    )
    for i, scope in enumerate(scopes):
        plt.sca(axs[i] if len(scopes) > 1 else axs)
        time, data = scope.read()
        # plot the recorded data
        for p, d in enumerate(data):
            lb = scope.labels[p] if p < len(scope.labels) else f"port {p}"
            plt.plot(time, d, label=lb)
        plt.legend()
    plt.xlabel("Time")
    plt.show()
