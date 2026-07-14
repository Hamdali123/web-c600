"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const SearchableDropdown = ({ label, options, value, onChange, placeholder = "Any", width = "120px" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    (opt.label || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="form-group margin-right" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }} ref={dropdownRef}>
      {label && <label className="control-label" style={{ marginRight: '8px', fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>{label}</label>}
      <div 
        className="form-control" 
        style={{ width, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingRight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid #e0e0e0', borderRadius: '4px', height: '32px', padding: '5px 12px', fontSize: '14px', color: '#2c3e50', boxShadow: 'none' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
          {value === 'all' || value === '' ? placeholder : options.find((o:any) => o.value === String(value))?.label || placeholder}
        </span>
        <span className="caret" style={{ color: '#999', marginLeft: '5px' }}></span>
      </div>
      
      {isOpen && (
        <div style={{ position: 'absolute', minWidth: '180px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 1000, boxShadow: '0 6px 12px rgba(0,0,0,.175)', marginTop: '2px' }}>
          <div style={{ padding: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ paddingLeft: '28px', paddingRight: '28px', borderRadius: '3px', height: '32px', fontSize: '14px', color: '#2c3e50', border: '1px solid #eee' }}
              />
              <i className="fa fa-search" style={{ position: 'absolute', left: '10px', top: '10px', color: '#999', fontSize: '13px' }}></i>
              {searchTerm && (
                <i className="fa fa-times-circle" style={{ position: 'absolute', right: '10px', top: '10px', color: '#999', fontSize: '14px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}></i>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto', paddingBottom: '5px' }}>
            {filteredOptions.map((opt: any) => (
              <div 
                key={opt.value} 
                style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: value === opt.value ? '#34495e' : 'transparent', color: value === opt.value ? '#fff' : '#2c3e50', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as any).style.backgroundColor = '#f5f5f5'; }}
                onMouseLeave={e => { if (value !== opt.value) (e.currentTarget as any).style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={value === opt.value} readOnly style={{ marginRight: '8px', cursor: 'pointer', marginTop: 0 }} /> 
                  {opt.label}
                </div>
                {opt.count !== undefined && (
                  <span style={{ backgroundColor: value === opt.value ? '#95a5a6' : '#95a5a6', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                    {opt.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
    signal_status: searchParams.get('signal_status') || '',
    onu_mode: searchParams.get('onu_mode') || 'all',
    board: searchParams.get('board') || 'all',
    port: searchParams.get('port') || 'all',
    pon_type: searchParams.get('pon_type') || 'all',
    page: parseInt(searchParams.get('page') || '1')
  });
  
  const [totalOnus, setTotalOnus] = useState(0);
  
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [selectedOnus, setSelectedOnus] = useState<number[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
         if (val && val !== 'all') params.append(key, val as string);
       });

       const res = await fetch(`/api/onus/configured?${params.toString()}`);
       if (res.ok) {
         const json = await res.json();
         // Handle both old array response and new { data, total } response
         if (Array.isArray(json)) {
           setOnus(json);
           setTotalOnus(json.length);
         } else {
           setOnus(json.data || []);
           setTotalOnus(json.total || 0);
         }
       }
    } catch (e) {
       console.error(e);
    }
    setLoading(false);
  }, [filters]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOnus(onus.map(onu => onu.id));
    } else {
      setSelectedOnus([]);
    }
  };

  const handleSelectOnu = (id: number) => {
    setSelectedOnus(prev => 
      prev.includes(id) ? prev.filter(onuId => onuId !== id) : [...prev, id]
    );
  };

  const handleBatchAction = async (action: 'reboot' | 'enable' | 'disable' | 'delete') => {
    if (selectedOnus.length === 0) {
      alert("Please select at least one ONU first.");
      return;
    }
    
    if (!confirm(`Are you sure you want to ${action} ${selectedOnus.length} ONUs?`)) return;

    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/onus/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, onuIds: selectedOnus })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Batch ${action} process started successfully! Check Dashboard Activity Logs for results.`);
        setSelectedOnus([]);
        setShowBatchActions(false);
        fetchOnus();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (e) {
      alert("Network error occurred.");
    }
    setIsBatchProcessing(false);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert("File CSV kosong atau tidak valid.");
        return;
      }

      const headerLine = lines[0];
      const separator = headerLine.includes(';') ? ';' : ',';
      
      const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const nameIndex = headers.findIndex(h => h === 'name' || h === 'nama');
      const snIndex = headers.findIndex(h => h.includes('sn') || h.includes('mac'));

      if (nameIndex === -1 || snIndex === -1) {
        alert("File CSV harus memiliki kolom 'Name' dan 'SN / MAC'.");
        return;
      }

      const importedOnus = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length > Math.max(nameIndex, snIndex)) {
          importedOnus.push({
            name: cols[nameIndex],
            sn_mac: cols[snIndex]
          });
        }
      }

      if (importedOnus.length > 0) {
        const confirmMsg = `Ditemukan ${importedOnus.length} data. Lanjutkan import nama client?`;
        if (confirm(confirmMsg)) {
          try {
            const res = await fetch('/api/onus/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ onus: importedOnus })
            });
            const result = await res.json();
            if (result.success) {
              alert(`Sukses import nama untuk ${result.updated} client!`);
              fetchOnus(); 
            } else {
              alert("Gagal import: " + result.error);
            }
          } catch (error) {
            alert("Error: " + error);
          }
        }
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchMasterData();
    fetchOnus();
  }, [fetchMasterData, fetchOnus]);

  const getSignalColor = (val: number | null) => {
    if (val === null) return '#ccc';
    if (val <= -28) return '#d9534f'; // Red
    if (val <= -25) return '#f0ad4e'; // Yellow
    return '#5cb85c'; // Green
  };

  const renderSignalBars = (signal: number | null) => {
    if (signal === null) return <span className="text-muted">-</span>;
    const color = getSignalColor(signal);
    return (
      <div className="text-center" style={{ lineHeight: '1' }}>
        <i className="fa fa-signal" style={{ color: color, fontSize: '14px' }}></i>
        <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>{signal}</div>
        <div style={{ fontSize: '10px', color: '#999' }}>dBm</div>
      </div>
    );
  };

  const getStatusIcon = (status: string, reason: string | null) => {
    if (status === 'Offline') {
      const lowerReason = (reason || '').toLowerCase();
      if (lowerReason.includes('los')) return <i className="fa fa-chain-broken" style={{ color: '#dd4b39', fontSize: '18px' }} title="Loss of Signal"></i>;
      if (lowerReason.includes('power') || lowerReason.includes('dyinggasp')) return <i className="fa fa-plug" style={{ color: '#777', fontSize: '18px' }} title="Power Failed"></i>;
      return <i className="fa fa-globe" style={{ color: '#777', fontSize: '18px' }} title={reason ? `Offline (${reason})` : 'Offline'}></i>;
    }
    return <i className="fa fa-globe" style={{ color: '#00a65a', fontSize: '18px' }} title="Online"></i>;
  };

  return (
    <div className="container-fluid content-wrap configured-onu-container" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif", backgroundColor: '#ffffff', color: '#2c3e50', fontSize: '14px', padding: '0 15px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .configured-onu-container {
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        .configured-onu-container .table > tbody > tr > td {
          vertical-align: middle;
          padding: 8px 10px;
          color: #2c3e50;
          font-size: 14px;
        }
        .configured-onu-container .table > thead > tr > th {
          vertical-align: middle;
          padding: 10px 10px;
          color: #2c3e50;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }
        .configured-onu-container .form-group {
          margin-bottom: 15px !important;
        }
        .configured-onu-container .filters-row {
          padding-top: 10px;
          padding-bottom: 10px;
        }
      `}} />
      
      <form className="form-inline configured" onSubmit={(e) => { e.preventDefault(); fetchOnus(); }}>
        <div className="margin-bottom filters-row">
          <input type="hidden" id="olts_count" value="1"/>

          <div className="form-group margin-right" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }}>
            <label className="control-label" style={{ marginRight: '8px', fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>Search</label>
            <input type="text" className="form-control" placeholder="SN, IP, name, address" 
              style={{ width: '240px', display: 'inline-block', height: '32px', fontSize: '14px', padding: '5px 12px', color: '#2c3e50', border: '1px solid #e0e0e0', boxShadow: 'none' }}
              value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          
          <SearchableDropdown 
            label="OLT" 
            width="140px"
            options={[{value: 'all', label: 'Any'}, ...masterData.olts.map((o:any) => ({value: String(o.id), label: o.name}))]} 
            value={filters.olt} 
            onChange={(val: any) => setFilters({...filters, olt: val, page: 1})} 
          />

          <SearchableDropdown 
            label="Board" 
            width="80px"
            options={[{value: 'all', label: 'Any'}, ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(b => ({value: String(b), label: String(b)}))]} 
            value={filters.board} 
            onChange={(val: any) => setFilters({...filters, board: val, page: 1})} 
          />
          
          <SearchableDropdown 
            label="Port" 
            width="80px"
            options={[
              {value: 'all', label: 'Any'}, 
              ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(p => ({
                value: String(p), 
                label: String(p), 
                count: Math.floor(Math.random() * 50) + 1 
              }))
            ]} 
            value={filters.port} 
            onChange={(val: any) => setFilters({...filters, port: val, page: 1})} 
          />
          
          <SearchableDropdown 
            label="Zone" 
            width="100px"
            options={[{value: 'all', label: 'Any'}, ...masterData.zones.map((z:any) => ({value: String(z.id), label: z.name}))]} 
            value={filters.zone} 
            onChange={(val: any) => setFilters({...filters, zone: val, page: 1})} 
          />
          
          <SearchableDropdown 
            label="ODB" 
            width="100px"
            options={[{value: 'all', label: 'Any'}, ...masterData.odbs.map((o:any) => ({value: String(o.id), label: o.name}))]} 
            value={filters.odb} 
            onChange={(val: any) => setFilters({...filters, odb: val, page: 1})} 
          />

          <SearchableDropdown 
            label="VLAN" 
            width="100px"
            options={[{value: 'all', label: 'Any'}, ...masterData.vlans.map((v:any) => ({value: String(v.id), label: v.vlan}))]} 
            value={filters.vlan} 
            onChange={(val: any) => setFilters({...filters, vlan: val, page: 1})} 
          />
        </div>

        <div className="margin-bottom filters-row">
          <SearchableDropdown 
            label="ONU type" 
            width="110px"
            options={[{value: 'all', label: 'Any'}, ...masterData.onuTypes.map((t:any) => ({value: String(t.id), label: t.name}))]} 
            value={filters.onu_type} 
            onChange={(val: any) => setFilters({...filters, onu_type: val, page: 1})} 
          />

          <SearchableDropdown 
            label="Profile" 
            width="110px"
            options={[{value: 'all', label: 'Any'}, ...masterData.speedProfiles.map((p:any) => ({value: String(p.id), label: p.name}))]} 
            value={filters.profile} 
            onChange={(val: any) => setFilters({...filters, profile: val, page: 1})} 
          />

          <SearchableDropdown 
            label="PON type" 
            width="110px"
            options={[
              {value: 'all', label: 'Any'},
              {value: 'GPON', label: 'GPON'},
              {value: 'EPON', label: 'EPON'},
              {value: 'XG-PON', label: 'XG-PON'},
              {value: 'XGS-PON', label: 'XGS-PON'}
            ]} 
            value={filters.pon_type} 
            onChange={(val: any) => setFilters({...filters, pon_type: val, page: 1})} 
          />

          <div className="form-group pon-type-filter margin-right" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }}>
            <label className="control-label" style={{ marginRight: '8px', fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>Status </label>
            <div className="btn-group">
              <button type="button" className={`btn btn-default ${filters.status === 'Online' && !filters.signal_status ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, status: 'Online', reason: '', signal_status: ''})} title="Online"><i className="fa fa-globe" style={{ color: '#00a65a', fontSize: '18px' }}></i></button>
              <button type="button" className={`btn btn-default ${filters.reason === 'Power Failed' ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, status: 'Offline', reason: 'Power Failed', signal_status: ''})} title="Power Fail"><i className="fa fa-plug" style={{ color: '#777', fontSize: '18px' }}></i></button>
              <button type="button" className={`btn btn-default ${filters.reason === 'LOS' ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, status: 'Offline', reason: 'LOS', signal_status: ''})} title="Loss of Signal"><i className="fa fa-chain-broken" style={{ color: '#dd4b39', fontSize: '18px' }}></i></button>
              <button type="button" className={`btn btn-default ${filters.status === 'Offline' && !filters.reason ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, status: 'Offline', reason: '', signal_status: ''})} title="Offline"><i className="fa fa-globe" style={{ color: '#777', fontSize: '18px' }}></i></button>
              <button type="button" className="btn btn-default" style={{ height: '32px', padding: '5px 12px' }} title="Admin Disabled"><i className="fa fa-ban" style={{ color: '#777', fontSize: '18px' }}></i></button>
            </div>
          </div>
          
          <div className="form-group pon-type-filter margin-right" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }}>
            <label className="control-label" style={{ marginRight: '8px', fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>Signal </label>
            <div className="btn-group">
              <button type="button" className={`btn btn-default ${filters.signal_status === 'good' ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, signal_status: filters.signal_status === 'good' ? '' : 'good', status: 'Online', reason: ''})} title="Good"><i className="fa fa-signal" style={{ color: '#00a65a', fontSize: '18px' }}></i></button>
              <button type="button" className={`btn btn-default ${filters.signal_status === 'warning' ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, signal_status: filters.signal_status === 'warning' ? '' : 'warning', status: 'Online', reason: ''})} title="Warning"><i className="fa fa-signal" style={{ color: '#f39c12', fontSize: '18px' }}></i></button>
              <button type="button" className={`btn btn-default ${filters.signal_status === 'critical' ? 'active' : ''}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setFilters({...filters, signal_status: filters.signal_status === 'critical' ? '' : 'critical', status: 'Online', reason: ''})} title="Critical"><i className="fa fa-signal" style={{ color: '#dd4b39', fontSize: '18px' }}></i></button>
            </div>
          </div>
          
          <div className="form-group pon-type-filter margin-right" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '15px' }}>
            <div className="btn-group">
              <button type="button" className={`btn btn-default ${filters.onu_mode === 'bridging' ? 'active' : ''}`} onClick={() => setFilters({...filters, onu_mode: filters.onu_mode === 'bridging' ? 'all' : 'bridging', page: 1})} style={{ height: '32px', padding: '5px 12px', color: '#337ab7', fontWeight: 'bold', fontSize: '14px' }} title="Bridging">B</button>
              <button type="button" className={`btn btn-default ${filters.onu_mode === 'routing' ? 'active' : ''}`} onClick={() => setFilters({...filters, onu_mode: filters.onu_mode === 'routing' ? 'all' : 'routing', page: 1})} style={{ height: '32px', padding: '5px 12px', color: '#337ab7', fontWeight: 'bold', fontSize: '14px' }} title="Routing">R</button>
            </div>
          </div>
          
          <div className="form-group pon-type-filter" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <div className="btn-group">
              <button type="button" className={`btn ${showBatchActions ? 'btn-primary' : 'btn-default'}`} style={{ height: '32px', padding: '5px 12px' }} onClick={() => setShowBatchActions(!showBatchActions)} title="Batch actions">
                <i className="fa fa-server" style={{ color: showBatchActions ? '#fff' : '#337ab7', fontSize: '18px' }}></i>
              </button>
            </div>
          </div>
        </div>

        <div className="margin-bottom" style={{ position: 'relative', textAlign: 'center' }}>
          <a onClick={() => setShowMoreFilters(!showMoreFilters)} style={{ cursor: 'pointer', color: '#337ab7', fontSize: '13px' }}>
            <i className={showMoreFilters ? "fa fa-chevron-up" : "fa fa-chevron-down"}></i> {showMoreFilters ? 'Less filters' : 'More filters'}
          </a>
          
          <div style={{ position: 'absolute', right: '0px', top: '0', display: 'inline-block' }}>
            <label style={{ fontSize: '13px', cursor: 'pointer', color: '#337ab7', margin: 0, fontWeight: 'normal' }}>
              Import
              <input type="file" style={{ display: 'none' }} accept=".csv" onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  alert('Fitur upload CSV sedang diproses, nantikan updatenya!');
                }
              }} />
            </label>
            <span style={{ color: '#337ab7', fontSize: '13px', margin: '0 5px' }}>/</span>
            <a href="/api/onus/export" target="_blank" style={{ fontSize: '13px', color: '#337ab7', cursor: 'pointer', textDecoration: 'none' }}>Export</a>
          </div>
        </div>

        {showMoreFilters && (
          <div className="more-filters-panel" style={{ backgroundColor: '#f9f9f9', border: '1px solid #e3e3e3', padding: '15px 15px 5px 15px', borderRadius: '4px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '10px' }}>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Mgmt IP</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">TR-069</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">VoIP</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">CATV</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">WAN mode</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Configuration method</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">WAN IP protocol</label>
                <select className="form-control"><option>Any</option></select>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Download</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Upload</label>
                <select className="form-control"><option>Any</option></select>
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Status changed before</label>
                <input type="text" className="form-control" />
              </div>
              <div className="form-group" style={{ width: '13%' }}>
                <label className="control-label">Resync failed</label>
                <select className="form-control"><option>Any</option></select>
              </div>
            </div>

            <div className="text-right" style={{ marginTop: '10px' }}>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImportCsv} 
              />
              <a href="#" className="btn btn-link" title="Export" style={{ padding: '0 10px', fontSize: '13px' }}>
                <i className="fa fa-upload"></i> Export
              </a>
              <a href="#" className="btn btn-link" title="Import" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} style={{ padding: '0 10px', fontSize: '13px' }}>
                <i className="fa fa-download"></i> Import
              </a>
            </div>
          </div>
        )}
      </form>
      
      {showBatchActions && (
        <div className="margin-top" id="batch-actions-container">
          <div className="panel-group" id="accordion_batch_actions">
              <div className="panel panel-default">
                  <div className="panel-heading">
                      <h4 className="panel-title">
                          <strong>
                              <a className="accordion-toggle btn-block">
                                  <i className="fa fa-tasks text-success"></i> Batch actions
                              </a>
                          </strong>
                      </h4>
                  </div>
                  <div className="panel-collapse collapse in">
                      <div className="panel-body">
                          <p className="margin-bottom clearfix">
                              <a href="/tasks" className="btn btn-success pull-right"><i className="fa fa-history"></i> Task history</a>
                              <span className="batch-actions-info-copy">
                                  <i className="fa fa-info-circle"></i>
                                  <span>Select ONUs using the filters above, then choose an action to perform on all matching ONUs.</span>
                              </span>
                          </p>
                          <div className="batch-actions-list">
                              <a href="#" onClick={(e) => { e.preventDefault(); handleBatchAction('reboot'); }} className="batch-action-link batch-action-btn" style={{ pointerEvents: isBatchProcessing ? 'none' : 'auto', opacity: isBatchProcessing ? 0.5 : 1 }}>
                                <i className="fa fa-power-off fa-fw text-success"></i> {isBatchProcessing ? 'Processing...' : 'Reboot ONUs'}
                              </a>
                              <a href="#" onClick={(e) => { e.preventDefault(); handleBatchAction('enable'); }} className="batch-action-link batch-action-btn" style={{ pointerEvents: isBatchProcessing ? 'none' : 'auto', opacity: isBatchProcessing ? 0.5 : 1 }}>
                                <i className="fa fa-check-circle fa-fw text-success"></i> Enable ONUs
                              </a>
                              <a href="#" onClick={(e) => { e.preventDefault(); handleBatchAction('disable'); }} className="batch-action-link batch-action-btn" style={{ pointerEvents: isBatchProcessing ? 'none' : 'auto', opacity: isBatchProcessing ? 0.5 : 1 }}>
                                <i className="fa fa-ban fa-fw text-warning"></i> Disable ONUs
                              </a>
                              <a href="#" onClick={(e) => { e.preventDefault(); handleBatchAction('delete'); }} className="batch-action-link batch-action-btn" style={{ pointerEvents: isBatchProcessing ? 'none' : 'auto', opacity: isBatchProcessing ? 0.5 : 1 }}>
                                <i className="fa fa-trash fa-fw text-danger"></i> Delete ONUs
                              </a>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>
      )}

      <div id="onu_configured_list" className="h-75 margin-top">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 10px' }}>
          <div>
            <ul className="pagination" style={{ margin: 0 }}>
              <li className={filters.page === 1 ? 'disabled' : ''}>
                <a href="#" style={{ color: '#337ab7' }} onClick={(e) => { e.preventDefault(); if (filters.page > 1) setFilters({...filters, page: filters.page - 1}); }}>&lt;</a>
              </li>
              {[...Array(Math.max(1, Math.ceil(totalOnus / 100)))].map((_, i) => (
                <li key={i} className={filters.page === i + 1 ? 'active' : ''}>
                  <a href="#" 
                    style={filters.page === i + 1 ? { backgroundColor: '#f4f4f4', color: '#444', borderColor: '#ddd' } : { color: '#337ab7' }}
                    onClick={(e) => { e.preventDefault(); setFilters({...filters, page: i + 1}); }}>{i + 1}</a>
                </li>
              ))}
              <li className={filters.page >= Math.ceil(totalOnus / 100) ? 'disabled' : ''}>
                <a href="#" style={{ color: '#337ab7' }} onClick={(e) => { e.preventDefault(); if (filters.page < Math.ceil(totalOnus / 100)) setFilters({...filters, page: filters.page + 1}); }}>&gt;</a>
              </li>
            </ul>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
            {totalOnus > 0 ? `${(filters.page - 1) * 100 + 1}-${Math.min(filters.page * 100, totalOnus)} ONUs of ${totalOnus} displayed` : '0 ONUs displayed'}
          </div>
        </div>

        <div className="row" style={{ backgroundColor: '#fff', margin: 0 }}>
          <table className="table table-striped table-hover" style={{ width: '100%', borderTop: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff' }}>
                {showBatchActions && (
                  <th className="batch-onu-select-col text-center" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                    <input 
                      type="checkbox" 
                      title="Select All" 
                      onChange={handleSelectAll}
                      checked={onus.length > 0 && selectedOnus.length === onus.length}
                    />
                  </th>
                )}
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap' }}>Status</th>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap' }}>View</th>
                <th>Name</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>SN / MAC</th>
                <th style={{ minWidth: '160px' }}>ONU</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Zone</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>ODB</th>
                <th className="text-center" style={{ width: '1%', whiteSpace: 'nowrap' }}>Signal</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>B/R</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>VLAN</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>VoIP</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>TV</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Type</th>
                <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Auth date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} style={{ padding: '60px', textAlign: 'center' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
              ) : onus.length === 0 ? (
                <tr><td colSpan={15} style={{ padding: '60px', textAlign: 'center', color: '#999' }}>No ONUs match your search criteria.</td></tr>
              ) : onus.map(onu => (
                <tr key={onu.id}>
                  {showBatchActions && (
                    <td className="batch-onu-select-col text-center" style={{ verticalAlign: 'middle' }}>
                      <input 
                        type="checkbox" 
                        className="batch-onu-checkbox" 
                        value={onu.id} 
                        checked={selectedOnus.includes(onu.id)}
                        onChange={() => handleSelectOnu(onu.id)}
                      />
                    </td>
                  )}
                  <td className="text-center">
                    {getStatusIcon(onu.status, onu.offline_reason)}
                  </td>
                  <td className="text-center">
                    <Link href={`/onu/view/${onu.id}`} className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '4px', backgroundColor: '#3c8dbc', borderColor: '#367fa9' }}>View</Link>
                  </td>
                  <td>{onu.name}</td>
                  <td>{onu.sn_mac}</td>
                  <td>
                    <div style={{ marginBottom: '2px', wordWrap: 'break-word', wordBreak: 'break-word', maxWidth: '85px', lineHeight: '1.4' }}>{onu.olt ? `${onu.olt.id} - ${onu.olt.name}` : '---'}</div>
                    <div style={{ wordWrap: 'break-word', wordBreak: 'break-word', maxWidth: '85px', lineHeight: '1.4' }}>{onu.pon_port ? onu.pon_port.replace('gpon-olt_', 'gpon_onu-') : ''}:{onu.onu_id}</div>
                  </td>
                  <td>{onu.zone?.name || 'Zone 1'}</td>
                  <td>{onu.odb?.name || 'None'}</td>
                  <td className="text-center">
                    {renderSignalBars(onu.signal)}
                  </td>
                  <td>
                    {onu.mode === 'route' ? (
                      <span className="label" style={{ backgroundColor: '#2f5572', display: 'inline-block', fontSize: '12px', padding: '3px 6px', color: '#fff', borderRadius: '3px' }}>Router</span>
                    ) : (
                      <span className="label" style={{ backgroundColor: '#95a5a6', display: 'inline-block', fontSize: '12px', padding: '3px 6px', color: '#fff', borderRadius: '3px' }}>Bridge</span>
                    )}
                  </td>
                  <td>{onu.vlan || '125'}</td>
                  <td></td>
                  <td></td>
                  <td>{onu.type || 'ALL'}</td>
                  <td className="auth-date">
                    {new Date(onu.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }).replace(/\//g, '-')}-<br/>
                    {new Date(onu.createdAt).getFullYear()}
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

export default function ConfiguredOnuPage() {
  return (
    <Suspense fallback={<div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>}>
      <ConfiguredOnuContent />
    </Suspense>
  );
}
