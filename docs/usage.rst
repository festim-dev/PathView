===============================
Usage and Examples
===============================

Getting Started
---------------

Here's a simple example to get you started with PathView:

1. **Start the Application**
   
   After installation, launch PathView:
   
   .. code-block:: bash
   
      npm run start:both
   
   Navigate to http://localhost:5173 in your browser.

2. **Load Example Files**
   
   PathView includes several pre-built example graphs in the `example_graphs/ <https://github.com/festim-dev/pathview/tree/main/example_graphs>`_ directory that demonstrate different functionality:
   
   - ``harmonic_oscillator.json`` - Simple oscillator simulation
   - ``pid.json`` - PID controller example
   - ``festim_two_walls.json`` - Two-wall diffusion model
   - ``linear_feedback.json`` - Linear feedback system
   - ``spectrum.json`` - Spectral analysis example
   
   To load an example:
   
   - Use the file import functionality in the application
   - Select any ``.json`` file from the `example_graphs/ <https://github.com/festim-dev/pathview/tree/main/example_graphs>`_ directory
   - The graph will load with pre-configured nodes and connections
   - Click the Run button to run the example

3. **Create Your Own Graphs**
   
   - Drag and drop nodes from the sidebar
   - Connect nodes by dragging from output handles to input handles
   - Configure node parameters in the properties panel
   - Use the simulation controls to run your model

Step by step guide
------------------

1. **Start the Application**
   
   After installation, launch PathView:
   
   .. code-block:: bash
   
      npm run start:both
   
   Navigate to http://localhost:5173 in your browser.

2. **Add nodes**
In the left sidebar, drag and drop:

- under Sources: Sinusoidal source
- under Processing: Delay
- under Output: Scope


3. **Connect Nodes**

   - Connect the Sinusoidal source to the Delay
   - Connect the Sinusoidal source to the Scope
   - Connect the Delay to the Scope

4. **Run and visualise results**
    
    - Click the Run button
    - The graph will display the sinusoidal signal and its delayed version

5. **Configure Nodes**
   
   - Select the Delay node and set the ``tau`` parameter to ``0.1``
   - Select the Sinusoidal source and set the ``frequency`` to ``0.7 Hz``
   - Click the Run button again to see the updated results

6. **Save Your Graph**

   - Click the Save File button
   - Choose a location and filename for your graph
   - Click Save to export your graph as a JSON file

7. **Export graph to python script**

   - Click the Save to Python button
   - Choose a location and filename for your Python script
   - Click Save to export your graph as a Python script

Global variables
----------------

Solver parameters
-----------------

Visualisation and post-processing
---------------------------------
