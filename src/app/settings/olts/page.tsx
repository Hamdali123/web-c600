"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OltsPage() {
  const router = useRouter();
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('main');

  const fetchData = async () => {
     try {
        const res = await fetch('/api/settings/olt');
        const data = await res.json();
        setOlts(Array.isArray(data) ? data : []);
     } catch (e) { 
        setOlts([]);
     }
     setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);



  if (loading) return <div className="text-center" style={{marginTop: '50px'}}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 'bold' }}><i className="fa fa-server"></i> OLT Management</h3>
          <hr style={{ borderColor: '#337ab7', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => router.push('/settings/olts/add')} style={{ backgroundColor: '#337ab7' }}>
            <i className="fa fa-plus"></i> Add OLT
          </button>
        </div>
      </div>

      <div className="row">
         <div className="col-md-12">

            <div className="panel panel-default">
               <div className="table-responsive">
                  <table className="table table-striped table-hover" style={{ fontSize: '13px' }}>
                     <thead>
                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                           <th>Name</th>
                           <th>IP / Vendor</th>
                           <th>Protocol</th>
                           <th className="text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {olts.map(o => (
                           <tr key={o.id}>
                             <td><strong>{o.name}</strong></td>
                             <td>{o.ip_address} <br/><small className="text-muted">{o.vendor?.toUpperCase()} ({o.hardware_version})</small></td>
                             <td><span className="label label-default">{o.protocol}</span></td>
                             <td className="text-right">
                               <button className="btn btn-primary btn-xs" style={{ marginRight: '5px', backgroundColor: '#337ab7' }} onClick={() => router.push(`/settings/olts/${o.id}`)}><i className="fa fa-eye"></i> View</button>
                               <button className="btn btn-info btn-xs" style={{ marginRight: '5px' }} onClick={async () => {
                                  const res = await fetch(`/api/settings/olt/test?id=${o.id}`, { method: 'POST' });
                                  const data = await res.json();
                                  alert(data.success ? "Connection Successful!" : "Failed: " + data.error);
                               }}><i className="fa fa-plug"></i> Test</button>
                               <button className="btn btn-danger btn-xs" onClick={() => router.push(`/settings/olts/delete/${o.id}`)}><i className="fa fa-trash"></i></button>
                             </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
