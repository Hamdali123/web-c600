"use client";

import { useEffect, useState, use } from 'react';

export default function OltAclsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [acls, setAcls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAcls = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/acls`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch ACL rules');
      }
      setAcls(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcls();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <button className="btn btn-success" style={{ marginRight: '10px' }}>
              <i className="fa fa-plus"></i> Add ACL Rule
            </button>
            <button className="btn btn-primary" onClick={fetchAcls} disabled={loading}>
              <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="panel panel-default">
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="table table-striped table-bordered table-hover" style={{ margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th>Rule name</th>
                  <th>IP / Network</th>
                  <th>Port range</th>
                  <th>Protocol</th>
                  <th>Action</th>
                  <th style={{ textAlign: 'center' }}>Operations</th>
                </tr>
              </thead>
              <tbody>
                {loading && acls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center" style={{ padding: '30px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted" style={{ marginBottom: '10px' }}></i>
                      <p className="text-muted">Fetching live ACLs from OLT...</p>
                    </td>
                  </tr>
                ) : acls.length > 0 ? (
                  acls.map((acl, idx) => (
                    <tr key={idx}>
                      <td>{acl.name}</td>
                      <td>{acl.ip}</td>
                      <td>{acl.port_range}</td>
                      <td>{acl.protocol}</td>
                      <td>{acl.action}</td>
                      <td className="text-center">
                        <button className="btn btn-xs btn-danger">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '40px' }}>
                      <i className="fa fa-shield fa-2x" style={{ display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                      No Remote Access Control List (ACL) rules configured for this OLT.
                      <br />
                      <small className="text-muted">ACL rules restrict which remote IPs can connect to the OLT management interface.</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
