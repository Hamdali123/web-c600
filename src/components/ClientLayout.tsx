"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/auth/login';
  const [isReady, setIsReady] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdowns, setDropdowns] = useState<Record<string, boolean>>({
    reports: false,
    settings: false,
  });

  const toggleDropdown = (name: string) => {
    setDropdowns(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  useEffect(() => {
    setIsReady(true);
  }, [pathname, isLoginPage, router]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/system/write');
      const data = await res.json();
      if (data.success) {
        alert('Configuration saved successfully on all registered OLTs!');
      } else {
        alert(`Error saving configuration: ${data.error}`);
      }
    } catch (e) {
      alert('Network error while saving configuration.');
    }
    setIsSaving(false);
    setShowSaveModal(false);
  };

  if (!isReady && !isLoginPage) {
    return null;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div id="content-wrapper">
      <div className="navbar navbar-default navbar-fixed-top default-menu">
        <div className="container">
          <div className="navbar-header">
            <button 
              className="navbar-toggle collapsed" 
              type="button" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand text-ellipsis max-width-250" href="/" title="SANWANAY NETWORK">SANWANAY NETWORK</a>
          </div>

          <div className={`navbar-collapse collapse ${mobileMenuOpen ? 'in' : ''}`} id="navbar-main" aria-expanded={mobileMenuOpen}>
            <ul className="nav navbar-nav">
              <li><a href="/onu/unconfigured">Unconfigured</a></li>
              <li><a href="/onu/configured">Configured</a></li>
              <li><a href="/graphs">Graphs</a></li>
              <li><a href="/diagnostics">Diagnostics</a></li>
              <li><a href="/reports/tasks">Tasks</a></li>
              <li className={`dropdown ${dropdowns.reports ? 'open' : ''}`}>
                <a className="dropdown-toggle" onClick={(e) => { e.preventDefault(); toggleDropdown('reports'); }} href="#">Reports <span className="caret"></span></a>
                <ul className="dropdown-menu">
                  <li><a href="/reports/authorizations/list">Authorizations</a></li>
                  <li><a href="/reports/export">Export</a></li>
                  <li><a href="/reports/import">Import</a></li>
                  <li><a href="/config_comparison">Find config mismatches (DB vs OLT)</a></li>
                </ul>
              </li>
              <li>
                <a href="#" className="save-configuration-anchor" onClick={(e) => { e.preventDefault(); setShowSaveModal(true); }}>
                  Save Config
                </a>
              </li>
              <li className={`dropdown ${dropdowns.settings ? 'open' : ''}`}>
                <a className="dropdown-toggle" onClick={(e) => { e.preventDefault(); toggleDropdown('settings'); }} href="#">Settings <span className="caret"></span></a>
                <ul className="dropdown-menu">
                  <li><a href="/locations/listing">Zones</a></li>
                  <li><a href="/odbs/listing">ODBs</a></li>
                  <li><a href="/onu_types/listing">ONU types</a></li>
                  <li><a href="/speed_profiles">Speed profiles</a></li>
                  <li><a href="/olt">OLTs</a></li>
                  <li><a href="/uplink_ports">Uplink ports</a></li>
                  <li><a href="/system_config">VPN & TR069</a></li>
                  <li><a href="/onu_authorization_presets/listing">Authorization presets</a></li>
                  <li><a href="/general">General</a></li>
                  <li><a href="/general/listing/billing">Billing</a></li>
                </ul>
              </li>
            </ul>

            <ul className="nav navbar-nav navbar-right">
              <li>
                <a href="#" id="smartolt-night-toggle" onClick={toggleTheme} title={isDarkMode ? "Light mode" : "Night mode"} style={{color: '#f0ad4e'}}>
                  <i className={`fa ${isDarkMode ? 'fa-sun-o' : 'fa-moon-o'} font-size-20`}></i>
                </a>
              </li>
              <li><a href="/auth" title="Edit user mohamadsanwani9@gmail.com"><i className="fa fa-user glyphicon-white font-size-20"> </i></a></li>
              <li><a href="/auth/logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}><i className="glyphicon glyphicon-off glyphicon-white"> </i> Log out</a></li>
            </ul>

          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="container" style={{ marginTop: '70px' }}>
        {children}
      </div>

      {/* Global Save Configuration Modal */}
      {showSaveModal && (
        <div className="modal fade in" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="close" onClick={() => setShowSaveModal(false)}>&times;</button>
                <h3 className="modal-title" id="saveConfigModalLabel">Save configuration</h3>
              </div>
              <div className="modal-body">
                <p>This will save the current OLT(s) configuration as startup configuration. It may take up to 3 minutes for the OLT(s) to finish saving the config. Are you sure?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-link" onClick={() => setShowSaveModal(false)} disabled={isSaving}>No, cancel</button>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving ? <><i className="fa fa-spinner fa-spin"></i> Saving...</> : 'Yes, save configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
