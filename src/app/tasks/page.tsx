"use client";

import { useEffect, useState } from 'react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.className = 'responsive-background';
    return () => {
      document.body.className = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setTasks(data);
      } catch (e) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="container-fluid content-wrap">
      <h2>Scheduled Tasks History</h2>

      <div className="alert alert-info" style={{ borderRadius: '4px', border: 'none', backgroundColor: '#d9edf7', color: '#31708f', marginTop: '20px' }}>
        <i className="fa fa-info-circle"></i> This page tracks the progress of background batch operations (like rebooting or deleting multiple ONUs).
        The background auto-discovery and synchronization processes run silently and are not listed here.
      </div>

      <div className="panel panel-default" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <i className="fa fa-tasks fa-fw"></i> Task History
        </div>
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th className="col-md-2">Action</th>
                <th className="col-md-2">OLT</th>
                <th className="col-md-1 text-center">Status</th>
                <th className="col-md-3">ONUs</th>
                <th className="col-md-1 text-center">Stopped by</th>
                <th className="col-md-3">Period</th>
              </tr>
            </thead>
            <tbody>
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '40px' }}>
                    <i className="fa fa-spinner fa-spin"></i> Loading...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '40px' }}>
                    No batch tasks have been executed yet.
                  </td>
                </tr>
              ) : tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div><strong>{task.action}</strong></div>
                    {task.action === 'Auto-Resync' && <i className="fa fa-refresh text-primary"></i>}
                    {task.action === 'Auto-Move' && <i className="fa fa-exchange text-warning"></i>}
                    {task.action === 'Auto-Authorize' && <i className="fa fa-check-circle text-success"></i>}
                  </td>
                  <td className="vertical-align-middle">
                    {task.olt ? `${task.olt.id} - ${task.olt.name}` : `OLT ${task.olt_id}`}
                  </td>
                  <td className="text-center vertical-align-middle">
                    {task.status === 'Finished' && <span className="label label-success"><i className="fa fa-check"></i> Finished</span>}
                    {task.status === 'Running' && <span className="label label-primary"><i className="fa fa-spinner fa-spin"></i> Running</span>}
                    {task.status === 'Stopped' && <span className="label label-warning"><i className="fa fa-stop"></i> Stopped</span>}
                  </td>
                  <td className="vertical-align-middle">
                    <div><small>Processed: <strong>{task.processed}</strong> | Successful: <strong>{task.successful}</strong> | Failed: <strong>{task.failed}</strong></small></div>
                    <div><small className="text-muted">{task.user_email || 'System'}</small></div>
                  </td>
                  <td className="text-center vertical-align-middle text-muted">{task.stopped_by || '-'}</td>
                  <td className="vertical-align-middle text-muted" style={{ fontSize: '12px' }}>
                    <div>From: {new Date(task.start_time).toLocaleString()}</div>
                    <div>To: {task.end_time ? new Date(task.end_time).toLocaleString() : '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}