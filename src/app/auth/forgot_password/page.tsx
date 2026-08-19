"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.body.className = 'responsive-background';
    return () => {
      document.body.className = '';
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
              {submitted ? (
                <div>
                  <div className="alert alert-warning" style={{ padding: '10px', fontSize: '13px', marginBottom: '20px' }}>
                    <i className="fa fa-info-circle"></i> Password reset is not available via email on this system.
                  </div>
                  <p style={{ fontSize: '13px', color: '#555' }}>
                    Please contact your administrator to reset the password for{' '}
                    <strong>{identity}</strong>.
                  </p>
                  <Link href="/auth/login" className="btn btn-default btn-block" style={{ marginTop: '15px' }}>
                    Back to login
                  </Link>
                </div>
              ) : (
                <form role="form" onSubmit={handleSubmit}>
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
                        required
                      />
                    </div>
                    <input
                      type="submit"
                      value="Request password reset"
                      className="btn btn-lg btn-success btn-block"
                    />
                  </fieldset>
                </form>
              )}
              <br />
              <div className="center-block">
                <Link href="/auth/login">Back to login</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}