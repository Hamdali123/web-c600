"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import DateDisplay from '@/components/DateDisplay';

export default function ViewOnuPage() {
  const params = useParams();
  const [onu, setOnu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState('');
  const [masterData, setMasterData] = useState<any>({ speedProfiles: [], zones: [] });
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [editData, setEditData] = useState({ 
    name: '', vlan: '', profileId: '', externalId: '', address: '', zoneId: '', 
    contact: '', notes: '', wan_mode: '', mgmt_ip: '' 
  });
  const [historyRange, setHistoryRange] = useState('24h');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [liveTraffic, setLiveTraffic] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [showRunningConfig, setShowRunningConfig] = useState(false);
  const [runningConfig, setRunningConfig] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const router = useRouter();

  const fetchOnu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onus/${params.id}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        router.push('/onu/configured');
      } else {
        setOnu(data);
        setEditData({ 
          name: data.name,
          vlan: data.vlan, 
          profileId: data.profileId || '', 
          externalId: data.external_id || '', 
          address: data.address || '',
          zoneId: data.zone_id || '',
          contact: data.contact || '',
          notes: data.notes || '',
          wan_mode: data.wan_mode || 'PPPoE',
          mgmt_ip: data.mgmt_ip || ''
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [params.id, router]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/onus/${params.id}/signal-history?range=${historyRange}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (e) {}
  }, [params.id, historyRange]);

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      setMasterData(data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchOnu();
      fetchMasterData();
    }
  }, [params.id, fetchOnu, fetchMasterData]);

  useEffect(() => {
    if (params.id) fetchHistory();
  }, [params.id, fetchHistory]);

  // Live Traffic Simulation
  useEffect(() => {
    let interval: any;
    if (isLive) {
      interval = setInterval(() => {
        setLiveTraffic(prev => {
          const newItem = {
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            rx: Math.floor(Math.random() * 50) + 10,
            tx: Math.floor(Math.random() * 5) + 1
          };
          const next = [...prev, newItem];
          return next.slice(-20); // keep last 20
        });
      }, 2000);
    } else {
      setLiveTraffic([]);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const handleAction = async (action: string, extraData?: any) => {
    setLoadingAction(action);
    try {
      let url = '';
      let method = 'POST';
      let body: any = null;
      
      if (action === 'Reboot') url = `/api/onus/${params.id}/reboot`;
      else if (action === 'Factory Reset') url = `/api/onus/${params.id}/factory-reset`;
      else if (action === 'Refresh Signal' || action === 'Get Status') {
        url = `/api/onus/${params.id}/status`;
        method = 'GET';
      }
      else if (action === 'Delete') {
        url = `/api/onus/${params.id}/delete`;
        method = 'DELETE';
      }
      else if (action === 'Disable') url = `/api/onus/${params.id}/disable`;
      else if (action === 'Enable') url = `/api/onus/${params.id}/enable`;
      else if (action === 'Show Running Config') {
        setLoadingConfig(true);
        setShowRunningConfig(true);
        try {
          const res = await fetch(`/api/onus/${params.id}/running-config`);
          const data = await res.json();
          setRunningConfig(data.config || 'No config found.');
        } catch (e) {
          setRunningConfig('Failed to fetch config.');
        }
        setLoadingConfig(false);
        setLoadingAction('');
        return;
      }
      else if (action === 'Update Config') {
        url = `/api/onus/${params.id}/update-config`;
        body = JSON.stringify(extraData);
      }

      const res = await fetch(url, { 
        method, 
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body 
      });
      const data = await res.json();

      if (data.success) {
        if (action !== 'Get Status') alert(`${action} successfully executed!`);
        if (action === 'Delete') {
          router.push('/onu/configured');
        } else {
          setShowConfigEdit(false);
          fetchOnu();
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Connection error to server.');
    }
    setLoadingAction('');
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x text-muted"></i></div>;
  if (!onu) return <div className="text-center">ONU not found.</div>;

  const getSignalColor = (val: number | null) => {
    if (val === null) return '#ccc';
    if (val > -24) return '#5cb85c';
    if (val > -27) return '#f0ad4e';
    return '#d9534f';
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f2f2f2', minHeight: '100vh', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      
      {/* Top Header Information */}
      <div style={{ marginBottom: '20px', fontSize: '13px' }}>
        <div className="row" style={{ marginBottom: '5px' }}>
          <div className="col-sm-2 text-right text-muted">Name</div>
          <div className="col-sm-4"><a href="#" onClick={e => { e.preventDefault(); setShowConfigEdit(true); }} style={{ color: '#337ab7', fontWeight: 'bold' }}>{onu.name}</a></div>
          <div className="col-sm-2 text-right text-muted">Mgmt IP</div>
          <div className="col-sm-4" style={{ color: '#337ab7' }}>{onu.mgmt_ip || 'Inactive'}</div>
        </div>
        <div className="row" style={{ marginBottom: '5px' }}>
          <div className="col-sm-2 text-right text-muted">Address or comment</div>
          <div className="col-sm-4" style={{ color: '#337ab7' }}>{onu.address || 'None'}</div>
          <div className="col-sm-2 text-right text-muted">WAN setup mode</div>
          <div className="col-sm-4" style={{ color: '#337ab7' }}>Setup via ONU webpage</div>
        </div>
        <div className="row" style={{ marginBottom: '5px' }}>
          <div className="col-sm-2 text-right text-muted">Contact</div>
          <div className="col-sm-4" style={{ color: '#337ab7' }}>{onu.contact || 'None'}</div>
        </div>
        <div className="row" style={{ marginBottom: '5px' }}>
          <div className="col-sm-2 text-right text-muted">Authorization date</div>
          <div className="col-sm-4">
             {new Date(onu.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/ /g, '-')} 
             <a href="#" style={{ marginLeft: '8px', color: '#337ab7' }}>History</a>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-2 text-right text-muted">ONU external ID</div>
          <div className="col-sm-4">{onu.sn_mac}</div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', paddingLeft: '11%' }}>
         <span style={{ fontWeight: 'bold', marginRight: '15px', color: '#666' }}>Status</span>
         <button className="btn-official" onClick={() => handleAction('Get Status')}>Get status</button>
         <button className="btn-official" onClick={() => handleAction('Show Running Config')}>Show running-config</button>
         <button className="btn-official">SW info</button>
         <button className={`btn-live ${isLive ? 'active' : ''}`} onClick={() => setIsLive(!isLive)}>LIVE!</button>
      </div>

      {/* Charts Row */}
      <div className="row" style={{ marginBottom: '25px' }}>
         <div className="col-md-6">
            <div className="panel panel-default" style={{ border: '1px solid #ddd', boxShadow: 'none' }}>
               <div className="panel-body" style={{ padding: '15px' }}>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '15px', fontSize: '13px' }}>{onu.pon_port}:{onu.onu_id} traffic</div>
                  <div style={{ height: '220px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={liveTraffic.length > 0 ? liveTraffic : [{time: '00:00', rx: 0, tx: 0}]}>
                           <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#eee" />
                           <XAxis dataKey="time" fontSize={10} axisLine={{ stroke: '#ccc' }} />
                           <YAxis fontSize={10} unit="M" axisLine={{ stroke: '#ccc' }} label={{ value: 'bits per second', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                           <Tooltip />
                           <Area type="monotone" dataKey="rx" stroke="#337ab7" fill="#337ab7" fillOpacity={0.1} strokeWidth={2} name="Download" />
                           <Area type="monotone" dataKey="tx" stroke="#f0ad4e" fill="#f0ad4e" fillOpacity={0.1} strokeWidth={2} name="Upload" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '11px', marginTop: '10px', justifyContent: 'center' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#f0ad4e' }}></div> Upload</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#337ab7' }}></div> Download</span>
                  </div>
               </div>
            </div>
         </div>
         <div className="col-md-6">
            <div className="panel panel-default" style={{ border: '1px solid #ddd', boxShadow: 'none' }}>
               <div className="panel-body" style={{ padding: '15px' }}>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '15px', fontSize: '13px' }}>{onu.pon_port}:{onu.onu_id} signal</div>
                  <div style={{ height: '220px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData.length > 0 ? historyData : [{createdAt: new Date().toISOString(), signal: -20}]}>
                           <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#eee" />
                           <XAxis dataKey="createdAt" hide />
                           <YAxis domain={[-35, -10]} fontSize={10} unit="dBm" axisLine={{ stroke: '#ccc' }} />
                           <Tooltip />
                           <Area type="stepAfter" dataKey="signal" stroke="#f0ad4e" fill="none" strokeWidth={2} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '11px', marginTop: '10px', justifyContent: 'center' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#f0ad4e' }}></div> 1310nm OLT Rx for ONU</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Speed Profiles Table */}
      <div style={{ marginBottom: '25px' }}>
         <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>Speed profiles</div>
         <table className="table-official">
            <thead>
               <tr>
                  <th>Service-port ID</th>
                  <th>User-VLAN</th>
                  <th>Download</th>
                  <th>Upload</th>
                  <th>Action</th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td>1</td>
                  <td>{onu.vlan}</td>
                  <td>1G</td>
                  <td>1G</td>
                  <td><a href="#" className="btn-link-official"><i className="fa fa-plus-circle"></i> Configure</a></td>
               </tr>
            </tbody>
         </table>
      </div>

      {/* Ethernet Ports Table */}
      <div style={{ marginBottom: '25px' }}>
         <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>Ethernet ports</div>
         <table className="table-official">
            <thead>
               <tr>
                  <th>Port</th>
                  <th>Admin state</th>
                  <th>Mode</th>
                  <th>DHCP</th>
                  <th>Action</th>
               </tr>
            </thead>
            <tbody>
               <tr>
                  <td>eth_1/1</td>
                  <td><span style={{ color: '#5cb85c' }}>Enabled</span></td>
                  <td>LAN</td>
                  <td>From ONU</td>
                  <td><a href="#" className="btn-link-official"><i className="fa fa-plus-circle"></i> Configure</a></td>
               </tr>
            </tbody>
         </table>
      </div>

      {/* Edit Modal (Existing Logic Preserved) */}
      {showConfigEdit && (
         <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog">
               <div className="modal-content">
                  <div className="modal-header" style={{ background: '#337ab7', color: '#fff' }}>
                     <h4 className="modal-title">Edit ONU</h4>
                  </div>
                  <div className="modal-body">
                     <div className="form-group"><label>Name</label><input className="form-control" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /></div>
                     <div className="form-group"><label>Address</label><input className="form-control" value={editData.address} onChange={e => setEditData({...editData, address: e.target.value})} /></div>
                  </div>
                  <div className="modal-footer">
                     <button className="btn btn-default" onClick={() => setShowConfigEdit(false)}>Cancel</button>
                     <button className="btn btn-primary" onClick={() => handleAction('Update Config', editData)}>Save</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Running Config Modal */}
      {showRunningConfig && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#2d323e', color: '#fff' }}>
                <button className="close" onClick={() => setShowRunningConfig(false)} style={{ color: '#fff' }}>&times;</button>
                <h4 className="modal-title">Running Configuration</h4>
              </div>
              <div className="modal-body">
                {loadingConfig ? <div className="text-center"><i className="fa fa-spinner fa-spin fa-2x"></i></div> : (
                  <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', maxHeight: '400px', overflowY: 'auto', fontSize: '12px' }}>{runningConfig}</pre>
                )}
              </div>
              <div className="modal-footer"><button className="btn btn-default" onClick={() => setShowRunningConfig(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .btn-official {
           background-color: #337ab7;
           color: #fff;
           border: none;
           padding: 6px 15px;
           border-radius: 4px;
           font-size: 13px;
           font-weight: bold;
           transition: opacity 0.2s;
        }
        .btn-official:hover { opacity: 0.9; }
        .btn-live {
           background-color: #5cb85c;
           color: #fff;
           border: none;
           padding: 6px 15px;
           border-radius: 4px;
           font-size: 13px;
           font-weight: bold;
        }
        .btn-live.active { background-color: #d9534f; }
        .table-official {
           width: 100%;
           border-collapse: collapse;
           background: #fff;
           border: 1px solid #ddd;
        }
        .table-official th {
           background: #f5f5f5;
           color: #333;
           padding: 10px;
           text-align: left;
           font-size: 13px;
           border-bottom: 2px solid #ddd;
        }
        .table-official td {
           padding: 10px;
           border-bottom: 1px solid #eee;
           font-size: 13px;
        }
        .btn-link-official {
           color: #337ab7;
           text-decoration: none;
           font-size: 13px;
        }
      `}</style>
    </div>
  );
}
