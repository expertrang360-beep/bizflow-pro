-- ROUND 1: Auth Hardening
-- Adds password policy and HIBP integration support

-- Add columns for tracking password security
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_strength VARCHAR(20) DEFAULT 'medium';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT FALSE;

-- Create a table for password breach checks
CREATE TABLE IF NOT EXISTS password_breach_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_leaked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, checked_at)
);

-- Index for efficient lookups
CREATE INDEX idx_password_breach_checks_user ON password_breach_checks(user_id);

COMMENT ON TABLE password_breach_checks IS 'Tracks HIBP password breach checks for users';
COMMENT ON COLUMN password_breach_checks.is_leaked IS 'True if password was found in breach database (HaveIBeenPwned)';
