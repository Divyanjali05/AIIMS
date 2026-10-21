import React, { useState } from 'react';
import { useLearner } from '../../context/LearnerContext';
import {
  Layers,
  Sparkles,
  Plus,
  ArrowRight,
  CheckCircle2,
  FolderPlus,
  Wrench,
  Calendar,
  ExternalLink,
  Code
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { UserProject } from '../../types';

interface BuildScreenProps {
  setActiveTab: (tab: string) => void;
}

export const BuildScreen: React.FC<BuildScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const projects: UserProject[] = state.build?.projects || [];
  const latestWorkflow = state.solver?.latestWorkflow;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Workflow Automation');
  const [toolsUsed, setToolsUsed] = useState<string[]>(['OpenAI API', 'Claude']);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <PageHeader
        icon={<Layers size={24} style={{ color: '#ea580c' }} />}
        title="Build Workspace — Projects & AI Workflows"
        description="Transform your problem solver solutions and evaluated AI tools into repeatable, production-grade workflows and project blueprints."
      />

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="warning">{projects.length} Active Projects</Badge>
          {latestWorkflow && (
            <Badge variant="success">Solved Workflow Available</Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            size="md"
            icon={<Wrench size={15} />}
            onClick={() => setActiveTab('solver')}
          >
            Go to Problem Solver
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={() => setShowCreateModal(true)}
          >
            Create New Project
          </Button>
        </div>
      </div>

      {/* Quick Convert from Solver */}
      {/* Quick Convert from Solver */}
      {latestWorkflow && (
        <Card
          variant="gradient-relevance"
          radius="default"
          padding="default"
          style={{
            border: '1px solid #fed7aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Sparkles size={14} style={{ color: '#ea580c' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Ready to Turn Into Project
              </span>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: 'var(--aiims-text-heading, #0f172a)' }}>
              {latestWorkflow.problemSummary}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-secondary, #475569)', lineHeight: 1.4 }}>
              Turn your {latestWorkflow.workflowSteps.length}-step solved execution sequence into a reusable workflow project template.
            </p>
          </div>

          <Button
            variant="amber"
            size="md"
            icon={<ArrowRight size={15} />}
            onClick={() => {
              setTitle(latestWorkflow.problemSummary);
              const toolNames = latestWorkflow.matchedTools.map((t) => t.name);
              setDescription(`Workflow sequence derived from problem solver: ${toolNames.join(', ')}`);
              setToolsUsed(toolNames);
              setShowCreateModal(true);
            }}
          >
            Save as Project Blueprint
          </Button>
        </Card>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card variant="bordered" radius="default" padding="lg" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FolderPlus size={40} style={{ color: 'var(--aiims-text-subtle, #cbd5e1)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--aiims-text-heading, #0f172a)', margin: '0 0 6px' }}>
            No Projects in Workspace Yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--aiims-text-secondary, #64748b)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Solve real-world tasks with the <strong>Problem Solver</strong> or define custom multi-tool templates to turn your AI capabilities into verifiable assets.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setShowCreateModal(true)}>
              Define First Project
            </Button>
            <Button variant="outline" size="md" icon={<Wrench size={15} />} onClick={() => setActiveTab('solver')}>
              Launch Problem Solver
            </Button>
          </div>
        </Card>
      ) : (
        <div className="aiims-card-grid">
          {projects.map((project) => (
            <Card key={project.id} variant="bordered" radius="default" padding="default" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Badge variant="cyan">{project.category}</Badge>
                <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted, #94a3b8)' }}>
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--aiims-text-heading, #0f172a)', margin: '0 0 6px' }}>
                {project.title}
              </h4>
              <p className="aiims-card-body" style={{ fontSize: '13.5px', color: 'var(--aiims-text-secondary, #64748b)', lineHeight: 1.4, margin: '0 0 14px' }}>
                {project.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                {project.toolsUsed.map((tool) => (
                  <span
                    key={tool}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'var(--aiims-bg-card-hover, #f1f5f9)',
                      border: '1px solid var(--aiims-border-card, #e2e8f0)',
                      borderRadius: '4px',
                      color: 'var(--aiims-text-secondary, #475569)',
                      fontWeight: 600
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" icon={<ExternalLink size={13} />} fullWidth>
                View Blueprint
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--aiims-modal-bg)',
              borderRadius: '16px',
              border: '1px solid var(--aiims-modal-border)',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: 'var(--aiims-shadow-modal)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--aiims-text-heading)', margin: '0 0 6px' }}>
              Create AI Project Blueprint
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--aiims-text-muted)', margin: '0 0 18px' }}>
              Define a reusable workflow template connected to your evaluated AI tools.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--aiims-text-heading)', marginBottom: '4px' }}>
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Automated Technical Research Loop"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-input-border)',
                    backgroundColor: 'var(--aiims-input-bg)',
                    color: 'var(--aiims-input-text)',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--aiims-text-heading)', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-input-border)',
                    fontSize: '13.5px',
                    outline: 'none',
                    backgroundColor: 'var(--aiims-input-bg)',
                    color: 'var(--aiims-input-text)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Workflow Automation">Workflow Automation</option>
                  <option value="Content & Synthesis">Content & Synthesis</option>
                  <option value="Data & Analytics">Data & Analytics</option>
                  <option value="Coding & Agents">Coding & Agents</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--aiims-text-heading)', marginBottom: '4px' }}>
                  Description & Execution Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the problem, input data, and step sequence..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--aiims-input-border)',
                    backgroundColor: 'var(--aiims-input-bg)',
                    color: 'var(--aiims-input-text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <Button variant="ghost" size="md" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
