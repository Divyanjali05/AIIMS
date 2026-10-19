import mongoose, { Schema, Document } from 'mongoose';

export type CreditTransactionType = 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
export type CreditTransactionCategory = 'TASK_USAGE' | 'REWARD' | 'REFUND' | 'ADMIN' | 'INVESTMENT';
export type CreditTransactionStatus = 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';

export interface ICreditLedger extends Document {
  id: string;
  userId: string;
  type: CreditTransactionType;
  category: CreditTransactionCategory;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string;
  sourceId?: string;
  idempotencyKey?: string;
  status: CreditTransactionStatus;
  relatedTaskId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const CreditLedgerSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT']
    },
    category: {
      type: String,
      required: true,
      enum: ['TASK_USAGE', 'REWARD', 'REFUND', 'ADMIN', 'INVESTMENT'],
      default: 'REWARD'
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Credit amount must be at least 1']
    },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    sourceId: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['COMPLETED', 'PENDING', 'REVERSED', 'FAILED'],
      default: 'COMPLETED'
    },
    relatedTaskId: { type: String, trim: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        // Never expose sensitive provider keys or credentials
        if (ret.metadata) {
          delete ret.metadata.apiKey;
          delete ret.metadata.secret;
          delete ret.metadata.authorization;
        }
        return ret;
      }
    }
  }
);

// Compound index for user history retrieval (chronological reverse order)
CreditLedgerSchema.index({ userId: 1, createdAt: -1 });

// Compound unique index for strict per-user idempotency
CreditLedgerSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

export const CreditLedger = mongoose.models.CreditLedger || mongoose.model<ICreditLedger>('CreditLedger', CreditLedgerSchema);
