"use client";

import { useEffect, useState } from 'react';

export default function UplinkPortsPage() {
  const [ports, setPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUplinks();
  }, []);

  const fetchUplinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/uplink_ports');
      if (!res.ok) throw new Error('Failed to fetch uplink ports');
      const data = await res.json();
      setPorts(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="container-fluid" style={{ padding: '0 15px' }}>
      <div className="row margin-bottom">
        <div className="col-md-12">
          <h2 className="page-title" style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px', color: '#333' }}>Uplink Ports</h2>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Uplink ports on all OLTs</h3>
          <div className="pull-right">
            <button onClick={fetchUplinks} className="btn btn-default btn-xs" disabled={loading}>
              <i className={loading ? "fa fa-refresh fa-spin" : "fa fa-refresh"}></i> Refresh
            </button>
          </div>
          <div className="clearfix"></div>
        </div>
        <div className="panel-body">
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="table-responsive">
            <table className="table table-striped table-hover table-condensed" style={{ fontSize: '13px', backgroundColor: '#fff' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                  <th>OLT</th>
                  <th>Port</th>
                  <th>Admin State</th>
                  <th>Operational State</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ padding: '40px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted"></i>
                      <div className="margin-top text-muted">Connecting to OLTs and fetching live uplink data...</div>
                    </td>
                  </tr>
                ) : ports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: '20px' }}>No uplink ports found.</td>
                  </tr>
                ) : (
                  ports.map((port, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{port.olt_name}</div>
                        <div style={{ fontSize: '12px', color: '#777' }}>{port.olt_ip}</div>
                      </td>
                      <td>{port.name}</td>
                      <td>
                        {port.adminState?.toLowerCase() === 'up' || port.adminState?.toLowerCase() === 'enable' ? (
                          <span className="label label-success">UP</span>
                        ) : (
                          <span className="label label-danger">DOWN</span>
                        )}
                      </td>
                      <td>
                        {port.operState?.toLowerCase() === 'up' || port.operState?.toLowerCase() === 'enable' ? (
                          <span className="label label-success">UP</span>
                        ) : (
                          <span className="label label-danger">DOWN</span>
                        )}
                      </td>
                      <td>{port.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
