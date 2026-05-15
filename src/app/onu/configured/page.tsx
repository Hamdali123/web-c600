"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ConfiguredOnuContent() {
  const searchParams = useSearchParams();
  const [onus, setOnus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>({
    olts: [],
    zones: [],
    odbs: [],
    onuTypes: [],
    speedProfiles: [],
    vlans: []
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    olt: searchParams.get('olt') || 'all',
    zone: searchParams.get('zone') || 'all',
    odb: searchParams.get('odb') || 'all',
    vlan: searchParams.get('vlan') || 'all',
    onu_type: searchParams.get('onu_type') || 'all',
    profile: searchParams.get('profile') || 'all',
    status: searchParams.get('status') || '',
    reason: searchParams.get('reason') || '',
    signal_low: searchParams.get('signal_low') === 'true'
  });

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master');
      if (res.ok) {
        const data = await res.json();
        setMasterData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchOnus = useCallback(async () => {
    setLoading(true);
    try {
       const params = new URLSearchParams();
       Object.entries(filters).forEach(([key, val]) => {
         if (val && val !== 'all') params.append(key, val);
       });

       const res = await fetch(`/api/onus/configured?${params.toString()}`);
       if (res.ok) {
         const data = await res.json();
         setOnus(Array.isArray(data) ? data : []);
       }
    } catch (e) {
       console.error(e);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchMasterData();
    fetchOnus();
  }, [fetchMasterData, fetchOnus]);

  const renderSignalBars = (signal: number | null) => {
    if (signal === null) return <i className="fa fa-signal text-muted" style={{ opacity: 0.3 }}></i>;
    const color = signal > -25 ? '#5cb85c' : signal > -28 ? '#f0ad4e' : '#d9534f';
    return (
      <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
        <div style={{ width: '3px', height: '4px', backgroundColor: color }}></div>
        <div style={{ width: '3px', height: '7px', backgroundColor: signal > -30 ? color : '#eee' }}></div>
        <div style={{ width: '3px', height: '10px', backgroundColor: signal > -27 ? color : '#eee' }}></div>
        <div style={{ width: '3px', height: '13px', backgroundColor: signal > -25 ? color : '#eee' }}></div>
      </div>
    );
  };
  return (
    <div style={{ backgroundColor: '#fff', padding: '15px', minHeight: '100vh', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
         <h3 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Configured ONUs</h3>
         <div style={{ fontSize: '13px' }}>
            <Link href="/" style={{ color: '#337ab7' }}>Dashboard</Link> / <span style={{ color: '#777' }}>Configured ONUs</span>
         </div>
      </div>

      {/* Filter Bar */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
          <div className="filter-group">
            <label>Search</label>
            <input type="text" placeholder="SN, IP, name, address, ph" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} style={{ width: '180px' }} />
          </div>

          <div className="filter-group">
            <label>OLT</label>
            <select value={filters.olt} onChange={e => setFilters({...filters, olt: e.target.value})}>
               <option value="all">Any</option>
               {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <div className="icon-btns">
              <button className={filters.status === 'Online' && !filters.signal_low ? 'active' : ''} onClick={() => setFilters({...filters, status: 'Online', reason: '', signal_low: false})}><i className="fa fa-globe" style={{ color: '#5cb85c' }}></i></button>
              <button><i className="fa fa-plug" style={{ color: '#777' }}></i></button>
              <button className={filters.reason === 'LOS' ? 'active' : ''} onClick={() => setFilters({...filters, status: 'Offline', reason: 'LOS', signal_low: false})}><i className="fa fa-times-circle" style={{ color: '#d9534f' }}></i></button>
              <button><i className="fa fa-clock-o" style={{ color: '#777' }}></i></button>
              <button><i className="fa fa-ban" style={{ color: '#777' }}></i></button>
            </div>
          </div>

          <div className="filter-group">
            <label>Signal</label>
            <div className="icon-btns">
              <button className={!filters.signal_low ? 'active' : ''} onClick={() => setFilters({...filters, signal_low: false})}><i className="fa fa-signal" style={{ color: '#5cb85c' }}></i></button>
              <button><i className="fa fa-signal" style={{ color: '#f0ad4e' }}></i></button>
              <button className={filters.signal_low ? 'active' : ''} onClick={() => setFilters({...filters, status: 'Online', signal_low: true, reason: ''})}><i className="fa fa-signal" style={{ color: '#d9534f' }}></i></button>
            </div>
          </div>

          <div className="filter-group">
            <div className="icon-btns">
              <button>B</button>
              <button>R</button>
            </div>
          </div>

          <button className="btn-refresh" onClick={fetchOnus}><i className="fa fa-bars"></i></button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#337ab7', cursor: 'pointer' }}>
           <i className="fa fa-chevron-down"></i> More filters
        </div>
      </div>

      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div className="pagination-mock">
            <span>1</span> <span>2</span> <span>3</span> <span className="next-btn">{`>`}</span>
         </div>
         <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
            Displaying {onus.length} ONUs
         </div>
      </div>

      {/* Table Section */}
      <div className="table-responsive" style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table table-striped table-hover" style={{ marginBottom: 0, fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <tr>
              <th className="text-center">Status</th>
              <th className="text-center">View</th>
              <th>Name</th>
              <th>SN / MAC</th>
              <th>ONU</th>
              <th>Zone</th>
              <th>ODB</th>
              <th className="text-center">Signal</th>
              <th className="text-center">B/R</th>
              <th>VLAN</th>
              <th className="text-center">VoIP</th>
              <th className="text-center">TV</th>
              <th>Type</th>
              <th>Auth date</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} style={{ padding: '60px', textAlign: 'center' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
            ) : onus.length === 0 ? (
              <tr><td colSpan={15} style={{ padding: '60px', textAlign: 'center', color: '#999' }}>No configured ONUs found.</td></tr>
            ) : onus.map(onu => (
              <tr key={onu.id}>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>
                  <i className={`fa fa-globe ${onu.status === 'Online' ? 'text-success' : 'text-danger'}`} style={{ fontSize: '16px' }}></i>
                </td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>
                  <Link href={`/onu/view/${onu.id}`} className="btn btn-primary btn-xs" style={{ padding: '2px 10px', fontWeight: 'bold' }}>View</Link>
                </td>
                <td style={{ verticalAlign: 'middle', fontWeight: '500' }}>
                   <Link href={`/onu/view/${onu.id}`} style={{ color: '#337ab7', textDecoration: 'none' }}>{onu.name}</Link>
                </td>
                <td style={{ verticalAlign: 'middle', fontSize: '12px', color: '#666' }}>{onu.sn_mac}</td>
                <td style={{ verticalAlign: 'middle', fontSize: '11px', color: '#444', lineHeight: '1.2' }}>
                  <span style={{ fontWeight: 'bold' }}>2 - C600-SANWANI</span><br/>
                  {onu.pon_port}:{onu.onu_id}
                </td>
                <td style={{ verticalAlign: 'middle' }}>{onu.zone?.name || '---'}</td>
                <td style={{ verticalAlign: 'middle' }}>{onu.odb?.name || 'None'}</td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {renderSignalBars(onu.signal)}
                      <span style={{ fontSize: '10px', marginTop: '2px', color: onu.signal < -27 ? '#d9534f' : '#777' }}>{onu.signal} dBm</span>
                   </div>
                </td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>
                  <span className={`label ${onu.mode === 'route' ? 'label-inverse' : 'label-default'}`} style={{ fontSize: '10px', backgroundColor: '#2d4154' }}>
                     {onu.mode === 'route' ? 'Router' : 'Bridge'}
                  </span>
                </td>
                <td style={{ verticalAlign: 'middle' }}>{onu.vlan}</td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>---</td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>---</td>
                <td style={{ verticalAlign: 'middle', fontSize: '11px' }}>{onu.profile?.name || 'DEFAULT'}</td>
                <td style={{ verticalAlign: 'middle', fontSize: '11px', color: '#888' }}>
                   {new Date(onu.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                </td>
                <td className="text-center" style={{ verticalAlign: 'middle' }}>
                   <div className="btn-group">
                      <button className="btn btn-default btn-xs" title="Edit"><i className="fa fa-pencil"></i></button>
                      <button className="btn btn-default btn-xs text-danger" title="Delete"><i className="fa fa-trash"></i></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-group label {
          font-weight: bold;
          margin: 0;
          font-size: 13px;
          color: #555;
        }
        .filter-group input, .filter-group select {
          padding: 5px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 13px;
          height: 32px;
          outline: none;
        }
        .filter-group input:focus, .filter-group select:focus {
          border-color: #337ab7;
        }
        .icon-btns {
          display: flex;
          border: 1px solid #ccc;
          border-radius: 4px;
          overflow: hidden;
        }
        .icon-btns button {
          background: #fff;
          border: none;
          border-right: 1px solid #eee;
          padding: 4px 12px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }
        .icon-btns button:hover {
          background: #f8f8f8;
        }
        .icon-btns button.active {
          background: #e6e6e6;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn-refresh {
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 5px 15px;
          color: #337ab7;
          cursor: pointer;
        }
        .btn-refresh:hover {
          background: #f8f8f8;
        }
        .pagination-mock span {
          padding: 6px 12px;
          border: 1px solid #ddd;
          background: #fff;
          margin-right: -1px;
          cursor: pointer;
          font-size: 13px;
          color: #337ab7;
        }
        .pagination-mock span:first-child {
          border-radius: 4px 0 0 4px;
          background: #f5f5f5;
          color: #333;
          font-weight: bold;
        }
        .pagination-mock span.next-btn {
          border-radius: 0 4px 4px 0;
        }
        .label-inverse {
          background-color: #2d4154;
          color: #fff;
        }
      `}</style>
    </div>
  );
}

export default function ConfiguredOnuPage() {
  return (
    <Suspense fallback={<div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>}>
      <ConfiguredOnuContent />
    </Suspense>
  );
}
