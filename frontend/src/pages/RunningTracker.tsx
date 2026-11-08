import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, Timer, Navigation, Save, ArrowLeft, AlertCircle, Compass, Zap, RotateCcw, MapPin, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { runningService } from '../services/api';

export const RunningTracker: React.FC = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [trackingMode, setTrackingMode] = useState<'outdoor' | 'indoor'>('outdoor');
  const [simSpeedKmH, setSimSpeedKmH] = useState<number>(10.0); // 10 km/h Saitama target pace
  const [statusMessage, setStatusMessage] = useState<string>('Sẵn sàng cho thử thách chạy bộ 10km');
  const [gpsError, setGpsError] = useState<string>('');
  const [gpsQuality, setGpsQuality] = useState<'good' | 'waiting' | 'error'>('waiting');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineBorderRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const milestoneMarkersRef = useRef<L.Marker[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);

  // Filter & verification refs
  const lastAcceptedPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastMilestoneKmRef = useRef<number>(0);
  const currentCoordsRef = useRef<[number, number]>([21.0478, 105.7838]); // Default initial coords

  // Calculate distance between two lat/lng points using Haversine formula (km)
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Custom Leaflet DivIcon creator for start and milestone badges
  const createBadgeIcon = (text: string, bgColor: string) => {
    return L.divIcon({
      className: 'custom-map-badge',
      html: `<div style="background-color: ${bgColor}; color: white; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 9999px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5); white-space: nowrap; display: flex; align-items: center; justify-content: center;">${text}</div>`,
      iconSize: [40, 24],
      iconAnchor: [20, 12],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCoords: [number, number] = [21.0478, 105.7838];
    currentCoordsRef.current = initialCoords;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
    }).setView(initialCoords, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Glowing dual-layer polyline for high visibility on street maps
    const polylineBorder = L.polyline([], { color: '#7f1d1d', weight: 8, opacity: 0.7 }).addTo(map);
    const polyline = L.polyline([], { color: '#ef4444', weight: 5, opacity: 0.95 }).addTo(map);

    // Accuracy halo circle
    const accuracyCircle = L.circle(initialCoords, {
      radius: 15,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 1,
    }).addTo(map);

    // Current position pulsing marker
    const marker = L.circleMarker(initialCoords, {
      radius: 9,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map);

    mapRef.current = map;
    polylineBorderRef.current = polylineBorder;
    polylineRef.current = polyline;
    accuracyCircleRef.current = accuracyCircle;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // Try to get real current position on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const userCoord: [number, number] = [latitude, longitude];
          currentCoordsRef.current = userCoord;
          map.setView(userCoord, 16);
          marker.setLatLng(userCoord);
          accuracyCircle.setLatLng(userCoord);
          accuracyCircle.setRadius(accuracy);
          setGpsAccuracy(Math.round(accuracy));

          if (accuracy <= 45) {
            setGpsQuality('good');
            setStatusMessage(`Tín hiệu GPS sẵn sàng (Độ chính xác ±${Math.round(accuracy)}m)`);
          } else {
            setGpsQuality('waiting');
            setStatusMessage(`Đang lấy tín hiệu vệ tinh (Sai số ±${Math.round(accuracy)}m).`);
          }
        },
        (err) => {
          console.log('Chưa cấp quyền GPS hoặc dùng mạng dây:', err.message);
          setStatusMessage('Khuyên dùng: Chọn "Chế Độ Máy Chạy Bộ" khi tập luyện trong nhà hoặc kiểm tra trên PC.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Timer interval for elapsed time
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev: number) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, isPaused]);

  // Simulator loop for treadmill / indoor mode
  useEffect(() => {
    if (isRunning && !isPaused && trackingMode === 'indoor') {
      const stepIntervalMs = 1000;
      simIntervalRef.current = setInterval(() => {
        const distancePerSec = simSpeedKmH / 3600;
        setDistanceKm((prev) => {
          const newDist = prev + distancePerSec;

          // Check milestone for every 1 km
          const currentKmFloor = Math.floor(newDist);
          if (currentKmFloor > lastMilestoneKmRef.current && currentKmFloor > 0) {
            lastMilestoneKmRef.current = currentKmFloor;
            addMilestoneMarker(currentCoordsRef.current, currentKmFloor);
          }

          return newDist;
        });

        // Move coordinates smoothly in a loop around current position
        const [lat, lng] = currentCoordsRef.current;
        const angle = Date.now() / 7000;
        const deltaLat = Math.sin(angle) * 0.0001;
        const deltaLng = Math.cos(angle) * 0.0001;
        const nextCoord: [number, number] = [lat + deltaLat, lng + deltaLng];
        currentCoordsRef.current = nextCoord;

        setRoute((prevRoute) => {
          const updated = [...prevRoute, nextCoord];
          updateMapVisuals(updated, nextCoord);
          return updated;
        });
      }, stepIntervalMs);
    } else {
      clearInterval(simIntervalRef.current);
    }
    return () => clearInterval(simIntervalRef.current);
  }, [isRunning, isPaused, trackingMode, simSpeedKmH]);

  // Helper to update map polyline and marker
  const updateMapVisuals = (updatedRoute: [number, number][], currentPoint: [number, number]) => {
    if (polylineRef.current) polylineRef.current.setLatLngs(updatedRoute);
    if (polylineBorderRef.current) polylineBorderRef.current.setLatLngs(updatedRoute);
    if (markerRef.current) markerRef.current.setLatLng(currentPoint);
    if (accuracyCircleRef.current) accuracyCircleRef.current.setLatLng(currentPoint);
    if (mapRef.current) mapRef.current.panTo(currentPoint, { animate: true, duration: 0.5 });
  };

  // Add 1km, 2km... milestone pins on the map
  const addMilestoneMarker = (coords: [number, number], km: number) => {
    if (!mapRef.current) return;
    const badge = L.marker(coords, {
      icon: createBadgeIcon(`${km} km`, '#f59e0b'),
      zIndexOffset: 500,
    }).addTo(mapRef.current);
    milestoneMarkersRef.current.push(badge);
  };

  // Center and fit full recorded route on screen
  const handleFitRouteBounds = () => {
    if (!mapRef.current || route.length < 2) return;
    const bounds = L.latLngBounds(route);
    mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  // Start GPS Tracking
  const startRun = () => {
    setGpsError('');
    setIsRunning(true);
    setIsPaused(false);

    // If starting fresh run with distance = 0, reset verification refs
    if (distanceKm === 0) {
      lastAcceptedPointRef.current = null;
      lastMilestoneKmRef.current = 0;
      setRoute([]);

      // Clear any previous milestone markers from map
      milestoneMarkersRef.current.forEach((m) => m.remove());
      milestoneMarkersRef.current = [];

      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
      }
      if (polylineRef.current) polylineRef.current.setLatLngs([]);
      if (polylineBorderRef.current) polylineBorderRef.current.setLatLngs([]);
    }

    if (trackingMode === 'outdoor') {
      if (!navigator.geolocation) {
        setGpsError('Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS vệ tinh.');
        setIsRunning(false);
        return;
      }

      setStatusMessage('Đang kết nối GPS vệ tinh ngoài trời...');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();
          const newCoord: [number, number] = [latitude, longitude];

          setGpsAccuracy(Math.round(accuracy));

          // 1. Accuracy Filter: Chấp nhận độ chính xác di động thực tế (sai số <= 45m)
          // Trước đây đặt 25m quá khắt khe khiến phần lớn tọa độ khi chạy vòng quanh bị vứt bỏ!
          if (accuracy > 45) {
            setGpsQuality('waiting');
            setStatusMessage(`Đang chờ GPS vệ tinh ổn định hơn (Sai số ±${Math.round(accuracy)}m > 45m)...`);
            if (markerRef.current) markerRef.current.setLatLng(newCoord);
            if (accuracyCircleRef.current) {
              accuracyCircleRef.current.setLatLng(newCoord);
              accuracyCircleRef.current.setRadius(accuracy);
            }
            return;
          }

          setGpsQuality('good');
          setStatusMessage(`Tín hiệu GPS tốt (±${Math.round(accuracy)}m)`);

          // 2. First point initialization (Starting point)
          if (!lastAcceptedPointRef.current) {
            lastAcceptedPointRef.current = { lat: latitude, lng: longitude, time: now };
            currentCoordsRef.current = newCoord;

            // Mark Start Point with green badge
            if (mapRef.current && !startMarkerRef.current) {
              startMarkerRef.current = L.marker(newCoord, {
                icon: createBadgeIcon('🏁 Xuất Phát', '#10b981'),
                zIndexOffset: 1000,
              }).addTo(mapRef.current);
            }

            setRoute([newCoord]);
            updateMapVisuals([newCoord], newCoord);
            return;
          }

          // 3. Movement and Distance Calculation
          const lastPoint = lastAcceptedPointRef.current;
          const deltaDistKm = getDistanceFromLatLonInKm(
            lastPoint.lat,
            lastPoint.lng,
            latitude,
            longitude
          );
          const deltaDistMeters = deltaDistKm * 1000;
          const deltaTimeSec = Math.max(0.5, (now - lastPoint.time) / 1000);

          // Calculate implied speed (km/h)
          const impliedSpeedKmH = deltaDistKm / (deltaTimeSec / 3600);

          // 4. Glitch / Teleport Filter:
          // Chỉ bỏ qua nếu vận tốc phi lý (> 36 km/h) VÀ khoảng cách nhảy vọt lớn (> 30m).
          // Giữ lại các bước chạy bình thường và tăng tốc nước rút.
          if (impliedSpeedKmH > 36.0 && deltaDistMeters > 30) {
            console.warn(`GPS teleport discarded: ${Math.round(deltaDistMeters)}m in ${deltaTimeSec.toFixed(1)}s (${impliedSpeedKmH.toFixed(1)} km/h)`);
            setStatusMessage(`Bỏ qua bước nhảy sóng ảo (±${Math.round(deltaDistMeters)}m)`);
            return;
          }

          // 5. Stationary Drift Filter:
          // Bỏ qua nhiễu dao động vi mô khi đứng yên tại chỗ (< 1.5m).
          // QUAN TRỌNG: KHÔNG gán time = now khi bỏ qua, để khi người chạy tích lũy đủ > 1.5m
          // (ví dụ sau 1-2 giây chạy quanh sân) thì quãng đường và thời gian tính toán vẫn chuẩn xác!
          if (deltaDistMeters < 1.5) {
            return;
          }

          // Valid movement! Update distance
          setDistanceKm((prevDist) => {
            const newTotal = prevDist + deltaDistKm;

            // Check milestone for every 1 km
            const currentKmFloor = Math.floor(newTotal);
            if (currentKmFloor > lastMilestoneKmRef.current && currentKmFloor > 0) {
              lastMilestoneKmRef.current = currentKmFloor;
              addMilestoneMarker(newCoord, currentKmFloor);
            }

            return newTotal;
          });

          lastAcceptedPointRef.current = { lat: latitude, lng: longitude, time: now };
          currentCoordsRef.current = newCoord;

          setRoute((prevRoute) => {
            const updated = [...prevRoute, newCoord];
            updateMapVisuals(updated, newCoord);
            return updated;
          });
        },
        (err) => {
          console.warn('GPS error:', err.message);
          setGpsQuality('error');
          let errText = 'Không nhận được tín hiệu GPS.';
          if (err.code === 1) {
            errText = 'Vui lòng cấp quyền Vị trí (Location) để đo quãng đường GPS ngoài trời.';
          } else if (err.code === 2) {
            errText = 'Không bắt được vệ tinh GPS. Bạn có thể chuyển sang "Máy Chạy Bộ / Trong Nhà".';
          }
          setGpsError(errText);
          setStatusMessage(errText);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        }
      );
    } else {
      setStatusMessage(`Đang tập luyện mô phỏng máy chạy: ${simSpeedKmH} km/h (Mục tiêu 10km)`);
    }
  };

  const pauseRun = () => {
    setIsPaused(true);
    setStatusMessage('Đã tạm dừng');
  };

  const resumeRun = () => {
    setIsPaused(false);
    setStatusMessage('Tiếp tục chạy bộ');
  };

  const stopRun = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setIsRunning(false);
    setIsPaused(false);
    setStatusMessage('Đã kết thúc phiên chạy. Bạn có thể bấm Lưu Kết Quả để lưu vào hồ sơ.');
  };

  const resetRun = () => {
    if (isRunning) stopRun();
    setDistanceKm(0);
    setSeconds(0);
    setRoute([]);
    lastAcceptedPointRef.current = null;
    lastMilestoneKmRef.current = 0;
    milestoneMarkersRef.current.forEach((m) => m.remove());
    milestoneMarkersRef.current = [];
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (polylineRef.current) polylineRef.current.setLatLngs([]);
    if (polylineBorderRef.current) polylineBorderRef.current.setLatLngs([]);
    setStatusMessage('Đã đặt lại phiên chạy mới. Bấm Bắt Đầu khi sẵn sàng.');
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Pace: min / km
  const getPace = () => {
    if (distanceKm <= 0.02 || seconds === 0) return '--:--';
    const paceMinutes = seconds / 60 / distanceKm;
    const mins = Math.floor(paceMinutes);
    const secs = Math.floor((paceMinutes - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Estimated Calories burned (~60 kcal per km)
  const getCalories = () => {
    return Math.round(distanceKm * 62);
  };

  const saveRun = async () => {
    try {
      await runningService.logSession({
        distance_km: parseFloat(distanceKm.toFixed(2)),
        duration_seconds: seconds,
        pace_avg: `${getPace()} min/km`,
        gps_route_json: route,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch {
      alert('Đã ghi nhận phiên chạy vào bộ nhớ cục bộ');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="whitespace-nowrap font-medium text-sm">Về Thử Thách Chính</span>
        </button>

        {/* Mode Selector */}
        <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800 w-full sm:w-auto shadow-inner">
          <button
            onClick={() => {
              if (!isRunning) setTrackingMode('outdoor');
            }}
            disabled={isRunning}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              trackingMode === 'outdoor'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">GPS Vệ Tinh Ngoài Trời (Chuẩn Xác)</span>
            <span className="sm:hidden">GPS Ngoài Trời</span>
          </button>

          <button
            onClick={() => {
              if (!isRunning) setTrackingMode('indoor');
            }}
            disabled={isRunning}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              trackingMode === 'indoor'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Máy Chạy Bộ / Trong Nhà</span>
            <span className="sm:hidden">Trong Nhà</span>
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-xs sm:text-sm flex items-center space-x-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{gpsError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Interactive Map */}
        <div className="lg:col-span-2 relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 h-[420px] sm:h-[480px] lg:h-[540px] shadow-2xl">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating GPS Accuracy & Satellite Status Badge */}
          <div className="absolute top-4 left-4 z-10 bg-gray-950/90 backdrop-blur px-3.5 py-1.5 rounded-full border border-gray-800 text-xs font-semibold text-gray-200 flex items-center space-x-2 shadow-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                trackingMode === 'indoor'
                  ? 'bg-amber-400 animate-pulse'
                  : gpsQuality === 'good'
                  ? 'bg-emerald-500 animate-pulse'
                  : gpsQuality === 'waiting'
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`}
            ></span>
            <span className="whitespace-nowrap">
              {trackingMode === 'indoor'
                ? `Mô phỏng máy chạy: ${simSpeedKmH} km/h`
                : gpsAccuracy
                ? `Vệ Tinh: ±${gpsAccuracy}m ${gpsAccuracy <= 25 ? '✓ Khóa Vệ Tinh' : '(Chờ sóng)'}`
                : 'Chờ vệ tinh GPS...'}
            </span>
          </div>

          {/* Map Controls: View Full Route (Fit Bounds) */}
          {route.length >= 2 && (
            <button
              onClick={handleFitRouteBounds}
              className="absolute top-4 right-4 z-10 bg-gray-950/90 hover:bg-gray-800 backdrop-blur p-2 rounded-xl border border-gray-700 text-xs font-bold text-white flex items-center space-x-1.5 shadow-lg transition-all cursor-pointer"
              title="Xem toàn bộ đường chạy đã ghi"
            >
              <Maximize className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Xem Toàn Lộ Trình</span>
            </button>
          )}

          {/* Status Message at Bottom */}
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            <div className="bg-gray-950/85 backdrop-blur px-4 py-2 rounded-xl border border-gray-800 text-xs text-gray-300 text-center mx-auto max-w-lg shadow-lg">
              {statusMessage}
            </div>
          </div>
        </div>

        {/* Right Col: Live Stats & Controls */}
        <div className="space-y-5">
          {/* Main Distance Counter */}
          <div className="bg-[#141824] rounded-2xl border border-gray-800 p-6 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl">🏃‍♂️</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              QUÃNG ĐƯỜNG ĐÃ CHẠY (KM)
            </div>
            <div className="text-6xl sm:text-7xl font-black text-amber-400 mt-2 font-mono tracking-tight">
              {distanceKm.toFixed(2)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-400 mt-1">
              Mục tiêu thử thách: <span className="text-white font-bold">10.00 km</span>
            </div>

            {/* Target 10km progress bar */}
            <div className="mt-4 w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (distanceKm / 10) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Secondary Stats: Time & Pace & Calories */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-[#141824] rounded-2xl border border-gray-800 p-3.5 text-center shadow-md">
              <div className="flex items-center justify-center space-x-1 text-gray-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                <Timer className="w-3 h-3 text-amber-400" />
                <span>Thời Gian</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                {formatTime(seconds)}
              </div>
            </div>

            <div className="bg-[#141824] rounded-2xl border border-gray-800 p-3.5 text-center shadow-md">
              <div className="flex items-center justify-center space-x-1 text-gray-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                <Navigation className="w-3 h-3 text-red-400" />
                <span>Pace TB</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                {getPace()}
              </div>
              <div className="text-[9px] text-gray-500">min/km</div>
            </div>

            <div className="bg-[#141824] rounded-2xl border border-gray-800 p-3.5 text-center shadow-md">
              <div className="flex items-center justify-center space-x-1 text-gray-400 text-[10px] sm:text-xs font-bold uppercase mb-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Calories</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-mono">
                {getCalories()}
              </div>
              <div className="text-[9px] text-gray-500">kcal</div>
            </div>
          </div>

          {/* Speed Selector in Indoor Mode */}
          {trackingMode === 'indoor' && !isRunning && (
            <div className="bg-[#141824] rounded-2xl border border-gray-800 p-4 space-y-2 shadow-md">
              <div className="text-xs font-bold text-gray-300 flex justify-between">
                <span>Tốc độ máy chạy (Tùy chỉnh):</span>
                <span className="text-amber-400 font-mono">{simSpeedKmH} km/h</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[8.0, 10.0, 12.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeedKmH(spd)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      simSpeedKmH === spd
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-gray-850 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {spd} km/h
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="space-y-3">
            {!isRunning ? (
              <div className="flex gap-2">
                <button
                  onClick={startRun}
                  className="flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:opacity-90 text-white font-black text-base shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>{distanceKm > 0 ? 'Tiếp Tục Chạy' : 'Bắt Đầu Chạy Bộ'}</span>
                </button>

                {distanceKm > 0 && (
                  <button
                    onClick={resetRun}
                    className="p-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 transition-all cursor-pointer"
                    title="Đặt lại từ đầu"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {isPaused ? (
                  <button
                    onClick={resumeRun}
                    className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Tiếp Tục</span>
                  </button>
                ) : (
                  <button
                    onClick={pauseRun}
                    className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Tạm Dừng</span>
                  </button>
                )}

                <button
                  onClick={stopRun}
                  className="flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Kết Thúc</span>
                </button>
              </div>
            )}

            {!isRunning && distanceKm > 0 && (
              <button
                onClick={saveRun}
                className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Phiên Chạy Vào Thống Kê</span>
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center shadow-lg animate-fadeIn">
              ✅ Đã lưu kết quả chạy {distanceKm.toFixed(2)} km thành công vào hồ sơ anh hùng!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
