import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Friendly error formatter
  const formatErrorMessage = (err: any, registering: boolean): string => {
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message || err.message || '';

    if (status === 401) {
      return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
    }
    if (status === 409 || serverMsg.includes('tồn tại') || serverMsg.includes('duplicate') || serverMsg.includes('23505')) {
      return 'Tên anh hùng (Username) hoặc Email này đã có người đăng ký. Vui lòng chọn tên khác!';
    }
    if (status === 400) {
      return serverMsg.includes('đầy đủ') ? serverMsg : 'Vui lòng điền đầy đủ tất cả thông tin hợp lệ.';
    }
    if (status === 404 || serverMsg.includes('Route not found') || serverMsg.includes('404')) {
      return 'Cổng dịch vụ đang kết nối. Vui lòng thử lại sau vài giây!';
    }
    if (serverMsg.includes('Network Error') || !err.response) {
      return 'Hệ thống đang kết nối máy chủ, vui lòng đợi vài giây và bấm lại!';
    }
    return registering
      ? 'Đăng ký không thành công. Vui lòng thử lại sau!'
      : 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side validations
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername.length < 3) {
      setError('Tên anh hùng (Username) phải có ít nhất 3 ký tự.');
      return;
    }

    if (isRegister) {
      const cleanEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Địa chỉ email không đúng định dạng.');
        return;
      }
    }

    if (cleanPassword.length < 6) {
      setError('Mật khẩu bảo mật phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const res = await authService.register({
          username: cleanUsername,
          email: email.trim(),
          password: cleanPassword,
        });

        if (res.data.success) {
          setSuccessMsg('🎉 Đăng ký tài khoản anh hùng thành công! Đang chuyển hướng...');
          setTimeout(() => {
            login(res.data.token, res.data.user);
            navigate('/');
          }, 1200);
        } else {
          setError(res.data.message || 'Đăng ký không thành công.');
        }
      } else {
        const res = await authService.login({
          usernameOrEmail: cleanUsername,
          password: cleanPassword,
        });

        if (res.data.success) {
          setSuccessMsg('⚡ Đăng nhập thành công! Chào mừng anh hùng trở lại.');
          setTimeout(() => {
            login(res.data.token, res.data.user);
            navigate('/');
          }, 1000);
        } else {
          setError(res.data.message || 'Đăng nhập không thành công.');
        }
      }
    } catch (err: any) {
      console.error('Auth request error:', err);
      setError(formatErrorMessage(err, isRegister));
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Guest Login if user wants immediate access
  const handleGuestDemo = () => {
    const mockUser = {
      id: 99,
      username: username.trim() || 'Hero Saitama',
      email: email.trim() || 'saitama@hero.com',
      hero_rank: 'Hero C',
      level: 1,
      current_streak: 1,
    };
    login('mock-jwt-token-saitama-2026', mockUser);
    navigate('/');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-[#141824] rounded-3xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <img
            src="/logo.png"
            alt="OPMC Logo"
            className="w-20 h-20 rounded-full mx-auto object-contain shadow-2xl shadow-red-500/30 mb-4 border-2 border-red-500/40 transform hover:scale-105 transition-transform"
          />
          <h2 className="text-2xl font-black text-white tracking-wide uppercase">
            {isRegister ? 'Gia Nhập Hiệp Hội Anh Hùng' : 'Đăng Nhập Anh Hùng'}
          </h2>
          <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
            {isRegister
              ? 'Tạo hồ sơ rèn luyện và bắt đầu hành trình phá vỡ giới hạn thể lực!'
              : 'Tiếp tục chuỗi ngày 100 Push-up, 100 Sit-up, 100 Squat, Chạy 10km!'}
          </p>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-semibold flex items-start space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5 tracking-wider">
              Tên Anh Hùng (Username)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: saitama_hero"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5 tracking-wider">
                Địa Chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hero@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Mật Khẩu
              </label>
              <span className="text-[11px] text-gray-500">Tối thiểu 6 ký tự</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:opacity-95 text-white font-black text-sm shadow-xl shadow-red-600/30 transition-all flex items-center justify-center space-x-2 mt-3 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Đang xử lý kết nối...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>{isRegister ? 'Tạo Hồ Sơ Anh Hùng' : 'Vào Luyện Tập Ngay'}</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Register/Login */}
        <div className="mt-6 pt-5 border-t border-gray-800/80 text-center text-xs text-gray-400 relative z-10 flex flex-col space-y-3">
          <div>
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản anh hùng?'}{' '}
            <button
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setIsRegister(!isRegister);
              }}
              className="text-amber-400 font-bold hover:underline cursor-pointer"
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGuestDemo}
              className="inline-flex items-center space-x-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Trải nghiệm nhanh không cần mật khẩu (Chế độ Khách)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
