"use client";

import { useEffect, useState } from 'react';

export default function AuthPresetsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Master data lists
  const [speedProfiles, setSpeedProfiles] = useState<any[]>([]);
  const [olts, setOlts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [onuTypes, setOnuTypes] = useState<any[]>([]);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [oltFilter, setOltFilter] = useState('');
  const [onuTypeFilter, setOnuTypeFilter] = useState('');
  const [ponFilter, setPonFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Guide accordion status
  const [guideOpen, setGuideOpen] = useState(true);

  // Wizard modal state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    name: '',
    description: '',
    olt_id: '',
    board: '',
    port: '',
    pon_type: 'gpon',
    sn_pattern: '',
    onu_type_id: '',
    fallback_onu_type_id: '',
    is_default: false,
    mode: 'Routing',
    channel_type: 'gpon',
    custom_profile: false,
    custom_template_id: '',
    use_svlan: false,
    svlan_id: '',
    use_other_all_tls_vlan: false,
    use_cvlan: false,
    cvlan_id: '',
    vlan: '',
    tag_transform_mode: 'default',
    download_speed_id: '',
    upload_speed_id: '',
    profile_id: '',
    zone_id: '',
    odb_id: '',
    odb_port: '',
    location_name: '',
    description_pattern: '',
    tr069_profile_id: '',
    mgmt_ip_mode: 'Inactive',
    mgmt_ip_allow_remote_access: false
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/auth-presets');
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);

      const speedRes = await fetch('/api/settings/speed-profiles');
      const speedData = await speedRes.json();
      setSpeedProfiles(Array.isArray(speedData) ? speedData : []);

      const oltRes = await fetch('/api/settings/olt');
      const oltData = await oltRes.json();
      setOlts(Array.isArray(oltData) ? oltData : []);

      const zoneRes = await fetch('/api/settings/zones');
      const zoneData = await zoneRes.json();
      setZones(Array.isArray(zoneData) ? zoneData : []);
      
      const onuTypesRes = await fetch('/api/settings/onu-types');
      const onuTypesData = await onuTypesRes.json();
      setOnuTypes(Array.isArray(onuTypesData) ? onuTypesData : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveWizard = async () => {
    try {
      const res = await fetch('/api/settings/auth-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardForm)
      });
      const data = await res.json();
      if (data.success) {
        setWizardStep(1);
        setShowWizard(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this Authorization Preset?")) return;
    try {
      const res = await fetch(`/api/settings/auth-presets?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error");
    }
  };

  const filteredPresets = presets.filter(p => {
    const matchesSearch = searchFilter === '' ||
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.sn_pattern && p.sn_pattern.toLowerCase().includes(searchFilter.toLowerCase()));
      
    const matchesOlt = oltFilter === '' || String(p.olt_id) === oltFilter;
    const matchesMode = modeFilter === '' ||
      p.mode.toLowerCase() === (modeFilter === 'route' ? 'routing' : modeFilter);
    const matchesType = onuTypeFilter === '' ||
      (onuTypeFilter === 'auto-detect' ? (!p.onu_type_id || p.fallback_onu_type_id) : String(p.onu_type_id) === onuTypeFilter);
    const matchesPon = ponFilter === '' || (p.pon_type || 'gpon') === ponFilter;
    
    return matchesSearch && matchesOlt && matchesMode && matchesType && matchesPon;
  });

  return (
    <div className="container-fluid content-wrap">
      <h2>Authorization Presets</h2>

      {/* Guide Panel */}
      <div className="getting-started-panel" id="gettingStartedPanel" style={{ border: '1px solid #cecece', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
        <div 
          className="getting-started-header" 
          onClick={() => setGuideOpen(!guideOpen)}
          style={{ backgroundColor: '#ecf0f1', borderBottom: '1px solid #cecece', padding: '15px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <h4 style={{ margin: 0, color: '#2c3e50', fontSize: '15px', fontWeight: 500 }}>
            <i className="fa fa-lightbulb-o" style={{ marginRight: '10px' }}></i> How It Works
          </h4>
          <span className="pull-right" style={{ display: 'flex', alignItems: 'center' }}>
            <a href="#" className="hide-guide-link" onClick={(e) => { e.stopPropagation(); setGuideOpen(false); }} style={{ color: '#2c3e50', opacity: 0.6 }}>
              <i className="fa fa-times"></i>
            </a>
            <i className={`fa ${guideOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ marginLeft: '10px', color: '#2c3e50' }}></i>
          </span>
        </div>
        {guideOpen && (
          <div className="getting-started-body" style={{ padding: '25px 30px', backgroundColor: '#fff' }}>
            <ul className="steps-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              <li style={{ padding: '6px 0', fontSize: '15px', color: '#2c3e50' }}>
                <span className="step-number" style={{ fontWeight: '600', marginRight: '8px' }}>1.</span> 
                <strong>Create Preset</strong> &ndash; Set up conditions and ONU settings
              </li>
              <li style={{ padding: '6px 0', fontSize: '15px', color: '#2c3e50' }}>
                <span className="step-number" style={{ fontWeight: '600', marginRight: '8px' }}>2.</span> 
                <strong>Set Conditions</strong> &ndash; Define when to apply this preset
              </li>
              <li style={{ padding: '6px 0', fontSize: '15px', color: '#2c3e50' }}>
                <span className="step-number" style={{ fontWeight: '600', marginRight: '8px' }}>3.</span> 
                <strong>Enable Auto-Auth</strong> &ndash; Turn on auto-authorization
              </li>
              <li style={{ padding: '6px 0', fontSize: '15px', color: '#2c3e50' }}>
                <span className="step-number" style={{ fontWeight: '600', marginRight: '8px' }}>4.</span> 
                <strong>Done</strong> &ndash; ONUs will be authorized automatically
              </li>
            </ul>
          </div>
        )}
      </div>

      <p style={{ marginBottom: '20px' }}>
        <button type="button" className="btn btn-success" onClick={() => setShowWizard(true)} style={{ marginRight: '10px' }}>
          <i className="fa fa-magic"></i> Create Preset with Wizard
        </button>
      </p>

      <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}>
        Authorization presets allow you to define ONU settings and conditions that will be automatically applied to ONUs when they come online.
      </p>

      {/* Search and Filter Bar */}
      <div className="form-inline margin-bottom" style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', border: '1px solid #e3e3e3', marginBottom: '25px' }}>
        <div className="form-group" style={{ marginRight: '15px' }}>
          <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Search</label>
          <input 
            type="text" 
            className="form-control input-sm" 
            placeholder="Name, Zone, SN..."
            value={searchFilter} 
            onChange={e => setSearchFilter(e.target.value)} 
          />
        </div>

        <div className="form-group" style={{ marginRight: '15px' }}>
          <label style={{ marginRight: '5px', fontWeight: 'bold' }}>OLT</label>
          <select className="form-control input-sm" value={oltFilter} onChange={e => setOltFilter(e.target.value)}>
            <option value="">All</option>
            {olts.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginRight: '15px' }}>
          <label style={{ marginRight: '5px', fontWeight: 'bold' }}>ONU type</label>
          <select className="form-control input-sm" value={onuTypeFilter} onChange={e => setOnuTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="auto-detect">Auto-detect</option>
            {onuTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginRight: '15px' }}>
          <label style={{ marginRight: '5px', fontWeight: 'bold' }}>PON</label>
          <select className="form-control input-sm" value={ponFilter} onChange={e => setPonFilter(e.target.value)}>
            <option value="">All</option>
            <option value="gpon">GPON</option>
            <option value="epon">EPON</option>
          </select>
        </div>

        <div className="form-group">
          <label style={{ marginRight: '5px', fontWeight: 'bold' }}>Mode</label>
          <select className="form-control input-sm" value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="route">Routing</option>
            <option value="bridge">Bridging</option>
          </select>
        </div>
      </div>

      {/* Presets Table */}
      {loading ? (
        <div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-3x text-muted"></i></div>
      ) : filteredPresets.length === 0 ? (
        <div style={{ padding: '20px 0' }}>
          <h4>No presets found</h4>
          <p className="text-muted">Create your first authorization preset using the wizard or create preset buttons above.</p>
        </div>
      ) : (
        <div className="panel panel-default" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-striped table-hover" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Pattern</th>
                  <th>VLAN</th>
                  <th>Mode</th>
                  <th>Speed Profile</th>
                  <th>OLT</th>
                  <th>Zone</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPresets.map(p => (
                  <tr key={p.id} className="valign-center">
                    <td><strong>{p.name}</strong></td>
                    <td><code style={{ fontSize: '13px', backgroundColor: '#f9f2f4', color: '#c7254e', padding: '2px 4px', borderRadius: '3px' }}>{p.sn_pattern || '*'}</code></td>
                    <td>{p.vlan}</td>
                    <td><span className="label label-info" style={{ textTransform: 'capitalize' }}>{p.mode}</span></td>
                    <td>{p.profile?.name || 'N/A'}</td>
                    <td>{olts.find(o => o.id === p.olt_id)?.name || 'All OLTs'}</td>
                    <td>{zones.find(z => z.id === p.zone_id)?.name || 'Default Zone'}</td>
                    <td className="text-right">
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete(p.id)} title="Delete Preset">
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6-STEP WIZARD CREATION MODAL */}
      {showWizard && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              
              <div className="modal-header">
                <button type="button" className="close" onClick={() => { setShowWizard(false); setWizardStep(1); }}>×</button>
                <h4 className="modal-title"><i className="fa fa-magic text-success"></i> Create Authorization Preset</h4>
              </div>

              {/* Progress Steps */}
              <div style={{ padding: '20px 20px 0 20px' }}>
                <div className="progress" style={{ height: '10px', marginBottom: '10px' }}>
                  <div 
                    className="progress-bar progress-bar-success" 
                    role="progressbar" 
                    style={{ width: `${(wizardStep / 6) * 100}%` }}
                  ></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#666' }}>
                  <span style={{ color: wizardStep >= 1 ? '#3c763d' : '#999' }}>1. Basics</span>
                  <span style={{ color: wizardStep >= 2 ? '#3c763d' : '#999' }}>2. Conditions</span>
                  <span style={{ color: wizardStep >= 3 ? '#3c763d' : '#999' }}>3. ONU Settings</span>
                  <span style={{ color: wizardStep >= 4 ? '#3c763d' : '#999' }}>4. TR069 & IP</span>
                  <span style={{ color: wizardStep >= 5 ? '#3c763d' : '#999' }}>5. WiFi</span>
                  <span style={{ color: wizardStep >= 6 ? '#3c763d' : '#999' }}>6. Review</span>
                </div>
              </div>

              <div className="modal-body" style={{ minHeight: '400px' }}>
                
                {/* STEP 1: BASICS */}
                {wizardStep === 1 && (
                  <div className="form-horizontal">
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-file-text-o text-success"></i> Basic Information</h5>
                    <p className="text-muted" style={{ marginBottom: '20px' }}>Give your preset a name and optional description.</p>
                    
                    <div className="form-group">
                      <label className="control-label col-sm-3">Preset Name <span className="text-danger">*</span></label>
                      <div className="col-sm-7">
                        <input 
                          type="text" 
                          className="form-control input-sm" 
                          placeholder="e.g., Residential GPON - Main Area"
                          value={wizardForm.name} 
                          onChange={e => setWizardForm({...wizardForm, name: e.target.value})} 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="control-label col-sm-3">Description</label>
                      <div className="col-sm-7">
                        <textarea 
                          className="form-control input-sm" 
                          rows={3} 
                          placeholder="Optional description of when to use this preset"
                          value={wizardForm.description}
                          onChange={e => setWizardForm({...wizardForm, description: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: CONDITIONS */}
                {wizardStep === 2 && (
                  <div className="form-horizontal">
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-filter text-success"></i> Conditions</h5>
                    <p className="text-muted" style={{ marginBottom: '20px' }}>Define which ONUs this preset will match.</p>
                    
                    <div className="form-group">
                      <label className="control-label col-sm-3">OLT <span className="text-danger">*</span></label>
                      <div className="col-sm-7">
                        <select 
                          className="form-control input-sm" 
                          value={wizardForm.olt_id} 
                          onChange={e => setWizardForm({...wizardForm, olt_id: e.target.value})}
                          required
                        >
                          <option value="">Select OLT</option>
                          {olts.map(o => (
                            <option key={o.id} value={o.id}>{o.id} - {o.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">Board</label>
                      <div className="col-sm-7">
                        <input 
                          type="text" 
                          className="form-control input-sm" 
                          placeholder="All boards" 
                          value={wizardForm.board} 
                          onChange={e => setWizardForm({...wizardForm, board: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">Port</label>
                      <div className="col-sm-7">
                        <input 
                          type="text" 
                          className="form-control input-sm" 
                          placeholder="All ports" 
                          value={wizardForm.port} 
                          onChange={e => setWizardForm({...wizardForm, port: e.target.value})}
                        />
                        <small className="help-block text-muted">
                          <i className="fa fa-info-circle"></i> Single port, multiple ports separated by comma, or ranges. Examples: <code>3</code>, <code>1, 4, 7</code>, <code>1-4, 6, 8-10</code>
                        </small>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">PON type</label>
                      <div className="col-sm-7">
                        <label className="radio-inline"><input type="radio" checked={wizardForm.pon_type === 'gpon'} onChange={() => setWizardForm({...wizardForm, pon_type: 'gpon'})} /> GPON</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.pon_type === 'epon'} onChange={() => setWizardForm({...wizardForm, pon_type: 'epon'})} /> EPON</label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">SN pattern</label>
                      <div className="col-sm-7">
                        <input 
                          type="text" 
                          className="form-control input-sm" 
                          placeholder="All serial numbers" 
                          value={wizardForm.sn_pattern} 
                          onChange={e => setWizardForm({...wizardForm, sn_pattern: e.target.value})}
                        />
                        <small className="help-block text-muted">
                          <i className="fa fa-info-circle"></i> e.g. <code>HWTC</code>, <code>ZTEG</code> - separate multiple with commas
                        </small>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">ONU type</label>
                      <div className="col-sm-7">
                        <select className="form-control input-sm" value={wizardForm.onu_type_id} onChange={e => setWizardForm({...wizardForm, onu_type_id: e.target.value})}>
                          <option value="">Auto-detect</option>
                          {onuTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Default Preset Section */}
                    {wizardForm.olt_id && !wizardForm.sn_pattern && !wizardForm.board && !wizardForm.port && (
                      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <h5 style={{ marginTop: 0, marginBottom: '10px' }}><i className="fa fa-star text-warning"></i> OLT Default Preset</h5>
                        <p className="text-muted" style={{ marginBottom: '10px' }}>
                          <i className="fa fa-info-circle"></i> Since no specific conditions are set, this preset can be set as the default for the selected OLT.
                        </p>
                        <div className="checkbox" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: 600 }}>
                            <input type="checkbox" checked={wizardForm.is_default} onChange={e => setWizardForm({...wizardForm, is_default: e.target.checked})} /> 
                            Set as default preset for OLT
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: ONU SETTINGS */}
                {wizardStep === 3 && (
                  <div className="form-horizontal">
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-cog text-success"></i> ONU settings</h5>
                    
                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-cube text-primary"></i> ONU Configuration</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">ONU mode</label>
                      <div className="col-sm-7">
                        <label className="radio-inline"><input type="radio" checked={wizardForm.mode === 'Routing'} onChange={() => setWizardForm({...wizardForm, mode: 'Routing'})} /> Routing</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.mode === 'Bridging'} onChange={() => setWizardForm({...wizardForm, mode: 'Bridging'})} /> Bridging</label>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="control-label col-sm-3">Channel</label>
                      <div className="col-sm-7">
                        <label className="radio-inline"><input type="radio" checked={wizardForm.channel_type === 'gpon'} onChange={() => setWizardForm({...wizardForm, channel_type: 'gpon'})} /> GPON</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.channel_type === 'xgpon'} onChange={() => setWizardForm({...wizardForm, channel_type: 'xgpon'})} /> XG-PON</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.channel_type === 'xgspon'} onChange={() => setWizardForm({...wizardForm, channel_type: 'xgspon'})} /> XGS-PON</label>
                      </div>
                    </div>

                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-tag text-primary"></i> VLAN</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">User VLAN <span className="text-danger">*</span></label>
                      <div className="col-sm-7">
                        <input 
                          type="number" 
                          className="form-control input-sm" 
                          placeholder="e.g. 100" 
                          value={wizardForm.vlan} 
                          onChange={e => setWizardForm({...wizardForm, vlan: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label col-sm-3">Tag-transform</label>
                      <div className="col-sm-7">
                        <select className="form-control input-sm" value={wizardForm.tag_transform_mode} onChange={e => setWizardForm({...wizardForm, tag_transform_mode: e.target.value})}>
                          <option value="translate">translate</option>
                          <option value="default">default</option>
                          <option value="translate-and-add">translate-and-add</option>
                          <option value="transparent">transparent</option>
                        </select>
                      </div>
                    </div>

                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-tachometer text-primary"></i> Speed Profiles</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">Speed Profile <span className="text-danger">*</span></label>
                      <div className="col-sm-7">
                        <select 
                          className="form-control input-sm" 
                          value={wizardForm.profile_id} 
                          onChange={e => setWizardForm({...wizardForm, profile_id: e.target.value})}
                          required
                        >
                          <option value="">Select profile</option>
                          {speedProfiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <small className="help-block text-muted">This handles both upload and download limits in local mode.</small>
                      </div>
                    </div>

                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-map-marker text-primary"></i> Location</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">Zone</label>
                      <div className="col-sm-7">
                        <select 
                          className="form-control input-sm" 
                          value={wizardForm.zone_id} 
                          onChange={e => setWizardForm({...wizardForm, zone_id: e.target.value})}
                        >
                          <option value="">Select Zone</option>
                          {zones.map(z => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: TR069 & IP */}
                {wizardStep === 4 && (
                  <div className="form-horizontal">
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-network-wired text-success"></i> TR-069 & Mgmt IP</h5>
                    
                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-sitemap text-primary"></i> TR-069 Configuration</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">TR069 Profile</label>
                      <div className="col-sm-7">
                        <select 
                          className="form-control input-sm" 
                          value={wizardForm.tr069_profile_id} 
                          onChange={e => setWizardForm({...wizardForm, tr069_profile_id: e.target.value})}
                        >
                          <option value="">Disabled</option>
                          <option value="1">SmartOLT ACS</option>
                        </select>
                      </div>
                    </div>

                    <h5 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}><i className="fa fa-globe text-primary"></i> Management IP</h5>
                    <div className="form-group">
                      <label className="control-label col-sm-3">Mode</label>
                      <div className="col-sm-7">
                        <label className="radio-inline"><input type="radio" checked={wizardForm.mgmt_ip_mode === 'Inactive'} onChange={() => setWizardForm({...wizardForm, mgmt_ip_mode: 'Inactive'})} /> Inactive</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.mgmt_ip_mode === 'Static'} onChange={() => setWizardForm({...wizardForm, mgmt_ip_mode: 'Static'})} /> Static IP</label>
                        <label className="radio-inline"><input type="radio" checked={wizardForm.mgmt_ip_mode === 'DHCP'} onChange={() => setWizardForm({...wizardForm, mgmt_ip_mode: 'DHCP'})} /> DHCP</label>
                      </div>
                    </div>
                    
                    {wizardForm.mgmt_ip_mode !== 'Inactive' && (
                      <div className="form-group">
                        <div className="col-sm-offset-3 col-sm-7">
                          <div className="checkbox">
                            <label>
                              <input type="checkbox" checked={wizardForm.mgmt_ip_allow_remote_access} onChange={e => setWizardForm({...wizardForm, mgmt_ip_allow_remote_access: e.target.checked})} /> Allow remote access to Management Web UI
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 5: WIFI */}
                {wizardStep === 5 && (
                  <div className="form-horizontal">
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-wifi text-success"></i> WiFi Configuration</h5>
                    <p className="text-muted">Set up default WiFi credentials and settings for this preset.</p>
                    
                    <div className="alert alert-info">
                      <i className="fa fa-info-circle"></i> WiFi automation is being configured in the database schema. This section will allow you to define default SSIDs, security modes, and password patterns in a future update.
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW */}
                {wizardStep === 6 && (
                  <div>
                    <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '15px' }}><i className="fa fa-check-circle text-success"></i> Review and Save</h5>
                    <p className="text-muted">Ensure all conditions and profiles are correctly set before activating this auto-authorization rule.</p>
                    
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <table className="table" style={{ margin: 0 }}>
                        <tbody>
                          <tr>
                            <td style={{ borderTop: 0, fontWeight: 'bold', width: '30%' }}>Preset Name:</td>
                            <td style={{ borderTop: 0 }}>{wizardForm.name}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Serial Prefix:</td>
                            <td><code>{wizardForm.sn_pattern || 'Any'}</code></td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>OLT Target:</td>
                            <td>{olts.find(o => String(o.id) === wizardForm.olt_id)?.name || 'Selected OLT'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>VLAN / Mode:</td>
                            <td>VLAN {wizardForm.vlan} ({wizardForm.mode})</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Speed Profile:</td>
                            <td>{speedProfiles.find(p => String(p.id) === wizardForm.profile_id)?.name || 'Selected Profile'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold' }}>Mgmt IP:</td>
                            <td>{wizardForm.mgmt_ip_mode}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

              <div className="modal-footer">
                {wizardStep > 1 && (
                  <button type="button" className="btn btn-default" onClick={() => setWizardStep(wizardStep - 1)}>
                    Back
                  </button>
                )}
                
                {wizardStep < 6 ? (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (wizardStep === 1 && !wizardForm.name) return alert("Please enter preset name.");
                      if (wizardStep === 2 && !wizardForm.olt_id) return alert("Please specify OLT.");
                      if (wizardStep === 3 && (!wizardForm.vlan || !wizardForm.profile_id)) return alert("Please specify VLAN and Speed Profile.");
                      setWizardStep(wizardStep + 1);
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button type="button" className="btn btn-success" onClick={handleSaveWizard}>
                    <i className="fa fa-magic"></i> Save & Enable Auto-Auth
                  </button>
                )}
                
                <button type="button" className="btn btn-link" onClick={() => { setShowWizard(false); setWizardStep(1); }}>Cancel</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
