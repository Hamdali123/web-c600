"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OltHistoryPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [olt, setOlt] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const oltRes = await fetch(`/api/settings/olt/${id}`);
        const oltData = await oltRes.json();
        if (oltData && !oltData.error) {
          setOlt(oltData);
        }

        const logsRes = await fetch(`/api/settings/olt/${id}/history`);
        const logsData = await logsRes.json();
        if (logsData && !logsData.error) {
          setLogs(logsData);
        }
      } catch (e) {
        console.error("Error fetching OLT history:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x text-primary"></i></div>;
  }

  return (
    <div className="container-fluid content-wrap">
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/settings/olts/${id}`} className="btn btn-success">
          <i className="fa fa-arrow-left"></i> Back to OLT details
        </Link>
      </div>

      <div className="panel panel-default border-0 shadow-sm">
        <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
          <h3 className="panel-title" style={{ fontWeight: 'bold', color: '#333' }}>
            History for OLT: {olt ? olt.name : `ID ${id}`}
          </h3>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table className="table table-striped table-hover" style={{ margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ width: '25%' }}>Action</th>
                <th style={{ width: '45%' }}>Details</th>
                <th style={{ width: '15%' }}>User</th>
                <th style={{ width: '15%' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`label ${log.status === 'Success' ? 'label-success' : 'label-danger'}`} style={{ marginRight: '8px' }}>
                        {log.status}
                      </span>
                      <strong>{log.action}</strong>
                    </td>
                    <td className="text-muted small">{log.details}</td>
                    <td>{log.user ? log.user.name : 'System'}</td>
                    <td>{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: '30px' }}>
                    No history logs found for this OLT.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
