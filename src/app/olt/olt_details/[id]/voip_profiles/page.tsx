"use client";

import { useEffect, useState, use } from 'react';

export default function OltVoipProfilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/voip-profiles`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch VoIP profiles');
      }
      setProfiles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <span className="text-muted small" style={{ marginRight: '10px' }}>
              <i className="fa fa-info-circle"></i> Tidak didukung firmware C600 ini (tidak ada perintah VoIP)
            </span>
            <button className="btn btn-primary" onClick={fetchProfiles} disabled={loading}>
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
                  <th>Profile name</th>
                  <th>SIP server</th>
                  <th>SIP port</th>
                  <th>Codec</th>
                  <th>ONUs using</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && profiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center" style={{ padding: '30px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted" style={{ marginBottom: '10px' }}></i>
                      <p className="text-muted">Fetching VoIP profiles...</p>
                    </td>
                  </tr>
                ) : profiles.length > 0 ? (
                  profiles.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.sip_server}</td>
                      <td>{p.sip_port}</td>
                      <td>{p.codec}</td>
                      <td><span className="label label-info">{p.onus_using}</span></td>
                      <td className="text-center">
                        <button className="btn btn-xs btn-primary" style={{ marginRight: '5px' }}>Edit</button>
                        <button className="btn btn-xs btn-danger">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '30px' }}>
                      <i className="fa fa-phone fa-2x" style={{ display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                      No VoIP profiles configured for this OLT.
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
