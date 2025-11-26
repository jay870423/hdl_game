import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, ArrowUpCircle } from 'lucide-react';
import { InputState } from '../types';

interface MobileControlsProps {
  inputState: React.MutableRefObject<InputState>;
}

const MobileControls: React.FC<MobileControlsProps> = ({ inputState }) => {

  const handleTouchStart = (key: keyof InputState, e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling/zooming
    inputState.current[key] = true;
  };

  const handleTouchEnd = (key: keyof InputState, e: React.TouchEvent) => {
    e.preventDefault();
    inputState.current[key] = false;
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 px-4 pb-safe flex justify-between select-none z-50 pointer-events-none">
      {/* D-Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-2 w-48 h-48">
        <div />
        <button
          className="bg-white/10 active:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm border-2 border-white/20"
          onTouchStart={(e) => handleTouchStart('up', e)}
          onTouchEnd={(e) => handleTouchEnd('up', e)}
        >
          <ArrowUp className="text-white w-8 h-8" />
        </button>
        <div />

        <button
          className="bg-white/10 active:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm border-2 border-white/20"
          onTouchStart={(e) => handleTouchStart('left', e)}
          onTouchEnd={(e) => handleTouchEnd('left', e)}
        >
          <ArrowLeft className="text-white w-8 h-8" />
        </button>
        
        {/* Empty center or Crouch */}
        <button
          className="bg-white/10 active:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm border-2 border-white/20"
          onTouchStart={(e) => handleTouchStart('down', e)}
          onTouchEnd={(e) => handleTouchEnd('down', e)}
        >
          <ArrowDown className="text-white w-8 h-8" />
        </button>

        <button
          className="bg-white/10 active:bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm border-2 border-white/20"
          onTouchStart={(e) => handleTouchStart('right', e)}
          onTouchEnd={(e) => handleTouchEnd('right', e)}
        >
          <ArrowRight className="text-white w-8 h-8" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="pointer-events-auto flex gap-6 items-end pb-4">
        <button
          className="w-20 h-20 bg-red-500/50 active:bg-red-500/80 rounded-full flex flex-col items-center justify-center border-4 border-red-400 backdrop-blur-sm"
          onTouchStart={(e) => handleTouchStart('fire', e)}
          onTouchEnd={(e) => handleTouchEnd('fire', e)}
        >
          <Crosshair className="text-white w-8 h-8" />
          <span className="text-[10px] text-white font-bold mt-1">FIRE</span>
        </button>

        <button
          className="w-20 h-20 bg-blue-500/50 active:bg-blue-500/80 rounded-full flex flex-col items-center justify-center border-4 border-blue-400 backdrop-blur-sm"
          onTouchStart={(e) => handleTouchStart('jump', e)}
          onTouchEnd={(e) => handleTouchEnd('jump', e)}
        >
          <ArrowUpCircle className="text-white w-8 h-8" />
          <span className="text-[10px] text-white font-bold mt-1">JUMP</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
