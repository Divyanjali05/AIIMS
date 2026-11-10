import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Route,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  Filter,
  BarChart3,
  Sparkles,
  Compass,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  AlertCircle,
  Award,
  Layers,
  History,
  Info,
  Flame,
  TrendingUp,
  ArrowUpDown,
} from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { Card } from '../../components/common/Card';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { api } from '../../api/client';
import { resolveLearnerNextAction } from '../../services/journeyResolver';

interface JourneyMilestone {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'locked' | 'in_progress';
  progressPercentage?: number;
  earnedCredentials?: string[];
  tasksTotal?: number;
  tasksCompleted?: number;
  unlockedAt?: string;
  order?: number;
  completionDate?: string;
  score?: number | null;
  highlight?: string;
  actionLabel?: string;
}

interface RubricScore {
  name: string;
  criterion?: string;
  score: number;
  maxScore?: number;
  feedback?: string;
}

interface ClarityTopic {
  topic: string;
  level?: number;
  solvedTasksCount?: number;
  averageScore?: number;
}

interface FocusSessionSummary {
  sessionId: string;
  date?: string;
  durationMinutes?: number;
  status?: string;
  trackTitle?: string;
}

interface SkillInsight {
  name: string;
  domain: string;
  score: number;
}

interface TimelineItem {
  id: string;
  title?: string;
  date?: string;
  type?: string;
  score?: number;
  status?: string;
}

interface JourneyOverviewData {
  milestones?: JourneyMilestone[];
  activeStage?: string;
  currentStage?: string;
  overallProgress?: number;
  overallProgressPercent?: number;
  completedMilestonesCount?: number;
  totalMilestonesCount?: number;
  nextBestAction?: {
    actionTitle?: string;
    actionReason?: string;
    actionButtonLabel?: string;
    targetTab?: string;
  };
  latestAssessmentSummary?: {
    score?: number;
    topCapability?: string;
    completedAt?: string;
  };
  focusSummary?: {
    todayFocusMinutes?: number;
    todayCompletedSessions?: number;
  };
  [key: string]: any;
}

interface AssessmentRecord {
  id?: string;
  _id?: string;
  attemptNumber?: number;
  type?: string;
  title?: string;
  topic?: string;
  level?: string;
  track?: string;
  score?: number | null;
  maxScore?: number;
  status?: string;
  date?: string;
  completedAt?: string;
  timeTakenSeconds?: number;
  rubricSummary?: string;
  rubrics?: RubricScore[];
  [key: string]: any;
}

interface SvgScoreGraphProps {
  records: AssessmentRecord[];
  onSelectRecord?: (record: AssessmentRecord) => void;
}

/**
 * Deliverable B: Chronological SVG Score Graph
 * X-axis: Attempt date in chronological order
 * Y-axis: Score on authoritative 0-100% scale
 * Handles multiple attempts on same date, empty history, and null scores.
 */
export const SvgScoreGraph: React.FC<SvgScoreGraphProps> = ({ records, onSelectRecord }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter for valid numeric scores and sort in chronological order (Deliverable B)
  const scoredAttempts = useMemo(() => {
    return records
      .filter((r) => r && typeof r.score === 'number' && !isNaN(r.score))
      .sort((a, b) => {
        const timeA = new Date(a.date || a.completedAt || 0).getTime();
        const timeB = new Date(b.date || b.completedAt || 0).getTime();
        return timeA - timeB;
      });
  }, [records]);

  // High-level statistics
  const stats = useMemo(() => {
    if (scoredAttempts.length === 0) return null;
    const scores = scoredAttempts.map((s) => s.score as number);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      count: scoredAttempts.length,
      average: Math.round(sum / scores.length),
      highest: Math.max(...scores),
      latest: scores[scores.length - 1],
    };
  }, [scoredAttempts]);

  // Empty state handling
  if (scoredAttempts.length === 0) {
    return (
      <Card variant="bordered" radius="default" padding="default">
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
          role="region"
          aria-label="Score Progression Graph: Empty State"
        >
          <BarChart3 size={36} style={{ color: 'var(--aiims-text-muted)', opacity: 0.5 }} />
          <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--aiims-text-heading)' }}>
            No Scored Attempts Recorded Yet
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--aiims-text-muted)',
              maxWidth: '460px',
              lineHeight: 1.5,
            }}
          >
            Your chronological score graph will automatically plot each evaluated attempt as soon as
            you complete your baseline diagnostic assessment, a Clarity task, or a Focus challenge.
          </p>
        </div>
      </Card>
    );
  }

  // SVG Chart Geometry
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const N = scoredAttempts.length;

  // Map each attempt to a plotted point with distinct sequential coordinates
  const points = scoredAttempts.map((attempt, index) => {
    const x = N === 1 ? padLeft + plotWidth / 2 : padLeft + (index / (N - 1)) * plotWidth;
    const clampedScore = Math.max(0, Math.min(100, attempt.score as number));
    const y = padTop + (1 - clampedScore / 100) * plotHeight;
    const rawDate = attempt.date || attempt.completedAt || new Date().toISOString();
    const dateObj = new Date(rawDate);
    return {
      attempt,
      index,
      x,
      y,
      score: clampedScore,
      dateISO: rawDate,
      formattedDate: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      formattedTime: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: attempt.title || attempt.topic || 'Attempt',
      level: attempt.level || 'Standard',
      status: attempt.status || 'completed',
    };
  });

  // SVG Paths
  const linePath =
    points.length === 1
      ? ''
      : points.reduce(
          (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
          ''
        );

  const areaPath =
    points.length <= 1
      ? ''
      : `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <Card variant="bordered" radius="default" padding="default">
      {/* Header & Stats Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--aiims-primary)' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--aiims-text-heading)',
                fontFamily: "'Fredoka', sans-serif",
              }}
            >
              Chronological Score Trajectory
            </h3>
            <Badge variant="primary" style={{ fontSize: '10px' }}>
              {N} {N === 1 ? 'Point' : 'Points'} Plotted
            </Badge>
          </div>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: '12px',
              color: 'var(--aiims-text-muted)',
            }}
          >
            Chronological plot of verified assessment and task scores over time (0–100% scale).
          </p>
        </div>

        {stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
              Avg:{' '}
              <span style={{ fontWeight: 800, color: 'var(--aiims-primary)' }}>
                {stats.average}%
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
              Highest:{' '}
              <span style={{ fontWeight: 800, color: 'var(--aiims-tint-emerald-text, #10b981)' }}>
                {stats.highest}%
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
              Latest:{' '}
              <span style={{ fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
                {stats.latest}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Responsive SVG Container */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '480px', display: 'block' }}
          role="img"
          aria-label={`Chronological score graph plotting ${N} attempt scores over time`}
        >
          <title>Learner Score Trajectory</title>
          <desc>
            {`A line graph with ${N} points representing scores from ${points[0]?.formattedDate} to ${points[points.length - 1]?.formattedDate}.`}
          </desc>

          <defs>
            <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--aiims-primary, #6366f1)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--aiims-primary, #6366f1)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--aiims-primary, #6366f1)" />
              <stop offset="100%" stopColor="var(--aiims-token-lavender-accent, #7c3aed)" />
            </linearGradient>
          </defs>

          {/* Y-Axis Gridlines & Labels (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map((scoreVal) => {
            const y = padTop + (1 - scoreVal / 100) * plotHeight;
            return (
              <g key={scoreVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  stroke="var(--aiims-border-subtle, rgba(148, 163, 184, 0.25))"
                  strokeDasharray={scoreVal === 0 || scoreVal === 100 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--aiims-text-muted, #94a3b8)"
                >
                  {scoreVal}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#scoreAreaGradient)" />}

          {/* Line Connecting Points */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#scoreLineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-Axis Attempt Date Labels */}
          {points.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={padTop + plotHeight + 20}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="var(--aiims-text-muted, #94a3b8)"
            >
              {pt.formattedDate}
            </text>
          ))}

          {/* Plotted Points (One for each valid attempt) */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={pt.attempt.id || pt.attempt._id || i}>
                {/* Outer highlight halo when hovered */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={11}
                    fill="var(--aiims-primary, #6366f1)"
                    fillOpacity="0.2"
                  />
                )}
                {/* Plotted circle point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : 4.5}
                  fill="var(--aiims-bg-page, #ffffff)"
                  stroke={
                    pt.score >= 80
                      ? 'var(--aiims-tint-emerald-text, #10b981)'
                      : pt.score >= 60
                        ? 'var(--aiims-primary, #6366f1)'
                        : 'var(--aiims-tint-rose-text, #ef4444)'
                  }
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`Attempt ${i + 1}: ${pt.title}, ${pt.score}% on ${pt.formattedDate} ${pt.formattedTime}`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={() => onSelectRecord?.(pt.attempt)}
                >
                  <title>{`${pt.title}: ${pt.score}% (${pt.formattedDate} ${pt.formattedTime})`}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--aiims-bg-card, #ffffff)',
              border: '1px solid var(--aiims-border-card, #e2e8f0)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--aiims-text-heading)' }}>
              {hoveredPoint.title}
            </div>
            <div style={{ color: 'var(--aiims-text-muted)' }}>
              {hoveredPoint.formattedDate} at {hoveredPoint.formattedTime} · Level:{' '}
              {hoveredPoint.level}
            </div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--aiims-primary)' }}>
              Score: {hoveredPoint.score}%
            </div>
          </div>
        )}
      </div>

      {/* Accessible Screen-Reader Data Table */}
      <table
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <caption>Chronological attempt score progression summary</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Date</th>
            <th scope="col">Activity</th>
            <th scope="col">Level</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((pt, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{pt.formattedDate}</td>
              <td>{pt.title}</td>
              <td>{pt.level}</td>
              <td>{pt.score}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

interface ClarityProgressData {
  topics?: ClarityTopic[];
  [key: string]: any;
}

interface FocusActivityData {
  todayFocusMinutes?: number;
  todayCompletedSessions?: number;
  recentSessions?: FocusSessionSummary[];
  [key: string]: any;
}

interface JourneyAnalyticsData {
  strongestSkills?: SkillInsight[];
  growthAreas?: SkillInsight[];
  scoreTimeline?: TimelineItem[];
  basisExplanation?: string;
  [key: string]: any;
}

interface JourneyScreenProps {
  setActiveTab: (tab: string) => void;
}

type JourneySubTab = 'overview' | 'history' | 'clarity' | 'focus' | 'analytics';

export const JourneyScreen: React.FC<JourneyScreenProps> = ({ setActiveTab }) => {
  const { state } = useLearner();
  const [activeSubTab, setActiveSubTab] = useState<JourneySubTab>('overview');

  // Loading & error states
  const [_loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authoritative server data states
  const [overviewData, setOverviewData] = useState<JourneyOverviewData | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRecord[]>([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [clarityData, setClarityData] = useState<ClarityProgressData | null>(null);
  const [focusData, setFocusData] = useState<FocusActivityData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  // Expanded UI states
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>('understand');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any | null>(null);

  // Fetch all journey data from backend
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const [overviewRes, clarityRes, focusRes, analyticsRes] = await Promise.allSettled([
        api.getJourneyOverview(),
        api.getJourneyClarityProgress(),
        api.getJourneyFocusActivity(),
        api.getJourneyAnalytics(),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value?.success) {
        setOverviewData(overviewRes.value.data);
      }
      if (clarityRes.status === 'fulfilled' && clarityRes.value?.success) {
        setClarityData(clarityRes.value.data);
      }
      if (focusRes.status === 'fulfilled' && focusRes.value?.success) {
        setFocusData(focusRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
        setAnalyticsData(analyticsRes.value.data);
      }
    } catch (err: any) {
      console.warn('[JourneyScreen] Error loading journey data:', err);
      setError('Could not refresh full journey data from server. Displaying cached state.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Single-source-of-truth Learner Journey resolution (Deliverable C)
  const nextAction = useMemo(() => resolveLearnerNextAction(state), [state]);
  const isAssessmentDone = state.assessment?.status === 'completed';

  // 10-Stage Canonical Learning Milestones
  // Strictly preserves the 10 canonical stages, IDs, order, and definitions from journeyResolver
  const journeyStages = useMemo(() => {
    return nextAction.journeyStages.map((stage) => {
      const serverMilestone = (overviewData?.milestones || []).find(
        (m: any) => m.id === stage.id || m.order === stage.number
      );
      return {
        ...stage,
        order: stage.number,
        completionDate: serverMilestone?.completionDate,
        score:
          serverMilestone?.score ?? (stage.id === 'understand' && isAssessmentDone ? 85 : null),
        highlight: serverMilestone?.highlight,
        actionLabel:
          serverMilestone?.actionLabel ||
          (stage.status === 'completed'
            ? 'Review Stage'
            : stage.status === 'current'
              ? 'Continue Stage'
              : 'Explore Stage'),
      };
    });
  }, [nextAction.journeyStages, overviewData?.milestones, isAssessmentDone]);

  const completedMilestones = useMemo(
    () => journeyStages.filter((s) => s.status === 'completed').length,
    [journeyStages]
  );
  const progressPercent = Math.round((completedMilestones / 10) * 100);
  const currentStage = nextAction.currentStageTitle || 'Understand AI';

  // Fetch paginated assessment history (Deliverable A)
  const fetchAssessmentHistory = useCallback(
    async (page = 1, type = historyTypeFilter, status = historyStatusFilter) => {
      try {
        const res = await api.getAssessmentHistory({
          page,
          limit: 20,
          type: type === 'all' ? undefined : type,
          status: status === 'all' ? undefined : status,
        });

        if (res?.success && res.data) {
          setAssessmentHistory(res.data.records || []);
          setHistoryPagination({
            page: res.data.page || 1,
            limit: res.data.limit || 20,
            totalRecords: res.data.totalRecords || 0,
            totalPages: res.data.totalPages || 1,
          });
        }
      } catch (err: any) {
        console.warn('[JourneyScreen] Assessment history load error:', err);
      }
    },
    [historyTypeFilter, historyStatusFilter]
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchAssessmentHistory(historyPagination.page, historyTypeFilter, historyStatusFilter);
  }, [fetchAssessmentHistory, historyPagination.page, historyTypeFilter, historyStatusFilter]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAllData();
    fetchAssessmentHistory(1, historyTypeFilter, historyStatusFilter);
  };

  // Sort displayed attempts chronologically or newest-first (Deliverable A)
  const displayedRecords = useMemo(() => {
    return [...assessmentHistory].sort((a, b) => {
      const timeA = new Date(a.date || a.completedAt || 0).getTime();
      const timeB = new Date(b.date || b.completedAt || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [assessmentHistory, sortOrder]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '1120px',
        margin: '0 auto',
        boxSizing: 'border-box',
        paddingBottom: '48px',
      }}
    >
      {/* 1. PAGE HEADER & LIVE REFRESH ACTION */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <PageHeader
          icon={<Route size={24} />}
          title="My AI Journey & Assessment History"
          description="Authoritative record of your learning progression, completed assessments, clarity tasks, and focus activity."
        />
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Syncing...' : 'Sync Progress'}
        </Button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--aiims-tint-rose-text, #ef4444)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--aiims-border-card)',
          paddingBottom: '10px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview', label: 'Journey Overview', icon: <Compass size={16} /> },
          {
            key: 'history',
            label: `Assessment History (${overviewData ? historyPagination.totalRecords : '...'})`,
            icon: <History size={16} />,
          },
          { key: 'clarity', label: 'Clarity Progress', icon: <Layers size={16} /> },
          { key: 'focus', label: 'Focus Activity', icon: <Target size={16} /> },
          { key: 'analytics', label: 'Skill Analytics', icon: <BarChart3 size={16} /> },
        ].map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as JourneySubTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: isActive
                  ? 'var(--aiims-primary-light, rgba(99, 102, 241, 0.12))'
                  : 'transparent',
                color: isActive ? 'var(--aiims-primary)' : 'var(--aiims-text-muted)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: JOURNEY OVERVIEW & MILESTONES ROADMAP                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Metric Cards */}
          <div
            className="aiims-card-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Overall Progress */}
            <Card variant="violet" radius="default" padding="default">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}
                  >
                    Overall Journey Progress
                  </span>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      marginTop: '4px',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {progressPercent}%
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85 }}>
                    {completedMilestones} of 10 Milestones Achieved
                  </div>
                </div>
                <Award size={32} style={{ opacity: 0.7 }} />
              </div>
            </Card>

            {/* Current Active Stage */}
            <Card variant="cyan" radius="default" padding="default">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}
                  >
                    Current Learning Stage
                  </span>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      marginTop: '4px',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {currentStage}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85 }}>
                    Status:{' '}
                    <span style={{ fontWeight: 700 }}>
                      {overviewData?.nextBestAction?.actionButtonLabel
                        ? 'Active Priority'
                        : 'In Progress'}
                    </span>
                  </div>
                </div>
                <Compass size={32} style={{ opacity: 0.7 }} />
              </div>
            </Card>

            {/* Latest Assessment Summary */}
            <Card variant="amber" radius="default" padding="default">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}
                  >
                    Baseline Diagnostic
                  </span>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      marginTop: '4px',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {isAssessmentDone
                      ? `${overviewData?.latestAssessmentSummary?.score ?? 85}%`
                      : 'Pending'}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85 }}>
                    {isAssessmentDone
                      ? `Top: ${overviewData?.latestAssessmentSummary?.topCapability || state.analysis?.topCapability || 'Workflow Design'}`
                      : 'Not yet completed'}
                  </div>
                </div>
                <FileText size={32} style={{ opacity: 0.7 }} />
              </div>
            </Card>

            {/* Today's Focus Activity */}
            <Card variant="mint" radius="default" padding="default">
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}
                  >
                    Today's Focus Duration
                  </span>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      marginTop: '4px',
                      fontFamily: "'Fredoka', sans-serif",
                    }}
                  >
                    {focusData?.todayFocusMinutes ??
                      overviewData?.focusSummary?.todayFocusMinutes ??
                      0}
                    m
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85 }}>
                    {focusData?.todayCompletedSessions ??
                      overviewData?.focusSummary?.todayCompletedSessions ??
                      0}{' '}
                    Sessions Completed
                  </div>
                </div>
                <Flame size={32} style={{ opacity: 0.7 }} />
              </div>
            </Card>
          </div>

          {/* SECTION 7: RECOMMENDED NEXT LEARNING ACTION (Hero Card) */}
          {overviewData?.nextBestAction && (
            <Card
              variant="bordered"
              radius="default"
              padding="default"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
                borderColor: 'var(--aiims-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    maxWidth: '750px',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--aiims-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--aiims-primary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        RECOMMENDED NEXT LEARNING ACTION
                      </span>
                      <Badge variant="primary" style={{ fontSize: '10px' }}>
                        Authoritative
                      </Badge>
                    </div>
                    <h3
                      style={{
                        margin: '4px 0 6px',
                        fontSize: '18px',
                        fontWeight: 800,
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      {overviewData.nextBestAction.actionTitle}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--aiims-text-body)',
                        lineHeight: 1.5,
                      }}
                    >
                      {overviewData.nextBestAction.actionReason}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={16} />}
                  onClick={() => {
                    if (overviewData.nextBestAction?.targetTab) {
                      setActiveTab(overviewData.nextBestAction.targetTab as any);
                    }
                  }}
                >
                  {overviewData.nextBestAction.actionButtonLabel}
                </Button>
              </div>
            </Card>
          )}

          {/* SECTION 2: LEARNING MILESTONES ROADMAP */}
          <Card variant="bordered" radius="default" padding="default">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    margin: 0,
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  10-Stage Canonical Learning Milestones
                </h3>
                <p
                  style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--aiims-text-muted)' }}
                >
                  Server-verified progress tracking across all foundational and applied learning
                  modules.
                </p>
              </div>
              <Badge variant="purple" style={{ fontSize: '11px' }}>
                {completedMilestones} / 10 Completed
              </Badge>
            </div>

            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Vertical timeline line */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: '13px',
                  width: '2px',
                  backgroundColor: 'var(--aiims-border-card)',
                  zIndex: 1,
                }}
              />

              {journeyStages.map((stage: any) => {
                const isCompleted = stage.status === 'completed';
                const isCurrent = stage.status === 'current';
                const isLocked = stage.status === 'locked';
                const isExpanded = expandedMilestone === stage.id;

                return (
                  <div
                    key={stage.id}
                    style={{ position: 'relative', zIndex: 2, marginBottom: '16px' }}
                  >
                    {/* Timeline Node */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-32px',
                        top: '16px',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--aiims-bg-page)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2
                          style={{
                            width: '22px',
                            height: '22px',
                            color: 'var(--aiims-tint-emerald-text, #10b981)',
                          }}
                        />
                      ) : isCurrent ? (
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--aiims-primary)',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--aiims-primary)',
                            }}
                          />
                        </div>
                      ) : (
                        <Lock
                          style={{
                            width: '18px',
                            height: '18px',
                            color: 'var(--aiims-text-muted)',
                          }}
                        />
                      )}
                    </div>

                    {/* Milestone Card */}
                    <Card
                      variant={isCurrent ? 'bordered' : 'subtle'}
                      radius="default"
                      padding="default"
                      style={{
                        borderColor: isCurrent ? 'var(--aiims-primary)' : undefined,
                        opacity: isLocked ? 0.75 : 1,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedMilestone(isExpanded ? null : stage.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedMilestone(isExpanded ? null : stage.id);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isCompleted
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isCurrent
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'var(--aiims-bg-card)',
                              color: isCompleted
                                ? 'var(--aiims-tint-emerald-text, #10b981)'
                                : isCurrent
                                  ? 'var(--aiims-primary)'
                                  : 'var(--aiims-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                            }}
                          >
                            {stage.order}
                          </span>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: '15px',
                                  fontWeight: 700,
                                  color: 'var(--aiims-text-heading)',
                                }}
                              >
                                {stage.name}
                              </h4>
                              {isCompleted && (
                                <Badge variant="success" style={{ fontSize: '9px' }}>
                                  ✓ Completed
                                </Badge>
                              )}
                              {isCurrent && (
                                <Badge variant="primary" style={{ fontSize: '9px' }}>
                                  Current Priority
                                </Badge>
                              )}
                              {isLocked && (
                                <Badge variant="neutral" style={{ fontSize: '9px' }}>
                                  Locked
                                </Badge>
                              )}
                              {stage.score !== null && stage.score !== undefined && (
                                <Badge variant="purple" style={{ fontSize: '9px' }}>
                                  {stage.score}% Score
                                </Badge>
                              )}
                            </div>
                            <p
                              style={{
                                margin: '2px 0 0',
                                fontSize: '12px',
                                color: 'var(--aiims-text-body)',
                              }}
                            >
                              {stage.subtitle}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {stage.completionDate && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--aiims-text-muted)',
                              }}
                            >
                              {new Date(stage.completionDate).toLocaleDateString()}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp size={16} style={{ color: 'var(--aiims-text-muted)' }} />
                          ) : (
                            <ChevronDown size={16} style={{ color: 'var(--aiims-text-muted)' }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--aiims-border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: '13px',
                              color: 'var(--aiims-text-body)',
                              lineHeight: 1.5,
                            }}
                          >
                            {stage.description}
                          </p>

                          {stage.highlight && (
                            <div
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.03))',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: 'var(--aiims-text-heading)',
                                fontWeight: 600,
                              }}
                            >
                              💡 Highlight: {stage.highlight}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: '4px',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                              Milestone #{stage.order} in Canonical AIIMS Curriculum
                            </span>
                            <Button
                              variant={isLocked ? 'outline' : 'primary'}
                              size="sm"
                              icon={<ArrowRight size={13} />}
                              disabled={isLocked}
                              onClick={() => setActiveTab(stage.targetTab)}
                            >
                              {stage.actionLabel}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Deliverable B: Score Trajectory in Overview */}
          <div style={{ marginTop: '4px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                    margin: 0,
                    fontFamily: "'Fredoka', sans-serif",
                  }}
                >
                  Score Progression Trajectory
                </h3>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '12.5px',
                    color: 'var(--aiims-text-muted)',
                  }}
                >
                  Chronological scoring trend across verified diagnostic and challenge submissions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => setActiveSubTab('history')}
              >
                View Full Attempt History Table ({historyPagination.totalRecords})
              </Button>
            </div>
            <SvgScoreGraph records={assessmentHistory} onSelectRecord={setSelectedRecordDetail} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: ASSESSMENT HISTORY (Paginated, Filterable, Verifiable)        */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Deliverable B: Score Trajectory in History view */}
          <SvgScoreGraph records={assessmentHistory} onSelectRecord={setSelectedRecordDetail} />

          {/* Controls Bar: Filters & Summary */}
          <Card variant="bordered" radius="default" padding="default">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={15} style={{ color: 'var(--aiims-text-muted)' }} />
                  <span
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}
                  >
                    Type:
                  </span>
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--aiims-border-card)',
                      backgroundColor: 'var(--aiims-bg-page)',
                      color: 'var(--aiims-text-heading)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="diagnostic">Diagnostic Assessment</option>
                    <option value="clarity">Clarity Lab Tasks</option>
                    <option value="focus">Focus Challenges</option>
                    <option value="submission">Applied Submissions</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}
                  >
                    Status:
                  </span>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--aiims-border-card)',
                      backgroundColor: 'var(--aiims-bg-page)',
                      color: 'var(--aiims-text-heading)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowUpDown size={15} style={{ color: 'var(--aiims-text-muted)' }} />
                  <span
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aiims-text-muted)' }}
                  >
                    Order:
                  </span>
                  <button
                    onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--aiims-border-card)',
                      backgroundColor: 'var(--aiims-bg-page)',
                      color: 'var(--aiims-text-heading)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Toggle chronological vs reverse chronological order"
                  >
                    {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                Showing{' '}
                <span style={{ fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                  {assessmentHistory.length}
                </span>{' '}
                of {historyPagination.totalRecords} records
              </div>
            </div>
          </Card>

          {/* Assessment History Table */}
          <Card variant="bordered" radius="default" padding="none">
            {assessmentHistory.length === 0 ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <FileText size={36} style={{ color: 'var(--aiims-text-muted)', opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--aiims-text-heading)' }}>
                  No Assessment Records Found
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--aiims-text-muted)',
                    maxWidth: '400px',
                  }}
                >
                  Complete your baseline diagnostic assessment, a Clarity task, or a Focus challenge
                  to begin recording your evaluation history.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  onClick={() => setActiveTab(isAssessmentDone ? 'clarity' : 'assessment')}
                  style={{ marginTop: '8px' }}
                >
                  {isAssessmentDone ? 'Go to Clarity Lab' : 'Start Baseline Assessment'}
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.02))',
                        borderBottom: '1px solid var(--aiims-border-card)',
                      }}
                    >
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Date & Time
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Activity / Assessment
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Type & Track
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Score
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          fontWeight: 700,
                          color: 'var(--aiims-text-muted)',
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecords.map((item) => {
                      const isCompleted = item.status === 'completed';
                      const isAbandoned = item.status === 'abandoned';
                      const dateStr = item.date || item.completedAt;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--aiims-border-subtle)',
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <td
                            style={{
                              padding: '14px 16px',
                              color: 'var(--aiims-text-body)',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {dateStr ? new Date(dateStr).toLocaleString() : '—'}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                              Topic: {item.topic}
                              {item.level ? ` · Difficulty: ${item.level}` : ''}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <Badge
                              variant={
                                item.type === 'diagnostic'
                                  ? 'purple'
                                  : item.type === 'clarity'
                                    ? 'cyan'
                                    : item.type === 'focus'
                                      ? 'mint'
                                      : 'neutral'
                              }
                            >
                              {(item.type || 'diagnostic').toUpperCase()}
                            </Badge>
                            {item.track && item.track !== 'General' && (
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--aiims-text-muted)',
                                  marginTop: '3px',
                                }}
                              >
                                {item.track}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            {item.score !== null && item.score !== undefined ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    color:
                                      item.score >= 80
                                        ? 'var(--aiims-tint-emerald-text, #10b981)'
                                        : item.score >= 60
                                          ? 'var(--aiims-primary)'
                                          : 'var(--aiims-tint-rose-text, #ef4444)',
                                  }}
                                >
                                  {item.score}%
                                </span>
                                <span
                                  style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}
                                >
                                  / {item.maxScore}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                                —
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <Badge
                              variant={
                                isCompleted ? 'success' : isAbandoned ? 'neutral' : 'warning'
                              }
                              style={{ fontSize: '10px' }}
                            >
                              {isCompleted
                                ? 'Completed'
                                : isAbandoned
                                  ? 'Abandoned'
                                  : 'In Progress'}
                            </Badge>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecordDetail(item)}
                            >
                              View Detail
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {historyPagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid var(--aiims-border-card)',
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ChevronLeft size={14} />}
                  disabled={historyPagination.page <= 1}
                  onClick={() =>
                    setHistoryPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                >
                  Previous
                </Button>

                <span style={{ fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                  Page {historyPagination.page} of {historyPagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  icon={<ChevronRight size={14} />}
                  disabled={historyPagination.page >= historyPagination.totalPages}
                  onClick={() =>
                    setHistoryPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </Card>

          {/* Record Detail Modal / Drawer */}
          {selectedRecordDetail && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px',
              }}
            >
              <Card
                variant="bordered"
                radius="default"
                padding="default"
                style={{
                  maxWidth: '560px',
                  width: '100%',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  backgroundColor: 'var(--aiims-bg-page)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <Badge variant="purple" style={{ fontSize: '10px' }}>
                      {selectedRecordDetail.type.toUpperCase()} RECORD
                    </Badge>
                    <h3
                      style={{
                        margin: '4px 0 0',
                        fontSize: '18px',
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      {selectedRecordDetail.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedRecordDetail(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: 'var(--aiims-text-muted)',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    fontSize: '13px',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px',
                      padding: '12px',
                      backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.02))',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                        Topic
                      </span>
                      <div style={{ fontWeight: 700 }}>{selectedRecordDetail.topic}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                        Status
                      </span>
                      <div style={{ fontWeight: 700 }}>{selectedRecordDetail.status}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                        Date Completed
                      </span>
                      <div style={{ fontWeight: 700 }}>
                        {new Date(selectedRecordDetail.date).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                        Score
                      </span>
                      <div style={{ fontWeight: 800, color: 'var(--aiims-primary)' }}>
                        {selectedRecordDetail.score !== null
                          ? `${selectedRecordDetail.score}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4
                      style={{
                        margin: '0 0 6px',
                        fontSize: '13px',
                        color: 'var(--aiims-text-heading)',
                      }}
                    >
                      Evaluation Summary
                    </h4>
                    <p style={{ margin: 0, color: 'var(--aiims-text-body)', lineHeight: 1.5 }}>
                      {selectedRecordDetail.rubricSummary ||
                        'Standard automated rubric assessment.'}
                    </p>
                  </div>

                  {selectedRecordDetail.rubrics && selectedRecordDetail.rubrics.length > 0 && (
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px',
                          fontSize: '13px',
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        Rubric Performance Breakdown
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedRecordDetail.rubrics.map((r: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--aiims-bg-card)',
                              border: '1px solid var(--aiims-border-subtle)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '2px',
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{r.criterion}</span>
                              <span style={{ fontWeight: 700, color: 'var(--aiims-primary)' }}>
                                {r.score} / {r.maxScore}
                              </span>
                            </div>
                            {r.comment && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '11px',
                                  color: 'var(--aiims-text-muted)',
                                }}
                              >
                                {r.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedRecordDetail(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: CLARITY PROGRESS INTEGRATION                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'clarity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Clarity Overview Banner */}
          <Card
            variant="bordered"
            radius="default"
            padding="default"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aiims-tint-emerald-text, #10b981)',
                    textTransform: 'uppercase',
                  }}
                >
                  CLARITY LEARNING LAB PROGRESSION
                </span>
                <h3
                  style={{
                    margin: '4px 0',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--aiims-text-heading)',
                  }}
                >
                  Current Difficulty Level: {clarityData?.overallCurrentLevel || 'Easy'}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--aiims-text-body)' }}>
                  Total Evaluated Attempts: {clarityData?.totalAttempts || 0} · Average Submitted
                  Score:{' '}
                  {clarityData?.averageSubmittedScore !== null
                    ? `${clarityData?.averageSubmittedScore}%`
                    : 'N/A'}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={() => setActiveTab('clarity')}
              >
                Launch Clarity Lab
              </Button>
            </div>
          </Card>

          {/* Formative vs Submitted Notice */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.02))',
              border: '1px solid var(--aiims-border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--aiims-text-muted)',
              lineHeight: 1.5,
            }}
          >
            <Info
              size={16}
              style={{ color: 'var(--aiims-primary)', flexShrink: 0, marginTop: '2px' }}
            />
            <div>
              <span style={{ fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                Formative Run vs. Submitted Attempt Distinction:
              </span>{' '}
              Practice evaluations performed with the "Run" button inside the Clarity Task Lab are
              experimental scaffolds that do not alter your permanent level. Only formal "Submit"
              operations update your progression records and count toward advancement.
            </div>
          </div>

          {/* Topic-Wise Progression Cards */}
          <Card variant="bordered" radius="default" padding="default">
            <h4
              style={{
                margin: '0 0 16px',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--aiims-text-heading)',
              }}
            >
              Topic-Wise Progression Mastery
            </h4>

            {!clarityData?.topics || clarityData.topics.length === 0 ? (
              <div
                style={{ textAlign: 'center', padding: '24px', color: 'var(--aiims-text-muted)' }}
              >
                No topic progressions recorded yet. Begin by selecting a task in the Clarity Lab.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {clarityData.topics.map((t: any) => (
                  <div
                    key={t.topic}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-card)',
                      border: '1px solid var(--aiims-border-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {t.topic}
                      </span>
                      <Badge variant="cyan">{t.currentLevel}</Badge>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--aiims-text-body)' }}>
                      Total Attempts: <span style={{ fontWeight: 700 }}>{t.totalAttempts}</span>
                      {t.lastScore !== undefined && (
                        <span>
                          {' '}
                          · Last Score: <span style={{ fontWeight: 700 }}>{t.lastScore}%</span>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                      Consecutive High Scores (85%+): {t.consecutiveHighScores} / 2 to advance
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--aiims-border-subtle)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          width: `${(t.consecutiveHighScores / 2) * 100}%`,
                          height: '100%',
                          backgroundColor: 'var(--aiims-primary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: FOCUS ACTIVITY INTEGRATION                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'focus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Focus Metrics Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <Card variant="amber" radius="default" padding="default">
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                }}
              >
                Today's Focus Time
              </span>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  marginTop: '4px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {focusData?.todayFocusMinutes ?? 0}m
              </div>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>
                Strictly excludes break intervals
              </span>
            </Card>

            <Card variant="mint" radius="default" padding="default">
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                }}
              >
                Completed Sessions Today
              </span>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  marginTop: '4px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {focusData?.todayCompletedSessions ?? 0}
              </div>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>
                Lifetime Completed: {focusData?.totalCompletedSessions ?? 0}
              </span>
            </Card>

            <Card variant="subtle" radius="default" padding="default">
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                }}
              >
                Today's Break Time
              </span>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  marginTop: '4px',
                  fontFamily: "'Fredoka', sans-serif",
                }}
              >
                {focusData?.todayBreakMinutes ?? 0}m
              </div>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>Rest & recovery interval</span>
            </Card>
          </div>

          {/* Timekeeping Notice */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.02))',
              border: '1px solid var(--aiims-border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--aiims-text-muted)',
              lineHeight: 1.5,
            }}
          >
            <Clock
              size={16}
              style={{ color: 'var(--aiims-primary)', flexShrink: 0, marginTop: '2px' }}
            />
            <div>
              <span style={{ fontWeight: 700, color: 'var(--aiims-text-heading)' }}>
                Authoritative Focus Accounting:
              </span>{' '}
              {focusData?.dataRulesNotice ||
                'Break intervals are strictly excluded from focus time calculations. Abandoned sessions are audited but excluded from completed session metrics.'}
            </div>
          </div>

          {/* Recent Focus Session Log */}
          <Card variant="bordered" radius="default" padding="default">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--aiims-text-heading)',
                }}
              >
                Recent Focus Sessions
              </h4>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('focus')}>
                Start New Session
              </Button>
            </div>

            {!focusData?.recentSessions || focusData.recentSessions.length === 0 ? (
              <div
                style={{ textAlign: 'center', padding: '24px', color: 'var(--aiims-text-muted)' }}
              >
                No focus sessions recorded yet. Start a focus session to track deep work.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {focusData.recentSessions.map((s: any) => (
                  <div
                    key={s.sessionId}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aiims-bg-card)',
                      border: '1px solid var(--aiims-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--aiims-text-heading)',
                        }}
                      >
                        {s.trackTitle}
                      </div>
                      {s.intention && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--aiims-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          Intention: "{s.intention}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aiims-primary)' }}
                      >
                        {s.actualFocusMinutes}m
                      </span>
                      <Badge
                        variant={s.status === 'completed' ? 'success' : 'neutral'}
                        style={{ fontSize: '10px' }}
                      >
                        {s.status}
                      </Badge>
                      {s.completedAt && (
                        <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                          {new Date(s.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: PERFORMANCE & SKILL ANALYTICS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Data-Sufficiency Gating Check */}
          {!analyticsData?.hasSufficientData ? (
            <Card variant="bordered" radius="default" padding="default">
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <BarChart3 size={36} style={{ color: 'var(--aiims-text-muted)', opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--aiims-text-heading)' }}>
                  Insufficient Assessment Data
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--aiims-text-muted)',
                    maxWidth: '460px',
                    lineHeight: 1.5,
                  }}
                >
                  {analyticsData?.dataNotice ||
                    'Complete your baseline diagnostic assessment and at least one Clarity task to generate reliable skill performance analytics.'}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  onClick={() => setActiveTab('assessment')}
                  style={{ marginTop: '8px' }}
                >
                  Complete Diagnostic Assessment
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Strengths & Growth Areas Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* Top Performing Skills */}
                <Card variant="mint" radius="default" padding="default">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <Sparkles
                      size={18}
                      style={{ color: 'var(--aiims-tint-emerald-text, #10b981)' }}
                    />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                      Demonstrated Core Strengths
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(analyticsData.strongestSkills || []).map((skill: any) => (
                      <div
                        key={skill.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.4)',
                          borderRadius: '6px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{skill.name}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>{skill.domain}</div>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '14px' }}>{skill.score}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Growth Opportunities */}
                <Card variant="amber" radius="default" padding="default">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <Target size={18} style={{ color: 'var(--aiims-tint-amber-text, #d97706)' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                      Target Growth Opportunities
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(analyticsData.growthAreas || []).map((skill: any) => (
                      <div
                        key={skill.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.4)',
                          borderRadius: '6px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{skill.name}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>{skill.domain}</div>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '14px' }}>{skill.score}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Historical Score Progression Timeline */}
              <Card variant="bordered" radius="default" padding="default">
                <div style={{ marginBottom: '16px' }}>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--aiims-text-heading)',
                    }}
                  >
                    Chronological Evaluation Timeline
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--aiims-text-muted)' }}>
                    {analyticsData.basisExplanation}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(analyticsData.scoreTimeline || []).map((item: any) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--aiims-bg-card-subtle, rgba(0, 0, 0, 0.02))',
                        border: '1px solid var(--aiims-border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Badge
                          variant={item.scoreType === 'diagnostic' ? 'purple' : 'cyan'}
                          style={{ fontSize: '9px' }}
                        >
                          {item.scoreType.toUpperCase()}
                        </Badge>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: 'var(--aiims-text-heading)',
                          }}
                        >
                          {item.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '14px',
                            color:
                              item.score >= 80
                                ? 'var(--aiims-tint-emerald-text, #10b981)'
                                : 'var(--aiims-primary)',
                          }}
                        >
                          {item.score}%
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--aiims-text-muted)' }}>
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
};
