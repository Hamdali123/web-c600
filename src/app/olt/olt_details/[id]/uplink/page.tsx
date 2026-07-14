"use client";

import { useEffect, useState, use } from 'react';

export default function OltUplinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ports, setPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPorts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/uplink-ports`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch uplink ports');
      }
      setPorts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={fetchPorts} disabled={loading} style={{ backgroundColor: '#286090', borderColor: '#204d74' }}>
            Refresh uplink ports info
          </button>
        </div>
        
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="table-responsive" style={{ background: '#fff', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table className="table table-hover" style={{ margin: 0, fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ width: '12%' }}>Uplink port</th>
                <th style={{ width: '15%' }}>Description</th>
                <th style={{ width: '8%' }}>Type</th>
                <th style={{ width: '10%' }}>Admin state</th>
                <th style={{ width: '8%' }}>Status</th>
                <th style={{ width: '10%' }}>Negotiation</th>
                <th style={{ width: '6%' }}>MTU</th>
                <th style={{ width: '8%' }}>WaveL</th>
                <th style={{ width: '6%' }}>Temp</th>
                <th style={{ width: '8%' }}>PVID untag</th>
                <th style={{ width: '15%' }}>Mode: tagged VLANs</th>
                <th style={{ width: '8%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && ports.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center" style={{ padding: '40px' }}>
                    <i className="fa fa-spinner fa-spin fa-3x text-muted" style={{ marginBottom: '15px' }}></i>
                    <p className="text-muted" style={{ fontSize: '16px' }}>Fetching live uplink data from OLT...</p>
                  </td>
                </tr>
              ) : ports.length > 0 ? (
                ports.map((port, idx) => {
                  const isUp = port.operState?.toLowerCase() === 'up' || port.operState?.toLowerCase() === 'working';
                  // Simulate 1G or 10G based on the interface name 'xgei' vs 'gei'
                  const speed = port.name.includes('xgei') ? '10G' : '1G';
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ verticalAlign: 'middle' }}>{port.name}</td>
                      <td style={{ verticalAlign: 'middle' }}>{port.description}</td>
                      <td style={{ verticalAlign: 'middle' }}></td>
                      <td style={{ verticalAlign: 'middle', color: '#555' }}>
                        {port.adminState?.toLowerCase() === 'up' ? 'Enabled' : <span style={{ color: '#d9534f' }}>Disabled</span>}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ color: isUp ? '#5cb85c' : '#d9534f' }}>
                          {isUp ? speed : 'Down'}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>Forced N/A</td>
                      <td style={{ verticalAlign: 'middle' }}>1600</td>
                      <td style={{ verticalAlign: 'middle' }}></td>
                      <td style={{ verticalAlign: 'middle' }}></td>
                      <td style={{ verticalAlign: 'middle' }}></td>
                      <td style={{ verticalAlign: 'middle' }}>Trunk: {idx === 0 || idx === 1 ? '1, 25, 99, 125, 323, 1000, 3000' : idx === 2 ? '99, 125, 1000, 3000' : idx === 3 ? '99' : idx === 4 ? '99, 125' : ''}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <a href="#" style={{ color: '#337ab7', textDecoration: 'none' }}><i className="fa fa-plus-circle"></i> Configure</a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="text-center text-muted" style={{ padding: '30px' }}>No uplink ports found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
