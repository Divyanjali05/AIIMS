import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICreditTransaction {
  id: string;
  transactionType?: string;
  type?: 'EARN' | 'SPEND';
  source?: string;
  sourceId?: string;
  amount: number;
  description: string;
  timestamp: string;
  previousBalance?: number;
  newBalance?: number;
}

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  college: string;
  targetGoal: string;
  stage: string;
  xpPoints: number;
  aiimsCredits: number;
  assessment: {
    status: string;
    answers: Record<string, any>;
    currentQuestionIndex: number;
    completedAt: string | null;
    rewardClaimed: boolean;
    scores: {
      usageFrequency: number;
      evaluationCapability: number;
      workflowDesign: number;
      strategicVision: number;
      mentorshipReadiness: number;
    };
  };
  analysis: {
    status: string;
    topCapability: string;
    growthArea: string;
    unlockedAt?: string | null;
  };
  clarity: {
    status: string;
    selectedAreas: string[];
    selectedTopic: string | null;
    completedTopics: string[];
    reflections: Record<string, string>;
  };
  focus: {
    status: string;
    selectedTrack: string | null;
    history: string[];
    activatedAt?: string | null;
  };
  radar: {
    status: string;
    investigatedSignalIds: string[];
    followedSignalIds: string[];
  };
  investigation: {
    status: string;
    selectedSignalId: string | null;
    userNotes: Record<string, string>;
  };
  transactions: ICreditTransaction[];
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    targetTab?: string;
    read: boolean;
  }>;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CreditTransactionSchema = new Schema(
  {
    id: { type: String, required: true },
    transactionType: { type: String },
    type: { type: String, enum: ['EARN', 'SPEND'] },
    source: { type: String },
    sourceId: { type: String },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    timestamp: { type: String, required: true },
    previousBalance: { type: Number },
    newBalance: { type: Number }
  },
  { _id: false }
);

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Student / AI Learner' },
  college: { type: String, default: 'Engineering & Technology College' },
  targetGoal: { type: String, default: 'Master AI Intelligence & Mentoring' },
  stage: { type: String, default: 'Knowing' },
  xpPoints: { type: Number, default: 100 },
  aiimsCredits: { type: Number, default: 100 },
  assessment: {
    status: { type: String, default: 'not_started' },
    answers: { type: Schema.Types.Mixed, default: {} },
    currentQuestionIndex: { type: Number, default: 0 },
    completedAt: { type: String, default: null },
    rewardClaimed: { type: Boolean, default: false },
    scores: {
      usageFrequency: { type: Number, default: 0 },
      evaluationCapability: { type: Number, default: 0 },
      workflowDesign: { type: Number, default: 0 },
      strategicVision: { type: Number, default: 0 },
      mentorshipReadiness: { type: Number, default: 0 }
    }
  },
  analysis: {
    status: { type: String, default: 'locked' },
    topCapability: { type: String, default: 'AI Evaluation & Critical Assessment' },
    growthArea: { type: String, default: 'AI Workflow Design' },
    unlockedAt: { type: String, default: null }
  },
  clarity: {
    status: { type: String, default: 'locked' },
    selectedAreas: { type: [String], default: [] },
    selectedTopic: { type: String, default: null },
    completedTopics: { type: [String], default: [] },
    reflections: { type: Schema.Types.Mixed, default: {} }
  },
  focus: {
    status: { type: String, default: 'locked' },
    selectedTrack: { type: String, default: null },
    history: { type: [String], default: [] },
    activatedAt: { type: String, default: null }
  },
  radar: {
    status: { type: String, default: 'available' },
    investigatedSignalIds: { type: [String], default: [] },
    followedSignalIds: { type: [String], default: [] }
  },
  investigation: {
    status: { type: String, default: 'locked' },
    selectedSignalId: { type: String, default: null },
    userNotes: { type: Schema.Types.Mixed, default: {} }
  },
  transactions: { type: [CreditTransactionSchema], default: [] },
  notifications: {
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: String, default: 'Just now' },
        targetTab: { type: String },
        read: { type: Boolean, default: false }
      }
    ],
    default: [
      {
        id: 'notif-init',
        title: 'Welcome to AIIMS Ecosystem',
        message: 'Begin with your baseline Capability Assessment to unlock personalized AI intelligence.',
        timestamp: 'Just now',
        targetTab: 'assessment',
        read: false
      }
    ]
  },
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
    const isMatch = this.password === candidatePassword;
    if (isMatch) {
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
