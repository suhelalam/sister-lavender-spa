'use client';

import { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousActiveElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;

    // Move focus into the modal so keyboard users can interact with it immediately.
    if (dialogRef.current) {
      dialogRef.current.focus();
    }

    document.body.style.overflow = 'hidden';

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousBodyOverflow;

      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-white w-full max-w-sm rounded-lg shadow-lg relative text-sm text-gray-700 max-h-[80vh] flex flex-col focus:outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Close button fixed at top right */}
        <button
          type="button"
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
