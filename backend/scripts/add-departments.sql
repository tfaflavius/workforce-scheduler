-- Script pentru adaugarea celor 3 departamente noi
-- Ruleaza acest script in baza de date PostgreSQL (Supabase)

INSERT INTO departments (id, name, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Procese Verbale/Facturare', NOW(), NOW()),
  (gen_random_uuid(), 'Parcometre', NOW(), NOW()),
  (gen_random_uuid(), 'Achizitii', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
