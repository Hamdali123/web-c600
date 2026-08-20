"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function UnconfiguredOnuContent() {
  const searchParams = useSearchParams();
  const urlOltId = searchParams.get('olt_id') || '';
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

  const [oltSelection, setOltSelection] = useState<string>(urlOltId); // from dashboard deep-link or default
  const [ponPorts, setPonPorts] = useState<any[]>([]);
  const [ponSelection, setPonSelection] = useState<string>('0');
  
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [selectedOnu, setSelectedOnu] = useState<any>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
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

  const [showAutoActionsModal, setShowAutoActionsModal] = useState(false);
  const [autoOltSelection, setAutoOltSelection] = useState<string>('0');
  const [autoResync, setAutoResync] = useState(false);
  const [autoMove, setAutoMove] = useState(false);
  const [autoAuthorize, setAutoAuthorize] = useState(false);

  const startAutoActions = async () => {
    try {
      const res = await fetch('/api/tasks/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          olt_id: parseInt(autoOltSelection),
          resync: autoResync,
          move: autoMove,
          authorize: autoAuthorize
        })
      });
      if (res.ok) {
        alert('Auto actions started successfully');
        setShowAutoActionsModal(false);
      } else {
        alert('Failed to start auto actions');
      }
    } catch (e) {
      alert('Error starting auto actions');
    }
  };

  const stopAutoActions = async () => {
    try {
      const res = await fetch('/api/tasks/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('All running auto actions stopped');
      } else {
        alert('Failed to stop auto actions');
      }
    } catch (e) {
      alert('Error stopping auto actions');
    }
  };

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master', { cache: 'no-store' });
      const data = await res.json();
      const presetRes = await fetch('/api/settings/auth-presets', { cache: 'no-store' });
      const presetData = await presetRes.json();
      setMasterData({ ...data, presets: presetData });
      
      // Auto-select first OLT if not set
      if (data.olts && data.olts.length > 0) {
        setOltSelection(prev => {
          if (!prev || prev === '0') {
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
       const res = await fetch('/api/onus/unconfigured?' + params.toString(), { cache: 'no-store' });
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
    let mounted = true;
    const load = async () => {
      await fetchPonPortsForOlt(oltSelection);
    };
    load();
    return () => { mounted = false; };
  }, [oltSelection, fetchPonPortsForOlt]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await fetchMasterData();
      await fetchUnconfigured();
      if (mounted) {
        setLastScanTime(new Date().getTime());
      }
    };
    load();
    return () => { mounted = false; };
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
     e.preventDefault();
     if (!formData.vlan || !formData.vlan.trim()) {
       alert('Silakan pilih User VLAN-ID terlebih dahulu sebelum authorize ONU.');
       return;
     }
     setIsSubmitting(true);
     try {
       const res = await fetch('/api/onus/create', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sn: selectedOnu.sn_mac,
            oltId: selectedOnu.olt_id,
            portInfo: selectedOnu.pon_port,
            onuId: selectedOnu.onu_id,
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
     setIsSubmitting(false);
  };

  const getSignalColor = (val: number | null) => {
    if (val === null) return '#ccc';
    if (val <= -33) return '#d9534f'; // Red
    if (val < -30.99) return '#f0ad4e'; // Yellow (-31 and -32)
    return '#5cb85c'; // Green
  };

  const renderSignalBars = (signal: number | null) => {
    if (signal === null) return <span className="text-muted">-</span>;
    const color = getSignalColor(signal);
    return (
      <div className="text-center" style={{ lineHeight: '1.2' }}>
        <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'flex-end', height: '14px', marginBottom: '2px' }}>
          <div style={{ width: '4px', height: '4px', backgroundColor: color }}></div>
          <div style={{ width: '4px', height: '7px', backgroundColor: signal > -33 ? color : '#eee' }}></div>
          <div style={{ width: '4px', height: '10px', backgroundColor: signal >= -30.99 ? color : '#eee' }}></div>
          <div style={{ width: '4px', height: '14px', backgroundColor: signal > -25 ? color : '#eee' }}></div>
        </div>
        <div style={{ fontSize: '11px', color: '#999' }}>{signal}<br/><span style={{fontSize: '9px'}}>dBm</span></div>
      </div>
    );
  };

  return (
    <div className="container-fluid content-wrap" id="unconfigured_div">
      
      <form className="form-inline unconfigured" onSubmit={(e) => { e.preventDefault(); fetchUnconfigured(); }}>
        <div className="margin-bottom">
          <div className="form-group">
            <label className="control-label" htmlFor="olt">OLT</label>
            <select id="olt" name="olt_id" className="form-control input-220 select-search text-nowrap" 
              value={oltSelection} onChange={e => setOltSelection(e.target.value)}>
              {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
            </select>
          </div>
            <div id="pon-wrapper" className="form-group margin-left">
                <label className="control-label" htmlFor="pon">PON</label>
                <select name="pon" id="pon" className="form-control input-150 select-search text-nowrap"
                  value={ponSelection} onChange={e => setPonSelection(e.target.value)}>
                  <option value="0">Any</option>
                  {ponPorts.map(p => (
                    <option key={p.name} value={p.value || p.name}>{p.name}</option>
                  ))}
                </select>
            </div>
            <div className="form-group margin-left">
              <a href="#" onClick={(e) => { e.preventDefault(); fetchUnconfigured(); }} className="btn btn-success get-unconfigured">
                Refresh
                {loading && <i className="fa fa-spinner fa-spin margin-left"></i>}
              </a>
            </div>
        </div>

        <div className="margin-top">
          <div className="panel-group" id="accordion_tasks">
              <div className="panel panel-default">
                  <div className="panel-heading">
                      <h4 className="panel-title">
                          <a className="accordion-toggle collapsed btn-block" data-toggle="collapse" data-parent="#accordion_tasks" href="#tasksList" aria-expanded="true" style={{textDecoration: 'none'}}>
                              Auto actions
                              <i className="fa fa-chevron-right pull-right" style={{marginTop: '2px', color: '#888'}}></i>
                          </a>
                      </h4>
                  </div>
                  <div id="tasksList" className="panel-collapse collapse in">
                      <div className="panel-body">
                          <div className="tasks-buttons-container clearfix">
                              <button type="button" className="btn btn-success task-btn" onClick={() => setShowAutoActionsModal(true)}>Configure actions</button>
                              <Link href="/reports/tasks" className="btn btn-success task-btn"><i className="fa fa-history"></i> Task history</Link>
                              <button type="button" className="btn btn-danger task-btn task-btn-stop" onClick={() => stopAutoActions()} disabled={false}>Stop auto actions</button>
                          </div>
                          <div id="active-tasks-container">
                          </div>
                          <div className="text-muted text-right active-tasks-refresh-hint" style={{ marginTop: '4px' }}>
                              <i className="fa fa-info-circle"></i> Auto actions list updates automatically
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        <div id="gpon_epon_unconfigured" style={{ minHeight: '10vh' }}>
          {loading && unconfigured.length === 0 ? (
             <div className="text-center margin-top-lg" id="gpon_epon_unconfigured_loading">
               <i className="fa fa-4x fa-spinner fa-spin text-blue"></i>
               <h3>Scanning OLTs for Unconfigured ONUs</h3>
             </div>
          ) : (
             <div className="margin-top">
               <div style={{ marginBottom: '15px' }}>
                 <strong>
                   {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.id || ''} - {masterData.olts.find((o:any) => o.id === parseInt(oltSelection || '0'))?.name || 'All OLTs'}
                 </strong> &nbsp;
                 <i className="fa fa-refresh text-primary" style={{cursor: 'pointer'}} onClick={() => fetchUnconfigured()}></i>
                 <div className="text-muted" style={{marginTop: '2px', marginBottom: '15px'}}>Last scan: {scanSecondsAgo} {scanSecondsAgo === 1 ? 'second' : 'seconds'} ago</div>
               </div>
              <div className="table-responsive" style={{ border: 'none' }}>
                <table className="table table-hover" style={{ borderBottom: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9f9f9', borderTop: 'none' }}>
                      <th style={{ borderBottom: 'none' }}>PON type</th>
                      <th style={{ borderBottom: 'none' }}>Board</th>
                      <th style={{ borderBottom: 'none' }}>Port</th>
                      <th style={{ borderBottom: 'none' }}>PON description</th>
                      <th style={{ borderBottom: 'none' }}>SN</th>
                      <th style={{ borderBottom: 'none' }}>Type</th>
                      <th style={{ borderBottom: 'none' }}>Detected</th>
                      <th className="text-right" style={{ borderBottom: 'none' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unconfigured.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ border: 'none', padding: '20px 0' }}>
                          <div style={{ fontSize: '14px', color: '#333' }}>No unconfigured ONUs found</div>
                        </td>
                      </tr>
                    ) : unconfigured.map((onu: any) => {
                      const boardMatch = onu.pon_port?.match(/(\d+)\/(\d+)\/(\d+)/);
                      const board = boardMatch ? boardMatch[2] : (onu.pon_port?.split('/')[0] || '');
                      const port = boardMatch ? boardMatch[3] : (onu.pon_port?.split('/')[1] || '');
                      
                      return (
                      <tr key={onu.sn_mac}>
                         <td className="vertical-align-middle">GPON</td>
                         <td className="vertical-align-middle">{board}</td>
                         <td className="vertical-align-middle">{port}</td>
                         <td className="vertical-align-middle text-muted"></td>
                         <td className="vertical-align-middle">{onu.sn_mac}</td>
                         <td className="vertical-align-middle">
                           {onu.model || 'Unknown'} <i className="fa fa-info-circle text-muted" title={onu.model || 'Unknown'}></i>
                         </td>
                         <td className="vertical-align-middle text-muted">
                           <small>{onu.discoveredAt ? (() => {
                              const diff = Math.floor((Date.now() - new Date(onu.discoveredAt).getTime()) / 1000);
                              if (diff < 60) return `${diff} seconds ago`;
                              if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
                              if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
                              return `${Math.floor(diff / 86400)} days ago`;
                            })() : 'Just now'}</small>
                         </td>
                         <td className="text-right vertical-align-middle">
                            {onu.configuredOnuId ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                                <a href={`/onu/view/${onu.configuredOnuId}`} className="text-primary" style={{ textDecoration: 'none' }}>
                                  View ONU
                                </a>
                                <span style={{ color: '#ccc' }}>|</span>
                                <a href="#" 
                                  className="text-primary" 
                                  style={{ textDecoration: 'none' }}
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    if (confirm('Are you sure you want to resync the configuration to the physical OLT?')) {
                                      try {
                                        const res = await fetch(`/api/onus/${onu.configuredOnuId}/resync`, { method: 'POST' });
                                        if (res.ok) alert('Resync command sent successfully.');
                                        else alert('Failed to resync.');
                                      } catch (err) {
                                        alert('Error sending resync command.');
                                      }
                                    }
                                  }}
                                >
                                  Resync config
                                </a>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                className="btn btn-primary btn-xs" 
                                onClick={() => { setSelectedOnu(onu); setShowAuthorizeModal(true); }}
                              >
                                 Authorize
                              </button>
                        )}
                     </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
              </div>
            </div>
          )}
        </div>
      </form>
      
      <br />

      <div style={{ marginBottom: '15px' }}>
        <a href="/settings/auth-presets" className="btn btn-primary" target="_blank">
          <i className="fa fa-list"></i> Authorization Presets
        </a>
        <div className="text-muted" style={{ marginTop: '5px' }}>
          <i className="fa fa-info-circle"></i> Manage presets for quick ONU authorization
        </div>
      </div>
      
      <hr style={{ margin: '15px 0' }} />
      
      <div>
        <form className="form-inline offline">
          <div className="form-group">
            <Link href="/onu_authorization/offline" className="btn btn-success form-control">Add ONU for later authorization</Link>
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
              <form onSubmit={handleSubmit} className="form-horizontal">
                <div className="modal-body" style={{ padding: '20px 30px', maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="form-group">
                      <label className="col-sm-3 control-label">OLT</label>
                      <div className="col-sm-9">
                         <input className="form-control input-sm" value={selectedOnu?.olt ? `${selectedOnu.olt.id} - ${selectedOnu.olt.name}` : ''} disabled />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">GPON Channel</label>
                      <div className="col-sm-9">
                        <div className="radio-inline"><label><input type="radio" checked readOnly disabled /> GPON</label></div>
                        <div className="radio-inline"><label><input type="radio" disabled /> XG-PON</label></div>
                        <div className="radio-inline"><label><input type="radio" disabled /> XGS-PON</label></div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Board</label>
                      <div className="col-sm-9">
                         <input className="form-control input-sm" placeholder="Board" value={selectedOnu?.pon_port?.split('/')[0] || ''} disabled />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Port</label>
                      <div className="col-sm-9">
                         <input className="form-control input-sm" placeholder="Port" value={selectedOnu?.pon_port?.split('/')[1] || ''} disabled />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">SN</label>
                      <div className="col-sm-9">
                        <input className="form-control input-sm" placeholder="ONU Serial Number" value={selectedOnu?.sn_mac || ''} disabled />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">ONU type</label>
                      <div className="col-sm-9">
                        <select className="form-control input-sm" value={formData.onuTypeId} onChange={e => setFormData({...formData, onuTypeId: e.target.value})}>
                          <option value="">ALL</option>
                          {masterData.onuTypes.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Service-profile</label>
                      <div className="col-sm-9">
                        <select className="form-control input-sm" value={formData.profileId} onChange={e => setFormData({...formData, profileId: e.target.value})}>
                          <option value="">Default (ALL)</option>
                          {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="col-sm-offset-3 col-sm-9">
                        <div className="checkbox"><label><input type="checkbox" /> Use custom profile</label></div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="col-sm-3 control-label">ONU mode</label>
                      <div className="col-sm-9">
                        <div className="radio-inline"><label><input type="radio" name="mode" value="route" checked={formData.mode === 'route'} onChange={e => setFormData({...formData, mode: e.target.value})} /> Routing</label></div>
                        <div className="radio-inline"><label><input type="radio" name="mode" value="bridge" checked={formData.mode === 'bridge'} onChange={e => setFormData({...formData, mode: e.target.value})} /> Bridging</label></div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">User VLAN-ID</label>
                      <div className="col-sm-9">
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
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Zone</label>
                      <div className="col-sm-9">
                        <select className="form-control input-sm" value={formData.zoneId} onChange={e => setFormData({...formData, zoneId: e.target.value})}>
                          <option value="">Zone 1</option>
                          {masterData.zones.map((z:any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Splitter</label>
                      <div className="col-sm-9">
                        <select className="form-control input-sm" value={formData.odbId} onChange={e => setFormData({...formData, odbId: e.target.value})}>
                          <option value="">None</option>
                          {masterData.odbs.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-3 control-label">Splitter port</label>
                      <div className="col-sm-9">
                        <select className="form-control input-sm">
                          <option value="">None</option>
                          {[...Array(16)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                       <label className="col-sm-3 control-label">Name</label>
                       <div className="col-sm-9">
                         <input className="form-control input-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                       </div>
                    </div>
                    <div className="form-group">
                       <label className="control-label col-sm-3">Address or comment</label>
                       <div className="col-sm-9">
                         <textarea className="form-control input-sm" rows={3} placeholder="Address or comment (optional)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                       </div>
                    </div>
                    <div className="form-group">
                       <label className="control-label col-sm-3">ONU external ID</label>
                       <div className="col-sm-9">
                         <input className="form-control input-sm" placeholder="Use the unique ONU external ID with API or billing systems" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                       </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-default" onClick={() => setShowAuthorizeModal(false)}>Close</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Authorizing...' : 'Authorize ONU'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      {/* Modal for Auto Actions */}
      {showAutoActionsModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setShowAutoActionsModal(false)}>&times;</button>
                <h4 className="modal-title">Auto actions</h4>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '15px' }}>
                  <i className="fa fa-list"></i> <strong>Select OLT(s)</strong>
                </div>
                <form className="form-horizontal">
                  <div className="form-group">
                    <label className="col-sm-4 control-label">OLT</label>
                    <div className="col-sm-8">
                      <select className="form-control" value={autoOltSelection} onChange={(e) => setAutoOltSelection(e.target.value)}>
                        <option value="0">ALL</option>
                        {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ margin: '30px 0 15px 0' }}>
                    <i className="fa fa-cogs"></i> <strong>Auto Actions</strong>
                  </div>
                  
                  <div className="form-group">
                    <label className="col-sm-4 control-label">
                      Resync <i className="fa fa-info-circle text-muted" title="Automatically resync configured ONUs"></i>
                    </label>
                    <div className="col-sm-8">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={autoResync} onChange={(e) => setAutoResync(e.target.checked)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">
                      Move <i className="fa fa-info-circle text-muted" title="Automatically move ONUs detected on different ports"></i>
                    </label>
                    <div className="col-sm-8">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={autoMove} onChange={(e) => setAutoMove(e.target.checked)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="col-sm-4 control-label">
                      Authorize <i className="fa fa-info-circle text-muted" title="Automatically authorize ONUs matching preset patterns"></i>
                    </label>
                    <div className="col-sm-8">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={autoAuthorize} onChange={(e) => setAutoAuthorize(e.target.checked)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-default" onClick={() => setShowAutoActionsModal(false)}>Close</button>
                <button type="button" className="btn btn-success" onClick={startAutoActions}>Start</button>
              </div>
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
