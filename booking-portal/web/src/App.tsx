import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Bookings from './pages/Bookings';
import Validation from './pages/Validation';
import Admin from './pages/Admin';
import Header from './components/Header';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="main-content">
          <Header />
          <div className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/validate/:bookingId" element={<Validation />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
