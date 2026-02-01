
-- Añadir columna de promedio a usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_score FLOAT DEFAULT 0;

-- Crear tabla de intentos de examen para cálculos históricos
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id TEXT,
    score FLOAT NOT NULL,
    passed BOOLEAN NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas de promedios
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
