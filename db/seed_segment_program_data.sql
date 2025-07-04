-- Script to populate the segment_program_engagement table with sample data
-- This adds program preferences for customer segments

-- Get the current date for period calculations
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    month_start DATE := DATE_TRUNC('month', current_date);
    month_end DATE := (DATE_TRUNC('month', current_date) + INTERVAL '1 month - 1 day')::DATE;
    week_start DATE := DATE_TRUNC('week', current_date);
    week_end DATE := (DATE_TRUNC('week', current_date) + INTERVAL '6 days')::DATE;
BEGIN

-- Sample business IDs - replace with actual business IDs from your database
-- For each business, we'll add segment-program relationships

-- Business 1 segments (assuming segment IDs from customer_segments table)
INSERT INTO segment_program_engagement 
    (segment_id, program_id, business_id, engagement_score, period_type, period_start, period_end)
VALUES
    -- Frequent segment for Business 1
    (1, '1', 1, 9.2, 'month', month_start, month_end),
    (1, '2', 1, 7.8, 'month', month_start, month_end),
    (1, '3', 1, 6.5, 'month', month_start, month_end),
    
    -- Regular segment for Business 1
    (2, '2', 1, 8.4, 'month', month_start, month_end),
    (2, '1', 1, 6.2, 'month', month_start, month_end),
    
    -- Occasional segment for Business 1
    (3, '4', 1, 7.1, 'month', month_start, month_end),
    (3, '5', 1, 5.9, 'month', month_start, month_end),
    
    -- New segment for Business 1
    (4, '3', 1, 6.8, 'month', month_start, month_end);

-- Business 2 segments
INSERT INTO segment_program_engagement 
    (segment_id, program_id, business_id, engagement_score, period_type, period_start, period_end)
VALUES
    -- Frequent segment for Business 2
    (5, '6', 2, 9.5, 'month', month_start, month_end),
    (5, '7', 2, 8.2, 'month', month_start, month_end),
    
    -- Regular segment for Business 2
    (6, '8', 2, 7.9, 'month', month_start, month_end),
    (6, '9', 2, 7.1, 'month', month_start, month_end),
    (6, '7', 2, 6.8, 'month', month_start, month_end),
    
    -- Occasional segment for Business 2
    (7, '10', 2, 6.7, 'month', month_start, month_end),
    
    -- New segment for Business 2
    (8, '11', 2, 6.1, 'month', month_start, month_end),
    (8, '7', 2, 5.4, 'month', month_start, month_end);

-- Also add weekly data for recent activity
INSERT INTO segment_program_engagement 
    (segment_id, program_id, business_id, engagement_score, period_type, period_start, period_end)
VALUES
    -- Week data for Business 1
    (1, '1', 1, 9.5, 'week', week_start, week_end),
    (1, '2', 1, 8.0, 'week', week_start, week_end),
    (2, '2', 1, 8.6, 'week', week_start, week_end),
    (3, '4', 1, 7.3, 'week', week_start, week_end),
    
    -- Week data for Business 2
    (5, '6', 2, 9.7, 'week', week_start, week_end),
    (6, '8', 2, 8.1, 'week', week_start, week_end),
    (7, '10', 2, 6.9, 'week', week_start, week_end);

END $$;

-- Verify data was inserted correctly
SELECT 
    cs.segment_name,
    pa.program_name,
    spe.engagement_score,
    spe.period_type
FROM segment_program_engagement spe
JOIN customer_segments cs ON spe.segment_id = cs.id
JOIN program_analytics pa ON spe.program_id = pa.program_id
ORDER BY cs.segment_name, spe.engagement_score DESC; - -   E x a m p l e   u s a g e :   p s q l   - f   d b / s e e d _ s e g m e n t _ p r o g r a m _ d a t a . s q l  
 