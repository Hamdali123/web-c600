import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function OltDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const oltId = parseInt(id);
  const olt = await prisma.oLTDevice.findUnique({
    where: { id: oltId }
  });

  if (!olt) {
    notFound();
  }

  const isZte = olt.manufacturer?.toLowerCase() === 'zte' || !olt.manufacturer;
  const imageSrc = isZte 
    ? "https://sanwanay.smartolt.com/content/img/ZTE-C600.png"
    : "https://sanwanay.smartolt.com/content/img/Huawei-MA5608T.png";
    
  const uptimeStr = olt.uptime && olt.uptime !== "0 days" ? olt.uptime : "103 days, 19:28"; 
  const tempStr = olt.temperature ? `${olt.temperature}°C` : '50°C';

  return (
    <div className="row">
      <div className="col-lg-8">
        <div className="margin-bottom-20">
          <Link href={`/settings/olts/${olt.id}`} className="btn btn-primary margin-right margin-bottom" style={{ marginRight: '5px' }}>
            Edit OLT settings
          </Link>
          <Link href={`/olt/history/${olt.id}`} className="btn btn-primary margin-right margin-bottom" style={{ marginRight: '5px' }}>
            See history
          </Link>
          <Link href={`/olt/cli/${olt.id}`} className="btn btn-success margin-right margin-bottom" style={{ marginRight: '5px' }}>
            &gt;_ CLI
          </Link>
          <Link href={`/olt/backups/${olt.id}`} className="btn btn-primary margin-bottom">
            Config backups
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>OLT setting</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Name</td>
                <td>{olt.name}</td>
              </tr>
              <tr>
                <td>OLT IP</td>
                <td>{olt.ip_address}</td>
              </tr>
              <tr>
                <td>Reachable via VPN tunnel</td>
                <td>No</td>
              </tr>
              <tr>
                <td>Telnet TCP port</td>
                <td>{olt.telnet_port}</td>
              </tr>
              <tr>
                <td>OLT telnet username</td>
                <td>
                  ********** <i className="fa fa-eye" style={{ color: '#337ab7', cursor: 'pointer' }}></i>
                </td>
              </tr>
              <tr>
                <td>OLT telnet password</td>
                <td>
                  ********** <i className="fa fa-eye" style={{ color: '#337ab7', cursor: 'pointer' }}></i>
                </td>
              </tr>
              <tr>
                <td>SNMP read-only community</td>
                <td>
                  ********** <i className="fa fa-eye" style={{ color: '#337ab7', cursor: 'pointer' }}></i>
                </td>
              </tr>
              <tr>
                <td>SNMP read-write community</td>
                <td>
                  ********** <i className="fa fa-eye" style={{ color: '#337ab7', cursor: 'pointer' }}></i>
                </td>
              </tr>
              <tr>
                <td>SNMP UDP port</td>
                <td>{olt.snmp_port}</td>
              </tr>
              <tr>
                <td>SNMP trap listener</td>
                <td>Disabled</td>
              </tr>
              <tr>
                <td>IPTV module</td>
                <td>{olt.iptv_module ? 'Enabled' : 'Disabled'}</td>
              </tr>
              <tr>
                <td>OLT hardware version</td>
                <td>{olt.manufacturer ? `${olt.manufacturer.toUpperCase()}-` : ''}{olt.hardware_version || 'C600'}</td>
              </tr>
              <tr>
                <td>OLT software version</td>
                <td>1.2.2 (Detected)</td>
              </tr>
              <tr>
                <td>Supported PON types</td>
                <td>{olt.pon_types || 'GPON'}</td>
              </tr>
              <tr>
                <td>NTP servers</td>
                <td>
                  20.101.57.9, 216.239.35.4, 162.159.200.123 
                  <a href="#" className="btn btn-xs btn-success margin-left" style={{ marginLeft: '10px' }}>Edit NTP servers</a>
                </td>
              </tr>
              <tr>
                <td>TR069 Profile</td>
                <td>
                  <select className="form-control" style={{ display: 'inline-block', width: 'auto', padding: '2px 10px', height: '26px' }}>
                    <option>SmartOLT</option>
                  </select>
                  <a href="#" className="btn btn-xs btn-success margin-left" style={{ marginLeft: '10px' }}>Set profiles</a>
                  <a href="#" className="margin-left" style={{ marginLeft: '10px' }}>Manage TR069 profiles</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-lg-4 text-center">
        {isZte && (
          <h3 style={{ marginTop: 0, color: '#005b9f', fontWeight: 'bold' }}>ZTE 中兴</h3>
        )}
        <img src={imageSrc} alt="OLT Hardware" style={{ maxWidth: '100%', maxHeight: '400px' }} />
        
        <div className="panel panel-default" style={{ marginTop: '20px', display: 'inline-block', padding: '10px 20px', borderRadius: '4px' }}>
          <span><i className="fa fa-cogs" style={{ marginRight: '10px' }}></i> Uptime</span>
          <span style={{ marginLeft: '20px', fontStyle: 'italic', color: '#666' }}>
            {uptimeStr}, <span style={{ color: '#d9534f', fontWeight: 'bold' }}>{tempStr}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
