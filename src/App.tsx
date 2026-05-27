import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, LogOut, CheckCircle, ArrowLeft, RefreshCw, Key, ShieldAlert, Sun, Moon } from 'lucide-react';
import { Vendor, Product } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import VendorFormFlow from './components/VendorFormFlow';
import AdminDashboard from './components/AdminDashboard';
import { isFirebaseConfigured, fetchVendor, logUserOut } from './lib/firebase';
import MakolaLogo from './components/MakolaLogo';

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'onboarding' | 'admin' | 'success'>('welcome');
  const [activeVendor, setActiveVendor] = useState<Vendor | null>(null);
  const [finalStorefrontProducts, setFinalStorefrontProducts] = useState<Product[]>([]);
  const [bannerJson, setBannerJson] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Highly-demanded default luxury dark mode on startup!

  // Read active session from localStorage if it exists on boot
  useEffect(() => {
    const activeId = localStorage.getItem('makolastores_onboarding_session_id');
    if (activeId) {
      const loadSession = async () => {
        const vendorRecord = await fetchVendor(activeId);
        if (vendorRecord) {
          if (vendorRecord.completed) {
            setActiveVendor(vendorRecord);
            setCurrentView('success');
          } else {
            setActiveVendor(vendorRecord);
            setCurrentView('onboarding');
          }
        }
      };
      loadSession();
    }
  }, []);

  // Set active session details
  const handleSessionStarted = (vendor: Vendor) => {
    setActiveVendor(vendor);
    localStorage.setItem('makolastores_onboarding_session_id', vendor.id);
    if (vendor.completed) {
      setCurrentView('success');
    } else {
      setCurrentView('onboarding');
    }
  };

  // Sign out / exit active session
  const handleSignOut = async () => {
    await logUserOut();
    setActiveVendor(null);
    localStorage.removeItem('makolastores_onboarding_session_id');
    setCurrentView('welcome');
  };

  // Complete onboarding wizard
  const handleOnboardingCompleted = async (completedVendor: Vendor) => {
    setActiveVendor(completedVendor);
    setCurrentView('success');
  };

  // Extract custom banner colors if defined during AI generation
  useEffect(() => {
    if (activeVendor && activeVendor.bannerUrl) {
      try {
        const parsed = JSON.parse(activeVendor.bannerUrl);
        setBannerJson(parsed);
      } catch (e) {
        setBannerJson(null);
      }
    } else {
      setBannerJson(null);
    }
  }, [activeVendor]);

  // Load catalog list on success view
  useEffect(() => {
    if (currentView === 'success' && activeVendor) {
      const loadProds = async () => {
        try {
          const { fetchVendorProducts } = await import('./lib/firebase');
          const list = await fetchVendorProducts(activeVendor.id);
          setFinalStorefrontProducts(list);
        } catch (e) {
          console.error(e);
        }
      };
      loadProds();
    }
  }, [currentView, activeVendor]);

  return (
    <div className={`min-h-screen flex flex-col justify-between select-none relative overflow-x-hidden transition-colors duration-500 ${
      isDarkMode ? "bg-[#090A0D] text-slate-100" : "bg-[#F8FAFC] text-slate-800"
    }`}>
      
      {/* Accent Glow circles (Teal vs Orange relative to theme) */}
      <div className={`absolute top-20 left-10 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none z-0 transition-opacity duration-700 ${
        isDarkMode ? "bg-[#1A5B70]/12 opacity-80" : "bg-[#1A5B70]/5 opacity-100"
      }`} />
      <div className={`absolute bottom-40 right-10 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none z-0 transition-opacity duration-700 ${
        isDarkMode ? "bg-[#F05A28]/8 opacity-60" : "bg-[#F05A28]/5 opacity-100"
      }`} />
      
      {/* Dynamic Brand Navigation Handlers */}
      <header className={`sticky top-0 backdrop-blur-md border-b z-50 shadow-sm transition-all duration-300 ${
        isDarkMode ? "bg-[#0A0B0E]/85 border-neutral-800/80" : "bg-white/85 border-slate-200/60"
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center md:px-8">
          
          {/* Logo brand configuration of Makolastores */}
          <div className="flex items-center gap-4">
            <div onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer z-10 select-none">
              <MakolaLogo className="w-7 h-7" />
              <span className={`text-sm font-black tracking-tight uppercase ${
                isDarkMode ? "text-white" : "text-slate-950"
              }`}>
                Makolastores Ghana
              </span>
              {isFirebaseConfigured && (
                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-bold uppercase rounded tracking-wider leading-none border border-green-500/20">
                  Live Cloud
                </span>
              )}
            </div>

            {/* Premium Theme Selector */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition-all active:scale-95 z-50 ${
                isDarkMode 
                  ? "bg-slate-900 border-neutral-800 text-amber-400 hover:bg-slate-800" 
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              }`}
              title={isDarkMode ? "Switch to Classic Light" : "Switch to Obsidian Dark"}
            >
              {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>

          {/* Connected Session Status Header */}
          {activeVendor && (
            <div className="flex items-center gap-4 z-10">
              <div className="hidden md:flex flex-col text-right">
                <span className={`text-xs font-bold line-clamp-1 ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>{activeVendor.businessName}</span>
                <span className="text-[10px] font-mono text-slate-400">Code: {activeVendor.serialCode}</span>
              </div>
              <button
                onClick={handleSignOut}
                id="btn_sign_out"
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all ${
                  isDarkMode 
                    ? "border-neutral-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-neutral-800" 
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Primary Application Layout Space */}
      <main className="flex-1 w-full bg-transparent relative z-10">
        <AnimatePresence mode="wait">
          
          {/* View Router */}
          {currentView === 'welcome' && (
            <motion.div
              key="welcome_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WelcomeScreen 
                onSessionCreated={handleSessionStarted}
                onEnterAdmin={() => setCurrentView('admin')}
              />
            </motion.div>
          )}

          {currentView === 'onboarding' && activeVendor && (
            <motion.div
              key="onboarding_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="py-6"
            >
              <VendorFormFlow 
                initialVendor={activeVendor}
                onExit={handleSignOut}
                onComplete={handleOnboardingCompleted}
              />
            </motion.div>
          )}

          {currentView === 'admin' && (
            <motion.div
              key="admin_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AdminDashboard 
                onBackToMain={() => setCurrentView('welcome')}
              />
            </motion.div>
          )}

          {currentView === 'success' && activeVendor && (
            <motion.div
              key="success_view"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 space-y-8 shadow-xl">
                
                {/* Visual Completion Stamp */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center mb-4 border border-green-500/20 shadow-sm">
                    <CheckCircle size={28} />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Storefront <span className="font-extrabold text-[#1A5B70]">Successfully</span> Registered
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 font-light max-w-lg leading-relaxed">
                    Congratulations {activeVendor.firstName}! Your storefront configurations, domain alignment, and catalog entries have been safely indexed under Makolastores Ghana specifications.
                  </p>
                </div>

                {/* Simulated live storefront preview container */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white">
                  
                  {/* Banner aura bg */}
                  <div 
                    className="h-36 p-6 flex flex-col justify-between border-b border-slate-100 relative overflow-hidden"
                    style={bannerJson ? {
                      background: `linear-gradient(135deg, ${bannerJson.gradientStart}, ${bannerJson.gradientEnd})`,
                      color: bannerJson.textColor
                    } : {
                      background: 'linear-gradient(135deg, #1A5B70, #2E8B57)',
                      color: '#FFFFFF'
                    }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest opacity-85">
                      <span>{activeVendor.preferredDomain || "mystore.makolastores.com"}</span>
                      <span className="bg-black/20 p-1 px-2 rounded backdrop-blur-sm font-semibold">ACTIVE BOUTIQUE</span>
                    </div>
                    <div>
                      <h4 className="text-lg md:text-xl uppercase tracking-wider font-extrabold">
                        {activeVendor.businessName}
                      </h4>
                      <p className="text-xs opacity-90 font-light italic mt-1">{bannerJson?.welcomeSlogan || "Welcome to our Premium Storefront."}</p>
                    </div>
                  </div>

                  {/* Logo, store attributes, and items catalog view */}
                  <div className="p-6 space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        {activeVendor.logoUrl ? (
                          <img src={activeVendor.logoUrl} alt="Logo" className="w-12 h-12 rounded bg-slate-50 p-1 border border-slate-200 object-contain shadow-sm" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 bg-[#1A5B70] text-white font-extrabold rounded-xl flex items-center justify-center text-sm uppercase shadow-sm">
                            {activeVendor.businessName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{activeVendor.businessName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{activeVendor.firstName} {activeVendor.lastName} • Partner</span>
                        </div>
                      </div>

                      <div className="text-left md:text-right text-[11px] text-slate-500 font-mono space-y-0.5">
                        <p>📞 {activeVendor.phone || "No phone listed"}</p>
                        <p>✉️ {activeVendor.email || "No email listed"}</p>
                      </div>
                    </div>

                    {/* Catalog list */}
                    <div>
                      <span className="block text-[10px] font-mono text-[#1A5B70] uppercase tracking-widest mb-4 font-bold">Live SKU Catalog ({finalStorefrontProducts.length})</span>
                      {finalStorefrontProducts.length === 0 ? (
                        <p className="text-xs text-slate-400 font-light italic text-center py-6">No cataloged items yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {finalStorefrontProducts.map((p) => (
                            <div key={p.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl flex items-start gap-4 hover:border-[#1A5B70]/30 hover:bg-slate-50 transition-all shadow-sm">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-lg object-contain bg-white border p-1 border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <ShoppingBag size={20} />
                                </div>
                              )}
                              <div className="space-y-1">
                                <h5 className="font-bold text-xs text-[#1A5B70] line-clamp-1">{p.name}</h5>
                                <span className="block font-mono text-xs font-extrabold text-[#F05A28]">${p.price}</span>
                                <span className="block text-[10px] text-slate-400 font-mono">Cargo Mass: {p.weight} kg</span>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-light mt-1 bg-white p-1.5 px-2 rounded border border-slate-100">
                                  {p.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Back / Restart Actions */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#1A5B70] transition-colors font-mono font-bold"
                  >
                    <ArrowLeft size={12} /> Exit Gateway
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/90 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md"
                  >
                    <RefreshCw size={12} />
                    Register New Store
                  </button>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Corporate Footnotes */}
      <footer className={`py-6 border-t text-center text-[10px] font-mono relative z-10 transition-colors duration-300 ${
        isDarkMode 
          ? "bg-[#090A0D]/95 border-neutral-800/80 text-slate-500 shadow-none" 
          : "bg-white border-slate-200/50 text-slate-400 shadow-inner"
      }`}>
        <p>© 2026 Makolastores Ghana Inc. • Licensed under Admin Jude specifications.</p>
      </footer>

    </div>
  );
}
