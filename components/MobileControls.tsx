import React, { useRef, useState } from 'react';
import { Crosshair, ArrowUpCircle } from 'lucide-react';
import { InputState } from '../types';

interface MobileControlsProps {
  inputState: React.MutableRefObject<InputState>;
}

const MobileControls: React.FC<MobileControlsProps> = ({ inputState }) => {
  const dPadRef = useRef<HTMLDivElement>(null);
  const [activeDirection, setActiveDirection] = useState<{ x: number, y: number } | null>(null);

  // --- D-Pad Logic ---
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!dPadRef.current) return;
    const rect = dPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Determine input based on vector
    // Threshold for activation
    const threshold = 10; 
    
    const newInputs = {
      left: dx < -threshold,
      right: dx > threshold,
      up: dy < -threshold, // Screen coordinates: up is negative Y
      down: dy > threshold
    };

    // Update global state
    inputState.current.left = newInputs.left;
    inputState.current.right = newInputs.right;
    inputState.current.up = newInputs.up;
    inputState.current.down = newInputs.down;

    // Visual feedback
    let x = 0; 
    if (newInputs.left) x = -1;
    if (newInputs.right) x = 1;
    let y = 0;
    if (newInputs.up) y = -1;
    if (newInputs.down) y = 1;
    setActiveDirection({ x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); 
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    // Reset inputs
    inputState.current.left = false;
    inputState.current.right = false;
    inputState.current.up = false;
    inputState.current.down = false;
    setActiveDirection(null);
  };

  // --- Button Logic ---

  const handleBtnStart = (key: 'jump' | 'fire', e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputState.current[key] = true;
  };

  const handleBtnEnd = (key: 'jump' | 'fire', e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputState.current[key] = false;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-between px-6 pb-8 lg:hidden">
      
      {/* Virtual D-Pad Zone */}
      <div 
        ref={dPadRef}
        className="pointer-events-auto w-40 h-40 relative flex items-center justify-center bg-white/5 rounded-full backdrop-blur-[2px] border-2 border-white/10 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Visual Center */}
        <div className="absolute w-12 h-12 bg-white/20 rounded-full" />
        
        {/* Visual Direction Indicator */}
        {activeDirection && (
          <div 
            className="absolute w-10 h-10 bg-white/50 rounded-full transition-transform duration-75"
            style={{ 
              transform: `translate(${activeDirection.x * 40}px, ${activeDirection.y * 40}px)`
            }}
          />
        )}
        
        {/* Decorators */}
        <div className="absolute top-2 text-white/30 text-[10px]">UP</div>
        <div className="absolute bottom-2 text-white/30 text-[10px]">DOWN</div>
        <div className="absolute left-2 text-white/30 text-[10px]">LEFT</div>
        <div className="absolute right-2 text-white/30 text-[10px]">RIGHT</div>
      </div>

      {/* Action Buttons */}
      <div className="pointer-events-auto flex gap-6 items-end">
        {/* Fire Button (B) */}
        <button
          className="group w-20 h-20 bg-red-600/60 active:bg-red-500 rounded-full flex flex-col items-center justify-center border-4 border-red-400 backdrop-blur-sm shadow-lg active:scale-95 transition-transform touch-none"
          onTouchStart={(e) => handleBtnStart('fire', e)}
          onTouchEnd={(e) => handleBtnEnd('fire', e)}
        >
          <Crosshair className="text-white w-8 h-8 opacity-80 group-active:opacity-100" />
          <span className="text-[10px] text-white font-bold mt-1 opacity-80">FIRE</span>
        </button>

        {/* Jump Button (A) */}
        <button
          className="group w-20 h-20 bg-blue-600/60 active:bg-blue-500 rounded-full flex flex-col items-center justify-center border-4 border-blue-400 backdrop-blur-sm shadow-lg active:scale-95 transition-transform touch-none"
          onTouchStart={(e) => handleBtnStart('jump', e)}
          onTouchEnd={(e) => handleBtnEnd('jump', e)}
        >
          <ArrowUpCircle className="text-white w-8 h-8 opacity-80 group-active:opacity-100" />
          <span className="text-[10px] text-white font-bold mt-1 opacity-80">JUMP</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;