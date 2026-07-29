import React, { useState } from 'react';
import { 
  Clapperboard, 
  ChevronDown, 
  ArrowRight, 
  Sparkles, 
  FileText, 
  Users, 
  Film, 
  Briefcase, 
  MapPin,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onEnterStudio: () => void;
  onLoginClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio, onLoginClick }) => {
  const [demoLogline, setDemoLogline] = useState('A neo-noir detective in 2080 Neo-Tokyo investigates black-market memory trading.');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [showDemoOutput, setShowDemoOutput] = useState(true);

  const handleGenerateDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoLogline.trim()) return;
    setIsGeneratingDemo(true);
    setTimeout(() => {
      setIsGeneratingDemo(false);
      setShowDemoOutput(true);
    }, 500);
  };

  return (
    <div 
      className="min-h-screen w-full font-sans antialiased flex flex-col justify-between overflow-y-auto theme-transition select-text"
      style={{
        backgroundColor: 'var(--t-bg-page)',
        color: 'var(--t-text-1)'
      }}
    >
      {/* Top Navbar */}
      <header 
        className="sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between border-b theme-transition backdrop-blur-md"
        style={{
          backgroundColor: 'var(--t-bg-surface)',
          borderColor: 'var(--t-border)'
        }}
      >
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={onEnterStudio}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3B82F6] via-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white shadow-sm">
              <Clapperboard className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--t-text-1)' }}>
              Movie Agent
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium" style={{ color: 'var(--t-text-3)' }}>
            <button className="flex items-center space-x-1 hover:opacity-80 transition-opacity">
              <span>Products</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center space-x-1 hover:opacity-80 transition-opacity">
              <span>Workflows</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="hover:opacity-80 transition-opacity">Pricing</button>
            <button className="hover:opacity-80 transition-opacity">Showcase</button>
            <button className="flex items-center space-x-1 hover:opacity-80 transition-opacity">
              <span>Resources</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={onLoginClick || onEnterStudio}
            className="text-sm font-medium px-3 py-2 transition-opacity hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--t-text-2)' }}
          >
            Sign in
          </button>

          <button
            onClick={onEnterStudio}
            className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--t-accent)',
              color: 'var(--t-accent-fg)'
            }}
          >
            <span>Launch Studio Canvas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Antigravity Pill Tag */}
        <div 
          className="inline-flex items-center space-x-2 border rounded-full px-4 py-1.5 mb-8 text-xs font-medium theme-transition"
          style={{
            backgroundColor: 'var(--t-bg-elevated)',
            borderColor: 'var(--t-border)',
            color: 'var(--t-text-2)'
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>Next-Gen Multi-Agent Pre-Production Suite</span>
          <span 
            className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
            style={{
              backgroundColor: 'var(--t-accent)',
              color: 'var(--t-accent-fg)'
            }}
          >
            v1.4 Live
          </span>
        </div>

        {/* Huge Display Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto" style={{ color: 'var(--t-text-1)' }}>
          Experience liftoff with the next-gen film studio platform
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal" style={{ color: 'var(--t-text-3)' }}>
          Turn film ideas and loglines into complete pre-production packages — formatted screenplays, character matrices, media moodboards, and crew notices.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onEnterStudio}
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-semibold transition-all shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3 cursor-pointer"
            style={{
              backgroundColor: 'var(--t-accent)',
              color: 'var(--t-accent-fg)'
            }}
          >
            <span>Launch Studio Canvas</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onEnterStudio}
            className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer border theme-transition"
            style={{
              backgroundColor: 'var(--t-bg-elevated)',
              borderColor: 'var(--t-border)',
              color: 'var(--t-text-1)'
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Explore Use Cases</span>
          </button>
        </div>

        {/* Interactive Logline Playground Box */}
        <div 
          className="max-w-3xl mx-auto border rounded-2xl p-4 md:p-6 shadow-2xl text-left relative overflow-hidden theme-transition"
          style={{
            backgroundColor: 'var(--t-bg-surface)',
            borderColor: 'var(--t-border)'
          }}
        >
          <div className="flex items-center space-x-2 mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-3)' }}>
            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
            <span>Interactive Pitch Generator</span>
          </div>

          <form onSubmit={handleGenerateDemo} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={demoLogline}
              onChange={(e) => setDemoLogline(e.target.value)}
              placeholder="Enter your movie logline..."
              className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-input)',
                borderColor: 'var(--t-border)',
                color: 'var(--t-text-1)',
                border: '1px solid var(--t-border)'
              }}
            />
            <button
              type="submit"
              disabled={isGeneratingDemo}
              className="font-semibold text-sm px-6 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--t-accent)',
                color: 'var(--t-accent-fg)'
              }}
            >
              {isGeneratingDemo ? (
                <span>Generating...</span>
              ) : (
                <>
                  <span>Generate Preview</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Interactive Output Sample Cards */}
          {showDemoOutput && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
              <div 
                className="rounded-xl p-4 space-y-2 text-xs font-mono theme-transition"
                style={{
                  backgroundColor: 'var(--t-bg-deep)',
                  border: '1px solid var(--t-border)'
                }}
              >
                <div className="flex items-center space-x-1 text-[#E5A93C] font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>EXT. NEO-TOKYO - NIGHT</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--t-text-2)' }}>
                  MARCUS (40s) steps into rain-slicked asphalt. Cybernetic optical whirring.
                </p>
                <div className="text-right text-[10px]" style={{ color: 'var(--t-text-4)' }}>Screenplay Formatted</div>
              </div>

              <div 
                className="rounded-xl p-4 space-y-2 text-xs theme-transition"
                style={{
                  backgroundColor: 'var(--t-bg-elevated)',
                  border: '1px solid var(--t-border)'
                }}
              >
                <div className="flex items-center space-x-1 text-[#EC4899] font-bold">
                  <Users className="w-3.5 h-3.5" />
                  <span>Character: MARCUS VANCE</span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--t-text-2)' }}>
                  <strong>Role:</strong> Protagonist (Cyber Detective)<br />
                  <strong>Motivation:</strong> Recover stolen memories.
                </p>
              </div>

              <div 
                className="rounded-xl p-4 space-y-2 text-xs theme-transition"
                style={{
                  backgroundColor: 'var(--t-bg-elevated)',
                  border: '1px solid var(--t-border)'
                }}
              >
                <div className="flex items-center space-x-1 text-[#10B981] font-bold">
                  <Film className="w-3.5 h-3.5" />
                  <span>Media & B-Roll Ref</span>
                </div>
                <div 
                  className="h-16 rounded-lg flex items-center justify-center font-mono text-[10px] theme-transition"
                  style={{
                    backgroundColor: 'var(--t-bg-input)',
                    color: 'var(--t-text-4)'
                  }}
                >
                  [Pexels Stock Video Cue]
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Grid Section */}
        <section className="mt-28">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--t-text-1)' }}>
            Everything Directors Need in One Studio Canvas
          </h2>
          <p className="text-base max-w-xl mx-auto mb-12" style={{ color: 'var(--t-text-3)' }}>
            No fragmented tools. Script, casting, media, and crew management work in real-time sync.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
            <div 
              className="p-6 rounded-2xl border transition-shadow theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-surface)',
                borderColor: 'var(--t-border)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--t-text-1)' }}>Script & Scene Breakdowns</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-3)' }}>
                Courier Prime industry screenplay formatting with automated scene location and character roster tags.
              </p>
            </div>

            <div 
              className="p-6 rounded-2xl border transition-shadow theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-surface)',
                borderColor: 'var(--t-border)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--t-text-1)' }}>Character & Casting Studio</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-3)' }}>
                Character archetypes, motivation matrices, actor concept matches, and printable audition notices.
              </p>
            </div>

            <div 
              className="p-6 rounded-2xl border transition-shadow theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-surface)',
                borderColor: 'var(--t-border)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--t-text-1)' }}>Location Scouting Engine</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-3)' }}>
                Real-world shooting location suggestions, lighting/permit considerations, and architectural aesthetics.
              </p>
            </div>

            <div 
              className="p-6 rounded-2xl border transition-shadow theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-surface)',
                borderColor: 'var(--t-border)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--t-text-1)' }}>Royalty-Free Asset Sourcing</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-3)' }}>
                Direct integration with Pexels, Pixabay, and Freesound for B-roll clips and temp soundtrack stems.
              </p>
            </div>

            <div 
              className="p-6 rounded-2xl border transition-shadow theme-transition"
              style={{
                backgroundColor: 'var(--t-bg-surface)',
                borderColor: 'var(--t-border)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--t-text-1)' }}>Crew Recruitment Engine</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-3)' }}>
                Department job postings for Cinematography, Sound, VFX, and Editing with clear day-rate specifications.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer 
        className="border-t py-8 px-6 text-center text-sm theme-transition"
        style={{
          backgroundColor: 'var(--t-bg-surface)',
          borderColor: 'var(--t-border)',
          color: 'var(--t-text-4)'
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Clapperboard className="w-4 h-4 text-[#8B5CF6]" />
            <span className="font-bold" style={{ color: 'var(--t-text-1)' }}>Movie Agent Platform</span>
          </div>
          <p>© 2026 Movie Agent Inc. Built for directors & creative teams.</p>
        </div>
      </footer>
    </div>
  );
};
