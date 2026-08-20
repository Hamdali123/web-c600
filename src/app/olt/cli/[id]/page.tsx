"use strict";
"use client";

import React, { useEffect, useRef, useState, use } from 'react';
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

    let term: any = null;
    let fitAddon: any = null;
    let socket: WebSocket | null = null;
    let disposed = false;

    const tryFit = () => {
      if (terminalRef.current && fitAddon && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
        try {
          fitAddon.fit();
        } catch (e) {}
      }
    };

    // xterm must be loaded client-side only (it references `self`, which does not
    // exist in the Node SSR context — causes "ReferenceError: self is not defined").
    Promise.all([import('xterm'), import('xterm-addon-fit')])
      .then(([{ Terminal }, { FitAddon }]) => {
        if (disposed || !terminalRef.current) return;

        term = new Terminal({
          cursorBlink: true,
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: 14,
          logLevel: 'off',
          theme: {
            background: '#1e1e1e',
            foreground: '#cccccc',
          }
        });

        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        setTimeout(tryFit, 100);

        // Fetch OLT credentials
        fetch(`/api/settings/olt/${id}`)
          .then(res => res.json())
          .then(olt => {
            if (disposed) return;
            if (!olt || olt.error) {
              term.writeln('Error: Could not load OLT details.');
              setStatus('Error');
              return;
            }

            setStatus('Connecting to WebSocket server...');
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const isHttps = window.location.protocol === 'https:';
            // Dev: terminal server on port 3010; behind nginx (https): /ws proxy
            const wsUrls = isHttps
              ? [`${wsProtocol}//${host}/ws`]
              : [`${wsProtocol}//${host}:3010/ws`, `${wsProtocol}//${host}/ws`];
            let wsIdx = 0;

            const openSocket = () => {
              if (disposed) return;
              if (wsIdx >= wsUrls.length) {
                term.writeln('\r\n\x1b[31mWebSocket Connection Error. Ensure terminal-server is running on port 3010 (or nginx /ws proxy).\x1b[0m\r\n');
                setStatus('Connection Error');
                return;
              }
              const target = wsUrls[wsIdx++];
              socket = new WebSocket(target);

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

                socket!.send(JSON.stringify({ type: 'connect', creds }));
              };

              socket.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.type === 'data') {
                    term.write(data.data);
                    setStatus((prev) => (prev !== 'Connected' ? 'Connected' : prev));
                  } else if (data.type === 'error') {
                    term.writeln(`\r\n\x1b[31mError: ${data.data}\x1b[0m\r\n`);
                    setStatus('Error: ' + data.data);
                  } else if (data.type === 'close') {
                    term.writeln('\r\n\x1b[33mConnection closed by server.\x1b[0m\r\n');
                    setStatus('Disconnected');
                  }
                } catch (e) {}
              };

              socket.onclose = () => {
                term.writeln('\r\n\x1b[33mWebSocket Connection Closed.\x1b[0m\r\n');
                setStatus('Disconnected');
              };

              socket.onerror = () => {
                term.writeln(`\r\n\x1b[33mConnection failed to ${target}, trying next endpoint...\x1b[0m\r\n`);
                try { if (socket) socket.close(); } catch (e) {}
                openSocket();
              };
            };

            openSocket();

            setWs(socket);

            term.onData((data: string) => {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'data', data }));
              }
            });
          })
          .catch(err => {
            if (!disposed) {
              term.writeln('Failed to fetch OLT details.');
              setStatus('Error');
            }
          });

        const handleResize = () => {
          tryFit();
        };
        window.addEventListener('resize', handleResize);
      });

    return () => {
      disposed = true;
      if (socket) socket.close();
      if (term) term.dispose();
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