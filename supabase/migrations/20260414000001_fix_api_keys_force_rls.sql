-- Fix: api_keys was created without FORCE ROW LEVEL SECURITY
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;
