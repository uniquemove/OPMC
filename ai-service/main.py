"""
Module: main.py
Mục đích: FastAPI Server cung cấp REST API và WebSocket real-time phục vụ nhận diện động tác,
đếm số rep và kiểm tra form qua Camera. Hỗ trợ chạy webcam cục bộ để test nhanh.
"""

import os
import sys
import io
import base64
import argparse
import numpy as np
import cv2
from PIL import Image
import joblib

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from fastapi.middleware.cors import CORSMiddleware

from pose_detector import PoseDetector
from feature_extractor import FeatureExtractor
from rep_counter import ExerciseRepCounter

app = FastAPI(
    title="One Punch Man Challenge - AI Service",
    description="API & WebSocket cho Computer Vision và Machine Learning nhận diện bài tập",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Machine Learning Model nếu có
MODEL_PATH = "models/exercise_classifier.joblib"
classifier = None
if os.path.exists(MODEL_PATH):
    try:
        classifier = joblib.load(MODEL_PATH)
        print(f"✅ Đã tải mô hình ML từ {MODEL_PATH}")
    except Exception as e:
        print(f"⚠️ Không thể tải mô hình: {e}")

detector = PoseDetector()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "One Punch Man Challenge - AI Service 🥊",
        "ml_model_loaded": classifier is not None,
        "pose_detector_ready": detector.landmarker is not None,
        "detector_error": detector.error_message,
    }

@app.get("/api/ai/metrics")
def get_evaluation_metrics():
    """Trả về các chỉ số đánh giá mô hình để hiển thị lên giao diện hoặc báo cáo."""
    report_path = "models/evaluation_report.json"
    if os.path.exists(report_path):
        import json
        with open(report_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"message": "Chưa chạy train.py để tạo báo cáo đánh giá."}

@app.websocket("/ws/workout/{exercise_type}")
async def workout_websocket(websocket: WebSocket, exercise_type: str):
    """
    WebSocket endpoint phục vụ nhận frame từ React client theo thời gian thực (15-20 FPS),
    phân tích landmarks, đếm rep và phản hồi lại ngay.
    """
    await websocket.accept()
    counter = ExerciseRepCounter(exercise_type=exercise_type)
    print(f"🔌 Client kết nối bài tập: {exercise_type}")

    try:
        while True:
            # Nhận message dạng text (base64 image hoặc json)
            data = await websocket.receive_text()

            # Nếu client gửi lệnh reset
            if data == "RESET":
                counter.reset()
                await websocket.send_json({"type": "RESET_ACK", "status": counter.get_status()})
                continue

            if not detector.landmarker:
                await websocket.send_json({
                    "detected": False,
                    "feedback": f"MediaPipe C-library chưa sẵn sàng trên máy chủ: {detector.error_message or 'thiếu libGLESv2.so.2'}. Hãy chuyển sang Docker trên Render.",
                    "counter": counter.get_status()
                })
                continue

            # Tách header data:image/jpeg;base64, nếu có
            if "," in data:
                data = data.split(",")[1]

            image_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            # 1. Pose Landmark Detection
            _, landmarks_obj = detector.find_pose(frame, draw=False)
            landmarks_dict = detector.get_landmarks_dict()

            if not landmarks_dict:
                await websocket.send_json({
                    "detected": False,
                    "feedback": "Không tìm thấy người trong khung hình. Hãy lùi lại!",
                    "counter": counter.get_status()
                })
                continue

            # 2. Feature Extraction (Angles)
            angles, feature_vector = FeatureExtractor.extract_features(landmarks_dict)

            # 3. ML Prediction (nếu model có sẵn)
            predicted_class = "unknown"
            if classifier and feature_vector:
                try:
                    pred_idx = classifier.predict([feature_vector])[0]
                    from train import LABELS
                    predicted_class = LABELS[pred_idx]
                except Exception:
                    pass

            # 4. FSM Rep Counting & Form Check
            status = counter.update(angles)

            # 5. Phản hồi cho Frontend
            response = {
                "detected": True,
                "exercise": exercise_type,
                "predicted_class": predicted_class,
                "angles": angles,
                "counter": status,
                # Trích xuất 1 số landmark quan trọng để vẽ skeleton phía React (nếu cần)
                "key_points": {
                    "left_shoulder": [landmarks_dict['LEFT_SHOULDER']['x'], landmarks_dict['LEFT_SHOULDER']['y']],
                    "right_shoulder": [landmarks_dict['RIGHT_SHOULDER']['x'], landmarks_dict['RIGHT_SHOULDER']['y']],
                    "left_elbow": [landmarks_dict['LEFT_ELBOW']['x'], landmarks_dict['LEFT_ELBOW']['y']],
                    "right_elbow": [landmarks_dict['RIGHT_ELBOW']['x'], landmarks_dict['RIGHT_ELBOW']['y']],
                    "left_hip": [landmarks_dict['LEFT_HIP']['x'], landmarks_dict['LEFT_HIP']['y']],
                    "right_hip": [landmarks_dict['RIGHT_HIP']['x'], landmarks_dict['RIGHT_HIP']['y']],
                    "left_knee": [landmarks_dict['LEFT_KNEE']['x'], landmarks_dict['LEFT_KNEE']['y']],
                    "right_knee": [landmarks_dict['RIGHT_KNEE']['x'], landmarks_dict['RIGHT_KNEE']['y']],
                }
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        print(f"🔌 Client ngắt kết nối bài tập: {exercise_type}")
    except Exception as e:
        print(f"❌ Lỗi WebSocket: {e}")

def run_local_camera_test(exercise='pushup'):
    """
    Test trực tiếp bằng Webcam trên máy tính mà không cần bật Web.
    Nhấn 'q' để thoát, 'r' để reset số rep.
    """
    cap = cv2.VideoCapture(0)
    counter = ExerciseRepCounter(exercise_type=exercise)
    print(f"📷 Đang mở webcam kiểm thử bài tập: {exercise.upper()} (Nhấn 'q' để thoát, 'r' để reset)")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame, _ = detector.find_pose(frame, draw=True)
        landmarks = detector.get_landmarks_dict()

        if landmarks:
            angles, _ = FeatureExtractor.extract_features(landmarks)
            status = counter.update(angles)

            # Hiển thị HUD thông số trên khung hình
            cv2.rectangle(frame, (10, 10), (380, 140), (20, 20, 20), -1)
            cv2.putText(frame, f"ONE PUNCH MAN - {exercise.upper()}", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 215, 255), 2)
            cv2.putText(frame, f"Reps: {status['valid_reps']} (Total: {status['total_reps']})", (20, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(frame, f"Form Score: {status['form_score']}%", (20, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(frame, f"Feedback: {status['feedback']}", (20, 125),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        cv2.imshow(f"OPM AI Test - {exercise}", frame)

        key = cv2.waitKey(10) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            counter.reset()

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--test-cam", type=str, choices=['pushup', 'squat', 'situp'],
                        help="Chạy test trực tiếp với webcam (pushup / squat / situp)")
    args = parser.parse_args()

    if args.test_cam:
        run_local_camera_test(args.test_cam)
    else:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
