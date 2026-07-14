"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use } from 'react';

export default function OltDetailsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const pathname = usePathname();
  const { id: oltId } = use(params);
  
  const tabs = [
    { name: 'OLT details', path: `/olt/olt_details/${oltId}/details` },
    { name: 'OLT cards', path: `/olt/olt_details/${oltId}/cards` },
    { name: 'PON ports', path: `/olt/olt_details/${oltId}/pon_ports` },
    { name: 'Uplink', path: `/olt/olt_details/${oltId}/uplink` },
    { name: 'VLANs', path: `/olt/olt_details/${oltId}/vlans` },
    { name: 'ONU IP Pools', path: `/olt/olt_details/${oltId}/ip_pools` },
    { name: 'Remote ACLs', path: `/olt/olt_details/${oltId}/acls` },
    { name: 'Custom profiles', path: `/olt/olt_details/${oltId}/custom_profiles` },
    { name: 'VoIP profiles', path: `/olt/olt_details/${oltId}/voip_profiles` },
    { name: 'Advanced', path: `/olt/olt_details/${oltId}/advanced` },
  ];

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="margin-bottom-20 margin-top-20">
          <Link href="/olt" className="btn btn-primary margin-bottom">
            Back to OLTs list
          </Link>
        </div>
        
        <ul className="nav nav-tabs margin-bottom-20" style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
          {tabs.map((tab) => (
            <li key={tab.path} className={pathname === tab.path ? 'active' : ''}>
              <Link href={tab.path}>{tab.name}</Link>
            </li>
          ))}
        </ul>

        <div className="tab-content" style={{ padding: '0 15px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
