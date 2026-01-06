import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameState, InputState, MissionData } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import MobileControls from './components/MobileControls';
import { generateMissionData } from './services/geminiService';
import { audio } from './services/audioService';
import { Gamepad2, Skull, Trophy, Play, Loader2, ArrowRight, Volume2, VolumeX, Smartphone } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [finalScore, setFinalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [ignoreOrientation, setIgnoreOrientation] = useState(false);
  
  const inputState = useRef<InputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    fire: false,
  });

  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>(0);

  // --- Orientation Check ---
  useEffect(() => {
    const checkOrientation = () => {
      const isLand = window.innerWidth >= window.innerHeight;
      setIsLandscape(isLand);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': inputState.current.left = true; break;
        case 'KeyD': case 'ArrowRight': inputState.current.right = true; break;
        case 'KeyW': case 'ArrowUp': inputState.current.up = true; break;
        case 'KeyS': case 'ArrowDown': inputState.current.down = true; break;
        case 'Space': case 'KeyK': inputState.current.jump = true; break;
        case 'KeyJ': case 'Enter': inputState.current.fire = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': inputState.current.left = false; break;
        case 'KeyD': case 'ArrowRight': inputState.current.right = false; break;
        case 'KeyW': case 'ArrowUp': inputState.current.up = false; break;
        case 'KeyS': case 'ArrowDown': inputState.current.down = false; break;
        case 'Space': case 'KeyK': inputState.current.jump = false; break;
        case 'KeyJ': case 'Enter': inputState.current.fire = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Game Loop ---
  const loop = () => {
    // Safety check: if game is meant to be playing but engine is missing, stop.
    if (!engineRef.current && gameState === GameState.PLAYING) return;

    try {
      if (engineRef.current && gameState === GameState.PLAYING) {
        engineRef.current.update();
        engineRef.current.draw();

        if (engineRef.current.isGameOver) {
          setFinalScore(engineRef.current.score);
          setGameState(GameState.GAME_OVER);
        } else if (engineRef.current.isVictory) {
          setFinalScore(engineRef.current.score + (currentLevel * 1000)); 
          
          if (currentLevel >= 8) { // Updated to 8 levels
               setGameState(GameState.GAME_COMPLETE);
          } else {
               setGameState(GameState.VICTORY);
          }
        }
      }
    } catch (error) {
      console.error("Game loop crashed:", error);
      // Fallback to avoid stuck screen
      setGameState(GameState.GAME_OVER);
    }
    
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, currentLevel]);

  // --- Game Lifecycle ---
  const startNewGame = async () => {
    audio.init();
    audio.resume();
    setCurrentLevel(1);
    loadLevel(1);
  };

  const nextLevel = async () => {
    const next = currentLevel + 1;
    setCurrentLevel(next);
    loadLevel(next);
  };

  const restartLevel = async () => {
    audio.resume();
    loadLevel(currentLevel);
  };

  const loadLevel = (level: number) => {
    setGameState(GameState.LOADING);
    setMission(null); // Clear previous mission
    
    // Non-blocking AI call: Do NOT await here.
    generateMissionData(level).then((data) => {
      setMission(data);
    });

    // Short artificial delay for smooth UI transition (800ms)
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          
          if (engineRef.current) engineRef.current.stop();
  
          engineRef.current = new GameEngine(ctx, inputState.current, level);
          if (level > 1) engineRef.current.score = finalScore; 
          
          setGameState(GameState.PLAYING);
        }
      }
    }, 800);
  };
  
  const toggleMute = () => {
      const muted = audio.toggleMute();
      setIsMuted(muted);
  };

  if (!isLandscape && window.innerWidth < 768 && !ignoreOrientation) {
     return (
       <div className="w-full h-[100dvh] bg-black flex flex-col items-center justify-center text-white p-8 text-center font-['Press_Start_2P']">
          <Smartphone className="w-16 h-16 mb-4 animate-pulse text-yellow-400 rotate-90" />
          <h2 className="text-xl text-yellow-400 mb-4">ROTATE DEVICE</h2>
          <p className="text-xs leading-loose text-gray-400 mb-8">
            Gen-Force Neural Ops requires landscape mode for optimal tactical awareness.
          </p>
          <button 
             onClick={() => setIgnoreOrientation(true)}
             className="px-4 py-2 bg-gray-800 rounded text-[10px] text-gray-400 hover:bg-gray-700 border border-gray-700"
          >
             PLAY IN PORTRAIT ANYWAY
          </button>
       </div>
     );
  }

  return (
    <div className="w-full h-[100dvh] bg-black flex items-center justify-center overflow-hidden relative font-['Press_Start_2P']">
      
      <div className="relative shadow-2xl border-0 md:border-4 border-gray-800 md:rounded-lg overflow-hidden w-full h-full md:h-auto md:w-auto md:max-w-[800px] md:aspect-video flex items-center justify-center bg-[#0f172a]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
          style={{ imageRendering: 'pixelated' }}
        />
        
        <div className="hidden md:block absolute inset-0 pointer-events-none bg-[url('https://raw.githubusercontent.com/zlatkov/scanlines/master/scanlines.png')] opacity-10 mix-blend-overlay"></div>
        
        <button 
            onClick={toggleMute}
            className="absolute top-4 right-4 z-50 text-white/50 hover:text-white p-2"
        >
            {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
      </div>

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 z-20">
            <h1 className="text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 font-black mb-8 leading-tight drop-shadow-[4px_4px_0_rgba(185,28,28,0.8)]">
                GEN-FORCE<br/>NEURAL OPS
            </h1>
            <button 
                onClick={startNewGame}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg uppercase tracking-widest transition-all transform hover:scale-105"
            >
                <div className="flex items-center gap-3">
                    <Play className="w-6 h-6 fill-current" />
                    <span>Deploy</span>
                </div>
            </button>
            <p className="mt-8 text-gray-400 text-[10px] md:text-xs font-sans">
                PC: WASD/Arrows to Move • J/Z to Fire • K/Space to Jump
            </p>
        </div>
      )}

      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white z-20">
            <Loader2 className="w-16 h-16 animate-spin text-green-500 mb-4" />
            <h2 className="text-green-500 text-lg animate-pulse">DECODING LEVEL {currentLevel}...</h2>
        </div>
      )}

      {gameState === GameState.PLAYING && mission && (
        <div className="absolute top-2 left-0 right-0 text-center pointer-events-none animate-[fadeOut_5s_forwards] z-10 flex flex-col items-center">
             <div className="bg-black/70 p-4 border-2 border-green-500 rounded text-center mx-4 backdrop-blur-sm">
                <h3 className="text-yellow-400 text-sm md:text-lg uppercase mb-2">{mission.title}</h3>
                <p className="text-white text-[10px] max-w-md font-sans hidden md:block">{mission.briefing}</p>
                <p className="text-red-500 text-[10px] mt-2 font-bold">TARGET: {mission.bossName}</p>
             </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-center text-white z-20">
            <Skull className="w-20 h-20 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold mb-2">M.I.A.</h2>
            <p className="text-sm mb-8 font-sans">Wait for reinforcements?</p>
            <div className="flex gap-4">
                <button 
                    onClick={restartLevel}
                    className="px-6 py-3 bg-white text-red-900 font-bold hover:bg-gray-200 uppercase text-sm"
                >
                    Retry Level
                </button>
                <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="px-6 py-3 border-2 border-white text-white font-bold hover:bg-white/10 uppercase text-sm"
                >
                    Abort
                </button>
            </div>
        </div>
      )}

      {gameState === GameState.VICTORY && (
        <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center text-center text-white z-20">
            <Trophy className="w-20 h-20 mb-4 text-yellow-400 animate-pulse" />
            <h2 className="text-3xl font-bold mb-2 text-yellow-400">AREA SECURED</h2>
            <p className="mb-8 font-sans text-sm opacity-80">Proceed to next sector.</p>
            
            <button 
                onClick={nextLevel}
                className="group px-8 py-4 bg-yellow-400 text-green-900 font-bold hover:bg-yellow-300 transition-colors uppercase flex items-center gap-2"
            >
                <span>Level {currentLevel + 1}</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
      )}

    {gameState === GameState.GAME_COMPLETE && (
        <div className="absolute inset-0 bg-blue-900/95 flex flex-col items-center justify-center text-center text-white z-20 p-8">
            <Gamepad2 className="w-24 h-24 mb-6 text-yellow-400" />
            <h1 className="text-3xl md:text-5xl font-black mb-4 text-yellow-400">CONGRATULATIONS</h1>
            <p className="text-sm md:text-lg mb-8 max-w-lg leading-relaxed font-sans">
                You have defeated the Alien Heart and saved the world.
            </p>
            <p className="text-xl md:text-2xl mb-8 font-mono border-2 border-yellow-400 px-6 py-3 rounded bg-black/30">
                FINAL SCORE: {finalScore}
            </p>
            <button 
                onClick={() => setGameState(GameState.MENU)}
                className="px-8 py-4 bg-white text-blue-900 font-bold hover:bg-gray-200 transition-colors uppercase"
            >
                Main Menu
            </button>
        </div>
      )}

      {gameState === GameState.PLAYING && (
        <MobileControls inputState={inputState} />
      )}

      <style>{`
        @keyframes fadeOut {
            0% { opacity: 1; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}