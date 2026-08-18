"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Next.js body class effect
  useEffect(() => {
    document.body.className = 'responsive-background';
    return () => {
      document.body.className = '';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password }),
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
    <div className="container-fluid content-wrap">
      <div className="row">
        <div className="col-md-4 col-md-offset-4">
          <div className="login-panel panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title"><img src="https://sanwanay.smartolt.com/vendor/bootstrap/img/logo-light.png" /></h3>
            </div>
            <div className="panel-body">
              {error && (
                <div className="alert alert-danger" style={{ padding: '10px', fontSize: '13px', marginBottom: '20px' }}>
                  <i className="fa fa-exclamation-circle"></i> {error}
                </div>
              )}
              <form role="form" onSubmit={handleLogin}>
                <input type="hidden" name="referrer" value="" />
                <fieldset>
                  <div className="form-group">
                    <input 
                      type="text" 
                      name="identity" 
                      id="identity" 
                      className="form-control" 
                      placeholder="Email / Username"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="password" 
                      name="password" 
                      id="password" 
                      className="form-control" 
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="checkbox">
                    <label>
                      <input type="checkbox" name="remember" value="1" id="remember" />
                      Remember me
                    </label>
                  </div>
                  <input 
                    type="submit" 
                    value={loading ? 'Logging in...' : 'Login'}
                    className="btn btn-lg btn-success btn-block"
                    disabled={loading}
                  />
                </fieldset>
              </form>          
              <br />
              <div className="center-block">
                <a href="/auth/forgot_password">Forgot your password</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
