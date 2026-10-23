import React, { useState } from 'react';
import {
  Brain,
  Radar,
  Compass,
  Layers,
  Wrench,
  MessageCircle,
  Wallet,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useTheme } from '../../context/ThemeContext';
import { getFeatureAccess } from '../../services/featureAccessService';

interface LearningUniverseMapProps {
  setActiveTab: (tab: string) => void;
  forceDark?: boolean;
}

interface DestinationNode {
  id: string;
  tab: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  x: number; // Percentage coordinate on cosmic canvas
  y: number;
  color: string;
  glow: string;
  gated: boolean;
}

const DESTINATIONS: DestinationNode[] = [
  {
    id: 'core',
    tab: 'assessment',
    name: 'Knowledge Core',
    tagline: 'Assessment & Analysis',
    description: 'Establish your 5-dimension AI competence baseline and growth areas.',
    icon: Brain,
    x: 18,
    y: 35,
    color: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.45)',
    gated: false,
  },
  {
    id: 'lab',
    tab: 'clarity',
    name: 'Practice Lab',
    tagline: 'Clarity AI Task Lab',
    description: 'Execute hands-on prompt challenges scored via Claude & Gemini rubrics.',
    icon: Compass,
    x: 48,
    y: 22,
    color: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.45)',
    gated: false,
  },
  {
    id: 'toolkit',
    tab: 'wallet',
    name: 'AI Toolkit',
    tagline: 'AI Wallet & Catalog',
    description: 'Discover, compare, and collect verified AI tools for your stack.',
    icon: Wallet,
    x: 80,
    y: 32,
    color: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
    gated: false,
  },
  {
    id: 'orbit',
    tab: 'radar',
    name: 'Discovery Orbit',
    tagline: 'AI Radar Signals',
    description: 'Monitor emerging technical breakthroughs and model release shifts.',
    icon: Radar,
    x: 24,
    y: 78,
    color: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.45)',
    gated: true,
  },
  {
    id: 'solver',
    tab: 'solver',
    name: 'Problem Space',
    tagline: 'Problem Solver',
    description: 'Input business friction to derive executable AI architectures.',
    icon: Wrench,
    x: 52,
    y: 72,
    color: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    gated: true,
  },
  {
    id: 'creation',
    tab: 'build',
    name: 'Creation Zone',
    tagline: 'Project Builder',
    description: 'Assemble reusable production projects and AI agent workflows.',
    icon: Layers,
    x: 78,
    y: 78,
    color: '#EC4899',
    glow: 'rgba(236, 72, 153, 0.45)',
    gated: true,
  },
  {
    id: 'mentor',
    tab: 'mentor',
    name: 'Mentor Station',
    tagline: 'AI Mentor Workspace',
    description: 'Strategic contextual observations and personalized coaching.',
    icon: MessageCircle,
    x: 50,
    y: 48,
    color: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.55)',
    gated: true,
  },
];

export const LearningUniverseMap: React.FC<LearningUniverseMapProps> = ({
  setActiveTab,
  forceDark,
}) => {
  const { state } = useLearner();
  const { theme } = useTheme();
  const isLight = forceDark ? false : theme === 'light';
  const [hoveredNode, setHoveredNode] = useState<DestinationNode | null>(null);

  // Compute status for each destination based on real persisted evidence
  const getNodeStatus = (node: DestinationNode): 'completed' | 'available' | 'locked' => {
    if (node.id === 'core') {
      return state.assessment?.status === 'completed' ? 'completed' : 'available';
    }
    if (node.id === 'lab') {
      const taskCount = Object.keys(state.clarity?.taskScores || {}).length;
      return taskCount > 0 ? 'completed' : 'available';
    }
    if (node.id === 'toolkit') {
      const toolCount = (state.aiWallet?.userTools || []).length;
      return toolCount > 0 ? 'completed' : 'available';
    }
    // Gated destinations derive from feature access rules
    const access = getFeatureAccess(node.tab, state);
    if (!access.unlocked) return 'locked';

    if (node.id === 'orbit') {
      return (state.radar?.investigatedSignalIds?.length || 0) > 0 ? 'completed' : 'available';
    }
    if (node.id === 'solver') {
      return (state.solver?.history?.length || 0) > 0 ? 'completed' : 'available';
    }
    if (node.id === 'creation') {
      return (state.build?.projects?.length || 0) > 0 ? 'completed' : 'available';
    }
    if (node.id === 'mentor') {
      return 'available';
    }
    return 'available';
  };

  const handleNodeClick = (node: DestinationNode) => {
    setActiveTab(node.tab);
  };

  return (
    <div
      style={{
        backgroundColor: isLight ? '#FFFFFF' : '#0A0F24',
        borderRadius: '24px',
        border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(139, 92, 246, 0.25)',
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isLight
          ? '0 10px 30px rgba(0, 0, 0, 0.05)'
          : '0 20px 50px -10px rgba(0, 0, 0, 0.6)',
        color: isLight ? '#172033' : '#F8FAFC',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Background celestial grid & soft radial glows */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isLight
            ? 'radial-gradient(circle at 50% 50%, rgba(109, 93, 251, 0.06) 0%, rgba(246, 248, 252, 0.95) 85%)'
            : 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.12) 0%, rgba(8, 11, 22, 0.95) 85%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header section */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#22D3EE',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={13} color="#22D3EE" />
            AI LEARNING UNIVERSE
          </div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: isLight ? '#172033' : '#FFFFFF',
              margin: '4px 0 0',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Explore Your AI Destinations
          </h2>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '11.5px',
            color: isLight ? '#64748B' : '#94A3B8',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
              }}
            />
            Completed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#0891B2' : '#22D3EE',
                boxShadow: isLight ? 'none' : '0 0 6px #22D3EE',
              }}
            />
            Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#94A3B8',
              }}
            />
            Locked
          </span>
        </div>
      </div>

      {/* DESKTOP / TABLET COSMIC MAP (Visible above 768px) */}
      <div
        className="aiims-universe-desktop"
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          borderRadius: '18px',
          backgroundColor: isLight ? '#F8FAFC' : 'rgba(16, 22, 42, 0.45)',
          border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.06)',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        {/* SVG Conduits connecting celestial nodes */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="orbitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Central Conduit Ring */}
          <circle
            cx="50%"
            cy="48%"
            r="130"
            fill="none"
            stroke={isLight ? 'rgba(109, 93, 251, 0.12)' : 'rgba(139, 92, 246, 0.15)'}
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <circle
            cx="50%"
            cy="48%"
            r="220"
            fill="none"
            stroke={isLight ? 'rgba(8, 145, 178, 0.1)' : 'rgba(34, 211, 238, 0.1)'}
            strokeWidth="1"
            strokeDasharray="3,7"
          />

          {/* Connected Pathways between Core -> Lab -> Toolkit -> Orbit -> Solver -> Creation */}
          <line
            x1="18%"
            y1="35%"
            x2="48%"
            y2="22%"
            stroke="url(#orbitGrad1)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <line
            x1="48%"
            y1="22%"
            x2="80%"
            y2="32%"
            stroke="url(#orbitGrad2)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <line
            x1="18%"
            y1="35%"
            x2="24%"
            y2="78%"
            stroke={isLight ? 'rgba(8, 145, 178, 0.25)' : 'rgba(56, 189, 248, 0.3)'}
            strokeWidth="1.5"
          />
          <line
            x1="48%"
            y1="22%"
            x2="52%"
            y2="72%"
            stroke={isLight ? 'rgba(217, 119, 6, 0.25)' : 'rgba(245, 158, 11, 0.3)'}
            strokeWidth="1.5"
          />
          <line
            x1="52%"
            y1="72%"
            x2="78%"
            y2="78%"
            stroke={isLight ? 'rgba(219, 39, 119, 0.25)' : 'rgba(236, 72, 153, 0.3)'}
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="48%"
            x2="52%"
            y2="72%"
            stroke={isLight ? 'rgba(109, 93, 251, 0.25)' : 'rgba(168, 85, 247, 0.3)'}
            strokeWidth="1.5"
          />
          <line
            x1="50%"
            y1="48%"
            x2="48%"
            y2="22%"
            stroke={isLight ? 'rgba(109, 93, 251, 0.25)' : 'rgba(168, 85, 247, 0.3)'}
            strokeWidth="1.5"
          />
        </svg>

        {/* Destination Nodes */}
        {DESTINATIONS.map((dest) => {
          const status = getNodeStatus(dest);
          const isCompleted = status === 'completed';
          const isLocked = status === 'locked';
          const isHovered = hoveredNode?.id === dest.id;
          const Icon = dest.icon;
          const accessInfo = dest.gated ? getFeatureAccess(dest.tab, state) : null;

          return (
            <div
              key={dest.id}
              tabIndex={0}
              role="button"
              aria-label={`${dest.name}: ${dest.tagline} (${status})`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNodeClick(dest);
                }
              }}
              onMouseEnter={() => setHoveredNode(dest)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(dest)}
              style={{
                position: 'absolute',
                left: `${dest.x}%`,
                top: `${dest.y}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                zIndex: isHovered ? 10 : 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                outline: 'none',
              }}
            >
              {/* Node Orb Container */}
              <div
                style={{
                  position: 'relative',
                  width: dest.id === 'mentor' ? '68px' : '56px',
                  height: dest.id === 'mentor' ? '68px' : '56px',
                  borderRadius: '50%',
                  backgroundColor: isLocked
                    ? isLight
                      ? '#F1F5F9'
                      : 'rgba(30, 41, 59, 0.85)'
                    : isLight
                      ? '#FFFFFF'
                      : 'rgba(16, 22, 42, 0.95)',
                  border: isLocked
                    ? isLight
                      ? '1.5px dashed #94A3B8'
                      : '1.5px dashed rgba(148, 163, 184, 0.4)'
                    : `2px solid ${isHovered ? (isLight ? '#172033' : '#FFFFFF') : dest.color}`,
                  boxShadow: isLocked
                    ? 'none'
                    : isHovered
                      ? `0 0 25px ${dest.color}, inset 0 0 15px ${dest.color}`
                      : `0 0 15px ${dest.glow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isLocked ? '#94A3B8' : dest.color,
                  transition: 'all 0.25s ease',
                }}
              >
                <Icon size={dest.id === 'mentor' ? 28 : 22} />

                {/* Status Indicator Icon */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#10B981' : isLocked ? '#EF4444' : '#06B6D4',
                    border: isLight ? '2px solid #FFFFFF' : '2px solid #080B16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={11} />
                  ) : isLocked ? (
                    <Lock size={10} />
                  ) : (
                    <Sparkles size={10} />
                  )}
                </div>
              </div>

              {/* Node Label Text */}
              <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: isLocked ? '#94A3B8' : isLight ? '#172033' : '#F8FAFC',
                    textShadow: isLight ? 'none' : '0 2px 4px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dest.name}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: isLocked ? '#64748B' : dest.color,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {dest.tagline}
                </div>
              </div>

              {/* HOVER TOOLTIP */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '105%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(8, 11, 22, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: isLight ? '1px solid #CBD5E1' : `1px solid ${dest.color}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    width: '220px',
                    textAlign: 'left',
                    boxShadow: isLight
                      ? '0 10px 25px rgba(0, 0, 0, 0.12)'
                      : '0 10px 25px rgba(0, 0, 0, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: dest.color,
                      textTransform: 'uppercase',
                      marginBottom: '2px',
                    }}
                  >
                    {dest.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: isLight ? '#334155' : '#E2E8F0',
                      lineHeight: 1.4,
                      marginBottom: '8px',
                    }}
                  >
                    {dest.description}
                  </div>

                  {isLocked && accessInfo?.reason && (
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: '#DC2626',
                        borderTop: isLight
                          ? '1px solid #E2E8F0'
                          : '1px solid rgba(255,255,255,0.1)',
                        paddingTop: '6px',
                      }}
                    >
                      🔒 {accessInfo.reason}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: isLight ? '#0891B2' : '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isLocked ? 'View requirements' : 'Launch destination'} <ArrowRight size={11} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MOBILE DESTINATIONS GRID (Visible below 768px) */}
      <div
        className="aiims-universe-mobile"
        style={{
          display: 'none',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {DESTINATIONS.map((dest) => {
          const status = getNodeStatus(dest);
          const isCompleted = status === 'completed';
          const isLocked = status === 'locked';
          const Icon = dest.icon;

          return (
            <div
              key={dest.id}
              onClick={() => handleNodeClick(dest)}
              style={{
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(16, 22, 42, 0.75)',
                border: isLocked
                  ? isLight
                    ? '1px dashed #CBD5E1'
                    : '1px dashed rgba(148, 163, 184, 0.3)'
                  : isLight
                    ? '1px solid #E2E8F0'
                    : `1px solid ${dest.color}`,
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: isLocked ? 0.75 : 1,
                boxShadow: isLight ? '0 4px 12px rgba(0, 0, 0, 0.04)' : 'none',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isLocked
                      ? isLight
                        ? '#F1F5F9'
                        : 'rgba(255,255,255,0.05)'
                      : isLight
                        ? `${dest.color}15`
                        : `${dest.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isLocked ? '#94A3B8' : dest.color,
                  }}
                >
                  <Icon size={18} />
                </div>

                {isCompleted ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : isLocked ? (
                  <Lock size={15} color="#94A3B8" />
                ) : (
                  <Sparkles size={15} color={isLight ? '#0891B2' : '#22D3EE'} />
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: isLight ? '#172033' : '#FFFFFF',
                  }}
                >
                  {dest.name}
                </div>
                <div style={{ fontSize: '10.5px', color: isLocked ? '#64748B' : dest.color }}>
                  {dest.tagline}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .aiims-universe-desktop {
            display: none !important;
          }
          .aiims-universe-mobile {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  );
};
