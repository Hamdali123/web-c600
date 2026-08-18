"use client";

import { useState, useEffect } from 'react';

// Pseudo-random generator based on string to generate stable mock values
const stableHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getSignalColor = (val: number | null) => {
  if (val === null) return '#ccc';
  if (val <= -33) return '#d9534f'; // Red
  if (val < -30.99) return '#f0ad4e'; // Yellow
  return '#5cb85c'; // Green
};

const renderSignalBars = (signal: number) => {
  const color = getSignalColor(signal);
  return (
    <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '12px', marginLeft: '5px' }}>
      <div style={{ width: '3px', height: '3px', backgroundColor: color }}></div>
      <div style={{ width: '3px', height: '6px', backgroundColor: signal > -33 ? color : '#eee' }}></div>
      <div style={{ width: '3px', height: '9px', backgroundColor: signal >= -30.99 ? color : '#eee' }}></div>
      <div style={{ width: '3px', height: '12px', backgroundColor: signal > -25 ? color : '#eee' }}></div>
    </div>
  );
};

export default function PonPortsClient({ oltId, initialPorts }: { oltId: string; initialPorts: any[] }) {
  const [ports, setPorts] = useState<any[]>(initialPorts || []);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('Any');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editPort, setEditPort] = useState<any>({ name: '', adminState: 'Enabled', description: '', minRange: 0, maxRange: 20000, maxOnus: 'auto (by type)' });
  const [savingPort, setSavingPort] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/pon-ports/refresh`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPorts(data.ports || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  useEffect(() => {
    if (ports.length === 0 && !hasFetched) {
      handleRefresh();
    }
  }, []);

  const handleRebootOnus = async (portName: string) => {
    if (!confirm(`Are you sure you want to reboot all ONUs on port ${portName}?`)) return;
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/pon-ports/${encodeURIComponent(portName)}/reboot-onus`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'ONUs reboot initiated.');
      } else {
        alert(data.error || 'Failed to reboot ONUs.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleEnableAll = async () => {
    if (!confirm('Are you sure you want to enable all PON ports on this OLT?')) return;
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/pon-ports/enable-all`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'All PON ports enabled.');
        handleRefresh();
      } else {
        alert(data.error || 'Failed to enable all PON ports.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleConfigurePort = (port: any) => {
    setEditPort({
      name: port.name,
      parsedPort: port.parsedPort,
      adminState: port.adminState === 'up' || port.adminState === 'Enabled' ? 'Enabled' : 'Disabled',
      description: port.description || '',
      minRange: 0,
      maxRange: 20000,
      maxOnus: 'auto (by type)'
    });
    setActiveModal('configPort');
  };

  const handleSavePort = async () => {
    setSavingPort(true);
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/pon-ports/${encodeURIComponent(editPort.name)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPort)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Port updated successfully.');
        setActiveModal(null);
        handleRefresh();
      } else {
        alert(data.error || 'Failed to update port.');
      }
    } catch (e) {
      alert('Network error.');
    }
    setSavingPort(false);
  };

  // Group ports by slot
  const groupedPorts: Record<string, any[]> = {};
  ports.forEach(port => {
    // Example port.name: gpon_olt-1/2/1
    const match = port.name.match(/\d+\/(\d+)\/(\d+)/);
    const slot = match ? match[1] : 'Unknown';
    if (!groupedPorts[slot]) groupedPorts[slot] = [];
    
    // Compute stable mock data
    const hash = Math.abs(stableHash(port.name));
    const avgSignal = -18 - (hash % 1000) / 100; // -18.00 to -27.99
    const txPower = 5 + (hash % 1000) / 1000; // 5.000 to 5.999
    
    groupedPorts[slot].push({
      ...port,
      parsedSlot: slot,
      parsedPort: match ? match[2] : port.name,
      avgSignal: avgSignal.toFixed(2),
      txPower: txPower.toFixed(3)
    });
  });

  const slots = Object.keys(groupedPorts).sort((a, b) => parseInt(a) - parseInt(b));
  const filteredSlots = selectedSlot === 'Any' ? slots : [selectedSlot];

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px', display: 'flex', gap: '5px' }}>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={loading} style={{ backgroundColor: '#337ab7', borderColor: '#2e6da4' }}>
            <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> {loading ? 'Refreshing...' : 'Refresh PON ports info'}
          </button>
          <button className="btn btn-primary" onClick={handleEnableAll} style={{ backgroundColor: '#337ab7', borderColor: '#2e6da4' }}>Enable all PON ports</button>
          <button className="btn btn-warning" style={{ backgroundColor: '#f0ad4e', borderColor: '#eea236' }}>Reboot all ONUs</button>
          <button className="btn btn-danger" style={{ backgroundColor: '#d9534f', borderColor: '#d43f3a' }}><i className="fa fa-crosshairs"></i> Rogue ONU detect</button>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <strong>OLT slot</strong>
          <select className="form-control" style={{ width: '150px', display: 'inline-block' }} value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)}>
            <option value="Any">Any</option>
            {slots.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-muted">All loaded.</span>
        </div>

        {ports.length === 0 && !loading && (
           <div className="alert alert-info">No PON ports found.</div>
        )}

        {filteredSlots.map(slot => (
          <div key={slot} style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontWeight: 'bold' }}>OLT slot {slot}, board type: GFGN</h4>
              <div>
                <a href="#" style={{ marginRight: '15px', color: '#337ab7' }}><i className="fa fa-pencil-square-o"></i> Configure Max ONUs per PON</a>
                <a href="#" style={{ color: '#337ab7' }}><i className="fa fa-refresh"></i> Reboot all ONUs on slot {slot}</a>
              </div>
            </div>
            
            <div className="table-responsive" style={{ background: '#fff', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table className="table table-hover" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '8px' }}>Port</th>
                    <th>Type</th>
                    <th>Admin state</th>
                    <th>Status</th>
                    <th>ONUs</th>
                    <th style={{ width: '120px' }}>Load</th>
                    <th>Average signal</th>
                    <th>Description</th>
                    <th>Properties</th>
                    <th>Tx power<br/><span style={{ fontSize: '11px', fontWeight: 'normal' }}>dBm</span></th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPorts[slot].sort((a,b) => parseInt(a.parsedPort) - parseInt(b.parsedPort)).map((port, idx) => {
                    const totalOnus = port.onuCount || 0;
                    const onlineOnus = port.onlineCount || 0;
                    const isUp = port.operState === 'up' || port.status === 'up' || port.status === 'Active';
                    const maxOnus = 128;
                    const loadPct = totalOnus > 0 ? Math.round((totalOnus / maxOnus) * 100) : 0;
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 8px' }}>{port.parsedPort}</td>
                        <td>GPON</td>
                        <td>{port.adminState === 'up' || !port.adminState ? 'Enabled' : 'Disabled'}</td>
                        <td>
                          <span style={{ color: isUp ? '#5cb85c' : '#d9534f' }}>
                            {isUp ? 'Up' : 'Down'}
                          </span>
                        </td>
                        <td>
                           <div style={{ color: '#337ab7', fontSize: '12px' }}>Online: {onlineOnus}</div>
                           <div style={{ color: '#555', fontSize: '12px' }}>Total: {totalOnus}</div>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                           <div style={{ fontSize: '10px', textAlign: 'center', backgroundColor: '#e9ecef', borderRadius: '10px', position: 'relative', overflow: 'hidden', height: '14px', border: '1px solid #ccc' }}>
                             <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: loadPct + '%', backgroundColor: '#5cb85c', opacity: 0.8 }}></div>
                             <div style={{ position: 'relative', zIndex: 1, lineHeight: '12px', color: '#333' }}>
                               {totalOnus} / {maxOnus} ({loadPct}%)
                             </div>
                           </div>
                        </td>
                        <td>
                           {totalOnus > 0 ? (
                             <span style={{ color: getSignalColor(parseFloat(port.avgSignal)) }}>
                               {port.avgSignal} {renderSignalBars(parseFloat(port.avgSignal))}
                             </span>
                           ) : ''}
                        </td>
                        <td>{port.description || ''}</td>
                        <td style={{ fontSize: '12px', color: '#555' }}>
                           <div>Range: 0 - 20000 m</div>
                           <div>Rogue ONU detect: <span style={{ color: '#337ab7' }}>Enabled</span></div>
                        </td>
                        <td>1490: {port.txPower}</td>
                        <td style={{ fontSize: '12px' }}>
                           <div><a href="#" onClick={(e) => { e.preventDefault(); handleConfigurePort(port); }} style={{ color: '#337ab7' }}><i className="fa fa-cog"></i> Configure</a></div>
                           <div><a href="#" onClick={(e) => { e.preventDefault(); handleRebootOnus(port.name); }} style={{ color: '#337ab7' }}><i className="fa fa-refresh"></i> Reboot ONUs</a></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {activeModal === 'configPort' && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e5e5' }}>
                <button type="button" className="close" onClick={() => setActiveModal(null)}>&times;</button>
                <h4 className="modal-title" style={{ fontSize: '18px' }}>Configure PON port {editPort.parsedPort}</h4>
              </div>
              <div className="modal-body" style={{ padding: '20px 30px' }}>
                
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ width: '150px', fontWeight: 'bold' }}>Admin state</label>
                  <div>
                    <label className="radio-inline" style={{ marginRight: '15px' }}>
                      <input type="radio" checked={editPort.adminState === 'Enabled'} onChange={() => setEditPort({ ...editPort, adminState: 'Enabled' })} /> Enabled
                    </label>
                    <label className="radio-inline">
                      <input type="radio" checked={editPort.adminState === 'Disabled'} onChange={() => setEditPort({ ...editPort, adminState: 'Disabled' })} /> Disabled
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <label style={{ width: '150px', fontWeight: 'bold', paddingTop: '7px' }}>Port<br/>description</label>
                  <input type="text" className="form-control" style={{ flex: 1 }} value={editPort.description} onChange={(e) => setEditPort({ ...editPort, description: e.target.value })} />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <label style={{ width: '150px', fontWeight: 'bold', paddingTop: '7px' }}>Min Range</label>
                  <div style={{ flex: 1 }}>
                    <input type="number" className="form-control" value={editPort.minRange} onChange={(e) => setEditPort({ ...editPort, minRange: parseInt(e.target.value) || 0 })} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>meters</div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <label style={{ width: '150px', fontWeight: 'bold', paddingTop: '7px' }}>Max Range</label>
                  <div style={{ flex: 1 }}>
                    <input type="number" className="form-control" value={editPort.maxRange} onChange={(e) => setEditPort({ ...editPort, maxRange: parseInt(e.target.value) || 0 })} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>meters</div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ width: '150px', fontWeight: 'bold' }}>Max ONUs</label>
                  <input type="text" className="form-control" style={{ flex: 1 }} value={editPort.maxOnus} onChange={(e) => setEditPort({ ...editPort, maxOnus: e.target.value })} />
                </div>

              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e5e5' }}>
                <button className="btn btn-link" style={{ color: '#337ab7' }} onClick={() => setActiveModal(null)}>Close</button>
                <button className="btn btn-success" disabled={savingPort} onClick={handleSavePort} style={{ backgroundColor: '#5cb85c', borderColor: '#4cae4c' }}>
                  {savingPort ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
