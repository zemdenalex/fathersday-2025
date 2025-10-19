const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export interface Settings {
  ticker_text: string;
  scroll_speed: number;
  scroll_direction: 'left' | 'right';
  tile_base_vw: number;
  glyph_scale: number;
  fps_target: number;
  za_words: string[];
  rotate_in_ms: number;
  dwell_ms: number;
  color_palette: string[];
  auto_quality: boolean;
  min_fps: number;
}

export interface Photo {
  id: number;
  filename: string;
  width: number;
  height: number;
  avg_color_r: number;
  avg_color_g: number;
  avg_color_b: number;
  luma: number;
  saturation: number;
  created_at: string;
}

export interface AtlasData {
  tiles: Array<{
    id: number;
    filename: string;
    x: number;
    y: number;
    width: number;
    height: number;
    avgColor: { r: number; g: number; b: number };
    luma: number;
    saturation: number;
  }>;
  width: number;
  height: number;
  tileSize: number;
}

/**
 * Fetch settings from API
 */
export async function fetchSettings(): Promise<Settings> {
  const response = await fetch(`${API_BASE}/settings`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  
  const data = await response.json();
  return data.settings;
}

/**
 * Update settings (admin only)
 */
export async function updateSettings(
  settings: Partial<Settings>,
  token: string
): Promise<Settings> {
  const response = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update settings');
  }
  
  const data = await response.json();
  return data.settings;
}

/**
 * Fetch photos list
 */
export async function fetchPhotos(): Promise<Photo[]> {
  const response = await fetch(`${API_BASE}/photos`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch photos');
  }
  
  const data = await response.json();
  return data.photos;
}

/**
 * Fetch atlas data
 */
export async function fetchAtlasData(): Promise<AtlasData> {
  const response = await fetch(`${API_BASE}/atlas`);
  
  if (!response.ok) {
    throw new Error('Atlas not found. Please build it in admin panel.');
  }
  
  await response.json();
  
  // Fetch the actual JSON data
  const atlasJsonResponse = await fetch('/atlas/atlas.json');
  
  if (!atlasJsonResponse.ok) {
    throw new Error('Failed to fetch atlas JSON');
  }
  
  return await atlasJsonResponse.json();
}

/**
 * Login to admin panel
 */
export async function login(password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Logout from admin panel
 */
export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });
}

/**
 * Upload photos (admin only)
 */
export async function uploadPhotos(
  files: File[],
  token: string,
  onProgress?: (progress: number) => void
): Promise<any> {
  const formData = new FormData();
  
  for (const file of files) {
    formData.append('photos', file);
  }
  
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Upload failed'));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    xhr.open('POST', `${API_BASE}/admin/photos/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Rebuild atlas (admin only)
 */
export async function rebuildAtlas(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/atlas/rebuild`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rebuild atlas');
  }
}

/**
 * Reindex photos (admin only)
 */
export async function reindexPhotos(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/photos/reindex`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reindex photos');
  }
}

export default {
  fetchSettings,
  updateSettings,
  fetchPhotos,
  fetchAtlasData,
  login,
  logout,
  uploadPhotos,
  rebuildAtlas,
  reindexPhotos,
};