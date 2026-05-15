"use client";

import { useEffect, useState } from 'react';

export default function AuthPresetsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>({ speedProfiles: [], olts: [], zones: [] });
  
  const [form, setForm] = useState({ 
    name: '', sn_pattern: '', vlan: '', profile_id: '', mode: 'route', olt_id: '', zone_id: '' 
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/auth-presets');
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);

      const masterRes = await fetch('/api/settings/master');
      const masterData = await masterRes.json();
      setMasterData(masterData);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/auth-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '', sn_pattern: '', vlan: '', profile_id: '', mode: 'route', olt_id: '', zone_id: '' });
        fetchData();
      } else { alert("Error: " + data.error); }
    } catch (e) { alert("Server error"); }
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>Authorization Presets</h3>
      <p className="text-muted small">Templates to automate ONU authorization based on SN pattern or manual selection.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Create New Preset</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Preset Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. 50Mbps Home" />
                </div>
                <div className="form-group">
                  <label className="small text-muted">SN Pattern (Optional)</label>
                  <input type="text" className="form-control input-sm" value={form.sn_pattern} onChange={e => setForm({...form, sn_pattern: e.target.value})} placeholder="e.g. ZTEG*" />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">VLAN</label>
                      <input type="number" className="form-control input-sm" value={form.vlan} onChange={e => setForm({...form, vlan: e.target.value})} required />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">Mode</label>
                      <select className="form-control input-sm" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}>
                        <option value="route">Route</option>
                        <option value="bridge">Bridge</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="small text-muted">Speed Profile</label>
                  <select className="form-control input-sm" value={form.profile_id} onChange={e => setForm({...form, profile_id: e.target.value})} required>
                    <option value="">Select Profile</option>
                    {masterData.speedProfiles.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small text-muted">Restrict to OLT (Optional)</label>
                  <select className="form-control input-sm" value={form.olt_id} onChange={e => setForm({...form, olt_id: e.target.value})}>
                    <option value="">All OLTs</option>
                    {masterData.olts.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block" style={{ backgroundColor: '#337ab7' }}>Save Preset</button>
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
                    <th>Pattern</th>
                    <th>VLAN / Mode</th>
                    <th>Profile</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td><code>{p.sn_pattern || '*'}</code></td>
                      <td>{p.vlan} / {p.mode}</td>
                      <td>{p.profile?.name}</td>
                      <td className="text-right">
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
