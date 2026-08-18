"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DiagnosticsPage() {
  const [onus, setOnus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    olt: 'Any',
    board: 'Any',
    port: 'Any',
    zone: 'Any',
    odb: 'Any',
    onuType: 'Any',
    ponType: 'Any',
    status: 'Any',
    reason: 'Any',
    signal: 'Any'
  });

  const [masterData, setMasterData] = useState<any>({
    olts: [],
    zones: [],
    odbs: [],
    onuTypes: []
  });

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      setMasterData(data);
    } catch (e) {
      console.error("Master data fetch failed", e);
    }
  };

  const fetchOnus = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== 'Any' && v !== '') q.set(k, v);
      });
      
      const res = await fetch(`/api/diagnostics?${q.toString()}`);
      const data = await res.json();
      setOnus(data);
    } catch (e) {
      console.error("Diagnostics fetch failed", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchOnus();
  }, [filters]);

  const handleRefresh = () => fetchOnus();

  const getSignalColor = (val: number | null) => {
    if (val === null) return '#ccc';
    if (val > -20) return '#5cb85c'; // Green
    if (val > -25) return '#f0ad4e'; // Yellow
    return '#d9534f'; // Red
  };

  const renderSignalBars = (signal: number | null) => {
    if (signal === null || isNaN(signal)) return <div className="text-center" style={{ width: '64px', margin: '0 auto', color: '#999', fontSize: '14px', fontWeight: 'bold' }}>-</div>;
    
    const min = -36;
    const max = -12;
    const pct = Math.max(0, Math.min(100, ((signal - min) / (max - min)) * 100));
    
    const cp = 33.33; // Critical boundary (-28)
    const wp = 45.83; // Warning boundary (-25)
    const gradient = `linear-gradient(to right, #ef4444 0%, #ef4444 ${cp}%, #f97316 ${cp}%, #f97316 ${wp}%, #1fb325 ${wp}%, #1fb325 100%)`;
    
    return (
      <div className="text-center" style={{ width: '64px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', height: '6px', background: gradient, borderRadius: '3px', marginTop: '4px', marginBottom: '4px' }}>
          <div style={{ position: 'absolute', top: '-2px', left: `${pct}%`, width: '2px', height: '10px', backgroundColor: '#111', border: '1px solid #fff', borderRadius: '1px', transform: 'translateX(-50%)', zIndex: 2, boxShadow: '0 0 0 1px #fff' }}></div>
        </div>
        <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', lineHeight: '1.2' }}>{signal}</div>
      </div>
    );
  };

  const getStatusIcon = (status: string, reason: string | null) => {
    if (status === 'Offline') {
      const lowerReason = (reason || '').toLowerCase();
      if (lowerReason.includes('los')) return <i className="fa fa-chain-broken" style={{ color: '#dd4b39', fontSize: '22px' }} title="Loss of Signal"></i>;
      if (lowerReason.includes('power') || lowerReason.includes('dyinggasp')) return <i className="fa fa-plug" style={{ color: '#777', fontSize: '22px' }} title="Power Failed"></i>;
      return <i className="fa fa-globe" style={{ color: '#777', fontSize: '22px' }} title={reason ? `Offline (${reason})` : 'Offline'}></i>;
    }
    return <i className="fa fa-globe" style={{ color: '#00a65a', fontSize: '22px' }} title="Online"></i>;
  };

  return (
    <div>
      <div className="panel panel-default" style={{ marginBottom: '20px', backgroundColor: '#fdfdfd' }}>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-2">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Search</label>
              <input 
                type="text" 
                className="form-control input-sm" 
                placeholder="SN, MAC, IP, name, address"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>OLT</label>
              <select className="form-control input-sm" value={filters.olt} onChange={e => setFilters({...filters, olt: e.target.value})}>
                <option>Any</option>
                {masterData.olts.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="col-md-1">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Board</label>
              <select className="form-control input-sm" value={filters.board} onChange={e => setFilters({...filters, board: e.target.value})}>
                <option>Any</option>
              </select>
            </div>
            <div className="col-md-1">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Port</label>
              <select className="form-control input-sm" value={filters.port} onChange={e => setFilters({...filters, port: e.target.value})}>
                <option>Any</option>
              </select>
            </div>
            <div className="col-md-1">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Zone</label>
              <select className="form-control input-sm" value={filters.zone} onChange={e => setFilters({...filters, zone: e.target.value})}>
                <option>Any</option>
                {masterData.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="col-md-1">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Splitter</label>
              <select className="form-control input-sm" value={filters.odb} onChange={e => setFilters({...filters, odb: e.target.value})}>
                <option>Any</option>
                {masterData.odbs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>ONU type</label>
              <select className="form-control input-sm" value={filters.onuType} onChange={e => setFilters({...filters, onuType: e.target.value})}>
                <option>Any</option>
                {masterData.onuTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-md-2" style={{ paddingTop: '22px' }}>
            </div>
          </div>
          <div className="row" style={{ marginTop: '10px' }}>
            <div className="col-md-1">
              <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>PON type</label>
              <select className="form-control input-sm" value={filters.ponType} onChange={e => setFilters({...filters, ponType: e.target.value})}>
                <option>Any</option>
                <option>GPON</option>
                <option>EPON</option>
              </select>
            </div>
            <div className="col-md-3 pon-type-filter">
              <label className="control-label" style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Status</label>
              <ul className="pagination" style={{ margin: 0 }}>
                <li className={filters.status === 'Online' && filters.reason === 'Any' ? "status-filter active" : "status-filter"} onClick={() => setFilters({...filters, status: filters.status === 'Online' && filters.reason === 'Any' ? 'Any' : 'Online', reason: 'Any'})} title="Online"><span><i className='fa fa-globe fa-sm text-green' style={{ color: '#1fb325' }}></i></span></li>
                <li className={filters.status === 'Offline' && filters.reason === 'Power Failed' ? "status-filter active" : "status-filter"} onClick={() => setFilters({...filters, status: filters.status === 'Offline' && filters.reason === 'Power Failed' ? 'Any' : 'Offline', reason: filters.status === 'Offline' && filters.reason === 'Power Failed' ? 'Any' : 'Power Failed'})} title="Power Fail"><span><i className='fa fa-plug fa-sm text-grey' style={{ color: '#337ab7' }}></i></span></li>
                <li className={filters.status === 'Offline' && filters.reason === 'LOS' ? "status-filter active" : "status-filter"} onClick={() => setFilters({...filters, status: filters.status === 'Offline' && filters.reason === 'LOS' ? 'Any' : 'Offline', reason: filters.status === 'Offline' && filters.reason === 'LOS' ? 'Any' : 'LOS'})} title="Loss of Signal"><span><i className='fa fa-chain-broken fa-sm text-red' style={{ color: '#ec971f' }}></i></span></li>
                <li className={filters.status === 'Offline' && filters.reason === 'Any' ? "status-filter active" : "status-filter"} onClick={() => setFilters({...filters, status: filters.status === 'Offline' && filters.reason === 'Any' ? 'Any' : 'Offline', reason: 'Any'})} title="Offline"><span><i className='fa fa-globe fa-sm text-grey' style={{ color: '#a0a0a0' }}></i></span></li>
              </ul>
            </div>
            <div className="col-md-2 pon-type-filter">
              <label className="control-label" style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Signal</label>
              <ul className="pagination" style={{ margin: 0 }}>
                <li className={filters.signal === 'good' ? "signal-filter active" : "signal-filter"} onClick={() => setFilters({...filters, signal: filters.signal === 'good' ? 'Any' : 'good'})} title="Good"><span><i className='fa fa-signal fa-sm text-green' style={{ color: '#1fb325' }}></i></span></li>
                <li className={filters.signal === 'warning' ? "signal-filter active" : "signal-filter"} onClick={() => setFilters({...filters, signal: filters.signal === 'warning' ? 'Any' : 'warning'})} title="Warning"><span><i className='fa fa-signal fa-sm' style={{color:'darkorange'}}></i></span></li>
                <li className={filters.signal === 'critical' ? "signal-filter active" : "signal-filter"} onClick={() => setFilters({...filters, signal: filters.signal === 'critical' ? 'Any' : 'critical'})} title="Critical"><span><i className='fa fa-signal fa-sm' style={{color:'red'}}></i></span></li>
              </ul>
            </div>
            <div className="col-md-4">
               <label className="control-label" style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>Status changed</label>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="date" className="form-control input-sm" style={{ width: '45%' }} placeholder="From" />
                  <input type="date" className="form-control input-sm" style={{ width: '45%' }} placeholder="To" />
               </div>
            </div>
            <div className="col-md-2 text-right" style={{ paddingTop: '22px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleRefresh}>
                <i className="fa fa-refresh"></i> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="table-responsive">
          <table className="table table-hover table-striped" style={{ backgroundColor: '#fff', borderTop: 'none' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', color: '#000' }}>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Status</th>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}><i className="fa fa-bar-chart"></i></th>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Rx OLT</th>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Rx ONU</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Distance</th>
                <th style={{ fontWeight: 'bold', fontSize: '14px' }}>Name</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>SN / MAC</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Zone</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Splitter</th>
                <th style={{ minWidth: '150px', fontWeight: 'bold', fontSize: '14px' }}>ONU</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '14px' }}>Status changed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-3x text-muted"></i></td></tr>
              ) : onus.length === 0 ? (
                <tr><td colSpan={11} className="text-center" style={{ padding: '40px', color: '#999' }}>No ONUs found.</td></tr>
              ) : onus.map(onu => (
                <tr key={onu.id}>
                  <td className="text-center" style={{ verticalAlign: 'middle' }}>
                    {getStatusIcon(onu.status || '', onu.offline_reason)}
                  </td>
                  <td className="text-center" style={{ verticalAlign: 'middle' }}>
                    <i className="fa fa-bar-chart" style={{ color: '#188ae2', cursor: 'pointer', fontSize: '14px' }}></i>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>{renderSignalBars(onu.signal)}</td>
                  <td style={{ verticalAlign: 'middle' }}>{renderSignalBars(onu.signal_tx)}</td>
                  <td style={{ verticalAlign: 'middle', fontSize: '14px', color: '#2c3e50' }}>{onu.distance || '-'}</td>
                  <td style={{ verticalAlign: 'middle', fontSize: '14px', color: '#2c3e50' }}>{onu.name}</td>
                  <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '14px', color: '#2c3e50' }}>
                    <a href={`/onu/view/${onu.id}`} style={{ color: '#337ab7', textDecoration: 'none' }}>{onu.sn_mac}</a>
                  </td>
                  <td style={{ verticalAlign: 'middle', fontSize: '14px', color: '#2c3e50' }}>{onu.zone?.name || '-'}</td>
                  <td style={{ verticalAlign: 'middle', fontSize: '14px', color: '#2c3e50' }}>{onu.odb?.name || '-'}</td>
                  <td style={{ verticalAlign: 'middle', fontSize: '14px', color: '#2c3e50' }}>
                     <div><span>{onu.olt ? `${onu.olt.id} - ${onu.olt.name}` : '-'}</span></div>
                     <div style={{ whiteSpace: 'nowrap', marginTop: '2px' }}>{onu.pon_port ? onu.pon_port.replace('gpon-olt_', 'gpon_onu-') : ''}:{onu.onu_id}</div>
                  </td>
                  <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '14px', color: '#2c3e50' }}>
                    <div>{onu.last_online ? new Date(onu.last_online).toISOString().replace('T', '\n').substring(0, 19).replace('\n', ' ') : '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
