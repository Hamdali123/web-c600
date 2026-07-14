"use client";

import React, { useState, useEffect, useRef, use } from 'react';

export default function OltCliPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string>('Welcome to SmartOLT Terminal...\nType a command and press Enter.');
  const [loading, setLoading] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const currentCmd = command;
    setCommand('');
    setOutput(prev => prev + `\n> ${currentCmd}\nExecuting...`);
    setLoading(true);

    try {
      const res = await fetch(`/api/olts/${id}/cli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: currentCmd })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setOutput(prev => prev.replace('Executing...', '') + `Error: ${data.error || 'Unknown error'}`);
      } else {
        setOutput(prev => prev.replace('Executing...', '') + data.output);
      }
    } catch (err: any) {
      setOutput(prev => prev.replace('Executing...', '') + `\nRequest failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid content-wrap">
      <div style={{ marginBottom: '20px' }}>
        <a href={`/settings/olts/${id}`} className="btn btn-success">
          <i className="fa fa-arrow-left"></i> Back to OLT details
        </a>
      </div>

      <div className="panel panel-default border-0 shadow-sm">
        <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
          <h3 className="panel-title" style={{ fontWeight: 'bold', color: '#333' }}>
            Terminal (OLT ID: {id})
          </h3>
        </div>
        <div className="panel-body">
                    
                    <div 
                      className="bg-dark text-light p-3 mb-3 rounded" 
                      style={{ 
                        height: '400px', 
                        overflowY: 'auto', 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {output}
                      <div ref={outputEndRef} />
                    </div>

                    <form onSubmit={executeCommand} className="d-flex">
                      <div className="input-group">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-dark text-light border-dark">&gt;</span>
                        </div>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          placeholder="Enter CLI command (e.g., show version, show card)" 
                          disabled={loading}
                          autoFocus
                        />
                        <div className="input-group-append">
                          <button 
                            className="btn btn-primary" 
                            type="submit" 
                            disabled={loading}
                          >
                            {loading ? <i className="fa fa-spinner fa-spin"></i> : 'Execute'}
                          </button>
                        </div>
                      </div>
                    </form>
        </div>
      </div>
    </div>
  );
}
