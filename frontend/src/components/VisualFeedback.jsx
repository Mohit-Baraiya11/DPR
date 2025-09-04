import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

// Toast notification component
export const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-4 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`border rounded-lg shadow-lg p-4 ${getStyles()}`}>
        <div className="flex items-start">
          {getIcon()}
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Loading overlay component
export const LoadingOverlay = ({ message = 'Loading...', isVisible = false }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-3" />
          <p className="text-gray-700 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Ripple effect component for touch feedback
export const RippleEffect = ({ children, onClick, className = '' }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute bg-white bg-opacity-30 rounded-full pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
};

// Pulse animation for important elements
export const PulseAnimation = ({ children, isActive = false, className = '' }) => {
  return (
    <div
      className={`transition-all duration-200 ${
        isActive ? 'animate-pulse scale-105' : 'scale-100'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Shake animation for errors
export const ShakeAnimation = ({ children, shouldShake = false, className = '' }) => {
  return (
    <div
      className={`transition-all duration-200 ${
        shouldShake ? 'animate-bounce' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Progress bar component
export const ProgressBar = ({ progress = 0, message = '', className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {message && (
        <p className="text-sm text-gray-600 mb-2">{message}</p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Floating action button with haptic feedback
export const FloatingActionButton = ({ 
  icon: Icon, 
  onClick, 
  className = '', 
  size = 'md',
  variant = 'primary',
  disabled = false 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-10 w-10';
      case 'lg':
        return 'h-14 w-14';
      default:
        return 'h-12 w-12';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'warning':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'error':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const handleClick = (e) => {
    if (!disabled) {
      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onClick?.(e);
    }
  };

  return (
    <RippleEffect>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          ${getSizeClasses()} 
          ${getVariantClasses()} 
          rounded-full shadow-lg hover:shadow-xl 
          transition-all duration-200 
          flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <Icon className="h-5 w-5" />
      </button>
    </RippleEffect>
  );
};

// Toast manager hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { showToast, removeToast, ToastContainer };
};

export default {
  Toast,
  LoadingOverlay,
  RippleEffect,
  PulseAnimation,
  ShakeAnimation,
  ProgressBar,
  FloatingActionButton,
  useToast
};
