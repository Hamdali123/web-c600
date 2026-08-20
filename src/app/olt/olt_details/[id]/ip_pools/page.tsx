"use client";

import { useEffect, useState, use } from 'react';

export default function OltIpPoolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [subTab, setSubTab] = useState<'mgmt' | 'wan'>('mgmt');
  const [onus, setOnus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnus = async () => {
      try {
        const res = await fetch(`/api/settings/olt/${id}/onu-mgmt`);
        const data = await res.json();
        if (Array.isArray(data)) setOnus(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchOnus();
  }, [id]);

  const mgmtOnus = onus.filter(o => o.mgmt_ip);

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '5px' }}>
        <button 
          className={`btn ${subTab === 'mgmt' ? 'btn-primary' : 'btn-default'}`} 
          onClick={() => setSubTab('mgmt')}
          style={subTab === 'mgmt' ? { backgroundColor: '#286090', borderColor: '#204d74' } : {}}
        >
          <i className="fa fa-server"></i> ONU MGMT IPs
        </button>
        <button 
          className={`btn ${subTab === 'wan' ? 'btn-success' : 'btn-default'}`} 
          onClick={() => setSubTab('wan')}
          style={subTab === 'wan' ? { color: '#fff', backgroundColor: '#5cb85c', borderColor: '#4cae4c' } : { color: '#5cb85c' }}
        >
          <i className="fa fa-globe"></i> ONU WAN Static IPs
        </button>
      </div>

      <h4 style={{ color: '#337ab7', marginBottom: '20px', fontWeight: 'bold' }}>
        {subTab === 'mgmt' ? 'ONU Management IPs' : 'ONU WAN Static IPs'}
      </h4>

      {loading ? (
        <div className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></div>
      ) : subTab === 'mgmt' ? (
        <div className="panel panel-default">
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="table table-striped table-bordered table-hover" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>ONU Name</th>
                  <th>SN / MAC</th>
                  <th>Management IP</th>
                  <th>Status</th>
                  <th>Interface</th>
                </tr>
              </thead>
              <tbody>
                {mgmtOnus.length > 0 ? mgmtOnus.map((o, i) => (
                  <tr key={i}>
                    <td><a href={`/onu/view/${o.id}`}>{o.name}</a></td>
                    <td className="text-muted small"><code>{o.sn_mac}</code></td>
                    <td>{o.mgmt_ip}</td>
                    <td><span className={`label ${o.status === 'Online' ? 'label-success' : 'label-default'}`}>{o.status}</span></td>
                    <td className="text-muted small">{o.pon_port}:{o.onu_id}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '40px' }}>
                    <i className="fa fa-server fa-2x" style={{ display: 'block', marginBottom: '10px', opacity: 0.4 }}></i>
                    Belum ada ONU dengan management IP.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">
          <i className="fa fa-info-circle"></i> Static IP WAN belum didukung firmware C600 ini (butuh ip-profile yang tidak bisa dibuat dari OLT). Gunakan DHCP atau PPPoE.
        </div>
      )}
    </div>
  );
}