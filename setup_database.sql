-- Quick Setup Script for PostgreSQL
-- Run this in psql terminal after creating the database

\echo '========================================='
\echo 'C$S Career Guidance Database Setup'
\echo '========================================='
\echo ''

-- Show current database
\echo 'Current database:'
SELECT current_database();
\echo ''

-- Create tables
\echo 'Creating tables...'
\echo ''

-- Drop existing tables (if any)
DROP TABLE IF EXISTS career_recommendations CASCADE;
DROP TABLE IF EXISTS game_answers CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

\echo 'Old tables dropped (if existed)'
\echo ''

-- User Sessions Table
CREATE TABLE user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100),
    face_emotion VARCHAR(50),
    face_confidence DECIMAL(5,2),
    face_analysis_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

\echo '✓ user_sessions table created'

-- Game Answers Table
CREATE TABLE game_answers (
    answer_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    game_type VARCHAR(20) NOT NULL,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    selected_option INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    option_effects JSONB,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\echo '✓ game_answers table created'

-- Career Recommendations Table
CREATE TABLE career_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    recommended_career VARCHAR(200) NOT NULL,
    career_description TEXT,
    confidence_score DECIMAL(5,2),
    emotional_score JSONB,
    reasoning_score JSONB,
    academic_score JSONB,
    career_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\echo '✓ career_recommendations table created'

-- Create indexes
CREATE INDEX idx_game_answers_session ON game_answers(session_id);
CREATE INDEX idx_game_answers_game_type ON game_answers(game_type);
CREATE INDEX idx_sessions_created ON user_sessions(created_at);

\echo '✓ Indexes created'
\echo ''

-- Create summary view
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

\echo '✓ session_summary view created'
\echo ''

-- List all tables
\echo 'Tables in database:'
\dt

\echo ''
\echo '========================================='
\echo 'Setup Complete!'
\echo '========================================='
\echo ''
\echo 'Next steps:'
\echo '1. Edit api_server.py - set PostgreSQL password'
\echo '2. Run: python api_server.py'
\echo '3. Run: python -m http.server 8000'
\echo '4. Open: http://localhost:8000/html/index.html'
\echo ''
