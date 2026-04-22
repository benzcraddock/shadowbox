-- Migration: make stance nullable so we can distinguish "not yet chosen" from "orthodox"
-- Run in Supabase SQL Editor after the initial schema.

ALTER TABLE public.users ALTER COLUMN stance DROP DEFAULT;

-- Existing CHECK constraint (stance IN ('orthodox','southpaw')) already allows NULL
-- because CHECK is only violated on explicit false, not unknown.
