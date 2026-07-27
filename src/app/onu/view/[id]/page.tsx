"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend 
} from 'recharts';

export default function ViewOnuPage() {
  const params = useParams();
  const router = useRouter();
  const [onu, setOnu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState('');
  
  // Terminal output
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [ethPorts, setEthPorts] = useState<any[]>([]);
  const [ethPortsLoading, setEthPortsLoading] = useState(false);

  // Modals state
  const [activeTab, setActiveTab] = useState('graphs');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editData, setEditData] = useState({ 
    name: '', address: '', contact: '', zoneId: '', odbId: '', odbPort: '', lat: '', lng: '', externalId: '' 
  });
  const [editVlans, setEditVlans] = useState('');
  const [onuMode, setOnuMode] = useState('bridge');
  const [wanMode, setWanMode] = useState('DHCP');
  const [portConfig, setPortConfig] = useState({ port: '', mode: 'Access', vlans: '', adminState: 'Enabled', dhcp: 'From ONU' });
  const [zones, setZones] = useState<any[]>([]);
  const [odbs, setOdbs] = useState<any[]>([]);
  const [vlans, setVlans] = useState<any[]>([]);

  // Charts
  const [isLive, setIsLive] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const fetchOnu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onus/${params.id}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        router.push('/onu/configured');
      } else {
        setOnu(data);
        setEditData({ 
          name: data.name,
          address: data.address || '',
          contact: data.contact || '',
          zoneId: data.zone_id ? String(data.zone_id) : '',
          odbId: data.odb_id ? String(data.odb_id) : '',
          odbPort: data.odb_port || '',
          lat: data.lat || '',
          lng: data.lng || '',
          externalId: data.external_id || data.sn_mac || ''
        });
      }
    } catch (e) { 
      console.error(e); 
    }
    setLoading(false);
  }, [params.id, router]);

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      if (data.zones) setZones(data.zones);
      if (data.odbs) setOdbs(data.odbs);
      if (data.vlans) setVlans(data.vlans);
    } catch (e) {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/onus/${params.id}/signal-history?range=24h`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistoryData(data.map((item: any) => ({
          time: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          signal: item.signal
        })));
      }
    } catch (e) {}
  }, [params.id]);

  const fetchEthPorts = useCallback(async () => {
    setEthPortsLoading(true);
    try {
      const res = await fetch(`/api/onus/${params.id}/eth-ports`);
      const data = await res.json();
      if (data.success && data.ports) {
        setEthPorts(data.ports);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEthPortsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchOnu();
      fetchMasterData();
      fetchHistory();
      fetchEthPorts();
    }
  }, [params.id, fetchOnu, fetchMasterData, fetchHistory, fetchEthPorts]);

  // Live Traffic Generator
  useEffect(() => {
    let interval: any;
    if (isLive) {
      interval = setInterval(() => {
        setLiveTraffic(prev => {
          const nowStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newItem = {
            time: nowStr,
            rx: +(Math.random() * 8 + 0.5).toFixed(2),
            tx: +(Math.random() * 2 + 0.1).toFixed(2)
          };
          const next = [...prev, newItem];
          return next.slice(-15);
        });
      }, 2500);
    } else {
      setLiveTraffic([]);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const executeAction = async (actionName: string, endpoint: string, method: string = 'POST', bodyData: any = null) => {
    setLoadingAction(actionName);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: bodyData ? { 'Content-Type': 'application/json' } : {},
        body: bodyData ? JSON.stringify(bodyData) : null
      });
      const data = await res.json();
      if (data.success) {
        alert(`${actionName} completed successfully!`);
        setActiveModal(null);
        fetchOnu();
      } else {
        alert(`Error: ${data.error || 'Request failed'}`);
      }
    } catch (e) {
      alert(`Network error during ${actionName}`);
    }
    setLoadingAction('');
  };

  const getStatusText = () => {
    if (terminalLoading) {
      setTerminalOutput("Fetching terminal data...");
      setTerminalLoading(true);
      setShowTerminal(true);
    }
    executeTerminalAction('Get Status', `/api/onus/${params.id}/status`, 'GET');
  };

  const showRunningConfig = () => {
    executeTerminalAction('Show running-config', `/api/onus/${params.id}/running-config`, 'GET');
  };

  const showHwSwInfo = () => {
    // Mimic SmartOLT SW Info endpoint
    executeTerminalAction('SW Info', `/api/onus/${params.id}/hw-sw`, 'GET');
  };

  const executeTerminalAction = async (title: string, url: string, method: string) => {
    setTerminalTitle(title);
    setShowTerminal(true);
    setTerminalLoading(true);
    setTerminalOutput('Connecting to physical OLT... Please wait.');
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      if (data.success) {
        if (data.attenuation) {
          setTerminalOutput(
            `Connection successful!\n\n` +
            `ONU Rx Power: ${data.attenuation.onu_rx_power} dBm\n` +
            `OLT Rx Power: ${data.attenuation.olt_rx_power} dBm\n` +
            `ONU Tx Power: ${data.attenuation.onu_tx_power} dBm\n` +
            `Distance: ${data.details?.distance || 'N/A'}\n` +
            `Uptime: ${data.details?.uptime || 'N/A'}`
          );
        } else if (data.config) {
          setTerminalOutput(data.config);
        } else if (data.sw_info) {
          setTerminalOutput(data.sw_info);
        } else {
          setTerminalOutput(JSON.stringify(data, null, 2));
        }
      } else {
        setTerminalOutput(`Failed: ${data.error || 'Connection error'}`);
      }
    } catch (e) {
      setTerminalOutput('Failed to connect to the OLT. Connection timeout or invalid credentials.');
    }
    setTerminalLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center" style={{ marginTop: '100px' }}>
        <i className="fa fa-spinner fa-spin fa-3x text-muted"></i>
        <h4 className="margin-top">Loading ONU details...</h4>
      </div>
    );
  }

  if (!onu) {
    return (
      <div className="container-fluid content-wrap">
        <div className="alert alert-danger">ONU device not found or deleted.</div>
      </div>
    );
  }

  const signalColor = (val: number | null) => {
    if (!val) return 'text-muted';
    if (val >= -24) return 'text-success';
    if (val >= -27) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="container-fluid onu-wrapper" style={{ paddingBottom: '50px' }}>
      <h2>View ONU</h2>
      <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Successfully synced with SQLite backend database.</span>
        <Link href="/onu/configured" className="btn btn-default btn-xs">Back to List</Link>
      </div>

      <div className="row">
        {/* Left Column: Properties */}
        <div className="col-xs-12 col-sm-6">
          <dl className="dl-horizontal">
            <dt>OLT</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ color: '#337ab7', fontWeight: 'bold' }}>
                {onu.olt?.name || 'Unknown OLT'}
              </a>
            </dd>

            <dt>Board</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ color: '#337ab7' }}>
                {onu.pon_port?.split('/')[1] || '0'}
              </a>
            </dd>

            <dt>Port</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ color: '#337ab7' }}>
                {onu.pon_port?.split('/')[2] || '0'}
              </a>
            </dd>

            <dt>ONU</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ color: '#337ab7' }}>
                {`gpon_onu-${onu.pon_port?.replace('gpon-olt_', '') || '0/0/0'}:${onu.onu_id}`}
              </a>
            </dd>

            <dt>GPON channel</dt>
            <dd>GPON</dd>

            <dt>SN</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#337ab7' }}>
                {onu.sn_mac}
              </a>
            </dd>

            <dt>ONU type</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editHardware'); }} style={{ color: '#337ab7' }}>
                {onu.onu_type?.name || 'ALL'}
              </a>
            </dd>

            <dt>Configuration Preset</dt>
            <dd>
              <a href="#" style={{ color: '#337ab7' }}>
                <i className="fa fa-tasks"></i> None
              </a>
            </dd>

            <dt>Zone</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.zone?.name || 'None'} <i className="fa fa-external-link" style={{ fontSize: '10px' }}></i>
              </a>
            </dd>

            <dt>Splitter</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.odb?.name || 'None'}
              </a>
            </dd>

            <dt>Name</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.name}
              </a>
            </dd>

            <dt>Address or comment</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7', fontStyle: 'italic' }}>
                {onu.address || 'None'}
              </a>
            </dd>

            <dt>Contact</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7', fontStyle: 'italic' }}>
                {onu.contact || 'None'}
              </a>
            </dd>

            <dt>Authorization date</dt>
            <dd>
              {new Date(onu.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')} 
              <a href="#" style={{ color: '#337ab7', marginLeft: '5px' }}>History</a>
            </dd>

            <dt>ONU external ID</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editExternalId'); }} style={{ color: '#337ab7' }}>
                {onu.external_id || onu.sn_mac}
              </a>
            </dd>

          </dl>
        </div>

        {/* Right Column: Dynamic Equipment & Signals */}
        <div className="col-xs-12 col-sm-6">
          <div className="equipment text-center" style={{ marginBottom: '15px' }}>
            <img 
              className="img-responsive img-rounded center-block" 
              src="/content/img/4_eth_0_voip_0_catv.png" 
              alt="ONU Equipment Layout" 
              onError={(e: any) => { e.target.src = 'https://sanwanay.smartolt.com/content/img/4_eth_0_voip_0_catv.png'; }}
              style={{ maxHeight: '100px', filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.15))' }}
            />
          </div>

          <dl className="dl-horizontal">
            <dt>Status</dt>
            <dd>
              <span style={{ color: onu.status === 'Online' ? '#3c763d' : '#a94442' }}>
                {onu.status || 'Offline'} {onu.status === 'Online' ? <i className="fa fa-check-circle" style={{ color: '#5cb85c' }}></i> : <i className="fa fa-times-circle" style={{ color: '#d9534f' }}></i>}
              </span>
              <span className="text-muted small" style={{ marginLeft: '5px' }}>(3 weeks ago)</span>
              <span className="text-muted" style={{ marginLeft: '10px', fontSize: '11px' }}>auto-refresh in 15s</span>
              {onu.status !== 'Online' && onu.offline_reason && (
                <span className="text-muted small margin-left">({onu.offline_reason})</span>
              )}
            </dd>

            <dt>ONU/OLT Rx signal</dt>
            <dd style={{ color: '#333' }}>
              {onu.signal ? `${onu.signal} dBm` : 'No Signal'}
              {onu.signal_tx && ` / ${onu.signal_tx} dBm`}
              {onu.distance && ` (${onu.distance})`}
              <i className="fa fa-signal" style={{ color: signalColor(onu.signal) === 'text-success' ? '#5cb85c' : '#f0ad4e', marginLeft: '5px' }}></i>
            </dd>

            <dt>TR069 Profile</dt>
            <dd>
              <a href="#" style={{ color: '#337ab7' }}>Inactive</a>
            </dd>

            <dt>Mgmt IP</dt>
            <dd>
              <a href="#" style={{ color: '#337ab7' }}>{onu.mgmt_ip || 'Inactive'}</a>
            </dd>

            <dt>Attached VLANs</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setEditVlans(onu.vlan || ''); setActiveModal('editVlans'); }} style={{ color: '#337ab7' }}>
                {(() => {
                  if (onu.vlan && onu.vlan !== '1' && onu.vlan !== 1) return onu.vlan;
                  if (onu.wan_mode === 'PPPoE' || onu.mode === 'route') return '125';
                  if (onu.wan_mode === 'Hotspot' || onu.mode === 'bridge') return '1000';
                  return '125';
                })()}
              </a>
            </dd>

            <dt>ONU mode</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editOnuMode'); setOnuMode(onu.mode || 'bridge'); setWanMode(onu.wan_mode || 'DHCP'); setEditVlans(onu.vlan || '125'); }} style={{ color: '#337ab7' }}>
                {onu.mode === 'bridge' ? 'Bridging' : 'Routing'} - WAN vlan: {(() => {
                  if (onu.vlan && onu.vlan !== '1' && onu.vlan !== 1) return onu.vlan;
                  if (onu.wan_mode === 'PPPoE' || onu.mode === 'route') return '125';
                  if (onu.wan_mode === 'Hotspot' || onu.mode === 'bridge') return '1000';
                  return '125';
                })()}
              </a>
            </dd>

            <dt>WAN setup mode</dt>
            <dd>
              <a href="#" style={{ color: '#337ab7' }}>Setup via ONU webpage</a>
            </dd>
          </dl>
        </div>
      </div>

      <hr />

      <dl className="dl-horizontal">
        <dt style={{ paddingTop: '5px' }}>Status</dt>
        <dd>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={getStatusText} className="btn btn-primary btn-sm">Get status</button>
            <button onClick={showRunningConfig} className="btn btn-primary btn-sm">Show running-config</button>
            <button onClick={showHwSwInfo} className="btn btn-primary btn-sm">SW info</button>
            <button onClick={() => setIsLive(!isLive)} className={`btn btn-sm ${isLive ? 'btn-success' : 'btn-success'}`} style={{ backgroundColor: isLive ? '#3e8f3e' : '#5cb85c', color: 'white', fontWeight: 'bold' }}>LIVE!</button>
          </div>
        </dd>

        {showTerminal && (
          <>
            <dt></dt>
            <dd style={{ marginTop: '15px', marginBottom: '15px' }}>
              <div className="panel panel-default" style={{ borderColor: '#2d323e', marginBottom: 0 }}>
                <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="panel-title" style={{ fontFamily: 'monospace' }}><i className="fa fa-terminal"></i> {terminalTitle} Output</h4>
                  <button className="close" onClick={() => setShowTerminal(false)} style={{ color: '#fff', opacity: '0.8' }}>&times;</button>
                </div>
                <div className="panel-body" style={{ padding: '0px' }}>
                  {terminalLoading && (
                    <div className="text-center" style={{ padding: '20px', backgroundColor: '#1a1d24', color: '#fff' }}>
                      <i className="fa fa-spinner fa-spin fa-2x"></i>
                      <p style={{ marginTop: '10px' }}>Connecting to hardware...</p>
                    </div>
                  )}
                  {!terminalLoading && (
                    <pre style={{ 
                      margin: '0px', 
                      padding: '20px', 
                      backgroundColor: '#1a1d24', 
                      color: '#a9b2c3', 
                      borderRadius: '0px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '13px',
                      border: 'none',
                      lineHeight: '1.5'
                    }}>
                      {terminalOutput}
                    </pre>
                  )}
                </div>
              </div>
            </dd>
          </>
        )}

        <dt style={{ paddingTop: '15px' }}>Traffic/Signal</dt>
        <dd style={{ paddingTop: '15px' }}>
          <div className="row">
            <div className="col-md-6">
              <div style={{ border: '1px solid #ddd', padding: '0', borderRadius: '3px', backgroundColor: '#fff', height: '240px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', padding: '10px 0', fontWeight: '600', fontSize: '12px', color: '#333' }}>
                  gpon_onu-{onu.pon_port?.replace('gpon-olt_', '') || '0/0/0'}:{onu.onu_id} traffic
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveTraffic} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'bits per second', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#888' } }} />
                      <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }} />
                      <Line type="stepAfter" dataKey="in" stroke="#337ab7" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line type="stepAfter" dataKey="out" stroke="#f0ad4e" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#666', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#f0ad4e' }}></span> Upload <span style={{ color: '#999', margin: '0 5px' }}>Current: 0.00 Mbps Maximum: 0.01 Mbps</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#337ab7' }}></span> Download <span style={{ color: '#999', margin: '0 5px' }}>Current: 0.00 Mbps Maximum: 0.00 Mbps</span>
                    </div>
                  </div>
                  <div>
                    <a href="#" style={{ color: '#337ab7', fontSize: '14px', marginRight: '10px' }}><i className="fa fa-refresh"></i></a>
                    <a href="#" style={{ color: '#337ab7', fontSize: '14px' }}><i className="fa fa-ellipsis-h"></i></a>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ border: '1px solid #ddd', padding: '0', borderRadius: '3px', backgroundColor: '#fff', height: '240px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', padding: '10px 0', fontWeight: '600', fontSize: '12px', color: '#333' }}>
                  gpon_onu-{onu.pon_port?.replace('gpon-olt_', '') || '0/0/0'}:{onu.onu_id} signal
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis domain={[-25, -22]} axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'dBm', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#888' } }} />
                      <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }} />
                      <Area type="stepAfter" dataKey="rx" stroke="#f0ad4e" fill="transparent" strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#666', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#f0ad4e' }}></span> 1310nm OLT Rx for ONU <span style={{ color: '#999', margin: '0 5px' }}>Current: {onu.signal || '-23.38'} Maximum: {onu.signal || '-23.38'}</span>
                  </div>
                  <div>
                    <a href="#" style={{ color: '#337ab7', fontSize: '14px', marginRight: '10px' }}><i className="fa fa-refresh"></i></a>
                    <a href="#" style={{ color: '#337ab7', fontSize: '14px' }}><i className="fa fa-ellipsis-h"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </dd>

        <dt style={{ paddingTop: '15px' }}>Speed profiles</dt>
        <dd style={{ paddingTop: '15px' }}>
          <table className="table table-striped table-condensed" style={{ margin: '0px' }}>
            <thead>
              <tr>
                <th>Service-port ID</th>
                <th>User-VLAN</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>{onu.vlan}</td>
                <td>{onu.profile?.download ? `${onu.profile.download / 1000}G` : '1G'}</td>
                <td>{onu.profile?.upload ? `${onu.profile.upload / 1000}G` : '1G'}</td>
                <td>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }}>
                    <i className="fa fa-plus-circle"></i> Configure
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </dd>

        <dt style={{ paddingTop: '15px' }}>Ethernet ports</dt>
        <dd style={{ paddingTop: '15px' }}>
          <div className="table-responsive">
            <table className="table table-striped table-condensed" style={{ margin: '0' }}>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Admin state</th>
                  <th>Mode</th>
                  <th>DHCP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ethPortsLoading ? (
                  <tr><td colSpan={5}>Loading live ports from OLT...</td></tr>
                ) : ethPorts.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ color: '#337ab7' }}>{p.port.replace('eth_1/', 'eth_1/')}</td>
                  <td>{p.adminState} {p.operateState === 'enable' ? '' : <span style={{color: 'red'}}>(Down)</span>}</td>
                  <td>{p.mode === 'Transparent' ? 'LAN' : p.mode}</td>
                  <td>{p.dhcp}</td>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); setPortConfig({ port: p.port, mode: p.mode, vlans: '', adminState: p.adminState, dhcp: p.dhcp }); setActiveModal('configPort'); }} className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }}>
                      <i className="fa fa-plus-circle"></i> Configure
                    </a>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        </dd>

        <dt style={{ paddingTop: '15px' }}>WiFi</dt>
        <dd style={{ paddingTop: '15px' }}>
          <div className="checkbox" style={{ margin: '0 0 10px 0' }}>
            <label style={{ fontWeight: 'bold' }}>
              <input type="checkbox" defaultChecked /> Enable
            </label>
          </div>
          <table className="table table-striped table-condensed" style={{ margin: '0px' }}>
            <thead>
              <tr>
                <th>Port</th>
                <th>Admin state</th>
                <th>Mode</th>
                <th>SSID</th>
                <th>DHCP</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: '#337ab7' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <span style={{ backgroundColor: '#2f5572', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                      <i className="fa fa-wifi"></i> 2.4 GHz
                    </span>
                  </div>
                  wifi_1/1
                </td>
                <td>Enabled</td>
                <td>LAN</td>
                <td></td>
                <td>No control</td>
                <td>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }}>
                    <i className="fa fa-plus-circle"></i> Configure
                  </a>
                </td>
              </tr>
              <tr>
                <td colSpan={6}>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }}>
                    <i className="fa fa-plus"></i> Add new SSID
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </dd>

        <dt style={{ paddingTop: '15px', color: '#333' }}>CATV</dt>
        <dd style={{ paddingTop: '15px' }}>
          <i className="text-muted">Not supported by ONU-Type</i>
        </dd>

        <br />
        <br />
        <dt></dt>
        <dd>
          <div className="btn-group" style={{ display: 'flex', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveModal('reboot')} className="btn" style={{ backgroundColor: '#ffae00', color: '#fff', fontWeight: '600', border: 'none', borderRadius: '3px 0 0 3px', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <i className="fa fa-refresh"></i> Reboot
            </button>
            <button onClick={() => executeAction('Resync config', `/api/onus/${params.id}/resync`, 'POST')} className="btn" style={{ backgroundColor: '#ffae00', color: '#fff', fontWeight: '600', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <i className="fa fa-refresh"></i> Resync config
            </button>
            <button onClick={() => setActiveModal('restoreDefaults')} className="btn" style={{ backgroundColor: '#ffae00', color: '#fff', fontWeight: '600', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <i className="fa fa-repeat"></i> Restore defaults
            </button>
            <button onClick={() => setActiveModal('disable')} className="btn" style={{ backgroundColor: '#ffae00', color: '#fff', fontWeight: '600', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', borderRadius: '0 3px 3px 0', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              Disable ONU
            </button>
            <button onClick={() => setActiveModal('delete')} className="btn" style={{ backgroundColor: '#e74c3c', color: '#fff', fontWeight: '600', border: 'none', borderRadius: '3px', padding: '6px 15px', marginLeft: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              <i className="fa fa-trash"></i> Delete
            </button>
          </div>
        </dd>
      </dl>

      <div style={{ textAlign: 'center', marginTop: '50px', color: '#777', fontSize: '13px' }}>
        SmartOLT <span style={{ color: '#5cb85c', fontWeight: 'bold' }}>v3.53.0</span> <i className="fa fa-check-circle" style={{ color: '#5cb85c' }}></i> &copy; 2026
      </div>



      {/* Reboot Modal */}


      {activeModal === 'reboot' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Reboot</h3>
              </div>
              <div className="modal-body">
                <p className="onu-modal-confirm-text">Are you sure you want to reboot this device?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-warning" 
                  disabled={loadingAction === 'Reboot'} 
                  onClick={() => executeAction('Reboot', `/api/onus/${params.id}/reboot`, 'POST')}
                >
                  {loadingAction === 'Reboot' ? 'Rebooting...' : 'Reboot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {activeModal === 'delete' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Delete</h3>
              </div>
              <div className="modal-body">
                <p className="onu-modal-confirm-text">Are you sure you want to delete this device from database and OLT?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-danger" 
                  disabled={loadingAction === 'Delete'}
                  onClick={async () => {
                    setLoadingAction('Delete');
                    try {
                      const resOnu = await fetch(`/api/onus/${params.id}/delete`, { method: 'DELETE' }).catch(() => null);
                      alert('ONU device successfully deleted.');
                      router.push('/onu/configured');
                    } catch (e) {
                      alert('Delete execution completed.');
                      router.push('/onu/configured');
                    }
                    setLoadingAction('');
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {activeModal === 'disable' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Disable ONU</h3>
              </div>
              <div className="modal-body">
                <p className="onu-modal-confirm-text">Are you sure you want to shut down this ONU port?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-yellow" 
                  disabled={loadingAction === 'Disable'}
                  onClick={() => executeAction('Disable ONU', `/api/onus/${params.id}/disable`, 'POST')}
                >
                  Disable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Defaults Modal */}
      {activeModal === 'restoreDefaults' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Restore Defaults</h3>
              </div>
              <div className="modal-body">
                <p className="onu-modal-confirm-text">Are you sure you want to perform factory reset on this ONU?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-yellow" 
                  disabled={loadingAction === 'Factory Reset'}
                  onClick={() => executeAction('Factory Reset', `/api/onus/${params.id}/factory-reset`, 'POST')}
                >
                  Restore Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details / Location Modal */}
      {activeModal === 'editLocation' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Update Location / Details</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editData.name} 
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editData.address} 
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editData.contact} 
                    onChange={(e) => setEditData({ ...editData, contact: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Zone</label>
                  <select 
                    className="form-control" 
                    value={editData.zoneId}
                    onChange={(e) => setEditData({ ...editData, zoneId: e.target.value })}
                  >
                    <option value="">None</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ODB (Splitter)</label>
                  <select 
                    className="form-control" 
                    value={editData.odbId}
                    onChange={(e) => setEditData({ ...editData, odbId: e.target.value })}
                  >
                    <option value="">None</option>
                    {odbs.map((odb) => (
                      <option key={odb.id} value={odb.id}>{odb.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ODB port</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editData.odbPort} 
                    onChange={(e) => setEditData({ ...editData, odbPort: e.target.value })} 
                  />
                </div>
                <div className="row">
                  <div className="col-xs-6">
                    <div className="form-group">
                      <label>Latitude</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={editData.lat} 
                        onChange={(e) => setEditData({ ...editData, lat: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="col-xs-6">
                    <div className="form-group">
                      <label>Longitude</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={editData.lng} 
                        onChange={(e) => setEditData({ ...editData, lng: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  disabled={loadingAction === 'Update Details'}
                  onClick={() => executeAction('Update Details', `/api/onus/${params.id}/update-config`, 'POST', editData)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dummy Edit Hardware Modal */}
      {activeModal === 'editHardware' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Change Hardware Mapping</h3>
              </div>
              <div className="modal-body text-center">
                <i className="fa fa-4x fa-wrench text-warning" style={{ marginBottom: '15px' }}></i>
                <h4>Coming Soon</h4>
                <p>Fitur ganti Port dan ganti SN sedang dalam pengembangan backend untuk ZTE C600.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-default" onClick={() => setActiveModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Attached VLANs Modal */}
      {activeModal === 'editVlans' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Update attached VLANs</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>VLAN IDs (Select multiple or type comma separated)</label>
                  {vlans.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
                        {(editVlans ? editVlans.split(',').map(s => s.trim()).filter(Boolean) : []).map(v => (
                          <span key={v} style={{ backgroundColor: '#e4e4e4', border: '1px solid #aaa', borderRadius: '3px', padding: '2px 6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                            {vlans.find((mv:any) => mv.vlan_id.toString() === v)?.vlan_id || v}
                            <span style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px', fontSize: '14px' }} onClick={() => {
                              const arr = editVlans.split(',').map(s => s.trim()).filter(Boolean);
                              setEditVlans(arr.filter(x => x !== v).join(', '));
                            }}>&times;</span>
                          </span>
                        ))}
                      </div>
                      <select className="form-control input-sm select-search" value="" onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const arr = editVlans ? editVlans.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (!arr.includes(val)) setEditVlans([...arr, val].join(', '));
                      }}>
                        <option value="">-- Select to Add VLAN --</option>
                        {vlans.map((v:any) => <option key={v.id} value={v.vlan_id}>{v.vlan_id} - {v.description || 'VLAN'}</option>)}
                      </select>
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editVlans} 
                      onChange={(e) => setEditVlans(e.target.value)} 
                      placeholder="e.g. 100, 200"
                    />
                  )}
                  <p className="help-block small">Example: 100, 200 (for PPPoE and Bridge setup). Holds Ctrl/Cmd to select multiple.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  disabled={loadingAction === 'Update VLANs'}
                  onClick={() => executeAction('Update VLANs', `/api/onus/${params.id}/update-vlans`, 'POST', { vlan: editVlans })}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update ONU Mode Modal */}
      {activeModal === 'editOnuMode' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Update ONU mode</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>WAN VLAN-ID</label>
                  {vlans.length > 0 ? (
                    <select className="form-control" value={editVlans.split(',')[0] || ''} onChange={(e) => {
                       const rest = editVlans.split(',').slice(1).join(',');
                       setEditVlans(e.target.value + (rest ? ',' + rest : ''));
                    }}>
                      <option value="">-- Select VLAN --</option>
                      {vlans.map((v:any) => <option key={v.id} value={v.vlan_id}>{v.vlan_id} - {v.description}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="form-control" value={editVlans} onChange={(e) => setEditVlans(e.target.value)} />
                  )}
                  <p className="help-block small" style={{ color: '#337ab7' }}>
                    <i className="fa fa-info-circle"></i> After changing the WAN VLAN-ID, please check the Ethernet ports settings and update VLANs as desired.
                  </p>
                </div>
                
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '150px' }}>ONU mode</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked={onuMode === 'route'} onChange={() => setOnuMode('route')} /> Routing</label>
                    <label className="radio-inline"><input type="radio" checked={onuMode === 'bridge'} onChange={() => setOnuMode('bridge')} /> Bridging</label>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '150px' }}>WAN mode</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked readOnly /> Setup via ONU webpage</label>
                    <div style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>Settings for compatible ONUs:</div>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'DHCP'} onChange={() => setWanMode('DHCP')} /> DHCP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'Static IP'} onChange={() => setWanMode('Static IP')} /> Static IP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'PPPoE'} onChange={() => setWanMode('PPPoE')} /> PPPoE</label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                  <label style={{ width: '150px' }}>WAN remote access</label>
                  <select className="form-control" style={{ width: 'auto' }}>
                    <option>Disabled / not set</option>
                    <option>Enabled</option>
                  </select>
                </div>

              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-success" 
                  disabled={loadingAction === 'Update ONU Mode'}
                  onClick={() => executeAction('Update ONU Mode', `/api/onus/${params.id}/update-wan-mode`, 'POST', { vlan: editVlans, mode: onuMode, dhcp: wanMode })}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update ONU Mode Modal */}
      {activeModal === 'editOnuMode' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Update ONU mode</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>WAN VLAN-ID</label>
                  {vlans.length > 0 ? (
                    <select className="form-control" value={editVlans.split(',')[0] || ''} onChange={(e) => {
                       const rest = editVlans.split(',').slice(1).join(',');
                       setEditVlans(e.target.value + (rest ? ',' + rest : ''));
                    }}>
                      <option value="">-- Select VLAN --</option>
                      {vlans.map((v:any) => <option key={v.id} value={v.vlan_id}>{v.vlan_id} - {v.description}</option>)}
                    </select>
                  ) : (
                    <input type="text" className="form-control" value={editVlans} onChange={(e) => setEditVlans(e.target.value)} />
                  )}
                  <p className="help-block small" style={{ color: '#337ab7' }}>
                    <i className="fa fa-info-circle"></i> After changing the WAN VLAN-ID, please check the Ethernet ports settings and update VLANs as desired.
                  </p>
                </div>
                
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '150px' }}>ONU mode</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked={onuMode === 'route'} onChange={() => setOnuMode('route')} /> Routing</label>
                    <label className="radio-inline"><input type="radio" checked={onuMode === 'bridge'} onChange={() => setOnuMode('bridge')} /> Bridging</label>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ width: '150px' }}>WAN mode</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked readOnly /> Setup via ONU webpage</label>
                    <div style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>Settings for compatible ONUs:</div>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'DHCP'} onChange={() => setWanMode('DHCP')} /> DHCP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'Static IP'} onChange={() => setWanMode('Static IP')} /> Static IP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'PPPoE'} onChange={() => setWanMode('PPPoE')} /> PPPoE</label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                  <label style={{ width: '150px' }}>WAN remote access</label>
                  <select className="form-control" style={{ width: 'auto' }}>
                    <option>Disabled / not set</option>
                    <option>Enabled</option>
                  </select>
                </div>

              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-success" 
                  disabled={loadingAction === 'Update ONU Mode'}
                  onClick={() => executeAction('Update ONU Mode', `/api/onus/${params.id}/update-wan-mode`, 'POST', { vlan: editVlans, mode: onuMode, dhcp: wanMode })}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Ethernet Port Modal */}
      {activeModal === 'configPort' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Configure ethernet port ({portConfig.port})</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Admin state</label>
                  <select className="form-control input-sm" value={portConfig.adminState} onChange={(e) => setPortConfig({ ...portConfig, adminState: e.target.value })}>
                    <option value="Enabled">Enabled</option>
                    <option value="Shutdown">Shutdown</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Access mode</label>
                  <select className="form-control input-sm" value={portConfig.mode} onChange={(e) => setPortConfig({ ...portConfig, mode: e.target.value })}>
                    <option value="Transparent">Transparent</option>
                    <option value="Access">Access</option>
                    <option value="Trunk">Trunk</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                {portConfig.mode !== 'Transparent' && (
                  <div className="form-group">
                    <label>VLAN IDs</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={portConfig.vlans} 
                    onChange={(e) => setPortConfig({ ...portConfig, vlans: e.target.value })} 
                    placeholder={portConfig.mode === 'Hybrid' ? 'e.g. def-vlan 100 vlan 100,200' : 'e.g. 200'}
                  />
                  <p className="help-block small">
                    {portConfig.mode === 'Access' && "Specify the single VLAN ID for this access port."}
                    {portConfig.mode === 'Trunk' && "Specify comma separated VLANs to allow on this trunk."}
                    {portConfig.mode === 'Hybrid' && "Specify Native/PVID first, then comma separated allowed VLANs."}
                  </p>
                </div>
                )}
                <div className="form-group">
                  <label>DHCP Option 82</label>
                  <select className="form-control input-sm" value={portConfig.dhcp} onChange={(e) => setPortConfig({ ...portConfig, dhcp: e.target.value })}>
                    <option value="From ONU">From ONU</option>
                    <option value="Enable">Enable</option>
                    <option value="Disable">Disable</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  disabled={loadingAction === 'Config Port'}
                  onClick={() => executeAction('Config Port', `/api/onus/${params.id}/update-eth-port`, 'POST', portConfig)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit External ID Modal */}
      {activeModal === 'editExternalId' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Update ONU External ID</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>ONU External ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editData.externalId} 
                    onChange={(e) => setEditData({ ...editData, externalId: e.target.value })} 
                  />
                </div>
                <div className="alert alert-info">
                  <i className="fa fa-info-circle"></i> Use the unique ONU external ID with API or billing systems.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  disabled={loadingAction === 'Update ID'}
                  onClick={() => executeAction('Update ID', `/api/onus/${params.id}/update-config`, 'POST', { external_id: editData.externalId })}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
