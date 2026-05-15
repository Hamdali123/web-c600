"use client";

import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const mockData = [
  { time: 'Thu 18:00', temp: 52, cpu: 20, traffic: 400 },
  { time: 'Fri 00:00', temp: 48, cpu: 19, traffic: 350 },
  { time: 'Fri 06:00', temp: 46, cpu: 20, traffic: 420 },
  { time: 'Fri 12:00', temp: 50, cpu: 20, traffic: 510 },
];

export default function GraphsPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [selectedOlt, setSelectedOlt] = useState('Any');
  const [category, setCategory] = useState('OLT');

  useEffect(() => {
    fetch('/api/settings/olt')
      .then(r => r.json())
      .then(data => setOlts(Array.isArray(data) ? data : []));
  }, []);

  const renderGraph = (title: string, dataKey: string, unit: string, color: string) => {
    const selectedOltObj = olts.find(o => o.id.toString() === selectedOlt);
    const displayName = selectedOltObj ? selectedOltObj.name : 'All OLTs';

    return (
    <div className="col-md-6" style={{ marginBottom: '30px' }}>
      <div className="panel panel-default">
        <div className="panel-heading" style={{ backgroundColor: '#fdfdfd' }}>
          <small className="text-muted">{displayName}</small>
          <h5 style={{ margin: '5px 0', fontWeight: 'bold' }}>{title}</h5>
        </div>
        <div className="panel-body" style={{ height: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" fontSize={10} />
              <YAxis fontSize={10} unit={unit} />
              <Tooltip />
              <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill={`url(#color${dataKey})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="panel-footer small text-muted">
           Current: {mockData[mockData.length-1][dataKey as keyof typeof mockData[0]]} {unit} | Maximum: {Math.max(...mockData.map(d => d[dataKey as keyof typeof d] as number))} {unit}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '200px' }}>
          <label className="small text-muted">OLTs</label>
          <select className="form-control" value={selectedOlt} onChange={e => setSelectedOlt(e.target.value)}>
            <option>Any</option>
            {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <span className="text-muted" style={{ marginRight: '10px' }}>Graphs for</span>
          <div className="btn-group">
            {['OLT', 'Uplink', 'PON', 'Traffic', 'Signal'].map(cat => (
              <button 
                key={cat}
                className={`btn btn-default ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        {renderGraph('Daily OLT environment temperature', 'temp', '°C', '#337ab7')}
        {renderGraph('GFGN card in slot 2 daily CPU usage', 'cpu', '%', '#337ab7')}
        {renderGraph('SFUB card in slot 10 daily CPU usage', 'cpu', '%', '#337ab7')}
        {renderGraph('Daily Traffic Usage', 'traffic', 'Mbps', '#5cb85c')}
      </div>
    </div>
  );
}
