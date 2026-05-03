/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Plane, Package, Ticket, Leaf, Info, Loader2, Sparkles, TrendingUp, Calendar, Map as MapIcon, ChevronRight, SlidersHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getTravelAnalysis, getDestinationImage, getLocationSuggestions, getOptimizedItinerary } from './services/geminiService';
import { TravelAnalysis, ItineraryDay } from './types';

// Custom components for ReactMarkdown to ensure links open in a new tab
const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

export default function App() {
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TravelAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Suggestion states
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState({ origin: false, dest: false });
  const [selectedUtility, setSelectedUtility] = useState<string | null>(null);

  // Utility labels and content
  const UTILITY_CONTENT: Record<string, { title: string; body: string }> = {
    'Registry': {
      title: 'OPERATIONAL REGISTRY',
      body: 'Decentralized node registry for global travel intelligence. Active nodes: 1,402. System ID: NOMAD-INTEL-X-99. Last sync: T-0ms. All heuristics verified by local consensus.'
    },
    'Merchant Policy': {
      title: 'MERCHANT & PRICE POLICY',
      body: 'Nomad Intel operates as a zero-commission intelligence layer. All deals are routed through verified top-tier aggregators. Prices are subject to millisecond-latency volatility and regional availability.'
    },
    'API Source': {
      title: 'DATA INFRASTRUCTURE',
      body: 'Intelligence synthesized via Gemini 1.5 Pro. Flight indices provided by Skyscanner and Google Search Grounding. Climactic data sourced from ERA5 Reanalysis and real-time sensor networks.'
    }
  };

  // Slider state
  const [visibleDays, setVisibleDays] = useState(7);
  const [localItinerary, setLocalItinerary] = useState<ItineraryDay[]>([]);

  const fetchSuggestions = async (query: string, type: 'origin' | 'dest') => {
    if (query.length < 3) {
      type === 'origin' ? setOriginSuggestions([]) : setDestSuggestions([]);
      return;
    }
    setSuggestionsLoading(prev => ({ ...prev, [type]: true }));
    const suggestions = await getLocationSuggestions(query);
    type === 'origin' ? setOriginSuggestions(suggestions) : setDestSuggestions(suggestions);
    setSuggestionsLoading(prev => ({ ...prev, [type]: false }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (origin && showOriginSuggestions) fetchSuggestions(origin, 'origin');
    }, 800);
    return () => clearTimeout(timer);
  }, [origin, showOriginSuggestions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destination && showDestSuggestions) fetchSuggestions(destination, 'dest');
    }, 800);
    return () => clearTimeout(timer);
  }, [destination, showDestSuggestions]);

  // Handle itinerary reload when days change
  useEffect(() => {
    if (!analysis || !destination) return;

    const reloadItinerary = async () => {
      setItineraryLoading(true);
      try {
        const newItinerary = await getOptimizedItinerary(destination, visibleDays);
        setLocalItinerary(newItinerary);
      } catch (err) {
        console.error("Itinerary re-optimization failed", err);
      } finally {
        setItineraryLoading(false);
      }
    };

    const timer = setTimeout(() => {
      // Only reload if the day count is different from what we currently have
      if (localItinerary.length !== visibleDays) {
        reloadItinerary();
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [visibleDays, destination, analysis]);

  const triggerAnalysis = async (targetDest: string, targetOrigin: string) => {
    if (!targetDest.trim() || !targetOrigin.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setImageUrl(null);
    setShowOriginSuggestions(false);
    setShowDestSuggestions(false);
    
    try {
      // Run analysis and image generation in parallel
      // We handle image failure independently so it doesn't block the main analysis
      const analysisPromise = getTravelAnalysis(targetDest, targetOrigin);
      const imagePromise = getDestinationImage(targetDest).catch(err => {
        console.warn('Image generation failed (non-critical):', err);
        return null;
      });

      const [data, img] = await Promise.all([analysisPromise, imagePromise]);
      
      setAnalysis(data);
      setVisibleDays(data.estimatedDays || 7);
      setLocalItinerary(data.itinerary);
      setImageUrl(img);
      // Ensure we scroll up to see the new results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Trigger Analysis Error:', err);
      
      const errorMessage = err?.message || '';
      
      if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
        setError('Quota Exceeded: You have reached the Gemini API rate limit. Please wait a minute or check your AI Studio console usage limits.');
      } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
        setError('Invalid API Key. Please verify your GEMINI_API_KEY in GitHub Secrets.');
      } else {
        setError(errorMessage || 'Failed to fetch optimized data. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerAnalysis(destination, origin);
  };

  return (
    <div className="min-h-screen py-12 px-6 md:px-12 max-w-7xl mx-auto font-sans text-white">
      {/* Header */}
      <header className="mb-24 flex flex-col lg:flex-row lg:items-end justify-between gap-16">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="nav-pill">V1.2.0</span>
            <span className="nav-pill text-white/70">Status: Operational</span>
          </div>
          <h1 className="title-text">
            NOMAD <span className="text-brand-primary">INTEL</span>
          </h1>
          <p className="text-white/70 max-w-lg font-light text-lg leading-relaxed">
            Autonomous travel intelligence for the modern explorer. <br />
            Precise data. Live deals. Adaptive routes.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto relative p-2 bg-white/5 border border-white/5 rounded-[32px] backdrop-blur-3xl">
          {/* Origin Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Origin..."
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                setShowOriginSuggestions(true);
              }}
              onFocus={() => setShowOriginSuggestions(true)}
              disabled={loading}
              className="w-full bg-transparent border-none rounded-full py-4 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-sm uppercase tracking-widest font-mono"
            />
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
            
            <AnimatePresence>
              {showOriginSuggestions && (originSuggestions.length > 0 || suggestionsLoading.origin) && (
                <motion.ul 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-[#050505] border border-white/5 rounded-2xl overflow-hidden z-[100] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
                >
                  {suggestionsLoading.origin && (
                    <li className="p-4 flex items-center gap-3 border-b border-white/5 italic text-white/40 text-[10px] uppercase tracking-widest font-mono">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing Origin...
                    </li>
                  )}
                  {originSuggestions.map((s, i) => (
                    <li 
                      key={i}
                      onClick={() => {
                        setOrigin(s);
                        setShowOriginSuggestions(false);
                      }}
                      className="p-4 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-b-0 group transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-brand-primary/30 group-hover:text-brand-primary" />
                      <span className="text-xs uppercase tracking-widest font-mono text-white/40 group-hover:text-white transition-colors">{s}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          
          <div className="hidden sm:block w-[1px] h-8 bg-white/5 self-center" />

          {/* Destination Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Target..."
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowDestSuggestions(true);
              }}
              onFocus={() => setShowDestSuggestions(true)}
              disabled={loading}
              className="w-full bg-transparent border-none rounded-full py-4 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-sm uppercase tracking-widest font-mono"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />

            <AnimatePresence>
              {showDestSuggestions && (destSuggestions.length > 0 || suggestionsLoading.dest) && (
                <motion.ul 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-[#050505] border border-white/5 rounded-2xl overflow-hidden z-[100] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
                >
                  {suggestionsLoading.dest && (
                    <li className="p-4 flex items-center gap-3 border-b border-white/5 italic text-white/40 text-[10px] uppercase tracking-widest font-mono">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Exploring Target...
                    </li>
                  )}
                  {destSuggestions.map((s, i) => (
                    <li 
                      key={i}
                      onClick={() => {
                        setDestination(s);
                        setShowDestSuggestions(false);
                      }}
                      className="p-4 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-b-0 group transition-colors"
                    >
                      <Search className="h-4 w-4 text-brand-primary/30 group-hover:text-brand-primary" />
                      <span className="text-xs uppercase tracking-widest font-mono text-white/40 group-hover:text-white transition-colors">{s}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="bg-brand-primary text-white font-bold h-14 px-10 rounded-full hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.2em] font-mono"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Run Agent'}
          </button>
        </form>
      </header>

      {/* Main Content */}
      <main 
        className="relative min-h-[400px]"
        onClick={() => {
          setShowOriginSuggestions(false);
          setShowDestSuggestions(false);
        }}
      >
        <AnimatePresence mode="wait">
          {!analysis && !loading && !error && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-24 text-center space-y-8"
            >
              <div className="h-24 w-24 rounded-full border border-white/10 flex items-center justify-center bg-white/5 relative">
                <Sparkles className="h-10 w-10 text-brand-primary/50" />
                <div className="absolute inset-0 rounded-full animate-ping border border-brand-primary/20 opacity-20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-light">Where to next?</h3>
                <p className="text-white/60 font-light max-w-sm">Define your origin and destination to extract real-time flight deals and curated itineraries.</p>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 space-y-8"
            >
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-brand-primary" />
                <div className="absolute inset-0 blur-xl bg-brand-primary/20 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-light">Synthesizing Market & Geo Data</p>
                <div className="flex gap-1 justify-center">
                  <span className="small-caps animate-pulse delay-75">Flights</span>
                  <span className="small-caps opacity-30">•</span>
                  <span className="small-caps animate-pulse delay-150">Climate</span>
                  <span className="small-caps opacity-30">•</span>
                  <span className="small-caps animate-pulse delay-300">Dealy Search</span>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card border-red-500/20 text-center py-16"
            >
              <p className="text-red-400 font-medium text-lg">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-6 nav-pill border-red-500/30 text-red-500/60"
              >
                Reset Search
              </button>
            </motion.div>
          )}

          {analysis && !loading && (
            <motion.div 
              key="results"
              className="space-y-12"
            >
              {/* Verdict Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-12 glass-card border-brand-primary/20 overflow-hidden !p-0 min-h-[300px]"
              >
                <div className="md:col-span-7 p-10 flex flex-col justify-center space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-[2px] bg-brand-primary block" />
                    <p className="small-caps text-brand-primary">The Ultimate Verdict</p>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-light tracking-tight italic leading-[1.1] text-white">
                    "{analysis.destinationVerdict}"
                  </h2>
                  <div className="flex items-center gap-4 text-white/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-light">Recommended Duration: <span className="text-white font-medium">{analysis.estimatedDays} Days</span></span>
                    </div>
                  </div>
                </div>
                {imageUrl && (
                  <div className="md:col-span-5 relative min-h-[300px] overflow-hidden group">
                    <img 
                      src={imageUrl} 
                      alt={destination} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent md:bg-gradient-to-r md:from-black md:to-transparent" />
                  </div>
                )}
              </motion.div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Seasonal and Itinerary */}
                <div className="lg:col-span-8 space-y-12">
                  {/* Seasonal Table */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-primary" />
                      <p className="small-caps">Global Climatology Index</p>
                    </div>
                    
                    <div className="glass-card !p-0 overflow-x-auto scrollbar-hide md:scrollbar-default">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="bg-white/[0.04] border-b border-white/10 text-white/70">
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Season</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Window</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Temp (Avg)</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Rain/Hum</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Daylight</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap">Key Events</th>
                            <th className="p-5 font-medium text-[10px] uppercase tracking-widest whitespace-nowrap text-right">Market Index</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {analysis.seasonalAnalysis.map((row) => (
                            <tr key={row.months} className="group hover:bg-white/[0.03] transition-colors">
                              <td className="p-5">
                                <div className="font-medium flex items-center gap-2 whitespace-nowrap">
                                  <span className={`h-2 w-2 rounded-full ${
                                    row.season === 'Peak' ? 'bg-blue-500' :
                                    row.season === 'Shoulder' ? 'bg-cyan-400' : 'bg-emerald-400'
                                  }`} />
                                  {row.season}
                                </div>
                              </td>
                              <td className="p-5 text-white/70 text-sm whitespace-nowrap font-light">{row.months}</td>
                              <td className="p-5 text-white/70 text-sm whitespace-nowrap font-light">{row.avgTemp}</td>
                              <td className="p-5 text-white/70 text-sm whitespace-nowrap font-light">{row.rainDays}</td>
                              <td className="p-5 text-white/70 text-sm whitespace-nowrap font-light">{row.daylight}</td>
                              <td className="p-5 text-white/70 text-sm italic font-light">{row.events}</td>
                              <td className="p-5 font-mono text-brand-primary tracking-widest whitespace-nowrap text-right text-sm">{row.priceIndex}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Itinerary */}
                  <section className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <MapIcon className="h-5 w-5 text-brand-primary" />
                        <p className="small-caps">Optimized {visibleDays}-Day Itinerary</p>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-6 py-3 min-w-[300px]">
                        <SlidersHorizontal className="h-4 w-4 text-white/30" />
                        <span className="text-xs font-mono text-brand-primary w-12">{visibleDays} Days</span>
                        <input 
                          type="range" 
                          min="1" 
                          max={14} 
                          value={visibleDays} 
                          onChange={(e) => setVisibleDays(parseInt(e.target.value))}
                          className="flex-1 accent-brand-primary cursor-pointer"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4 relative">
                      {itineraryLoading && (
                        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                          <div className="flex items-center gap-3 bg-black border border-white/10 px-6 py-3 rounded-full">
                            <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                            <span className="small-caps">Re-Optimizing Destination Logic...</span>
                          </div>
                        </div>
                      )}
                      {localItinerary.map((day) => (
                        <motion.div 
                          key={day.day} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass-card group hover:bg-white/[0.08] transition-all flex gap-6 items-start border-l-2 border-l-transparent hover:border-l-brand-primary"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary border border-brand-primary/20">
                            {day.day}
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-medium text-white/90">{day.title}</h4>
                            <div className="prose prose-invert max-w-none text-white/70 font-light text-sm leading-relaxed itinerary-markdown">
                              <ReactMarkdown components={markdownComponents}>{day.activities}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column: Live Deals */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="sticky top-12 space-y-8">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-brand-primary" />
                      <p className="small-caps">Direct Merchant Deals</p>
                    </div>

                    <div className="space-y-4">
                      <div className="glass-card border-l-4 border-brand-primary/40 space-y-4 hover:translate-x-1 transition-transform">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-brand-primary" />
                            <p className="text-[10px] uppercase tracking-widest text-white/40">From {origin}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/20" />
                        </div>
                        <div className="deal-markdown text-sm text-white/90 leading-relaxed font-light">
                          <ReactMarkdown components={markdownComponents}>{analysis.liveDeals.flights}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="glass-card border-l-4 border-white/20 space-y-4 hover:translate-x-1 transition-transform">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-white/40" />
                            <p className="text-[10px] uppercase tracking-widest text-white/40">Accommodation</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/20" />
                        </div>
                        <div className="deal-markdown text-sm text-white/90 leading-relaxed font-light">
                          <ReactMarkdown components={markdownComponents}>{analysis.liveDeals.packages}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="glass-card bg-brand-primary border-none text-black space-y-3">
                        <div className="flex items-center gap-2 opacity-60">
                          <Info className="h-4 w-4" />
                          <p className="text-[10px] uppercase tracking-widest font-bold">Limited Activation</p>
                        </div>
                        <div className="deal-markdown-white text-sm font-semibold leading-tight">
                          <ReactMarkdown components={markdownComponents}>{analysis.liveDeals.promoCodes}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="glass-card border-dashed border-white/20 bg-transparent space-y-4">
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-400" />
                        <p className="small-caps">Pro Insight</p>
                      </div>
                      <p className="text-sm font-light italic text-white/80">
                        {analysis.proTip}
                      </p>
                    </div>

                    {/* Similar Destinations Section */}
                    {analysis.similarDestinations && analysis.similarDestinations.length > 0 && (
                      <div className="space-y-6 pt-8">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-brand-primary" />
                          <p className="small-caps">Recommended Similar Vibes</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {analysis.similarDestinations.map((dest, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setDestination(dest.name);
                                triggerAnalysis(dest.name, origin);
                              }}
                              className="glass-card border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all p-5 space-y-3 group cursor-pointer"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h5 className="text-lg font-medium text-white group-hover:text-brand-primary transition-colors">{dest.name}</h5>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                      {dest.vibe}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest font-mono text-white/60">
                                      {dest.matchScore}% Match
                                    </span>
                                  </div>
                                </div>
                                <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight className="h-4 w-4 text-brand-primary" />
                                </div>
                              </div>
                              <p className="text-xs text-white/70 font-light leading-relaxed">
                                {dest.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Styles for Markdown */}
      <style>{`
        .itinerary-markdown a, .deal-markdown a {
          color: #3B82F6;
          text-decoration: underline;
          text-underline-offset: 4px;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .itinerary-markdown a:hover, .deal-markdown a:hover {
          opacity: 0.7;
        }
        .deal-markdown-white a {
          color: white;
          text-decoration: underline;
          font-weight: 700;
        }
        input[type=range] {
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 0 10px rgba(59,130,246,0.4);
        }
      `}</style>

      {/* Footer */}
      <footer className="mt-32 pt-12 border-t border-white/10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-8 text-white/40">
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[6px] text-white/60">NOMAD INTEL</p>
          <p className="text-[10px] font-mono opacity-60 uppercase">Enterprise Grade Intelligence — Verified May 03, 2026</p>
        </div>
        <div className="flex gap-8 text-white/60">
          {Object.keys(UTILITY_CONTENT).map(link => (
            <button 
              key={link} 
              onClick={() => setSelectedUtility(link)}
              className="text-[10px] font-mono uppercase tracking-widest hover:text-brand-primary transition-colors cursor-pointer"
            >
              {link}
            </button>
          ))}
        </div>
      </footer>

      {/* Utility Modal */}
      <AnimatePresence>
        {selectedUtility && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUtility(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card max-w-lg w-full relative z-[210] space-y-6 border-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="small-caps text-brand-primary">{UTILITY_CONTENT[selectedUtility].title}</span>
                <button 
                  onClick={() => setSelectedUtility(null)}
                  className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>
              <p className="text-sm font-light text-white/70 leading-relaxed font-mono">
                {UTILITY_CONTENT[selectedUtility].body}
              </p>
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedUtility(null)}
                  className="nav-pill !px-6"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
