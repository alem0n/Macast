import React, { useEffect, useState, useCallback, useRef } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, visible, duration = 4000, onClose }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      setExiting(false);
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setRendered(false);
          onClose();
        }, 300);
      }, duration);
    } else {
      setExiting(true);
      setTimeout(() => setRendered(false), 300);
    }

    return () => clearTimeout(timerRef.current);
  }, [visible, duration, onClose]);

  const handleClick = useCallback(() => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => {
      setRendered(false);
      onClose();
    }, 300);
  }, [onClose]);

  if (!rendered && !visible) return null;

  return (
    <div
      className={`toast ${exiting ? 'toast-exit' : ''}`}
      onClick={handleClick}
      role="alert"
    >
      {message}
    </div>
  );
};

export default React.memo(Toast);
