import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI as string);
    console.log(' Connected to MongoDB Atlas.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database handle is undefined');
    }

    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();

    console.log(`Found ${users.length} user document(s) in collection 'users'.`);

    let migratedCount = 0;
    for (const user of users) {
      const currentPassword = user.password;
      const isBcrypt = typeof currentPassword === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(currentPassword);

      if (!isBcrypt && currentPassword) {
        console.log(`🔐 Hashing password for user: ${user.email} (id: ${user._id})`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(currentPassword, salt);

        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        migratedCount++;
        console.log(`✅ User ${user.email} password successfully updated to bcrypt hash: ${hashedPassword.substring(0, 15)}...`);
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
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

migrate();
