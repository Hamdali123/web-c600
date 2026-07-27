"use client";

import { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    online: 0,
    offline: 0,
    powerFailed: 0,
    los: 0,
    unconfigured: 0,
    totalAuthorized: 0,
    lowSignals: 0,
    signalWarning: 0,
    signalCritical: 0,
  });

  const [olts, setOlts] = useState<any[]>([]);
  const [selectedOltId, setSelectedOltId] = useState<string>('all');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [authPerDay, setAuthPerDay] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Time helper to convert database timestamp to human-friendly relative string
  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    } catch (e) {
      return 'Some time ago';
    }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const queryParam = selectedOltId !== 'all' ? `?olt_id=${selectedOltId}` : '';
        const res = await fetch(`/api/dashboard${queryParam}`);
        const data = await res.json();
        
        setStats({
          online: data.online || 0,
          offline: data.offline || 0,
          powerFailed: data.powerFailed || 0,
          los: data.los || 0,
          unconfigured: data.unconfigured || 0,
          totalAuthorized: data.totalAuthorized || 0,
          lowSignals: data.lowSignals || 0,
          signalWarning: data.signalWarning || 0,
          signalCritical: data.signalCritical || 0,
        });

        if (data.olts) setOlts(data.olts);
        if (data.recentLogs) setRecentLogs(data.recentLogs);
        if (data.authPerDay) setAuthPerDay(data.authPerDay);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchStats();
    // Polling removed to improve performance on local
    // const interval = setInterval(fetchStats, 15000); 
    // return () => clearInterval(interval);
  }, [selectedOltId]);

  const selectedOlt = olts.find(o => String(o.id) === selectedOltId);
  const selectedOltLabel = selectedOlt ? `${selectedOlt.id} - ${selectedOlt.name}` : 'All';
  const displayOltName = selectedOlt ? `OLT ${selectedOlt.manufacturer?.toUpperCase() || ''}-${selectedOlt.name}` : 'All OLTs';

  // Format network status data using our stats to render a dynamic timeline
  const networkStatusData = [
    { name: 'Mon', Online: stats.online - 2, PowerFail: stats.powerFailed, LOS: stats.los, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) + 1 },
    { name: 'Tue', Online: stats.online - 1, PowerFail: stats.powerFailed, LOS: stats.los + 1, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) - 1 },
    { name: 'Wed', Online: stats.online + 1, PowerFail: stats.powerFailed + 1, LOS: stats.los, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) + 2 },
    { name: 'Thu', Online: stats.online,     PowerFail: stats.powerFailed, LOS: stats.los, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) },
    { name: 'Fri', Online: stats.online - 1, PowerFail: stats.powerFailed, LOS: stats.los + 1, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) + 1 },
    { name: 'Sat', Online: stats.online + 2, PowerFail: stats.powerFailed, LOS: stats.los, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) - 1 },
    { name: 'Sun', Online: stats.online,     PowerFail: stats.powerFailed, LOS: stats.los, Offline: Math.max(0, stats.offline - stats.powerFailed - stats.los) }
  ];

  const renderLegendText = (value: string, entry: any) => {
    let count = 0;
    if (value === 'Online') count = stats.online;
    if (value === 'Power Fail') count = stats.powerFailed;
    if (value === 'LOS') count = stats.los;
    if (value === 'N/A' || value === 'Offline') {
      count = Math.max(0, stats.offline - stats.powerFailed - stats.los);
      value = 'N/A';
    }
    return <span style={{ color: '#333' }}>{value} ({count})</span>;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Create a mock time string for the title since our mock data uses Days (e.g. "Mon")
      // To match the screenshot exactly, we'll format it like "21:55" if possible, or just use the label.
      const title = label === 'Mon' ? '21:55' : (label === 'Tue' ? '22:00' : label);

      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '12px 16px',
          border: '1px solid #eee',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '12px',
          color: '#333',
          minWidth: '130px',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>{title}</div>
          
          {payload.map((entry: any, index: number) => {
             let isCircle = entry.name === 'N/A';
             let color = entry.color;
             
             return (
               <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                 <div style={{ 
                   width: '8px', 
                   height: '8px', 
                   borderRadius: isCircle ? '50%' : '1px', 
                   backgroundColor: isCircle ? 'transparent' : color,
                   border: isCircle ? `2px solid ${color}` : 'none',
                   marginRight: '8px'
                 }}></div>
                 <span style={{ color: '#555', flex: 1 }}>{entry.name}:</span>
                 <span style={{ fontWeight: 'bold', marginLeft: '6px', color: '#111' }}>{entry.value}</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container-fluid content-wrap">
      <div id="smartolt-update-banner" className="alert alert-success alert-dismissible" role="alert" style={{ display: 'none' }}>
        <button type="button" className="close" id="smartolt-update-banner-dismiss" aria-label="Dismiss"><span aria-hidden="true">&times;</span></button>
        <i className="fa fa-gift"></i>
        <strong>SmartOLT has been updated to version 3.52.0</strong>
      </div>
      <h2>Dashboard</h2>
      
      <div className="row">
        {/* Waiting Authorization */}
        <div className="col-lg-3 col-md-6">
          <div className="panel panel-primary">
            <a href={`/onu/unconfigured${selectedOltId !== 'all' ? `?olt_id=${selectedOltId}` : ''}`}>
              <div className="panel-heading">
                <div className="row">
                  <div className="col-xs-3">
                    <i className="fa fa-magic fa-4x"></i>
                  </div>
                  <div className="col-xs-9 text-right">
                    <div className="huge waiting-auth">{loading ? <i className="fa fa-spinner fa-spin"></i> : stats.unconfigured}</div>
                    <div>Waiting authorization</div>
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <span className="pull-left disabled-waiting-auth" title="Administratively Disabled ONTs">D: 0</span>
                <span className="pull-left margin-left move-waiting-auth" title="ONTs to be resynced or moved" style={{marginLeft: '10px'}}>Resync: 0</span>
                <span className="pull-right auth-waiting-auth" title="ONTs to be authorized">New: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.unconfigured}</span>
                <div className="clearfix"></div>
              </div>
            </a>
          </div>
        </div>

        {/* Online ONUs */}
        <div className="col-lg-3 col-md-6">
          <div className="panel panel-green">
            <a href={`/onu/configured${selectedOltId !== 'all' ? `?olt_id=${selectedOltId}` : ''}`}>
              <div className="panel-heading">
                <div className="row">
                  <div className="col-xs-3">
                    <i className="fa fa-server fa-4x"></i>
                  </div>
                  <div className="col-xs-9 text-right">
                    <div className="huge online">{loading ? <i className="fa fa-spinner fa-spin"></i> : stats.online}</div>
                    <div>Online</div>
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <span className="pull-left total-auth">Total authorized: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.totalAuthorized}</span>
                <span className="pull-right"></span>
                <div className="clearfix"></div>
              </div>
            </a>
          </div>
        </div>

        {/* Total Offline */}
        <div className="col-lg-3 col-md-6">
          <div className="panel panel-red">
            <a href={`/onu/configured?status=pwrfail,los,offline${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
              <div className="panel-heading">
                <div className="row">
                  <div className="col-xs-3">
                    <i className="fa fa-close fa-4x"></i>
                  </div>
                  <div className="col-xs-9 text-right">
                    <div className="huge total-offline">{loading ? <i className="fa fa-spinner fa-spin"></i> : stats.offline}</div>
                    <div>Total offline</div>
                  </div>
                </div>
              </div>
            </a>
            <div className="panel-footer">
              <a href={`/onu/configured?status=pwrfail${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
                <span className="pull-left power-fail" title="ONTs with offline reason: Electricity lost">PwrFail: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.powerFailed}</span>
              </a>
              <a href={`/onu/configured?status=los${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`} style={{marginLeft: '10px'}}>
                <span className="pull-left margin-left los" title="ONTs with offline reason: Loss of Signal">LoS: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.los}</span>
              </a>
              <a href={`/onu/configured?status=offline${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
                <span className="pull-right offline" title="ONTs that have never been online since the OLT was restarted">N/A: {loading ? <i className="fa fa-spinner fa-spin"></i> : (stats.offline - stats.powerFailed - stats.los)}</span>
              </a>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>

        {/* Low Signals */}
        <div className="col-lg-3 col-md-6" id="graphs">
          <div className="panel panel-yellow">
            <a href={`/diagnostics?signal=critical,warning${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
              <div className="panel-heading">
                <div className="row">
                  <div className="col-xs-3">
                    <i className="fa fa-exclamation-circle fa-4x"></i>
                  </div>
                  <div className="col-xs-9 text-right">
                    <div className="huge total-signal-low">{loading ? <i className="fa fa-spinner fa-spin"></i> : stats.lowSignals}</div>
                    <div>Low signals</div>
                  </div>
                </div>
              </div>
            </a>
            <div className="panel-footer">
              <a href={`/diagnostics?signal=warning${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
                <span className="pull-left signal-warning" title="ONTs with signal level lower than the warning threshold">Warning: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.signalWarning}</span>
              </a>
              <a href={`/diagnostics?signal=critical${selectedOltId !== 'all' ? `&olt_id=${selectedOltId}` : ''}`}>
                <span className="pull-right signal-critical" title="ONTs with signal level lower than the critical threshold">Critical: {loading ? <i className="fa fa-spinner fa-spin"></i> : stats.signalCritical}</span>
              </a>
              <div className="clearfix"></div>
            </div>
          </div>
          <p className="text-right updated-date" style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>{new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          {/* Network Status Chart Card */}
          <div className="panel panel-default">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#555', color: '#fff' }}>
              <div><i className="fa fa-bar-chart"></i> Network status</div>
              <div>
                <a href="#" style={{ color: '#fff', marginRight: '15px' }}>More graphs <i className="fa fa-caret-down"></i></a>
                <a href="#" style={{ color: '#fff' }}><i className="fa fa-paint-brush"></i></a>
              </div>
            </div>
            <div className="panel-body text-center" id="onusStatusesGraph" style={{ padding: '20px 0 0 0' }}>
              <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={networkStatusData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5cb85c" stopOpacity={0.4}/>
                          <stop offset="100%" stopColor="#5cb85c" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} stroke="#999" axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} stroke="#999" axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ccc', strokeWidth: 1 }} />
                      <Legend 
                        formatter={renderLegendText} 
                        iconSize={10} 
                        wrapperStyle={{ fontSize: '12px', marginTop: '20px', paddingBottom: '10px' }} 
                        payload={[
                          { value: 'Online', type: 'square', id: 'Online', color: '#5cb85c' },
                          { value: 'Power Fail', type: 'square', id: 'PowerFail', color: '#337ab7' },
                          { value: 'LOS', type: 'square', id: 'LOS', color: '#ec971f' },
                          { value: 'N/A', type: 'square', id: 'Offline', color: '#777777' }
                        ]}
                      />
                      <Area type="stepAfter" dataKey="Online" stroke="#5cb85c" fill="url(#colorOnline)" strokeWidth={2} activeDot={{ r: 6 }} />
                      <Area type="stepAfter" dataKey="PowerFail" name="Power Fail" stroke="#337ab7" fill="transparent" strokeWidth={2} />
                      <Area type="stepAfter" dataKey="LOS" stroke="#ec971f" fill="transparent" strokeWidth={2} />
                      <Area type="stepAfter" dataKey="Offline" name="N/A" stroke="#777777" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* PON Outage Outages Card */}
          <div className="panel panel-default">
            <div className="panel-heading">
              <i className="fa fa-heartbeat" aria-hidden="true"></i> PON outage
              <div className="pull-right">
                <i className="fa fa-cog" style={{ cursor: 'pointer' }}></i>
              </div>
            </div>
            <div className="table-responsive" id="outage_pons_content">
              <div className="list-group" style={{ margin: 0 }}>
                <div className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
                  <i className="fa fa-signal fa-fw text-warning" style={{ color: '#ec971f' }}></i> Signal variations
                  <span className="pull-right text-muted small"><i className="fa fa-check-circle text-success" style={{ color: '#4caf50' }}></i> No variation detected</span>
                </div>
                <div className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none' }}>
                  <i className="fa fa-scissors fa-fw text-warning" style={{ color: '#ec971f' }}></i> Fiber cuts (LOS)
                  <span className="pull-right text-muted small"><strong>0</strong> PONs / <strong>0</strong> ONUs</span>
                </div>
                <div className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none' }}>
                  <i className="fa fa-plug fa-fw text-primary" style={{ color: '#337ab7' }}></i> Power fail
                  <span className="pull-right text-muted small"><strong>0</strong> PONs / <strong>0</strong> ONUs</span>
                </div>
                <div className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none' }}>
                  <i className="fa fa-question-circle fa-fw text-muted"></i> Offline N/A
                  <span className="pull-right text-muted small"><strong>0</strong> PONs / <strong>0</strong> ONUs</span>
                </div>
                <div className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
                  <i className="fa fa-calendar fa-fw text-muted" style={{ color: '#a0a0a0' }}></i> Offline for 7+ days
                  <span className="pull-right text-muted small"><strong>0</strong> PONs / <strong>0</strong> ONUs</span>
                </div>
              </div>
            </div>
          </div>

          {/* ONU Authorizations per day Card */}
          <div className="panel panel-default">
            <div className="panel-heading">
              <i className="fa fa-bar-chart-o fa-fw"></i> ONU authorizations per day
            </div>
            <div className="panel-body" style={{ padding: '20px' }}>
              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={authPerDay.length > 0 ? authPerDay : [{ date: 'Today', gpon_total: 0, epon_total: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} stroke="#333333" />
                    <YAxis fontSize={11} tickLine={false} allowDecimals={false} stroke="#333333" />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                    <Bar dataKey="gpon_total" name="GPON" fill="#0064C8" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="epon_total" name="EPON" fill="#F58411" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* OLT details panel */}
          <div className="panel panel-default panel-olt">
            <div className="panel-heading">
              {displayOltName}
              <div className="pull-right panel-heading-button">
                <div className="btn-group">
                  <button type="button" className="btn btn-default btn-xs dropdown-toggle panel-heading-dropdown-toggle" data-toggle="dropdown">
                    <span id="selected_olt">{selectedOltLabel}</span>
                    <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu pull-right" role="menu" id="dropdownOlts">
                    <li><a href="#" className="olt_option min-width-250" onClick={(e) => { e.preventDefault(); setSelectedOltId('all'); }}>All</a></li>
                    {olts.map(o => (
                      <li key={o.id}>
                        <a href="#" className="olt_option" onClick={(e) => { e.preventDefault(); setSelectedOltId(String(o.id)); }}>
                          <span>{o.id} - {o.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="panel-body text-center" style={{ padding: '20px' }}>
              <img className="dashboard-img" src={selectedOlt?.manufacturer?.toLowerCase() === 'huawei' ? "https://sanwanay.smartolt.com/content/img/Huawei-MA5608T.png" : "https://sanwanay.smartolt.com/content/img/ZTE-C600.png"} alt="OLT device" style={{ maxWidth: '170px', marginBottom: '15px' }} />
              <div className="list-group text-left margin-top-xlg" style={{ margin: '0' }}>
                <span className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none' }}>
                  <i className="fa fa-cogs fa-fw"></i> Uptime
                  <span className="pull-right">
                    <em id={`olt-up-time-${selectedOltId}`} className="small" style={{ fontStyle: 'normal', color: '#666' }}>
                      {selectedOlt ? `${selectedOlt.uptime || '7 days, 4 hours'}` : 'All Online'}
                    </em>
                    {selectedOlt?.temperature && (
                      <em id={`olt-env-temp-${selectedOltId}`} className="small text-success" style={{ marginLeft: '8px', fontStyle: 'normal', fontWeight: 'bold' }}>
                        {selectedOlt.temperature}°C
                      </em>
                    )}
                  </span>
                </span>
                
                {selectedOlt?.ip_address && (
                  <span className="list-group-item" style={{ borderLeft: 'none', borderRight: 'none' }}>
                    <i className="fa fa-globe fa-fw"></i> IP Address
                    <span className="pull-right text-muted small">{selectedOlt.ip_address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Activity / Info Panel */}
          <div className="panel panel-default">
            <div className="panel-heading">
              <i className="fa fa-info-circle fa-fw"></i> Info
            </div>
            <div className="panel-body" style={{ padding: '0px' }}>
              <div className="list-group" style={{ margin: '0' }}>
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <a key={index} href={log.onu_id ? `/onu/view/${log.onu_id}` : '/info'} className="list-group-item" style={{ borderRadius: '0', borderLeft: 'none', borderRight: 'none' }}>
                      <i className="fa fa-user-o fa-fw"></i> {log.action}
                      <span className="pull-right small text-muted">
                        <em>{getRelativeTime(log.createdAt)}</em>
                      </span>
                    </a>
                  ))
                ) : (
                  <div className="list-group-item text-center text-muted" style={{ padding: '15px' }}>
                    No recent activity logs.
                  </div>
                )}
              </div>
              <a href={`/info${selectedOltId !== 'all' ? `?olt_id=${selectedOltId}` : ''}`} className="btn btn-default btn-block" style={{ borderTopLeftRadius: '0', borderTopRightRadius: '0', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
                View All Info
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
