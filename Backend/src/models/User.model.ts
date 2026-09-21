import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  targetGoal: string;
  stage: string;
  xpPoints: number;
  aiimsCredits: number;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Student / AI Learner' },
  targetGoal: { type: String, default: 'Master AI Intelligence & Mentoring' },
  stage: { type: String, default: 'Knowing' },
  xpPoints: { type: Number, default: 100 },
  aiimsCredits: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook: Hash password with bcrypt before saving
UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  // Prevent double-hashing if already a valid bcrypt hash
  const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
  if (isBcrypt) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password (supports legacy plain-text auto-migration)
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;

  const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
  if (!isBcrypt) {
    // Legacy plain-text match
    const isMatch = this.password === candidatePassword;
    if (isMatch) {
      // Auto-migrate legacy plain text to bcrypt hash
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(candidatePassword, salt);
        await this.save();
        console.log(`🔐 Auto-migrated plain text password to bcrypt hash for user: ${this.email}`);
      } catch (err) {
        console.error('Failed to auto-migrate password:', err);
      }
    }
    return isMatch;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

// Exclude password field from toJSON output
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);

