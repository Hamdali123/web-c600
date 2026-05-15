"use client";

import { useEffect, useState } from 'react';

export default function GeneralSettingsPage() {
  const [systemConfig, setSystemConfig] = useState<any>({ 
    system_title: 'SmartOLT Clone', timezone: 'Asia/Jakarta',
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
    sms_api_key: '', allowed_ips: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/system');
      const data = await res.json();
      if (data && typeof data === 'object') {
        setSystemConfig({ ...systemConfig, ...data });
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/system', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(systemConfig) 
      });
      const data = await res.json();
      if (data.success) { alert('Updated Successfully!'); fetchData(); }
      else { alert("Error: " + data.error); }
    } catch (e) { alert("Server error!"); }
  };

  if (loading) return <div className="text-center" style={{marginTop: '50px'}}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}><i className="fa fa-cogs"></i> System Settings</h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
         <div className="col-md-12">
            <div className="panel panel-default">
               <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff', padding: '0' }}>
                  <ul className="nav nav-tabs" style={{ borderBottom: 'none' }}>
                    <li className={activeTab === 'general' ? 'active' : ''}><a href="#" onClick={() => setActiveTab('general')} style={{ borderRadius: '0', color: activeTab === 'general' ? '#333' : '#fff' }}>General</a></li>
                    <li className={activeTab === 'email' ? 'active' : ''}><a href="#" onClick={() => setActiveTab('email')} style={{ borderRadius: '0', color: activeTab === 'email' ? '#333' : '#fff' }}>Email (SMTP)</a></li>
                    <li className={activeTab === 'sms' ? 'active' : ''}><a href="#" onClick={() => setActiveTab('sms')} style={{ borderRadius: '0', color: activeTab === 'sms' ? '#333' : '#fff' }}>SMS Gateway</a></li>
                  </ul>
               </div>
               <div className="panel-body">
                  <form className="form-horizontal" onSubmit={handleSave}>
                     {activeTab === 'general' && (
                        <div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">System Title</label>
                              <div className="col-sm-6">
                                 <input type="text" className="form-control" value={systemConfig.system_title} onChange={e => setSystemConfig({...systemConfig, system_title: e.target.value})} />
                              </div>
                           </div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">Timezone</label>
                              <div className="col-sm-6">
                                 <select className="form-control" value={systemConfig.timezone} onChange={e => setSystemConfig({...systemConfig, timezone: e.target.value})}>
                                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                                    <option value="UTC">UTC</option>
                                 </select>
                              </div>
                           </div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">Allowed IPs</label>
                              <div className="col-sm-6">
                                 <textarea className="form-control" rows={3} value={systemConfig.allowed_ips || ''} onChange={e => setSystemConfig({...systemConfig, allowed_ips: e.target.value})} placeholder="Comma separated list of IPs" />
                                 <p className="help-block small text-muted">Leave empty to allow all IPs.</p>
                              </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'email' && (
                        <div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">SMTP Host</label>
                              <div className="col-sm-6"><input type="text" className="form-control" value={systemConfig.smtp_host || ''} onChange={e => setSystemConfig({...systemConfig, smtp_host: e.target.value})} /></div>
                           </div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">SMTP Port</label>
                              <div className="col-sm-6"><input type="number" className="form-control" value={systemConfig.smtp_port} onChange={e => setSystemConfig({...systemConfig, smtp_port: parseInt(e.target.value)})} /></div>
                           </div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">Username</label>
                              <div className="col-sm-6"><input type="text" className="form-control" value={systemConfig.smtp_user || ''} onChange={e => setSystemConfig({...systemConfig, smtp_user: e.target.value})} /></div>
                           </div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">Password</label>
                              <div className="col-sm-6"><input type="password" title="Password" className="form-control" value={systemConfig.smtp_pass || ''} onChange={e => setSystemConfig({...systemConfig, smtp_pass: e.target.value})} /></div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'sms' && (
                        <div>
                           <div className="form-group">
                              <label className="col-sm-3 control-label">SMS API Key</label>
                              <div className="col-sm-6">
                                 <input type="text" className="form-control" value={systemConfig.sms_api_key || ''} onChange={e => setSystemConfig({...systemConfig, sms_api_key: e.target.value})} />
                                 <p className="help-block small text-muted">Integration with external SMS providers.</p>
                              </div>
                           </div>
                        </div>
                     )}

                     <div className="form-group" style={{ marginTop: '20px' }}>
                        <div className="col-sm-offset-3 col-sm-6">
                           <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#337ab7' }}>Save Configuration</button>
                        </div>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
