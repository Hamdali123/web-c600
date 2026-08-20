import prisma from '@/lib/prisma';
import OltActions from './OltActions';

export const dynamic = 'force-dynamic';

export default async function OltListingPage() {
  const olts = await prisma.oLTDevice.findMany({
    orderBy: { id: 'desc' }
  });

  const rows = olts.map(o => ({
    id: o.id,
    name: o.name,
    ip_address: o.ip_address,
    telnet_port: o.telnet_port,
    snmp_port: o.snmp_port,
    manufacturer: o.manufacturer,
    hardware_version: o.hardware_version,
    disabled: o.disabled,
    last_polled: o.last_polled ? o.last_polled.toISOString() : null
  }));

  return (
    <div className="container-fluid container-main">
      <div className="row">
        <div className="col-md-12">
          <h4 className="page-title">OLTs</h4>
          
          <div className="margin-bottom-20">
            <a className="btn btn-success margin-bottom" href="/settings/olts/add">
              <span className="fa fa-plus"></span> Add OLT
            </a>
            <OltActions olts={rows} />
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover">
              <thead>
                <tr>
                  <th className="text-center">View</th>
                  <th className="text-center">ID</th>
                  <th className="text-center">Status</th>
                  <th>Name</th>
                  <th>OLT IP</th>
                  <th>TCP</th>
                  <th>UDP</th>
                  <th>OLT hardware version</th>
                  <th>OLT SW version</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <OltActions olts={rows} mode="rows" />
                {olts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center">No OLTs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}