"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OltBackupsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [olt, setOlt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backups, setBackups] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBackups = async () => {
    try {
      const res = await fetch(`/api/settings/olt/${id}/backup`);
      const data = await res.json();
      if (data.success) setBackups(data.backups);
    } catch (e) {
      console.error("Error fetching backups:", e);
    }
  };

  useEffect(() => {
    const fetchOlt = async () => {
      try {
        const res = await fetch(`/api/settings/olt/${id}`);
        const data = await res.json();
        if (data && !data.error) {
          setOlt(data);
        }
      } catch (e) {
        console.error("Error fetching OLT details:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOlt();
    fetchBackups();

    // Fetch toggle status from localStorage if present
    const stored = localStorage.getItem(`olt_autobackup_${id}`);
    if (stored !== null) {
      setAutoBackup(stored === 'true');
    }
  }, [id]);

  const handleToggleAutoBackup = () => {
    const newVal = !autoBackup;
    setAutoBackup(newVal);
    localStorage.setItem(`olt_autobackup_${id}`, String(newVal));
    if (newVal) {
      fetch(`/api/settings/olt/${id}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true })
      }).then(() => fetchBackups()).catch(console.error);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: false })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Backup berhasil: ${data.file} (${data.size}, ${data.lines} baris)`);
        fetchBackups();
      } else {
        setMessage(`Gagal: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Gagal: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (backup: any) => {
    window.open(`/api/settings/olt/${id}/backup?download=${encodeURIComponent(backup.id)}`, '_blank');
  };

  const handleRestore = async (backup: any) => {
    if (!confirm(`Yakin restore konfigurasi OLT dari backup ${backup.date}? Ini akan menimpa running configuration saat ini.`)) return;
    setRestoring(true);
    setMessage('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/backup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: backup.id })
      });
      const data = await res.json();
      setMessage(data.success ? data.message : `Gagal: ${data.error}`);
    } catch (e: any) {
      setMessage(`Gagal: ${e.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm("Are you sure you want to delete this backup file?")) return;
    try {
      const res = await fetch(`/api/settings/olt/${id}/backup`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: backupId })
      });
      const data = await res.json();
      if (data.success) fetchBackups();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x text-primary"></i></div>;
  }

  return (
    <div className="container-fluid content-wrap">
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/settings/olts/${id}`} className="btn btn-success">
          <i className="fa fa-arrow-left"></i> Back to {olt ? olt.name : 'OLT Details'}
        </Link>
      </div>

      <div className="row">
        <div className="col-md-12">
          {/* Automatic Daily Backup Card */}
          <div className="panel panel-default border-0 shadow-sm" style={{ marginBottom: '20px' }}>
            <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#333' }}>
                  Automatic Daily Backup (03:00 AM - 04:00 AM):
                </strong>
                <p className="text-muted small" style={{ margin: '5px 0 0 0' }}>
                  When enabled, backups will be automatically created daily between 03:00 AM and 04:00 AM.
                </p>
              </div>
              <div>
                <button 
                  onClick={handleToggleAutoBackup}
                  className={`btn ${autoBackup ? 'btn-success' : 'btn-default'}`}
                  style={{ minWidth: '100px', fontWeight: 'bold' }}
                >
                  {autoBackup ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className="alert alert-info" style={{ marginBottom: '15px' }}>
              <i className="fa fa-info-circle"></i> {message}
            </div>
          )}

          {/* Manual Backup Button */}
          <div className="panel panel-default border-0 shadow-sm" style={{ marginBottom: '20px' }}>
            <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '16px', color: '#333' }}>Manual Backup</strong>
                <p className="text-muted small" style={{ margin: '5px 0 0 0' }}>
                  Ambil running-config langsung dari perangkat OLT dan simpan sebagai file backup.
                </p>
              </div>
              <div>
                <button onClick={handleCreateBackup} disabled={creating} className="btn btn-primary" style={{ minWidth: '140px', fontWeight: 'bold' }}>
                  <i className={`fa ${creating ? 'fa-spinner fa-spin' : 'fa-download'}`}></i> {creating ? 'Mengambil...' : 'Buat Backup'}
                </button>
              </div>
            </div>
          </div>

          {/* Backups List Table */}
          <div className="panel panel-default border-0 shadow-sm">
            <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
              <h3 className="panel-title" style={{ fontWeight: 'bold', color: '#333' }}>
                OLT Configuration Backups
              </h3>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              <table className="table table-striped table-hover" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th>Backup date</th>
                    <th>Backup lines</th>
                    <th>Backup size</th>
                    <th>Backup type</th>
                    <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 'bold', color: '#555' }}>{b.date}</td>
                      <td>{b.lines}</td>
                      <td>{b.size}</td>
                      <td>
                        <span className={`label ${b.type.includes('Automatic') ? 'label-info' : 'label-warning'}`}>
                          {b.type}
                        </span>
                      </td>
                      <td style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                        <button onClick={() => handleDownload(b)} className="btn btn-success btn-xs">
                          Download
                        </button>
                        <button onClick={() => handleRestore(b)} className="btn btn-warning btn-xs">
                          Restore backup
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-xs">
                          Del
                        </button>
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
