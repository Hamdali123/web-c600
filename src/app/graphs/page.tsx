"use client";

import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

export default function GraphsPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [selectedOlt, setSelectedOlt] = useState('Any');
  const [category, setCategory] = useState('OLT');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({ totalOnus: 0, totalTraffic: 0 });

  useEffect(() => {
    fetch('/api/settings/olt')
      .then(r => r.json())
      .then(data => setOlts(Array.isArray(data) ? data : []));
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graphs?oltId=${selectedOlt}&category=${category}`);
      const data = await res.json();
      if (data.success) {
        setChartData(data.chartData || []);
        setSummary(data.summary || { totalOnus: 0, totalTraffic: 0 });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGraphData();
  }, [selectedOlt, category]);

  const selectedOltObj = olts.find(o => o.id.toString() === selectedOlt);
  const displayName = selectedOltObj ? selectedOltObj.name : 'All OLTs';

  const renderAreaGraph = (title: string, dataKey: string, unit: string, color: string) => {
    if (chartData.length === 0) return null;
    const currentVal = chartData[chartData.length - 1][dataKey] || 0;
    const maxVal = Math.max(...chartData.map(d => d[dataKey] || 0));

    return (
      <div className="col-md-6" style={{ marginBottom: '30px' }}>
        <div className="panel panel-default">
          <div className="panel-heading" style={{ backgroundColor: '#fdfdfd' }}>
            <small className="text-muted">{displayName}</small>
            <h5 style={{ margin: '5px 0', fontWeight: 'bold' }}>{title}</h5>
          </div>
          <div className="panel-body" style={{ height: '230px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
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
            Current: {currentVal} {unit} | Maximum: {maxVal} {unit}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '200px' }}>
          <label className="small text-muted">OLTs</label>
          <select className="form-control" value={selectedOlt} onChange={e => setSelectedOlt(e.target.value)}>
            <option value="Any">Any</option>
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

      {loading ? (
        <div className="text-center" style={{ padding: '80px 0' }}>
          <i className="fa fa-spinner fa-spin fa-3x text-muted"></i>
          <p className="text-muted" style={{ marginTop: '10px' }}>Loading graph metrics...</p>
        </div>
      ) : (
        <div>
          {category === 'OLT' && (
            <div className="row">
              {renderAreaGraph('Daily OLT environment temperature', 'temp', '°C', '#337ab7')}
              {renderAreaGraph('GFGN card in slot 2 daily CPU usage', 'cpuSlot2', '%', '#f0ad4e')}
              {renderAreaGraph('SFUB card in slot 10 daily CPU usage', 'cpuSlot10', '%', '#5cb85c')}
            </div>
          )}

          {(category === 'Traffic' || category === 'PON' || category === 'Uplink') && (
            <div className="row">
              {renderAreaGraph(`${category} download usage`, 'download', ' Mbps', '#5cb85c')}
              {renderAreaGraph(`${category} upload usage`, 'upload', ' Mbps', '#f0ad4e')}
            </div>
          )}

          {category === 'Signal' && (
            <div className="row">
              <div className="col-md-8 col-md-offset-2">
                <div className="panel panel-default">
                  <div className="panel-heading" style={{ backgroundColor: '#fdfdfd', fontWeight: 'bold' }}>
                    ONU Rx Signal Strength Distribution ({displayName})
                  </div>
                  <div className="panel-body" style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => {
                            let barColor = '#4db14b'; // Excellent / Good: green
                            if (index === 2) barColor = '#f7a127'; // Warning: orange
                            if (index === 3) barColor = '#d9534f'; // Critical: red
                            return <Cell key={`cell-${index}`} fill={barColor} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="panel-footer small text-muted text-center">
                    Total configured ONUs: <strong>{summary.totalOnus}</strong> | 
                    Excellent: <strong>{summary.signalDistribution?.excellent}</strong> | 
                    Good: <strong>{summary.signalDistribution?.good}</strong> | 
                    Warning: <strong>{summary.signalDistribution?.warning}</strong> | 
                    Critical: <strong>{summary.signalDistribution?.critical}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
