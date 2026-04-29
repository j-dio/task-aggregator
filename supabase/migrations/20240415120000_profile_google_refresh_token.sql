-- Add column to store Google refresh token for server-side API calls.
-- provider_refresh_token from Supabase Auth is only available immediately
-- after OAuth sign-in; this column persists it for later sync operations.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
