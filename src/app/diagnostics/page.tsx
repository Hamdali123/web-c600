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
      const res = await fetch('/api/settings/master'); // Need to create this or individual ones
      const data = await res.json();
      setMasterData(data);
    } catch (e) {
      console.error("Master data fetch failed", e);
    }
  };

  const fetchOnus = async () => {
    setLoading(true);
    try {
      // Construct query string
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
    fetchOnus();
  }, []);

  const handleRefresh = () => fetchOnus();

  const getSignalColor = (val: number | null) => {
    if (val === null) return '#ccc';
    if (val > -20) return '#5cb85c'; // Green
    if (val > -25) return '#f0ad4e'; // Yellow
    return '#d9534f'; // Red
  };

  const renderSignalBars = (val: number | null) => {
    const color = getSignalColor(val);
    return (
      <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
        <div style={{ width: '4px', height: '4px', backgroundColor: val !== null ? color : '#eee' }}></div>
        <div style={{ width: '4px', height: '7px', backgroundColor: val !== null && val > -27 ? color : '#eee' }}></div>
        <div style={{ width: '4px', height: '10px', backgroundColor: val !== null && val > -24 ? color : '#eee' }}></div>
        <div style={{ width: '4px', height: '14px', backgroundColor: val !== null && val > -20 ? color : '#eee' }}></div>
      </div>
    );
  };

  return (
    <div>
      <div className="panel panel-default" style={{ marginBottom: '20px', backgroundColor: '#fdfdfd' }}>
        <div className="panel-body">
          <div className="row">
            <div className="col-md-2">
              <label className="small text-muted">Search</label>
              <input 
                type="text" 
                className="form-control input-sm" 
                placeholder="SN, MAC, IP, name, address"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="small text-muted">OLT</label>
              <select className="form-control input-sm" value={filters.olt} onChange={e => setFilters({...filters, olt: e.target.value})}>
                <option>Any</option>
                {masterData.olts.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="col-md-1">
              <label className="small text-muted">Board</label>
              <select className="form-control input-sm" value={filters.board} onChange={e => setFilters({...filters, board: e.target.value})}>
                <option>Any</option>
              </select>
            </div>
            <div className="col-md-1">
              <label className="small text-muted">Port</label>
              <select className="form-control input-sm" value={filters.port} onChange={e => setFilters({...filters, port: e.target.value})}>
                <option>Any</option>
              </select>
            </div>
            <div className="col-md-1">
              <label className="small text-muted">Zone</label>
              <select className="form-control input-sm" value={filters.zone} onChange={e => setFilters({...filters, zone: e.target.value})}>
                <option>Any</option>
                {masterData.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="col-md-1">
              <label className="small text-muted">ODB</label>
              <select className="form-control input-sm" value={filters.odb} onChange={e => setFilters({...filters, odb: e.target.value})}>
                <option>Any</option>
                {masterData.odbs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="col-md-2" style={{ paddingTop: '22px' }}>
              <button className="btn btn-primary btn-sm" style={{ marginRight: '5px' }} onClick={handleRefresh}>
                <i className="fa fa-refresh"></i> Refresh
              </button>
              <button className="btn btn-primary btn-sm">
                <i className="fa fa-download"></i> Export
              </button>
            </div>
          </div>
          <div className="row" style={{ marginTop: '10px' }}>
            <div className="col-md-2">
              <label className="small text-muted">ONU type</label>
              <select className="form-control input-sm" value={filters.onuType} onChange={e => setFilters({...filters, onuType: e.target.value})}>
                <option>Any</option>
                {masterData.onuTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-md-1">
              <label className="small text-muted">PON type</label>
              <select className="form-control input-sm" value={filters.ponType} onChange={e => setFilters({...filters, ponType: e.target.value})}>
                <option>Any</option>
                <option>GPON</option>
                <option>EPON</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="small text-muted">Status</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button className={`btn btn-default btn-xs ${filters.status === 'Online' ? 'active' : ''}`} onClick={() => setFilters({...filters, status: 'Online'})}><i className="fa fa-globe text-success"></i></button>
                <button className={`btn btn-default btn-xs ${filters.status === 'Offline' ? 'active' : ''}`} onClick={() => setFilters({...filters, status: 'Offline'})}><i className="fa fa-times-circle text-danger"></i></button>
                <button className="btn btn-default btn-xs" onClick={() => setFilters({...filters, status: 'Any'})}>Clear</button>
              </div>
            </div>
            <div className="col-md-2">
              <label className="small text-muted">Signal</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button className="btn btn-default btn-xs" title="Good"><i className="fa fa-signal text-success"></i></button>
                <button className="btn btn-default btn-xs" title="Warning"><i className="fa fa-signal text-warning"></i></button>
                <button className="btn btn-default btn-xs" title="Critical"><i className="fa fa-signal text-danger"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-default">
        <div className="table-responsive">
          <table className="table table-hover" style={{ fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th>Status</th>
                <th>Signal</th>
                <th>Signal value</th>
                <th>Distance</th>
                <th>Name</th>
                <th>SN / MAC</th>
                <th>Zone</th>
                <th>ODB</th>
                <th>ONU</th>
                <th>Status changed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center"><i className="fa fa-spinner fa-spin"></i> Loading...</td></tr>
              ) : onus.length === 0 ? (
                <tr><td colSpan={10} className="text-center">No ONUs found.</td></tr>
              ) : onus.map(onu => (
                <tr key={onu.id}>
                  <td>
                    <i className={`fa ${onu.status === 'Online' ? 'fa-globe text-success' : 'fa-times-circle text-danger'}`}></i>
                  </td>
                  <td>{renderSignalBars(onu.signal)}</td>
                  <td style={{ color: getSignalColor(onu.signal), fontWeight: 'bold' }}>
                    {onu.signal ? `${onu.signal} dBm` : 'N/A'}
                  </td>
                  <td>{onu.distance || 'N/A'}</td>
                  <td><a href={`/onu/view/${onu.id}`} style={{ color: '#337ab7', fontWeight: 'bold' }}>{onu.name}</a></td>
                  <td><small className="text-muted">{onu.sn_mac}</small></td>
                  <td>{onu.zone?.name || '-'}</td>
                  <td>{onu.odb?.name || '-'}</td>
                  <td><small className="text-muted">{onu.pon_port}:{onu.onu_id}</small></td>
                  <td><small>{onu.last_online ? new Date(onu.last_online).toLocaleString() : '-'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
