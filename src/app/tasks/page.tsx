"use client";

import { useEffect } from 'react';

export default function TasksPage() {
  // Next.js body class effect to match standard background
  useEffect(() => {
    document.body.className = 'responsive-background';
    return () => {
      document.body.className = '';
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
                <th className="col-md-2">Type</th>
                <th className="col-md-3">Action</th>
                <th className="col-md-1 text-center">Status</th>
                <th className="col-md-4">Message</th>
                <th className="col-md-2">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-center text-muted" style={{ padding: '40px' }}>
                  No batch tasks have been executed yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
