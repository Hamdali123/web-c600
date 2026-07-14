"use client";

import { useEffect, useState, use } from 'react';

export default function OltCustomProfilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/speed-profiles`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch custom profiles');
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
            <a href="/settings/speed-profiles" className="btn btn-success" style={{ marginRight: '10px' }}>
              <i className="fa fa-plus"></i> Manage speed profiles
            </a>
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
                  <th>Download</th>
                  <th>Upload</th>
                  <th>ONUs using</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ padding: '30px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted" style={{ marginBottom: '10px' }}></i>
                      <p className="text-muted">Fetching speed profiles...</p>
                    </td>
                  </tr>
                ) : profiles.length > 0 ? (
                  profiles.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.download >= 1000 ? `${p.download / 1000} Mbps` : `${p.download} Kbps`}</td>
                      <td>{p.upload >= 1000 ? `${p.upload / 1000} Mbps` : `${p.upload} Kbps`}</td>
                      <td><span className="label label-info">{p.onus_using}</span></td>
                      <td className="text-center">
                        <a href="/settings/speed-profiles" className="btn btn-xs btn-primary">Edit</a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: '30px' }}>
                      No speed profiles configured yet. Click "Manage speed profiles" to configure them.
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
