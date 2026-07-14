"use client";

import { useEffect, useState, use } from 'react';

export default function OltVlansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vlans, setVlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/vlans`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch VLANs');
      }
      setVlans(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVlans();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
          <button className="btn btn-primary" style={{ backgroundColor: '#286090', borderColor: '#204d74', marginRight: '5px' }}>
            <i className="fa fa-plus"></i> Add VLAN
          </button>
          <button className="btn btn-primary" style={{ backgroundColor: '#286090', borderColor: '#204d74', marginRight: '5px' }}>
            <i className="fa fa-plus"></i> Add multiple VLANs
          </button>
          <button className="btn btn-primary" style={{ backgroundColor: '#286090', borderColor: '#204d74', marginRight: '5px' }}>
            <i className="fa fa-minus"></i> Delete multiple VLANs
          </button>
          <button className="btn btn-default" onClick={fetchVlans} disabled={loading} style={{ float: 'right' }}>
            <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#337ab7' }}>
            VLANs added here will not be applied to the Uplink ports automatically. Go to <a href={`/olt/olt_details/${id}/uplink`} style={{ textDecoration: 'underline' }}>Uplink</a> and tag the VLANs on the interfaces you want.
          </div>
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
                <th style={{ width: '8%', textAlign: 'center' }}>VLAN-ID</th>
                <th style={{ width: '12%' }}>Default for</th>
                <th style={{ width: '20%' }}>Description</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Used for IPTV</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Used for Mgmt/VoIP</th>
                <th style={{ width: '10%', textAlign: 'center' }}>DHCP Snooping</th>
                <th style={{ width: '10%', textAlign: 'center' }}>LAN to LAN</th>
                <th style={{ width: '8%', textAlign: 'center' }}>ONUs</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && vlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center" style={{ padding: '40px' }}>
                    <i className="fa fa-spinner fa-spin fa-3x text-muted" style={{ marginBottom: '15px' }}></i>
                    <p className="text-muted" style={{ fontSize: '16px' }}>Fetching live VLANs from OLT...</p>
                  </td>
                </tr>
              ) : vlans.length > 0 ? (
                vlans.map((vlan, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}>
                      <a href="#" style={{ color: '#337ab7', textDecoration: 'none', fontWeight: 'bold' }}>{vlan.id || vlan.vlan_id}</a>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>None selected</td>
                    <td style={{ verticalAlign: 'middle' }}>{vlan.desc || vlan.description || '-'}</td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}><input type="checkbox" disabled /></td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}><input type="checkbox" disabled /></td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}><input type="checkbox" disabled /></td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}><input type="checkbox" disabled /></td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}>
                      <a href="#" style={{ color: '#337ab7', textDecoration: 'underline' }}>{vlan.id === 125 ? 211 : vlan.id === 1000 ? 3 : vlan.id === 99 || vlan.id === 3000 ? 1 : 0}</a>
                    </td>
                    <td className="text-center" style={{ verticalAlign: 'middle' }}>
                      <button className="btn btn-danger btn-sm" style={{ backgroundColor: '#d9534f', borderColor: '#d43f3a', borderRadius: '4px' }}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted" style={{ padding: '30px' }}>
                    No VLANs found on this OLT. Click "Get VLANs from OLT" to retry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
