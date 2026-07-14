"use client";

import { useEffect, useState, use } from 'react';

export default function OltCardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCards = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${id}/cards`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch cards');
      }
      setCards(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [id]);

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={fetchCards} disabled={loading} style={{ backgroundColor: '#286090', borderColor: '#204d74' }}>
            <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh OLT cards info
          </button>
        </div>
        
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="table-responsive" style={{ background: '#fff', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table className="table table-hover" style={{ margin: 0, fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ width: '8%' }}>Slot</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '12%' }}>Real type</th>
                <th style={{ width: '8%' }}>Ports</th>
                <th style={{ width: '10%' }}>SW</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '10%' }}>Role</th>
                <th style={{ width: '15%' }}>Info updated</th>
                <th style={{ width: '15%' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && cards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center" style={{ padding: '40px' }}>
                    <i className="fa fa-spinner fa-spin fa-3x text-muted" style={{ marginBottom: '15px' }}></i>
                    <p className="text-muted" style={{ fontSize: '16px' }}>Fetching live card data from OLT...</p>
                  </td>
                </tr>
              ) : cards.length > 0 ? (
                cards.map((card, idx) => {
                  let ports = '';
                  if (card.type.startsWith('GF') || card.type.startsWith('GT')) ports = '16';
                  else if (card.type.startsWith('SF')) ports = '4';
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ verticalAlign: 'middle' }}>{card.slot}</td>
                      <td style={{ verticalAlign: 'middle' }}>{card.type}</td>
                      <td style={{ verticalAlign: 'middle' }}>{card.type}</td>
                      <td style={{ verticalAlign: 'middle' }}>{ports}</td>
                      <td style={{ verticalAlign: 'middle' }}>{card.softVer || '1.2.2'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{card.status === card.type || card.status === 'INSERVICE' || card.status === 'STANDBY' ? 'Online' : card.status}</td>
                      <td style={{ verticalAlign: 'middle' }}>{card.role || (card.slot === '10' ? 'Main' : card.slot === '11' ? 'Standby' : 'Main')}</td>
                      <td style={{ verticalAlign: 'middle' }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <button className="btn btn-primary btn-sm" style={{ backgroundColor: '#286090', borderColor: '#204d74', borderRadius: '4px' }}>Reboot-card</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted" style={{ padding: '30px' }}>No cards found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
