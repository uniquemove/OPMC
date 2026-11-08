"""
Module: train.py
Mục đích: Huấn luyện mô hình Machine Learning (Random Forest) phân loại tư thế bài tập
và xuất các chỉ số đánh giá phục vụ báo cáo đồ án tốt nghiệp.
Các bài tập phân loại:
0: Pushup-Down
1: Pushup-Up
2: Squat-Down
3: Squat-Up
4: Situp-Down
5: Situp-Up
6: Standing-Idle
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from feature_extractor import FeatureExtractor


LABELS = [
    'pushup_down',
    'pushup_up',
    'squat_down',
    'squat_up',
    'situp_down',
    'situp_up',
    'standing_idle'
]

def generate_sample_dataset(samples_per_class=300):
    """
    Tạo bộ dữ liệu mẫu dựa trên phân phối góc sinh học thực tế của các động tác
    (có thêm nhiễu ngẫu nhiên Gaussian) để huấn luyện mô hình cơ sở.
    """
    np.random.seed(42)
    rows = []

    for label_idx, label in enumerate(LABELS):
        for _ in range(samples_per_class):
            if label == 'pushup_down':
                # Khuỷu tay gập sâu ~70-90, vai gập, hông thẳng ~160-180, gối thẳng ~170, thân nằm ngang ~75-90
                l_el = np.random.normal(75, 8)
                r_el = np.random.normal(75, 8)
                l_sh = np.random.normal(60, 10)
                r_sh = np.random.normal(60, 10)
                l_hip = np.random.normal(165, 8)
                r_hip = np.random.normal(165, 8)
                l_kn = np.random.normal(170, 5)
                r_kn = np.random.normal(170, 5)
                trunk = np.random.normal(80, 5)

            elif label == 'pushup_up':
                # Khuỷu tay duỗi ~160-175, hông thẳng ~165-180, thân hơi nghiêng
                l_el = np.random.normal(165, 6)
                r_el = np.random.normal(165, 6)
                l_sh = np.random.normal(75, 8)
                r_sh = np.random.normal(75, 8)
                l_hip = np.random.normal(170, 6)
                r_hip = np.random.normal(170, 6)
                l_kn = np.random.normal(175, 4)
                r_kn = np.random.normal(175, 4)
                trunk = np.random.normal(70, 5)

            elif label == 'squat_down':
                # Gối gập sâu ~80-95, hông gập ~80-100, thân hơi nghiêng về trước ~30-45
                l_el = np.random.normal(100, 20)
                r_el = np.random.normal(100, 20)
                l_sh = np.random.normal(50, 15)
                r_sh = np.random.normal(50, 15)
                l_hip = np.random.normal(90, 8)
                r_hip = np.random.normal(90, 8)
                l_kn = np.random.normal(85, 7)
                r_kn = np.random.normal(85, 7)
                trunk = np.random.normal(35, 6)

            elif label == 'squat_up':
                # Đứng thẳng: gối duỗi ~170-180, hông mở ~170-180, thân thẳng đứng ~0-15
                l_el = np.random.normal(160, 15)
                r_el = np.random.normal(160, 15)
                l_sh = np.random.normal(20, 10)
                r_sh = np.random.normal(20, 10)
                l_hip = np.random.normal(175, 5)
                r_hip = np.random.normal(175, 5)
                l_kn = np.random.normal(175, 4)
                r_kn = np.random.normal(175, 4)
                trunk = np.random.normal(8, 4)

            elif label == 'situp_down':
                # Nằm gập gối: hông mở ~135-160, gối gập ~80-100, thân nằm sát đất ~85-90
                l_el = np.random.normal(90, 20)
                r_el = np.random.normal(90, 20)
                l_sh = np.random.normal(80, 20)
                r_sh = np.random.normal(80, 20)
                l_hip = np.random.normal(145, 10)
                r_hip = np.random.normal(145, 10)
                l_kn = np.random.normal(90, 10)
                r_kn = np.random.normal(90, 10)
                trunk = np.random.normal(88, 3)

            elif label == 'situp_up':
                # Ngồi dậy: hông gập ~60-80, gối gập ~75-95, thân nghiêng ~35-50
                l_el = np.random.normal(80, 20)
                r_el = np.random.normal(80, 20)
                l_sh = np.random.normal(60, 15)
                r_sh = np.random.normal(60, 15)
                l_hip = np.random.normal(70, 7)
                r_hip = np.random.normal(70, 7)
                l_kn = np.random.normal(80, 8)
                r_kn = np.random.normal(80, 8)
                trunk = np.random.normal(40, 6)

            else: # standing_idle
                l_el = np.random.normal(170, 5)
                r_el = np.random.normal(170, 5)
                l_sh = np.random.normal(15, 8)
                r_sh = np.random.normal(15, 8)
                l_hip = np.random.normal(178, 3)
                r_hip = np.random.normal(178, 3)
                l_kn = np.random.normal(178, 3)
                r_kn = np.random.normal(178, 3)
                trunk = np.random.normal(5, 3)

            row = [
                np.clip(l_el, 0, 180), np.clip(r_el, 0, 180),
                np.clip(l_sh, 0, 180), np.clip(r_sh, 0, 180),
                np.clip(l_hip, 0, 180), np.clip(r_hip, 0, 180),
                np.clip(l_kn, 0, 180), np.clip(r_kn, 0, 180),
                np.clip(trunk, 0, 180),
                label_idx
            ]
            rows.append(row)

    columns = FeatureExtractor.FEATURE_NAMES + ['label']
    df = pd.DataFrame(rows, columns=columns)
    return df

def train_and_evaluate():
    print("🚀 Bắt đầu quá trình huấn luyện mô hình Machine Learning...")
    
    os.makedirs('models', exist_ok=True)
    os.makedirs('dataset', exist_ok=True)

    csv_path = 'dataset/exercise_angles.csv'
    if os.path.exists(csv_path):
        print(f"📂 Đang đọc dữ liệu từ file {csv_path}...")
        df = pd.read_csv(csv_path)
    else:
        print("⚡ Tạo bộ dữ liệu góc động tác mẫu...")
        df = generate_sample_dataset(samples_per_class=350)
        df.to_csv(csv_path, index=False)
        print(f"💾 Đã lưu dataset tại: {csv_path} (Tổng số mẫu: {len(df)})")

    X = df[FeatureExtractor.FEATURE_NAMES]
    y = df['label']

    # Chia train 80% / test 20%
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"📊 Tập huấn luyện (Train): {len(X_train)} mẫu | Tập kiểm tra (Test): {len(X_test)} mẫu")

    # Huấn luyện Random Forest
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf.fit(X_train, y_train)

    # Dự đoán trên tập test
    y_pred = clf.predict(X_test)

    # Các chỉ số đánh giá
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=LABELS, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\n" + "="*50)
    print(f"✅ ĐỘ CHÍNH XÁC (ACCURACY): {acc * 100:.2f}%")
    print("="*50)
    print("📋 BÁO CÁO PHÂN LOẠI CHI TIẾT (CLASSIFICATION REPORT):")
    print(classification_report(y_test, y_pred, target_names=LABELS))
    print("="*50)

    # Lưu model và báo cáo
    model_file = 'models/exercise_classifier.joblib'
    joblib.dump(clf, model_file)
    print(f"💾 Đã lưu mô hình tại: {model_file}")

    eval_data = {
        'accuracy': float(acc),
        'labels': LABELS,
        'classification_report': report,
        'confusion_matrix': cm
    }
    with open('models/evaluation_report.json', 'w', encoding='utf-8') as f:
        json.dump(eval_data, f, indent=2, ensure_ascii=False)
    print("📊 Đã lưu báo cáo đánh giá tại: models/evaluation_report.json")

if __name__ == '__main__':
    train_and_evaluate()
