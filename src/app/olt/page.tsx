import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OltListingPage() {
  const olts = await prisma.oLTDevice.findMany({
    orderBy: { id: 'desc' }
  });

  return (
    <div className="container-fluid container-main">
      <div className="row">
        <div className="col-md-12">
          <h4 className="page-title">OLTs</h4>
          
          <div className="margin-bottom-20">
            <Link className="btn btn-success margin-bottom" href="/settings/olts/add">
              <span className="fa fa-plus"></span> Add OLT
            </Link>
            <a className="btn btn-primary margin-left margin-bottom export-button" style={{ marginLeft: '10px', cursor: 'pointer' }}>Export OLTs list</a>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover">
              <thead>
                <tr>
                  <th className="text-center">View</th>
                  <th className="text-center">
                    <a className="sort-link" href="#">
                      ID <i className="fa fa-chevron-down"></i>
                    </a>
                  </th>
                  <th className="text-center">Status</th>
                  <th>
                    <a className="sort-link" href="#">Name</a>
                  </th>
                  <th>
                    <a className="sort-link" href="#">OLT IP</a>
                  </th>
                  <th>
                    <a className="sort-link" href="#">TCP</a>
                  </th>
                  <th>
                    <a className="sort-link" href="#">UDP</a>
                  </th>
                  <th>
                    <a className="sort-link" href="#">OLT hardware version</a>
                  </th>
                  <th>
                    <a className="sort-link" href="#">OLT SW version</a>
                  </th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {olts.map((olt) => (
                  <tr key={olt.id}>
                    <td className="text-center">
                       <Link className="btn btn-success" href={`/olt/olt_details/${olt.id}/details`}>View</Link>
                    </td>
                    <td className="text-center">{olt.id}</td>
                    <td className="text-center">
                      <span className="status-dot green-dot" style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#5cb85c', borderRadius: '50%' }}></span>
                    </td>
                    <td>{olt.name}</td>
                    <td>{olt.ip_address}</td>
                    <td>{olt.telnet_port}</td>
                    <td>{olt.snmp_port}</td>
                    <td>{olt.manufacturer ? `${olt.manufacturer.toUpperCase()}-` : ''}{olt.hardware_version || 'C600'}</td>
                    <td>1.2.2</td>
                    <td className="text-center">
                      <button className="disable-olt btn btn-small btn-default margin-right" title="Disable OLT" style={{ marginRight: '5px' }}>
                        <i className="fa fa-eye-slash"></i>
                      </button>
                      <Link className="btn btn-small btn-danger" href={`/settings/olts/delete/${olt.id}`} title="Delete">
                        <i className="fa fa-trash"></i>
                      </Link>
                    </td>
                  </tr>
                ))}
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
