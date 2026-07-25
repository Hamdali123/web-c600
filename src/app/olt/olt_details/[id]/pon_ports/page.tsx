"use client";

import React, { useEffect, useState, use } from 'react';

export default function OltPonPortsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ports, setPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPorts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/pon-ports`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch PON ports');
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
          <button className="btn btn-primary" onClick={fetchPorts} disabled={loading} style={{ backgroundColor: '#286090', borderColor: '#204d74', marginRight: '5px' }}>
            Refresh PON ports info
          </button>
          <button className="btn btn-primary" style={{ backgroundColor: '#286090', borderColor: '#204d74', marginRight: '5px' }}>
            Enable all PON ports
          </button>
          <button className="btn btn-warning" style={{ backgroundColor: '#f0ad4e', borderColor: '#eea236', color: '#fff', marginRight: '5px' }}>
            Reboot all ONUs
          </button>
          <button className="btn btn-info" style={{ backgroundColor: '#5bc0de', borderColor: '#46b8da', color: '#fff' }}>
            <i className="fa fa-crosshairs"></i> Rogue ONU detect
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
                <th style={{ width: '5%' }}>Port</th>
                <th style={{ width: '5%', textAlign: 'center' }}>Type</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Admin state</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
                <th style={{ width: '10%', textAlign: 'center' }}>ONUs</th>
                <th style={{ width: '15%' }}>Load</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Average signal</th>
                <th style={{ width: '12%' }}>Description</th>
                <th style={{ width: '12%' }}>Properties</th>
                <th style={{ width: '9%', textAlign: 'center' }}>Tx power<br/><span style={{fontSize: '10px', color: '#777'}}>dBm</span></th>
                <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && ports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '40px' }}>
                    <i className="fa fa-spinner fa-spin fa-3x text-muted" style={{ marginBottom: '15px' }}></i>
                    <p className="text-muted" style={{ fontSize: '16px' }}>Fetching live PON data from OLT hardware...</p>
                  </td>
                </tr>
              ) : ports.length > 0 ? (
                ports.map((port, idx) => {
                  const maxCapacity = 128;
                  const total = port.onus_total || 0;
                  const online = port.onus_online || 0;
                  const offline = total - online;
                  const usagePercent = Math.min(100, Math.round((total / maxCapacity) * 100));
                  const isUp = port.operState?.toLowerCase() === 'up' || port.operState?.toLowerCase() === 'working';
                  
                  const getSlot = (name: string) => {
                    const match = name.match(/(\d+)\/(\d+)\//);
                    return match ? match[2] : '?';
                  };
                  const slot = getSlot(port.name);
                  const isFirstOfSlot = idx === 0 || getSlot(ports[idx - 1].name) !== slot;

                  return (
                    <React.Fragment key={idx}>
                      {isFirstOfSlot && (
                        <tr style={{ backgroundColor: '#fff' }}>
                          <td colSpan={11} style={{ padding: '15px 10px', borderBottom: '2px solid #ddd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '15px' }}>OLT slot {slot}, board type: GFGN</strong>
                              <div>
                                <a href="#" style={{ marginRight: '15px', color: '#337ab7', textDecoration: 'none' }}><i className="fa fa-cog"></i> Configure Max ONUs per PON</a>
                                <a href="#" style={{ color: '#337ab7', textDecoration: 'none' }}><i className="fa fa-refresh"></i> Reboot all ONUs on slot {slot}</a>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ verticalAlign: 'middle', paddingLeft: '20px' }}>
                          {port.name.split('/').pop()}
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle' }}>GPON</td>
                        <td className="text-center" style={{ verticalAlign: 'middle', color: '#555' }}>
                          Enabled
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                          <span style={{ color: isUp ? '#5cb85c' : '#d9534f', fontWeight: 'bold' }}>
                            {port.operState ? (port.operState.charAt(0).toUpperCase() + port.operState.slice(1).toLowerCase()) : 'Down'}
                          </span>
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle', fontSize: '12px' }}>
                          <a href="#" style={{ color: '#337ab7', textDecoration: 'none', display: 'block' }}>Online: {online}</a>
                          <a href="#" style={{ color: '#337ab7', textDecoration: 'none', display: 'block' }}>Total: {total}</a>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '60px', fontSize: '11px', color: '#666', marginRight: '10px' }}>
                              {total} / {maxCapacity} <span style={{ color: '#999' }}>({usagePercent}%)</span>
                            </div>
                            <div className="progress" style={{ marginBottom: 0, height: '4px', borderRadius: '0', backgroundColor: '#e9ecef', flex: 1 }}>
                              <div className="progress-bar progress-bar-success" role="progressbar" style={{ width: `${Math.min(100, (online / maxCapacity) * 100)}%`, backgroundColor: '#5cb85c' }}></div>
                              <div className="progress-bar progress-bar-danger" role="progressbar" style={{ width: `${Math.min(100, (offline / maxCapacity) * 100)}%`, backgroundColor: '#d9534f' }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle', color: port.averageSignal ? '#337ab7' : '#999' }}>
                          {port.averageSignal ? `${port.averageSignal}` : '-'} <i className="fa fa-signal" style={{ color: port.averageSignal ? '#5cb85c' : '#ccc' }}></i>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontStyle: 'italic', color: '#666' }}>
                          {port.description || ''}
                        </td>
                        <td style={{ verticalAlign: 'middle', fontSize: '12px', color: '#666' }}>
                          Range: {port.properties?.range || '0 - 20000 m'}<br/>
                          Rogue ONU detect: <u><a href="#" style={{color: '#666'}}>Enabled</a></u>
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                          1490: {port.txPower ? port.txPower : 'N/A'}
                        </td>
                        <td className="text-center" style={{ verticalAlign: 'middle', fontSize: '12px' }}>
                          <a href="#" style={{ color: '#337ab7', display: 'block', marginBottom: '4px', textDecoration: 'none' }}><i className="fa fa-plus-circle"></i> Configure</a>
                          <a href="#" style={{ color: '#337ab7', display: 'block', textDecoration: 'none' }}><i className="fa fa-refresh"></i> Reboot ONUs</a>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '30px' }}>
                    <i className="fa fa-exclamation-triangle fa-2x margin-bottom-10"></i><br/>
                    No PON ports found. Ensure OLT connection is active and cards are registered.
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
