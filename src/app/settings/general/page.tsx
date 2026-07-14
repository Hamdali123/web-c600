"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function GeneralSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active Tab state
  const [activeTab, setActiveTab] = useState('general');

  // Sync tab with URL search parameter '?tab=...'
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['general', 'users', 'api_key', 'api_logs'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('general');
    }
  }, [searchParams]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    router.push(`/settings/general?tab=${tabName}`);
  };

  // --- 1. General Tab States & Fetching ---
  const [systemConfig, setSystemConfig] = useState<any>({
    system_title: 'SmartOLT Clone',
    timezone: 'Asia/Jakarta',
    allowed_ips: '',
    language: 'en',
    installers_time_limit: 7,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    sms_api_key: ''
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/settings/system');
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error) {
        setSystemConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingConfig(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemConfig)
      });
      const data = await res.json();
      if (data.success) {
        alert('System settings updated successfully!');
        fetchConfig();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Server error saving system config.');
    }
  };

  // --- 2. Users Tab States & Fetching ---
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'tech_user' });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoadingUsers(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('User created successfully!');
        setUserForm({ name: '', email: '', password: '', role: 'tech_user' });
        fetchUsers();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Server error creating user.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/settings/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert('Failed to delete user.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- 3. API Key Tab States & Fetching ---
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyForm, setKeyForm] = useState({ access_type: 'Read & Write', allowed_ips: '', restriction_group: 'none' });

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/settings/api-key');
      const data = await res.json();
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoadingKeys(false);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('New API Key generated successfully!');
        setKeyForm({ access_type: 'Read & Write', allowed_ips: '', restriction_group: 'none' });
        fetchApiKeys();
      } else {
        alert('Error generating API key.');
      }
    } catch (e) {
      alert('Server error creating API key.');
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Delete this API Key?')) return;
    try {
      const res = await fetch(`/api/settings/api-key?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchApiKeys();
      } else {
        alert('Failed to delete API key.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- 4. API Logs Tab States & Fetching ---
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilters, setLogFilters] = useState({ method: '', status: '', uri: '', period: '24h' });

  const fetchApiLogs = async () => {
    setLoadingLogs(true);
    try {
      const query = new URLSearchParams(logFilters as any).toString();
      const res = await fetch(`/api/settings/api-log?${query}`);
      const data = await res.json();
      setApiLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoadingLogs(false);
  };

  // Trigger fetches depending on active tab
  useEffect(() => {
    if (activeTab === 'general') fetchConfig();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'api_key') fetchApiKeys();
    if (activeTab === 'api_logs') fetchApiLogs();
  }, [activeTab]);

  return (
    <div className="container-fluid content-wrap">
      {/* Title */}
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>
        <i className="fa fa-cogs"></i> System Settings
      </h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px', marginBottom: '20px' }} />

      {/* Tabs Layout */}
      <div className="row">
        <div className="col-md-12">
          <ul className="nav nav-tabs margin-bottom-20" style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
            <li className={activeTab === 'general' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('general'); }}>General</a>
            </li>
            <li className={activeTab === 'users' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('users'); }}>Users</a>
            </li>
            <li className={activeTab === 'api_key' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('api_key'); }}>API key</a>
            </li>
            <li className={activeTab === 'api_logs' ? 'active' : ''}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('api_logs'); }}>API logs</a>
            </li>
          </ul>

          <div className="tab-content" style={{ padding: '10px 0' }}>
            
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="row">
                <div className="col-md-8">
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>General Preferences</strong>
                    </div>
                    <div className="panel-body">
                      {loadingConfig ? (
                        <div className="text-center p-4"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
                      ) : (
                        <form className="form-horizontal" onSubmit={handleSaveConfig}>
                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">System Title</label>
                            <div className="col-sm-8">
                              <input type="text" className="form-control" value={systemConfig.system_title || ''} onChange={e => setSystemConfig({...systemConfig, system_title: e.target.value})} required />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">Timezone</label>
                            <div className="col-sm-8">
                              <select className="form-control" value={systemConfig.timezone || 'Asia/Jakarta'} onChange={e => setSystemConfig({...systemConfig, timezone: e.target.value})}>
                                <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                                <option value="Asia/Makassar">Asia/Makassar (GMT+8)</option>
                                <option value="Asia/Jayapura">Asia/Jayapura (GMT+9)</option>
                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">IPs allowed to access</label>
                            <div className="col-sm-8">
                              <textarea className="form-control" rows={3} placeholder="Format: 192.168.1.1, 10.0.0.0/24 (one per line or comma-separated)" value={systemConfig.allowed_ips || ''} onChange={e => setSystemConfig({...systemConfig, allowed_ips: e.target.value})} />
                              <span className="help-block small text-muted">Allow access to the panel only from specific IP addresses. Leave empty to allow all.</span>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">Installer time limit (days)</label>
                            <div className="col-sm-8">
                              <input type="number" className="form-control" value={systemConfig.installers_time_limit || 7} onChange={e => setSystemConfig({...systemConfig, installers_time_limit: parseInt(e.target.value) || 0})} />
                              <span className="help-block small text-muted">Limit the number of days installers have visibility over provisioned ONUs.</span>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">Default Language</label>
                            <div className="col-sm-8">
                              <select className="form-control" value={systemConfig.language || 'en'} onChange={e => setSystemConfig({...systemConfig, language: e.target.value})}>
                                <option value="en">English</option>
                                <option value="id">Indonesian (Bahasa)</option>
                                <option value="es">Spanish</option>
                              </select>
                            </div>
                          </div>

                          <hr style={{ margin: '20px 0' }} />

                          {/* Email SMTP preferences embedded inside General Panel just like original */}
                          <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '15px' }} className="col-sm-offset-3">Email SMTP Config</h4>
                          
                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">SMTP Host</label>
                            <div className="col-sm-8">
                              <input type="text" className="form-control" value={systemConfig.smtp_host || ''} onChange={e => setSystemConfig({...systemConfig, smtp_host: e.target.value})} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">SMTP Port</label>
                            <div className="col-sm-8">
                              <input type="number" className="form-control" value={systemConfig.smtp_port || 587} onChange={e => setSystemConfig({...systemConfig, smtp_port: parseInt(e.target.value) || 587})} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">SMTP User</label>
                            <div className="col-sm-8">
                              <input type="text" className="form-control" value={systemConfig.smtp_user || ''} onChange={e => setSystemConfig({...systemConfig, smtp_user: e.target.value})} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="col-sm-3 control-label small text-muted">SMTP Password</label>
                            <div className="col-sm-8">
                              <input type="password" title="SMTP Password" className="form-control" value={systemConfig.smtp_pass || ''} onChange={e => setSystemConfig({...systemConfig, smtp_pass: e.target.value})} />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: '20px' }}>
                            <div className="col-sm-offset-3 col-sm-8">
                              <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}>
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="panel panel-info border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#d9edf7', borderColor: '#bce8f1' }}>
                      <strong style={{ color: '#31708f' }}>System Information</strong>
                    </div>
                    <div className="panel-body text-muted small">
                      <p>Use General settings to configure operational limits, regional parameters, and integrations.</p>
                      <p><strong>Database:</strong> SQLite Local Server</p>
                      <p><strong>ZTE OLT Drivers:</strong> Supported (C300, C600, C620)</p>
                      <p><strong>TR069 Auto-Provisioning:</strong> Enabled</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. USERS TAB */}
            {activeTab === 'users' && (
              <div className="row">
                <div className="col-md-4">
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>Create User Account</strong>
                    </div>
                    <div className="panel-body">
                      <form onSubmit={handleCreateUser}>
                        <div className="form-group">
                          <label className="small text-muted">Full Name</label>
                          <input type="text" className="form-control input-sm" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="small text-muted">Email Address</label>
                          <input type="email" className="form-control input-sm" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="small text-muted">Password</label>
                          <input type="password" title="Password" className="form-control input-sm" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="small text-muted">User Group</label>
                          <select className="form-control input-sm" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                            <option value="admin">Administrator (full access)</option>
                            <option value="tech_user">Technician (no delete/settings)</option>
                            <option value="readonly_users">Read-only account</option>
                            <option value="installers">Installer (limited view)</option>
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm btn-block" style={{ marginTop: '15px' }}>
                          Add User
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-md-8">
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>User Accounts</strong>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                      {loadingUsers ? (
                        <div className="text-center p-4"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Group</th>
                                <th>Status</th>
                                <th className="text-center">Operations</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map(u => (
                                <tr key={u.id}>
                                  <td><strong>{u.name}</strong></td>
                                  <td>{u.email}</td>
                                  <td><span className={`label ${u.role === 'admin' ? 'label-danger' : 'label-info'}`}>{u.role}</span></td>
                                  <td><span className="label label-success">{u.status || 'Active'}</span></td>
                                  <td className="text-center">
                                    <button className="btn btn-xs btn-danger" onClick={() => handleDeleteUser(u.id)}>
                                      <i className="fa fa-trash"></i> Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {users.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '20px' }}>No users configured.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. API KEY TAB */}
            {activeTab === 'api_key' && (
              <div className="row">
                <div className="col-md-4">
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>Generate API Key</strong>
                    </div>
                    <div className="panel-body">
                      <form onSubmit={handleGenerateKey}>
                        <div className="form-group">
                          <label className="small text-muted">Access Type</label>
                          <select className="form-control input-sm" value={keyForm.access_type} onChange={e => setKeyForm({...keyForm, access_type: e.target.value})}>
                            <option value="Read & Write">Read & Write</option>
                            <option value="Read-only">Read-only</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="small text-muted">Allowed IPs (restrict usage)</label>
                          <textarea className="form-control input-sm" rows={2} placeholder="Empty for unrestricted access" value={keyForm.allowed_ips} onChange={e => setKeyForm({...keyForm, allowed_ips: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="small text-muted">Data Restriction Group</label>
                          <select className="form-control input-sm" value={keyForm.restriction_group} onChange={e => setKeyForm({...keyForm, restriction_group: e.target.value})}>
                            <option value="none">None (access all data)</option>
                            <option value="restricted">Restricted zone only</option>
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm btn-block" style={{ marginTop: '15px' }}>
                          Generate Key
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="col-md-8">
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>Active API Keys</strong>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                      {loadingKeys ? (
                        <div className="text-center p-4"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th>API Key String</th>
                                <th>Access type</th>
                                <th>Allowed IPs</th>
                                <th>Created At</th>
                                <th className="text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {apiKeys.map(k => (
                                <tr key={k.id}>
                                  <td><code>{k.key}</code></td>
                                  <td>{k.access_type}</td>
                                  <td>{k.allowed_ips || <span className="text-muted">Unrestricted</span>}</td>
                                  <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                                  <td className="text-center">
                                    <button className="btn btn-xs btn-danger" onClick={() => handleDeleteKey(k.id)}>
                                      <i className="fa fa-trash"></i> Revoke
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {apiKeys.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted" style={{ padding: '30px' }}>
                                    No API Keys generated yet. Create one to authenticate automated integrations.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. API LOGS TAB */}
            {activeTab === 'api_logs' && (
              <div className="row">
                <div className="col-md-12">
                  {/* Filters Bar */}
                  <div className="panel panel-default border-0 shadow-sm" style={{ marginBottom: '15px' }}>
                    <div className="panel-body bg-light">
                      <div className="row">
                        <div className="col-md-3">
                          <label className="small text-muted">Period</label>
                          <select className="form-control input-sm" value={logFilters.period} onChange={e => setLogFilters({...logFilters, period: e.target.value})}>
                            <option value="1h">Last 1 hour</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="small text-muted">HTTP Method</label>
                          <select className="form-control input-sm" value={logFilters.method} onChange={e => setLogFilters({...logFilters, method: e.target.value})}>
                            <option value="">All</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="small text-muted">URI Contains</label>
                          <input type="text" className="form-control input-sm" placeholder="e.g. /api/onus" value={logFilters.uri} onChange={e => setLogFilters({...logFilters, uri: e.target.value})} />
                        </div>
                        <div className="col-md-3" style={{ paddingTop: '20px' }}>
                          <button className="btn btn-primary btn-sm btn-block" onClick={fetchApiLogs} disabled={loadingLogs}>
                            <i className="fa fa-search"></i> Query Logs
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="panel panel-default border-0 shadow-sm">
                    <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: '#4a5568' }}>Recent API Requests</strong>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                      {loadingLogs ? (
                        <div className="text-center p-4"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th>Timestamp</th>
                                <th>Method</th>
                                <th>Request URI</th>
                                <th className="text-center">Status</th>
                                <th className="text-right">Duration</th>
                                <th>Client IP</th>
                                <th>API Key Prefix</th>
                              </tr>
                            </thead>
                            <tbody>
                              {apiLogs.map((log, idx) => (
                                <tr key={idx}>
                                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                                  <td>
                                    <span className={`label ${
                                      log.method === 'GET' ? 'label-info' :
                                      log.method === 'POST' ? 'label-success' :
                                      log.method === 'DELETE' ? 'label-danger' : 'label-warning'
                                    }`}>
                                      {log.method}
                                    </span>
                                  </td>
                                  <td><code>{log.uri}</code></td>
                                  <td className="text-center">
                                    <span className={`label ${log.status >= 200 && log.status < 300 ? 'label-success' : 'label-danger'}`}>
                                      {log.status}
                                    </span>
                                  </td>
                                  <td className="text-right" style={{ fontFamily: 'monospace' }}>{log.duration} ms</td>
                                  <td>{log.client_ip}</td>
                                  <td>{log.api_key ? <code>{log.api_key.substring(0, 10)}...</code> : <span className="text-muted">—</span>}</td>
                                </tr>
                              ))}
                              {apiLogs.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="text-center text-muted" style={{ padding: '20px' }}>
                                    No requests matched the current criteria.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneralSettingsPage() {
  return (
    <Suspense fallback={<div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>}>
      <GeneralSettingsContent />
    </Suspense>
  );
}
