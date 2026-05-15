"use client";

import { useEffect, useState } from 'react';

export default function OdbsPage() {
  const [odbs, setOdbs] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', ports: '8', zone_id: '', lat: '', lng: '' });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/odbs');
      const data = await res.json();
      setOdbs(Array.isArray(data) ? data : []);
      
      const zoneRes = await fetch('/api/settings/zones');
      const zoneData = await zoneRes.json();
      setZones(Array.isArray(zoneData) ? zoneData : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/odbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '', ports: '8', zone_id: '', lat: '', lng: '' });
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) { alert("Server error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ODB?")) return;
    try {
      await fetch(`/api/settings/odbs?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {}
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>ODB Management</h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add ODB</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">ODB Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Ports</label>
                  <input type="number" className="form-control input-sm" value={form.ports} onChange={e => setForm({...form, ports: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Zone</label>
                  <select className="form-control input-sm" value={form.zone_id} onChange={e => setForm({...form, zone_id: e.target.value})} required>
                    <option value="">Select Zone</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">Latitude</label>
                      <input type="text" className="form-control input-sm" placeholder="-6.2000" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">Longitude</label>
                      <input type="text" className="form-control input-sm" placeholder="106.8166" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} />
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block">Save ODB</button>
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
                    <th>Ports</th>
                    <th>Zone</th>
                    <th>GPS</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {odbs.map(o => (
                    <tr key={o.id}>
                      <td><strong>{o.name}</strong></td>
                      <td>{o.ports}</td>
                      <td>{o.zone?.name}</td>
                      <td>{o.lat && o.lng ? <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer"><i className="fa fa-map-marker text-danger"></i> {o.lat}, {o.lng}</a> : '-'}</td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(o.id)}><i className="fa fa-trash"></i></button>
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
