import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Photo,
  fetchSettings,
  fetchPhotos,
  updateSettings,
  uploadPhotos,
  rebuildAtlas,
  reindexPhotos,
  logout,
} from '../lib/api';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [tickerText, setTickerText] = useState('');
  const [scrollSpeed, setScrollSpeed] = useState(120);
  const [tileBaseVw, setTileBaseVw] = useState(2);
  const [glyphScale, setGlyphScale] = useState(1.5);
  const [zaWords, setZaWords] = useState('');
  const [rotateInMs, setRotateInMs] = useState(800);
  const [dwellMs, setDwellMs] = useState(1500);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, photosData] = await Promise.all([
        fetchSettings(),
        fetchPhotos(),
      ]);

      setPhotos(photosData);

      // Populate form
      setTickerText(settingsData.ticker_text);
      setScrollSpeed(settingsData.scroll_speed);
      setTileBaseVw(settingsData.tile_base_vw);
      setGlyphScale(settingsData.glyph_scale);
      setZaWords(settingsData.za_words.join('\n'));
      setRotateInMs(settingsData.rotate_in_ms);
      setDwellMs(settingsData.dwell_ms);
    } catch (error) {
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveSettings = async () => {
    try {
      const updates: Partial<Settings> = {
        ticker_text: tickerText,
        scroll_speed: scrollSpeed,
        tile_base_vw: tileBaseVw,
        glyph_scale: glyphScale,
        za_words: zaWords.split('\n').filter(w => w.trim()),
        rotate_in_ms: rotateInMs,
        dwell_ms: dwellMs,
      };

      await updateSettings(updates, token);
      showMessage('success', 'Settings saved successfully');
      loadData();
    } catch (error) {
      showMessage('error', 'Failed to save settings');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploadProgress(0);
      const fileArray = Array.from(files);

      await uploadPhotos(fileArray, token, (progress) => {
        setUploadProgress(progress);
      });

      showMessage('success', `Uploaded ${fileArray.length} photos successfully`);
      setUploadProgress(0);
      loadData();
    } catch (error) {
      showMessage('error', 'Upload failed');
      setUploadProgress(0);
    }
  };

  const handleRebuildAtlas = async () => {
    try {
      await rebuildAtlas(token);
      showMessage('success', 'Atlas rebuilt successfully');
    } catch (error) {
      showMessage('error', 'Failed to rebuild atlas');
    }
  };

  const handleReindexPhotos = async () => {
    try {
      await reindexPhotos(token);
      showMessage('success', 'Photos reindexed successfully');
      loadData();
    } catch (error) {
      showMessage('error', 'Failed to reindex photos');
    }
  };

  const handleLogout = async () => {
    try {
      await logout(token);
      localStorage.removeItem('admin_token');
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      onLogout();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-panel border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">{photos.length} photos • Atlas ready</p>
          </div>
          <div className="flex gap-4">
            <a href="/" className="btn btn-secondary">
              View Site
            </a>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/20 border border-green-500 text-green-400'
                : 'bg-red-900/20 border border-red-500 text-red-400'
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      <div className="admin-panel">
        {/* Ticker Settings */}
        <div className="admin-section">
          <h3>Ticker Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ticker Text
              </label>
              <input
                type="text"
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                className="input"
                placeholder="ПАПА СПАСИБО"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scroll Speed (px/s)
                </label>
                <input
                  type="number"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="input"
                  min="10"
                  max="500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tile Base Size (vw %)
                </label>
                <input
                  type="number"
                  value={tileBaseVw}
                  onChange={(e) => setTileBaseVw(Number(e.target.value))}
                  className="input"
                  min="0.5"
                  max="10"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Glyph Scale
                </label>
                <input
                  type="number"
                  value={glyphScale}
                  onChange={(e) => setGlyphScale(Number(e.target.value))}
                  className="input"
                  min="0.5"
                  max="3"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ZA Rotator Settings */}
        <div className="admin-section">
          <h3>ЗА ... Rotator</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Words (one per line)
              </label>
              <textarea
                value={zaWords}
                onChange={(e) => setZaWords(e.target.value)}
                className="textarea"
                rows={8}
                placeholder="ЛЮБОВЬ&#10;ЗАБОТУ&#10;МУДРОСТЬ"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transition Duration (ms)
                </label>
                <input
                  type="number"
                  value={rotateInMs}
                  onChange={(e) => setRotateInMs(Number(e.target.value))}
                  className="input"
                  min="100"
                  max="3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dwell Time (ms)
                </label>
                <input
                  type="number"
                  value={dwellMs}
                  onChange={(e) => setDwellMs(Number(e.target.value))}
                  className="input"
                  min="500"
                  max="5000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end mb-6">
          <button onClick={handleSaveSettings} className="btn btn-primary">
            Save Settings
          </button>
        </div>

        {/* Photo Upload */}
        <div className="admin-section">
          <h3>Upload Photos</h3>
          <div
            className="dropzone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-white mb-2">Drag & drop photos here</p>
            <p className="text-gray-400 text-sm">or click to browse</p>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {uploadProgress > 0 && (
            <div className="mt-4">
              <div className="w-full bg-dark-panel rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-gray-400 text-sm mt-2">
                Uploading: {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Atlas Management */}
        <div className="admin-section">
          <h3>Atlas Management</h3>
          <div className="flex gap-4">
            <button onClick={handleRebuildAtlas} className="btn btn-primary">
              Rebuild Atlas
            </button>
            <button onClick={handleReindexPhotos} className="btn btn-secondary">
              Reindex Photos
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Rebuild the atlas after uploading new photos to include them in the ticker.
            Reindex scans the photos directory for new files.
          </p>
        </div>

        {/* Photo List */}
        <div className="admin-section">
          <h3>Uploaded Photos ({photos.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {photos.slice(0, 24).map((photo) => (
              <div key={photo.id} className="relative aspect-square group">
                <img
                  src={`/uploads/${photo.filename.replace(/\.[^/.]+$/, '')}_256.webp`}
                  alt={photo.filename}
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <p className="text-white text-xs text-center px-2 break-all">
                    {photo.filename}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {photos.length > 24 && (
            <p className="text-gray-400 text-sm mt-4">
              Showing 24 of {photos.length} photos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}