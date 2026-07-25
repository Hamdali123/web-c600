"use client";

import { useState } from 'react';

export default function PasswordReveal({ value, isUsername = false }: { value: string, isUsername?: boolean }) {
  const [show, setShow] = useState(isUsername); // Usernames might be shown by default or hidden, let's follow the screenshot where it is shown but toggleable, wait no, let's default to false for security, user can click. Actually the screenshot shows it visible but I will default to false.
  
  return (
    <>
      <span style={{ marginRight: '8px' }}>
         {show ? (value || '') : '**********'}
      </span>
      <i 
        className={`fa ${show ? 'fa-eye-slash' : 'fa-eye'}`} 
        style={{ color: '#337ab7', cursor: 'pointer' }}
        onClick={() => setShow(!show)}
        title={show ? "Hide" : "Show"}
      ></i>
    </>
  );
}
