import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/typeorm.config';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security';

async function createAdminUser() {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository('User');

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@workforce.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    await AppDataSource.destroy();
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', BCRYPT_SALT_ROUNDS);

  await userRepository.save({
    email: 'admin@workforce.com',
    password: hashedPassword,
    fullName: 'Administrator',
    role: 'ADMIN',
    isActive: true,
  });

  console.log('✅ Admin user created successfully');
  console.log('📧 Email: admin@workforce.com');
  console.log('🔑 Password: admin123');

  await AppDataSource.destroy();
}

createAdminUser()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
