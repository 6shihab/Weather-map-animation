import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Activity, Maximize, Minimize } from 'lucide-react';

export default function MapAnimator() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(300); // ms per frame
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch image list from backend
  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        // Keep up to last 600
        const latestImages = data.images.slice(-600);
        
        setImages(prev => {
          if (prev.length !== latestImages.length || prev[prev.length - 1] !== latestImages[latestImages.length - 1]) {
            return latestImages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchImages();
    const interval = setInterval(fetchImages, 60000);
    return () => clearInterval(interval);
  }, []);

  // Preload images
  useEffect(() => {
    if (images.length === 0) return;

    let loadedCount = 0;
    const newLoaded = new Set(loadedImages);
    let initialLoadThreshold = Math.min(10, images.length); 
    
    images.forEach((imgFilename, index) => {
      if (newLoaded.has(index)) {
        loadedCount++;
        return;
      }
      
      const filename = typeof imgFilename === 'string' ? imgFilename : imgFilename.filename;
      const img = new Image();
      img.src = `/api/images/raw/${filename}`;
      img.onload = () => {
        setLoadedImages(prev => {
          const updated = new Set(prev);
          updated.add(index);
          return updated;
        });
        loadedCount++;
        if (loadedCount >= initialLoadThreshold && isLoading) {
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        setLoadedImages(prev => {
          const updated = new Set(prev);
          updated.add(index); 
          return updated;
        });
      };
    });
    
    if (loadedCount >= initialLoadThreshold) {
      setIsLoading(false);
    }
  }, [images]);

  // Handle animation playback
  const playAnimation = useCallback(() => {
    if (images.length === 0) return;
    
    setCurrentIndex(prev => {
      let next = prev + 1;
      if (next >= images.length) {
        return 0; // Loop back
      }
      while (next < images.length && !loadedImages.has(next)) {
        next++;
      }
      if (next >= images.length) return 0;
      return next;
    });
  }, [images.length, loadedImages]);

  useEffect(() => {
    if (isPlaying && !isLoading && images.length > 0) {
      timerRef.current = setInterval(playAnimation, playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, isLoading, playbackSpeed, playAnimation, images.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setCurrentIndex(parseInt(e.target.value, 10));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const getFilename = (item) => {
    if (!item) return "";
    return typeof item === 'string' ? item : item.filename;
  };

  const formatTimeFromFilename = (item) => {
    const filename = getFilename(item);
    if (!filename) return "--:--";
    const match = filename.match(/mtr_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [_, year, month, day, hr, min, sec] = match;
      return `${hr}:${min}`;
    }
    return "--:--";
  };

  const formatDateFromFilename = (item) => {
    const filename = getFilename(item);
    if (!filename) return "----/--/--";
    const match = filename.match(/mtr_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [_, year, month, day] = match;
      return `${year}-${month}-${day}`;
    }
    return "----/--/--";
  };

  return (
    <div ref={containerRef} className="w-full h-full relative group">
      
      {/* Radar Image Fullscreen Background */}
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-950/80 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <Activity className="w-12 h-12 text-cyan-400 animate-pulse mb-4" />
            <p className="text-cyan-200 font-medium tracking-widest uppercase text-sm animate-pulse">Initializing Radar Data...</p>
          </div>
        )}
        
        {images.length > 0 ? (
          <img 
            src={`/api/images/raw/${getFilename(images[currentIndex])}`} 
            alt="Radar" 
            className="w-full h-full object-contain filter drop-shadow-2xl transition-opacity duration-75"
            style={{ opacity: loadedImages.has(currentIndex) ? 1 : 0.5 }}
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center z-10">
            <svg className="w-20 h-20 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="tracking-widest uppercase text-sm">Waiting for incoming telemetry...</p>
          </div>
        )}
      </div>

      {/* Floating Info Badge overlay (Top Right) */}
      <div className="absolute top-6 right-6 z-30 pointer-events-auto">
        <div className="glass-panel px-5 py-3 rounded-2xl flex flex-col items-end shadow-xl border border-white/10 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Live</span>
          </div>
          <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-cyan-200 tracking-tighter drop-shadow-lg">
            {formatTimeFromFilename(images[currentIndex])}
          </span>
          <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase mt-1">
            {formatDateFromFilename(images[currentIndex])}
          </span>
        </div>
      </div>

      {/* Floating Control Deck (Bottom Center) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-30 glass-panel rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transition-transform duration-500 translate-y-0 opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
        
        {/* Timeline Slider */}
        <div className="w-full relative mb-6">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, images.length - 1)} 
            value={images.length > 0 ? currentIndex : 0} 
            onChange={handleSliderChange}
            className="w-full z-10 relative cursor-pointer"
            disabled={images.length === 0}
          />
          {/* Progress fill visual */}
          <div 
            className="absolute top-[6px] left-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full pointer-events-none transition-all duration-100"
            style={{ width: `${images.length > 1 ? (currentIndex / (images.length - 1)) * 100 : 0}%` }}
          />
        </div>

        {/* Controls Layout */}
        <div className="flex items-center justify-between">
          
          {/* Speed Controls */}
          <div className="flex items-center gap-1 md:gap-2 bg-slate-900/50 rounded-xl p-1 border border-slate-700/50">
            {[
              { label: '0.5x', value: 600 },
              { label: '1x', value: 300 },
              { label: '2x', value: 150 },
              { label: 'MAX', value: 50 },
            ].map(speed => (
              <button
                key={speed.label}
                onClick={() => setPlaybackSpeed(speed.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-300 ${playbackSpeed === speed.value ? 'bg-cyan-500 text-slate-900 shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                {speed.label}
              </button>
            ))}
          </div>

          {/* Main Playback Controls */}
          <div className="flex items-center gap-3 md:gap-5">
             <button 
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-600 hover:border-slate-500 hover:text-white"
             >
               <SkipBack className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
             </button>

             <button 
                onClick={togglePlay}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 shadow-lg ${isPlaying ? 'bg-cyan-500 border-cyan-400 text-slate-900 glow-active' : 'bg-slate-800 border-slate-500 text-white hover:bg-slate-700'}`}
             >
               {isPlaying ? (
                 <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
               ) : (
                 <Play className="w-5 h-5 md:w-6 md:h-6 ml-1" fill="currentColor" />
               )}
             </button>

             <button 
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
                }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-600 hover:border-slate-500 hover:text-white"
             >
               <SkipForward className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
             </button>
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                FRAME: {images.length > 0 ? currentIndex + 1 : 0} <span className="text-slate-600">/</span> {images.length}
             </div>
             <button
               onClick={toggleFullscreen}
               className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-600 hover:border-cyan-500 hover:text-cyan-400"
               title="Toggle Fullscreen"
             >
               {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
