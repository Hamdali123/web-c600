"use client";

import { useEffect, useState } from 'react';

export default function AuthorizationsReportPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/authorizations?search=${search}`);
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Logs fetch failed", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <ul className="nav nav-tabs" style={{ marginBottom: '20px' }}>
        <li className="active"><a href="#">Authorizations</a></li>
      </ul>

      <div className="panel panel-default" style={{ marginBottom: '20px' }}>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-3">
              <label className="small text-muted">Search</label>
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control input-sm" 
                  placeholder="SN or MAC" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && fetchLogs()}
                />
                <span className="input-group-btn">
                  <button className="btn btn-default btn-sm" onClick={fetchLogs}><i className="fa fa-search"></i></button>
                </span>
              </div>
            </div>
            <div className="col-md-2">
              <label className="small text-muted">User</label>
              <select className="form-control input-sm">
                <option>Any</option>
              </select>
            </div>
            <div className="col-md-3" style={{ paddingTop: '22px' }}>
              <div className="btn-group">
                <button className="btn btn-default btn-sm">EPON</button>
                <button className="btn btn-default btn-sm">GPON</button>
                <button className="btn btn-default btn-sm active">All</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th>User</th>
                <th>SN / MAC</th>
                <th>Name</th>
                <th>PON</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center"><i className="fa fa-spinner fa-spin"></i> Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center">No records found.</td></tr>
              ) : logs.map(log => {
                // Parse details (SN: ZTEG..., Name: ..., VLAN: ...)
                const sn = log.details.match(/SN: ([\w]+)/)?.[1] || '-';
                const name = log.details.match(/Name: ([^,]+)/)?.[1] || '-';
                return (
                  <tr key={log.id}>
                    <td><small>{log.user?.email || 'system'}</small></td>
                    <td><strong style={{ color: '#337ab7' }}>{sn}</strong></td>
                    <td>{name}</td>
                    <td>GPON</td>
                    <td><small>{new Date(log.createdAt).toLocaleString()}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
