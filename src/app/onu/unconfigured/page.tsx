"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';

function UnconfiguredOnuContent() {
  const [unconfigured, setUnconfigured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [masterData, setMasterData] = useState<any>({
    olts: [],
    zones: [],
    odbs: [],
    onuTypes: [],
    speedProfiles: [],
    presets: [],
    vlans: []
  });

  const [oltSelection, setOltSelection] = useState<string>(''); // empty by default until loaded
  const [ponPorts, setPonPorts] = useState<any[]>([]);
  const [ponSelection, setPonSelection] = useState<string>('0');
  
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [selectedOnu, setSelectedOnu] = useState<any>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());
  const [scanSecondsAgo, setScanSecondsAgo] = useState<number>(0);
  const [formData, setFormData] = useState({ 
    name: '', 
    vlan: '', 
    mode: 'route',
    pppoeUser: '',
    pppoePass: '',
    onuTypeId: '',
    zoneId: '',
    odbId: '',
    profileId: '',
    presetId: '',
    contact: '',
    notes: '',
    wan_mode: 'PPPoE'
  });

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      const presetRes = await fetch('/api/settings/auth-presets');
      const presetData = await presetRes.json();
      setMasterData({ ...data, presets: presetData });
      
      // Auto-select first OLT if not set or if current selection doesn't exist
      if (data.olts && data.olts.length > 0) {
        setOltSelection(prev => {
          if (!prev || prev === '0' || prev === '2') {
             return String(data.olts[0].id);
          }
          return prev;
        });
      }
    } catch (e) {}
  }, []);

  const fetchUnconfigured = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
       const params = new URLSearchParams();
       if (oltSelection && oltSelection !== '0') params.append('olt_id', oltSelection);
       if (ponSelection && ponSelection !== '0') params.append('pon', ponSelection);
       const res = await fetch('/api/onus/unconfigured?' + params.toString());
       const data = await res.json();
       setUnconfigured(Array.isArray(data) ? data : []);
       setLastScanTime(Date.now());
       setScanSecondsAgo(0);
    } catch (err) {} finally {
       if (!silent) setLoading(false);
    }
  }, [oltSelection, ponSelection]);

  const fetchPonPortsForOlt = useCallback(async (oltId: string) => {
    if (!oltId || oltId === '0') {
      setPonPorts([]);
      return;
    }
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/pon-ports`);
      const data = await res.json();
      if (!data.error) setPonPorts(data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchPonPortsForOlt(oltSelection);
  }, [oltSelection, fetchPonPortsForOlt]);

  useEffect(() => {
    fetchMasterData();
    fetchUnconfigured();
  }, [fetchMasterData, fetchUnconfigured]);

  useEffect(() => {
    const timer = setInterval(() => {
      setScanSecondsAgo(Math.floor((Date.now() - lastScanTime) / 1000));
      if (Date.now() - lastScanTime >= 15000 && !showAuthorizeModal) {
         fetchUnconfigured(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastScanTime, fetchUnconfigured, showAuthorizeModal]);

  const handleSubmit = async (e: any) => {
     e.preventDefault();
     try {
       const res = await fetch('/api/onus/create', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           sn: selectedOnu.sn_mac,
           oltId: selectedOnu.olt_id,
           portInfo: selectedOnu.pon_port,
           onu_id: selectedOnu.onu_id,
           isOffline: false,
           ...formData
         })
       });
       
       const data = await res.json();
       if (data.success) {
         setShowAuthorizeModal(false);
         fetchUnconfigured();
       } else {
         alert('Failed: ' + data.error);
       }
     } catch (err) { alert('Server error!'); }
  };

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
      <div className="text-center" style={{ lineHeight: '1.2' }}>
        <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '14px', marginBottom: '2px' }}>
          <div style={{ width: '4px', height: '4px', backgroundColor: color }}></div>
          <div style={{ width: '4px', height: '7px', backgroundColor: signal > -28 ? color : '#eee' }}></div>
          <div style={{ width: '4px', height: '10px', backgroundColor: signal > -25 ? color : '#eee' }}></div>
          <div style={{ width: '4px', height: '14px', backgroundColor: signal > -20 ? color : '#eee' }}></div>
        </div>
        <div style={{ fontSize: '11px', color: '#999' }}>{signal}<br/><span style={{fontSize: '9px'}}>dBm</span></div>
      </div>
    );
  };

  return (
    <div className="container-fluid content-wrap" id="unconfigured_div">
      
      <form className="form-inline unconfigured" onSubmit={(e) => { e.preventDefault(); fetchUnconfigured(); }}>
        <div className="margin-bottom" style={{ marginBottom: '15px' }}>
          <div className="form-group">
            <label className="control-label" htmlFor="olt" style={{ marginRight: '5px' }}><strong>OLT</strong></label>
            <select id="olt" name="olt_id" className="form-control input-220 select-search text-nowrap" 
              style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,.075)' }}
              value={oltSelection} onChange={e => setOltSelection(e.target.value)}>
              {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
            </select>
          </div>
            <div id="pon-wrapper" className="form-group margin-left" style={{ marginLeft: '15px' }}>
                <label className="control-label" htmlFor="pon" style={{ marginRight: '5px' }}><strong>PON</strong></label>
                <select name="pon" id="pon" className="form-control input-150 select-search text-nowrap"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,.075)' }}
                  value={ponSelection} onChange={e => setPonSelection(e.target.value)}>
                  <option value="0">Any</option>
                  {ponPorts.map(p => (
                    <option key={p.name} value={p.value || p.name}>{p.name}</option>
                  ))}
                </select>
            </div>
            <div className="form-group margin-left" style={{ marginLeft: '15px' }}>
              <a onClick={(e) => { e.preventDefault(); fetchUnconfigured(); }} className="btn btn-success get-unconfigured" style={{ fontWeight: 600, boxShadow: '0 2px 4px rgba(40,167,69,0.3)', transition: 'all 0.2s' }}>Refresh
                {loading && <i className="fa fa-spinner fa-spin margin-left" style={{ marginLeft: '5px' }}></i>}
              </a>
            </div>
        </div>

        <div className="margin-top" style={{ marginTop: '20px' }}>
          <div className="panel-group" id="accordion_tasks">
              <div className="panel panel-default" style={{ backgroundColor: '#fcfcfc', border: '1px solid #e7eaec', boxShadow: '0 3px 8px rgba(0,0,0,0.06)', borderRadius: '4px' }}>
                  <div className="panel-heading" style={{ padding: '12px 15px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #e7eaec', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
                      <h4 className="panel-title">
                          <a className="accordion-toggle collapsed btn-block" data-toggle="collapse" data-parent="#accordion_tasks" href="#tasksList" aria-expanded="true" style={{ color: '#333', textDecoration: 'none', fontWeight: 600 }}>
                              Auto actions <i className="fa fa-chevron-right pull-right" style={{marginTop: '2px', color: '#888'}}></i>
                          </a>
                      </h4>
                  </div>
                  <div id="tasksList" className="panel-collapse collapse in">
                      <div className="panel-body" style={{ backgroundColor: '#fff', padding: '15px' }}>
                          <div className="tasks-buttons-container clearfix">
                              <button className="btn btn-primary task-btn" id="auto-actions" style={{ marginRight: '8px', boxShadow: '0 2px 4px rgba(51,122,183,0.3)' }}>Configure actions</button>
                              <a href="/reports/tasks" className="btn btn-primary task-btn" style={{ boxShadow: '0 2px 4px rgba(51,122,183,0.3)' }}><i className="fa fa-history"></i> Task history</a>
                              <button className="btn btn-danger task-btn task-btn-stop pull-right" id="stop-auto-actions" disabled style={{ opacity: 0.7, boxShadow: '0 2px 4px rgba(217,83,79,0.2)' }}>Stop auto actions</button>
                          </div>
                          <div id="active-tasks-container">
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        <div id="gpon_epon_unconfigured" style={{minHeight: '10vh', marginTop: '25px'}}>
          {loading && unconfigured.length === 0 ? (
             <div className="text-center margin-top-lg" id="gpon_epon_unconfigured_loading" style={{ marginTop: '30px' }}>
               <i className="fa fa-4x fa-spinner fa-spin text-blue" style={{ color: '#337ab7' }}></i>
               <h3 className="text-center" style={{ fontWeight: 600 }}>Scanning OLTs for Unconfigured ONUs</h3>
             </div>
          ) : unconfigured.length === 0 ? (
             <div className="margin-top" style={{ marginTop: '20px' }}>
               <div style={{fontSize: '17px', color: '#333', fontWeight: 600}}>
                 {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.id || ''} - {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.name || 'All OLTs'} &nbsp;
                 <i className="fa fa-refresh text-primary" style={{cursor: 'pointer', color: '#337ab7'}} onClick={() => fetchUnconfigured()}></i>
               </div>
               <div className="small text-muted margin-bottom" style={{color: '#999', marginTop: '2px', marginBottom: '15px'}}>Last scan: {scanSecondsAgo} seconds ago</div>
               <div style={{fontSize: '16px', color: '#333', marginBottom: '30px'}}>No unconfigured ONUs found</div>
             </div>
          ) : (
            <div className="margin-top" style={{ marginTop: '20px' }}>
               <div style={{fontSize: '17px', color: '#333', fontWeight: 600}}>
                 {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.id || ''} - {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.name || 'All OLTs'} &nbsp;
                 <i className="fa fa-refresh text-primary" style={{cursor: 'pointer', color: '#337ab7'}} onClick={() => fetchUnconfigured()}></i>
               </div>
               <div className="small text-muted margin-bottom" style={{color: '#999', marginTop: '2px', marginBottom: '15px'}}>Last scan: {scanSecondsAgo} seconds ago</div>
              <div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e7eaec' }}>
                <table className="table table-striped table-hover" style={{ margin: 0, backgroundColor: '#fff' }}>
                  <thead style={{ backgroundColor: '#fcfcfc' }}>
                    <tr>
                      <th style={{ borderBottom: '1px solid #e7eaec' }}>SN / MAC</th>
                      <th style={{ borderBottom: '1px solid #e7eaec' }}>Model</th>
                      <th className="text-center" style={{ borderBottom: '1px solid #e7eaec' }}>Signal</th>
                      <th style={{ borderBottom: '1px solid #e7eaec' }}>OLT</th>
                      <th style={{ borderBottom: '1px solid #e7eaec' }}>Details</th>
                      <th className="text-right" style={{ borderBottom: '1px solid #e7eaec' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unconfigured.map((onu: any) => (
                      <tr key={onu.sn_mac}>
                         <td><strong>{onu.sn_mac}</strong></td>
                         <td>{onu.onu_type || 'Unknown'}</td>
                         <td className="text-center">
                            {renderSignalBars(onu.signal || null)}
                         </td>
                         <td>
                             <strong>{onu.olt ? `${onu.olt.id} - ${onu.olt.name}` : onu.olt_id}</strong>
                         </td>
                         <td className="small text-muted">
                            Board: {onu.pon_port?.match(/(\d+)\/(\d+)\/(\d+)/)?.[2] || 'N/A'} / Port: {onu.pon_port?.match(/(\d+)\/(\d+)\/(\d+)/)?.[3] || 'N/A'}<br/>
                            ID: {onu.onu_id || 'Auto'}
                         </td>
                         <td className="text-right">
                            <button 
                              type="button"
                              className="btn btn-primary btn-sm" 
                              onClick={() => { setSelectedOnu(onu); setShowAuthorizeModal(true); }}
                              style={{ boxShadow: '0 2px 4px rgba(51,122,183,0.3)', fontWeight: 500 }}
                            >
                               Authorize
                            </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </form>
      
      <div style={{marginTop: '40px', marginBottom: '25px', borderTop: '1px solid #e7eaec', paddingTop: '25px'}}>
        <a href="/onu_authorization_presets/listing" className="btn btn-primary" target="_blank" style={{ boxShadow: '0 2px 4px rgba(51,122,183,0.3)', fontWeight: 500 }}>
          <i className="fa fa-list"></i> Authorization Presets
        </a>
        <div className="text-muted small" style={{marginTop: '8px', color: '#999'}}>
          <i className="fa fa-info-circle"></i> Manage presets for quick ONU authorization
        </div>
      </div>
      
      <div>
        <form className="form-inline offline">
          <div className="form-group">
            <Link href="/onu_authorization/offline" className="btn btn-success" style={{ boxShadow: '0 2px 4px rgba(40,167,69,0.3)', fontWeight: 500 }}>Add ONU for later authorization</Link>
          </div>
        </form>
      </div>

      {/* Modal for Live Authorization */}
      {showAuthorizeModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setShowAuthorizeModal(false)}>&times;</button>
                <h3 className="modal-title">Authorize ONU: {selectedOnu?.sn_mac}</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                     <div className="col-md-4">
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Identity</h4>
                        <div className="form-group">
                           <label className="control-label">OLT</label>
                           <input className="form-control input-sm" value={selectedOnu?.olt ? `${selectedOnu.olt.id} - ${selectedOnu.olt.name}` : ''} disabled />
                        </div>
                        <div className="form-group">
                          <label className="control-label">GPON Channel</label>
                          <div>
                            <div className="radio-inline"><label><input type="radio" checked readOnly disabled /> GPON</label></div>
                            <div className="radio-inline"><label><input type="radio" disabled /> XG-PON</label></div>
                            <div className="radio-inline"><label><input type="radio" disabled /> XGS-PON</label></div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="control-label">Board / Port</label>
                          <div className="row">
                             <div className="col-xs-6"><input className="form-control input-sm" placeholder="Board (e.g. 1)" value={selectedOnu?.pon_port?.split('/')[0] || ''} disabled /></div>
                             <div className="col-xs-6"><input className="form-control input-sm" placeholder="Port (e.g. 1)" value={selectedOnu?.pon_port?.split('/')[1] || ''} disabled /></div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="control-label">SN</label>
                          <input className="form-control input-sm" placeholder="ONU Serial Number" value={selectedOnu?.sn_mac || ''} disabled />
                        </div>
                        <div className="form-group">
                          <label className="control-label">ONU type</label>
                          <select className="form-control input-sm" value={formData.onuTypeId} onChange={e => setFormData({...formData, onuTypeId: e.target.value})}>
                            {masterData.onuTypes.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="control-label">Service-profile</label>
                          <select className="form-control input-sm" value={formData.profileId} onChange={e => setFormData({...formData, profileId: e.target.value})}>
                            <option value="">Default</option>
                            {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <div className="checkbox"><label><input type="checkbox" /> Use custom profile</label></div>
                        </div>
                     </div>
  
                     <div className="col-md-4">
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Network</h4>
                        <div className="form-group">
                          <label className="control-label">ONU mode</label>
                          <div>
                            <div className="radio-inline"><label><input type="radio" name="mode" value="route" checked={formData.mode === 'route'} onChange={e => setFormData({...formData, mode: e.target.value})} /> Routing</label></div>
                            <div className="radio-inline"><label><input type="radio" name="mode" value="bridge" checked={formData.mode === 'bridge'} onChange={e => setFormData({...formData, mode: e.target.value})} /> Bridging</label></div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="control-label">User VLAN-ID</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
                            {(formData.vlan ? formData.vlan.split(',').map(s => s.trim()).filter(Boolean) : []).map(v => (
                              <span key={v} style={{ backgroundColor: '#e4e4e4', border: '1px solid #aaa', borderRadius: '3px', padding: '2px 6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                                {masterData.vlans?.find((mv:any) => mv.vlan_id.toString() === v)?.vlan_id || v}
                                <span style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px', fontSize: '14px' }} onClick={() => {
                                  const arr = formData.vlan.split(',').map(s => s.trim()).filter(Boolean);
                                  setFormData({...formData, vlan: arr.filter(x => x !== v).join(', ')});
                                }}>&times;</span>
                              </span>
                            ))}
                          </div>
                          <select className="form-control input-sm select-search" value="" onChange={e => {
                            const val = e.target.value;
                            if (!val) return;
                            const arr = formData.vlan ? formData.vlan.split(',').map(s => s.trim()).filter(Boolean) : [];
                            if (!arr.includes(val)) setFormData({...formData, vlan: [...arr, val].join(', ')});
                          }}>
                            <option value="">-- Add VLAN --</option>
                            {masterData.vlans?.map((v:any) => <option key={v.id} value={v.vlan_id}>{v.vlan_id} - {v.description || 'VLAN'}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="control-label">Zone</label>
                          <select className="form-control input-sm" value={formData.zoneId} onChange={e => setFormData({...formData, zoneId: e.target.value})}>
                            <option value="">None</option>
                            {masterData.zones.map((z:any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="control-label">ODB (Splitter)</label>
                          <select className="form-control input-sm" value={formData.odbId} onChange={e => setFormData({...formData, odbId: e.target.value})}>
                            <option value="">None</option>
                            {masterData.odbs.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="control-label">ODB port</label>
                          <input type="number" className="form-control input-sm" />
                        </div>
                     </div>
  
                     <div className="col-md-4">
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Metadata</h4>
                        <div className="form-group">
                           <label className="control-label">Name</label>
                           <input className="form-control input-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                           <label className="control-label">Address or comment</label>
                           <textarea className="form-control input-sm" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                        </div>
                        <div className="form-group">
                           <label className="control-label">ONU external ID</label>
                           <input className="form-control input-sm" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                        </div>
                     </div>
                  </div>
                </div>
                <div className="modal-footer">
                   <button type="button" className="btn btn-default" onClick={() => setShowAuthorizeModal(false)}>Cancel</button>
                   <button type="submit" className="btn alert-success">Authorize</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnconfiguredOnuPage() {
  return (
    <Suspense fallback={<div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>}>
      <UnconfiguredOnuContent />
    </Suspense>
  );
}
