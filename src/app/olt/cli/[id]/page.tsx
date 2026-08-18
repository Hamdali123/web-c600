"use strict";
"use client";

import React, { useEffect, useRef, useState, use } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import Link from 'next/link';

export default function OltCliPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const terminalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      logLevel: 'off',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    const tryFit = () => {
      if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
        try {
          fitAddon.fit();
        } catch (e) {}
      }
    };

    setTimeout(tryFit, 100);

    let socket: WebSocket;

    // Fetch OLT credentials
    fetch(`/api/settings/olt/${id}`)
      .then(res => res.json())
      .then(olt => {
         if (!olt || olt.error) {
           term.writeln('Error: Could not load OLT details.');
           setStatus('Error');
           return;
         }

         setStatus('Connecting to WebSocket server...');
         const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
         socket = new WebSocket(wsProtocol + '//' + window.location.host + '/ws');
         
         socket.onopen = () => {
           setStatus('Connected to Terminal Server. Authenticating to OLT...');
           
           const creds = {
             ip: olt.ip_address,
             port: olt.telnet_port || (olt.protocol === 'ssh' ? 22 : 23),
             username: olt.telnet_user || '',
             password: olt.telnet_pass || '',
             protocol: olt.protocol || 'telnet',
             vendor: olt.vendor || 'zte'
           };

           socket.send(JSON.stringify({ type: 'connect', creds }));
         };

         socket.onmessage = (event) => {
           try {
             const data = JSON.parse(event.data);
             if (data.type === 'data') {
               term.write(data.data);
               if (status !== 'Connected') setStatus('Connected');
             } else if (data.type === 'error') {
               term.writeln(`\r\n\x1b[31mError: ${data.data}\x1b[0m\r\n`);
               setStatus('Error: ' + data.data);
             } else if (data.type === 'close') {
               term.writeln('\r\n\x1b[33mConnection closed by server.\x1b[0m\r\n');
               setStatus('Disconnected');
             }
           } catch(e) {}
         };

         socket.onclose = () => {
           term.writeln('\r\n\x1b[33mWebSocket Connection Closed.\x1b[0m\r\n');
           setStatus('Disconnected');
         };

         socket.onerror = () => {
           term.writeln('\r\n\x1b[31mWebSocket Connection Error. Ensure terminal-server.js is running on port 3010.\x1b[0m\r\n');
           setStatus('Connection Error');
         };

         setWs(socket);

         term.onData(data => {
           if (socket.readyState === WebSocket.OPEN) {
             socket.send(JSON.stringify({ type: 'data', data }));
           }
         });
      })
      .catch(err => {
         term.writeln('Failed to fetch OLT details.');
         setStatus('Error');
      });

    const handleResize = () => {
      tryFit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (socket) socket.close();
      term.dispose();
    };
  }, [id]);

  return (
    <div className="container-fluid content-wrap">
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/settings/olts/${id}`} className="btn btn-success">
          <i className="fa fa-arrow-left"></i> Back to OLT details
        </Link>
      </div>

      <div className="panel panel-default border-0 shadow-sm">
        <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <h3 className="panel-title" style={{ fontWeight: 'bold', color: '#333' }}>
            Interactive Terminal (OLT ID: {id})
          </h3>
          <span style={{ color: status === 'Connected' ? 'green' : (status.includes('Error') ? 'red' : 'orange') }}>
            {status}
          </span>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
            <div 
              ref={terminalRef} 
              style={{ height: '600px', width: '100%', backgroundColor: '#1e1e1e' }}
            />
        </div>
      </div>
    </div>
  );
}
