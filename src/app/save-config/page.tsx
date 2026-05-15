"use client";

import { useEffect, useState } from 'react';

export default function SaveConfigPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const fetchOlts = async () => {
      try {
        const res = await fetch('/api/settings/olt');
        const data = await res.json();
        setOlts(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchOlts();
  }, []);

  const handleSave = async (oltId: number) => {
    setSaving(oltId);
    try {
      const res = await fetch(`/api/olts/${oltId}/save-config`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Configuration saved successfully on OLT!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Connection error.');
    }
    setSaving(null);
  };

  return (
    <div style={{ padding: '0 5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>Save configuration</h1>
        <div style={{ color: '#777', fontSize: '13px' }}>
           <i className="fa fa-info-circle"></i> Save the running configuration to permanent memory.
        </div>
      </div>
      <div style={{ height: '3px', width: '40px', backgroundColor: '#337ab7', marginBottom: '25px' }}></div>

      <div className="row">
        {loading ? (
           <div className="col-md-12 text-center" style={{ padding: '100px' }}>
              <i className="fa fa-spinner fa-spin fa-3x text-muted"></i>
              <p style={{ marginTop: '15px', color: '#999' }}>Checking OLT status...</p>
           </div>
        ) : olts.length === 0 ? (
           <div className="col-md-12">
              <div className="alert alert-info">No OLT devices found in your settings.</div>
           </div>
        ) : olts.map((olt: any) => (
          <div className="col-md-4" key={olt.id}>
            <div className="panel panel-default border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <div className="panel-heading" style={{ backgroundColor: '#17243b', color: '#fff', border: 'none', padding: '15px' }}>
                 <i className="fa fa-hdd-o"></i> <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{olt.name}</span>
              </div>
              <div className="panel-body text-center" style={{ padding: '40px 20px' }}>
                <div style={{ marginBottom: '25px' }}>
                   <div style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>{olt.ip_address}</div>
                   <div style={{ fontSize: '12px', color: '#999' }}>Vendor: <span className="label label-default" style={{ textTransform: 'uppercase' }}>{olt.vendor || 'ZTE'}</span></div>
                </div>

                <div className="alert alert-warning small" style={{ backgroundColor: '#fcf8e3', border: '1px solid #faebcc', color: '#8a6d3b', marginBottom: '30px' }}>
                   <i className="fa fa-exclamation-triangle"></i> Configuration on this OLT might have unsaved changes.
                </div>

                <button 
                  className={`btn btn-lg ${saving === olt.id ? 'btn-default' : 'btn-primary'}`}
                  style={{ 
                    width: '100%', 
                    backgroundColor: saving === olt.id ? '#eee' : '#337ab7',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(51, 122, 183, 0.2)'
                  }}
                  onClick={() => handleSave(olt.id)}
                  disabled={saving !== null}
                >
                  {saving === olt.id ? (
                    <><i className="fa fa-spinner fa-spin"></i> Saving...</>
                  ) : (
                    <><i className="fa fa-save"></i> Save configuration</>
                  )}
                </button>
              </div>
              <div className="panel-footer" style={{ backgroundColor: '#fdfdfd', borderTop: '1px solid #eee', fontSize: '11px', color: '#aaa' }}>
                 Last attempt: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
