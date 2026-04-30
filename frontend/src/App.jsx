import React from 'react';
import MapAnimator from './components/MapAnimator';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-900/20 blur-[150px]"></div>
      </div>

      <header className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NexusRadar
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Live Atmospheric Monitoring</p>
          </div>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">Live Sync</span>
        </div>
      </header>

      <main className="w-full h-screen flex items-center justify-center p-4 pt-20 pb-28 md:p-12 md:pb-32">
        <div className="w-full h-full max-w-7xl mx-auto flex items-center justify-center">
          <MapAnimator />
        </div>
      </main>

    </div>
  );
}

export default App;
