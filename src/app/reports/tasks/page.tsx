"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

export default function TaskHistoryPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [olts, setOlts] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    olt: '0',
    user: 'Any',
    action: 'Any',
    from: '',
    to: ''
  });

  const fetchOlts = async () => {
    try {
      const res = await fetch('/api/settings/master');
      const data = await res.json();
      setOlts(data.olts || []);
    } catch (e) {}
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.olt && filters.olt !== '0') params.append('olt', filters.olt);
      if (filters.user !== 'Any') params.append('user', filters.user);
      if (filters.action !== 'Any') params.append('action', filters.action);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      
      const res = await fetch('/api/tasks?' + params.toString());
      const data = await res.json();
      setTasks(data);
    } catch (err) {} finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOlts();
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  return (
    <div className="container-fluid content-wrap">
      <div className="row margin-bottom">
        <div className="col-md-12">
          <form className="form-inline" onSubmit={e => e.preventDefault()}>
            <div className="form-group margin-right">
              <label className="control-label margin-right-sm">OLT</label>
              <select className="form-control" value={filters.olt} onChange={e => setFilters({...filters, olt: e.target.value})}>
                <option value="0">Any</option>
                {olts.map(o => <option key={o.id} value={o.id}>{o.id} - {o.name}</option>)}
              </select>
            </div>
            <div className="form-group margin-right">
              <label className="control-label margin-right-sm">User</label>
              <select className="form-control" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})}>
                <option value="Any">Any</option>
              </select>
            </div>
            <div className="form-group margin-right">
              <label className="control-label margin-right-sm">Action</label>
              <select className="form-control" value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Auto-Resync">Auto-Resync</option>
                <option value="Auto-Move">Auto-Move</option>
                <option value="Auto-Authorize">Auto-Authorize</option>
              </select>
            </div>
            <div className="form-group margin-right">
              <label className="control-label margin-right-sm">From</label>
              <input type="date" className="form-control" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} />
            </div>
            <div className="form-group margin-right">
              <label className="control-label margin-right-sm">To</label>
              <input type="date" className="form-control" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} />
            </div>
          </form>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <div className="table-responsive" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
            <table className="table table-striped table-hover" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Action</th>
                  <th>OLT</th>
                  <th>ONUs</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Period</th>
                  <th>Stopped by</th>
                </tr>
              </thead>
              <tbody>
                {loading && tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      <i className="fa fa-spinner fa-spin"></i> Loading...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No tasks found
                    </td>
                  </tr>
                ) : tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="vertical-align-middle">
                      <div><strong>{task.action}</strong></div>
                      {task.action === 'Auto-Resync' && <i className="fa fa-refresh text-primary"></i>}
                      {task.action === 'Auto-Move' && <i className="fa fa-exchange text-warning"></i>}
                      {task.action === 'Auto-Authorize' && <i className="fa fa-check-circle text-success"></i>}
                    </td>
                    <td className="vertical-align-middle">
                      {task.olt ? `${task.olt.id} - ${task.olt.name}` : `OLT ${task.olt_id}`}
                    </td>
                    <td className="vertical-align-middle">
                      <div><small>Processed: <strong>{task.processed}</strong></small></div>
                      <div><small>Successful: <strong>{task.successful}</strong></small></div>
                      <div><small>Failed: <strong>{task.failed}</strong></small></div>
                    </td>
                    <td className="vertical-align-middle text-muted">{task.user_email || 'System'}</td>
                    <td className="vertical-align-middle">
                      {task.status === 'Finished' && <span className="label label-success"><i className="fa fa-check"></i> Finished</span>}
                      {task.status === 'Running' && <span className="label label-primary"><i className="fa fa-spinner fa-spin"></i> Running</span>}
                      {task.status === 'Stopped' && <span className="label label-warning"><i className="fa fa-stop"></i> Stopped</span>}
                    </td>
                    <td className="vertical-align-middle text-muted" style={{ fontSize: '12px' }}>
                      <div>From: {new Date(task.start_time).toLocaleString()}</div>
                      <div>To: {task.end_time ? new Date(task.end_time).toLocaleString() : '-'}</div>
                    </td>
                    <td className="vertical-align-middle text-muted">{task.stopped_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
