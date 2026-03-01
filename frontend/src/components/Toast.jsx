import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

/**
 * Toast notification — góc phải trên, tự biến mất sau 3s
 */
export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const icons = {
    success: <CheckCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />,
    error: <XCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />,
    info: <Info className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />,
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-slide-in flex items-center ${colors[type] || colors.info}`}>
      {icons[type] || icons.info}{message}
    </div>
  );
}
