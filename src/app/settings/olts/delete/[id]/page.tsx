"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DeleteOltPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [olt, setOlt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    const fetchOlt = async () => {
      try {
        const res = await fetch(`/api/settings/olt/${id}`);
        const data = await res.json();
        if (data && !data.error) {
          setOlt(data);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchOlt();
  }, [id]);

  const handleDelete = async () => {
    if (!deleteReason) {
      alert('Please provide a reason for deleting this OLT.');
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/settings/olt?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReason })
      });
      const data = await res.json();
      
      if (data.success) {
        router.push('/settings/olts');
      } else {
        alert("Error deleting OLT: " + data.error);
        setIsDeleting(false);
      }
    } catch (e) {
      alert("Server error during deletion");
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="text-center" style={{marginTop: '50px'}}><i className="fa fa-spinner fa-spin fa-3x"></i></div>;

  if (!olt) return <div className="alert alert-danger" style={{marginTop: '20px'}}>OLT not found!</div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, fontWeight: 'bold', color: '#d9534f' }}>
        <i className="fa fa-warning"></i> Delete OLT: {olt.name}
      </h3>
      <hr style={{ borderColor: '#d9534f', borderWidth: '2px', width: '50px', marginLeft: 0, marginTop: '10px' }} />

      <div className="panel panel-danger" style={{ maxWidth: '600px', marginTop: '20px' }}>
        <div className="panel-heading">
          <strong>Confirm Deletion</strong>
        </div>
        <div className="panel-body">
          <div className="alert alert-warning">
            <i className="fa fa-exclamation-triangle"></i> 
            <strong> Warning:</strong> You are about to permanently delete the physical OLT device <strong>{olt.name} ({olt.ip_address})</strong> from the system. 
            This action cannot be undone. All associated data will be removed.
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Reason for deletion (Required)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Device retired, Replaced with new unit" 
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>

          <hr />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-danger" 
              onClick={handleDelete} 
              disabled={isDeleting || !deleteReason}
            >
              <i className={isDeleting ? "fa fa-spinner fa-spin" : "fa fa-trash"}></i> 
              Yes, Delete {olt.name}
            </button>
            <Link href="/settings/olts" className="btn btn-default">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
