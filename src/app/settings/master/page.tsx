"use client";

import { useState, useEffect } from 'react';

export default function MasterDataPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [odbs, setOdbs] = useState<any[]>([]);
  const [onuTypes, setOnuTypes] = useState<any[]>([]);
  const [speedProfiles, setSpeedProfiles] = useState<any[]>([]);
  
  const [newZone, setNewZone] = useState('');
  const [newOnuType, setNewOnuType] = useState('');
  const [newSpeedProfile, setNewSpeedProfile] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      setZones(data.zones || []);
      setOdbs(data.odbs || []);
      setOnuTypes(data.onuTypes || []);
      setSpeedProfiles(data.speedProfiles || []);
    } catch (e) {
      console.error("Gagal menarik data master", e);
    }
  };

  const handleAddZone = async (e: any) => {
    e.preventDefault();
    if (!newZone) return;
    await fetch('/api/settings/master/zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newZone })
    });
    setNewZone('');
    fetchMasterData();
  };

  const handleAddOnuType = async (e: any) => {
    e.preventDefault();
    if (!newOnuType) return;
    await fetch('/api/settings/master/onu-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newOnuType })
    });
    setNewOnuType('');
    fetchMasterData();
  };

  const handleAddSpeedProfile = async (e: any) => {
    e.preventDefault();
    if (!newSpeedProfile) return;
    await fetch('/api/settings/master/speed-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSpeedProfile })
    });
    setNewSpeedProfile('');
    fetchMasterData();
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, fontWeight: 'bold' }}>Master Data Settings</h2>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row" style={{ marginTop: '20px' }}>
        {/* Zones Panel */}
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}>
              <strong>Zones (Wilayah)</strong>
            </div>
            <div className="panel-body">
              <form onSubmit={handleAddZone} style={{ marginBottom: '15px' }}>
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Nama Zone baru" value={newZone} onChange={(e) => setNewZone(e.target.value)} />
                  <span className="input-group-btn">
                    <button className="btn btn-primary" type="submit">Tambah</button>
                  </span>
                </div>
              </form>
              <ul className="list-group">
                {zones.map(z => (
                  <li key={z.id} className="list-group-item">{z.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ONU Types Panel */}
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}>
              <strong>ONU Types (Tipe Modem)</strong>
            </div>
            <div className="panel-body">
              <form onSubmit={handleAddOnuType} style={{ marginBottom: '15px' }}>
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Contoh: ZTE-F609" value={newOnuType} onChange={(e) => setNewOnuType(e.target.value)} />
                  <span className="input-group-btn">
                    <button className="btn btn-primary" type="submit">Tambah</button>
                  </span>
                </div>
              </form>
              <ul className="list-group">
                {onuTypes.map(t => (
                  <li key={t.id} className="list-group-item">{t.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Speed Profiles Panel */}
        <div className="col-md-4">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}>
              <strong>Speed Profiles (Limitasi)</strong>
            </div>
            <div className="panel-body">
              <form onSubmit={handleAddSpeedProfile} style={{ marginBottom: '15px' }}>
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Contoh: 20Mbps" value={newSpeedProfile} onChange={(e) => setNewSpeedProfile(e.target.value)} />
                  <span className="input-group-btn">
                    <button className="btn btn-primary" type="submit">Tambah</button>
                  </span>
                </div>
              </form>
              <ul className="list-group">
                {speedProfiles.map(s => (
                  <li key={s.id} className="list-group-item">{s.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
