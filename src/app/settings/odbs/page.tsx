"use client";

import { useEffect, useState } from 'react';

export default function OdbsPage() {
  const [odbs, setOdbs] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search Filters
  const [filters, setFilters] = useState({ search: '', zoneId: '' });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ name: '', ports: '8', zone_id: '', lat: '', lng: '' });
  const [editForm, setEditForm] = useState({ id: 0, name: '', ports: '8', zone_id: '', lat: '', lng: '' });
  const [importText, setImportText] = useState('');

  const fetchData = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/settings/odbs?${query}`);
      const data = await res.json();
      setOdbs(Array.isArray(data) ? data : []);
      
      const zoneRes = await fetch('/api/settings/zones');
      const zoneData = await zoneRes.json();
      setZones(Array.isArray(zoneData) ? zoneData : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/odbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (data.success) {
        setAddForm({ name: '', ports: '8', zone_id: '', lat: '', lng: '' });
        setShowAddModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error adding ODB");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/odbs', {
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
      alert("Server error editing ODB");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ODB (Splitter)?")) return;
    try {
      const res = await fetch(`/api/settings/odbs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error deleting ODB.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const header = "Name,Ports,Zone,Latitude,Longitude\n";
    const rows = odbs.map(o => `"${o.name}",${o.ports},"${o.zone?.name || ''}",${o.lat || ''},${o.lng || ''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "smartolt_odbs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      alert("Please enter CSV lines.");
      return;
    }
    
    // Assumes csv format: Name,Ports,ZoneName,Lat,Lng
    try {
      let importedCount = 0;
      for (const line of lines) {
        const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
        if (parts.length < 3) continue;
        
        const [name, ports, zoneName, lat, lng] = parts;
        
        // Find zone id
        const zoneObj = zones.find(z => z.name.toLowerCase() === zoneName.toLowerCase());
        if (!zoneObj) continue; // skip if zone doesn't exist
        
        await fetch('/api/settings/odbs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            ports: parseInt(ports) || 8,
            zone_id: zoneObj.id,
            lat: lat || '',
            lng: lng || ''
          })
        });
        importedCount++;
      }
      alert(`Imported ${importedCount} ODBs.`);
      setShowImportModal(false);
      setImportText('');
      fetchData();
    } catch (err) {
      alert("Error importing ODBs.");
    }
  };

  return (
    <div className="container-fluid content-wrap">
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>
        <i className="fa fa-sitemap"></i> ODBs (Splitters)
      </h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px', marginBottom: '25px' }} />

      {/* Filters Bar */}
      <div className="row" style={{ marginBottom: '20px' }}>
        <div className="col-md-3">
          <input 
            type="text" 
            className="form-control input-sm" 
            placeholder="Search by Name" 
            value={filters.search} 
            onChange={e => setFilters({ ...filters, search: e.target.value })} 
          />
        </div>
        <div className="col-md-3">
          <select 
            className="form-control input-sm" 
            value={filters.zoneId} 
            onChange={e => setFilters({ ...filters, zoneId: e.target.value })}
          >
            <option value="">All Zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div className="col-md-6 text-right">
          <button className="btn btn-success btn-sm margin-right" style={{ marginRight: '5px' }} onClick={() => setShowAddModal(true)}>
            <span className="fa fa-plus"></span> Add ODB (Splitter)
          </button>
          <button className="btn btn-primary btn-sm margin-right" style={{ marginRight: '5px' }} onClick={handleExport}>
            <span className="fa fa-download"></span> Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowImportModal(true)}>
            <span className="fa fa-upload"></span> Import
          </button>
        </div>
      </div>

      {/* Main ODB Table */}
      <div className="panel panel-default border-0 shadow-sm">
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>Name</th>
                    <th className="text-center">Ports</th>
                    <th>Zone</th>
                    <th>GPS Coordinates</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {odbs.map(o => (
                    <tr key={o.id}>
                      <td>
                        <a 
                          href="#" 
                          style={{ color: '#337ab7', fontWeight: 'bold' }}
                          onClick={(e) => {
                            e.preventDefault();
                            setEditForm({
                              id: o.id,
                              name: o.name,
                              ports: String(o.ports),
                              zone_id: String(o.zone_id),
                              lat: o.lat ? String(o.lat) : '',
                              lng: o.lng ? String(o.lng) : ''
                            });
                            setShowEditModal(true);
                          }}
                        >
                          {o.name}
                        </a>
                      </td>
                      <td className="text-center">{o.ports}</td>
                      <td><span className="label label-default" style={{ backgroundColor: '#e2e8f0', color: '#4a5568' }}>{o.zone?.name || 'Unassigned'}</span></td>
                      <td>
                        {o.lat && o.lng ? (
                          <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer" style={{ color: '#d9534f' }}>
                            <i className="fa fa-map-marker text-danger"></i> {o.lat}, {o.lng}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(o.id)}>
                          <i className="fa fa-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {odbs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted" style={{ padding: '35px' }}>
                        No Splitters found matching criteria. Click Add ODB (Splitter) to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD ODB MODAL */}
      {showAddModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAddSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h4 className="modal-title">Add ODB (Splitter)</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">ODB Name</label>
                    <input type="text" className="form-control" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Nr of ports</label>
                    <select className="form-control" value={addForm.ports} onChange={e => setAddForm({ ...addForm, ports: e.target.value })}>
                      <option value="4">4 Ports</option>
                      <option value="8">8 Ports</option>
                      <option value="16">16 Ports</option>
                      <option value="32">32 Ports</option>
                      <option value="64">64 Ports</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Zone</label>
                    <select className="form-control" value={addForm.zone_id} onChange={e => setAddForm({ ...addForm, zone_id: e.target.value })} required>
                      <option value="">Select a Zone</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small text-muted">Latitude</label>
                        <input type="text" className="form-control" placeholder="e.g. -6.175" value={addForm.lat} onChange={e => setAddForm({ ...addForm, lat: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small text-muted">Longitude</label>
                        <input type="text" className="form-control" placeholder="e.g. 106.827" value={addForm.lng} onChange={e => setAddForm({ ...addForm, lng: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save ODB</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ODB MODAL */}
      {showEditModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowEditModal(false)}>&times;</button>
                  <h4 className="modal-title">Edit ODB (Splitter)</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">ODB Name</label>
                    <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Nr of ports</label>
                    <select className="form-control" value={editForm.ports} onChange={e => setEditForm({ ...editForm, ports: e.target.value })}>
                      <option value="4">4 Ports</option>
                      <option value="8">8 Ports</option>
                      <option value="16">16 Ports</option>
                      <option value="32">32 Ports</option>
                      <option value="64">64 Ports</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Zone</label>
                    <select className="form-control" value={editForm.zone_id} onChange={e => setEditForm({ ...editForm, zone_id: e.target.value })} required>
                      <option value="">Select a Zone</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small text-muted">Latitude</label>
                        <input type="text" className="form-control" value={editForm.lat} onChange={e => setEditForm({ ...editForm, lat: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="small text-muted">Longitude</label>
                        <input type="text" className="form-control" value={editForm.lng} onChange={e => setEditForm({ ...editForm, lng: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update ODB</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT ODB MODAL */}
      {showImportModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleImportSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowImportModal(false)}>&times;</button>
                  <h4 className="modal-title">Import ODBs</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">Enter CSV rows (Format: Name, Ports, ZoneName, Lat, Lng)</label>
                    <textarea 
                      className="form-control" 
                      rows={8} 
                      placeholder='e.g.&#10;"ODB-01",8,"Zone Alpha",-6.17,106.8&#10;"ODB-02",16,"Zone Beta",-6.20,106.9'
                      value={importText} 
                      onChange={e => setImportText(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowImportModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Import</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
