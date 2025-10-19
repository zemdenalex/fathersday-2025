import { useState, useEffect, useRef } from 'react';
import { getNextColor } from '../lib/colors';

interface ZaRotatorProps {
  words: string[];
  colorPalette: string[];
  rotateInMs?: number;
  dwellMs?: number;
}

export default function ZaRotator({
  words,
  colorPalette,
  rotateInMs = 800,
  dwellMs = 1500,
}: ZaRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const timeoutRef = useRef<number>();

  useEffect(() => {
    const cycle = () => {
      // Slide out
      setDirection('out');
      setIsAnimating(true);

      setTimeout(() => {
        // Update to next word
        setCurrentIndex((prev) => (prev + 1) % words.length);
        const { nextIndex } = getNextColor(colorPalette, colorIndex);
        setColorIndex(nextIndex);

        // Slide in
        setDirection('in');

        setTimeout(() => {
          setIsAnimating(false);

          // Schedule next cycle
          timeoutRef.current = setTimeout(cycle, dwellMs);
        }, rotateInMs);
      }, rotateInMs);
    };

    // Start first cycle
    timeoutRef.current = setTimeout(cycle, dwellMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [words, colorPalette, colorIndex, rotateInMs, dwellMs]);

  const currentWord = words[currentIndex] || '';
  const currentColor = colorPalette[colorIndex] || '#FFFFFF';

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationClass = prefersReducedMotion
    ? ''
    : isAnimating
    ? direction === 'out'
      ? 'animate-slide-up-out'
      : 'animate-slide-up-in'
    : '';

  return (
    <div className="relative w-full py-8 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center text-4xl md:text-6xl lg:text-7xl font-display">
          <span className="text-white mr-4">ЗА</span>
          <div className="relative h-[1.2em] flex items-center">
            <span
              key={`${currentIndex}-${colorIndex}`}
              className={`inline-block ${animationClass}`}
              style={{ color: currentColor }}
            >
              {currentWord}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}