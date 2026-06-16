'use client';

import { useEffect, useState } from 'react';

export function StatusBar() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    setT(new Date());
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const utc = t ? t.toISOString().slice(11, 19) : '--:--:--';
  return (
    <div className="hib-status">
      <div className="hib-status__cell">
        <span className="hib-status__cell-label">SYS:</span>
        <span style={{ color: 'var(--hib-green)' }}>NOMINAL</span>
      </div>
      <div className="hib-status__cell">
        <span className="hib-status__cell-label">NET:</span>
        <span style={{ color: 'var(--hib-cyan)' }}>SAITO-MESH 4G</span>
      </div>
      <div className="hib-status__cell">
        <span className="hib-status__cell-label">TICK:</span>
        <span className="hib-status__cell-val">~30s</span>
      </div>
      <div className="hib-status__cell hib-status__cell--right">
        <span className="hib-status__cell-label">UTC:</span>
        <span className="hib-status__cell-val">{utc}</span>
      </div>
      <div className="hib-status__cell">
        <span className="hib-status__cell-label">BUILD:</span>
        <span className="hib-status__cell-val">5.2.0</span>
      </div>
    </div>
  );
}
