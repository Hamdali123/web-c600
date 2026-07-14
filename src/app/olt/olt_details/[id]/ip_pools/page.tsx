"use client";

import { useEffect, useState, use } from 'react';

export default function OltIpPoolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [onuList, setOnuList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subTab, setSubTab] = useState<'internet' | 'mgmt'>('internet');

  const fetchOnus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/onu-mgmt`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch ONU IP pools');
      }
      setOnuList(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnus();
  }, [id]);

  return (
    <div>
      <ul className="nav nav-pills" style={{ marginBottom: '15px' }}>
        <li className={subTab === 'internet' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setSubTab('internet'); }}>Internet IP pools</a>
        </li>
        <li className={subTab === 'mgmt' ? 'active' : ''} style={{ marginLeft: '5px' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setSubTab('mgmt'); }}>Management IP pools</a>
        </li>
      </ul>

      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {subTab === 'internet' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#4a5568' }}>ONU Internet IP Addresses</strong>
              <span className="text-muted small" style={{ marginLeft: '10px' }}>Assigned WAN/PPPoE IPs per ONU</span>
            </div>
            <button className="btn btn-primary btn-xs" onClick={fetchOnus} disabled={loading}>
              <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th>ONU Name</th>
                  <th>SN / MAC</th>
                  <th>WAN Mode</th>
                  <th>PPPoE User</th>
                  <th>Status</th>
                  <th>Interface</th>
                </tr>
              </thead>
              <tbody>
                {loading && onuList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center" style={{ padding: '30px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted"></i>
                      <p className="text-muted" style={{ marginTop: '10px' }}>Loading ONU list...</p>
                    </td>
                  </tr>
                ) : onuList.length > 0 ? (
                  onuList.map((onu, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>
                          <a href={`/onu/view/${onu.id}`} style={{ color: '#337ab7' }}>{onu.name}</a>
                        </strong>
                      </td>
                      <td className="text-muted small"><code>{onu.sn_mac}</code></td>
                      <td><span className="label label-info">{onu.wan_mode || 'PPPoE'}</span></td>
                      <td>{onu.pppoe_user || <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`label ${onu.status === 'Online' ? 'label-success' : 'label-default'}`}>
                          {onu.status || 'Offline'}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {onu.pon_port?.replace('gpon-olt_', '')}:{onu.onu_id}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted" style={{ padding: '30px' }}>
                      No configured ONUs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'mgmt' && (
        <div className="panel panel-default border-0 shadow-sm">
          <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#4a5568' }}>ONU Management IP Addresses</strong>
              <span className="text-muted small" style={{ marginLeft: '10px' }}>In-band management IPs per ONU</span>
            </div>
            <button className="btn btn-primary btn-xs" onClick={fetchOnus} disabled={loading}>
              <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th>ONU Name</th>
                  <th>SN / MAC</th>
                  <th>Management IP</th>
                  <th>Interface</th>
                </tr>
              </thead>
              <tbody>
                {loading && onuList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center" style={{ padding: '30px' }}>
                      <i className="fa fa-spinner fa-spin fa-2x text-muted"></i>
                      <p className="text-muted" style={{ marginTop: '10px' }}>Loading ONU list...</p>
                    </td>
                  </tr>
                ) : onuList.filter(o => o.mgmt_ip).length > 0 ? (
                  onuList.filter(o => o.mgmt_ip).map((onu, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>
                          <a href={`/onu/view/${onu.id}`} style={{ color: '#337ab7' }}>{onu.name}</a>
                        </strong>
                      </td>
                      <td className="text-muted small"><code>{onu.sn_mac}</code></td>
                      <td style={{ color: '#0056b3', fontWeight: 'bold' }}>{onu.mgmt_ip}</td>
                      <td className="text-muted small">
                        {onu.pon_port?.replace('gpon-olt_', '')}:{onu.onu_id}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-muted" style={{ padding: '30px' }}>
                      No ONUs with Management IP configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
