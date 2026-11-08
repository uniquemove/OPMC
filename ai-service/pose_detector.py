"""
Module: pose_detector.py
Mục đích: Sử dụng Google MediaPipe Tasks Vision PoseLandmarker để trích xuất 33 điểm khớp
và tính toán góc hình học giữa các khớp trong không gian 2D/3D.
"""

import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class PoseDetector:
    LANDMARK_NAMES = [
        'NOSE', 'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER',
        'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
        'LEFT_EAR', 'RIGHT_EAR', 'MOUTH_LEFT', 'MOUTH_RIGHT',
        'LEFT_SHOULDER', 'RIGHT_SHOULDER',
        'LEFT_ELBOW', 'RIGHT_ELBOW',
        'LEFT_WRIST', 'RIGHT_WRIST',
        'LEFT_PINKY', 'RIGHT_PINKY',
        'LEFT_INDEX', 'RIGHT_INDEX',
        'LEFT_THUMB', 'RIGHT_THUMB',
        'LEFT_HIP', 'RIGHT_HIP',
        'LEFT_KNEE', 'RIGHT_KNEE',
        'LEFT_ANKLE', 'RIGHT_ANKLE',
        'LEFT_HEEL', 'RIGHT_HEEL',
        'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX'
    ]

    def __init__(self, model_path='models/pose_landmarker_lite.task'):
        # Tự động tải model nếu chưa có
        if not os.path.exists(model_path):
            import urllib.request
            os.makedirs(os.path.dirname(model_path) or '.', exist_ok=True)
            print(f"📥 Đang tải MediaPipe Pose model về {model_path}...")
            url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
            urllib.request.urlretrieve(url, model_path)
            print("✅ Đã tải xong model!")

        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.landmarker = None
        self.error_message = None
        try:
            self.landmarker = vision.PoseLandmarker.create_from_options(options)
            print("✅ MediaPipe PoseLandmarker initialized successfully!")
        except Exception as e:
            self.error_message = str(e)
            print(f"⚠️ Warning: Could not initialize MediaPipe PoseLandmarker: {e}")
            print("👉 Note: If on Render/Linux, please deploy using Dockerfile (libgles2 / libgl1 required).")

        self.last_landmarks = None

    def find_pose(self, img, draw=True):
        """
        Nhận vào ảnh BGR từ OpenCV, chuyển sang RGB và nhận diện 33 điểm landmarks.
        """
        if not self.landmarker:
            self.last_landmarks = None
            return img, None

        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        detection_result = self.landmarker.detect(mp_image)
        
        if detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
            self.last_landmarks = detection_result.pose_landmarks[0]
            if draw:
                h, w, _ = img.shape
                # Vẽ các điểm khớp chính
                for lm in self.last_landmarks:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(img, (cx, cy), 4, (0, 255, 0), cv2.FILLED)
        else:
            self.last_landmarks = None

        return img, self.last_landmarks

    def get_landmarks_dict(self):
        """
        Trả về dict các điểm landmarks theo tên:
        { 'LEFT_SHOULDER': {'x': ..., 'y': ..., 'z': ..., 'visibility': ...}, ... }
        """
        if not self.last_landmarks:
            return None

        landmarks_dict = {}
        for idx, lm in enumerate(self.last_landmarks):
            if idx < len(self.LANDMARK_NAMES):
                name = self.LANDMARK_NAMES[idx]
                landmarks_dict[name] = {
                    'x': lm.x,
                    'y': lm.y,
                    'z': lm.z,
                    'visibility': getattr(lm, 'visibility', 1.0)
                }
        return landmarks_dict

    @staticmethod
    def calculate_angle(a, b, c):
        """
        Tính góc (độ) tại điểm B tạo bởi 3 điểm A, B, C.
        Góc nằm trong khoảng [0, 180].
        a, b, c: mảng hoặc tuple tọa độ [x, y]
        """
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)

        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)

        if angle > 180.0:
            angle = 360.0 - angle

        return float(angle)
