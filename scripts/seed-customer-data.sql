-- Seed Data for Customer Dashboard (Customer ID 4)
-- Run this script to populate test data for customer ID 4

-- 1. Ensure we have a customer record
INSERT INTO users (id, email, name, user_type, role, status, phone, created_at)
VALUES (4, 'customer@test.com', 'Test Customer', 'customer', 'customer', 'active', '+1234567890', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  user_type = EXCLUDED.user_type,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  phone = EXCLUDED.phone;

-- 2. Create a test business (if not exists)
INSERT INTO users (id, email, name, user_type, role, status, business_name, created_at)
VALUES (1, 'business@test.com', 'Test Business Owner', 'business', 'owner', 'active', 'Test Coffee Shop', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name;

-- 3. Create loyalty card templates (programs)
INSERT INTO cards (id, business_id, card_type, stamps_required, reward_description, points_per_dollar, created_at)
VALUES 
  (1, 1, 'Coffee Loyalty', 10, 'Free Coffee', 1.00, CURRENT_TIMESTAMP),
  (2, 1, 'Pastry Rewards', 5, 'Free Pastry', 2.00, CURRENT_TIMESTAMP),
  (3, 1, 'VIP Program', 20, 'Free Meal + Drink', 1.50, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  card_type = EXCLUDED.card_type,
  stamps_required = EXCLUDED.stamps_required,
  reward_description = EXCLUDED.reward_description;

-- 4. Create customer's loyalty cards (enrollments)
INSERT INTO loyalty_cards (customer_id, card_id, current_stamps, points_balance, total_points_earned, card_type, status, created_at)
VALUES 
  (4, 1, 7, 150, 350, 'Coffee Loyalty', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '10 days'),
  (4, 2, 3, 75, 125, 'Pastry Rewards', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (4, 3, 15, 300, 800, 'VIP Program', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '20 days')
ON CONFLICT (customer_id, card_id) DO UPDATE SET
  current_stamps = EXCLUDED.current_stamps,
  points_balance = EXCLUDED.points_balance,
  total_points_earned = EXCLUDED.total_points_earned,
  status = EXCLUDED.status;

-- 5. Create sample notifications for customer
INSERT INTO notifications (customer_id, type, title, message, is_read, read_status, created_at)
VALUES 
  (4, 'success', 'Welcome!', 'Welcome to our loyalty program! Start earning rewards today.', FALSE, FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (4, 'info', 'New Reward Available', 'You are 3 stamps away from a free coffee!', FALSE, FALSE, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
  (4, 'warning', 'Points Expiring Soon', 'Your 50 points will expire in 30 days. Use them before they expire!', TRUE, TRUE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (4, 'success', 'Reward Earned!', 'Congratulations! You have earned a free pastry. Redeem it on your next visit.', FALSE, FALSE, CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- 6. Create sample promotions
INSERT INTO promotions (business_id, title, description, discount_type, discount_value, code, is_active, start_date, end_date, created_at)
VALUES 
  (1, 'Happy Hour Special', '50% off all drinks from 3-5 PM daily', 'percentage', 50.00, 'HAPPY50', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (1, 'Weekend Bonus', 'Double points on weekends', 'multiplier', 2.00, 'WEEKEND2X', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
  (1, 'New Customer Welcome', 'Buy one get one free for new customers', 'bogo', 1.00, 'WELCOME', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- 7. Create loyalty programs (if using program-based system)
INSERT INTO loyalty_programs (id, business_id, name, description, points_per_dollar, is_active, created_at)
VALUES 
  (1, 1, 'Coffee Lovers Club', 'Earn points with every coffee purchase', 1.00, TRUE, CURRENT_TIMESTAMP - INTERVAL '30 days'),
  (2, 1, 'Sweet Rewards', 'Special program for pastry lovers', 2.00, TRUE, CURRENT_TIMESTAMP - INTERVAL '25 days'),
  (3, 1, 'VIP Experience', 'Premium rewards for our best customers', 1.50, TRUE, CURRENT_TIMESTAMP - INTERVAL '60 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 8. Update loyalty_cards to reference programs
UPDATE loyalty_cards 
SET program_id = card_id 
WHERE customer_id = 4 AND program_id IS NULL;

-- 9. Create security audit log entries
INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, metadata, created_at)
VALUES 
  (4, 'login', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"source": "web", "remember_me": true}', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
  (4, 'profile_view', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"section": "dashboard"}', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  (4, 'reward_redeemed', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"reward_type": "free_coffee", "location": "main_store"}', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Summary of seeded data
SELECT 'Seeding completed successfully!' AS status,
       (SELECT COUNT(*) FROM loyalty_cards WHERE customer_id = 4) AS loyalty_cards_count,
       (SELECT COUNT(*) FROM notifications WHERE customer_id = 4) AS notifications_count,
       (SELECT COUNT(*) FROM promotions WHERE business_id = 1) AS promotions_count,
       (SELECT COUNT(*) FROM security_audit_log WHERE user_id = 4) AS audit_logs_count;
