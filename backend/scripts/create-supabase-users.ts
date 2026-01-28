import { createClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'workforce_db',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
});

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'ANGAJAT';
}

const testUsers: TestUser[] = [
  {
    email: 'admin@workforce.com',
    password: 'admin123',
    fullName: 'Administrator',
    role: 'ADMIN',
  },
  {
    email: 'manager@workforce.com',
    password: 'manager123',
    fullName: 'Manager Test',
    role: 'MANAGER',
  },
  {
    email: 'angajat@workforce.com',
    password: 'angajat123',
    fullName: 'Angajat Test',
    role: 'ANGAJAT',
  },
];

async function createSupabaseUsers() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Connected!');

  for (const testUser of testUsers) {
    console.log(`\nProcessing user: ${testUser.email}`);

    try {
      // Check if user exists in Supabase Auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingSupabaseUser = existingUsers?.users?.find(
        (u) => u.email === testUser.email
      );

      let supabaseUserId: string;

      if (existingSupabaseUser) {
        console.log(`  User already exists in Supabase Auth: ${existingSupabaseUser.id}`);
        supabaseUserId = existingSupabaseUser.id;
      } else {
        // Create user in Supabase Auth
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            fullName: testUser.fullName,
            role: testUser.role,
          },
        });

        if (error) {
          console.error(`  Error creating user in Supabase: ${error.message}`);
          continue;
        }

        supabaseUserId = newUser.user.id;
        console.log(`  Created in Supabase Auth: ${supabaseUserId}`);
      }

      // Check if user exists in our database
      const existingDbUser = await AppDataSource.query(
        'SELECT * FROM users WHERE email = $1',
        [testUser.email]
      );

      if (existingDbUser.length > 0) {
        // Update the user ID to match Supabase
        if (existingDbUser[0].id !== supabaseUserId) {
          // First delete the old user
          await AppDataSource.query('DELETE FROM users WHERE email = $1', [
            testUser.email,
          ]);
          console.log(`  Deleted old user from DB`);

          // Insert with new Supabase ID
          await AppDataSource.query(
            `INSERT INTO users (id, email, password, full_name, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
            [supabaseUserId, testUser.email, '', testUser.fullName, testUser.role]
          );
          console.log(`  Re-created in DB with Supabase ID`);
        } else {
          console.log(`  User already exists in DB with correct ID`);
        }
      } else {
        // Create new user in DB
        await AppDataSource.query(
          `INSERT INTO users (id, email, password, full_name, role, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
          [supabaseUserId, testUser.email, '', testUser.fullName, testUser.role]
        );
        console.log(`  Created in DB`);
      }

      console.log(`  ✅ User ready: ${testUser.email} / ${testUser.password}`);
    } catch (error) {
      console.error(`  Error processing user: ${error}`);
    }
  }

  await AppDataSource.destroy();
  console.log('\n✅ All users processed!');
}

createSupabaseUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
