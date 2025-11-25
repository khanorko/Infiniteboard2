import React from 'react';

interface WelcomeScreenProps {
  onEnter: () => void;
  skipNextTime: boolean;
  onSkipChange: (skip: boolean) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onEnter, 
  skipNextTime, 
  onSkipChange 
}) => {
  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <div className="animate-fade-in-up">
        {/* Logo/Title */}
        <h1 className="text-6xl md:text-7xl font-extralight tracking-[0.3em] text-white/90 mb-6">
          INFINITY
          <span className="block text-3xl md:text-4xl tracking-[0.5em] text-white/60 mt-2">
            BOARD
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/50 font-light max-w-md mx-auto mb-12 leading-relaxed">
          A space for ideas that live, move and fade over time.
        </p>

        {/* Enter Button */}
        <button
          onClick={onEnter}
          className="group relative px-10 py-4 text-lg font-light tracking-widest text-white/80 
                     border border-white/20 rounded-full
                     hover:border-white/40 hover:text-white hover:bg-white/5
                     transition-all duration-500 ease-out
                     hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <span className="relative z-10">Enter Infinity Board</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>

        {/* Skip checkbox */}
        <label className="flex items-center justify-center gap-3 mt-10 cursor-pointer group">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={(e) => onSkipChange(e.target.checked)}
            className="w-4 h-4 rounded border-white/30 bg-transparent 
                       checked:bg-white/20 checked:border-white/40
                       focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors">
            Skip this intro next time
          </span>
        </label>
      </div>
    </div>
  );
};

export default WelcomeScreen;

