-- =============================================
-- Function to get admin dashboard statistics
-- Execute in Supabase SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_jobs INT;
    v_total_users INT;
    v_active_users INT;
    v_total_revenue DOUBLE PRECISION;
    v_monthly_revenue DOUBLE PRECISION;
    v_active_jobs INT;
    v_completed_jobs INT;
    v_type_distribution JSON;
    v_month_start TIMESTAMPTZ;
BEGIN
    -- Users stats
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(*) INTO v_active_users FROM users WHERE is_active = true;

    -- Jobs stats
    SELECT COUNT(*) INTO v_total_jobs FROM jobs;
    SELECT COUNT(*) INTO v_active_jobs FROM jobs WHERE status = 'active';
    SELECT COUNT(*) INTO v_completed_jobs FROM jobs WHERE status = 'completed';
    
    -- Revenue stats
    SELECT COALESCE(SUM(price), 0) INTO v_total_revenue 
    FROM jobs 
    WHERE status = 'completed';

    -- Monthly revenue
    v_month_start := date_trunc('month', NOW());
    SELECT COALESCE(SUM(price), 0) INTO v_monthly_revenue 
    FROM jobs 
    WHERE status = 'completed' AND completed_at >= v_month_start;

    -- Type distribution
    SELECT json_object_agg(COALESCE(job_type, 'other'), count)
    INTO v_type_distribution
    FROM (
        SELECT job_type, COUNT(*) as count 
        FROM jobs 
        GROUP BY job_type
    ) t;

    -- Construct JSON result
    RETURN json_build_object(
        'total_jobs', v_total_jobs,
        'total_users', v_total_users,
        'active_users', v_active_users,
        'total_revenue', v_total_revenue,
        'monthly_revenue', v_monthly_revenue,
        'active_jobs', v_active_jobs,
        'completed_jobs', v_completed_jobs,
        'type_distribution', COALESCE(v_type_distribution, '{}'::json)
    );
END;
$$;
