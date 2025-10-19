interface FloatingGalleryButtonProps {
  onClick: () => void;
}

export default function FloatingGalleryButton({ onClick }: FloatingGalleryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 bg-white text-dark-bg px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
      aria-label="Open gallery"
    >
      <svg
        className="w-6 h-6 inline-block mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      Галерея
    </button>
  );
}
