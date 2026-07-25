"use client";

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SnmpTrafficChart({ oltId }: { oltId: number }) {
  const [data, setData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: 'Traffic In (Mbps)',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Traffic Out (Mbps)',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  });
  
  const [uptime, setUptime] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSnmp = async () => {
      try {
        const res = await fetch(`/api/olt/${oltId}/snmp`);
        const json = await res.json();
        
        if (!res.ok) {
           setError(json.error === 'Failed to communicate with OLT via SNMP' ? "OLT Offline / SNMP Timeout" : "Failed to fetch SNMP data.");
           return;
        }

        if (json.success && isMounted) {
           setError(null);
           setUptime(`${json.data.uptimeDays} days (${json.data.uptimeTicks} ticks)`);
           
           const now = new Date().toLocaleTimeString();
           
           // Convert raw octets to Mbps approx (for dummy data purposes)
           const tIn = (json.data.trafficIn / 1000000).toFixed(2);
           const tOut = (json.data.trafficOut / 1000000).toFixed(2);
           
           setData((prev: any) => {
             const newLabels = [...prev.labels, now].slice(-10); // Keep last 10 ticks
             const newInData = [...prev.datasets[0].data, tIn].slice(-10);
             const newOutData = [...prev.datasets[1].data, tOut].slice(-10);
             
             return {
               labels: newLabels,
               datasets: [
                 { ...prev.datasets[0], data: newInData },
                 { ...prev.datasets[1], data: newOutData }
               ]
             };
           });
        }
      } catch (err) {
         if (isMounted) setError("Connection error.");
      }
    };

    fetchSnmp();
    const interval = setInterval(fetchSnmp, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [oltId]);

  return (
    <div className="panel panel-default" style={{ marginTop: '20px', padding: '15px', borderRadius: '4px', border: '1px solid #ddd' }}>
      <h4 style={{ marginTop: 0, fontWeight: 'bold', color: '#4a5568' }}>Real-Time SNMP Traffic</h4>
      <div style={{ marginBottom: '15px' }}>
        <strong>Uptime:</strong> {uptime}
        {error && <span style={{ color: 'red', marginLeft: '15px' }}>{error}</span>}
      </div>
      <div style={{ height: '300px' }}>
        <Line 
           options={{ responsive: true, maintainAspectRatio: false }} 
           data={data} 
        />
      </div>
    </div>
  );
}
