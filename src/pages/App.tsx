import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import TickerCanvas from '../components/TickerCanvas';
import ZaRotator from '../components/ZaRotator';
import Gallery from '../components/Gallery';
import FloatingGalleryButton from '../components/FloatingGalleryButton';
import AdminGate from '../components/AdminGate';
import AdminPanel from '../components/AdminPanel';
import { Settings, fetchSettings } from '../lib/api';

type Route = 'home' | 'admin';

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    // Determine route from URL
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setRoute('admin');
      // Check for existing token
      const savedToken = localStorage.getItem('admin_token');
      if (savedToken) {
        setAdminToken(savedToken);
      }
    } else {
      setRoute('home');
    }

    // Load settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuthenticated = (token: string) => {
    setAdminToken(token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    window.location.href = '/';
  };

  // Admin route
  if (route === 'admin') {
    if (!adminToken) {
      return <AdminGate onAuthenticated={handleAdminAuthenticated} />;
    }

    return <AdminPanel token={adminToken} onLogout={handleAdminLogout} />;
  }

  // Home route
  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-white text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout showVignette>
      {/* Ticker Section */}
      <TickerCanvas
        config={{
          text: settings.ticker_text,
          scrollSpeed: settings.scroll_speed,
          scrollDirection: settings.scroll_direction,
          tileBaseVw: settings.tile_base_vw,
          glyphScale: settings.glyph_scale,
          fpsTarget: settings.fps_target,
          autoQuality: settings.auto_quality,
          minFps: settings.min_fps,
        }}
        //showFps={import.meta.env.DEV}
      />

      {/* ZA Rotator Section */}
      <ZaRotator
        words={settings.za_words}
        colorPalette={settings.color_palette}
        rotateInMs={settings.rotate_in_ms}
        dwellMs={settings.dwell_ms}
      />

      {/* Floating Gallery Button */}
      <FloatingGalleryButton onClick={() => setGalleryOpen(true)} />

      {/* Gallery Modal */}
      <Gallery isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </Layout>
  );
}
