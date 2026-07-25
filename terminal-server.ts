// @ts-nocheck
import { WebSocketServer } from 'ws';
import http from 'http';
import { Client } from 'ssh2';
import { Telnet } from 'telnet-client';

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Terminal WebSocket Server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    let connection = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'connect') {
                const creds = data.creds;
                
                if (creds.protocol === 'ssh') {
                    connection = new Client();
                    connection.on('ready', () => {
                        connection.shell((err, stream) => {
                            if (err) {
                                ws.send(JSON.stringify({ type: 'error', data: err.message }));
                                return;
                            }
                            stream.on('data', (d) => {
                                ws.send(JSON.stringify({ type: 'data', data: d.toString() }));
                            }).on('close', () => {
                                ws.send(JSON.stringify({ type: 'close' }));
                                connection.end();
                            });

                            ws.on('message', (msg) => {
                                try {
                                    const parsed = JSON.parse(msg);
                                    if (parsed.type === 'data') {
                                        // Fix backspace for OLTs expecting ^H
                                        const cleanData = parsed.data.replace(/\x7f/g, '\x08');
                                        stream.write(cleanData);
                                    }
                                } catch (e) {}
                            });
                        });
                    }).on('error', (err) => {
                        ws.send(JSON.stringify({ type: 'error', data: err.message }));
                    }).connect({
                        host: creds.ip,
                        port: creds.port || 22,
                        username: creds.username,
                        password: creds.password,
                        readyTimeout: 10000
                    });

                } else {
                    // Telnet
                    connection = new Telnet();
                    const params = {
                        host: creds.ip,
                        port: creds.port || 23,
                        timeout: 0, // Infinite
                        negotiationMandatory: false,
                        disableLogon: true,
                        sendTimeout: 5000
                    };
                    
                    connection.on('data', (d) => {
                        ws.send(JSON.stringify({ type: 'data', data: d.toString() }));
                    });

                    connection.on('error', (err) => {
                        ws.send(JSON.stringify({ type: 'error', data: err.message }));
                    });

                    connection.on('close', () => {
                        ws.send(JSON.stringify({ type: 'close' }));
                    });

                    try {
                        await connection.connect(params);
                        
                        // Handle initial login manually to stream it to client
                        const promptRegex = /[#>]\s*$/i;
                        try {
                            const uOut = await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
                            ws.send(JSON.stringify({ type: 'data', data: uOut + '\r\n' }));
                            
                            const pOut = await connection.send(creds.password || '', { waitFor: promptRegex, timeout: 5000 });
                            ws.send(JSON.stringify({ type: 'data', data: pOut + '\r\n' }));
                            
                            const tOut = await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 });
                            ws.send(JSON.stringify({ type: 'data', data: tOut + '\r\n' }));
                            
                            // Force a new prompt to appear
                            if (connection.socket) {
                                connection.socket.write('\r\n');
                            }
                        } catch(e) {
                            // ignore initial setup errors, force a new prompt anyway
                            if (connection.socket) {
                                connection.socket.write('\r\n');
                            }
                        }

                        ws.on('message', (msg) => {
                            try {
                                const parsed = JSON.parse(msg);
                                if (parsed.type === 'data') {
                                    // Send raw data with backspace fix
                                    if (connection.socket) {
                                        const cleanData = parsed.data.replace(/\x7f/g, '\x08');
                                        connection.socket.write(cleanData);
                                    }
                                }
                            } catch (e) {}
                        });

                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'error', data: err.message }));
                    }
                }
            } else if (data.type === 'data') {
                // Handled inside connect
            }
        } catch (err) {
            console.error('WS Error:', err);
        }
    });

    ws.on('close', () => {
        if (connection) {
            if (connection.end) connection.end();
            if (connection.destroy) connection.destroy();
        }
    });
});

const PORT = 3010;
server.listen(PORT, () => {
    console.log(`Terminal WebSocket Server listening on port ${PORT}`);
});
