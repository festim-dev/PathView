.. pathview documentation master file, created by
   sphinx-quickstart on Wed Jul 23 14:07:29 2025.

========
PathView
========

An interactive visual tool for modeling and simulating nuclear fuel cycle components using React Flow frontend and Python Flask backend.

.. image:: https://img.shields.io/badge/License-MIT-blue.svg
   :target: https://opensource.org/licenses/MIT
   :alt: License: MIT

.. image:: https://img.shields.io/badge/Python-3.8%2B-blue.svg
   :target: https://www.python.org/downloads/
   :alt: Python 3.8+

.. image:: https://img.shields.io/badge/Node.js-18%2B-green.svg
   :target: https://nodejs.org/
   :alt: Node.js 18+



===============================
Installation Guide
===============================

System Requirements
-------------------

Before installing PathView, ensure your system meets the following requirements:

**Required Software:**
   - Node.js 18+ and npm
   - Python 3.8 or higher
   - pip for Python package management
   - Git (for development)


Installation Steps
------------------

1. **Clone the Repository**
   
   .. code-block:: bash

      git clone https://github.com/festim-dev/pathview.git
      cd pathview

2. **Install Frontend Dependencies**
   
   .. code-block:: bash
   
      npm install

3. **Set Up Python Environment**
   
   We recommend using a virtual environment:
   
   .. code-block:: bash
   
      # Create virtual environment
      python -m venv venv
      
      # Activate virtual environment
      # On Linux/macOS:
      source venv/bin/activate
      
      # On Windows:
      venv\Scripts\activate
   
   Alternatively, you can use Conda:
   .. code-block:: bash

      conda create -n pathview python=3.8
      conda activate pathview
      pip install --upgrade pip
      pip install -e .
   
4. **Install Backend Dependencies**
   
   .. code-block:: bash
   
      pip install -r requirements.txt

5. **Verify Installation**
   
   .. code-block:: bash
   
      # Run both frontend and backend
      npm run start:both

   The application should be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

===============================
Example Usage
===============================

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
   - Select any ``.json`` file from the ``example_graphs/`` directory
   - The graph will load with pre-configured nodes and connections
   - Click the Run button to run the example

3. **Create Your Own Graphs**
   
   - Drag and drop nodes from the sidebar
   - Connect nodes by dragging from output handles to input handles
   - Configure node parameters in the properties panel
   - Use the simulation controls to run your model


===============================
Roadmap
===============================

**Core Functionality & Solvers**
   - Support more PathSim solvers
   - User-defined block class (ie. users writing their own Python classes for blocks)
   - Support for user plugins (eg. Chem.Eng., fuel cycle blocks, thermodynamic models, etc.)

**Graph Management & Import/Export**
   - Export graph as Subsystem and load it back

**User Interface & Experience**
   - Improved UI/UX
   - Capability to rotate/flip nodes
   - Enhanced visualization options
   - More styling options for nodes and edges

**Documentation & Examples**
   - More example scenarios
   - Annotations and comments on graph

===============================
Community Guidelines
===============================

Code of Conduct
----------------

Please read our `Code of Conduct <../CODE_OF_CONDUCT.md>`_.

Contributing Guidelines
-----------------------

**Getting Started**
   1. Fork the repository
   2. Create a feature branch (``git checkout -b awesome-feature``)
   3. Make your changes
   4. Add tests for new functionality if needed
   5. Ensure all tests pass
   6. Submit a pull request

**Development Standards**
   - Follow existing code style and conventions
   - Write clear, descriptive commit messages
   - Include tests for new features
   - Update documentation as needed
   - Ensure backwards compatibility when possible

**Types of Contributions**
   - 🐛 Bug reports and fixes
   - ✨ New features and enhancements
   - 📚 Documentation improvements
   - 🎨 UI/UX improvements
   - 🧪 Test coverage improvements

Communication Channels
-----------------------

**GitHub Discussions**
   Use GitHub Discussions for:
   - General questions and help
   - Feature requests and ideas
   - Community showcases
   - Development discussions

**Issues**
   Use GitHub Issues for:
   - Bug reports
   - Specific feature requests
   - Documentation issues

**Pull Requests**
   - Provide clear description of changes
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI checks pass


===============================
Support
===============================

If you need help with PathView, here are the best ways to get support:

- **Documentation**: Start with this documentation
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community help
- **Email**: remidm@mit.edu

===============================

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

