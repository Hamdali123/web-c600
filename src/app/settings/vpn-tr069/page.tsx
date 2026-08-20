"use client";

import { useEffect, useState } from 'react';

export default function VpnTr069Page() {
  const [activeTab, setActiveTab] = useState('tunnel');
  
  // Data States
  const [tunnels, setTunnels] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [olts, setOlts] = useState<any[]>([]);
  
  // Loading States
  const [loadingTunnels, setLoadingTunnels] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // Accordion open states
  const [infoTunnelsOpen, setInfoTunnelsOpen] = useState(false);
  const [tunnelsOpen, setTunnelsOpen] = useState(true);
  
  const [infoTr069Open, setInfoTr069Open] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(true);

  // Form states
  const [showTunnelModal, setShowTunnelModal] = useState(false);
  const [tunnelForm, setTunnelForm] = useState({ name: '', subnet: '10.69.69.0/24' });
  const [editTunnelId, setEditTunnelId] = useState<number | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', acs_url: 'http://10.69.69.1:14501' });
  const [editProfileId, setEditProfileId] = useState<number | null>(null);

  // Logs / script modals
  const [logsTunnel, setLogsTunnel] = useState<any>(null);
  const [scriptTunnel, setScriptTunnel] = useState<any>(null);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [bindingSel, setBindingSel] = useState<Record<number, string>>({});
  const [filesProfile, setFilesProfile] = useState<any>(null);
  const [filesData, setFilesData] = useState<any>(null);

  const openLogs = async (t: any) => {
    setLogsTunnel(t);
    setLogEntries([]);
    try {
      const res = await fetch('/api/settings/system-logs');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLogEntries(arr.filter((l: any) =>
        (l.details && String(l.details).toLowerCase().includes(t.name.toLowerCase())) ||
        (l.action && String(l.action).toLowerCase().includes('vpn'))
      ).slice(0, 10));
    } catch (e) {}
  };

  const openScript = (t: any) => {
    const script = [
      `# Mikrotik VPN client setup (tunnel: ${t.name})`,
      `# Replace vpn-server.example.com with the public address of your VPN server.`,
      `/interface ovpn-client add connect-to=vpn-server.example.com port=1194 mode=ip name=${t.name} user=${t.name} password=changeme`,
      `/interface ovpn-client set ${t.name} disabled=no`,
      `/ip route add dst-address=${t.subnet || '10.69.69.0/24'} gateway=${t.name}`,
      ``,
      `# Notes:`,
      `# - The OLT must be reachable through this tunnel for TR069 to work.`,
      `# - Subnet in use: ${t.subnet || '10.69.69.0/24'}`
    ].join('\n');
    setScriptTunnel(t);
    (document.getElementById('mikrotik-script') as HTMLTextAreaElement).value = script;
  };

  const copyScript = async () => {
    const el = document.getElementById('mikrotik-script') as HTMLTextAreaElement;
    try {
      await navigator.clipboard.writeText(el.value);
      alert('Script copied to clipboard.');
    } catch (e) {
      el.select();
      document.execCommand('copy');
      alert('Script copied to clipboard.');
    }
  };

  const openFiles = async (p: any) => {
    setFilesProfile(p);
    setFilesData(null);
    try {
      const res = await fetch(`/api/onus/configured?profile=${p.id}&limit=100`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      const res2 = await fetch('/api/settings/auth-presets');
      const presets = await res2.json();
      const presetCount = Array.isArray(presets) ? presets.filter((x: any) => x.tr069_profile_id === p.id).length : 0;
      setFilesData({ onus: list.length, presetCount });
    } catch (e) {}
  };

  const handleSaveTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(editTunnelId ? `/api/settings/vpn?id=${editTunnelId}` : '/api/settings/vpn', {
        method: editTunnelId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tunnelForm),
      });
      if (res.ok) {
        setTunnelForm({ name: '', subnet: '10.69.69.0/24' });
        setEditTunnelId(null);
        setShowTunnelModal(false);
        fetchTunnels();
      }
    } catch (e) {}
  };

  const handleDeleteTunnel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tunnel?")) return;
    try {
      await fetch(`/api/settings/vpn?id=${id}`, { method: 'DELETE' });
      fetchTunnels();
    } catch (e) {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(editProfileId ? `/api/settings/tr069?id=${editProfileId}` : '/api/settings/tr069', {
        method: editProfileId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setProfileForm({ name: '', acs_url: 'http://10.69.69.1:14501' });
        setEditProfileId(null);
        setShowProfileModal(false);
        fetchProfiles();
      }
    } catch (e) {}
  };

  const handleSetOlts = async (p: any) => {
    const sel = bindingSel[p.id];
    if (!sel) {
      alert('Pilih OLT terlebih dahulu.');
      return;
    }
    const current: string[] = (() => {
      try { return p.olt_ids ? JSON.parse(p.olt_ids) : []; } catch (e) { return []; }
    })();
    const next = current.includes(sel) ? current : [...current, sel];
    try {
      const res = await fetch(`/api/settings/tr069?id=${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, olt_ids: JSON.stringify(next) }),
      });
      if (res.ok) {
        fetchProfiles();
        alert(`Profile "${p.name}" bound to OLT ${sel}.`);
      } else {
        alert('Gagal menyimpan binding.');
      }
    } catch (e) {
      alert('Gagal menyimpan binding.');
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    try {
      await fetch(`/api/settings/tr069?id=${id}`, { method: 'DELETE' });
      fetchProfiles();
    } catch (e) {}
  };

  const fetchTunnels = async () => {
    try {
      const res = await fetch('/api/settings/vpn');
      const data = await res.json();
      setTunnels(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoadingTunnels(false);
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/settings/tr069');
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoadingProfiles(false);
  };

  const fetchOlts = async () => {
    try {
      const res = await fetch('/api/settings/olt');
      const data = await res.json();
      setOlts(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTunnels();
    fetchProfiles();
    fetchOlts();
  }, []);

  return (
    <div className="container-fluid content-wrap">
      <h2>System Config</h2>
      
      {/* Tab Menu */}
      <ul className="nav nav-tabs" style={{ marginBottom: '15px' }}>
        <li className={activeTab === 'tunnel' ? 'active' : ''}>
          <a href="#tunnel" onClick={(e) => { e.preventDefault(); setActiveTab('tunnel'); }}>VPN tunnels</a>
        </li>
        <li className={activeTab === 'tr069' ? 'active' : ''}>
          <a href="#tr069" onClick={(e) => { e.preventDefault(); setActiveTab('tr069'); }}>TR069 Profiles</a>
        </li>
      </ul>

      <div className="tab-content">
        {/* First Tab: VPN Tunnel */}
        {activeTab === 'tunnel' && (
          <div className="tab-pane active">
            <div className="panel-group">
              
              {/* Info Panel */}
              <div className="panel panel-default">
                <div className="panel-heading" style={{ cursor: 'pointer' }} onClick={() => setInfoTunnelsOpen(!infoTunnelsOpen)}>
                  <h4 className="panel-title">
                    <a className="accordion-toggle btn-block" style={{ textDecoration: 'none', color: '#333' }}>
                      <i className={`fa ${infoTunnelsOpen ? 'fa-minus' : 'fa-plus'}`} style={{ marginRight: '10px' }}></i>
                      Info
                    </a>
                  </h4>
                </div>
                {infoTunnelsOpen && (
                  <div className="panel-collapse">
                    <div className="panel-body">
                      <p>You can find VPN Tunnel and TR069 configuration instructions here: <a href="https://smartolt.com/setup_instructions_tr069.html" target="_blank" rel="noopener noreferrer">VPN Tunnel and TR069 configuration</a></p>
                      <p>VPN tunnels use Open VPN to establish a secure L3 tunnel between your site and SmartOLT server.</p>
                      <p>Your endpoint has to be a device from which you have access to all your ONU/OLT devices and which supports OpenVPN client, preferably a <a href="https://mikrotik.com/" target="_blank" rel="noopener noreferrer">Mikrotik/RouterOS</a> gateway.</p>
                      <p>The tunnel subnet must be an unused private /24 subnet, routed inside your network. You can use the default 10.69.69.0/24 if it's not yet allocated inside your network.</p>
                      <p>Each Tunnel must have unique routes (Connected routes), which represent the OLT and ONU management IP subnets.</p>
                      <p>If you have multiple sites that are not interconnected and you have no route exchange between sites, you must setup a tunnel for each site to route the management subnets you have in each site.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tunnel Status Panel */}
              <div className="panel panel-default" style={{ marginTop: '10px' }}>
                <div className="panel-heading" style={{ cursor: 'pointer' }} onClick={() => setTunnelsOpen(!tunnelsOpen)}>
                  <h4 className="panel-title">
                    <a className="accordion-toggle btn-block" style={{ textDecoration: 'none', color: '#333' }}>
                      <i className={`fa ${tunnelsOpen ? 'fa-minus' : 'fa-plus'}`} style={{ marginRight: '10px' }}></i>
                      Tunnel status
                    </a>
                  </h4>
                </div>
                {tunnelsOpen && (
                  <div className="panel-collapse">
                    <div className="panel-body table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th className="col-md-2">User/tunnel name</th>
                            <th className="col-md-3">Status</th>
                            <th className="col-md-2">Subnet</th>
                            <th className="col-md-2">Connected subnets</th>
                            <th className="col-md-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTunnels ? (
                            <tr>
                              <td colSpan={6} className="text-center">
                                <i className="fa fa-spinner fa-spin fa-2x text-muted"></i>
                              </td>
                            </tr>
                          ) : tunnels.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-muted">No tunnels configured.</td>
                            </tr>
                          ) : tunnels.map(t => (
                            <tr key={t.id} className="valign-center">
                              <td>{t.id}</td>
                              <td>
                                <strong>{t.name}</strong>&nbsp;
                                <span className="text-success" title="Certificate is valid until 2055-07-03">
                                  <i className="fa fa-info-circle"></i>
                                </span>
                              </td>
                              <td>
                                <span className={t.status === 'Connected' ? 'text-success' : 'text-danger'}>
                                  {t.status || 'Disconnected'}
                                </span>
                                <br />
                                <a href="#" style={{ color: '#0064C8', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); openLogs(t); }}>
                                  <i className="fa fa-file-text-o"></i> Logs
                                </a>
                              </td>
                              <td>{t.subnet || '10.69.69.0/24'}</td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                10.90.0.0/23{"\n"}172.16.100.4/30
                              </td>
                              <td>
                                <button className="btn btn-success margin-bottom" onClick={() => openScript(t)}>
                                  <i className="fa fa-file-code-o"></i> Mikrotik VPN setup
                                </button>
                                <button className="btn btn-primary margin-bottom margin-left" onClick={() => { setEditTunnelId(t.id); setTunnelForm({ name: t.name, subnet: t.subnet || '10.69.69.0/24' }); setShowTunnelModal(true); }}>
                                  Edit
                                </button>
                                <button className="btn btn-danger margin-bottom margin-left" onClick={() => handleDeleteTunnel(t.id)}>
                                  Del
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <button className="btn btn-primary margin-top" onClick={() => setShowTunnelModal(true)}>
                        Create a new tunnel
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Second Tab: TR069 Profiles */}
        {activeTab === 'tr069' && (
          <div className="tab-pane active">
            <div className="panel-group">

              {/* Info Panel */}
              <div className="panel panel-default">
                <div className="panel-heading" style={{ cursor: 'pointer' }} onClick={() => setInfoTr069Open(!infoTr069Open)}>
                  <h4 className="panel-title">
                    <a className="accordion-toggle btn-block" style={{ textDecoration: 'none', color: '#333' }}>
                      <i className={`fa ${infoTr069Open ? 'fa-minus' : 'fa-plus'}`} style={{ marginRight: '10px' }}></i>
                      Info
                    </a>
                  </h4>
                </div>
                {infoTr069Open && (
                  <div className="panel-collapse">
                    <div className="panel-body">
                      <p>In order to use TR069 protocol in your network you must have a VPN tunnel configured and a TR069 profile defined and attached to each <a href="/olt">OLT</a> where you want this service to be available.</p>
                      <p>To each ONU you must apply the TR069 profile in SmartOLT in order to activate TR069. The profile contains just the minimum info required and we autocomplete the form with the recommended settings, making things as easy as possible.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Defined Profiles Panel */}
              <div className="panel panel-default" style={{ marginTop: '10px' }}>
                <div className="panel-heading" style={{ cursor: 'pointer' }} onClick={() => setProfilesOpen(!profilesOpen)}>
                  <h4 className="panel-title">
                    <a className="accordion-toggle btn-block" style={{ textDecoration: 'none', color: '#333' }}>
                      <i className={`fa ${profilesOpen ? 'fa-minus' : 'fa-plus'}`} style={{ marginRight: '10px' }}></i>
                      Defined profiles
                    </a>
                  </h4>
                </div>
                {profilesOpen && (
                  <div className="panel-collapse">
                    <div className="panel-body table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th className="col-md-2">Profile name</th>
                            <th className="col-md-3 text-center">CWMP ACS</th>
                            <th className="col-md-2 text-center">Status</th>
                            <th className="col-md-2 text-center">OLTs</th>
                            <th className="col-md-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingProfiles ? (
                            <tr>
                              <td colSpan={5} className="text-center">
                                <i className="fa fa-spinner fa-spin fa-2x text-muted"></i>
                              </td>
                            </tr>
                          ) : profiles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted">No profiles defined.</td>
                            </tr>
                          ) : profiles.map(p => (
                            <tr key={p.id} className="valign-center">
                              <td><strong>{p.name}</strong></td>
                              <td className="text-center">{p.acs_url || 'http://10.69.69.1:14501'}</td>
                              <td className="text-center">
                                CWMP: <i className="fa fa-check-circle-o text-success" title="Service active"></i>
                              </td>
                              <td className="text-center">
                                <select
                                  className="form-control"
                                  value={bindingSel[p.id] || ''}
                                  onChange={e => setBindingSel({ ...bindingSel, [p.id]: e.target.value })}
                                >
                                  <option value="">-- pilih OLT --</option>
                                  {olts.map(o => {
                                    let bound: string[] = [];
                                    try { bound = p.olt_ids ? JSON.parse(p.olt_ids) : []; } catch (e) {}
                                    return (
                                      <option key={o.id} value={o.id}>
                                        {o.id} - {o.name} {bound.includes(String(o.id)) ? '(bound)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                              <td className="text-right">
                                <button className="btn btn-primary margin-bottom" onClick={() => handleSetOlts(p)}>
                                  Set OLTs
                                </button>
                                <button className="btn btn-success margin-bottom margin-left" onClick={() => alert("ACS URL: " + p.acs_url)}>
                                  View
                                </button>
                                <button className="btn btn-success margin-bottom margin-left" onClick={() => openFiles(p)}>
                                  Files
                                </button>
                                <button className="btn btn-primary margin-bottom margin-left" onClick={() => { setEditProfileId(p.id); setProfileForm({ name: p.name, acs_url: p.acs_url }); setShowProfileModal(true); }}>
                                  Edit
                                </button>
                                <button className="btn btn-danger margin-bottom margin-left" onClick={() => handleDeleteProfile(p.id)}>
                                  Del
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <button className="btn btn-primary margin-top" onClick={() => setShowProfileModal(true)}>
                        Add a new profile
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* CREATE/EDIT VPN TUNNEL MODAL */}
      {showTunnelModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSaveTunnel}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => { setShowTunnelModal(false); setEditTunnelId(null); }}>×</button>
                  <h4 className="modal-title">{editTunnelId ? 'Edit VPN tunnel' : 'Create a new VPN tunnel'}</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tunnel Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Sanwanay"
                      value={tunnelForm.name} 
                      onChange={e => setTunnelForm({...tunnelForm, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Tunnel Subnet</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={tunnelForm.subnet} 
                      onChange={e => setTunnelForm({...tunnelForm, subnet: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">
                    <i className="fa fa-plus"></i> {editTunnelId ? 'Save changes' : 'Add tunnel'}
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => { setShowTunnelModal(false); setEditTunnelId(null); }}>Close</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT TR069 PROFILE MODAL */}
      {showProfileModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSaveProfile}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => { setShowProfileModal(false); setEditProfileId(null); }}>×</button>
                  <h4 className="modal-title">{editProfileId ? 'Edit TR069 profile' : 'Add new TR069 profile'}</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Profile Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. SmartOLT"
                      value={profileForm.name} 
                      onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>CWMP ACS URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={profileForm.acs_url} 
                      onChange={e => setProfileForm({...profileForm, acs_url: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">
                    <i className="fa fa-plus"></i> {editProfileId ? 'Save changes' : 'Add profile'}
                  </button>
                  <button type="button" className="btn btn-link" onClick={() => { setShowProfileModal(false); setEditProfileId(null); }}>Close</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VPN LOGS MODAL */}
      {logsTunnel && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setLogsTunnel(null)}>×</button>
                <h4 className="modal-title">VPN tunnel logs — {logsTunnel.name}</h4>
              </div>
              <div className="modal-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {logEntries.length === 0 ? (
                  <p className="text-muted">No activity logs for this tunnel.</p>
                ) : (
                  <table className="table table-striped">
                    <thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody>
                      {logEntries.map((l, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{l.action}</td>
                          <td>{l.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-link" onClick={() => setLogsTunnel(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MIKROTIK SCRIPT MODAL */}
      {scriptTunnel && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setScriptTunnel(null)}>×</button>
                <h4 className="modal-title">Mikrotik VPN setup — {scriptTunnel.name}</h4>
              </div>
              <div className="modal-body">
                <p className="text-muted">Ganti <code>vpn-server.example.com</code> dengan alamat publik server VPN, lalu copy script ke terminal RouterOS.</p>
                <textarea id="mikrotik-script" className="form-control" rows={9} style={{ fontFamily: 'monospace', fontSize: '12px' }} readOnly />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={copyScript}><i className="fa fa-copy"></i> Copy</button>
                <button type="button" className="btn btn-link" onClick={() => setScriptTunnel(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE FILES MODAL */}
      {filesProfile && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setFilesProfile(null)}>×</button>
                <h4 className="modal-title">TR069 files — {filesProfile.name}</h4>
              </div>
              <div className="modal-body">
                {!filesData ? (
                  <p className="text-muted"><i className="fa fa-spinner fa-spin"></i> Loading...</p>
                ) : (
                  <ul className="list-unstyled">
                    <li><i className="fa fa-file-text-o text-primary"></i> Config file: <code>tr069-{filesProfile.id}.conf</code> (auto-generated)</li>
                    <li style={{ marginTop: '6px' }}><i className="fa fa-sitemap text-info"></i> ONUs using this profile: <strong>{filesData.onus}</strong></li>
                    <li style={{ marginTop: '6px' }}><i className="fa fa-tasks text-success"></i> Auth presets referencing it: <strong>{filesData.presetCount}</strong></li>
                    <li style={{ marginTop: '6px' }}><i className="fa fa-server text-muted"></i> Bound OLTs: <strong>{(() => { try { return (filesProfile.olt_ids ? JSON.parse(filesProfile.olt_ids).length : 0); } catch (e) { return 0; } })()}</strong></li>
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-link" onClick={() => setFilesProfile(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
