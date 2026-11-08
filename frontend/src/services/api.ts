import axios from 'axios';
import { isNativeApp } from '../utils/platform';

const inApp = isNativeApp();

// In native mobile app (Capacitor on Android/iOS), window.location.hostname is 'localhost'.
// The phone does NOT run a local Node server, so it MUST connect to the cloud backend!
// Only use http://localhost:5000/api when developing on PC Web browser!
const isDevBrowser = !inApp && typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const defaultBackendUrl = isDevBrowser 
  ? 'http://localhost:5000/api' 
  : 'https://one-punch-man-challenge.onrender.com/api';

const defaultWsUrl = isDevBrowser 
  ? 'ws://localhost:8000/ws/workout' 
  : 'wss://opm-challenge-ai-service.onrender.com/ws/workout';

function cleanApiUrl(raw?: string): string {
  let u = (raw || '').trim();
  if (!u) {
    u = defaultBackendUrl;
  }
  // Remove trailing slashes
  u = u.replace(/\/+$/, '');
  // Normalize double slashes in path (preserving https:// or http://)
  u = u.replace(/([^:])\/+/g, '$1/');
  // Ensure it ends with /api exactly once
  if (!u.endsWith('/api')) {
    u = `${u}/api`;
  }
  return u;
}

export const API_BASE_URL = cleanApiUrl(import.meta.env.VITE_API_URL as string);
export const AI_WS_URL = (import.meta.env.VITE_AI_WS_URL as string) || defaultWsUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.url) {
    // Ensure relative path starts with single / without duplicate slashes
    config.url = '/' + config.url.replace(/^\/+/, '');
  }
  const token = localStorage.getItem('opm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

export const challengeService = {
  getLevels: () => api.get('/challenge/levels'),
  getToday: () => api.get('/challenge/today'),
};

export const workoutService = {
  logResult: (data: any) => api.post('/workouts/log', data),
  getHistory: () => api.get('/workouts/history'),
};

export const runningService = {
  logSession: (data: any) => api.post('/running/log', data),
  getSessions: () => api.get('/running/history'),
};

export const statsService = {
  getMe: () => api.get('/stats/me'),
  getLeaderboard: () => api.get('/stats/leaderboard'),
};
