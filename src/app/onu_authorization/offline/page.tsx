"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function OfflineAuthorizationPage() {
  const router = useRouter();
  
  const [masterData, setMasterData] = useState<any>({
    olts: [],
    zones: [],
    odbs: [],
    onuTypes: [],
    speedProfiles: [],
    presets: [],
    vlans: []
  });

  const [formData, setFormData] = useState({
    olt_id: '',
    pon_type: 'gpon',
    pon_port: '1/1',
    gpon_channel: '1',
    sn_mac: '',
    onu_id: '',
    onuTypeId: '',
    profileId: '',
    useCustomProfile: false,
    
    mode: 'route',
    vlan: '',
    zoneId: '',
    odbId: '',
    odb_port: '',
    download_speed: '',
    upload_speed: '',
    
    name: '',
    notes: '',
    contact: '',
    use_gps: false
  });

  const fetchMasterData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      const presetRes = await fetch('/api/settings/auth-presets');
      const presetData = await presetRes.json();
      setMasterData({ ...data, presets: presetData });
      
      if (data.olts && data.olts.length > 0) {
        setFormData(prev => ({ ...prev, olt_id: data.olts[0].id.toString() }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/onus/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sn: formData.sn_mac,
          oltId: parseInt(formData.olt_id),
          portInfo: formData.pon_port,
          isOffline: true,
          ...formData
        })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push('/onu/unconfigured');
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) { 
      alert('Server error!'); 
    }
  };

  return (
    <div className="container-fluid content-wrap">
      <h2>Offline authorization</h2>
      <p className="text-muted">Use this to configure an ONU before it is physically installed. Once installed, it will automatically download its configuration.</p>
      
      <div className="panel panel-default margin-top">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
               <div className="col-md-4">
                  <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Identity</h4>
                  <div className="form-group">
                     <label className="control-label">OLT</label>
                     <select className="form-control input-sm" value={formData.olt_id} onChange={e => setFormData({...formData, olt_id: e.target.value})} required>
                       {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
                     </select>
                  </div>
                  <div className="form-group">
                    <label className="control-label">PON type</label>
                    <div>
                      <div className="radio-inline"><label><input type="radio" name="pon_type" value="gpon" checked={formData.pon_type === 'gpon'} onChange={e => setFormData({...formData, pon_type: e.target.value})} /> GPON</label></div>
                      <div className="radio-inline"><label><input type="radio" name="pon_type" value="epon" checked={formData.pon_type === 'epon'} onChange={e => setFormData({...formData, pon_type: e.target.value})} /> EPON</label></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="control-label">Board / Port</label>
                    <div className="row">
                       <div className="col-xs-6"><input className="form-control input-sm" placeholder="Board (e.g. 1)" value={formData.pon_port.split('/')[0]} onChange={e => setFormData({...formData, pon_port: `${e.target.value}/${formData.pon_port.split('/')[1] || '1'}`})} required /></div>
                       <div className="col-xs-6"><input className="form-control input-sm" placeholder="Port (e.g. 1)" value={formData.pon_port.split('/')[1] || ''} onChange={e => setFormData({...formData, pon_port: `${formData.pon_port.split('/')[0] || '1'}/${e.target.value}`})} required /></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="control-label">GPON Channel</label>
                    <div>
                      <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="GPON" checked={formData.gpon_channel === 'GPON' || formData.gpon_channel === '1'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> GPON</label></div>
                      <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="XG-PON" checked={formData.gpon_channel === 'XG-PON'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> XG-PON</label></div>
                      <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="XGS-PON" checked={formData.gpon_channel === 'XGS-PON'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> XGS-PON</label></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="control-label">SN / MAC</label>
                    <input className="form-control input-sm" placeholder="ONU Serial Number or MAC" value={formData.sn_mac} onChange={e => setFormData({...formData, sn_mac: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="control-label">ONU ID</label>
                    <input type="number" className="form-control input-sm" placeholder="Leave blank for auto" value={formData.onu_id} onChange={e => setFormData({...formData, onu_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="control-label">ONU type</label>
                    <select className="form-control input-sm" value={formData.onuTypeId} onChange={e => setFormData({...formData, onuTypeId: e.target.value})}>
                      <option value="">Default</option>
                      {masterData.onuTypes.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="control-label">Service-profile</label>
                    <select className="form-control input-sm" value={formData.profileId} onChange={e => setFormData({...formData, profileId: e.target.value})}>
                      <option value="">Default</option>
                      {masterData.speedProfiles.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
                    <select className="form-control input-sm select-search" value={formData.vlan} onChange={e => setFormData({...formData, vlan: e.target.value})} required>
                      <option value="">-- Select VLAN --</option>
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
                    <input type="number" className="form-control input-sm" value={formData.odb_port} onChange={e => setFormData({...formData, odb_port: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="control-label">Download speed</label>
                    <select className="form-control input-sm" value={formData.download_speed} onChange={e => setFormData({...formData, download_speed: e.target.value})}>
                      <option value="">Default</option>
                      {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="control-label">Upload speed</label>
                    <select className="form-control input-sm" value={formData.upload_speed} onChange={e => setFormData({...formData, upload_speed: e.target.value})}>
                      <option value="">Default</option>
                      {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
            <div className="row margin-top">
              <div className="col-xs-12 text-right">
                <button type="button" className="btn btn-default margin-right" onClick={() => router.push('/onu/unconfigured')}>Cancel</button>
                <button type="submit" className="btn btn-success">Save</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
