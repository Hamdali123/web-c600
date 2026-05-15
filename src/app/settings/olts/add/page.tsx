"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddOltPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oltForm, setOltForm] = useState({ 
    name: '', ipAddress: '', telnetPort: 23, username: '', password: '', 
    snmpRo: 'public', snmpRw: 'private', snmpPort: 161, snmpVersion: 'v2c',
    manufacturer: 'ZTE', hardwareVersion: 'ZTE C600', ponTypes: 'GPON', iptvIntegration: false,
    protocol: 'telnet', vendor: 'zte', timeout: 10, signalThreshold: -27.0
  });

  const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     try {
        const res = await fetch('/api/settings/olt', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(oltForm) 
        });
        const data = await res.json();
        if (data.success) { 
          router.push('/settings/olts');
        } else { 
          alert("Error: " + data.error); 
        }
     } catch (e) { 
        alert("Server error!"); 
     }
     setLoading(false);
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>Add OLT</h3>
      <p className="text-muted">Fill out the form below to add a new physical OLT device.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="panel panel-default" style={{ maxWidth: '800px', marginTop: '20px' }}>
        <div className="panel-heading" style={{ backgroundColor: '#2d323e', color: '#fff' }}>
          <strong>OLT Configuration</strong>
        </div>
        <div className="panel-body">
          <form className="form-horizontal" onSubmit={handleSave}>
            {/* Basic Info */}
            <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Basic Information</h5>
            
            <div className="form-group">
              <label className="col-sm-3 control-label">Name</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" placeholder="e.g. OLT-SANWANI" value={oltForm.name} onChange={e => setOltForm({...oltForm, name: e.target.value})} required />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">OLT IP / FQDN</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" placeholder="e.g. 103.68.214.171" value={oltForm.ipAddress} onChange={e => setOltForm({...oltForm, ipAddress: e.target.value})} required />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Telnet TCP Port</label>
              <div className="col-sm-9">
                <input type="number" className="form-control" value={oltForm.telnetPort} onChange={e => setOltForm({...oltForm, telnetPort: parseInt(e.target.value)})} required />
              </div>
            </div>

            {/* Credentials */}
            <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>Authentication Credentials</h5>
            
            <div className="form-group">
              <label className="col-sm-3 control-label">Username</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" value={oltForm.username} onChange={e => setOltForm({...oltForm, username: e.target.value})} required />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Password</label>
              <div className="col-sm-9">
                <input type="password" title="Password" className="form-control" value={oltForm.password} onChange={e => setOltForm({...oltForm, password: e.target.value})} required />
              </div>
            </div>

            {/* Hardware & Advanced */}
            <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>Hardware Details</h5>
            
            <div className="form-group">
              <label className="col-sm-3 control-label">Manufacturer</label>
              <div className="col-sm-9">
                 <select className="form-control" value={oltForm.vendor} onChange={e => setOltForm({...oltForm, vendor: e.target.value})}>
                    <option value="zte">ZTE</option>
                    <option value="huawei">Huawei</option>
                 </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Hardware Version</label>
              <div className="col-sm-9">
                 <select className="form-control" value={oltForm.hardwareVersion} onChange={e => setOltForm({...oltForm, hardwareVersion: e.target.value})}>
                    <option>ZTE C600</option>
                    <option>ZTE C320</option>
                    <option>ZTE C300</option>
                    <option>Huawei MA5608T</option>
                    <option>Huawei MA5680T</option>
                    <option>Huawei MA5800-X7</option>
                 </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">PON Types</label>
              <div className="col-sm-9">
                 <div style={{ display: 'flex', gap: '15px', paddingTop: '7px' }}>
                    <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                       <input type="radio" name="ponTypes" value="GPON" checked={oltForm.ponTypes === 'GPON'} onChange={e => setOltForm({...oltForm, ponTypes: e.target.value})} style={{ marginRight: '5px' }} />
                       GPON
                    </label>
                    <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                       <input type="radio" name="ponTypes" value="EPON" checked={oltForm.ponTypes === 'EPON'} onChange={e => setOltForm({...oltForm, ponTypes: e.target.value})} style={{ marginRight: '5px' }} />
                       EPON
                    </label>
                    <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                       <input type="radio" name="ponTypes" value="Both" checked={oltForm.ponTypes === 'Both'} onChange={e => setOltForm({...oltForm, ponTypes: e.target.value})} style={{ marginRight: '5px' }} />
                       Both
                    </label>
                 </div>
              </div>
            </div>

            <div className="form-group">
              <div className="col-sm-offset-3 col-sm-9">
                 <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                    <input type="checkbox" checked={oltForm.iptvIntegration} onChange={e => setOltForm({...oltForm, iptvIntegration: e.target.checked})} style={{ marginRight: '8px' }} />
                    Enable IPTV Integration module
                 </label>
              </div>
            </div>

            {/* SNMP */}
            <h5 style={{ fontWeight: 'bold', color: '#337ab7', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>SNMP Configuration</h5>
            
            <div className="form-group">
              <label className="col-sm-3 control-label">SNMP UDP Port</label>
              <div className="col-sm-9">
                <input type="number" className="form-control" value={oltForm.snmpPort} onChange={e => setOltForm({...oltForm, snmpPort: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Read Community</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" value={oltForm.snmpRo} onChange={e => setOltForm({...oltForm, snmpRo: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-sm-3 control-label">Write Community</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" value={oltForm.snmpRw} onChange={e => setOltForm({...oltForm, snmpRw: e.target.value})} />
              </div>
            </div>

            <hr />
            <div className="form-group">
              <div className="col-sm-offset-3 col-sm-9">
                <button type="submit" className="btn btn-success" disabled={loading} style={{ marginRight: '10px' }}>
                  <i className={loading ? "fa fa-spinner fa-spin" : "fa fa-save"}></i> Save OLT
                </button>
                <Link href="/settings/olts" className="btn btn-default">Cancel</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
