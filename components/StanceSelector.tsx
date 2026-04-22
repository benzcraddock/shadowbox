'use client';

import { useState } from 'react';
import type { Stance } from '@/lib/types/database';

interface StanceSelectorProps {
  onSelect: (stance: Stance) => Promise<void> | void;
  initialStance?: Stance | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}

const OPTIONS: Array<{
  value: Stance;
  title: string;
  hint: string;
  description: string;
}> = [
  {
    value: 'orthodox',
    title: 'Orthodox',
    hint: 'Right-handed',
    description: 'Left hand forward (jab), right hand back (cross).',
  },
  {
    value: 'southpaw',
    title: 'Southpaw',
    hint: 'Left-handed',
    description: 'Right hand forward (jab), left hand back (cross).',
  },
];

export default function StanceSelector({
  onSelect,
  initialStance = null,
  title = 'Choose your stance',
  subtitle = "We need to know your lead hand so we can tell a jab from a cross.",
  submitLabel = 'Continue',
}: StanceSelectorProps) {
  const [choice, setChoice] = useState<Stance | null>(initialStance);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!choice) return;
    setSaving(true);
    setError(null);
    try {
      await onSelect(choice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save stance');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-[12px] p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{title}</h2>
        <p className="text-text-secondary mb-6">{subtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {OPTIONS.map((opt) => {
            const selected = choice === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setChoice(opt.value)}
                aria-pressed={selected}
                className={
                  'text-left p-5 rounded-[8px] border transition-all ' +
                  (selected
                    ? 'border-text-primary bg-bg-elevated'
                    : 'border-border-subtle bg-bg-primary hover:border-text-secondary')
                }
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-lg font-semibold text-text-primary">
                    {opt.title}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-text-secondary">
                    {opt.hint}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-accent-negative mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            You can change this later in settings.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!choice || saving}
            className="px-6 py-3 bg-text-primary text-bg-primary rounded-[8px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-text-secondary transition-all"
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
