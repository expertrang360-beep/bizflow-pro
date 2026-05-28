-- ROUND 1: License & Plan System Migration
-- Creates the foundation for subscription management, license keys, and feature gating

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE, -- "Trial", "Starter", "Pro", "Enterprise"
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'NGN',
  billing_period VARCHAR(50) NOT NULL, -- "monthly", "yearly", "lifetime"
  duration_days INTEGER, -- 14 for trial, null for unlimited
  features JSONB NOT NULL DEFAULT '{}', -- Feature flags and limits
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create license_keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL UNIQUE, -- "BIZ-XXXX-XXXX-XXXX-XXXX"
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'unused', -- "unused", "active", "expired", "revoked"
  assigned_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  license_key_id UUID REFERENCES license_keys(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- "active", "expired", "cancelled"
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add super_admin role if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'super_admin') THEN
    -- Create a super_admin role (you will assign to yourself manually)
    INSERT INTO user_roles (user_id, role) VALUES 
    (auth.uid(), 'super_admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX idx_license_keys_key ON license_keys(key);
CREATE INDEX idx_license_keys_status ON license_keys(status);
CREATE INDEX idx_license_keys_org ON license_keys(assigned_org_id);
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- RLS Policies for plans (public read)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are readable by authenticated users"
  ON plans FOR SELECT USING (auth.role() = 'authenticated');

-- RLS for license_keys (super_admin only, except viewing own after activation)
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can manage all keys"
  ON license_keys FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS for subscriptions (org members can view their own)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their org subscription"
  ON subscriptions FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function: Generate license key in format BIZ-XXXX-XXXX-XXXX-XXXX
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS VARCHAR AS $$
DECLARE
  v_key VARCHAR;
BEGIN
  SELECT 'BIZ-' || 
         SUBSTR(MD5(RANDOM()::TEXT), 1, 4) || '-' ||
         SUBSTR(MD5(RANDOM()::TEXT), 5, 4) || '-' ||
         SUBSTR(MD5(RANDOM()::TEXT), 9, 4) || '-' ||
         SUBSTR(MD5(RANDOM()::TEXT), 13, 4)
  INTO v_key;
  RETURN UPPER(v_key);
END;
$$ LANGUAGE plpgsql;

-- Function: Get organization subscription (called from client via RPC)
CREATE OR REPLACE FUNCTION get_org_subscription(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  plan_id UUID,
  plan_name VARCHAR,
  plan_price DECIMAL,
  billing_period VARCHAR,
  plan_features JSONB,
  status VARCHAR,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.organization_id,
    s.plan_id,
    p.name,
    p.price,
    p.billing_period,
    p.features,
    s.status,
    s.starts_at,
    s.expires_at
  FROM subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.organization_id = p_org_id
  AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Redeem license key (atomic transaction)
CREATE OR REPLACE FUNCTION redeem_license_key(p_key VARCHAR)
RETURNS TABLE (
  success BOOLEAN,
  plan_name VARCHAR,
  message VARCHAR
) AS $$
DECLARE
  v_license_id UUID;
  v_plan_id UUID;
  v_org_id UUID;
  v_plan_name VARCHAR;
  v_duration_days INTEGER;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Find license key
  SELECT id, plan_id, assigned_org_id INTO v_license_id, v_plan_id, v_org_id
  FROM license_keys
  WHERE key = UPPER(p_key) AND status = 'unused'
  LIMIT 1;
  
  IF v_license_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, 'License key not found or already used'::VARCHAR;
    RETURN;
  END IF;
  
  -- Get organization from auth user if not assigned
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
  END IF;
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR, 'No organization found for user'::VARCHAR;
    RETURN;
  END IF;
  
  -- Get plan details
  SELECT name, duration_days INTO v_plan_name, v_duration_days FROM plans WHERE id = v_plan_id;
  
  -- Update license key
  UPDATE license_keys
  SET 
    status = 'active',
    assigned_org_id = v_org_id,
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_license_id;
  
  -- Create or update subscription
  INSERT INTO subscriptions (organization_id, plan_id, license_key_id, status, starts_at, expires_at)
  VALUES (
    v_org_id,
    v_plan_id,
    v_license_id,
    'active',
    NOW(),
    CASE WHEN v_duration_days > 0 THEN NOW() + (v_duration_days || ' days')::INTERVAL ELSE NULL END
  )
  ON CONFLICT (organization_id, plan_id) DO UPDATE SET
    status = 'active',
    license_key_id = EXCLUDED.license_key_id,
    starts_at = NOW(),
    expires_at = CASE WHEN v_duration_days > 0 THEN NOW() + (v_duration_days || ' days')::INTERVAL ELSE NULL END,
    updated_at = NOW();
  
  RETURN QUERY SELECT TRUE, v_plan_name::VARCHAR, 'License activated successfully'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check organization feature access
CREATE OR REPLACE FUNCTION check_org_feature(p_org_id UUID, p_feature_key VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_feature BOOLEAN;
BEGIN
  SELECT (p.features->'modules'->p_feature_key)::BOOLEAN
  INTO v_has_feature
  FROM subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.organization_id = p_org_id
  AND s.status = 'active'
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_has_feature, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default plans
INSERT INTO plans (name, description, price, currency, billing_period, duration_days, features, sort_order) VALUES
('Trial', 'Free 14-day trial', 0, 'NGN', '14 days', 14, '{"max_branches": 1, "max_staff": 2, "max_products": 20, "modules": {"manufacturing": false, "ai_advisor": false, "payroll": false, "assets": false, "multi_branch": false}}'::JSONB, 1),
('Starter', 'Perfect for small businesses', 5000, 'NGN', 'monthly', NULL, '{"max_branches": 1, "max_staff": 3, "max_products": 100, "modules": {"manufacturing": false, "ai_advisor": false, "payroll": false, "assets": true, "multi_branch": false}}'::JSONB, 2),
('Pro', 'For growing businesses', 15000, 'NGN', 'monthly', NULL, '{"max_branches": 3, "max_staff": 10, "max_products": -1, "modules": {"manufacturing": false, "ai_advisor": true, "payroll": true, "assets": true, "multi_branch": true}}'::JSONB, 3),
('Enterprise', 'Unlimited everything', 50000, 'NGN', 'monthly', NULL, '{"max_branches": -1, "max_staff": -1, "max_products": -1, "modules": {"manufacturing": true, "ai_advisor": true, "payroll": true, "assets": true, "multi_branch": true}}'::JSONB, 4)
ON CONFLICT (name) DO NOTHING;
