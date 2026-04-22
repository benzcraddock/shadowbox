'use client';

import type { MovementType } from '@/lib/types/database';
import type { FormQuality } from '@/lib/types/detection';

interface DefenseArrowProps {
  type: MovementType;
  quality: FormQuality;
}

const COLORS: Record<FormQuality, string> = {
  good: '#4ADE80',
  acceptable: '#FACC15',
  needs_correction: '#EF4444',
};

const ROTATIONS: Record<MovementType, number> = {
  slip_left: 180,
  slip_right: 0,
  duck: 90,
  pull_back: 0,
};

export default function DefenseArrow({ type, quality }: DefenseArrowProps) {
  const color = COLORS[quality];

  if (type === 'pull_back') {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-[defense-flash_1.2s_ease-out_forwards]">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="46" stroke={color} strokeWidth="6" fill="none" />
          <circle cx="60" cy="60" r="28" stroke={color} strokeWidth="4" fill="none" />
          <circle cx="60" cy="60" r="10" fill={color} />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-[defense-flash_1.2s_ease-out_forwards]">
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ transform: `rotate(${ROTATIONS[type]}deg)` }}
      >
        <path
          d="M20 70 L100 70 M80 40 L110 70 L80 100"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
