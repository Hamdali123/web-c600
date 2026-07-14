"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [addForm, setAddForm] = useState({ name: '' });
  const [editForm, setEditForm] = useState({ id: 0, name: '' });
  const [importText, setImportText] = useState('');

  const fetchData = async () => {
    setLoading(false); // keep loading state if we want spinner
    try {
      const res = await fetch('/api/settings/zones');
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
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
      const res = await fetch('/api/settings/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name })
      });
      const data = await res.json();
      if (data.success) {
        setAddForm({ name: '' });
        setShowAddModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error adding zone");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/zones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editForm.id, name: editForm.name })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error updating zone");
    }
  };

  const handleDelete = async (id: number, count: number) => {
    if (count > 0) {
      alert("Cannot delete zone because it is currently assigned to one or more ONUs.");
      return;
    }
    if (!confirm("Are you sure you want to delete this Zone?")) return;
    try {
      const res = await fetch(`/api/settings/zones?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error deleting zone.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUnused = async () => {
    const unused = zones.filter(z => (z._count?.onus || 0) === 0);
    if (unused.length === 0) {
      alert("No unused zones found.");
      return;
    }
    if (!confirm(`Are you sure you want to delete all ${unused.length} unused zones?`)) return;
    
    try {
      for (const z of unused) {
        await fetch(`/api/settings/zones?id=${z.id}`, { method: 'DELETE' });
      }
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      alert("Please enter at least one zone name.");
      return;
    }
    try {
      let successCount = 0;
      for (const name of lines) {
        const res = await fetch('/api/settings/zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) successCount++;
      }
      alert(`Successfully imported ${successCount} zones.`);
      setImportText('');
      setShowImportModal(false);
      fetchData();
    } catch (err) {
      alert("Error during import");
    }
  };

  const handleExport = () => {
    const content = zones.map(z => z.name).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "smartolt_zones.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid content-wrap">
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>
        <i className="fa fa-map-marker"></i> Zones
      </h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px', marginBottom: '25px' }} />

      <div className="alert alert-info" style={{ fontSize: '13px' }}>
        Use zones to group ONUs per town, neighborhood or village. Zones are simple display separations with no influence on the ONU settings.
      </div>

      <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
        <button className="btn btn-success margin-right" style={{ marginRight: '5px' }} onClick={() => setShowAddModal(true)}>
          <span className="fa fa-plus"></span> Add zone
        </button>
        <button className="btn btn-danger margin-right" style={{ marginRight: '5px' }} onClick={handleDeleteUnused}>
          <span className="fa fa-trash"></span> Delete unused zones
        </button>
        <button className="btn btn-primary margin-right" style={{ marginRight: '5px' }} onClick={handleExport}>
          <span className="fa fa-download"></span> Export
        </button>
        <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
          <span className="fa fa-upload"></span> Import
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
                    <th>Name</th>
                    <th className="text-center">ONUs</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map(z => {
                    const count = z._count?.onus || 0;
                    return (
                      <tr key={z.id}>
                        <td>
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); setEditForm({ id: z.id, name: z.name }); setShowEditModal(true); }}
                            style={{ color: '#337ab7', fontWeight: 'bold' }}
                          >
                            {z.name}
                          </a>
                        </td>
                        <td className="text-center">
                          <Link href={`/onu/configured?zone_id=${z.id}&all=1`} style={{ color: '#337ab7' }}>
                            {count} ONUs
                          </Link>
                        </td>
                        <td className="text-right">
                          <button 
                            className="btn btn-danger btn-xs" 
                            onClick={() => handleDelete(z.id, count)}
                          >
                            <i className="fa fa-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {zones.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted" style={{ padding: '30px' }}>
                        No zones defined. Click &quot;Add zone&quot; to define your first network area.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD ZONE MODAL */}
      {showAddModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAddSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h4 className="modal-title">Add Zone</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Zone (Name)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={addForm.name} 
                      onChange={e => setAddForm({ name: e.target.value })} 
                      required 
                      placeholder="e.g. Village West, Block B"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Zone</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ZONE MODAL */}
      {showEditModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowEditModal(false)}>&times;</button>
                  <h4 className="modal-title">Edit Zone</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Zone (Name)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editForm.name} 
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Zone</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT ZONES MODAL */}
      {showImportModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleImportSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowImportModal(false)}>&times;</button>
                  <h4 className="modal-title">Import Zones</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Enter zone names (one per line)</label>
                    <textarea 
                      className="form-control" 
                      rows={10} 
                      value={importText} 
                      onChange={e => setImportText(e.target.value)} 
                      placeholder="Zone Alpha&#10;Zone Beta&#10;Zone Gamma"
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
