import React, { useEffect, useRef, useState } from 'react';
import { PixiTicker, PixiTickerConfig } from '../lib/pixiTicker';

interface TickerCanvasProps {
  config: Omit<PixiTickerConfig, 'onFpsUpdate' | 'onReady'>;
  showFps?: boolean;
}

export default function TickerCanvas({ config, showFps = false }: TickerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickerRef = useRef<PixiTicker | null>(null);
  const [fps, setFps] = useState(60);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let ticker: PixiTicker | null = null;

    const initTicker = async () => {
      try {
        ticker = new PixiTicker({
          ...config,
          onFpsUpdate: setFps,
          onReady: () => setIsReady(true),
        });

        await ticker.init(canvas);
        tickerRef.current = ticker;
      } catch (err) {
        console.error('Failed to initialize ticker:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize ticker');
      }
    };

    initTicker();

    return () => {
      if (ticker) {
        ticker.destroy();
      }
      tickerRef.current = null;
    };
  }, []); // Only init once

  // Update config when it changes
  useEffect(() => {
    if (tickerRef.current && isReady) {
      tickerRef.current.updateConfig(config);
    }
  }, [config, isReady]);

  // Toggle FPS display with 'F' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        setFpsVisible((prev) => !prev);
      }
    };

    if (showFps) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [showFps]);

  const [fpsVisible, setFpsVisible] = useState(false);

  const getFpsClass = () => {
    if (fps >= 50) return '';
    if (fps >= 24) return 'warning';
    return 'error';
  };

  if (error) {
    return (
      <div className="ticker-canvas-container flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ошибка загрузки</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ticker-canvas-container relative">
      <canvas ref={canvasRef} />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-white text-lg">Загрузка...</p>
          </div>
        </div>
      )}

      {showFps && fpsVisible && (
        <div className={`fps-monitor ${getFpsClass()}`}>
          FPS: {Math.round(fps)}
        </div>
      )}
    </div>
  );
}
