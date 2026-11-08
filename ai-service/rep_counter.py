"""
Module: rep_counter.py
Mục đích: Finite State Machine (FSM) đếm số lần hoàn thành bài tập (Push-up, Squat, Sit-up)
và kiểm tra form chuẩn/sai.
"""

class ExerciseRepCounter:
    def __init__(self, exercise_type='pushup'):
        self.exercise_type = exercise_type.lower()
        self.stage = None # 'up', 'down'
        self.total_reps = 0
        self.valid_reps = 0
        self.invalid_reps = 0
        self.feedback = "Sẵn sàng"
        self.current_form_valid = True
        self.form_issues = []

    def reset(self):
        self.stage = None
        self.total_reps = 0
        self.valid_reps = 0
        self.invalid_reps = 0
        self.feedback = "Đã khởi tạo lại bộ đếm"
        self.current_form_valid = True
        self.form_issues = []

    def update(self, angles):
        """
        Nhận vào dict các góc từ FeatureExtractor và cập nhật trạng thái đếm.
        angles: dict chứa 'left_elbow_angle', 'right_elbow_angle', 'left_knee_angle', ...
        """
        if not angles:
            return self.get_status()

        if self.exercise_type == 'pushup':
            self._update_pushup(angles)
        elif self.exercise_type == 'squat':
            self._update_squat(angles)
        elif self.exercise_type == 'situp':
            self._update_situp(angles)

        return self.get_status()

    def _update_pushup(self, angles):
        # Trung bình góc khuỷu tay 2 bên
        elbow_angle = (angles['left_elbow_angle'] + angles['right_elbow_angle']) / 2
        hip_angle = (angles['left_hip_angle'] + angles['right_hip_angle']) / 2

        # 1. Trạng thái hạ thấp người (Down stage)
        if elbow_angle < 90:
            if self.stage != 'down':
                self.stage = 'down'
                self.current_form_valid = True
                self.form_issues = []

                # Kiểm tra lưng thẳng (Góc hông nên nằm trong khoảng 150 - 180 độ)
                if hip_angle < 140:
                    self.current_form_valid = False
                    self.form_issues.append("Hông bị võng hoặc nhô quá cao")
                    self.feedback = "Giữ lưng thẳng, đừng võng hông!"
                else:
                    self.feedback = "Độ sâu tốt! Hãy đẩy người lên"

        # 2. Trạng thái đẩy người lên (Up stage)
        elif elbow_angle > 155:
            if self.stage == 'down':
                self.stage = 'up'
                self.total_reps += 1
                if self.current_form_valid:
                    self.valid_reps += 1
                    self.feedback = f"Tốt lắm! +1 Rep chuẩn ({self.valid_reps})"
                else:
                    self.invalid_reps += 1
                    self.feedback = f"Rep chưa đạt form: {', '.join(self.form_issues)}"

    def _update_squat(self, angles):
        knee_angle = (angles['left_knee_angle'] + angles['right_knee_angle']) / 2
        hip_angle = (angles['left_hip_angle'] + angles['right_hip_angle']) / 2

        # 1. Hạ người squat (Gối gập dưới 100 độ)
        if knee_angle < 100:
            if self.stage != 'down':
                self.stage = 'down'
                self.current_form_valid = True
                self.form_issues = []

                if knee_angle > 115:
                    self.current_form_valid = False
                    self.form_issues.append("Chưa squat đủ sâu")
                    self.feedback = "Hạ hông sâu hơn một chút!"
                else:
                    self.feedback = "Độ sâu squat hoàn hảo!"

        # 2. Đứng thẳng lên (Gối mở trên 160 độ)
        elif knee_angle > 160:
            if self.stage == 'down':
                self.stage = 'up'
                self.total_reps += 1
                if self.current_form_valid:
                    self.valid_reps += 1
                    self.feedback = f"Squat chuẩn! +1 Rep ({self.valid_reps})"
                else:
                    self.invalid_reps += 1
                    self.feedback = f"Chưa đạt form: {', '.join(self.form_issues)}"

    def _update_situp(self, angles):
        # Sit-up dựa vào góc hông / gập bụng
        hip_angle = (angles['left_hip_angle'] + angles['right_hip_angle']) / 2

        # 1. Nằm xuống (Hông mở > 130 độ)
        if hip_angle > 130:
            self.stage = 'down'
            self.feedback = "Gập bụng ngồi dậy"

        # 2. Ngồi dậy hoàn toàn (Hông gập < 80 độ)
        elif hip_angle < 80 and self.stage == 'down':
            self.stage = 'up'
            self.total_reps += 1
            self.valid_reps += 1
            self.feedback = f"Tuyệt vời! +1 Sit-up ({self.valid_reps})"

    def get_status(self):
        form_score = 100.0
        if self.total_reps > 0:
            form_score = round((self.valid_reps / self.total_reps) * 100, 1)

        return {
            'exercise': self.exercise_type,
            'stage': self.stage,
            'total_reps': self.total_reps,
            'valid_reps': self.valid_reps,
            'invalid_reps': self.invalid_reps,
            'form_score': form_score,
            'feedback': self.feedback,
            'is_form_valid': self.current_form_valid
        }
