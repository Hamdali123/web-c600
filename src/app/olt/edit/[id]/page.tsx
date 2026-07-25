"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const OLT_SOFTWARE_VERSIONS = [
  {"id":"1","name":"1.2","display_name":"1.2.x","generation":"C300"},
  {"id":"15","name":"1.2","display_name":"1.2.x","generation":"C200"},
  {"id":"13","name":"1.1.C6xx","display_name":"1.x.x","generation":"C600"},
  {"id":"2","name":"2","display_name":"2.x","generation":"C300"},
  {"id":"9","name":"R008","display_name":"R008","generation":"MA"},
  {"id":"3","name":"R009","display_name":"R009","generation":"MA"},
  {"id":"11","name":"R018","display_name":"R018","generation":"MA"},
  {"id":"23","name":"R026","display_name":"R026","generation":"MA"}
];

const OLT_TYPES = [
  {"id":"26","name":"Huawei-EA5800-X15","shelf":"0","type":"huawei","generation":"MA"},
  {"id":"14","name":"Huawei-MA5600T","shelf":"0","type":"huawei","generation":"MA"},
  {"id":"3","name":"ZTE-C220","shelf":"0","type":"zte","generation":"C200"},
  {"id":"1","name":"ZTE-C300","shelf":"1","type":"zte","generation":"C300"},
  {"id":"2","name":"ZTE-C320","shelf":"1","type":"zte","generation":"C300"},
  {"id":"15","name":"ZTE-C600","shelf":"1","type":"zte","generation":"C600"},
  {"id":"20","name":"ZTE-C620","shelf":"1","type":"zte","generation":"C600"},
];

export default function EditOltPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loadingOlt, setLoadingOlt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    olt_ip: '',
    telnet_port: '23',
    olt_user: '',
    olt_password: '',
    snmp_ro_community: '',
    snmp_rw_community: '',
    snmp_port: '161',
    iptv: false,
    manufacturer: 'zte',
    olt_hardware_version: 'ZTE-C600',
    olt_version: '1.2.2',
    supported_pon_types: 'GPON'
  });

  const [hardwareOptions, setHardwareOptions] = useState<any[]>([]);
  const [softwareOptions, setSoftwareOptions] = useState<any[]>([]);
  const [isZte, setIsZte] = useState(true);
  const [isHuawei, setIsHuawei] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchOlt = async () => {
      try {
        const res = await fetch(`/api/settings/olt/${id}`);
        const data = await res.json();
        if (data && !data.error) {
          setFormData({
            name: data.name || '',
            olt_ip: data.ip_address || '',
            telnet_port: String(data.telnet_port || '23'),
            olt_user: data.telnet_user || '',
            olt_password: data.telnet_pass || '',
            snmp_ro_community: data.snmp_ro || '',
            snmp_rw_community: data.snmp_rw || '',
            snmp_port: String(data.snmp_port || '161'),
            iptv: data.iptv_module === true,
            manufacturer: data.manufacturer || 'zte',
            olt_hardware_version: data.hardware_version || 'ZTE-C600',
            olt_version: '1.2.2',
            supported_pon_types: data.pon_types || 'GPON'
          });
        }
      } catch (e) {
        console.error("Error fetching OLT details:", e);
      } finally {
        setLoadingOlt(false);
      }
    };
    fetchOlt();
  }, [id]);

  useEffect(() => {
    const hwOpts = OLT_TYPES.filter(t => t.type === formData.manufacturer);
    setHardwareOptions(hwOpts);
    
    if (hwOpts.length > 0 && !hwOpts.find(h => h.name === formData.olt_hardware_version)) {
      setFormData(prev => ({ ...prev, olt_hardware_version: hwOpts[0].name }));
    }

    const _isHuawei = formData.manufacturer === 'huawei';
    const _isZte = formData.manufacturer === 'zte';
    setIsHuawei(_isHuawei);
    setIsZte(_isZte);
    
  }, [formData.manufacturer]);

  useEffect(() => {
    const hw = OLT_TYPES.find(t => t.name === formData.olt_hardware_version);
    if (hw) {
      const swOpts = OLT_SOFTWARE_VERSIONS.filter(sw => sw.generation === hw.generation);
      setSoftwareOptions(swOpts);
      
      if (isZte) {
         const highest = swOpts.length > 0 ? swOpts[swOpts.length - 1].name : "2";
         setFormData(prev => ({ ...prev, olt_version: highest }));
      } else if (isHuawei) {
         setFormData(prev => ({ ...prev, olt_version: "R018" }));
      }
    }
  }, [formData.olt_hardware_version, isZte, isHuawei]);

  const handleIpChange = (val: string) => {
    setFormData(prev => ({ ...prev, olt_ip: val }));
    const privateIPv4Pattern = /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.(6[4-9]|[78]\d|9[0-9]|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|136\.1\.1\.\d{1,3}$/;
    if (privateIPv4Pattern.test(val)) {
      setFormData(prev => ({ ...prev, telnet_port: '23', snmp_port: '161' }));
    }
  };

  const handleTestConnection = async (e: any) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await fetch('/api/settings/olt/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           test_only: true,
           ip: formData.olt_ip,
           port: parseInt(formData.telnet_port),
           username: formData.olt_user,
           password: formData.olt_password,
           vendor: formData.manufacturer
        })
      });
      const data = await res.json();
      if (data.success) alert('Connection Successful!');
      else alert('Connection Failed: ' + data.error);
    } catch (e: any) {
      alert('Error testing connection');
    }
    setTesting(false);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/olt/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           name: formData.name,
           ipAddress: formData.olt_ip,
           telnetPort: parseInt(formData.telnet_port),
           username: formData.olt_user,
           password: formData.olt_password,
           snmpRo: formData.snmp_ro_community,
           snmpRw: formData.snmp_rw_community,
           snmpPort: parseInt(formData.snmp_port),
           manufacturer: formData.manufacturer,
           hardwareVersion: formData.olt_hardware_version,
           ponTypes: formData.supported_pon_types,
           iptv: formData.iptv
        })
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/settings/olts/${id}`);
      } else {
        alert('Failed to save: ' + data.error);
      }
    } catch (e: any) {
      alert('Error saving OLT');
    }
    setLoading(false);
  };

  if (loadingOlt) {
    return <div className="text-center" style={{ marginTop: '50px' }}><i className="fa fa-spinner fa-spin fa-3x text-primary"></i></div>;
  }

  return (
    <div className="container-fluid content-wrap">
      <h2>Edit OLT settings</h2>
      <form className="form-horizontal" onSubmit={handleSave} acceptCharset="utf-8">
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="name">Name</label>
          <div className="col-sm-8">
            <input type="text" id="name" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required title="The name of your OLT" />
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="olt_ip">OLT IP or FQDN</label>
          <div className="col-sm-8">
            <input type="text" id="olt_ip" className="form-control" value={formData.olt_ip} onChange={e => handleIpChange(e.target.value)} required title="The OLT IPv4 address or a valid FQDN" />
          </div>
        </div>

        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="telnet_port">Telnet TCP port</label>
          <div className="col-sm-8">
            <input type="text" id="telnet_port" className="form-control" value={formData.telnet_port} onChange={e => setFormData({...formData, telnet_port: e.target.value})} required />
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="olt_user">OLT telnet username</label>
          <div className="col-sm-8">
            <input type="text" id="olt_user" className="form-control" value={formData.olt_user} onChange={e => setFormData({...formData, olt_user: e.target.value})} required />
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="olt_password">OLT telnet password</label>
          <div className="col-sm-8" style={{ display: 'flex' }}>
            <input type={showPassword ? "text" : "password"} id="olt_password" className="form-control" value={formData.olt_password} onChange={e => setFormData({...formData, olt_password: e.target.value})} required />
            <button type="button" className="btn btn-default" style={{ marginLeft: '5px' }} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="snmp_ro_community">Snmp readonly community</label>
          <div className="col-sm-8">
            <input type="text" id="snmp_ro_community" className="form-control" value={formData.snmp_ro_community} onChange={e => setFormData({...formData, snmp_ro_community: e.target.value})} required />
            <div><span className="help-block small">Will be automatically created on the OLT</span></div>
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="snmp_rw_community">Snmp readwrite community</label>
          <div className="col-sm-8">
            <input type="text" id="snmp_rw_community" className="form-control" value={formData.snmp_rw_community} onChange={e => setFormData({...formData, snmp_rw_community: e.target.value})} required />
            <div><span className="help-block small">Will be automatically created on the OLT</span></div>
          </div>
        </div>
          
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="snmp_port">SNMP UDP port</label>
          <div className="col-sm-8">
            <input type="text" id="snmp_port" className="form-control" value={formData.snmp_port} onChange={e => setFormData({...formData, snmp_port: e.target.value})} required />
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="iptv">IPTV module</label>
          <div className="col-sm-8 checkbox padding-top">
            <label>
              <input type="checkbox" checked={formData.iptv} onChange={e => setFormData({...formData, iptv: e.target.checked})} /> Enable
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="manufacturer">Olt manufacturer</label>
          <div className="col-sm-8">
            <select id="manufacturer" className="form-control" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})}>
              <option value="huawei">Huawei</option>
              <option value="zte">ZTE</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="control-label col-sm-2" htmlFor="olt_hardware_version">OLT hardware version</label>
          <div className="col-sm-8">
            <select id="olt_hardware_version" className="form-control" value={formData.olt_hardware_version} onChange={e => setFormData({...formData, olt_hardware_version: e.target.value})}>
              {hardwareOptions.map(hw => (
                 <option key={hw.id} value={hw.name}>{hw.name}</option>
              ))}
            </select>    
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2">OLT software version</label>
          <div className="col-sm-8">
            <p className="form-control-static">{formData.olt_version} (Detected)</p>
          </div>
        </div>
        
        <div className="form-group">
          <label className="control-label col-sm-2 radio-inline">Supported PON types</label>
          <div className="col-sm-8">
            <label className="radio-inline">
              <input type="radio" value="GPON" checked={formData.supported_pon_types === 'GPON'} onChange={e => setFormData({...formData, supported_pon_types: e.target.value})} /> GPON
            </label>
            <label className="radio-inline">
              <input type="radio" value="EPON" checked={formData.supported_pon_types === 'EPON'} onChange={e => setFormData({...formData, supported_pon_types: e.target.value})} /> EPON
            </label>
            <label className="radio-inline">
              <input type="radio" value="GPON+EPON" checked={formData.supported_pon_types === 'GPON+EPON'} onChange={e => setFormData({...formData, supported_pon_types: e.target.value})} /> GPON+EPON
            </label>
          </div>
        </div>
        
        <div className="form-actions">
          <div className="col-sm-2"></div>
          <div className="col-sm-8">
            <button type="submit" className="btn btn-primary olt-submit" disabled={loading}>
              <i className="glyphicon glyphicon-file glyphicon-white"></i> {loading ? 'Saving...' : 'Save'}
            </button>
            <Link href={`/settings/olts/${id}`} className="btn btn-link">Cancel</Link>
            <button type="button" className="btn btn-success pull-right" onClick={handleTestConnection} disabled={testing}>
              {testing ? <i className="fa fa-spinner fa-spin"></i> : null} Test connection
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
