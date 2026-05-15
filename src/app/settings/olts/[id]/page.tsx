"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OltDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [olt, setOlt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('olt_details');
  const [debugData, setDebugData] = useState<any>(null);

  // Real-time data states
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [ponPorts, setPonPorts] = useState<any[]>([]);
  const [loadingPonPorts, setLoadingPonPorts] = useState(false);
  const [uplinkPorts, setUplinkPorts] = useState<any[]>([]);
  const [loadingUplink, setLoadingUplink] = useState(false);
  const [vlanList, setVlanList] = useState<any[]>([]);
  const [loadingVlans, setLoadingVlans] = useState(false);
  const [mgmtIpList, setMgmtIpList] = useState<any[]>([]);
  const [loadingMgmt, setLoadingMgmt] = useState(false);
  const [advancedInfo, setAdvancedInfo] = useState<any>(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);

  useEffect(() => {
    const fetchOlt = async () => {
      try {
        const res = await fetch(`/api/settings/olt/${id}`);
        const data = await res.json();
        setDebugData(data);
        if (data && !data.error) {
          setOlt(data);
        }
      } catch (e: any) {
        setDebugData({ fetch_error: e.message });
      }
      setLoading(false);
    };
    fetchOlt();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'olt_cards' && cards.length === 0) {
      fetchCards();
    }
    if (activeTab === 'pon_ports' && ponPorts.length === 0) {
      fetchPonPorts();
    }
    if (activeTab === 'uplink' && uplinkPorts.length === 0) {
      fetchUplinkPorts();
    }
    if (activeTab === 'vlans' && vlanList.length === 0) {
      fetchVlans();
    }
    if (activeTab === 'onu_mgmt' && mgmtIpList.length === 0) {
      fetchMgmtIps();
    }
    if (activeTab === 'advanced' && !advancedInfo) {
      fetchAdvanced();
    }
  }, [activeTab, id]);

  const fetchCards = async () => {
    setLoadingCards(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/cards`);
      const data = await res.json();
      if (!data.error) setCards(data);
    } catch (e) {}
    setLoadingCards(false);
  };

  const fetchPonPorts = async () => {
    setLoadingPonPorts(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/pon-ports`);
      const data = await res.json();
      if (!data.error) setPonPorts(data);
    } catch (e) {}
    setLoadingPonPorts(false);
  };

  const fetchUplinkPorts = async () => {
    setLoadingUplink(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/uplink-ports`);
      const data = await res.json();
      if (!data.error) setUplinkPorts(data);
    } catch (e) {}
    setLoadingUplink(false);
  };

  const fetchVlans = async () => {
    setLoadingVlans(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/vlans`);
      const data = await res.json();
      if (!data.error) setVlanList(data);
    } catch (e) {}
    setLoadingVlans(false);
  };

  const fetchMgmtIps = async () => {
    setLoadingMgmt(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/onu-mgmt`);
      const data = await res.json();
      if (!data.error) setMgmtIpList(data);
    } catch (e) {}
    setLoadingMgmt(false);
  };

  const fetchAdvanced = async () => {
    setLoadingAdvanced(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/advanced`);
      const data = await res.json();
      if (!data.error) setAdvancedInfo(data);
    } catch (e) {}
    setLoadingAdvanced(false);
  };

  if (loading) {
    return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x text-primary"></i></div>;
  }

  if (!olt) {
    return (
      <div style={{ marginTop: '20px' }}>
        <div className="alert alert-danger">OLT not found (ID: {id})</div>
        <div className="well small">
           <strong>Debug Info from API:</strong>
           <pre>{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'olt_details', label: 'Olt details' },
    { id: 'olt_cards', label: 'OLT cards' },
    { id: 'pon_ports', label: 'PON ports' },
    { id: 'uplink', label: 'Uplink' },
    { id: 'vlans', label: 'VLANs' },
    { id: 'onu_mgmt', label: 'ONU Mgmt IPs' },
    { id: 'acls', label: 'Remote ACLs' },
    { id: 'custom_profiles', label: 'Custom profiles' },
    { id: 'voip_profiles', label: 'VoIP profiles' },
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn btn-primary" 
          style={{ backgroundColor: '#0056b3', borderColor: '#004b9a' }}
          onClick={() => router.push('/settings/olts')}
        >
          Back to OLTs list
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs" style={{ marginBottom: '15px' }}>
        {tabs.map(tab => (
          <li key={tab.id} className={activeTab === tab.id ? 'active' : ''}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              style={{ 
                color: activeTab === tab.id ? '#555' : '#337ab7', 
                fontWeight: activeTab === tab.id ? 'bold' : 'normal' 
              }}
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      {activeTab === 'olt_details' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary">Edit OLT settings</button>
            <button className="btn btn-info">See history</button>
            <button className="btn btn-success" style={{ backgroundColor: '#5cb85c', borderColor: '#4cae4c' }}>{`>_ Cli`}</button>
            <button className="btn btn-primary">Config backups</button>
          </div>

          <div className="row">
            <div className="col-md-7">
              <table className="table table-striped table-bordered" style={{ backgroundColor: '#fff' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '40%', fontWeight: 'bold', color: '#555' }}>Name</td>
                    <td>{olt.name}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>OLT IP</td>
                    <td>{olt.ip_address}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>Reachable via VPN tunnel</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>Telnet TCP port</td>
                    <td>{olt.telnet_port}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>OLT telnet username</td>
                    <td>
                      {olt.telnet_user} <i className="fa fa-eye text-primary" style={{ cursor: 'pointer', marginLeft: '5px' }}></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>OLT telnet password</td>
                    <td>
                      ******** <i className="fa fa-eye text-primary" style={{ cursor: 'pointer', marginLeft: '5px' }}></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>SNMP read-only community</td>
                    <td>
                      {olt.snmp_ro} <i className="fa fa-eye text-primary" style={{ cursor: 'pointer', marginLeft: '5px' }}></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>SNMP read-write community</td>
                    <td>
                      {olt.snmp_rw} <i className="fa fa-eye text-primary" style={{ cursor: 'pointer', marginLeft: '5px' }}></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>SNMP UDP port</td>
                    <td>{olt.snmp_port}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>IPTV module</td>
                    <td>Disabled</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-5 text-center">
              <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
                <h3 style={{ color: '#0056b3', marginTop: 0, fontWeight: 'bold' }}>ZTE<span style={{ fontSize: '18px', color: '#555', marginLeft: '5px' }}>中兴</span></h3>
                
                {/* Hardware Image Placeholder */}
                <div style={{ margin: '20px 0', height: '250px', backgroundColor: '#333', borderRadius: '5px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: '10px', width: '20px', height: '100%', backgroundColor: '#222' }}></div>
                    <div style={{ position: 'absolute', top: '10px', left: '40px', right: '10px', bottom: '10px', backgroundColor: '#555', display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '5px' }}>
                        {/* Fake ports */}
                        {Array.from({ length: 48 }).map((_, i) => (
                           <div key={i} style={{ width: '8%', height: '15px', backgroundColor: '#111', border: '1px solid #777' }}></div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                  <i className="fa fa-cog text-muted"></i>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>Uptime</span>
                  <span style={{ color: '#d9534f', fontWeight: 'bold' }}>{olt.uptime || "Unknown"}</span>
                  <span style={{ color: '#f0ad4e', fontWeight: 'bold' }}>{olt.temperature || "47°C"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'olt_cards' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>Cards Status</strong>
            <button className="btn btn-default btn-xs" onClick={fetchCards} disabled={loadingCards}>
              <i className={loadingCards ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingCards ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Connecting to OLT...</p></div>
             ) : (
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>Shelf</th><th>Slot</th><th>Type</th><th>Status</th><th>Role</th><th>SoftVer</th><th>CPU</th><th>Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.length > 0 ? cards.map((card, i) => (
                      <tr key={i}>
                        <td>{card.shelf}</td>
                        <td>{card.slot}</td>
                        <td><span className="label label-info">{card.type}</span></td>
                        <td><span className={`label ${card.status.toLowerCase().includes('service') ? 'label-success' : 'label-danger'}`}>{card.status}</span></td>
                        <td>{card.role}</td>
                        <td>{card.softVer}</td>
                        <td>{card.cpu}</td>
                        <td style={{ color: parseInt(card.temp) > 50 ? '#d9534f' : '#5cb85c', fontWeight: 'bold' }}>{card.temp}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="text-center text-muted">No cards detected or connection failed.</td></tr>
                    )}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}

      {activeTab === 'pon_ports' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>PON Ports</strong>
            <button className="btn btn-default btn-xs" onClick={fetchPonPorts} disabled={loadingPonPorts}>
              <i className={loadingPonPorts ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingPonPorts ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching PON ports status...</p></div>
             ) : (
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>Interface</th><th>Admin</th><th>Oper</th><th>ONUs (Online/Total)</th><th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ponPorts.length > 0 ? ponPorts.map((port, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{port.name}</td>
                        <td><span className={`label ${port.adminState === 'enable' ? 'label-success' : 'label-default'}`}>{port.adminState}</span></td>
                        <td><span className={`label ${port.operState === 'up' ? 'label-success' : 'label-danger'}`}>{port.operState}</span></td>
                        <td>
                           <div className="progress" style={{ height: '18px', marginBottom: 0, position: 'relative', width: '120px' }}>
                             <div 
                                className="progress-bar progress-bar-success" 
                                role="progressbar" 
                                style={{ width: `${(port.onus_online / (port.onus_total || 1)) * 100}%` }}
                             ></div>
                             <div style={{ position: 'absolute', width: '100%', textAlign: 'center', fontSize: '11px', lineHeight: '18px', fontWeight: 'bold', color: '#333' }}>
                               {port.onus_online} / {port.onus_total}
                             </div>
                           </div>
                        </td>
                        <td className="text-muted italic">{port.description}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center text-muted">No PON ports detected.</td></tr>
                    )}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}

      {activeTab === 'uplink' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>Uplink Ports (GEI/XE)</strong>
            <button className="btn btn-default btn-xs" onClick={fetchUplinkPorts} disabled={loadingUplink}>
              <i className={loadingUplink ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingUplink ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching uplink ports...</p></div>
             ) : (
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>Interface</th><th>Admin</th><th>Oper</th><th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uplinkPorts.length > 0 ? uplinkPorts.map((port, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{port.name}</td>
                        <td><span className={`label ${port.adminState === 'enable' ? 'label-success' : 'label-default'}`}>{port.adminState}</span></td>
                        <td><span className={`label ${port.operState === 'up' ? 'label-success' : 'label-danger'}`}>{port.operState}</span></td>
                        <td className="text-muted italic">{port.description}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center text-muted">No uplink ports detected.</td></tr>
                    )}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}

      {activeTab === 'vlans' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>VLANs on OLT</strong>
            <button className="btn btn-default btn-xs" onClick={fetchVlans} disabled={loadingVlans}>
              <i className={loadingVlans ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingVlans ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching VLANs...</p></div>
             ) : (
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>VLAN ID</th><th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vlanList.length > 0 ? vlanList.map((v, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{v.id}</td>
                        <td className="text-muted italic">{v.desc}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={2} className="text-center text-muted">No VLANs found or connection failed.</td></tr>
                    )}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}

      {activeTab === 'onu_mgmt' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>ONU Management IPs</strong>
            <button className="btn btn-default btn-xs" onClick={fetchMgmtIps} disabled={loadingMgmt}>
              <i className={loadingMgmt ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingMgmt ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching management IPs...</p></div>
             ) : (
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>ONU Name</th><th>SN</th><th>Management IP</th><th>Interface</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mgmtIpList.length > 0 ? mgmtIpList.map((onu, i) => (
                      <tr key={i}>
                        <td><strong>{onu.name}</strong></td>
                        <td className="text-muted small"><code>{onu.sn_mac}</code></td>
                        <td style={{ color: '#0056b3', fontWeight: 'bold' }}>{onu.mgmt_ip}</td>
                        <td>{onu.pon_port} / {onu.onu_id}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center text-muted">No ONUs with management IP found.</td></tr>
                    )}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4a5568' }}>Advanced System Information</strong>
            <button className="btn btn-default btn-xs" onClick={fetchAdvanced} disabled={loadingAdvanced}>
              <i className={loadingAdvanced ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="panel-body">
             {loadingAdvanced ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Connecting to OLT...</p></div>
             ) : (
                <div>
                   <h5 style={{ fontWeight: 'bold', color: '#555' }}>Running Version & Hardware Details</h5>
                   <pre style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', fontSize: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                     {advancedInfo?.raw_version || "No info available."}
                   </pre>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Add placeholders for remaining tabs */}
      {['acls', 'custom_profiles', 'voip_profiles'].includes(activeTab) && (
        <div className="panel panel-default">
           <div className="panel-body text-center text-muted">
              <i className="fa fa-cogs fa-3x" style={{ marginBottom: '10px' }}></i>
              <p>Module configuration coming soon...</p>
           </div>
        </div>
      )}

    </div>
  );
}
