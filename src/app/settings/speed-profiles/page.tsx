"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SpeedProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'download' | 'upload'>('download');

  // Sync / OLT fields
  const [olts, setOlts] = useState<any[]>([]);
  const [selectedOltId, setSelectedOltId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '', direction: 'download', use_prefix_suffix: 'No',
    type: 'Internet', speed: '50000', is_default: false
  });
  const [editForm, setEditForm] = useState({
    id: 0, name: '', direction: 'download', use_prefix_suffix: 'No',
    type: 'Internet', speed: '50000', is_default: false
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/speed-profiles');
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);

      const oltRes = await fetch('/api/settings/olt');
      const oltData = await oltRes.json();
      setOlts(Array.isArray(oltData) ? oltData : []);
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
      // Map to upload / download schema properties
      const isDownload = addForm.direction === 'download';
      const body = {
        name: addForm.name,
        download: isDownload ? parseInt(addForm.speed) : 0,
        upload: !isDownload ? parseInt(addForm.speed) : 0
      };

      const res = await fetch('/api/settings/speed-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setAddForm({
          name: '', direction: activeSubTab, use_prefix_suffix: 'No',
          type: 'Internet', speed: '50000', is_default: false
        });
        setShowAddModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error adding speed profile");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isDownload = editForm.direction === 'download';
      const body = {
        id: editForm.id,
        name: editForm.name,
        download: isDownload ? parseInt(editForm.speed) : 0,
        upload: !isDownload ? parseInt(editForm.speed) : 0
      };

      // We should support PUT on speed-profiles api. Let's create put handler or do POST
      const res = await fetch('/api/settings/speed-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error editing speed profile");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this speed profile?")) return;
    try {
      const res = await fetch(`/api/settings/speed-profiles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Server error deleting speed profile");
    }
  };

  const handleSync = async () => {
    if (!selectedOltId) return alert("Select an OLT first to sync profiles from it.");
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/settings/speed-profiles/sync?oltId=${selectedOltId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully synced ${data.count} Speed Profiles!`);
        fetchData();
      } else {
        alert("Sync failed: " + data.error);
      }
    } catch (e) {
      alert("Server error during sync");
    }
    setIsSyncing(false);
  };

  // Filter profiles based on selected direction tab
  const filteredProfiles = profiles.filter(p => {
    if (activeSubTab === 'download') return p.download > 0;
    return p.upload > 0;
  });

  return (
    <div className="container-fluid content-wrap">
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>
        <i className="fa fa-tachometer"></i> Speed profiles
      </h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px', marginBottom: '25px' }} />

      {/* Top Sync & Action Control Bar */}
      <div className="row" style={{ marginBottom: '20px' }}>
        <div className="col-md-3">
          <select 
            className="form-control input-sm" 
            value={selectedOltId} 
            onChange={e => setSelectedOltId(e.target.value)}
          >
            <option value="">Select OLT for Sync</option>
            {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <button 
            type="button" 
            className="btn btn-info btn-sm btn-block" 
            onClick={handleSync}
            disabled={isSyncing || !selectedOltId}
          >
            <i className={isSyncing ? "fa fa-spinner fa-spin" : "fa fa-refresh"}></i> Sync from OLT
          </button>
        </div>
        <div className="col-md-6 text-right">
          <button className="btn btn-success btn-sm" onClick={() => {
            setAddForm({ ...addForm, direction: activeSubTab });
            setShowAddModal(true);
          }}>
            <span className="fa fa-plus"></span> Add speed profile
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <ul className="nav nav-pills" style={{ marginBottom: '15px' }}>
        <li className={activeSubTab === 'download' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubTab('download'); }}>Download</a>
        </li>
        <li className={activeSubTab === 'upload' ? 'active' : ''}>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubTab('upload'); }}>Upload</a>
        </li>
      </ul>

      {/* Table */}
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
                    <th className="text-right">Speed</th>
                    <th className="text-center">ONUs</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(p => {
                   const speedVal = activeSubTab === 'download' ? p.download : p.upload;
                    const speedDisplay = `${speedVal.toLocaleString()} kbps`;
                    return (
                      <tr key={p.id}>
                        <td>
                          <a 
                            href="#" 
                            style={{ color: '#337ab7', fontWeight: 'bold' }}
                            onClick={(e) => {
                              e.preventDefault();
                              setEditForm({
                                id: p.id,
                                name: p.name,
                                direction: activeSubTab,
                                use_prefix_suffix: 'No',
                                type: 'Internet',
                                speed: String(speedVal),
                                is_default: false
                              });
                              setShowEditModal(true);
                            }}
                          >
                            {p.name}
                          </a>
                        </td>
                        <td className="text-right" style={{ fontFamily: 'monospace' }}>{speedDisplay}</td>
                        <td className="text-center">
                          <Link href={`/onu/configured?speed_profile_id=${p.id}&all=1`} style={{ color: '#337ab7' }}>
                            {p._count?.onus || 0} ONUs
                          </Link>
                        </td>
                        <td className="text-right">
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete(p.id)}>
                            <i className="fa fa-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted" style={{ padding: '30px' }}>
                        No {activeSubTab} speed profiles defined.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAddSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowAddModal(false)}>&times;</button>
                  <h4 className="modal-title">Add speed profile</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">Profile name</label>
                    <input type="text" className="form-control" placeholder="e.g. 50M, 100M" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Direction</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="download" checked={addForm.direction === 'download'} onChange={e => setAddForm({ ...addForm, direction: e.target.value })} /> Download
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="upload" checked={addForm.direction === 'upload'} onChange={e => setAddForm({ ...addForm, direction: e.target.value })} /> Upload
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Speed (in kbps)</label>
                    <input type="number" className="form-control" placeholder="e.g. 51200" value={addForm.speed} onChange={e => setAddForm({ ...addForm, speed: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <button type="button" className="close" onClick={() => setShowEditModal(false)}>&times;</button>
                  <h4 className="modal-title">Edit speed profile</h4>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="small text-muted">Profile name</label>
                    <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Direction</label>
                    <div style={{ marginTop: '5px' }}>
                      <label className="radio-inline" style={{ marginRight: '15px' }}>
                        <input type="radio" value="download" checked={editForm.direction === 'download'} onChange={e => setEditForm({ ...editForm, direction: e.target.value })} /> Download
                      </label>
                      <label className="radio-inline">
                        <input type="radio" value="upload" checked={editForm.direction === 'upload'} onChange={e => setEditForm({ ...editForm, direction: e.target.value })} /> Upload
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="small text-muted">Speed (in kbps)</label>
                    <input type="number" className="form-control" value={editForm.speed} onChange={e => setEditForm({ ...editForm, speed: e.target.value })} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Profile</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
