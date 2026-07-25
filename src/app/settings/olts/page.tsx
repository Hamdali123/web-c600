"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function OltsContent() {
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
     try {
        const res = await fetch('/api/settings/olt');
        if (res.ok) {
           const data = await res.json();
           setOlts(Array.isArray(data) ? data : []);
        } else {
           setOlts([]);
        }
     } catch (e) { 
        setOlts([]);
     }
     setLoading(false);
  };

  const handleExportCSV = () => {
    if (!olts || olts.length === 0) return alert('No data to export.');
    
    const headers = ['ID', 'Name', 'IP Address', 'Telnet Port', 'SNMP Port', 'Hardware Version', 'Software Version'];
    const rows = olts.map(o => [
       o.id, 
       `"${o.name}"`, 
       o.ip_address, 
       o.telnet_port, 
       o.snmp_port, 
       `"${o.hardware_version || ''}"`, 
       `"${o.software_version || ''}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `olts_list_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const handlePullOnus = async (id: number) => {
    if (!confirm('Are you sure you want to pull ONUs from this OLT? This will run in the background and may take a few minutes.')) return;
    try {
      const res = await fetch(`/api/settings/olt/${id}/pull`, { method: 'POST' });
      if (res.ok) {
        alert('Synchronization started successfully! ONUs will appear in the Configured ONUs list shortly.');
      } else {
        alert('Failed to start synchronization.');
      }
    } catch (e) {
      alert('Error connecting to server.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="container-fluid content-wrap">
      <h2>OLTs</h2>
      
      <Link href="/settings/olts/add" className="btn btn-primary margin-bottom">
        <i className="fa fa-plus"></i> Add OLT
      </Link>
      
      <button onClick={handleExportCSV} className="btn btn-success margin-left margin-bottom export-button">
        Export OLTs list
      </button>
      
      <table className="table table-striped">
        <thead>
          <tr>
            <th className="col-md-1 text-center">View</th>
            <th className="width-25"><a href="#" className="sort-link">ID <i className="fa fa-sort-asc" aria-hidden="true"></i></a></th>
            <th><a href="#" className="sort-link">Name </a></th>
            <th className="col-md-1"><a href="#" className="sort-link">OLT IP </a></th>
            <th className="col-md-1"><a href="#" className="sort-link">TCP </a></th>
            <th className="col-md-1"><a href="#" className="sort-link">UDP </a></th>
            <th className="col-md-2"><a href="#" className="sort-link">OLT hardware version </a></th>
            <th className="col-md-1"><a href="#" className="sort-link">OLT SW version </a></th>
            <th className="width-120 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
             <tr><td colSpan={9} className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x text-muted"></i></td></tr>
          ) : olts.length === 0 ? (
             <tr><td colSpan={9} className="text-center text-muted p-5">No OLTs configured.</td></tr>
          ) : olts.map(o => (
             <tr key={o.id}>
               <td className="text-center">
                  <Link href={`/olt/olt_details/${o.id}/details`} className="btn btn-primary">View</Link>
               </td>
               <td>{o.id}</td>
               <td>{o.name}</td>
               <td>{o.ip_address}</td>
               <td>{o.telnet_port || '23'}</td>
               <td>{o.snmp_port || '161'}</td>
               <td>{o.hardware_version || 'ZTE-C600'}</td>
               <td>{o.software_version || '1.2.2'}</td>
               <td className="text-center text-nowrap">
                  <button onClick={() => handlePullOnus(o.id)} className="btn btn-small btn-info margin-right" title="Pull ONUs / Synchronize">
                     <i className="fa fa-refresh"> </i>
                  </button>
                  <button onClick={() => alert("Disable feature not implemented yet.")} className="btn btn-small btn-default margin-right" title="Disable OLT">
                     <i className="fa fa-eye-slash"> </i>
                  </button>
                  <Link href={`/settings/olts/delete/${o.id}`} className="btn btn-small btn-danger" title="Delete">
                     <i className="fa fa-trash"> </i>
                  </Link>
               </td>
             </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OltsPage() {
  return (
    <Suspense fallback={<div className="text-center p-5"><i className="fa fa-spinner fa-spin fa-2x"></i></div>}>
      <OltsContent />
    </Suspense>
  );
}
