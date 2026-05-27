import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Key, Sparkles, LogIn, ShieldAlert, BadgeCheck, Phone, Mail, ChevronRight, Lock, Eye, EyeOff } from 'lucide-react';
import { Vendor } from '../types';
import { loginWithGooglePopup, fetchVendor } from '../lib/firebase';
import MakolaLogo from './MakolaLogo';

interface WelcomeScreenProps {
  onSessionCreated: (vendor: Vendor) => void;
  onEnterAdmin: () => void;
}

export default function WelcomeScreen({ onSessionCreated, onEnterAdmin }: WelcomeScreenProps) {
  // Gate Phase: 'name_gate' | 'vault_gate' | 'vault_choice' | 'standard_welcome'
  const [gatePhase, setGatePhase] = useState<'name_gate' | 'vault_gate' | 'vault_choice' | 'standard_welcome'>('name_gate');
  const [fullNameInput, setFullNameInput] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vaultError, setVaultError] = useState('');

  // Standard modes when past the gate
  const [mode, setMode] = useState<'landing' | 'new_session' | 'resume_session'>('landing');
  
  // New session inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Resume inputs
  const [serialCodeInput, setSerialCodeInput] = useState('');

  // Admin whitelisted full names
  const whitelistedAdmins = [
    'jude cole', 
    'eric asare', 
    'david ahimah', 
    'alymer', 
    'makolastore administration',
    'makolastores administration',
    'makolastore admin',
    'makolastores admin'
  ];

  // Generate safe uppercase serial code
  function generateSerialCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VEN-${p1}-${p2}`;
  }

  // Handle entry at the very first screen (Name Gate)
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullNameInput.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    
    // Check if the input name matches any WHITESPACED whitelisted values
    const isMatched = whitelistedAdmins.some(adminName => lower.includes(adminName));

    if (isMatched) {
      setVaultError('');
      setVaultPassword('');
      setGatePhase('vault_gate');
    } else {
      // Normal Vendor, skip secure vault entirely
      // Split names to populate standard forms
      const parts = trimmed.split(' ');
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      setFirstName(first);
      setLastName(last);
      setBusinessName(first ? `${first}'s Boutique` : '');
      setGatePhase('standard_welcome');
      setMode('landing');
    }
  };

  // Verify the high security vault passcode
  const handleVaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultPassword === 'Makolastores$10billion') {
      setGatePhase('vault_choice');
    } else {
      setVaultError('UNAUTHORIZED ACCESS DETECTED: Incorrect master security encryption key.');
    }
  };

  // Process standard vendor starting onboarding session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !businessName) {
      setErrorMsg("Please populate all three basic dimensions.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      const uniqueId = `v_${Date.now()}`;
      const code = generateSerialCode();
      const newVendor: Vendor = {
        id: uniqueId,
        serialCode: code,
        firstName,
        lastName,
        businessName,
        email: '',
        phone: '',
        preferredDomain: '',
        progress: 0,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };

      onSessionCreated(newVendor);
    } catch (err: any) {
      setErrorMsg("Failed to instantiate onboarding space: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resume based on serial code
  const handleResumeSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialCodeInput.trim()) {
      setErrorMsg("Please provide a valid Serial Code.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      const uppercaseCode = serialCodeInput.trim().toUpperCase();
      const matched = await fetchVendor(uppercaseCode);
      if (matched) {
        const updated = { ...matched, lastActive: new Date().toISOString() };
        onSessionCreated(updated);
      } else {
        setErrorMsg("No active session located matching code: " + uppercaseCode);
      }
    } catch (err: any) {
      setErrorMsg("Database lookup error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Login via Google Flow
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const googleUser = await loginWithGooglePopup();
      if (googleUser) {
        const userUid = googleUser.uid;
        const existing = await fetchVendor(userUid);
        if (existing) {
          const updated = { ...existing, lastActive: new Date().toISOString() };
          onSessionCreated(updated);
        } else {
          const splitName = googleUser.displayName ? googleUser.displayName.split(' ') : ['Partner', 'Vendor'];
          const code = generateSerialCode();
          const newVendor: Vendor = {
            id: userUid,
            authUid: userUid,
            serialCode: code,
            firstName: splitName[0] || 'Partner',
            lastName: splitName.slice(1).join(' ') || 'Vendor',
            businessName: `${splitName[0]}'s Collection`,
            email: googleUser.email || '',
            phone: googleUser.phoneNumber || '',
            preferredDomain: '',
            progress: 10,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          };
          onSessionCreated(newVendor);
        }
      }
    } catch (err: any) {
      setErrorMsg("Google Credentials alignment failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[92vh] flex flex-col justify-center items-center px-4 py-8 select-none md:px-8 bg-[#F8FAFC]">
      
      {/* Absolute Geometric Aura Backdrops (Light Accent glow) */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#1A5B70]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-[#F05A28]/10 blur-3xl pointer-events-none" />

      {/* Main Interactive Screen Card with Sophisticated Light Shadow Layout */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl px-6 py-10 rounded-[2rem] border border-slate-200/80 shadow-2xl bg-white/90 backdrop-blur-md text-slate-800 md:p-12 z-10"
      >
        
        {/* Logo and Brand Header Row */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <MakolaLogo className="w-9 h-9" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                Makolastores
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#1A5B70] uppercase font-bold">
                Ghana Marketplace
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-[#1A5B70]/10 text-[#1A5B70] text-[9px] font-mono font-bold rounded uppercase tracking-wider border border-[#1A5B70]/20">
            Vendors Onboarding
          </span>
        </div>

        {/* Dynamic Navigational Stages */}
        <AnimatePresence mode="wait">

          {/* STAGE A: NAME GATE (Very First Screen) */}
          {gatePhase === 'name_gate' && (
            <motion.div
              key="name_gate"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-mono font-medium text-slate-500">
                  Step 1 • Identity Verification
                </span>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight md:text-4xl">
                  Welcome to <span className="text-[#1A5B70]">Makolastores</span>
                </h1>
                <p className="text-sm text-slate-500 font-light max-w-md mx-auto">
                  Every storefront partner starts with standard verification. Please enter your full name to proceed.
                </p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-4 max-w-md mx-auto pt-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 text-center">Your Full Name</label>
                  <input
                    required
                    type="text"
                    id="gate_fullname"
                    placeholder="e.g., John, Linda, or Owusu"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="w-full text-center px-5 py-4 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:ring-1 focus:ring-[#1A5B70] focus:outline-none rounded-xl text-md transition-all text-slate-800 placeholder:text-slate-400 font-medium font-sans shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  id="btn_enter_gateway"
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-[#1A5B70] hover:bg-[#1A5B70]/95 text-white font-bold text-sm rounded-xl transition-all shadow-md group active:scale-95"
                >
                  Enter Identity Gateway
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </form>
            </motion.div>
          )}

          {/* STAGE B: HIGH LEVEL SECURITY VAULT GATE */}
          {gatePhase === 'vault_gate' && (
            <motion.div
              key="vault_gate"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-[#1A5B70] text-white rounded-xl">
                  <BadgeCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A5B70]">Vendors Onboarding Administrator Detected</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-light mt-0.5">
                    Your credentials correspond to a team administrator. Please confirm your password to proceed to the backend.
                  </p>
                </div>
              </div>

              <div className="text-center space-y-2 pt-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Vault Access Key Required</h2>
                <p className="text-xs text-slate-500">Provide your system credentials to decipher administrative modules.</p>
              </div>

              <form onSubmit={handleVaultSubmit} className="space-y-4 max-w-md mx-auto pt-2">
                <div>
                  <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Master Vault Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400"><Lock size={18} /></span>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:outline-none rounded-xl text-sm transition-all text-slate-800 placeholder:text-slate-400 font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {vaultError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-200 text-red-600 text-[11px] rounded-lg font-mono text-center leading-relaxed"
                  >
                    {vaultError}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGatePhase('name_gate')}
                    className="flex-1 py-3 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Edit Name
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    Dcrypt & Open
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STAGE C: SECURE VAULT CHOICE */}
          {gatePhase === 'vault_choice' && (
            <motion.div
              key="vault_choice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-mono font-bold rounded-full border border-green-500/20">
                  ACCESS APPROVED • WELCOME
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Administrator</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Credential alignment successful. Select which sub-dimension you wish to deploy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-lg mx-auto">
                <button
                  onClick={onEnterAdmin}
                  className="flex flex-col justify-between items-start text-left p-6 rounded-2xl border-2 border-[#1A5B70] bg-[#1A5B70]/5 hover:bg-[#1A5B70]/10 transition-all group shadow-sm active:scale-95"
                >
                  <div className="p-3 bg-[#1A5B70] text-white rounded-xl">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="mt-8">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">Admin Dashboard</h3>
                    <p className="mt-1.5 text-xs text-slate-500 font-light leading-relaxed">
                      Erase accounts, check live catalog metadata, copy dimensions, and view real-time SMS logs.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-[#1A5B70] self-end pt-2">
                    Deploy Terminal <ChevronRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    const parts = fullNameInput.trim().split(' ');
                    const first = parts[0] || 'Admin';
                    const last = parts.slice(1).join(' ') || 'Master';
                    setFirstName(first);
                    setLastName(last);
                    setBusinessName(`${first}'s Collection`);
                    setGatePhase('standard_welcome');
                  }}
                  className="flex flex-col justify-between items-start text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#F05A28]/50 hover:bg-[#F05A28]/5 transition-all group shadow-sm active:scale-95"
                >
                  <div className="p-3 bg-[#F05A28] text-white rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div className="mt-8">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">Onboarding Portal</h3>
                    <p className="mt-1.5 text-xs text-slate-500 font-light leading-relaxed">
                      Initialize a dummy partner sandbox to simulate and check the entire wizard user experience.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-[#F05A28] self-end pt-2">
                    Enter Portal <ChevronRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* STAGE D: STANDARD WELCOME LANDING */}
          {gatePhase === 'standard_welcome' && mode === 'landing' && (
            <motion.div
              key="welcome_landing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Grand Elegant Greetings */}
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Designated <span className="text-[#1A5B70]">Storefront</span> Partner Portal.
                </h1>
                <p className="mt-3 text-sm text-slate-500 font-light leading-relaxed max-w-lg">
                  Welcome to Makolastores. Our smart onboarding wizard automates your boutique registration, suggested domains, and catalog optimizations in minutes.
                </p>
              </div>

              {/* Jude the Mascot Encouragement dialogue */}
              <div id="ai_advisor_card" className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 text-slate-800 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#1A5B70]/5 rounded-full blur-xl pointer-events-none" />
                <div className="p-2.5 rounded-xl bg-[#1A5B70] text-white shrink-0 mt-0.5 shadow-sm">
                  {/* Jude mascot symbol */}
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A5B70] font-medium font-bold">Jude, Head of Vendors Department</h4>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-light">
                    "Hello. I am Jude. I coordinate the vendors at Makolastores. I will help you set up your shop address, upload your shop logo, and write simple details for your products. Let us begin."
                  </p>
                </div>
              </div>

              {/* Session Interaction Hub Actions */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  id="btn_start_journey"
                  onClick={() => setMode('new_session')}
                  className="flex flex-col justify-between items-start text-left p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-[#1A5B70]/30 hover:shadow-md transition-all group active:scale-95"
                >
                  <div className="p-2.5 bg-[#1A5B70]/10 text-[#1A5B70] rounded-xl group-hover:bg-[#1A5B70] group-hover:text-white transition-colors shadow-sm">
                    <Sparkles size={20} />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">Start Onboarding</h3>
                    <p className="mt-1 text-xs text-slate-500 font-light leading-relaxed">Create a premium partner portal and generate a unique serial code.</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-slate-600 group-hover:text-[#1A5B70] self-end transition-colors pt-1">
                    Begin <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>

                <button
                  id="btn_resume_onboarding"
                  onClick={() => setMode('resume_session')}
                  className="flex flex-col justify-between items-start text-left p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-[#F05A28]/30 hover:shadow-md transition-all group active:scale-95"
                >
                  <div className="p-2.5 bg-[#F05A28]/10 text-[#F05A28] rounded-xl group-hover:bg-[#F05A28] group-hover:text-white transition-colors shadow-sm">
                    <Key size={20} />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">Resume Session</h3>
                    <p className="mt-1 text-xs text-slate-500 font-light leading-relaxed">Enter your pre-generated unique partner code to pick up exactly where you left off.</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-slate-600 group-hover:text-[#F05A28] self-end transition-colors pt-1">
                    Resume <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              </div>

              {/* Switch back option */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                <span>Verified Name: {fullNameInput}</span>
                <button
                  onClick={() => setGatePhase('name_gate')}
                  className="text-[#1A5B70] font-bold hover:underline"
                >
                  Change Name
                </button>
              </div>
            </motion.div>
          )}

          {/* New Setup Input Form */}
          {gatePhase === 'standard_welcome' && mode === 'new_session' && (
            <motion.div
              key="new_setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Create New Partner Profile</h2>
              <p className="text-sm text-slate-500 font-light mb-6">Let's collect your preliminary dimensions. This creates a secure onboarding timeline valid for exactly 30 days.</p>

              <form onSubmit={handleCreateSession} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      required
                      type="text"
                      id="input_first_name"
                      placeholder="e.g., John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800 placeholder:text-slate-400 font-medium font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      required
                      type="text"
                      id="input_last_name"
                      placeholder="e.g., Linda"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800 placeholder:text-slate-400 font-medium font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Business/Brand Name</label>
                  <input
                    required
                    type="text"
                    id="input_business_name"
                    placeholder="e.g., Owusu Fashion Store"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800 placeholder:text-slate-400 font-medium font-sans"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg font-mono">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMode('landing')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    id="btn_submit_new_profile"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/90 text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:bg-gray-300 active:scale-95"
                  >
                    {isLoading ? "Provisioning..." : "Generate Premium Portal"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Resume Session input form */}
          {gatePhase === 'standard_welcome' && mode === 'resume_session' && (
            <motion.div
              key="resume_setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Resume Active Onboarding</h2>
              <p className="text-sm text-slate-500 font-light mb-6">Enter your pre-generated custom code (e.g. <code>VEN-ABC1-XYZ2</code>) to seamlessly resume registration.</p>

              <form onSubmit={handleResumeSession} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Unique Serial Code</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                      required
                      type="text"
                      id="input_serial_code"
                      placeholder="VEN-XXXX-XXXX"
                      value={serialCodeInput}
                      onChange={(e) => setSerialCodeInput(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm tracking-widest font-mono transition-all uppercase text-slate-800 placeholder:text-slate-400 font-bold"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg font-mono">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMode('landing')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    id="btn_submit_resume_profile"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#F05A28] hover:bg-[#F05A28]/90 text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:bg-gray-300 active:scale-95"
                  >
                    {isLoading ? "Querying Archive..." : "Align Session"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Elegant Footer Slogan */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <BadgeCheck size={12} className="text-[#1A5B70]" /> Secure ISO-27001 Gateway
          </span>
          <span>Dual TLS Key Encryption</span>
        </div>
      </motion.div>
    </div>
  );
}
