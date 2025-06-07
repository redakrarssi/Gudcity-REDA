import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  count?: number;
  duration?: number;
}

/**
 * A reusable confetti animation component
 */
export const Confetti: React.FC<ConfettiProps> = ({
  active,
  count = 50,
  duration = 3000
}) => {
  const [isVisible, setIsVisible] = useState(active);
  
  useEffect(() => {
    if (active) {
      setIsVisible(true);
      
      // Play a celebration sound
      playSound();
      
      // Hide confetti after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [active, duration]);
  
  const playSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3');
      audio.volume = 0.6;
      audio.play();
    } catch (error) {
      console.error('Error playing celebration sound:', error);
    }
  };
  
  if (!isVisible) return null;
  
  const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
  
  return (
    <div className="confetti-container" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const animationDuration = 1 + Math.random() * 2;
        const animationDelay = Math.random() * 0.5;
        const colorIndex = Math.floor(Math.random() * colors.length);
        
        return (
          <div
            key={i}
            className={`confetti confetti-${colors[colorIndex]} animate-confetti`}
            style={{
              left: `${left}%`,
              top: '-10px',
              animationDuration: `${animationDuration}s`,
              animationDelay: `${animationDelay}s`
            }}
          />
        );
      })}
    </div>
  );
};

export default Confetti; 