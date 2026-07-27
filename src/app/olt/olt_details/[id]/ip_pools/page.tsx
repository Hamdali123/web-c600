"use client";

import { useEffect, useState, use } from 'react';

export default function OltIpPoolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [subTab, setSubTab] = useState<'mgmt' | 'wan'>('mgmt');

  const handleAddMgmtIps = () => {
    alert("This feature requires a database schema update for IP Pools. Please contact the administrator to migrate the database.");
  };

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '5px' }}>
        <button 
          className={`btn ${subTab === 'mgmt' ? 'btn-primary' : 'btn-default'}`} 
          onClick={() => setSubTab('mgmt')}
          style={subTab === 'mgmt' ? { backgroundColor: '#286090', borderColor: '#204d74' } : {}}
        >
          <i className="fa fa-server"></i> ONU MGMT IPs
        </button>
        <button 
          className={`btn ${subTab === 'wan' ? 'btn-success' : 'btn-default'}`} 
          onClick={() => setSubTab('wan')}
          style={subTab === 'wan' ? { color: '#fff', backgroundColor: '#5cb85c', borderColor: '#4cae4c' } : { color: '#5cb85c' }}
        >
          <i className="fa fa-globe"></i> ONU WAN Static IPs
        </button>
      </div>

      <h4 style={{ color: '#337ab7', marginBottom: '20px', fontWeight: 'bold' }}>
        {subTab === 'mgmt' ? 'ONU Management IP Pools' : 'ONU WAN Static IP Pools'}
      </h4>

      <div className="row" style={{ marginBottom: '20px' }}>
        <div className="col-md-2 col-sm-4 col-xs-6">
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase' }}>Pools</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          </div>
        </div>
        <div className="col-md-2 col-sm-4 col-xs-6">
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase' }}>Needs attention</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          </div>
        </div>
        <div className="col-md-2 col-sm-4 col-xs-6">
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase' }}>Used IPs</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          </div>
        </div>
        <div className="col-md-2 col-sm-4 col-xs-6">
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase' }}>Reserved IPs</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          </div>
        </div>
        <div className="col-md-2 col-sm-4 col-xs-6">
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '12px', color: '#777', textTransform: 'uppercase' }}>Available IPs</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          </div>
        </div>
      </div>

      <div style={{ border: '1px dashed #ccc', borderRadius: '4px', padding: '30px 20px', backgroundColor: '#fafafa' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#444' }}>
          <i className="fa fa-database" style={{ marginRight: '5px' }}></i> 
          No {subTab === 'mgmt' ? 'ONU MGMT' : 'ONU WAN'} IPs found
        </h4>
        <p style={{ color: '#777', marginBottom: '20px' }}>
          Define IP address pools for {subTab === 'mgmt' ? 'Management & VoIP' : 'Internet'} services. These pools will be used for Static IP allocation.
        </p>
        <button className="btn btn-primary" onClick={handleAddMgmtIps} style={{ backgroundColor: '#286090', borderColor: '#204d74' }}>
          <i className="fa fa-plus"></i> Add {subTab === 'mgmt' ? 'Mgmt' : 'WAN'} IPs
        </button>
      </div>
    </div>
  );
}
