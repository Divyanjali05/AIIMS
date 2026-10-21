import React, { useRef, useEffect } from 'react';
import { Brain } from 'lucide-react';

interface Hero2DFallbackProps {
  onExploreClick?: () => void;
  prefersReducedMotion?: boolean;
}

export const Hero2DFallback: React.FC<Hero2DFallbackProps> = ({
  onExploreClick,
  prefersReducedMotion = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1));
    let height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    };
    window.addEventListener('resize', handleResize);

    const nodeCount = 24;
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = ['#8B5CF6', '#22D3EE', '#6366F1', '#A855F7'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        color: colors[i % colors.length],
        alpha: Math.random() * 0.5 + 0.3
      });
    }

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial glowing background
      const ambientGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        width * 0.48
      );
      ambientGrad.addColorStop(0, 'rgba(139, 92, 246, 0.16)');
      ambientGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.08)');
      ambientGrad.addColorStop(1, 'rgba(8, 11, 22, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        angle += 0.008;
      }

      ctx.save();
      ctx.translate(width * 0.5, height * 0.5);

      // Orbit 1: Violet Ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.36, height * 0.22, angle * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.stroke();

      // Orbit 2: Cyan Counter-Orbit
      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.42, height * 0.26, -angle * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      // Connect nodes with energy lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = width * 0.24;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.25;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw particle nodes
      for (const node of nodes) {
        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          borderRadius: '24px'
        }}
      />
      {/* 2D Neural Core Object */}
      <div
        style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #22D3EE 0%, #8B5CF6 55%, #1E1B4B 100%)',
          boxShadow: '0 0 50px rgba(139, 92, 246, 0.55), 0 0 90px rgba(34, 211, 238, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onExploreClick ? 'pointer' : 'default',
          zIndex: 2
        }}
        onClick={onExploreClick}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(139, 92, 246, 0.3) 70%, transparent 100%)',
            filter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Brain size={44} color="#080B16" />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '-12px',
            backgroundColor: '#080B16',
            border: '1px solid #22D3EE',
            borderRadius: '9999px',
            padding: '3px 10px',
            fontSize: '10px',
            fontWeight: 800,
            color: '#22D3EE',
            letterSpacing: '0.8px',
            boxShadow: '0 4px 12px rgba(34, 211, 238, 0.3)',
            textTransform: 'uppercase'
          }}
        >
          AINOVA CORE
        </div>
      </div>
    </div>
  );
};
