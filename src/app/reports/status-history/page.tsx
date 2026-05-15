"use client";

import { useEffect, useState } from 'react';
import DateDisplay from '@/components/DateDisplay';

export default function StatusHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/reports/status-history');
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0, fontWeight: 'bold' }}>Status History Report</h2>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="panel panel-default" style={{ marginTop: '20px' }}>
        <div className="table-responsive">
          <table className="table table-hover" style={{ fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th>Date / Time</th>
                <th>ONU Name</th>
                <th>SN / MAC</th>
                <th>New Status</th>
                <th>Details / Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '40px' }}><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '40px', color: '#999' }}>No status history records found.</td></tr>
              ) : (
                history.map((h: any) => (
                  <tr key={h.id}>
                    <td><small className="text-muted"><DateDisplay date={h.createdAt} /></small></td>
                    <td><strong>{h.onu_name}</strong></td>
                    <td className="text-muted">{h.sn_mac}</td>
                    <td>
                       <span className={`label ${h.status === 'Online' ? 'label-success' : 'label-danger'}`}>
                          {h.status}
                       </span>
                    </td>
                    <td>{h.reason || '-'}</td>
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
