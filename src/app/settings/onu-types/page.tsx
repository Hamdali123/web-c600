"use client";

import { useEffect, useState } from 'react';

export default function OnuTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '', pon_type: 'GPON', capability: 'Bridging', eth_ports: '1',
    wifi_ssids: '0', pots_ports: '0', catv: false, allow_custom_profiles: false
  });
  const [editForm, setEditForm] = useState({
    id: 0, name: '', pon_type: 'GPON', capability: 'Bridging', eth_ports: '1',
    wifi_ssids: '0', pots_ports: '0', catv: false, allow_custom_profiles: false
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/onu-types');
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/onu-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        setAddForm({
          name: '', pon_type: 'GPON', capability: 'Bridging', eth_ports: '1',
          wifi_ssids: '0', pots_ports: '0', catv: false, allow_custom_profiles: false
        });
        setShowAddModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error adding ONU type");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/onu-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error editing ONU type");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ONU Type?")) return;
    try {
      const res = await fetch(`/api/settings/onu-types?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error deleting ONU type");
    }
  };

  return (
    <div className="container-fluid content-wrap">
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>
        <i className="fa fa-hdd-o"></i> ONU types
      </h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px', marginBottom: '25px' }} />

      <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
          <span className="fa fa-plus"></span> Add ONU type
        </button>
      </div>

      <div className="panel panel-default border-0 shadow-sm">
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>PON type</th>
                    <th>ONU type</th>
                    <th className="text-center">Ethernet ports</th>
                    <th className="text-center">WiFi</th>
                    <th className="text-center">VoIP ports</th>
                    <th className="text-center">CATV</th>
                    <th className="text-center">Allow custom profiles</th>
                    <th>Capability</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id}>
                      <td><span className="label label-default" style={{ backgroundColor: '#edf2f7', color: '#2d3748' }}>{t.pon_type}</span></td>
                      <td>
                        <a 
                          href="#" 
                          style={{ color: '#337ab7', fontWeight: 'bold' }}
                          onClick={(e) => {
                            e.preventDefault();
                            setEditForm({
                              id: t.id,
                              name: t.name,
                              pon_type: t.pon_type,
                              capability: t.capability,
                              eth_ports: String(t.eth_ports),
                              wifi_ssids: String(t.wifi_ssids),
                              pots_ports: String(t.pots_ports),
                              catv: t.catv,
                              allow_custom_profiles: t.allow_custom_profiles
                            });
                            setShowEditModal(true);
                          }}
                        >
                          {t.name}
                        </a>
                      </td>
                      <td className="text-center">{t.eth_ports}</td>
                      <td className="text-center">{t.wifi_ssids > 0 ? `${t.wifi_ssids} SSIDs` : 'No'}</td>
                      <td className="text-center">{t.pots_ports}</td>
                      <td className="text-center">{t.catv ? 'Yes' : 'No'}</td>
                      <td className="text-center">
                        <span className={`label ${t.allow_custom_profiles ? 'label-success' : 'label-default'}`}>
                          {t.allow_custom_profiles ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{t.capability}</td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(t.id)}>
                          <i className="fa fa-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {types.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted" style={{ padding: '30px' }}>
                        No ONU types defined. Click Add ONU type to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD ONU TYPE MODAL */}
      {showAddModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAddSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h4 className="modal-title">Add ONU type</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">PON type</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="GPON" checked={addForm.pon_type === 'GPON'} onChange={e => setAddForm({ ...addForm, pon_type: e.target.value })} /> GPON
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="EPON" checked={addForm.pon_type === 'EPON'} onChange={e => setAddForm({ ...addForm, pon_type: e.target.value })} /> EPON
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="small text-muted">ONU type (Name)</label>
                    <input type="text" className="form-control" placeholder="e.g. F609, EG8145V5" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required />
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">Ethernet ports</label>
                        <select className="form-control" value={addForm.eth_ports} onChange={e => setAddForm({ ...addForm, eth_ports: e.target.value })}>
                          {[1,2,3,4,8,16,24].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">WiFi SSIDs</label>
                        <select className="form-control" value={addForm.wifi_ssids} onChange={e => setAddForm({ ...addForm, wifi_ssids: e.target.value })}>
                          {[0,1,2,4,8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">VoIP ports</label>
                        <select className="form-control" value={addForm.pots_ports} onChange={e => setAddForm({ ...addForm, pots_ports: e.target.value })}>
                          {[0,1,2,4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={addForm.catv} onChange={e => setAddForm({ ...addForm, catv: e.target.checked })} /> CATV Support
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={addForm.allow_custom_profiles} onChange={e => setAddForm({ ...addForm, allow_custom_profiles: e.target.checked })} /> Allow custom profiles
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="small text-muted">Capability</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="Bridging" checked={addForm.capability === 'Bridging'} onChange={e => setAddForm({ ...addForm, capability: e.target.value })} /> Bridging
                      </label>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="Bridging/Routing" checked={addForm.capability === 'Bridging/Routing'} onChange={e => setAddForm({ ...addForm, capability: e.target.value })} /> Bridging/Routing
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="Routing" checked={addForm.capability === 'Routing'} onChange={e => setAddForm({ ...addForm, capability: e.target.value })} /> Routing
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save ONU type</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ONU TYPE MODAL */}
      {showEditModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowEditModal(false)}>&times;</button>
                  <h4 className="modal-title">Edit ONU type</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">PON type</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="GPON" checked={editForm.pon_type === 'GPON'} onChange={e => setEditForm({ ...editForm, pon_type: e.target.value })} /> GPON
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="EPON" checked={editForm.pon_type === 'EPON'} onChange={e => setEditForm({ ...editForm, pon_type: e.target.value })} /> EPON
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="small text-muted">ONU type (Name)</label>
                    <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">Ethernet ports</label>
                        <select className="form-control" value={editForm.eth_ports} onChange={e => setEditForm({ ...editForm, eth_ports: e.target.value })}>
                          {[1,2,3,4,8,16,24].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">WiFi SSIDs</label>
                        <select className="form-control" value={editForm.wifi_ssids} onChange={e => setEditForm({ ...editForm, wifi_ssids: e.target.value })}>
                          {[0,1,2,4,8].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label className="small text-muted">VoIP ports</label>
                        <select className="form-control" value={editForm.pots_ports} onChange={e => setEditForm({ ...editForm, pots_ports: e.target.value })}>
                          {[0,1,2,4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={editForm.catv} onChange={e => setEditForm({ ...editForm, catv: e.target.checked })} /> CATV Support
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="checkbox">
                        <label>
                          <input type="checkbox" checked={editForm.allow_custom_profiles} onChange={e => setEditForm({ ...editForm, allow_custom_profiles: e.target.checked })} /> Allow custom profiles
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="small text-muted">Capability</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="Bridging" checked={editForm.capability === 'Bridging'} onChange={e => setEditForm({ ...editForm, capability: e.target.value })} /> Bridging
                      </label>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="Bridging/Routing" checked={editForm.capability === 'Bridging/Routing'} onChange={e => setEditForm({ ...editForm, capability: e.target.value })} /> Bridging/Routing
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="Routing" checked={editForm.capability === 'Routing'} onChange={e => setEditForm({ ...editForm, capability: e.target.value })} /> Routing
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update ONU type</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
