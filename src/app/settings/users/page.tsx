"use client";

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tech_user' });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: '', email: '', password: '', role: 'tech_user' });
        fetchData();
      } else { alert("Error: " + data.error); }
    } catch (e) { alert("Server error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/settings/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {}
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}><i className="fa fa-users"></i> Users Management</h3>
      <p className="text-muted small">Manage administrative and technician accounts.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add New User</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Full Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Email Address</label>
                  <input type="email" className="form-control input-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Password</label>
                  <input type="password" title="Password" className="form-control input-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="small text-muted">Role</label>
                  <select className="form-control input-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="admin">Administrator</option>
                    <option value="tech_user">Technician</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block" style={{ backgroundColor: '#337ab7' }}>Create User Account</button>
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
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td><span className={`label ${u.role === 'admin' ? 'label-danger' : 'label-info'}`}>{u.role}</span></td>
                      <td><span className="label label-success">{u.status}</span></td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u.id)}><i className="fa fa-trash"></i></button>
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
