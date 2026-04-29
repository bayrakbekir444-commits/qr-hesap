import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import CustomerView from './pages/customer/CustomerView';
import MenuView from './pages/customer/MenuView';
import PaymentView from './pages/customer/PaymentView';
import SplitBill from './pages/customer/SplitBill';
import PaymentPage from './pages/customer/PaymentPage';

import Login from './pages/panel/Login';
import Dashboard from './pages/panel/Dashboard';
import MenuManage from './pages/panel/MenuManage';
import TableManage from './pages/panel/TableManage';
import Orders from './pages/panel/Orders';
import Reports from './pages/panel/Reports';
import StaffManage from './pages/panel/StaffManage';
import RestaurantSettings from './pages/panel/RestaurantSettings';
import Coupons from './pages/panel/Coupons';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

import PanelLayout from './components/PanelLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/panel/login" replace />} />

      {/* Customer-facing routes (legacy single QR) */}
      <Route path="/t/:qrToken" element={<CustomerView />} />
      <Route path="/t/:qrToken/split" element={<SplitBill />} />
      <Route path="/t/:qrToken/pay" element={<PaymentPage />} />

      {/* Dual QR: Menu QR */}
      <Route path="/menu/:menuQrToken" element={<MenuView />} />

      {/* Dual QR: Payment QR */}
      <Route path="/pay/:paymentQrToken" element={<PaymentView />} />
      <Route path="/pay/:paymentQrToken/split" element={<SplitBill />} />
      <Route path="/pay/:paymentQrToken/checkout" element={<PaymentPage />} />

      {/* Admin (sistem sorumlusu) routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Panel routes */}
      <Route path="/panel/login" element={<Login />} />
      <Route path="/panel" element={<PanelLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<MenuManage />} />
        <Route path="tables" element={<TableManage />} />
        <Route path="orders" element={<Orders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="staff" element={<StaffManage />} />
        <Route path="settings" element={<RestaurantSettings />} />
        <Route path="coupons" element={<Coupons />} />
      </Route>
    </Routes>
  );
}
