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
  const [wanIpSource, setWanIpSource] = useState('Manual IP');
  const [wanIpv4, setWanIpv4] = useState('');
  const [wanMask, setWanMask] = useState('');
  const [wanGw, setWanGw] = useState('');
  const [wanDns1, setWanDns1] = useState('');
  const [wanDns2, setWanDns2] = useState('');
  const [wanUser, setWanUser] = useState('');
  const [wanPass, setWanPass] = useState('');
  const [wanRemote, setWanRemote] = useState('');
  const [portConfig, setPortConfig] = useState<any>({ port: '', mode: 'Transparent', vlans: '', adminState: 'Enabled', dhcp: 'From ONU' });
  const [wifiConfig, setWifiConfig] = useState<any>({ port: '', mode: 'LAN', adminState: 'Enabled', ssid: '' });
  const [zones, setZones] = useState<any[]>([]);
  const [odbs, setOdbs] = useState<any[]>([]);
  const [vlans, setVlans] = useState<any[]>([]);
  const [speedProfiles, setSpeedProfiles] = useState<any[]>([]);
  const [selectedSpeedProfile, setSelectedSpeedProfile] = useState('');

  // Charts
  const [isLive, setIsLive] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState<any[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [refreshCountdown, setRefreshCountdown] = useState(15);

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const parts = payload.value ? payload.value.split(' ') : [];
    const time = parts[0] || '';
    const date = parts[1] || '';
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#888" fontSize={10}>{time}</text>
        {date && <text x={0} y={0} dy={24} textAnchor="middle" fill="#888" fontSize={10}>{date}</text>}
      </g>
    );
  };

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
          lat: data.lat || data.odb?.lat || '',
          lng: data.lng || data.odb?.lng || '',
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

      const spRes = await fetch('/api/settings/speed-profiles');
      const spData = await spRes.json();
      if (Array.isArray(spData)) setSpeedProfiles(spData);
    } catch (e) {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/onus/${params.id}/signal-history?range=24h`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistoryData(data.map((item: any) => {
          const dt = new Date(item.createdAt);
          const timeStr = dt.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
          const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
          return {
            time: `${timeStr} ${dateStr}`,
            rx: item.signal
          };
        }));
        
        // Note: Traffic history is not currently stored in DB, so we do not generate mock data here.
        setTrafficHistory([]);
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

  // Live Traffic fetch from physical OLT
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      setLiveTraffic([]); // Clear when starting
      
      const fetchLive = async () => {
        try {
          const res = await fetch(`/api/onus/${params.id}/traffic`);
          const data = await res.json();
          if (data.success) {
            const nowDt = new Date();
            const nTime = nowDt.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const nDate = nowDt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
            const newItem = {
              time: `${nTime} ${nDate}`,
              rx: data.rx,
              tx: data.tx
            };
            setLiveTraffic(prev => {
              const next = [...prev, newItem];
              return next.slice(-15);
            });
          }
        } catch (e) {
          console.error('Error fetching live traffic', e);
        }
      };

      fetchLive(); // Fetch immediately
      interval = setInterval(fetchLive, 3000); // Poll every 3 seconds
    } else {
      setLiveTraffic([]);
    }
    return () => clearInterval(interval);
  }, [isLive, params.id]);

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

  const getStatusText = useCallback(async () => {
    try {
      const res = await fetch(`/api/onus/${params.id}/status`, { method: 'GET' });
      const data = await res.json();
      if (data.success) {
        fetchOnu();
        fetchHistory();
      } else {
        // Silently fail for auto-refresh, or log to console
        console.warn(`Failed to get status: ${data.error}`);
      }
    } catch (e) {
      console.error('Network error while getting status');
    }
  }, [params.id, fetchOnu, fetchHistory]);

  // Auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          getStatusText();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [getStatusText]);

  const showRunningConfig = () => {
    executeTerminalAction('Show running-config', `/api/onus/${params.id}/running-config`, 'GET');
  };

  const showHwSwInfo = () => {
    // Mimic SmartOLT SW Info endpoint
    executeTerminalAction('SW Info', `/api/onus/${params.id}/hw-sw`, 'GET');
  };

  const executeTerminalAction = async (title: string, url: string, method: string, bodyData: any = null) => {
    setTerminalTitle(title);
    setShowTerminal(true);
    setTerminalLoading(true);
    setTerminalOutput('Connecting to physical OLT... Please wait.');
    let result: any = null;
    try {
      const res = await fetch(url, { 
        method,
        headers: bodyData ? { 'Content-Type': 'application/json' } : {},
        body: bodyData ? JSON.stringify(bodyData) : null
      });
      const data = await res.json();
      result = data;
      if (data.success) {
        if (url.includes('update-eth-port')) fetchEthPorts();
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
        } else if (data.result) {
          setTerminalOutput(`Connecting to OLT...\n\n${data.result}`);
        } else if (data.message) {
          setTerminalOutput(`Connecting to OLT...\n\n${data.message}`);
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
    return result;
  };

  const handleDelete = async () => {
    setActiveModal(null);
    const res = await executeTerminalAction('Delete', `/api/onus/${params.id}/delete`, 'DELETE');
    if (res?.success) {
      setTimeout(() => router.push('/onu/configured'), 1500);
    } else {
      fetchOnu();
    }
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
    if (val <= -30) return 'text-danger';
    if (val <= -27) return 'text-warning';
    return 'text-success';
  };

  const formatSpeed = (kbps?: number | null) => {
    if (!kbps || kbps <= 0) return '1G';
    if (kbps >= 1000000) return `${(kbps / 1000000).toFixed(kbps % 1000000 === 0 ? 0 : 1)}G`;
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(0)}M`;
    return `${kbps}K`;
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
                {`gpon_onu-${onu.pon_port?.replace(/gpon[-_]olt[-_]/i, '') || '0/0/0'}:${onu.onu_id}`}
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
                {onu.status !== 'Online' && onu.offline_reason?.toLowerCase() === 'los' ? 'LOS' : (onu.status || 'Offline')} 
                {' '}
                {onu.status === 'Online' ? <i className="fa fa-check-circle" style={{ color: '#5cb85c' }}></i> : <i className="fa fa-times-circle" style={{ color: '#d9534f' }}></i>}
              </span>
              <span className="text-muted small" style={{ marginLeft: '5px' }}>(3 weeks ago)</span>
              <span className="text-muted" style={{ marginLeft: '10px', fontSize: '11px' }}>auto-refresh in {refreshCountdown}s</span>
              {onu.status !== 'Online' && onu.offline_reason && onu.offline_reason?.toLowerCase() !== 'los' && (
                <span className="text-muted small" style={{ marginLeft: '5px' }}>({onu.offline_reason})</span>
              )}
            </dd>

            <dt>ONU/OLT Rx signal</dt>
            <dd style={{ color: '#333' }}>
              {onu.status === 'Online' && onu.signal ? (
                <>
                  {`${Number(onu.signal).toFixed(2)} dBm`}
                  {onu.signal_tx && ` / ${Number(onu.signal_tx).toFixed(2)} dBm`}
                  {onu.distance && ` (${onu.distance})`}
                  <i className="fa fa-signal" style={{ color: signalColor(onu.signal) === 'text-success' ? '#5cb85c' : '#f0ad4e', marginLeft: '5px' }}></i>
                </>
              ) : (
                <span className="text-muted">-</span>
              )}
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
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editOnuMode'); setOnuMode(onu.mode || 'bridge'); setWanMode(onu.wan_mode || 'DHCP'); setEditVlans(onu.vlan || '125'); }} style={{ color: '#337ab7' }}>
                {onu.mode === 'bridge' ? 'Setup via ONU webpage' : (onu.wan_mode || 'DHCP')}
              </a>
            </dd>

            {onu.mode === 'route' && onu.wan_mode === 'PPPoE' && (
              <>
                <dt>PPPoE Username</dt>
                <dd>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editOnuMode'); setOnuMode(onu.mode || 'bridge'); setWanMode(onu.wan_mode || 'DHCP'); setEditVlans(onu.vlan || '125'); setWanUser(onu.pppoe_user || ''); setWanPass(onu.pppoe_pass || ''); }} style={{ color: '#337ab7' }}>
                    {onu.pppoe_user || 'None'}
                  </a>
                </dd>
                <dt>PPPoE Password</dt>
                <dd>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editOnuMode'); setOnuMode(onu.mode || 'bridge'); setWanMode(onu.wan_mode || 'DHCP'); setEditVlans(onu.vlan || '125'); setWanUser(onu.pppoe_user || ''); setWanPass(onu.pppoe_pass || ''); }} style={{ color: '#337ab7' }}>
                    {onu.pppoe_pass ? '********' : 'None'}
                  </a>
                </dd>
              </>
            )}
            
            {onu.mode === 'route' && onu.wan_mode === 'Static IP' && (
               <>
                 <dt>Static IP</dt>
                 <dd>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('editOnuMode'); setOnuMode(onu.mode || 'bridge'); setWanMode(onu.wan_mode || 'DHCP'); setEditVlans(onu.vlan || '125'); }} style={{ color: '#337ab7' }}>
                    Configured
                  </a>
                 </dd>
               </>
            )}
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

        {isLive && (
          <>
            <dt></dt>
            <dd style={{ marginTop: '15px' }}>
              <div className="table-responsive">
                <table className="table table-bordered table-condensed" style={{ backgroundColor: '#fff', fontSize: '13px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50px' }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', height: '60px', color: '#999', fontSize: '11px' }}>Mbps</div>
                      </td>
                      <td style={{ verticalAlign: 'middle', width: '25%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', height: '60px', width: '100%' }}>
                           {/* chart placeholder */}
                        </div>
                      </td>
                      <td colSpan={4} style={{ verticalAlign: 'middle' }}>
                         <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span><strong>{new Date().toLocaleTimeString([], { hour12: false })}</strong></span>
                              <span style={{ color: '#f0ad4e' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#f0ad4e', marginRight: '4px' }}></span>upload: 0</span>
                              <span style={{ color: '#337ab7' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#337ab7', marginRight: '4px' }}></span>download: 0</span>
                            </div>
                         </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <strong><i className="fa fa-arrow-up"></i> U Speed</strong>
                        <span style={{ float: 'right' }}>{(liveTraffic.length > 0 ? liveTraffic[liveTraffic.length - 1].tx : 0).toFixed(2)} Mbps</span>
                      </td>
                      <td><strong>Max</strong></td>
                      <td>1.76 Mbps</td>
                      <td><strong>Pps</strong></td>
                      <td>0</td>
                      <td><strong>Avg size</strong></td>
                      <td>0</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <strong><i className="fa fa-arrow-down"></i> D Speed</strong>
                        <span style={{ float: 'right' }}>{(liveTraffic.length > 0 ? liveTraffic[liveTraffic.length - 1].rx : 0).toFixed(2)} Mbps</span>
                      </td>
                      <td><strong>Max</strong></td>
                      <td>58.14 Mbps</td>
                      <td><strong>Pps</strong></td>
                      <td>0</td>
                      <td><strong>Avg size</strong></td>
                      <td>0</td>
                    </tr>
                  </tbody>
                </table>
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
                  gpon_onu-{onu.pon_port?.replace(/gpon[-_]olt[-_]/i, '') || '0/0/0'}:{onu.onu_id} traffic
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={isLive ? liveTraffic : (trafficHistory.length > 0 ? trafficHistory : [{time: 'Now', rx: 0, tx: 0}])} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={true} tickLine={false} tick={<CustomXAxisTick />} />
                      <YAxis axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(val) => (val > 0 ? val.toFixed(1) + 'M' : '0.0M')} label={{ value: 'bits per second', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#888' } }} />
                      <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }} />
                      <Area type="stepAfter" dataKey="rx" stroke="#337ab7" fill="rgba(51, 122, 183, 0.2)" strokeWidth={2} dot={false} isAnimationActive={false} name="Download" />
                      <Area type="stepAfter" dataKey="tx" stroke="#f0ad4e" fill="rgba(240, 173, 78, 0.2)" strokeWidth={2} dot={false} isAnimationActive={false} name="Upload" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#666', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#f0ad4e' }}></span> Upload <span style={{ color: '#999', margin: '0 5px' }}>Current: {((isLive ? liveTraffic : trafficHistory).slice(-1)[0]?.tx || 0).toFixed(2)} Mbps Maximum: {Math.max(0, ...(isLive ? liveTraffic : trafficHistory).map(d => d.tx || 0)).toFixed(2)} Mbps</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#337ab7' }}></span> Download <span style={{ color: '#999', margin: '0 5px' }}>Current: {((isLive ? liveTraffic : trafficHistory).slice(-1)[0]?.rx || 0).toFixed(2)} Mbps Maximum: {Math.max(0, ...(isLive ? liveTraffic : trafficHistory).map(d => d.rx || 0)).toFixed(2)} Mbps</span>
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
                  gpon_onu-{onu.pon_port?.replace(/gpon[-_]olt[-_]/i, '') || '0/0/0'}:{onu.onu_id} signal
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={historyData.length > 0 ? historyData : [{time: 'Now', rx: onu.signal || -25}]} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={true} tickLine={false} tick={<CustomXAxisTick />} />
                      <YAxis domain={['dataMin - 3', 'dataMax + 3']} axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'dBm', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '10px', fill: '#888' } }} />
                      <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="rx" stroke="#f0ad4e" strokeWidth={2} dot={false} isAnimationActive={false} name="Signal" />
                    </LineChart>
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
                <td>{formatSpeed(onu.profile?.download)}</td>
                <td>{formatSpeed(onu.profile?.upload)}</td>
                <td>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }} onClick={(e) => { e.preventDefault(); setSelectedSpeedProfile(onu.profile_id?.toString() || ''); setActiveModal('editSpeedProfile'); }}>
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
                  <td>{p.adminState} {['up', 'enable'].includes(p.operateState?.toLowerCase()) ? '' : (['n/a', 'unknown'].includes(p.operateState?.toLowerCase()) ? '' : <span style={{color: 'red'}}>(Down)</span>)}</td>
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
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }} onClick={(e) => { e.preventDefault(); setWifiConfig({ port: 'wifi_1/1', mode: 'LAN', adminState: 'Enabled', ssid: '' }); setActiveModal('configWifiPort'); }}>
                    <i className="fa fa-plus-circle"></i> Configure
                  </a>
                </td>
              </tr>
              <tr>
                <td colSpan={6}>
                  <a href="#" className="btn btn-link" style={{ padding: '0px', fontWeight: 'bold', color: '#337ab7' }} onClick={(e) => { e.preventDefault(); setWifiConfig({ port: 'wifi_1/2', mode: 'LAN', adminState: 'Enabled', ssid: '' }); setActiveModal('configWifiPort'); }}>
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
            {onu.enabled ? (
              <button onClick={() => setActiveModal('disable')} className="btn" style={{ backgroundColor: '#ffae00', color: '#fff', fontWeight: '600', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', borderRadius: '0 3px 3px 0', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                Disable ONU
              </button>
            ) : (
              <button onClick={() => setActiveModal('enable')} className="btn" style={{ backgroundColor: '#00a65a', color: '#fff', fontWeight: '600', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.3)', borderRadius: '0 3px 3px 0', padding: '6px 15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <i className="fa fa-play"></i> Enable ONU
              </button>
            )}
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
                  onClick={() => {
                    setActiveModal(null);
                    executeTerminalAction('Reboot', `/api/onus/${params.id}/reboot`, 'POST');
                  }}
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
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enable Modal */}
      {activeModal === 'enable' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Enable ONU</h3>
              </div>
              <div className="modal-body">
                <p className="onu-modal-confirm-text">Are you sure you want to enable (unlock) this ONU port?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-success" 
                  disabled={loadingAction === 'Enable'}
                  onClick={() => {
                    setActiveModal(null);
                    executeTerminalAction('Enable ONU', `/api/onus/${params.id}/enable`, 'POST');
                  }}
                >
                  Enable
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
                  onClick={() => {
                    setActiveModal(null);
                    executeTerminalAction('Disable ONU', `/api/onus/${params.id}/disable`, 'POST');
                  }}
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
                  onClick={() => {
                    setActiveModal(null);
                    executeTerminalAction('Factory Reset', `/api/onus/${params.id}/factory-reset`, 'POST');
                  }}
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

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <label style={{ width: '150px', paddingTop: '5px' }}>WAN mode</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked={wanMode === 'Setup via ONU webpage'} onChange={() => setWanMode('Setup via ONU webpage')} /> Setup via ONU webpage</label>
                    <div style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>Settings for compatible ONUs:</div>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'DHCP'} onChange={() => setWanMode('DHCP')} /> DHCP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'Static IP'} onChange={() => setWanMode('Static IP')} /> Static IP</label>
                      <label className="radio-inline"><input type="radio" checked={wanMode === 'PPPoE'} onChange={() => setWanMode('PPPoE')} /> PPPoE</label>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                  <label style={{ width: '150px' }}>Config method</label>
                  <div>
                    <label className="radio-inline"><input type="radio" checked readOnly /> OMCI</label>
                    <label className="radio-inline"><input type="radio" disabled /> TR069 - Inactive</label>
                  </div>
                </div>

                {wanMode === 'Static IP' && (
                  <>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ width: '150px' }}>WAN IP source</label>
                      <div>
                        <label className="radio-inline"><input type="radio" checked={wanIpSource === 'From IP pool'} onChange={() => setWanIpSource('From IP pool')} /> From IP pool</label>
                        <label className="radio-inline"><input type="radio" checked={wanIpSource === 'Manual IP'} onChange={() => setWanIpSource('Manual IP')} /> Manual IP</label>
                      </div>
                    </div>
                    {wanIpSource === 'Manual IP' && (
                      <div style={{ marginLeft: '150px', borderLeft: '3px solid #ddd', paddingLeft: '15px' }}>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>IPv4 Address</label>
                          <input type="text" className="form-control input-sm" value={wanIpv4} onChange={(e) => setWanIpv4(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Subnet Mask</label>
                          <input type="text" className="form-control input-sm" value={wanMask} onChange={(e) => setWanMask(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Default Gateway</label>
                          <input type="text" className="form-control input-sm" value={wanGw} onChange={(e) => setWanGw(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>DNS 1</label>
                          <input type="text" className="form-control input-sm" value={wanDns1} onChange={(e) => setWanDns1(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>DNS 2</label>
                          <input type="text" className="form-control input-sm" value={wanDns2} onChange={(e) => setWanDns2(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {wanMode === 'PPPoE' && (
                  <div style={{ marginLeft: '150px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Username</label>
                      <input type="text" className="form-control" value={wanUser} onChange={(e) => setWanUser(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Password</label>
                      <input type="text" className="form-control" value={wanPass} onChange={(e) => setWanPass(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                  <label style={{ width: '150px' }}>WAN remote access</label>
                  <select className="form-control" style={{ width: 'auto' }} value={wanRemote} onChange={(e) => setWanRemote(e.target.value)}>
                    <option value="Disabled / not set">Disabled / not set</option>
                    <option value="Enabled">Enabled</option>
                  </select>
                </div>

              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-success" 
                  disabled={loadingAction === 'Update ONU Mode'}
                  onClick={() => executeAction('Update ONU Mode', `/api/onus/${params.id}/update-wan-mode`, 'POST', { 
                    vlan: editVlans, 
                    mode: onuMode, 
                    dhcp: wanMode,
                    wanIpSource,
                    wanIpv4,
                    wanMask,
                    wanGw,
                    wanDns1,
                    wanDns2,
                    wanUser,
                    wanPass,
                    wanRemote
                  })}
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
                <form className="form-horizontal">
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>Status</label>
                    <div className="col-sm-9">
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethStatus" value="Enabled" checked={portConfig.adminState === 'Enabled'} onChange={(e) => setPortConfig({ ...portConfig, adminState: e.target.value })} /> Enabled
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethStatus" value="Shutdown" checked={portConfig.adminState === 'Shutdown'} onChange={(e) => setPortConfig({ ...portConfig, adminState: e.target.value })} /> Port shutdown
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>Mode</label>
                    <div className="col-sm-9">
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethMode" value="LAN" checked={portConfig.mode === 'LAN' || portConfig.mode === 'Transparent'} onChange={(e) => setPortConfig({ ...portConfig, mode: 'LAN' })} /> LAN
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethMode" value="Access" checked={portConfig.mode === 'Access'} onChange={(e) => setPortConfig({ ...portConfig, mode: 'Access' })} /> Access
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethMode" value="Hybrid" checked={portConfig.mode === 'Hybrid'} onChange={(e) => setPortConfig({ ...portConfig, mode: 'Hybrid' })} /> Hybrid
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethMode" value="Trunk" checked={portConfig.mode === 'Trunk'} onChange={(e) => setPortConfig({ ...portConfig, mode: 'Trunk' })} /> Trunk
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="ethMode" value="Transparent" checked={portConfig.mode === 'Transparent' || portConfig.mode === 'Transparent_old'} onChange={(e) => setPortConfig({ ...portConfig, mode: 'Transparent' })} /> Transparent
                      </label>
                    </div>
                  </div>

                  {portConfig.mode !== 'LAN' && portConfig.mode !== 'Transparent' && portConfig.mode !== 'Transparent_old' && (
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>VLAN IDs</label>
                      <div className="col-sm-9">
                        <input 
                          type="text" 
                          className="form-control" 
                          value={portConfig.vlans} 
                          onChange={(e) => setPortConfig({ ...portConfig, vlans: e.target.value })} 
                          placeholder={portConfig.mode === 'Hybrid' ? 'e.g. def-vlan 100 vlan 100,200' : 'e.g. 200'}
                        />
                        <p className="help-block small" style={{ margin: '5px 0 0 0' }}>
                          {portConfig.mode === 'Access' && "Specify the single VLAN ID for this access port."}
                          {portConfig.mode === 'Trunk' && "Specify comma separated VLANs to allow on this trunk."}
                          {portConfig.mode === 'Hybrid' && "Specify Native/PVID first, then comma separated allowed VLANs."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>DHCP</label>
                    <div className="col-sm-9">
                      <select className="form-control" style={{ maxWidth: '300px' }} value={portConfig.dhcp} onChange={(e) => setPortConfig({ ...portConfig, dhcp: e.target.value })}>
                        <option value="From ONU">From ONU</option>
                        <option value="No control">No control</option>
                        <option value="Enable">Enable</option>
                        <option value="Disable">Disable</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-success" 
                  disabled={loadingAction === 'Config Port'}
                  onClick={() => {
                    setActiveModal(null);
                    executeTerminalAction('Config Port', `/api/onus/${params.id}/update-eth-port`, 'POST', portConfig);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure WiFi Port Modal */}
      {activeModal === 'configWifiPort' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Configure WiFi port {wifiConfig.port}</h3>
              </div>
              <div className="modal-body">
                <form className="form-horizontal">
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>Status</label>
                    <div className="col-sm-9">
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiStatus" value="Enabled" checked={wifiConfig.adminState === 'Enabled'} onChange={(e) => setWifiConfig({ ...wifiConfig, adminState: e.target.value })} /> Enabled
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiStatus" value="Shutdown" checked={wifiConfig.adminState === 'Shutdown'} onChange={(e) => setWifiConfig({ ...wifiConfig, adminState: e.target.value })} /> Port shutdown
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>Mode</label>
                    <div className="col-sm-9">
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiMode" value="LAN" checked={wifiConfig.mode === 'LAN'} onChange={(e) => setWifiConfig({ ...wifiConfig, mode: 'LAN' })} /> LAN
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiMode" value="Access" checked={wifiConfig.mode === 'Access'} onChange={(e) => setWifiConfig({ ...wifiConfig, mode: 'Access' })} /> Access
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiMode" value="Hybrid" checked={wifiConfig.mode === 'Hybrid'} onChange={(e) => setWifiConfig({ ...wifiConfig, mode: 'Hybrid' })} /> Hybrid
                      </label>
                      <label className="radio-inline" style={{ marginTop: '5px' }}>
                        <input type="radio" name="wifiMode" value="Trunk" checked={wifiConfig.mode === 'Trunk'} onChange={(e) => setWifiConfig({ ...wifiConfig, mode: 'Trunk' })} /> Trunk
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>SSID</label>
                    <div className="col-sm-9">
                      <input 
                        type="text" 
                        className="form-control" 
                        value={wifiConfig.ssid} 
                        onChange={(e) => setWifiConfig({ ...wifiConfig, ssid: e.target.value })} 
                        placeholder="Default - factory SSID / user defined"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label className="col-sm-3 control-label" style={{ fontWeight: 'bold' }}>DHCP</label>
                    <div className="col-sm-9">
                      <p className="form-control-static" style={{ marginTop: '5px' }}>No control</p>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => {
                      setActiveModal(null);
                      executeTerminalAction('Clear WiFi Port Settings', `/api/onus/${params.id}/update-wifi-port`, 'POST', { ...wifiConfig, action: 'clear' });
                    }}
                  >
                    Clear WiFi port settings
                  </button>
                </div>
                <div>
                  <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                  <button 
                    className="btn btn-success" 
                    disabled={loadingAction === 'Config WiFi Port'}
                    onClick={() => {
                      setActiveModal(null);
                      executeTerminalAction('Config WiFi Port', `/api/onus/${params.id}/update-wifi-port`, 'POST', { ...wifiConfig, action: 'save' });
                    }}
                  >
                    Save
                  </button>
                </div>
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

      {/* Edit Speed Profile Modal */}
      {activeModal === 'editSpeedProfile' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h3 className="modal-title">Configure speed profile</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Speed profile</label>
                  <select 
                    className="form-control" 
                    value={selectedSpeedProfile} 
                    onChange={(e) => setSelectedSpeedProfile(e.target.value)}
                  >
                    <option value="">-- Select Profile --</option>
                    {speedProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({formatSpeed(p.download)}/{formatSpeed(p.upload)})</option>
                    ))}
                  </select>
                </div>
                <div className="alert alert-info" style={{ marginTop: '15px' }}>
                  <i className="fa fa-info-circle"></i> Changing the speed profile will instantly update the traffic limits on the OLT.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setActiveModal(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  disabled={!selectedSpeedProfile || loadingAction === 'Update Speed Profile'}
                  onClick={() => executeAction('Update Speed Profile', `/api/onus/${params.id}/update-speed-profile`, 'POST', { speedProfileId: selectedSpeedProfile })}
                >
                  Save configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
