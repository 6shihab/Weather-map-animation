import React from 'react';
import MapAnimator from './components/MapAnimator';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      
      {/* Background ambient gradient */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[150px]"></div>
      </div>

      <header className="absolute top-6 left-6 z-40 flex items-center gap-3 pointer-events-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200 drop-shadow-md">
            NexusRadar
          </h1>
          <p className="text-xs text-slate-300 font-medium tracking-wider uppercase drop-shadow-md">Live Atmospheric Monitoring</p>
        </div>
      </header>

      <main className="w-full h-screen relative z-10">
        <MapAnimator />
      </main>

    </div>
  );
}

export default App;
