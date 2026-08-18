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
      
      <div className="panel panel-default margin-top">
        <div className="panel-body">
          <form onSubmit={handleSubmit} className="form-horizontal" style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            <div className="form-group">
              <label className="col-sm-3 control-label">OLT</label>
              <div className="col-sm-9">
                <select className="form-control input-sm" value={formData.olt_id} onChange={e => setFormData({...formData, olt_id: e.target.value})} required>
                  {masterData.olts.map((o:any) => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">PON type</label>
              <div className="col-sm-9">
                <div className="radio-inline"><label><input type="radio" name="pon_type" value="gpon" checked={formData.pon_type === 'gpon'} onChange={e => setFormData({...formData, pon_type: e.target.value})} /> GPON</label></div>
                <div className="radio-inline"><label><input type="radio" name="pon_type" value="epon" checked={formData.pon_type === 'epon'} onChange={e => setFormData({...formData, pon_type: e.target.value})} /> EPON</label></div>
              </div>
            </div>

            {formData.pon_type === 'gpon' && (
            <div className="form-group">
              <label className="col-sm-3 control-label">GPON channel</label>
              <div className="col-sm-9">
                <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="GPON" checked={formData.gpon_channel === 'GPON' || formData.gpon_channel === '1'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> GPON</label></div>
                <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="XG-PON" checked={formData.gpon_channel === 'XG-PON'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> XG-PON</label></div>
                <div className="radio-inline"><label><input type="radio" name="gpon_channel" value="XGS-PON" checked={formData.gpon_channel === 'XGS-PON'} onChange={e => setFormData({...formData, gpon_channel: e.target.value})} /> XGS-PON</label></div>
              </div>
            </div>
            )}

            <div className="form-group">
              <label className="col-sm-3 control-label">Board</label>
              <div className="col-sm-9">
                <input className="form-control input-sm" placeholder="Board (optional)" value={formData.pon_port.split('/')[0] || ''} onChange={e => setFormData({...formData, pon_port: `${e.target.value}/${formData.pon_port.split('/')[1] || ''}`})} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Port</label>
              <div className="col-sm-9">
                <input className="form-control input-sm" placeholder="Port (optional)" value={formData.pon_port.split('/')[1] || ''} onChange={e => setFormData({...formData, pon_port: `${formData.pon_port.split('/')[0] || ''}/${e.target.value}`})} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">SN</label>
              <div className="col-sm-9">
                <input className="form-control input-sm" placeholder="ONU Serial Number or MAC" value={formData.sn_mac} onChange={e => setFormData({...formData, sn_mac: e.target.value})} required />
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
                  {masterData.speedProfiles.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
                <select className="form-control input-sm select-search" value={formData.vlan} onChange={e => setFormData({...formData, vlan: e.target.value})} required>
                  <option value="">-- Select VLAN --</option>
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
                <select className="form-control input-sm" value={formData.odb_port} onChange={e => setFormData({...formData, odb_port: e.target.value})}>
                  <option value="">None</option>
                  {[...Array(16)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Download speed</label>
              <div className="col-sm-9">
                <select className="form-control input-sm" value={formData.download_speed} onChange={e => setFormData({...formData, download_speed: e.target.value})}>
                  <option value="">1G</option>
                  {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Upload speed</label>
              <div className="col-sm-9">
                <select className="form-control input-sm" value={formData.upload_speed} onChange={e => setFormData({...formData, upload_speed: e.target.value})}>
                  <option value="">1G</option>
                  {masterData.speedProfiles?.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              <label className="col-sm-3 control-label">Address or comment</label>
              <div className="col-sm-9">
                <input className="form-control input-sm" placeholder="Address or comment (optional)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">ONU external ID</label>
              <div className="col-sm-9">
                <input className="form-control input-sm" placeholder="Use the unique ONU external ID with API or billing systems" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <div className="col-sm-offset-3 col-sm-9">
                <div className="checkbox">
                  <label>
                    <input type="checkbox" checked={formData.use_gps} onChange={e => setFormData({...formData, use_gps: e.target.checked})} /> Use GPS
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group margin-top">
              <div className="col-sm-offset-3 col-sm-9">
                <button type="submit" className="btn btn-success margin-right" style={{ minWidth: '80px' }}><i className="fa fa-save"></i> Save</button>
                <button type="button" className="btn btn-default" style={{ border: 'none', color: '#337ab7', background: 'transparent' }} onClick={() => router.push('/onu/unconfigured')}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
