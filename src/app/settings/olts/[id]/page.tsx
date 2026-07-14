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
  const [ipPoolSubTab, setIpPoolSubTab] = useState<'internet' | 'mgmt'>('internet');
  const [advancedInfo, setAdvancedInfo] = useState<any>(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [acls, setAcls] = useState<any[]>([]);
  const [loadingAcls, setLoadingAcls] = useState(false);
  const [customProfiles, setCustomProfiles] = useState<any[]>([]);
  const [loadingCustomProfiles, setLoadingCustomProfiles] = useState(false);
  const [voipProfiles, setVoipProfiles] = useState<any[]>([]);
  const [loadingVoipProfiles, setLoadingVoipProfiles] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleVisibility = (field: string) => {
    setVisibleFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

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
    if (activeTab === 'acls' && acls.length === 0) fetchAcls();
    if (activeTab === 'custom_profiles' && customProfiles.length === 0) fetchCustomProfiles();
    if (activeTab === 'voip_profiles' && voipProfiles.length === 0) fetchVoipProfiles();
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

  const fetchAcls = async () => {
    setLoadingAcls(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/acls`);
      const data = await res.json();
      if (!data.error) setAcls(data);
    } catch (e) {}
    setLoadingAcls(false);
  };

  const fetchCustomProfiles = async () => {
    setLoadingCustomProfiles(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/speed-profiles`);
      const data = await res.json();
      if (!data.error) setCustomProfiles(data);
    } catch (e) {}
    setLoadingCustomProfiles(false);
  };

  const fetchVoipProfiles = async () => {
    setLoadingVoipProfiles(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}/voip-profiles`);
      const data = await res.json();
      if (!data.error) setVoipProfiles(data);
    } catch (e) {}
    setLoadingVoipProfiles(false);
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
    { id: 'olt_details', label: 'OLT details' },
    { id: 'olt_cards', label: 'OLT cards' },
    { id: 'pon_ports', label: 'PON ports' },
    { id: 'uplink', label: 'Uplink' },
    { id: 'vlans', label: 'VLANs' },
    { id: 'ip_pools', label: 'ONU IP Pools' },
    { id: 'acls', label: 'Remote ACLs' },
    { id: 'custom_profiles', label: 'Custom profiles' },
    { id: 'voip_profiles', label: 'VoIP profiles' },
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <a 
          href="/settings/olts"
          className="btn btn-success margin-bottom" 
        >
          <i className="fa fa-arrow-left"></i> Back to OLTs list
        </a>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs" style={{ marginBottom: '15px' }}>
        {tabs.map(tab => (
          <li key={tab.id} className={activeTab === tab.id ? 'active' : ''}>
            <a 
              href={`#${tab.id}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              data-toggle="tab"
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      {activeTab === 'olt_details' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <a href={`/olt/edit/${id}`} className="btn btn-success margin-bottom">Edit OLT settings</a>
            <a href={`/olt/history/${id}`} className="btn btn-info margin-bottom margin-left">See history</a>
            <a href={`/olt/cli/${id}`} className="btn btn-primary margin-bottom margin-left"><i className="fa fa-terminal"></i> {`>_ Cli`}</a>
            <a href={`/olt/backups/${id}`} className="btn btn-success margin-bottom margin-left">Config backups</a>
          </div>

          <div className="row">
            <div className="col-md-7">
              <table className="table table-striped" style={{ backgroundColor: '#fff' }}>
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
                      {visibleFields.telnet_user ? olt.telnet_user : '********'} 
                      <i 
                        className={`fa ${visibleFields.telnet_user ? 'fa-eye-slash' : 'fa-eye'} text-primary`} 
                        style={{ cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => toggleVisibility('telnet_user')}
                      ></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>OLT telnet password</td>
                    <td>
                      {visibleFields.telnet_pass ? olt.telnet_pass : '********'} 
                      <i 
                        className={`fa ${visibleFields.telnet_pass ? 'fa-eye-slash' : 'fa-eye'} text-primary`} 
                        style={{ cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => toggleVisibility('telnet_pass')}
                      ></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>SNMP read-only community</td>
                    <td>
                      {visibleFields.snmp_ro ? olt.snmp_ro : '********'} 
                      <i 
                        className={`fa ${visibleFields.snmp_ro ? 'fa-eye-slash' : 'fa-eye'} text-primary`} 
                        style={{ cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => toggleVisibility('snmp_ro')}
                      ></i>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#555' }}>SNMP read-write community</td>
                    <td>
                      {visibleFields.snmp_rw ? olt.snmp_rw : '********'} 
                      <i 
                        className={`fa ${visibleFields.snmp_rw ? 'fa-eye-slash' : 'fa-eye'} text-primary`} 
                        style={{ cursor: 'pointer', marginLeft: '5px' }}
                        onClick={() => toggleVisibility('snmp_rw')}
                      ></i>
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
                
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <img 
                       src={olt.hardware_version?.includes('C220') ? "https://sanwanay.smartolt.com/content/img/ZTE-C220.png" : "https://sanwanay.smartolt.com/content/img/ZTE-C600.png"} 
                       alt="OLT hardware" 
                       style={{ maxWidth: '100%' }} 
                    />
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

      {/* ONU IP Pools Tab with sub-tabs: internet & mgmt */}
      {activeTab === 'ip_pools' && (
        <div>
          {/* Sub-tab nav */}
          <ul className="nav nav-pills" style={{ marginBottom: '15px' }}>
            <li className={ipPoolSubTab === 'internet' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); setIpPoolSubTab('internet'); }}>Internet IP pools</a>
            </li>
            <li className={ipPoolSubTab === 'mgmt' ? 'active' : ''} style={{ marginLeft: '5px' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setIpPoolSubTab('mgmt'); }}>Management IP pools</a>
            </li>
          </ul>

          {/* Internet sub-tab */}
          {ipPoolSubTab === 'internet' && (
            <div className="panel panel-default border-0 shadow-sm">
              <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                <strong style={{ color: '#4a5568' }}>ONU Internet IP Addresses</strong>
                <span className="text-muted small" style={{ marginLeft: '10px' }}>Assigned WAN/PPPoE IPs per ONU</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>ONU Name</th>
                      <th>SN / MAC</th>
                      <th>WAN Mode</th>
                      <th>PPPoE User</th>
                      <th>Status</th>
                      <th>Interface</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mgmtIpList.length > 0 ? mgmtIpList.map((onu: any, i: number) => (
                      <tr key={i}>
                        <td><strong><a href={`/onu/view/${onu.id}`}>{onu.name}</a></strong></td>
                        <td className="text-muted small"><code>{onu.sn_mac}</code></td>
                        <td><span className="label label-info">{onu.wan_mode || 'PPPoE'}</span></td>
                        <td>{onu.pppoe_user || <span className="text-muted">—</span>}</td>
                        <td><span className={`label ${onu.status === 'Online' ? 'label-success' : 'label-default'}`}>{onu.status}</span></td>
                        <td className="text-muted small">{onu.pon_port}:{onu.onu_id}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '30px' }}>No ONUs with internet IP found for this OLT.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mgmt sub-tab */}
          {ipPoolSubTab === 'mgmt' && (
            <div className="panel panel-default border-0 shadow-sm">
              <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                <strong style={{ color: '#4a5568' }}>ONU Management IP Addresses</strong>
                <span className="text-muted small" style={{ marginLeft: '10px' }}>In-band management IPs per ONU</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th>ONU Name</th>
                      <th>SN / MAC</th>
                      <th>Management IP</th>
                      <th>Interface</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mgmtIpList.filter((o: any) => o.mgmt_ip).length > 0 ? mgmtIpList.filter((o: any) => o.mgmt_ip).map((onu: any, i: number) => (
                      <tr key={i}>
                        <td><strong>{onu.name}</strong></td>
                        <td className="text-muted small"><code>{onu.sn_mac}</code></td>
                        <td style={{ color: '#0056b3', fontWeight: 'bold' }}>{onu.mgmt_ip}</td>
                        <td>{onu.pon_port} / {onu.onu_id}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '30px' }}>No ONUs with management IP found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remote ACLs Tab */}
      {activeTab === 'acls' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <strong style={{ color: '#4a5568' }}>Remote Access Control Lists</strong>
            <div>
              <button className="btn btn-default btn-xs" onClick={fetchAcls} disabled={loadingAcls} style={{ marginRight: '10px' }}>
                <i className={loadingAcls ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
              </button>
              <button className="btn btn-primary btn-xs">
                <i className="fa fa-plus"></i> Add ACL rule
              </button>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
             {loadingAcls ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching ACLs...</p></div>
             ) : (
            <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th>Rule name</th>
                  <th>IP / Network</th>
                  <th>Port range</th>
                  <th>Protocol</th>
                  <th>Action</th>
                  <th style={{ textAlign: 'center' }}>Operations</th>
                </tr>
              </thead>
              <tbody>
                {acls.length > 0 ? acls.map((acl, i) => (
                  <tr key={i}>
                    <td>{acl.name}</td>
                    <td>{acl.ip}</td>
                    <td>{acl.port_range}</td>
                    <td>{acl.protocol}</td>
                    <td>{acl.action}</td>
                    <td></td>
                  </tr>
                )) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '40px' }}>
                    <i className="fa fa-shield fa-2x" style={{ display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                    No Remote ACL rules configured for this OLT.
                    <br/>
                    <small>ACL rules control which IPs can access the OLT management interface remotely.</small>
                  </td>
                </tr>
                )}
              </tbody>
            </table>
             )}
          </div>
        </div>
      )}

      {/* Custom Profiles Tab */}
      {activeTab === 'custom_profiles' && (
        <div>
          <div className="panel panel-default border-0 shadow-sm" style={{ marginBottom: '15px' }}>
            <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <strong style={{ color: '#4a5568' }}>Custom ONU Bandwidth Profiles</strong>
              <div>
                <button className="btn btn-default btn-xs" onClick={fetchCustomProfiles} disabled={loadingCustomProfiles} style={{ marginRight: '10px' }}>
                  <i className={loadingCustomProfiles ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
                </button>
                <a href="/settings/speed-profiles" className="btn btn-primary btn-xs">
                  <i className="fa fa-plus"></i> Manage speed profiles
                </a>
              </div>
            </div>
            <div className="panel-body">
              <p className="text-muted small" style={{ margin: 0 }}>
                Custom profiles allow defining per-ONU bandwidth limits that override default speed profiles.
                These are pushed directly to the OLT via Telnet when an ONU is provisioned.
              </p>
            </div>
          </div>
          <div className="panel panel-default border-0 shadow-sm">
            <div className="panel-body" style={{ padding: 0 }}>
             {loadingCustomProfiles ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching Custom Profiles...</p></div>
             ) : (
              <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>Profile name</th>
                    <th>Download</th>
                    <th>Upload</th>
                    <th>ONUs using</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customProfiles.length > 0 ? customProfiles.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.download} Kbps</td>
                      <td>{p.upload} Kbps</td>
                      <td>{p.onus_using}</td>
                      <td className="text-center">
                         <a href="/settings/speed-profiles" className="btn btn-xs btn-default"><i className="fa fa-edit"></i> Edit</a>
                      </td>
                    </tr>
                  )) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: '30px' }}>
                      No custom profiles configured yet. Use <a href="/settings/speed-profiles">Speed Profiles</a> to create one.
                    </td>
                  </tr>
                  )}
                </tbody>
              </table>
             )}
            </div>
          </div>
        </div>
      )}

      {/* VoIP Profiles Tab */}
      {activeTab === 'voip_profiles' && (
        <div>
          <div className="panel panel-default border-0 shadow-sm" style={{ marginBottom: '15px' }}>
            <div className="panel-heading" style={{ backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <strong style={{ color: '#4a5568' }}>VoIP Profiles</strong>
              <div>
                <button className="btn btn-default btn-xs" onClick={fetchVoipProfiles} disabled={loadingVoipProfiles} style={{ marginRight: '10px' }}>
                  <i className={loadingVoipProfiles ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
                </button>
                <button className="btn btn-primary btn-xs">
                  <i className="fa fa-plus"></i> Add VoIP profile
                </button>
              </div>
            </div>
            <div className="panel-body">
              <p className="text-muted small" style={{ margin: 0 }}>
                VoIP profiles configure SIP parameters for ONUs with telephony (POTS) ports.
                Profiles are applied during ONU provisioning.
              </p>
            </div>
          </div>
          <div className="panel panel-default border-0 shadow-sm">
            <div className="panel-body" style={{ padding: 0 }}>
             {loadingVoipProfiles ? (
                <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i><p>Fetching VoIP Profiles...</p></div>
             ) : (
              <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>Profile name</th>
                    <th>SIP server</th>
                    <th>SIP port</th>
                    <th>Codec</th>
                    <th>ONUs using</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {voipProfiles.length > 0 ? voipProfiles.map((v, i) => (
                    <tr key={i}>
                      <td>{v.name}</td>
                      <td>{v.sip_server}</td>
                      <td>{v.sip_port}</td>
                      <td>{v.codec}</td>
                      <td>{v.onus_using}</td>
                      <td></td>
                    </tr>
                  )) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '30px' }}>
                      <i className="fa fa-phone fa-2x" style={{ display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                      No VoIP profiles configured for this OLT.
                    </td>
                  </tr>
                  )}
                </tbody>
              </table>
             )}
            </div>
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
                     {advancedInfo?.raw_version || "No info available. Connect to OLT first."}
                   </pre>
                </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
}
