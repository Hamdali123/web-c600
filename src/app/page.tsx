"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    online: 0,
    offline: 0,
    powerFailed: 0,
    los: 0,
    unconfigured: 0,
    totalAuthorized: 0,
    lowSignals: 0,
    olts: [] as any[],
    notifications: [] as any[]
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setStats(data);
        
        // Mock trend data for dashboard chart
        const now = new Date();
        const trend = Array.from({ length: 12 }).map((_, i) => ({
          time: new Date(now.getTime() - (11 - i) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '00' }),
          online: data.online - Math.floor(Math.random() * 5),
          offline: data.offline + Math.floor(Math.random() * 3)
        }));
        setChartData(trend);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchStats();
    const interval = setInterval(fetchStats, 15000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f2f2f2', minHeight: 'calc(100vh - 60px)', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      
      {/* Summary Cards */}
      <div className="row" style={{ marginBottom: '20px' }}>
        <div className="col-md-3">
          <Link href="/onu/unconfigured" style={{ textDecoration: 'none' }}>
            <div className="card-outer">
              <div className="card-top-header" style={{ backgroundColor: '#337ab7' }}>
                 <i className="fa fa-magic"></i>
                 <span className="card-main-num">{stats.unconfigured}</span>
              </div>
              <div className="card-body-text">Waiting authorization</div>
              <div className="card-footer-custom" style={{ borderTop: '1px solid #337ab7', color: '#337ab7' }}>
                 D: 0 Resync: 0 <span style={{ marginLeft: 'auto' }}>New: {stats.unconfigured}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link href="/onu/configured?status=Online" style={{ textDecoration: 'none' }}>
            <div className="card-outer">
              <div className="card-top-header" style={{ backgroundColor: '#5cb85c' }}>
                 <i className="fa fa-server"></i>
                 <span className="card-main-num">{stats.online}</span>
              </div>
              <div className="card-body-text">Online</div>
              <div className="card-footer-custom" style={{ borderTop: '1px solid #5cb85c', color: '#5cb85c' }}>
                 Total authorized: {stats.totalAuthorized}
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link href="/onu/configured?status=Offline" style={{ textDecoration: 'none' }}>
            <div className="card-outer">
              <div className="card-top-header" style={{ backgroundColor: '#777' }}>
                 <i className="fa fa-times"></i>
                 <span className="card-main-num">{stats.offline}</span>
              </div>
              <div className="card-body-text">Total offline</div>
              <div className="card-footer-custom" style={{ borderTop: '1px solid #777', color: '#777' }}>
                 PwrFail: {stats.powerFailed} LoS: {stats.los} <span style={{ marginLeft: 'auto' }}>N/A: {stats.offline - stats.powerFailed - stats.los}</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-md-3">
          <Link href="/onu/configured?signal_low=true" style={{ textDecoration: 'none' }}>
            <div className="card-outer">
              <div className="card-top-header" style={{ backgroundColor: '#f0ad4e' }}>
                 <i className="fa fa-exclamation-circle"></i>
                 <span className="card-main-num">{stats.lowSignals}</span>
              </div>
              <div className="card-body-text">Low signals</div>
              <div className="card-footer-custom" style={{ borderTop: '1px solid #f0ad4e', color: '#f0ad4e' }}>
                 Warning: {stats.lowSignals} <span style={{ marginLeft: 'auto' }}>Critical: 0</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="row">
        {/* Network Status Chart */}
        <div className="col-md-8">
           <div className="panel panel-default" style={{ borderRadius: '4px', border: '1px solid #ddd', boxShadow: 'none' }}>
             <div className="panel-heading" style={{ backgroundColor: '#4d4d4d', color: '#fff', fontWeight: 'bold', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="fa fa-bar-chart"></i> Network status</span>
                <div className="btn-group">
                   <button className="btn btn-default btn-xs" style={{ background: '#666', border: '1px solid #555', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>Daily</button>
                   <button className="btn btn-default btn-xs" style={{ background: '#666', border: '1px solid #555', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>Monthly</button>
                </div>
             </div>
             <div className="panel-body" style={{ padding: '20px', backgroundColor: '#fff' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', fontSize: '14px', color: '#333' }}>Daily network status</div>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5cb85c" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#5cb85c" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOffline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#337ab7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#337ab7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                      <YAxis fontSize={10} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd' }} />
                      <Area type="monotone" dataKey="online" stroke="#5cb85c" fill="url(#colorOnline)" strokeWidth={2} name="Online ONUs" />
                      <Area type="monotone" dataKey="offline" stroke="#337ab7" fill="url(#colorOffline)" strokeWidth={2} name="Offline ONUs" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', fontSize: '12px', marginTop: '20px', justifyContent: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#5cb85c', borderRadius: '2px' }}></div> <span style={{ fontWeight: '500' }}>Online ONUs:</span> {stats.online}</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#337ab7', borderRadius: '2px' }}></div> <span style={{ fontWeight: '500' }}>Power fail:</span> {stats.powerFailed}</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#d9534f', borderRadius: '2px' }}></div> <span style={{ fontWeight: '500' }}>Signal loss:</span> {stats.los}</div>
                </div>
             </div>
           </div>
        </div>
        
        {/* OLT Information Side Panel */}
        <div className="col-md-4">
           <div className="panel panel-default" style={{ borderRadius: '4px', border: '1px solid #ddd', boxShadow: 'none', marginBottom: '20px' }}>
             <div className="panel-heading" style={{ backgroundColor: '#4d4d4d', color: '#fff', fontWeight: 'bold', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>OLT ZTE-C600</span>
                <select style={{ background: '#666', border: '1px solid #555', color: '#fff', fontSize: '11px', outline: 'none', padding: '2px 5px', borderRadius: '2px' }}>
                   <option>2 - C600-SANWANI</option>
                </select>
             </div>
             <div className="panel-body" style={{ padding: '25px', textAlign: 'center', backgroundColor: '#fff' }}>
                <h4 style={{ color: '#337ab7', fontWeight: 'bold', margin: '0 0 20px 0', fontSize: '18px' }}>ZTE<span style={{ fontSize: '14px', color: '#777', marginLeft: '8px', fontWeight: 'normal' }}>中兴</span></h4>
                <div style={{ margin: '0 auto', maxWidth: '180px', marginBottom: '20px' }}>
                   <img src="https://sanwanay.smartolt.com/images/olt_hardware/zte_c600.png" alt="ZTE C600" style={{ width: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} 
                        onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200"; }} />
                </div>
                
                <div style={{ backgroundColor: '#fdfdfd', border: '1px solid #eee', borderRadius: '4px', padding: '10px 15px', display: 'flex', alignItems: 'center', fontSize: '13px', gap: '12px' }}>
                   <i className="fa fa-clock-o text-primary"></i>
                   <span style={{ fontWeight: 'bold', color: '#555' }}>Uptime</span>
                   <span style={{ color: '#777', flex: 1, textAlign: 'left' }}>68 days, 14:38</span>
                   <span style={{ color: '#5cb85c', fontWeight: 'bold' }}>51°C</span>
                </div>
             </div>
           </div>

           <div className="panel panel-default" style={{ borderRadius: '4px', border: '1px solid #ddd', boxShadow: 'none' }}>
             <div className="panel-heading" style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', fontWeight: 'bold', padding: '12px 15px', color: '#333' }}>
                <i className="fa fa-list text-primary"></i> Latest events
             </div>
             <div className="panel-body" style={{ padding: 0 }}>
               <table className="table table-hover" style={{ margin: 0, fontSize: '12px' }}>
                 <tbody>
                    {stats.notifications.length > 0 ? stats.notifications.slice(0, 6).map((n:any) => (
                      <tr key={n.id}>
                        <td width="40" style={{ textAlign: 'center', verticalAlign: 'middle', borderTop: '1px solid #f4f4f4' }}>
                          {n.type === 'error' ? <i className="fa fa-bolt text-danger"></i> : <i className="fa fa-info-circle text-primary"></i>}
                        </td>
                        <td style={{ padding: '10px 8px', borderTop: '1px solid #f4f4f4', color: '#555' }}>
                           <div style={{ fontWeight: '500' }}>{n.message}</div>
                           <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>2026-05-14 11:32</div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="text-center" style={{ padding: '20px', color: '#999' }}>No events recorded.</td></tr>
                    )}
                 </tbody>
               </table>
               <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid #eee' }}>
                  <Link href="/tasks" style={{ fontSize: '12px', color: '#337ab7', fontWeight: 'bold', textDecoration: 'none' }}>View all events</Link>
               </div>
             </div>
           </div>
        </div>
      </div>

      <style jsx>{`
        .card-outer {
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 140px;
          transition: transform 0.2s;
        }
        .card-outer:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .card-top-header {
          padding: 15px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-top-header i {
          font-size: 38px;
          opacity: 0.8;
        }
        .card-main-num {
          font-size: 42px;
          font-weight: bold;
        }
        .card-body-text {
          padding: 5px 15px;
          font-size: 13px;
          color: #666;
          text-align: right;
          flex: 1;
        }
        .card-footer-custom {
          padding: 8px 15px;
          background-color: #fcfcfc;
          font-size: 12px;
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

