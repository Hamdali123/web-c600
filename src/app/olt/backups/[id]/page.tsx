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
  
  // High fidelity mock data for backups
  const [backups, setBackups] = useState([
    { id: 1, date: '2026-05-28 03:12:45', lines: '12,504', size: '245 KB', type: 'Automatic Daily Backup' },
    { id: 2, date: '2026-05-27 03:10:11', lines: '12,492', size: '243 KB', type: 'Automatic Daily Backup' },
    { id: 3, date: '2026-05-26 14:32:00', lines: '12,490', size: '243 KB', type: 'Manual Backup' },
  ]);

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
  };

  const handleDownload = (backup: any) => {
    alert(`Downloading backup configuration: ${backup.date}`);
  };

  const handleRestore = (backup: any) => {
    if (confirm(`Are you sure you want to restore OLT settings to backup from ${backup.date}? This will overwrite current running configuration.`)) {
      alert("Restoring configuration... Please wait.");
      setTimeout(() => {
        alert("Configuration restored successfully!");
      }, 2000);
    }
  };

  const handleDelete = (backupId: number) => {
    if (confirm("Are you sure you want to delete this backup file?")) {
      setBackups(prev => prev.filter(b => b.id !== backupId));
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
