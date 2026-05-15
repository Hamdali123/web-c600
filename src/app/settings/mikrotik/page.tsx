"use client";

import { useEffect, useState } from 'react';

export default function MikrotikPage() {
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', ip_address: '', api_port: 8728, username: '', password: '' });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/mikrotik');
      const data = await res.json();
      setRouters(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/mikrotik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '', ip_address: '', api_port: 8728, username: '', password: '' });
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) { alert("Server error"); }
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>MikroTik Routers</h3>
      <p className="text-muted small">Manage MikroTik routers for PPPoE and queue integration.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add Router</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Router Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">IP Address</label>
                  <input type="text" className="form-control input-sm" value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">API Port</label>
                  <input type="number" className="form-control input-sm" value={form.api_port} onChange={e => setForm({...form, api_port: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Username</label>
                  <input type="text" className="form-control input-sm" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Password</label>
                  <input type="password" title="Password" className="form-control input-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block">Save Router</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="panel panel-default">
            <div className="table-responsive">
              <table className="table table-striped table-hover" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <th>Name</th>
                    <th>IP</th>
                    <th>Port</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routers.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.ip_address}</td>
                      <td>{r.api_port}</td>
                      <td className="text-right">
                        <button className="btn btn-info btn-xs" style={{ marginRight: '5px' }} onClick={() => alert("Testing...")}>Test</button>
                        <button className="btn btn-danger btn-xs"><i className="fa fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
