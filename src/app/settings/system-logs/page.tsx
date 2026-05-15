"use client";

import { useEffect, useState } from 'react';
import DateDisplay from '@/components/DateDisplay';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/settings/system-logs');
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0, fontWeight: 'bold' }}>System Logs</h2>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="panel panel-default" style={{ marginTop: '20px' }}>
        <div className="table-responsive">
          <table className="table table-hover" style={{ fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th>Date / Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '40px', color: '#999' }}>No logs found.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id}>
                    <td><small className="text-muted"><DateDisplay date={log.createdAt} /></small></td>
                    <td>{log.user?.name || 'System'}</td>
                    <td><strong>{log.action}</strong></td>
                    <td>{log.details}</td>
                    <td>
                       <span className={`label ${log.status === 'Success' ? 'label-success' : 'label-danger'}`}>
                          {log.status}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
