-- ONE PUNCH MAN CHALLENGE DATABASE SCHEMA
-- Target Database: PostgreSQL

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    hero_rank VARCHAR(20) DEFAULT 'Hero C', -- Hero C, Hero B, Hero A, Hero S
    level INT DEFAULT 1,                    -- Current challenge level (1 to 10)
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Challenge Levels Definition
CREATE TABLE IF NOT EXISTS challenge_levels (
    level INT PRIMARY KEY,
    pushup_target INT NOT NULL,
    situp_target INT NOT NULL,
    squat_target INT NOT NULL,
    running_target_km NUMERIC(5, 2) NOT NULL,
    title VARCHAR(50) NOT NULL,
    description TEXT
);

-- Seed Challenge Levels (1 to 10 - culminating in Saitama 100/100/100/10km)
INSERT INTO challenge_levels (level, pushup_target, situp_target, squat_target, running_target_km, title, description)
VALUES 
    (1, 10, 10, 10, 1.0, 'Novice Recruit', 'Bước đầu bước vào con đường rèn luyện.'),
    (2, 20, 20, 20, 2.0, 'Gym Trainee', 'Làm quen với cường độ vận động đều đặn.'),
    (3, 30, 30, 30, 3.0, 'Amateur Fighter', 'Cải thiện thể lực và sức bền.'),
    (4, 40, 40, 40, 4.0, 'Hero Class C - Rank 10', 'Bắt đầu vượt qua giới hạn của người bình thường.'),
    (5, 50, 50, 50, 5.0, 'Hero Class C - Rank 1', 'Đạt nửa chặng đường thử thách Saitama.'),
    (6, 60, 60, 60, 6.0, 'Hero Class B - Rank 50', 'Sức mạnh cơ bắp phát triển rõ rệt.'),
    (7, 70, 70, 70, 7.0, 'Hero Class B - Rank 1', 'Sức bền phi thường.'),
    (8, 80, 80, 80, 8.0, 'Hero Class A - Rank 20', 'Tiệm cận thể lực siêu cấp.'),
    (9, 90, 90, 90, 9.0, 'Hero Class A - Rank 1', 'Ý chí thép không bỏ cuộc.'),
    (10, 100, 100, 100, 10.0, 'Hero Class S - One Punch Man', 'Đạt chuẩn Saitama: 100 Push-ups, 100 Sit-ups, 100 Squats, 10km Run!')
ON CONFLICT (level) DO NOTHING;

-- 3. Daily Workout Progress
CREATE TABLE IF NOT EXISTS daily_workouts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    workout_date DATE DEFAULT CURRENT_DATE,
    level INT REFERENCES challenge_levels(level),
    pushup_completed INT DEFAULT 0,
    situp_completed INT DEFAULT 0,
    squat_completed INT DEFAULT 0,
    running_completed_km NUMERIC(5, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, workout_date)
);

-- 4. Detailed Exercise Logs (Recorded via Camera & AI)
CREATE TABLE IF NOT EXISTS exercise_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    workout_id INT REFERENCES daily_workouts(id) ON DELETE SET NULL,
    exercise_type VARCHAR(20) NOT NULL, -- 'pushup', 'squat', 'situp'
    reps_total INT NOT NULL,
    reps_valid INT NOT NULL,
    reps_invalid INT NOT NULL,
    form_score NUMERIC(5, 2), -- e.g. 88.50 / 100
    duration_seconds INT,
    feedback_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Running Sessions (Recorded via GPS)
CREATE TABLE IF NOT EXISTS running_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    workout_id INT REFERENCES daily_workouts(id) ON DELETE SET NULL,
    distance_km NUMERIC(5, 2) NOT NULL,
    duration_seconds INT NOT NULL,
    pace_avg VARCHAR(20), -- e.g. "5:30 min/km"
    gps_route_json JSONB, -- Coordinates array: [[lat, lng, timestamp], ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    badge_level VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);
