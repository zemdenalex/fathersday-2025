import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Photo, fetchPhotos } from '../lib/api';

interface GalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Gallery({ isOpen, onClose }: GalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const data = await fetchPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setImageLoaded(false);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setImageLoaded(false);
  };

  const goToPrevious = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length);
      setImageLoaded(false);
    }
  }, [selectedIndex, photos.length]);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length);
      setImageLoaded(false);
    }
  }, [selectedIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, goToPrevious, goToNext]);

  const getPhotoUrl = (photo: Photo, size: number = 1024) => {
    const filename = photo.filename.replace(/\.[^/.]+$/, '');
    return `/uploads/${filename}_${size}.webp`;
  };

  const downloadPhoto = (photo: Photo) => {
    const url = getPhotoUrl(photo, 1024);
    const link = document.createElement('a');
    link.href = url;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Галерея</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-2"
            aria-label="Close gallery"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="h-full overflow-y-auto pt-20 pb-8 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="gallery-grid max-w-7xl mx-auto">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={getPhotoUrl(photo, 512)}
                  alt={photo.filename}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          ref={lightboxRef}
          className="lightbox-overlay"
          onClick={closeLightbox}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Loading spinner */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="spinner"></div>
              </div>
            )}

            {/* Image */}
            <img
              src={getPhotoUrl(photos[selectedIndex], 1024)}
              alt={photos[selectedIndex].filename}
              className={`lightbox-image transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setImageLoaded(true)}
            />

            {/* Navigation buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-4 bg-black/50 rounded-full"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-4 bg-black/50 rounded-full"
              aria-label="Next image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadPhoto(photos[selectedIndex]);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-4 bg-black/50 rounded-full"
              aria-label="Download image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
              {selectedIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
