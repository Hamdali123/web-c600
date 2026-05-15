"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: 'url("https://www.smartolt.com/images/wood_navbar_bg.jpg") repeat, url("https://www.smartolt.com/images/world_map_navbar.png") center/cover no-repeat',
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '20px'
      }}>
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '6px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Branded Header */}
          <div style={{ 
            padding: '30px 20px', 
            textAlign: 'center',
            backgroundColor: '#fff'
          }}>
             <h1 style={{ 
              margin: 0, 
              color: '#333', 
              fontSize: '32px', 
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}>
              SMART<span style={{ margin: '0 5px' }}><i className="fa fa-globe" style={{ color: '#2086ca' }}></i></span>OLT
            </h1>
            <p style={{ color: '#777', marginTop: '10px', fontSize: '14px' }}>Network Management System</p>
          </div>

          <div style={{ padding: '0 40px 40px 40px' }}>
            {error && (
              <div className="alert alert-danger" style={{ padding: '10px', fontSize: '13px', marginBottom: '20px', backgroundColor: '#f2dede', border: '1px solid #ebccd1', color: '#a94442', borderRadius: '4px' }}>
                <i className="fa fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#999' }}>
                    <i className="fa fa-user"></i>
                  </span>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="Identity" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ 
                      height: '42px', 
                      paddingLeft: '35px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#999' }}>
                    <i className="fa fa-lock"></i>
                  </span>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ 
                      height: '42px', 
                      paddingLeft: '35px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <label style={{ fontSize: '13px', color: '#666', fontWeight: 'normal', margin: 0, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Remember me
                </label>
                <a href="#" style={{ color: '#2086ca', fontSize: '13px', textDecoration: 'none' }}>Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className="btn-login-official" 
                disabled={loading}
              >
                {loading ? <i className="fa fa-spinner fa-spin"></i> : 'Log in'}
              </button>
            </form>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '25px', color: '#fff', fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          &copy; {new Date().getFullYear()} SANWANAY NETWORK. All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .btn-login-official {
          width: 100%;
          height: 44px;
          background-color: #337ab7;
          border: 1px solid #2e6da4;
          color: #fff;
          border-radius: 4px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-login-official:hover {
          background-color: #286090;
        }
        .btn-login-official:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
