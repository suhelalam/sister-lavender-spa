'use client';

import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg relative text-sm text-gray-700 max-h-[80vh] flex flex-col">
        {/* Close button fixed at top right */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-lg z-10"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Scrollable content container */}
        <div className="overflow-y-auto pt-8 px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
