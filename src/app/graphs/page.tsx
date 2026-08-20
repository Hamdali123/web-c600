"use client";

import { useEffect, useState } from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function GraphsPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [selectedOlt, setSelectedOlt] = useState('Any');
  const [category, setCategory] = useState('OLT');
  const [board, setBoard] = useState('Any');
  const [port, setPort] = useState('Any');
  const [zone, setZone] = useState('Any');
  const [splitter, setSplitter] = useState('Any');

  const [boards, setBoards] = useState<string[]>([]);
  const [ports, setPorts] = useState<string[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [odbs, setOdbs] = useState<any[]>([]);

  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({ totalOnus: 0 });

  useEffect(() => {
    fetch('/api/settings/olt')
      .then(r => r.json())
      .then(data => setOlts(Array.isArray(data) ? data : []));
    fetch('/api/settings/master')
      .then(r => r.json())
      .then(data => {
        setZones(Array.isArray(data?.zones) ? data.zones : []);
        setOdbs(Array.isArray(data?.odbs) ? data.odbs : []);
      })
      .catch(() => {});
  }, []);

  // Build Board/Port dropdowns from real PON ports (per selected OLT, or all)
  useEffect(() => {
    if (olts.length === 0) return;
    const targetOlts = selectedOlt === 'Any' ? olts : olts.filter(o => String(o.id) === selectedOlt);
    let cancelled = false;
    const collect = async () => {
      const boardSet = new Set<string>();
      const portSet = new Set<string>();
      for (const olt of targetOlts) {
        try {
          const res = await fetch(`/api/settings/olt/${olt.id}/pon-ports`);
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const p of data) {
              const v = String(p.value || '');
              const m = v.match(/^(\d+\/\d+)\/\d+$/);
              if (m) {
                boardSet.add(m[1]);
                portSet.add(v);
              }
            }
          }
        } catch (e) {}
      }
      if (!cancelled) {
        setBoards(Array.from(boardSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        setPorts(Array.from(portSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        setBoard(b => (b !== 'Any' && !boardSet.has(b) ? 'Any' : b));
        setPort(p => (p !== 'Any' && !portSet.has(p) ? 'Any' : p));
      }
    };
    collect();
    return () => { cancelled = true; };
  }, [selectedOlt, olts]);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graphs?oltId=${selectedOlt}&category=${category}&board=${board}&port=${port}&zone_id=${zone}&odb_id=${splitter}`);
      const data = await res.json();
      if (data.success) {
        setChartData(data.chartData || []);
        setSummary(data.summary || { totalOnus: 0 });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGraphData();
  }, [selectedOlt, category, board, port, zone, splitter]);

  const renderGridChart = (chart: any) => {
    if (!chart.data || chart.data.length === 0) {
      return (
        <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
            <small className="text-muted">{chart.subtitle}</small>
          </div>
          <div style={{ backgroundColor: '#f9f9f9', border: '1px dashed #ccc', padding: '10px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-muted"><i className="fa fa-hourglass-half" style={{ marginRight: '5px' }}></i>No data yet — collecting...</span>
          </div>
        </div>
      );
    }
    if (chart.type === 'line' || chart.type === 'Signal') {
      const isSignal = chart.type === 'Signal';
      const dataKey = isSignal ? 'signal' : chart.dataKey;
      const unit = isSignal ? 'dBm' : chart.unit;
      const color = isSignal ? '#f39c12' : chart.color; // Orange for signal
      const yDomain = isSignal ? [-40, -10] : ['auto', 'auto'];

      if (isSignal) {
        const maxVal = Math.max(...chart.data.map((d: any) => d.signal));
        const currentVal = chart.data[chart.data.length - 1].signal;
        
        return (
          <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '5px' }}>
              <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
              <small className="text-muted">{chart.subtitle}</small>
            </div>
            <div style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', padding: '10px', paddingBottom: '0', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} />
                  <YAxis fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} domain={yDomain} />
                  <Tooltip />
                  <Line type="stepAfter" dataKey={dataKey} name="1310nm OLT Rx for ONU" stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderTop: 'none', padding: '5px 10px', fontSize: '11px', color: '#555' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f39c12', marginRight: '5px' }}></span>
              1310nm OLT Rx for ONU &nbsp;&nbsp;&nbsp; Current: <strong>{currentVal}</strong> &nbsp;&nbsp; Maximum: <strong>{maxVal}</strong>
            </div>
          </div>
        );
      } else {
        const maxVal = Math.max(...chart.data.map((d: any) => d.value));
        const currentVal = chart.data[chart.data.length - 1].value;
        
        return (
          <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '5px' }}>
              <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
              <small className="text-muted">{chart.subtitle}</small>
            </div>
            <div style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', padding: '10px', paddingBottom: '0', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} />
                  <YAxis fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} />
                  <Tooltip />
                  <Line type="stepAfter" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderTop: 'none', padding: '5px 10px', fontSize: '11px', color: '#555' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#188ae2', marginRight: '5px' }}></span>
              Usage &nbsp;&nbsp;&nbsp; Current: <strong>{currentVal} {unit}</strong> &nbsp;&nbsp; Maximum: <strong>{maxVal} {unit}</strong>
            </div>
          </div>
        );
      }
    } else if (chart.type === 'Error') {
      const maxVal = Math.max(...chart.data.map((d: any) => d.value));
      const currentVal = chart.data[chart.data.length - 1].value;
      
      return (
        <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
            <small className="text-muted">{chart.subtitle}</small>
          </div>
          <div style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', padding: '10px 10px 0 0', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} />
                <YAxis fontSize={10} axisLine={{ stroke: '#999' }} tickLine={false} width={65} label={{ value: 'errors', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#333' }} />
                <Tooltip />
                <Line type="stepAfter" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={false} name="Out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderTop: 'none', padding: '5px 10px', fontSize: '11px', color: '#555' }}>
            <div style={{ display: 'inline-block', width: '50%' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#3498db', marginRight: '5px' }}></span>
              In &nbsp;&nbsp;&nbsp; Current: <strong>0.00</strong> &nbsp;&nbsp; Maximum: <strong>0.00</strong>
            </div>
            <div style={{ display: 'inline-block', width: '50%' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f39c12', marginRight: '5px' }}></span>
              Out &nbsp;&nbsp;&nbsp; Current: <strong>{currentVal.toFixed(2)}</strong> &nbsp;&nbsp; Maximum: <strong>{maxVal.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      );
    } else if (chart.type === 'placeholder') {
      return (
        <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
            <small className="text-muted">&nbsp;</small>
          </div>
          <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', padding: '10px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderTop: 'none', padding: '5px 10px', fontSize: '11px', color: '#555', height: '26px' }}>
          </div>
        </div>
      );
    } else if (chart.type === 'Traffic') {
      const maxUp = Math.max(...chart.data.map((d: any) => d.upload));
      const currUp = chart.data[chart.data.length - 1].upload;
      const maxDown = Math.max(...chart.data.map((d: any) => d.download));
      const currDown = chart.data[chart.data.length - 1].download;

      const formatYAxis = (tickItem: any) => {
        if (tickItem >= 1000) return (tickItem / 1000).toFixed(1) + ' G';
        if (tickItem >= 1) return tickItem.toFixed(1) + ' M';
        if (tickItem > 0) return (tickItem * 1000).toFixed(0) + ' k';
        return '0.0';
      };

      const formatValue = (val: number) => {
        if (val >= 1000) return (val / 1000).toFixed(2) + ' G';
        if (val >= 1) return val.toFixed(2) + ' M';
        return (val * 1000).toFixed(2) + ' k';
      };

      return (
        <div key={chart.id} className="col-md-6" style={{ marginBottom: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <span style={{ color: '#337ab7' }}>{chart.title}</span><br/>
            <small className="text-muted">{chart.subtitle}</small>
          </div>
          <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', padding: '10px 10px 0 0', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} axisLine={{ stroke: '#666' }} tickLine={false} />
                <YAxis fontSize={10} axisLine={{ stroke: '#666' }} tickLine={false} tickFormatter={formatYAxis} width={65} label={{ value: 'bits per second', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#333' }} />
                <Tooltip formatter={(value: any) => formatValue(Number(value))} />
                <Area type="stepAfter" dataKey="download" name="Download" stroke="#3498db" fillOpacity={1} fill="#e6e6e6" strokeWidth={2} />
                <Area type="stepAfter" dataKey="upload" name="Upload" stroke="#f39c12" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderTop: 'none', padding: '5px 10px', fontSize: '11px', color: '#555' }}>
            <div style={{ display: 'inline-block', width: '50%' }}>
              <span style={{ display: 'inline-block', width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '8px solid #f39c12', marginRight: '5px' }}></span>
              {chart.labelUp || 'Upload'} &nbsp;&nbsp;&nbsp; Current: <strong>{formatValue(currUp)}</strong> &nbsp;&nbsp; Maximum: <strong>{formatValue(maxUp)}</strong>
            </div>
            <div style={{ display: 'inline-block', width: '50%' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#3498db', marginRight: '5px' }}></span>
              {chart.labelDown || 'Download'} &nbsp;&nbsp;&nbsp; Current: <strong>{formatValue(currDown)}</strong> &nbsp;&nbsp; Maximum: <strong>{formatValue(maxDown)}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="small text-muted" style={{ margin: 0 }}>OLTs</label>
          <select className="form-control input-sm" style={{ width: '150px' }} value={selectedOlt} onChange={e => setSelectedOlt(e.target.value)}>
            <option value="Any">Any</option>
            {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="text-muted small">Graphs for</span>
          <div className="btn-group">
            {['OLT', 'Uplink', 'PON', 'Traffic', 'Signal'].map(cat => (
              <button 
                key={cat}
                className={`btn btn-sm btn-default ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '25px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="small text-muted" style={{ margin: 0 }}>Board</label>
          <select className="form-control input-sm" style={{ width: '100px' }} value={board} onChange={e => setBoard(e.target.value)}>
            <option value="Any">Any</option>
            {boards.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="small text-muted" style={{ margin: 0 }}>Port</label>
          <select className="form-control input-sm" style={{ width: '100px' }} value={port} onChange={e => setPort(e.target.value)}>
            <option value="Any">Any</option>
            {ports.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="small text-muted" style={{ margin: 0 }}>Zone</label>
          <select className="form-control input-sm" style={{ width: '120px' }} value={zone} onChange={e => setZone(e.target.value)}>
            <option value="Any">Any</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="small text-muted" style={{ margin: 0 }}>Splitter</label>
          <select className="form-control input-sm" style={{ width: '120px' }} value={splitter} onChange={e => setSplitter(e.target.value)}>
            <option value="Any">Any</option>
            {odbs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </div>

      {summary.error && (
        <div className="alert alert-warning" style={{ fontSize: '13px' }}>
          <i className="fa fa-exclamation-triangle" style={{ marginRight: '5px' }}></i>{summary.error}
        </div>
      )}

      {loading ? (
        <div className="text-center" style={{ padding: '80px 0' }}>
          <i className="fa fa-spinner fa-spin fa-3x text-muted"></i>
          <p className="text-muted" style={{ marginTop: '10px' }}>Loading graph metrics...</p>
        </div>
      ) : (
        <div className="row">
          {chartData.length === 0 ? (
            <div className="col-md-12 text-center text-muted" style={{ padding: '40px' }}>
              No graphs found for the selected filters.
            </div>
          ) : (
            chartData.map(renderGridChart)
          )}
        </div>
      )}
    </div>
  );
}
