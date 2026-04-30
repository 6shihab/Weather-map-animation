import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Activity } from 'lucide-react';

export default function MapAnimator() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(300); // ms per frame
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(new Set());
  
  const timerRef = useRef(null);
  const imageRefs = useRef([]);

  // Fetch image list from backend
  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        // Keep up to last 600
        const latestImages = data.images.slice(-600);
        
        setImages(prev => {
          // Check if there are new images
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
    // Poll every 1 minute
    const interval = setInterval(fetchImages, 60000);
    return () => clearInterval(interval);
  }, []);

  // Preload images
  useEffect(() => {
    if (images.length === 0) return;

    let loadedCount = 0;
    const newLoaded = new Set(loadedImages);
    let initialLoadThreshold = Math.min(10, images.length); // Start playing after 10 images load or total if less
    
    // We want to start loading from the newest or oldest? Usually oldest to newest for animation.
    images.forEach((imgFilename, index) => {
      if (newLoaded.has(index)) {
        loadedCount++;
        return;
      }
      
      const img = new Image();
      img.src = `/api/images/raw/${imgFilename}`;
      img.onload = () => {
        setLoadedImages(prev => {
          const updated = new Set(prev);
          updated.add(index);
          return updated;
        });
        loadedCount++;
        if (loadedCount >= initialLoadThreshold && isLoading) {
          setIsLoading(false);
          // If we just loaded enough to start, start from the latest or oldest? 
          // Let's start from 0 if it was completely empty
        }
      };
      img.onerror = () => {
        // Skip on error
        setLoadedImages(prev => {
          const updated = new Set(prev);
          updated.add(index); // Mark as processed to not block
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
      // Skip unloaded frames
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
  
  const formatTimeFromFilename = (filename) => {
    if (!filename) return "";
    // mtr_YYYYMMDD_HHMMSS.jpg
    const match = filename.match(/mtr_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [_, year, month, day, hr, min, sec] = match;
      return `${hr}:${min}`;
    }
    return "";
  };

  const formatDateFromFilename = (filename) => {
    if (!filename) return "";
    const match = filename.match(/mtr_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const [_, year, month, day] = match;
      return `${year}-${month}-${day}`;
    }
    return "";
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 relative">
      
      {/* Main Map Viewer Area */}
      <div className="relative flex-grow w-full rounded-3xl overflow-hidden glass-panel border border-slate-700/50 shadow-2xl group transition-all duration-500 hover:shadow-cyan-500/10">
        
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <Activity className="w-12 h-12 text-cyan-400 animate-pulse mb-4" />
            <p className="text-cyan-200 font-medium tracking-widest uppercase text-sm animate-pulse">Initializing Radar Data...</p>
          </div>
        )}
        
        {/* Radar Images container */}
        <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
           {images.length > 0 ? (
             <img 
               src={`/api/images/raw/${images[currentIndex]}`} 
               alt="Radar" 
               className="w-full h-full object-contain filter drop-shadow-2xl transition-opacity duration-75"
               style={{ opacity: loadedImages.has(currentIndex) ? 1 : 0.5 }}
             />
           ) : (
             <div className="text-slate-500 flex flex-col items-center">
               <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               <p>Waiting for incoming radar telemetry...</p>
             </div>
           )}
        </div>

        {/* Floating Info Badge overlay */}
        <div className="absolute top-6 right-6 z-10">
          <div className="glass-panel px-5 py-3 rounded-2xl flex flex-col items-end shadow-xl border border-white/5 transition-transform hover:scale-105 duration-300">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-cyan-200 tracking-tighter drop-shadow-md">
              {formatTimeFromFilename(images[currentIndex]) || "--:--"}
            </span>
            <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase mt-1">
              {formatDateFromFilename(images[currentIndex]) || "----/--/--"}
            </span>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
              FRAME: {images.length > 0 ? currentIndex + 1 : 0} / {images.length}
            </div>
          </div>
        </div>
      </div>

      {/* Control Deck */}
      <div className="glass-panel rounded-3xl p-6 w-full max-w-4xl mx-auto flex flex-col gap-6 shadow-2xl relative z-20 border-t border-white/10">
        
        {/* Timeline Slider */}
        <div className="w-full relative group">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, images.length - 1)} 
            value={images.length > 0 ? currentIndex : 0} 
            onChange={handleSliderChange}
            className="w-full z-10 relative"
            disabled={images.length === 0}
          />
          {/* Progress fill visual */}
          <div 
            className="absolute top-[6px] left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full pointer-events-none transition-all duration-100"
            style={{ width: `${images.length > 1 ? (currentIndex / (images.length - 1)) * 100 : 0}%` }}
          />
        </div>

        {/* Controls Layout */}
        <div className="flex items-center justify-between">
          
          {/* Speed Controls */}
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
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
          <div className="flex items-center gap-4">
             <button 
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 hover:border-slate-600 hover:text-white"
             >
               <SkipBack className="w-5 h-5" fill="currentColor" />
             </button>

             <button 
                onClick={togglePlay}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isPlaying ? 'bg-cyan-500 border-cyan-400 text-slate-900 glow-active' : 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700'}`}
             >
               {isPlaying ? (
                 <Pause className="w-6 h-6" fill="currentColor" />
               ) : (
                 <Play className="w-6 h-6 ml-1" fill="currentColor" />
               )}
             </button>

             <button 
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 hover:border-slate-600 hover:text-white"
             >
               <SkipForward className="w-5 h-5" fill="currentColor" />
             </button>
          </div>

          {/* Right spacer for centering */}
          <div className="w-[140px] flex justify-end">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                {images.length} FRAMES
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
