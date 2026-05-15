"use client";

import { useEffect, useState } from 'react';

export default function VlansPage() {
  const [vlans, setVlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [olts, setOlts] = useState<any[]>([]);
  const [form, setForm] = useState({ vlan_id: '', description: '', olt_id: '', type: 'Residential' });
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/vlans');
      const data = await res.json();
      setVlans(Array.isArray(data) ? data : []);
      
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
      const res = await fetch('/api/settings/vlans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ vlan_id: '', description: '', olt_id: '', type: 'Residential' });
        fetchData();
      } else { alert("Error: " + data.error); }
    } catch (e) { alert("Server error"); }
  };

  const handleSync = async () => {
    if (!form.olt_id) return alert("Select an OLT first.");
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/settings/vlans/sync?oltId=${form.olt_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { fetchData(); alert(`Synced ${data.count} VLANs`); }
    } catch (e) {}
    setIsSyncing(false);
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>VLAN Management</h3>
      <p className="text-muted small">Manage VLANs for your OLT devices. Essential for C600 service configuration.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add VLAN</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">OLT</label>
                  <select className="form-control input-sm" value={form.olt_id} onChange={e => setForm({...form, olt_id: e.target.value})} required>
                    <option value="">Select OLT</option>
                    {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="small text-muted">VLAN ID</label>
                  <input type="number" className="form-control input-sm" value={form.vlan_id} onChange={e => setForm({...form, vlan_id: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Type</label>
                  <select className="form-control input-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="Residential">Residential (Internet)</option>
                    <option value="Management">Management (TR069)</option>
                    <option value="VoIP">VoIP</option>
                    <option value="IPTV">IPTV</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="small text-muted">Description</label>
                  <input type="text" className="form-control input-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block">Add Manually</button>
                <button type="button" className="btn btn-info btn-sm btn-block" onClick={handleSync} disabled={isSyncing}>
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
                    <th>VLAN ID</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>OLT</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vlans.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.vlan_id}</strong></td>
                      <td><span className={`label ${v.type === 'Residential' ? 'label-primary' : 'label-default'}`}>{v.type}</span></td>
                      <td>{v.description || '-'}</td>
                      <td>{v.olt?.name}</td>
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
