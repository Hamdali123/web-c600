"use client";

import { useState } from 'react';

type OltRow = {
  id: number;
  name: string;
  ip_address: string;
  telnet_port: number | null;
  snmp_port: number | null;
  manufacturer: string | null;
  hardware_version: string | null;
  disabled: boolean;
  last_polled: string | null;
};

export default function OltActions({ olts, mode }: { olts: OltRow[]; mode?: 'button' | 'rows' }) {
  const [list, setList] = useState(olts);

  const isOnline = (o: OltRow) => {
    if (!o.last_polled) return false;
    const diff = Date.now() - new Date(o.last_polled).getTime();
    return diff < 5 * 60 * 1000;
  };

  const exportCsv = () => {
    const header = ['ID', 'Name', 'IP', 'TCP', 'UDP', 'HW Version', 'SW Version', 'Status'];
    const rows = list.map(o => [
      o.id,
      o.name,
      o.ip_address,
      o.telnet_port ?? '',
      o.snmp_port ?? '',
      `${o.manufacturer ? o.manufacturer.toUpperCase() + '-' : ''}${o.hardware_version || 'C600'}`,
      '—',
      o.disabled ? 'Disabled' : (isOnline(o) ? 'Online' : 'Offline')
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'olts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDisable = async (o: OltRow) => {
    try {
      const res = await fetch(`/api/olts/toggle?id=${o.id}`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setList(prev => prev.map(x => x.id === o.id ? { ...x, disabled: data.disabled } : x));
        alert(`OLT "${o.name}" ${data.disabled ? 'disabled' : 'enabled'}.`);
      } else {
        alert('Gagal mengubah status OLT.');
      }
    } catch (e) {
      alert('Gagal mengubah status OLT.');
    }
  };

  return (
    <>
      {mode !== 'rows' && (
        <button
          className="btn btn-primary margin-left margin-bottom export-button"
          style={{ marginLeft: '10px', cursor: 'pointer' }}
          onClick={exportCsv}
        >
          Export OLTs list
        </button>
      )}

      {mode === 'rows' && list.map(o => (
        <tr key={o.id}>
          <td className="text-center">
            <a className="btn btn-success" href={`/olt/olt_details/${o.id}/details`}>View</a>
          </td>
          <td className="text-center">{o.id}</td>
          <td className="text-center">
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: o.disabled ? '#d9534f' : (isOnline(o) ? '#5cb85c' : '#d9534f')
              }}
              title={o.disabled ? 'Disabled' : (isOnline(o) ? 'Online' : 'Offline')}
            ></span>
          </td>
          <td>{o.name}</td>
          <td>{o.ip_address}</td>
          <td>{o.telnet_port ?? ''}</td>
          <td>{o.snmp_port ?? ''}</td>
          <td>{o.manufacturer ? `${o.manufacturer.toUpperCase()}-` : ''}{o.hardware_version || 'C600'}</td>
          <td>—</td>
          <td className="text-center">
            <button
              className="btn btn-small btn-default margin-right"
              title={o.disabled ? 'Enable OLT' : 'Disable OLT'}
              style={{ marginRight: '5px' }}
              onClick={() => toggleDisable(o)}
            >
              <i className={`fa ${o.disabled ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            </button>
            <a className="btn btn-small btn-danger" href={`/settings/olts/delete/${o.id}`} title="Delete">
              <i className="fa fa-trash"></i>
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}