import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/typeorm.config';

async function resetManagerPassword() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();

    const userRepository = AppDataSource.getRepository('User');

    // Find manager user
    const manager = await userRepository.findOne({
      where: { email: 'manager@workforce.com' },
    });

    if (!manager) {
      console.log('❌ Manager account not found');
      await AppDataSource.destroy();
      return;
    }

    console.log('✅ Manager account found:', manager.fullName);

    // Hash new password
    const hashedPassword = await bcrypt.hash('manager123', 10);

    // Update password
    await userRepository.update(
      { email: 'manager@workforce.com' },
      { password: hashedPassword }
    );

    console.log('✅ Password reset successfully');
    console.log('📧 Email: manager@workforce.com');
    console.log('🔑 New Password: manager123');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetManagerPassword()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
