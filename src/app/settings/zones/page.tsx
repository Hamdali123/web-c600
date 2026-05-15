"use client";

import { useEffect, useState } from 'react';

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '' });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/zones');
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '' });
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) { alert("Server error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Zone?")) return;
    try {
      await fetch(`/api/settings/zones?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {}
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>Zone Management</h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add Zone</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Zone Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block">Save Zone</button>
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
                    <th>ID</th>
                    <th>Name</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => (
                    <tr key={z.id}>
                      <td>{z.id}</td>
                      <td><strong>{z.name}</strong></td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(z.id)}><i className="fa fa-trash"></i></button>
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
