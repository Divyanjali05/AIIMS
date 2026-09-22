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
import { Surface } from '../../components/common/Surface';
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
      {latestWorkflow && (
        <Surface
          variant="gradient-relevance"
          radius="lg"
          padding="lg"
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
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {latestWorkflow.problemSummary}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
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
        </Surface>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <Surface variant="bordered" radius="lg" padding="lg" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FolderPlus size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            No Projects in Workspace Yet
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
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
        </Surface>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {projects.map((project) => (
            <Surface key={project.id} variant="bordered" radius="md" padding="md" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Badge variant="cyan">{project.category}</Badge>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                {project.title}
              </h4>
              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.4, margin: '0 0 14px' }}>
                {project.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                {project.toolsUsed.map((tool) => (
                  <span
                    key={tool}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      color: '#475569',
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
            </Surface>
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
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.16)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Create AI Project Blueprint
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
              Define a reusable workflow template connected to your evaluated AI tools.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    border: '1.5px solid #e2e8f0',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '13.5px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
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
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    border: '1.5px solid #e2e8f0',
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
