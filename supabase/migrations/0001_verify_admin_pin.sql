-- Add server-side function to verify admin PIN using crypt()
-- Usage: SELECT verify_admin_pin('1234'); or call via supabase.rpc('verify_admin_pin', { pin: '1234' })

CREATE OR REPLACE FUNCTION verify_admin_pin(pin TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored TEXT;
BEGIN
    SELECT security_pin INTO stored FROM app_config LIMIT 1;
    IF stored IS NULL THEN
        RETURN false;
    END IF;
    RETURN crypt(pin, stored) = stored;
END;
$$;
