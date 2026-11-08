import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Camera, Activity, Trophy, History, LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isNativeApp } from '../utils/platform';
import { DownloadAppModal } from './DownloadAppModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const inApp = isNativeApp();

  const navLinks = [
    { to: '/', label: 'Thử Thách', icon: Activity },
    { to: '/workout', label: 'AI Camera', icon: Camera },
    { to: '/running', label: 'Chạy Bộ GPS', icon: Flame },
    { to: '/leaderboard', label: 'Bảng Phong Thần', icon: Trophy },
    { to: '/history', label: 'Lịch Sử', icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#121624]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand - Guaranteed single line on all screen sizes */}
          <Link to="/" className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0">
            <img
              src="/logo.png"
              alt="OPMC Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-contain shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform flex-shrink-0 border border-red-500/40"
            />
            <div className="flex flex-col flex-shrink-0">
              <div className="text-sm sm:text-base md:text-lg font-black tracking-wider bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent whitespace-nowrap">
                OPMC
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold tracking-widest uppercase whitespace-nowrap">
                ONE PUNCH MAN CHALLENGE
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links - No word wrapping */}
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-red-400' : 'text-gray-400'}`} />
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User stats / Hero Rank / Download App / Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Download App Button: Only visible when accessed on Web browser */}
            {!inApp && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-sm flex-shrink-0 whitespace-nowrap cursor-pointer"
                title="Cài đặt App Android (APK)"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="hidden sm:inline">Tải App Android</span>
                <span className="sm:hidden">Tải App</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
                {/* Streak */}
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold whitespace-nowrap flex-shrink-0">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 flex-shrink-0" />
                  <span>{user.current_streak || 0}d</span>
                </div>

                {/* Hero Rank Badge */}
                <div className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wide whitespace-nowrap flex-shrink-0">
                  {user.hero_rank || 'Hero C'} (Lv.{user.level || 1})
                </div>

                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 to-amber-500 text-white hover:opacity-95 shadow-md shadow-red-600/20 transition-all whitespace-nowrap flex-shrink-0"
              >
                Đăng Nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar: Dedicated for Phones (< lg screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#101422]/95 backdrop-blur-md border-t border-gray-800/90 flex lg:hidden items-center justify-around py-1.5 px-1 shadow-2xl safe-area-pb">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[60px] ${
                isActive
                  ? 'text-red-400 font-bold'
                  : 'text-gray-400 hover:text-gray-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-red-500/15' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <DownloadAppModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
    </>
  );
};
