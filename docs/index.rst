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

WIP


===============================
Roadmap
===============================

- Support more PathSim solvers
- Export graph as Subsystem and load it back
- Improved UI/UX
- User-defined block class
- Support for user plugins (eg. fuel cycle, thermodynamic models, etc.)
- Enhanced visualization options
- More example scenarios
- Annotations and comments on graph
- More styling options for nodes and edges

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

