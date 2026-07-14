"use client";

import { useEffect, useState, use } from 'react';

export default function OltAdvancedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [advancedInfo, setAdvancedInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdvanced = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/advanced`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch advanced info');
      }
      setAdvancedInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvanced();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={fetchAdvanced} disabled={loading}>
            <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh Info
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="panel panel-default">
          <div className="panel-heading" style={{ fontWeight: 'bold' }}>
            Advanced System Information (CLI Version Details)
          </div>
          <div className="panel-body">
            {loading && !advancedInfo ? (
              <div className="text-center" style={{ padding: '30px' }}>
                <i className="fa fa-spinner fa-spin fa-2x text-muted" style={{ marginBottom: '10px' }}></i>
                <p className="text-muted">Connecting to hardware to retrieve version detail...</p>
              </div>
            ) : advancedInfo?.raw_version ? (
              <div>
                <pre style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', fontSize: '12px', maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace' }}>
                  {advancedInfo.raw_version}
                </pre>
              </div>
            ) : (
              <div className="text-center text-muted" style={{ padding: '20px' }}>
                No advanced info available. Connect to OLT first or click Refresh.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
