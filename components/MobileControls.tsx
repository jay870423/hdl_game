
import React, { useRef, useState } from 'react';
import { Crosshair, ArrowUp, Bomb } from 'lucide-react';
import { InputState } from '../types';
import { audio } from '../services/audioService';

interface MobileControlsProps {
  inputState: React.MutableRefObject<InputState>;
}

const MobileControls: React.FC<MobileControlsProps> = ({ inputState }) => {
  const dPadRef = useRef<HTMLDivElement>(null);
  const [activeDirection, setActiveDirection] = useState<{ x: number, y: number } | null>(null);

  const activateAudio = () => {
    // Ensure audio context is running on first touch interaction
    audio.resume();
  };

  // --- D-Pad Logic ---
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!dPadRef.current) return;
    const rect = dPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Increased threshold for better center deadzone
    const threshold = 10; 
    
    const newInputs = {
      left: dx < -threshold,
      right: dx > threshold,
      up: dy < -threshold, 
      down: dy > threshold
    };

    inputState.current.left = newInputs.left;
    inputState.current.right = newInputs.right;
    inputState.current.up = newInputs.up;
    inputState.current.down = newInputs.down;

    let x = 0; 
    if (newInputs.left) x = -1;
    if (newInputs.right) x = 1;
    let y = 0;
    if (newInputs.up) y = -1;
    if (newInputs.down) y = 1;
    
    setActiveDirection(x === 0 && y === 0 ? null : { x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); 
    activateAudio();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    inputState.current.left = false;
    inputState.current.right = false;
    inputState.current.up = false;
    inputState.current.down = false;
    setActiveDirection(null);
  };

  const handleBtnStart = (key: 'jump' | 'fire' | 'bomb', e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activateAudio();
    inputState.current[key] = true;
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleBtnEnd = (key: 'jump' | 'fire' | 'bomb', e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputState.current[key] = false;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-between px-6 pb-8 lg:hidden select-none">
      
      {/* High Contrast Virtual Joystick - Improved Visibility */}
      <div 
        ref={dPadRef}
        className="pointer-events-auto w-48 h-48 relative flex items-center justify-center rounded-full touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dark Background Base for Contrast on White/Snow Levels */}
        <div className="absolute inset-2 bg-black/80 border-[6px] border-white/60 rounded-full backdrop-blur-md shadow-2xl"></div>
        
        {/* Directional Guides */}
        <div className="absolute w-full h-1 bg-white/20" />
        <div className="absolute h-full w-1 bg-white/20" />
        
        {/* Decorative Arrows */}
        <div className="absolute top-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-white/50"></div>
        <div className="absolute bottom-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-white/50"></div>
        <div className="absolute left-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-white/50"></div>
        <div className="absolute right-4 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-white/50"></div>

        {/* Stick / Active Indicator */}
        <div 
          className={`absolute w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg border-4 border-white transition-transform duration-75 ease-out ${activeDirection ? 'scale-110 shadow-orange-500/50' : 'scale-100'}`}
          style={{ 
            transform: activeDirection 
              ? `translate(${activeDirection.x * 55}px, ${activeDirection.y * 55}px)`
              : 'translate(0, 0)',
            opacity: 1
          }}
        >
            <div className="w-full h-full flex items-center justify-center">
               <div className="w-6 h-6 bg-white/40 rounded-full blur-[1px]" />
            </div>
        </div>
      </div>

      {/* Action Buttons - Larger & High Contrast with Backgrounds */}
      <div className="pointer-events-auto flex gap-6 items-end pb-2 pr-4">
        {/* Bomb Button (Skill) */}
        <button
          className="group relative w-16 h-16 rounded-full flex flex-col items-center justify-center touch-none active:scale-95 transition-transform mb-24"
          onTouchStart={(e) => handleBtnStart('bomb', e)}
          onTouchEnd={(e) => handleBtnEnd('bomb', e)}
        >
          <div className="absolute -inset-2 bg-black/60 rounded-full -z-10 blur-sm"></div>
          
          <div className="absolute inset-0 bg-gray-600 rounded-full shadow-[0_6px_0_rgb(55,65,81)] group-active:translate-y-2 group-active:shadow-none transition-all border-[3px] border-white/80"></div>
          <Bomb className="relative text-white w-8 h-8 drop-shadow-md" />
          <span className="relative text-[8px] text-white font-black mt-1 tracking-widest drop-shadow-lg">BOMB</span>
        </button>

        {/* Fire Button (B) */}
        <button
          className="group relative w-24 h-24 rounded-full flex flex-col items-center justify-center touch-none active:scale-95 transition-transform"
          onTouchStart={(e) => handleBtnStart('fire', e)}
          onTouchEnd={(e) => handleBtnEnd('fire', e)}
        >
          {/* Dark backing for visibility */}
          <div className="absolute -inset-2 bg-black/60 rounded-full -z-10 blur-sm"></div>
          
          <div className="absolute inset-0 bg-red-600 rounded-full shadow-[0_6px_0_rgb(153,27,27)] group-active:translate-y-2 group-active:shadow-none transition-all border-[3px] border-white/80"></div>
          <Crosshair className="relative text-white w-10 h-10 drop-shadow-md" />
          <span className="relative text-[10px] text-white font-black mt-1 tracking-widest drop-shadow-lg">FIRE</span>
        </button>

        {/* Jump Button (A) */}
        <button
          className="group relative w-24 h-24 rounded-full flex flex-col items-center justify-center touch-none active:scale-95 transition-transform mb-12"
          onTouchStart={(e) => handleBtnStart('jump', e)}
          onTouchEnd={(e) => handleBtnEnd('jump', e)}
        >
          <div className="absolute -inset-2 bg-black/60 rounded-full -z-10 blur-sm"></div>
          
          <div className="absolute inset-0 bg-blue-600 rounded-full shadow-[0_6px_0_rgb(30,64,175)] group-active:translate-y-2 group-active:shadow-none transition-all border-[3px] border-white/80"></div>
          <ArrowUp className="relative text-white w-10 h-10 drop-shadow-md" />
          <span className="relative text-[10px] text-white font-black mt-1 tracking-widest drop-shadow-lg">JUMP</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
