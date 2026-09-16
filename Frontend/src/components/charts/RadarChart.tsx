import React from 'react';
import { DimensionScore } from '../../types';

interface RadarChartProps {
  scores: DimensionScore[];
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ scores, size = 320 }) => {
  const center = size / 2;
  const radius = center - 50;
  const numAxes = scores.length;
  const angleStep = (Math.PI * 2) / numAxes;

  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const scorePolygonPoints = scores
    .map((d, i) => {
      const { x, y } = getCoordinates(d.score, i);
      return `${x},${y}`;
    })
    .join(' ');

  const benchmarkPolygonPoints = scores
    .map((d, i) => {
      const { x, y } = getCoordinates(d.benchmark, i);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Background Grid Circles */}
        {levels.map((level, idx) => (
          <circle
            key={idx}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray={idx < 3 ? '4,4' : 'none'}
          />
        ))}

        {/* Axes Lines and Labels */}
        {scores.map((d, i) => {
          const { x, y } = getCoordinates(100, i);
          const labelCoords = getCoordinates(118, i);

          return (
            <g key={i}>
              <line
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x={labelCoords.x}
                y={labelCoords.y}
                fill="#475569"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {d.dimension}
              </text>
            </g>
          );
        })}

        {/* Benchmark Polygon */}
        <polygon
          points={benchmarkPolygonPoints}
          fill="rgba(124, 58, 237, 0.12)"
          stroke="#7c3aed"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />

        {/* Score Polygon */}
        <polygon
          points={scorePolygonPoints}
          fill="rgba(79, 70, 229, 0.25)"
          stroke="#4f46e5"
          strokeWidth="2.5"
        />

        {/* Score Points */}
        {scores.map((d, i) => {
          const { x, y } = getCoordinates(d.score, i);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#4f46e5' }}></span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Learner Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px dashed #7c3aed', backgroundColor: 'rgba(124, 58, 237, 0.15)' }}></span>
          <span style={{ color: '#475569', fontWeight: 600 }}>Peer Benchmark</span>
        </div>
      </div>
    </div>
  );
};
