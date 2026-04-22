import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function PanelLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/panel/login', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/panel/login');
  };

  const links = [
    { to: '/panel', label: 'Genel Bakis', icon: '\u2302' },
    { to: '/panel/orders', label: 'Siparisler', icon: '\u2615' },
    { to: '/panel/menu', label: 'Menu Yonetimi', icon: '\u2630' },
    { to: '/panel/tables', label: 'Masa Yonetimi', icon: '\u25A6' },
    { to: '/panel/reports', label: 'Raporlar', icon: '\u2261' },
    { to: '/panel/staff', label: 'Personel', icon: '\u263A' },
    { to: '/panel/coupons', label: 'Kuponlar', icon: '\u1F3AB' },
    { to: '/panel/settings', label: 'Restoran Bilgileri', icon: '\u2699' },
  ];

  return (
    <div className="panel-layout">
      <button className="panel-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>

      <aside className={`panel-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="panel-logo">
          <h2>QR Hesap</h2>
          <span>Restoran Paneli</span>
        </div>
        <nav className="panel-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/panel'}
              className={({ isActive }) => `panel-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="panel-nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="panel-logout" onClick={handleLogout}>
          Cikis Yap
        </button>
      </aside>

      {sidebarOpen && <div className="panel-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="panel-main">
        <Outlet />
      </main>
    </div>
  );
}
