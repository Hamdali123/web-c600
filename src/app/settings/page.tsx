"use client";

import Link from 'next/link';

const categories = [
  { name: 'Zones', icon: 'fa-map-marker', link: '/settings/zones', desc: 'Geographical organization' },
  { name: 'ODBs', icon: 'fa-archive', link: '/settings/odbs', desc: 'Optical Distribution Boxes' },
  { name: 'ONU Types', icon: 'fa-hdd-o', link: '/settings/onu-types', desc: 'Hardware model database' },
  { name: 'Speed Profiles', icon: 'fa-bolt', link: '/settings/speed-profiles', desc: 'Bandwidth limit profiles' },
  { name: 'OLTs', icon: 'fa-server', link: '/settings/olts', desc: 'Manage physical OLT devices' },
  { name: 'VPN & TR069', icon: 'fa-shield', link: '/settings/vpn-tr069', desc: 'Secure tunnel and remote management' },
  { name: 'Authorization Presets', icon: 'fa-magic', link: '/settings/auth-presets', desc: '1-click authorization templates' },
  { name: 'General', icon: 'fa-cogs', link: '/settings/general', desc: 'General system configuration' },
];

export default function SettingsDashboard() {
  return (
    <div>
      <h2 style={{ marginTop: 0, fontWeight: 'bold' }}>Settings</h2>
      <p className="text-muted">Configure and customize your SmartOLT local instance.</p>
      <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="row" style={{ marginTop: '30px' }}>
        {categories.map((cat, idx) => (
          <div className="col-md-3 col-sm-6" key={idx} style={{ marginBottom: '20px' }}>
            <Link href={cat.link} style={{ textDecoration: 'none' }}>
              <div className="panel panel-default text-center" style={{ padding: '20px', transition: 'all 0.3s', cursor: 'pointer', border: '1px solid #ddd' }}>
                <div className="panel-body">
                  <i className={`fa ${cat.icon}`} style={{ fontSize: '40px', color: '#337ab7', marginBottom: '15px' }}></i>
                  <h4 style={{ fontWeight: 'bold', color: '#333' }}>{cat.name}</h4>
                  <p className="small text-muted" style={{ minHeight: '30px' }}>{cat.desc}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .panel:hover {
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transform: translateY(-5px);
          border-color: #337ab7 !important;
        }
      `}</style>
    </div>
  );
}
