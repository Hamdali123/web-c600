"use client";

export default function TasksPage() {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}><i className="fa fa-tasks"></i> Scheduled Tasks</h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />
      
      <div className="alert alert-info">
        <i className="fa fa-info-circle"></i> No scheduled tasks running at the moment.
      </div>
      
      <div className="panel panel-default">
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Frequency</th>
                <th>Last Run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>OLT Radar (Auto-discovery)</td>
                <td>Every 1 minute</td>
                <td>{new Date().toLocaleTimeString()}</td>
                <td><span className="label label-success">Running</span></td>
              </tr>
              <tr>
                <td>ONU Status Sync</td>
                <td>Every 2 minutes</td>
                <td>{new Date().toLocaleTimeString()}</td>
                <td><span className="label label-success">Running</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
