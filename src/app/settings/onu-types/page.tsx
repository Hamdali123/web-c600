"use client";

import { useEffect, useState } from 'react';

export default function OnuTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    name: '', pon_type: 'GPON', capability: 'Bridging', eth_ports: 1, 
    wifi_ssids: 0, pots_ports: 0, catv: false, allow_custom_profiles: false 
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/onu-types');
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/onu-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setForm({ 
          name: '', pon_type: 'GPON', capability: 'Bridging', eth_ports: 1, 
          wifi_ssids: 0, pots_ports: 0, catv: false, allow_custom_profiles: false 
        });
        fetchData();
      }
    } catch (e) {}
  };

  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>ONU Types</h3>
      <p className="text-muted small">Manage supported ONU models. ZTE C600 supports both GPON and XG-PON types.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>Add New Model</strong></div>
            <div className="panel-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="small text-muted">Model Name</label>
                  <input type="text" className="form-control input-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. F670L" required />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">PON Type</label>
                      <select className="form-control input-sm" value={form.pon_type} onChange={e => setForm({...form, pon_type: e.target.value})}>
                        <option>GPON</option>
                        <option>XG-PON</option>
                        <option>EPON</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="small text-muted">Capability</label>
                      <select className="form-control input-sm" value={form.capability} onChange={e => setForm({...form, capability: e.target.value})}>
                        <option>Bridging</option>
                        <option>Bridging/Routing</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="small text-muted">ETH Ports</label>
                      <input type="number" className="form-control input-sm" value={form.eth_ports} onChange={e => setForm({...form, eth_ports: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="small text-muted">WIFI SSIDs</label>
                      <input type="number" className="form-control input-sm" value={form.wifi_ssids} onChange={e => setForm({...form, wifi_ssids: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="small text-muted">VoIP Ports</label>
                      <input type="number" className="form-control input-sm" value={form.pots_ports} onChange={e => setForm({...form, pots_ports: parseInt(e.target.value)})} />
                    </div>
                  </div>
                </div>
                <div className="checkbox">
                  <label><input type="checkbox" checked={form.catv} onChange={e => setForm({...form, catv: e.target.checked})} /> CATV Support</label>
                </div>
                <div className="checkbox">
                  <label><input type="checkbox" checked={form.allow_custom_profiles} onChange={e => setForm({...form, allow_custom_profiles: e.target.checked})} /> Allow Custom Profiles</label>
                </div>
                <button type="submit" className="btn btn-primary btn-sm btn-block">Save Model</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="panel panel-default">
            <div className="table-responsive">
              <table className="table table-striped table-hover" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Capability</th>
                    <th>Ports</th>
                    <th>WiFi / VoIP / CATV</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><span className="label label-default">{t.pon_type}</span></td>
                      <td>{t.capability}</td>
                      <td>{t.eth_ports} Eth</td>
                      <td>
                        {t.wifi_ssids > 0 ? <span className="label label-success" style={{marginRight: '5px'}}>WiFi</span> : ''}
                        {t.pots_ports > 0 ? <span className="label label-info" style={{marginRight: '5px'}}>VoIP</span> : ''}
                        {t.catv ? <span className="label label-warning">CATV</span> : ''}
                      </td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs"><i className="fa fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
