-- PostgreSQL Database Schema for Career Guidance System

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS career_recommendations CASCADE;
DROP TABLE IF EXISTS game_answers CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table (stores Google OAuth user data)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions Table (stores face analysis results)
CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,  -- Link to users table
    user_name VARCHAR(100),
    face_emotion VARCHAR(50),  -- stressed, sad, happy, neutral, etc.
    face_confidence DECIMAL(5,2),
    face_analysis_data JSONB,  -- Store detailed face analysis
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Game Answers Table (stores all question answers)
CREATE TABLE game_answers (
    answer_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    game_type VARCHAR(20) NOT NULL,  -- 'emotional', 'reasoning', 'academic'
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    selected_option INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    option_effects JSONB,  -- Store the effects from the dataset
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Career Recommendations Table
CREATE TABLE career_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    recommended_career VARCHAR(200) NOT NULL,
    career_description TEXT,
    confidence_score DECIMAL(5,2),
    emotional_score JSONB,  -- stress, confidence, empathy, risk, curiosity scores
    reasoning_score JSONB,  -- logic, analysis, decision, etc. scores
    academic_score JSONB,   -- subject preferences and strengths
    career_path TEXT,       -- How to pursue this career
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_game_answers_session ON game_answers(session_id);
CREATE INDEX idx_game_answers_game_type ON game_answers(game_type);
CREATE INDEX idx_sessions_created ON user_sessions(created_at);

-- Sample view for analysis
CREATE VIEW session_summary AS
SELECT 
    us.session_id,
    us.user_name,
    us.face_emotion,
    COUNT(DISTINCT CASE WHEN ga.game_type = 'emotional' THEN ga.answer_id END) as emotional_questions,
    COUNT(DISTINCT CASE WHEN ga.game_type = 'reasoning' THEN ga.answer_id END) as reasoning_questions,
    COUNT(DISTINCT CASE WHEN ga.game_type = 'academic' THEN ga.answer_id END) as academic_questions,
    cr.recommended_career,
    us.created_at
FROM user_sessions us
LEFT JOIN game_answers ga ON us.session_id = ga.session_id
LEFT JOIN career_recommendations cr ON us.session_id = cr.session_id
GROUP BY us.session_id, us.user_name, us.face_emotion, cr.recommended_career, us.created_at;
