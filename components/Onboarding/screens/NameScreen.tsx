import React, { useState, useEffect, useRef } from 'react';

interface NameScreenProps {
  initialName: string;
  onContinue: (name: string) => void;
}

const NameScreen: React.FC<NameScreenProps> = ({ initialName, onContinue }) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input after animation delay
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(name.trim() || 'Anonymous');
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center px-6">
      <div className="animate-fade-in-up w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-2 tracking-wide">
            What should we call you?
          </h2>
          
          <p className="text-white/40 text-sm mb-8">
            This name will show next to your cursor.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4
                         text-white/90 placeholder:text-white/30 text-lg
                         focus:outline-none focus:border-white/30 focus:bg-white/10
                         transition-all duration-300"
            />

            <button
              type="submit"
              className="w-full mt-6 px-8 py-4 text-base font-light tracking-wider text-white/80 
                         bg-white/10 rounded-xl border border-white/10
                         hover:bg-white/15 hover:border-white/20 hover:text-white
                         transition-all duration-300"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NameScreen;





