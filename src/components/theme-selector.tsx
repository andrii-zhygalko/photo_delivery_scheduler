'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  value: string;
  onChange: (theme: string) => void;
  disabled?: boolean;
}

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeSelector({ value, onChange, disabled }: ThemeSelectorProps) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (newTheme: string) => {
    setTheme(newTheme); // Update next-themes (localStorage + DOM class)
    onChange(newTheme); // Update form state for database sync
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentValue: string) => {
    const currentIndex = themeOptions.findIndex((o) => o.value === currentValue);

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : themeOptions.length - 1;
        handleChange(themeOptions[prevIndex].value);
        break;
      }
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < themeOptions.length - 1 ? currentIndex + 1 : 0;
        handleChange(themeOptions[nextIndex].value);
        break;
      }
    }
  };

  // Show skeleton during SSR
  if (!mounted) {
    return (
      <div className="flex gap-2" role="radiogroup" aria-label="Theme selection">
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="flex-1 h-10 rounded-md border bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-2"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => handleChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, value)}
            className={cn(
              // Base styles
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border',
              'transition-all duration-200',
              // Focus styles
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              // Hover styles
              'hover:bg-accent hover:text-accent-foreground',
              // Selected state
              isSelected && [
                'bg-primary text-primary-foreground border-primary',
                'shadow-sm',
              ],
              // Unselected state
              !isSelected && 'bg-background',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
