import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PasswordReveal from '@/components/PasswordReveal';
import SnmpTrafficChart from '@/components/SnmpTrafficChart';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

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

  let liveUptime = '';
  try {
    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as 'telnet' | 'ssh') || 'telnet',
      vendor: (olt.vendor as 'zte' | 'huawei') || 'zte'
    };
    const out = await executeOltCommand(creds, olt.vendor === 'huawei' ? 'display version' : 'show software');
    const m = out.match(/System uptime is (\d+) day\(s\), (\d+) hour\(s\), (\d+) minute\(s\)/i);
    if (m) liveUptime = `${m[1]} days, ${m[2]}:${String(m[3]).padStart(2, '0')}`;
  } catch (e) {
    console.error("Uptime fetch error:", e);
  }

  const uptimeStr = liveUptime || ((olt as any).uptime && (olt as any).uptime !== "0 days" ? (olt as any).uptime : "N/A");
  const tempStr = olt.temperature && olt.temperature > 0 ? `${olt.temperature}°C` : 'N/A';

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
                <td><PasswordReveal value={olt.telnet_user || ''} isUsername={true} /></td>
              </tr>
              <tr>
                <td>OLT telnet password</td>
                <td><PasswordReveal value={olt.telnet_pass || ''} /></td>
              </tr>
              <tr>
                <td>SNMP read-only community</td>
                <td><PasswordReveal value={olt.snmp_ro || ''} /></td>
              </tr>
              <tr>
                <td>SNMP read-write community</td>
                <td><PasswordReveal value={olt.snmp_rw || ''} /></td>
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
                  <a href="#" className="margin-left" style={{ marginLeft: '10px', color: '#337ab7' }}>Manage TR069 profiles</a>
                </td>
              </tr>
              <tr>
                <td>Default ONU TR069 interface</td>
                <td>
                  <select className="form-control" style={{ display: 'inline-block', width: 'auto', padding: '2px 10px', height: '26px' }}>
                    <option>Mgmt IP (recommended)</option>
                  </select>
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
        <div style={{ marginTop: '20px', width: '100%', maxWidth: '300px', margin: '20px auto 0' }}>
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
            <table className="table" style={{ marginBottom: 0, fontSize: '13px' }}>
              <tbody>
                <tr>
                  <td style={{ borderTop: 'none', verticalAlign: 'middle', textAlign: 'left' }}>
                    <i className="fa fa-cogs" style={{ color: '#888', marginRight: '5px' }}></i> Uptime
                  </td>
                  <td style={{ borderTop: 'none', textAlign: 'right' }}>
                    <i className="fa fa-refresh" style={{ color: '#888', marginRight: '5px', cursor: 'pointer' }}></i>
                    <span style={{ fontStyle: 'italic', color: '#555' }}>{uptimeStr}</span>, <span style={{ color: '#d9534f', fontWeight: 'bold' }}>{tempStr}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                    <i className="fa fa-fan" style={{ color: '#888', marginRight: '5px' }}></i> Fans
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-default btn-xs" style={{ backgroundColor: '#aaa', color: '#fff', border: 'none', padding: '2px 8px' }}>Configure</button>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', color: '#555' }}>Fan 0</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Auto: 48%</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', color: '#555' }}>Fan 1</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Auto: 48%</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', color: '#555' }}>Fan 2</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Auto: 48%</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', color: '#555' }}>Voltage</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>52.96 V</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', color: '#555' }}>Power usage</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>283.8 W</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <SnmpTrafficChart oltId={olt.id} />
      </div>
    </div>
  );
}
