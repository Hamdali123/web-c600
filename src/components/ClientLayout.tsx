"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [isReady, setIsReady] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const hasToken = document.cookie.includes('auth_token');
    if (!hasToken && !isLoginPage) {
      router.push('/login');
    } else if (hasToken && isLoginPage) {
      router.push('/');
    } else {
      setIsReady(true);
    }
  }, [pathname, isLoginPage, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (isReady && !isLoginPage) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isReady, isLoginPage]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  if (!isReady && !isLoginPage) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' }}>
      <i className="fa fa-spinner fa-spin fa-3x" style={{ color: '#337ab7' }}></i>
    </div>;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div id="wrapper" style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      {/* SmartOLT Styled Top Navbar */}
      <nav 
        className="navbar navbar-static-top" 
        style={{ 
          marginBottom: 0, 
          minHeight: '60px',
          background: 'url("https://www.smartolt.com/images/wood_navbar_bg.jpg") repeat, url("https://www.smartolt.com/images/world_map_navbar.png") center/cover no-repeat',
          backgroundColor: '#1a1a1a',
          borderBottom: 'none',
          padding: '0',
          zIndex: 1000
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '60px', padding: '0 20px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '30px' }}>
            <a href="/" style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '0.5px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              SANWANAY NETWORK
            </a>
          </div>
          
          <ul style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, alignItems: 'center', height: '100%' }}>
            <li><a href="/onu/unconfigured" className={pathname === '/onu/unconfigured' ? 'nav-active' : 'nav-link'}>Unconfigured</a></li>
            <li><a href="/onu/configured" className={pathname === '/onu/configured' ? 'nav-active' : 'nav-link'}>Configured</a></li>
            <li><a href="/graphs" className={pathname === '/graphs' ? 'nav-active' : 'nav-link'}>Graphs</a></li>
            <li><a href="/diagnostics" className={pathname === '/diagnostics' ? 'nav-active' : 'nav-link'}>Diagnostics</a></li>
            <li><a href="/tasks" className={pathname === '/tasks' ? 'nav-active' : 'nav-link'}>Tasks</a></li>
            
            <li onMouseEnter={() => setReportsOpen(true)} onMouseLeave={() => setReportsOpen(false)} style={{ position: 'relative' }}>
              <a href="#" className="nav-link">Reports <span className="caret"></span></a>
              {reportsOpen && (
                <ul className="dropdown-style">
                  <li><a href="/reports/authorizations">Authorizations</a></li>
                  <li><a href="/reports/signal-history">Signal history</a></li>
                  <li><a href="/reports/status-history">Status history</a></li>
                </ul>
              )}
            </li>

            <li><a href="/save-config" className={pathname === '/save-config' ? 'nav-active' : 'nav-link'}>Save config</a></li>
            
            <li onMouseEnter={() => setSettingsOpen(true)} onMouseLeave={() => setSettingsOpen(false)} style={{ position: 'relative' }}>
              <a href="/settings" className="nav-link">Settings <span className="caret"></span></a>
              {settingsOpen && (
                <ul className="dropdown-style" style={{ width: '220px' }}>
                  <li><a href="/settings/olts">OLTs</a></li>
                  <li><a href="/settings/zones">Zones</a></li>
                  <li><a href="/settings/odbs">ODBs</a></li>
                  <li><a href="/settings/onu-types">ONU types</a></li>
                  <li><a href="/settings/speed-profiles">Speed profiles</a></li>
                  <li><a href="/settings/auth-presets">Authorization presets</a></li>
                </ul>
              )}
            </li>
          </ul>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '25px' }}>
             <a href="#" style={{ color: '#fff', fontSize: '18px', opacity: 0.8 }}><i className="fa fa-user"></i></a>
             <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: '#fff', fontSize: '15px', textDecoration: 'none', fontWeight: '500' }}>
                <i className="fa fa-power-off"></i> Log out
             </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '0' }}>
        {children}
      </div>

      <style jsx global>{`
        body {
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: #333;
        }
        .nav-link {
          color: #fff !important;
          padding: 20px 15px !important;
          text-decoration: none !important;
          font-size: 14px !important;
          display: block !important;
          transition: all 0.2s !important;
          opacity: 0.85;
        }
        .nav-link:hover {
          opacity: 1;
          color: #fff !important;
          background-color: rgba(255,255,255,0.1) !important;
        }
        .nav-active {
          color: #fff !important;
          padding: 20px 15px !important;
          text-decoration: none !important;
          font-size: 14px !important;
          display: block !important;
          background-color: rgba(255,255,255,0.15) !important;
          font-weight: bold !important;
        }
        .dropdown-style {
          position: absolute;
          top: 100%;
          left: 0;
          background: #fff;
          list-style: none;
          padding: 5px 0;
          margin: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          border-radius: 0 0 4px 4px;
          z-index: 1000;
          width: 180px;
        }
        .dropdown-style li a {
          display: block;
          padding: 8px 20px;
          color: #333;
          text-decoration: none;
          font-size: 13px;
        }
        .dropdown-style li a:hover {
          background-color: #f5f5f5;
          color: #2086ca;
        }
        .caret {
          display: inline-block;
          width: 0;
          height: 0;
          margin-left: 2px;
          vertical-align: middle;
          border-top: 4px dashed;
          border-right: 4px solid transparent;
          border-left: 4px solid transparent;
        }
      `}</style>
    </div>
  );
}
