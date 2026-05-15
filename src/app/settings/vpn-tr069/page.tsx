"use client";

import { useEffect, useState } from 'react';

export default function VpnTr069Page() {
  const [vpnStatus, setVpnStatus] = useState('Disconnected');
  const [tr069Url, setTr069Url] = useState('http://acs.smartolt.com:7547/acs');

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>VPN & TR069 Configuration</h3>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row">
        <div className="col-md-6">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>VPN Tunnel (L2TP/PPTP)</strong></div>
            <div className="panel-body text-center" style={{ padding: '40px' }}>
              <i className="fa fa-shield" style={{ fontSize: '60px', color: '#888', marginBottom: '20px' }}></i>
              <h4>VPN Status: <span className="label label-danger">{vpnStatus}</span></h4>
              <p className="text-muted small">Connect your OLT to the SmartOLT cloud via a secure VPN tunnel.</p>
              <button className="btn btn-primary" disabled>Setup VPN Connection</button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="panel panel-default">
            <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}><strong>TR-069 (ACS) Settings</strong></div>
            <div className="panel-body">
              <div className="form-group">
                <label className="small text-muted">ACS URL</label>
                <input type="text" className="form-control" value={tr069Url} readOnly />
              </div>
              <div className="form-group">
                <label className="small text-muted">ACS Username</label>
                <input type="text" className="form-control" value="smartolt" readOnly />
              </div>
              <p className="small text-muted">Use these settings in your ONU configuration to enable remote management via TR-069.</p>
              <button className="btn btn-default btn-sm" disabled>Regenerate Credentials</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
