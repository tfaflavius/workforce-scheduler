-- Seed data for shift_types table
-- Run this in Supabase SQL Editor

-- Clear existing shift types (optional - uncomment if needed)
-- DELETE FROM shift_types;

-- Insert 12-hour shift types
INSERT INTO shift_types (id, name, shift_pattern, start_time, end_time, duration_hours, is_night_shift, display_order, created_at)
VALUES
  (gen_random_uuid(), 'Zi 07-19', 'SHIFT_12H', '07:00:00', '19:00:00', 12.00, false, 1, NOW()),
  (gen_random_uuid(), 'Noapte 19-07', 'SHIFT_12H', '19:00:00', '07:00:00', 12.00, true, 2, NOW()),
  (gen_random_uuid(), 'Concediu 12H', 'SHIFT_12H', '00:00:00', '00:00:00', 0.00, false, 3, NOW())
ON CONFLICT DO NOTHING;

-- Insert 8-hour shift types
INSERT INTO shift_types (id, name, shift_pattern, start_time, end_time, duration_hours, is_night_shift, display_order, created_at)
VALUES
  (gen_random_uuid(), 'Zi 06-14', 'SHIFT_8H', '06:00:00', '14:00:00', 8.00, false, 4, NOW()),
  (gen_random_uuid(), 'Zi 14-22', 'SHIFT_8H', '14:00:00', '22:00:00', 8.00, false, 5, NOW()),
  (gen_random_uuid(), 'Zi 07:30-15:30', 'SHIFT_8H', '07:30:00', '15:30:00', 8.00, false, 6, NOW()),
  (gen_random_uuid(), 'Zi 09-17', 'SHIFT_8H', '09:00:00', '17:00:00', 8.00, false, 7, NOW()),
  (gen_random_uuid(), 'Noapte 22-06', 'SHIFT_8H', '22:00:00', '06:00:00', 8.00, true, 8, NOW()),
  (gen_random_uuid(), 'Concediu 8H', 'SHIFT_8H', '00:00:00', '00:00:00', 0.00, false, 9, NOW())
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT * FROM shift_types ORDER BY display_order;
