import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { WorkoutCamera } from './pages/WorkoutCamera';
import { RunningTracker } from './pages/RunningTracker';
import { Leaderboard } from './pages/Leaderboard';
import { History } from './pages/History';
import { Login } from './pages/Login';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0d0f17] text-gray-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
          <Navbar />
          <main className="flex-1 pb-16">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workout" element={<WorkoutCamera />} />
              <Route path="/running" element={<RunningTracker />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>

          <footer className="border-t border-gray-900 bg-[#0b0d14] py-6 text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <span className="font-bold text-gray-400">One Punch Man Challenge</span> — Ứng Dụng Rèn Luyện Thể Lực & Theo Dõi Thử Thách AI
              </div>
              <div className="text-gray-400">
                AI Fitness Tracker • Computer Vision & Machine Learning
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
