"""
Module: feature_extractor.py
Mục đích: Trích xuất vector đặc trưng các góc khớp cơ thể phục vụ huấn luyện mô hình Machine Learning.
Ưu điểm: Góc hình học bất biến theo khoảng cách camera, chiều cao và tỷ lệ người tập.
"""

from pose_detector import PoseDetector

class FeatureExtractor:
    FEATURE_NAMES = [
        'left_elbow_angle',
        'right_elbow_angle',
        'left_shoulder_angle',
        'right_shoulder_angle',
        'left_hip_angle',
        'right_hip_angle',
        'left_knee_angle',
        'right_knee_angle',
        'trunk_angle'
    ]

    @classmethod
    def extract_features(cls, landmarks):
        """
        landmarks: dict chứa 33 điểm MediaPipe từ PoseDetector.get_landmarks_dict()
        Trả về dict các góc và list vector số thực để đưa vào mô hình ML.
        """
        if not landmarks:
            return None, None

        try:
            # Tọa độ các khớp chính
            l_sh = [landmarks['LEFT_SHOULDER']['x'], landmarks['LEFT_SHOULDER']['y']]
            r_sh = [landmarks['RIGHT_SHOULDER']['x'], landmarks['RIGHT_SHOULDER']['y']]
            l_el = [landmarks['LEFT_ELBOW']['x'], landmarks['LEFT_ELBOW']['y']]
            r_el = [landmarks['RIGHT_ELBOW']['x'], landmarks['RIGHT_ELBOW']['y']]
            l_wr = [landmarks['LEFT_WRIST']['x'], landmarks['LEFT_WRIST']['y']]
            r_wr = [landmarks['RIGHT_WRIST']['x'], landmarks['RIGHT_WRIST']['y']]
            l_hip = [landmarks['LEFT_HIP']['x'], landmarks['LEFT_HIP']['y']]
            r_hip = [landmarks['RIGHT_HIP']['x'], landmarks['RIGHT_HIP']['y']]
            l_kn = [landmarks['LEFT_KNEE']['x'], landmarks['LEFT_KNEE']['y']]
            r_kn = [landmarks['RIGHT_KNEE']['x'], landmarks['RIGHT_KNEE']['y']]
            l_ank = [landmarks['LEFT_ANKLE']['x'], landmarks['LEFT_ANKLE']['y']]
            r_ank = [landmarks['RIGHT_ANKLE']['x'], landmarks['RIGHT_ANKLE']['y']]

            # 1. Góc khuỷu tay (Elbow angle: Vai - Khuỷu - Cổ tay)
            l_elbow_angle = PoseDetector.calculate_angle(l_sh, l_el, l_wr)
            r_elbow_angle = PoseDetector.calculate_angle(r_sh, r_el, r_wr)

            # 2. Góc vai (Shoulder angle: Khuỷu - Vai - Hông)
            l_shoulder_angle = PoseDetector.calculate_angle(l_el, l_sh, l_hip)
            r_shoulder_angle = PoseDetector.calculate_angle(r_el, r_sh, r_hip)

            # 3. Góc hông (Hip angle: Vai - Hông - Đầu gối)
            l_hip_angle = PoseDetector.calculate_angle(l_sh, l_hip, l_kn)
            r_hip_angle = PoseDetector.calculate_angle(r_sh, r_hip, r_kn)

            # 4. Góc đầu gối (Knee angle: Hông - Gối - Cổ chân)
            l_knee_angle = PoseDetector.calculate_angle(l_hip, l_kn, l_ank)
            r_knee_angle = PoseDetector.calculate_angle(r_hip, r_kn, r_ank)

            # 5. Độ nghiêng thân trên (Góc giữa đường nối Vai-Hông với phương thẳng đứng)
            mid_shoulder = [(l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2]
            mid_hip = [(l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2]
            # Điểm chiếu thẳng đứng xuống từ hông
            vertical_point = [mid_hip[0], mid_hip[1] + 0.5]
            trunk_angle = PoseDetector.calculate_angle(mid_shoulder, mid_hip, vertical_point)

            angles = {
                'left_elbow_angle': round(l_elbow_angle, 2),
                'right_elbow_angle': round(r_elbow_angle, 2),
                'left_shoulder_angle': round(l_shoulder_angle, 2),
                'right_shoulder_angle': round(r_shoulder_angle, 2),
                'left_hip_angle': round(l_hip_angle, 2),
                'right_hip_angle': round(r_hip_angle, 2),
                'left_knee_angle': round(l_knee_angle, 2),
                'right_knee_angle': round(r_knee_angle, 2),
                'trunk_angle': round(trunk_angle, 2)
            }

            feature_vector = [
                l_elbow_angle, r_elbow_angle,
                l_shoulder_angle, r_shoulder_angle,
                l_hip_angle, r_hip_angle,
                l_knee_angle, r_knee_angle,
                trunk_angle
            ]

            return angles, feature_vector
        except Exception as e:
            return None, None
