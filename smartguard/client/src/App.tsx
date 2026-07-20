import { Routes, Route, Navigate } from 'react-router-dom';
import { SceneProvider } from './scene';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DeviceDetail from './pages/DeviceDetail';
import Alerts from './pages/Alerts';
import Orders from './pages/Orders';

export default function App() {
  return (
    <SceneProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/device/:id" element={<DeviceDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SceneProvider>
  );
}
