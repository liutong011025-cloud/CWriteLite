'use client';

import { useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
}

export default function Aurora(props: AuroraProps) {
  const { colorStops = ['#5227FF', '#7cff67', '#5227FF'], amplitude = 1.0 } = props;
  const ctnDom = useRef<HTMLDivElement>(null);

  // 使用CSS渐变创建简化的Aurora效果，增强可见性
  const gradientStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colorStops[0]} 0%, ${colorStops[1]} 50%, ${colorStops[2]} 100%)`,
    backgroundSize: '200% 200%',
    animation: 'aurora-flow 10s ease-in-out infinite',
    opacity: 0.4 * amplitude,
    mixBlendMode: 'screen',
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aurora-flow {
          0%, 100% {
            background-position: 0% 0%;
            opacity: 0.3;
          }
          25% {
            background-position: 100% 0%;
            opacity: 0.5;
          }
          50% {
            background-position: 100% 100%;
            opacity: 0.4;
          }
          75% {
            background-position: 0% 100%;
            opacity: 0.5;
          }
        }
      ` }} />
      <div 
        ref={ctnDom} 
        className="w-full h-full relative overflow-hidden"
      >
        <div 
          className="absolute inset-0"
          style={gradientStyle}
        />
        {/* 添加额外的光效层 */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${colorStops[1]}40 0%, transparent 70%)`,
            animation: 'aurora-pulse 4s ease-in-out infinite',
          }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aurora-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
      ` }} />
    </>
  );
}
