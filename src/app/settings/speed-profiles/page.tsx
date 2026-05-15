"use client";

import { useEffect, useState } from 'react';

export default function SpeedProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [olts, setOlts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', upload: '102400', download: '102400', olt_id: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/speed-profiles');
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
      
      const oltRes = await fetch('/api/settings/olt');
      const oltData = await oltRes.json();
      setOlts(Array.isArray(oltData) ? oltData : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/speed-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '', upload: '102400', download: '102400', olt_id: '' });
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) { alert("Server error"); }
  };

  const handleSync = async () => {
    if (!form.olt_id) return alert("Select an OLT first to sync profiles from it.");
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/settings/speed-profiles/sync?oltId=${form.olt_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully synced ${data.count} Speed Profiles!`);
        fetchData();
      } else {
        alert("Sync failed: " + data.error);
      }
    } catch (e) { alert("Server error during sync"); }
    setIsSyncing(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Speed Profile?")) return;
    try {
      await fetch(`/api/settings/speed-profiles?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {}
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>Speed Profiles</h3>
      <p className="text-muted small">Define bandwidth limits for your ONUs. You can manually create them or sync existing profiles from your OLT hardware.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Manage Profile</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Select OLT (Required for Sync)</label>
                  <select className="form-control input-sm" value={form.olt_id} onChange={e => setForm({...form, olt_id: e.target.value})}>
                    <option value="">Select OLT</option>
                    {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid #eee', margin: '15px 0', paddingTop: '15px' }}>
                  <div className="form-group">
                    <label className="small text-muted">Profile Name</label>
                    <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Upload (kbps)</label>
                    <input type="number" className="form-control input-sm" value={form.upload} onChange={e => setForm({...form, upload: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Download (kbps)</label>
                    <input type="number" className="form-control input-sm" value={form.download} onChange={e => setForm({...form, download: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm btn-block">Add Manually</button>
                </div>

                <div className="text-center" style={{ margin: '10px 0' }}>- OR -</div>
                
                <button 
                  type="button" 
                  className="btn btn-info btn-sm btn-block" 
                  onClick={handleSync}
                  disabled={isSyncing || !form.olt_id}
                >
                  <i className={isSyncing ? "fa fa-spinner fa-spin" : "fa fa-refresh"}></i> Sync from OLT
                </button>
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
                    <th>Upload</th>
                    <th>Download</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{(p.upload / 1024).toFixed(0)} Mbps</td>
                      <td>{(p.download / 1024).toFixed(0)} Mbps</td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(p.id)}><i className="fa fa-trash"></i></button>
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
