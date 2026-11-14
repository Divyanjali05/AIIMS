/**
 * migratePasswords.ts
 * =========================================================
 * Upgrades any legacy/plaintext user passwords in PostgreSQL to bcrypt hashes.
 */

import { prisma, connectDatabase, disconnectDatabase } from '../config/prisma';
import { isBcryptHash, hashPassword } from '../utils/userMapper';

async function migrate() {
  try {
    console.log('Connecting to PostgreSQL...');
    const conn = await connectDatabase(3, 1000);
    if (!conn.connected) {
      console.warn('⚠️ PostgreSQL is offline. Skipping live password migration.');
      process.exit(0);
    }
    console.log(`Connected to PostgreSQL database "${conn.databaseName || 'aiims'}".`);

    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} user record(s) in PostgreSQL.`);

    let migratedCount = 0;
    for (const user of users) {
      const currentPassword = user.password;
      const isBcrypt = typeof currentPassword === 'string' && isBcryptHash(currentPassword);

      if (!isBcrypt && currentPassword) {
        console.log(`🔐 Hashing password for user: ${user.email} (id: ${user.id})`);
        const hashedPassword = await hashPassword(currentPassword);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
        migratedCount++;
        console.log(
          `✅ User ${user.email} password successfully updated to bcrypt hash: ${hashedPassword.substring(0, 15)}...`
        );
      } else if (isBcrypt) {
        console.log(` User ${user.email} already has a bcrypt hashed password.`);
      } else {
        console.log(`⚠️ User ${user.email} has no password set.`);
      }
    }

    console.log(`🎉 Migration complete! ${migratedCount} user(s) upgraded to bcrypt hashes.`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await disconnectDatabase();
    console.log('Disconnected from PostgreSQL.');
    process.exit(0);
  }
}

migrate();
