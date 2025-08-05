import React, { useState, useCallback } from 'react';
import { CodeiumEditor } from "@codeium/react-code-editor";
import { getApiEndpoint } from './config.js';

const PythonCodeEditor = ({ 
  initialCode = "# Define your Python variables and functions here\n# Example:\n# my_variable = 42\n# def my_function(x):\n#     return x * 2\n",
  onCodeChange,
  onExecute,
  height = "400px"
}) => {
  const [code, setCode] = useState(initialCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  }, [onCodeChange]);

  const executeCode = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch(getApiEndpoint('/execute-python'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();
      setExecutionResult(result);
      
      if (onExecute) {
        onExecute(result);
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: `Network error: ${error.message}`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="python-code-editor">
      <div className="editor-header">
        <h3>Python Code Editor</h3>
        <button 
          onClick={executeCode}
          disabled={isExecuting}
          className="execute-btn"
        >
          {isExecuting ? 'Executing...' : 'Execute Code'}
        </button>
      </div>
      
      <div className="editor-container" style={{ height }}>
        <CodeiumEditor
          language="python"
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticIndent: 'full',
          }}
        />
      </div>

      {executionResult && (
        <div className={`execution-result ${executionResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            <strong>{executionResult.success ? 'Execution Result:' : 'Error:'}</strong>
          </div>
          
          {executionResult.success ? (
            <div>
              {executionResult.output && (
                <div className="output">
                  <strong>Output:</strong>
                  <pre>{executionResult.output}</pre>
                </div>
              )}
              
              {executionResult.variables && Object.keys(executionResult.variables).length > 0 && (
                <div className="variables">
                  <strong>Variables added to namespace:</strong>
                  <ul>
                    {Object.entries(executionResult.variables).map(([name, value]) => (
                      <li key={name}>
                        <code>{name}</code> = {JSON.stringify(value)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {executionResult.functions && executionResult.functions.length > 0 && (
                <div className="functions">
                  <strong>Functions added to namespace:</strong>
                  <ul>
                    {executionResult.functions.map((funcName) => (
                      <li key={funcName}>
                        <code>{funcName}()</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="error-message">
              <pre>{executionResult.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PythonCodeEditor;
