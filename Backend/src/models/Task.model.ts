import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  taskId: string;
  title: string;
  description: string;
  category: string;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema(
  {
    taskId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: 'General AI' },
    level: { type: Number, default: 1, min: 1, max: 4 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Query optimization index for active task catalogue filtering
TaskSchema.index({ isActive: 1, level: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);

// Initial fallback tasks for offline memory execution
export const defaultTasks: Array<{
  taskId: string;
  title: string;
  description: string;
  category: string;
  level: number;
  isActive: boolean;
}> = [
  {
    taskId: 'task-prompt-opt-1',
    title: 'Prompt Optimization & Context Constraint Design',
    description:
      'Design a robust system prompt with strict edge-case validation and error boundary constraints.',
    category: 'Prompt Engineering',
    level: 1,
    isActive: true,
  },
  {
    taskId: 'task-eval-benchmark-2',
    title: 'AI Evaluation & Hallucination Auditing',
    description:
      'Construct a verification framework to detect reasoning drift and unsupported claims in model output.',
    category: 'Evaluation & Auditing',
    level: 2,
    isActive: true,
  },
  {
    taskId: 'task-agent-workflow-3',
    title: 'Multi-Agent Tool Orchestration Plan',
    description:
      'Formulate an end-to-end task decomposition architecture with state machine transitions.',
    category: 'Agentic Systems',
    level: 3,
    isActive: true,
  },
  {
    taskId: 'task-mastery-synthesis-4',
    title: 'Executive AI Strategy & Governance Blueprint',
    description: 'Develop an enterprise AI capability assessment and deployment roadmap.',
    category: 'Strategic Vision',
    level: 4,
    isActive: true,
  },
];
