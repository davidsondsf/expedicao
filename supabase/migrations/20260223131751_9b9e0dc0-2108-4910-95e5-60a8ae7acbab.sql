
-- Step 1: Add VIEWER to app_role enum (must be committed alone before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'VIEWER';
