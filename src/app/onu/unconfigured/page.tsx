"use client";

import { useEffect, useState, useCallback } from 'react';

export default function UnconfiguredOnuPage() {
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

  const [showModal, setShowModal] = useState(false);
  const [selectedOnu, setSelectedOnu] = useState<any>(null);
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
    } catch (e) {}
  }, []);

  const fetchUnconfigured = useCallback(async () => {
    setLoading(true);
    try {
       const res = await fetch('/api/onus/unconfigured');
       const data = await res.json();
       setUnconfigured(Array.isArray(data) ? data : []);
    } catch (err) {} finally {
       setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
    fetchUnconfigured();
  }, [fetchMasterData, fetchUnconfigured]);

  const applyPreset = (presetId: string) => {
    const preset = masterData.presets.find((p: any) => p.id === parseInt(presetId));
    if (preset) {
      setFormData({
        ...formData,
        presetId,
        vlan: preset.vlan.toString(),
        mode: preset.mode,
        profileId: preset.profile_id.toString()
      });
    }
  };

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
           ...formData
         })
       });
       
       const data = await res.json();
       if (data.success) {
         setShowModal(false);
         fetchUnconfigured();
       } else {
         alert('Failed: ' + data.error);
       }
     } catch (err) { alert('Server error!'); }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '15px', minHeight: '100vh', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
         <h3 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Unconfigured ONUs</h3>
         <div style={{ fontSize: '13px' }}>
            <Link href="/" style={{ color: '#337ab7' }}>Dashboard</Link> / <span style={{ color: '#777' }}>Unconfigured ONUs</span>
         </div>
      </div>

      {/* Top Filter Area */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>OLT</span>
            <select className="form-control" style={{ width: '250px', height: '32px', fontSize: '13px', borderRadius: '4px' }}>
               <option value="all">Any OLT</option>
               {masterData.olts.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
               ))}
            </select>
         </div>
         <button className="btn btn-default" style={{ height: '32px', fontSize: '13px' }} onClick={fetchUnconfigured}>
            <i className="fa fa-refresh"></i> Refresh
         </button>
      </div>

      <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
         Displaying {unconfigured.length} ONUs waiting for authorization
      </div>

      {/* Main Content Area */}
      <div className="table-responsive" style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
         <table className="table table-striped table-hover" style={{ marginBottom: 0 }}>
            <thead style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
               <tr>
                  <th>SN / MAC</th>
                  <th>Model</th>
                  <th className="text-center">Signal</th>
                  <th>OLT</th>
                  <th>Details</th>
                  <th className="text-right">Action</th>
               </tr>
            </thead>
            <tbody>
               {loading ? (
                  <tr><td colSpan={6} className="text-center" style={{ padding: '60px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
               ) : unconfigured.length > 0 ? unconfigured.map((onu: any) => (
                  <tr key={onu.sn_mac}>
                     <td style={{ fontWeight: 'bold', verticalAlign: 'middle', color: '#337ab7' }}>{onu.sn_mac}</td>
                     <td style={{ verticalAlign: 'middle' }}>{onu.onu_type || 'Unknown'}</td>
                     <td className="text-center" style={{ verticalAlign: 'middle' }}>
                        <i className="fa fa-signal" style={{ color: '#5cb85c' }}></i>
                        <div style={{ fontSize: '10px', color: '#777' }}>-19.5 dBm</div>
                     </td>
                     <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>2 - C600-SANWANI</span>
                     </td>
                     <td style={{ fontSize: '11px', color: '#666', verticalAlign: 'middle' }}>
                        Board: {onu.pon_port?.split('/')[0]} / Port: {onu.pon_port?.split('/')[1]}<br/>
                        ID: {onu.onu_id}
                     </td>
                     <td className="text-right" style={{ verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ fontWeight: 'bold', padding: '5px 15px' }}
                          onClick={() => { setSelectedOnu(onu); setShowModal(true); }}
                        >
                           Authorize
                        </button>
                     </td>
                  </tr>
               )) : (
                  <tr><td colSpan={6} className="text-center" style={{ padding: '60px', color: '#999' }}>No unconfigured ONUs found.</td></tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Modal for Authorization */}
      {showModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#337ab7', color: '#fff' }}>
                <button className="close" onClick={() => setShowModal(false)} style={{ color: '#fff' }}>&times;</button>
                <h4 className="modal-title">Authorize ONU: {selectedOnu?.sn_mac}</h4>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
                <div className="row">
                   <div className="col-md-6">
                      <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Identity</h5>
                      <div className="form-group row">
                        <label className="col-sm-4 small">OLT</label>
                        <div className="col-sm-8"><input className="form-control input-sm" value="2 - C600-SANWANI" disabled /></div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">Board / Port</label>
                        <div className="col-sm-4"><input className="form-control input-sm" value={selectedOnu?.pon_port?.split('/')[0]} disabled /></div>
                        <div className="col-sm-4"><input className="form-control input-sm" value={selectedOnu?.pon_port?.split('/')[1]} disabled /></div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">SN / MAC</label>
                        <div className="col-sm-8"><input className="form-control input-sm" value={selectedOnu?.sn_mac} disabled /></div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">ONU Type</label>
                        <div className="col-sm-8">
                           <select className="form-control input-sm" value={formData.onuTypeId} onChange={e => setFormData({...formData, onuTypeId: e.target.value})}>
                              {masterData.onuTypes.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                           </select>
                        </div>
                      </div>
                   </div>

                   <div className="col-md-6">
                      <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Network</h5>
                      <div className="form-group row">
                        <label className="col-sm-4 small">ONU Mode</label>
                        <div className="col-sm-8">
                           <select className="form-control input-sm" value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})}>
                              <option value="route">Routing</option>
                              <option value="bridge">Bridging</option>
                           </select>
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">VLAN ID</label>
                        <div className="col-sm-8">
                           <input type="number" className="form-control input-sm" value={formData.vlan} onChange={e => setFormData({...formData, vlan: e.target.value})} required />
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">Zone</label>
                        <div className="col-sm-8">
                           <select className="form-control input-sm" value={formData.zoneId} onChange={e => setFormData({...formData, zoneId: e.target.value})}>
                              <option value="">None</option>
                              {masterData.zones.map((z:any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                           </select>
                        </div>
                      </div>
                      <div className="form-group row">
                        <label className="col-sm-4 small">ODB (Splitter)</label>
                        <div className="col-sm-8">
                           <select className="form-control input-sm" value={formData.odbId} onChange={e => setFormData({...formData, odbId: e.target.value})}>
                              <option value="">None</option>
                              {masterData.odbs.map((o:any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                           </select>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="row" style={{ marginTop: '15px' }}>
                   <div className="col-md-12">
                      <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Metadata</h5>
                      <div className="row">
                         <div className="col-md-4">
                           <div className="form-group"><label className="small">Name</label><input className="form-control input-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                         </div>
                         <div className="col-md-4">
                           <div className="form-group"><label className="small">Address</label><input className="form-control input-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                         </div>
                         <div className="col-md-4">
                           <div className="form-group"><label className="small">Contact</label><input className="form-control input-sm" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} /></div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #eee', marginTop: '20px', padding: '15px 0 0 0' }}>
                   <button type="submit" className="btn-official" style={{ backgroundColor: '#5cb85c' }}>Authorize</button>
                   <button type="button" className="btn btn-default" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal.show {
           display: block;
           background-color: rgba(0,0,0,0.5);
           z-index: 1050;
        }
      `}</style>

      <style jsx>{`
        .small-label {
           font-size: 12px;
           font-weight: 600;
           color: #555;
           margin-bottom: 5px;
        }
      `}</style>
    </div>
  );
}
