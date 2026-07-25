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
                {onu.onu_type?.name || 'ZTE Generic'}
              </a>
            </dd>

            <dt>Zone</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.zone?.name || 'None'}
              </a>
            </dd>

            <dt>ODB (Splitter)</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.odb?.name || 'None'}
              </a>
            </dd>

            <dt>Name</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7', fontWeight: 'bold' }}>
                {onu.name}
              </a>
            </dd>

            <dt>Address or comment</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.address || 'None'}
              </a>
            </dd>

            <dt>Contact</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editLocation'); }} style={{ color: '#337ab7' }}>
                {onu.contact || 'None'}
              </a>
            </dd>

            <dt>Authorization date</dt>
            <dd>{new Date(onu.createdAt).toLocaleString()}</dd>

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
              <span className={`label ${onu.status === 'Online' ? 'label-success' : 'label-danger'}`} style={{ fontSize: '12px' }}>
                {onu.status || 'Offline'}
              </span>
              {onu.status !== 'Online' && onu.offline_reason && (
                <span className="text-muted small margin-left">({onu.offline_reason})</span>
              )}
            </dd>

            <dt>ONU/OLT Rx signal</dt>
            <dd className={signalColor(onu.signal)}>
              <strong>{onu.signal ? `${onu.signal} dBm` : 'No Signal'}</strong>
              {onu.signal_tx && <span className="text-muted small margin-left"> / OLT Rx: {onu.signal_tx} dBm</span>}
              {onu.distance && <span className="text-muted small margin-left">({onu.distance})</span>}
            </dd>

            <dt>Attached VLANs</dt>
            <dd>
              <a href="#" onClick={(e) => { e.preventDefault(); setEditVlans(onu.vlan || ''); setActiveModal('editVlans'); }} style={{ color: '#337ab7', fontWeight: 'bold' }}>
                {onu.vlan || 'None'}
              </a>
            </dd>

            <dt>ONU mode</dt>
            <dd>
              <span style={{ fontWeight: 'bold' }}>{onu.mode || 'Routing'}</span>
              <span className="text-muted small"> - WAN vlan: {onu.vlan} ({onu.wan_mode || 'PPPoE'})</span>
            </dd>

            <dt>TR069</dt>
            <dd>Inactive</dd>

            <dt>Mgmt IP</dt>
            <dd style={{ fontWeight: 'bold', color: onu.mgmt_ip ? '#337ab7' : '#999' }}>{onu.mgmt_ip || 'Inactive'}</dd>

            <dt>WAN setup mode</dt>
            <dd>Setup via ONU webpage</dd>
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
              <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', backgroundColor: '#fafafa', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={liveTraffic} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={20} iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="in" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Inbound" />
                    <Line type="monotone" dataKey="out" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Outbound" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', backgroundColor: '#fafafa', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis domain={[-40, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={20} iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="rx" stroke="#ffb848" fill="#ffb848" fillOpacity={0.1} strokeWidth={1.5} name="1310nm OLT Rx for ONU" />
                  </AreaChart>
                </ResponsiveContainer>
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
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold' }}>
                    <i className="glyphicon glyphicon-plus-sign"></i> Configure
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
                  <td>{p.port.replace('eth_1/', 'eth_0/')}</td>
                  <td>{p.adminState} {p.operateState === 'enable' ? '' : <span style={{color: 'red'}}>(Down)</span>}</td>
                  <td>{p.mode === 'Transparent' ? 'LAN' : p.mode}</td>
                  <td>{p.dhcp}</td>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); setPortConfig({ port: p.port, mode: p.mode, vlans: '', adminState: p.adminState, dhcp: p.dhcp }); setActiveModal('configPort'); }} className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold' }}>
                      <i className="glyphicon glyphicon-plus-sign"></i> Configure
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
                <td>wifi_0/1</td>
                <td>Enabled</td>
                <td>LAN</td>
                <td></td>
                <td>No control</td>
                <td>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold' }}>
                    <i className="glyphicon glyphicon-plus-sign"></i> Configure
                  </a>
                </td>
              </tr>
              <tr>
                <td colSpan={6}>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold' }}>
                    <i className="glyphicon glyphicon-plus"></i> Add new SSID
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </dd>

        <dt style={{ paddingTop: '15px' }}>VoIP service</dt>
        <dd style={{ paddingTop: '15px' }}>
          <a href="#" style={{ color: '#337ab7' }}>Disabled</a>
        </dd>

        <dt style={{ paddingTop: '15px' }}>CATV</dt>
        <dd style={{ paddingTop: '15px' }}>
          <i className="text-muted">Not supported by ONU-Type</i>
        </dd>

        <br />
        <br />
        <dt></dt>
        <dd>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button className="btn btn-warning" onClick={() => setActiveModal('reboot')} style={{ backgroundColor: '#f0ad4e', borderColor: '#eea236', color: '#fff' }}>
              <i className="glyphicon glyphicon-refresh"></i> Reboot
            </button>
            <button className="btn btn-warning" onClick={() => executeAction('Resync config', `/api/onus/${params.id}/resync`, 'POST')} style={{ backgroundColor: '#f9a123', borderColor: '#f9a123', color: '#fff' }}>
              <i className="glyphicon glyphicon-refresh"></i> Resync config
            </button>
            <button className="btn btn-warning" onClick={() => setActiveModal('restoreDefaults')} style={{ backgroundColor: '#f9a123', borderColor: '#f9a123', color: '#fff' }}>
              <i className="glyphicon glyphicon-repeat"></i> Restore defaults
            </button>
            <button className="btn btn-warning" onClick={() => setActiveModal('disable')} style={{ backgroundColor: '#f9a123', borderColor: '#f9a123', color: '#fff' }}>
              Disable ONU
            </button>
            <button className="btn btn-danger" onClick={() => setActiveModal('delete')}>
              <i className="glyphicon glyphicon-trash"></i> Delete
            </button>
          </div>
        </dd>
      </dl>



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
                    <select 
                      multiple 
                      className="form-control" 
                      style={{ height: '100px' }}
                      value={editVlans.split(',').map(v => v.trim()).filter(Boolean)} 
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setEditVlans(selected.join(','));
                      }}
                    >
                      {vlans.map(v => (
                        <option key={v.id} value={v.vlan_id}>{v.vlan_id} - {v.description}</option>
                      ))}
                    </select>
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
