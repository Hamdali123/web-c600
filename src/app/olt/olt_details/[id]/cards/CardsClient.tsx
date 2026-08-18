"use client";

import { useEffect, useState } from 'react';

export default function CardsClient({ oltId, initialCards }: { oltId: string; initialCards: any[] }) {
  const [cards, setCards] = useState<any[]>(initialCards || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCards = async () => {
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/cards`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch cards');
      setCards(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/cards/refresh`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refresh cards');
      setCards(data.cards || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRebootCard = async (slot: string) => {
    if (!confirm(`DANGER: Are you absolutely sure you want to reboot card in slot ${slot}? This will disconnect all customers on this card!`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/olt/${oltId}/cards/${slot}/reboot`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Card ${slot} reboot initiated successfully.`);
    } catch (err: any) {
      alert(`Failed to reboot card: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20" style={{ marginBottom: '20px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleRefresh} 
            disabled={loading}
            style={{ backgroundColor: '#286090', borderColor: '#204d74' }}
          >
            <i className={`fa fa-refresh ${loading ? 'fa-spin' : ''}`}></i> {loading ? 'Refreshing...' : 'Refresh OLT cards info'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="fa fa-exclamation-triangle"></i> {error}
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
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted" style={{ padding: '30px' }}>
                    No cards found.
                  </td>
                </tr>
              ) : (
                cards.map((card, idx) => {
                  let roleText = card.role;
                  if (roleText?.toUpperCase() === 'MASTER' || card.type === 'PRVR' || card.type === 'FCVD' || card.type === 'GFGN' || card.slot === '2' || card.slot === '10' || card.slot === '18' || card.slot === '20' || card.slot === '21') roleText = 'Main';
                  if (card.slot === '11') roleText = 'Standby';

                  let statusText = card.status;
                  if (['INSERVICE', 'Online', 'GFGN', 'PRVR', 'FCVDE-I'].includes(card.status) || card.status?.includes('SFUB')) {
                    statusText = 'Online';
                  }

                  let portsNum = card.ports || card.num_ports;
                  if (!portsNum) {
                    if (card.type?.includes('G')) portsNum = 16;
                    else if (card.type?.includes('SFU')) portsNum = 4;
                    else portsNum = '';
                  }

                  return (
                  <tr key={idx}>
                    <td>{card.slot || card.slot_no || idx + 1}</td>
                    <td>{card.type || card.card_type || '-'}</td>
                    <td>{card.real_type || card.type || '-'}</td>
                    <td>{portsNum}</td>
                    <td>{card.softVer || card.sw_version || '1.2.2'}</td>
                    <td>{statusText}</td>
                    <td>{roleText || 'Main'}</td>
                    <td>{new Date().toISOString().slice(0, 19).replace('T', ' ')}</td>
                    <td className="text-right">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleRebootCard(card.slot || card.slot_no || String(idx + 1))}
                        title="Reboot Card"
                        style={{ backgroundColor: '#3366cc', borderColor: '#3366cc', padding: '4px 12px', fontSize: '12px' }}
                      >
                        Reboot-card
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
