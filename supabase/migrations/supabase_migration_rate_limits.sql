-- ====================================================================
-- BORROWBOX: SAFE ADDITIVE MIGRATION FOR RATE LIMITING & ATOMIC OPS
-- ====================================================================

-- 1. Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS with no public policies so only service_role can access it
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Atomic rate limit increment function
-- Checks if existing count in current window exceeds max_attempts.
-- If expired, resets window. If valid, increments count.
-- Returns TRUE if allowed, FALSE if rate limit exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_attempts INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_record RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_record FROM public.rate_limits WHERE key = p_key FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.rate_limits (key, count, window_start)
        VALUES (p_key, 1, v_now);
        RETURN TRUE;
    END IF;

    -- Check if window has expired
    IF v_now >= v_record.window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
        UPDATE public.rate_limits
        SET count = 1,
            window_start = v_now
        WHERE key = p_key;
        RETURN TRUE;
    END IF;

    -- Window is still active: check limit
    IF v_record.count >= p_max_attempts THEN
        RETURN FALSE;
    END IF;

    -- Increment count
    UPDATE public.rate_limits
    SET count = v_record.count + 1
    WHERE key = p_key;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
