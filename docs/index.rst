.. fuel-cycle-sim documentation master file, created by
   sphinx-quickstart on Wed Jul 23 14:07:29 2025.

==========================================
Fuel Cycle Simulator (name will change...)
==========================================

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
Statement of Need
===============================

Fusion fuel cycle modeling is a critical aspect of nuclear engineering that requires sophisticated tools to analyze material flows, reactor performance, and waste management strategies. The Fuel Cycle Simulator addresses the need for:

**Accessibility**
   Traditional fuel cycle simulation tools are often complex, proprietary, or require extensive training. This tool provides an intuitive visual interface that makes fuel cycle modeling accessible to students, researchers, and professionals.

**Interactivity**
   Static models and command-line tools limit exploration and understanding. Our interactive visual approach allows users to build, modify, and experiment with fuel cycle scenarios in real-time.

**Educational Value**
   The visual nature of the tool makes it ideal for teaching fuel cycle concepts, allowing students to see the connections between different components and understand material flows.

**Research Flexibility**
   Researchers need tools that can be easily modified and extended. The open-source nature and modular architecture enable customization for specific research needs.

**Modern Technology Stack**
   Built with modern web technologies (React, Python) that ensure maintainability, extensibility, and cross-platform compatibility.

===============================
Installation Guide
===============================

System Requirements
-------------------

Before installing the Fuel Cycle Simulator, ensure your system meets the following requirements:

**Required Software:**
   - Node.js 18+ and npm
   - Python 3.8 or higher
   - pip for Python package management
   - Git (for development)

**Supported Operating Systems:**
   - Linux (Ubuntu 20.04+, CentOS 8+)
   - macOS 10.15+
   - Windows 10+

Installation Steps
------------------

1. **Clone the Repository**
   
   .. code-block:: bash
   
      git clone https://github.com/yourusername/fuel-cycle-sim.git
      cd fuel-cycle-sim

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

Troubleshooting
---------------

**Common Issues:**

- **Node.js version conflicts**: Use nvm to manage Node.js versions
- **Python path issues**: Ensure Python 3.8+ is in your PATH
- **Port conflicts**: Check if ports 5173 or 8000 are already in use
- **Permission errors**: Use appropriate permissions for installation directories

===============================
Example Usage
===============================

Quick Start Example
-------------------

Here's a simple example to get you started with the Fuel Cycle Simulator:

WIP


Use Cases
---------

**Educational Scenarios**
   - Simple fuel cycle for classroom demonstrations
   - Impact of tritium breeding ratio for fusion reactors

**Research Applications**
   - Advanced reactor fuel cycle analysis
   - Multi-recycling scenarios
   - Waste minimization strategies

**Planning and Analysis**
   - Regional fuel cycle infrastructure planning
   - Economic optimization studies
   - Material flow tracking

===============================
Roadmap
===============================

WIP

===============================
Community Guidelines
===============================

Welcome to the Fuel Cycle Simulator community! We're committed to fostering an inclusive, collaborative environment for all contributors.

Code of Conduct
----------------

Please read our `Code of Conduct <../CODE_OF_CONDUCT.md>`_.

Contributing Guidelines
-----------------------

**Getting Started**
   1. Fork the repository
   2. Create a feature branch (``git checkout -b feature/awesome-feature``)
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

If you need help with the Fuel Cycle Simulator, here are the best ways to get support:

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

