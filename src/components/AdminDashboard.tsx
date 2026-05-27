import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, Power, RefreshCw, Trash2, ArrowLeft, AlertCircle, 
  Award, CheckCircle, Copy, Download, Phone, Mail, Globe, Calendar, Clock, Sparkles, MessageSquare, ListFilter, Send
} from 'lucide-react';
import { Vendor, Product } from '../types';
import { fetchAllVendors, purgeVendorRecord, saveVendorProfile, fetchVendorProducts, auth, loginWithGooglePopup, isFirebaseConfigured } from '../lib/firebase';
import MakolaLogo from './MakolaLogo';

interface AdminDashboardProps {
  onBackToMain: () => void;
}

export default function AdminDashboard({ onBackToMain }: AdminDashboardProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(auth?.currentUser || null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'ongoing' | 'dormant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated real-time SMS Logs stored in state for admin review
  const [smsLogs, setSmsLogs] = useState<Array<{
    id: string;
    recipient: string;
    phone: string;
    message: string;
    type: 'reminder_7d' | 'confirmation';
    timestamp: string;
    status: 'Delivered' | 'Pending';
  }>>([
    {
      id: 'sms_001',
      recipient: 'Sarah Hansen',
      phone: '+44 7911 123456',
      message: 'Makolastores: Congratulations Sarah! Your storefront has been securely registered. Launch is live!',
      type: 'confirmation',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Delivered'
    },
    {
      id: 'sms_002',
      recipient: 'Kwame Mensah',
      phone: '+233 24 123 4567',
      message: 'Jude Reminder: You have not completed your logo yet. Please complete it so we can set up your shop address.',
      type: 'reminder_7d',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Delivered'
    }
  ]);

  // Load and pre-seed vendor list
  const getAdminData = async () => {
    setLoading(true);
    try {
      let list = await fetchAllVendors();
      
      const wasSeeded = localStorage.getItem('macular_admin_seeded') === 'true';
      if (list.length === 0 && !wasSeeded) {
        // Sophisticated pre-seeded records to make the dashboard look highly realistic
        const mockSeeds: Vendor[] = [
          {
            id: 'v_seed_1',
            serialCode: 'VEN-FJK2-99EA',
            firstName: 'Sarah',
            lastName: 'Hansen',
            businessName: 'FirstPick Food Ventures',
            email: 'firstpickfoods@gmail.com',
            phone: '+233 544 144 403',
            preferredDomain: 'firstpickventures.com',
            progress: 100,
            completed: true,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v_seed_2',
            serialCode: 'VEN-QM72-B839',
            firstName: 'Kwame',
            lastName: 'Mensah',
            businessName: 'JRA Foodstuff Specialty',
            email: 'mensah@jrafoodstuff.gh',
            phone: '+233 24 123 4567',
            preferredDomain: 'jrafoodstuffs.com.gh',
            progress: 40,
            completed: false,
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            lastActive: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'v_seed_3',
            serialCode: 'VEN-PW22-H458',
            firstName: 'Aman',
            lastName: 'Alhassan',
            businessName: 'Abuja Luxury Wheels Stand',
            email: 'aman@abujawheels.com',
            phone: '+234 812 345 6789',
            preferredDomain: 'abujacarstand.ng',
            progress: 75,
            completed: false,
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            lastActive: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        for (const mock of mockSeeds) {
          await saveVendorProfile(mock);
        }
        localStorage.setItem('macular_admin_seeded', 'true');
        list = mockSeeds;
      }
      
      // Sort by recent activity
      list.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
      setVendors(list);

      // Auto-select first vendor in listed records
      if (list.length > 0) {
        handleVendorClick(list[0]);
      }
    } catch (e: any) {
      console.error("Failed to fetch admin vendor summary:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAdminData();
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user: any) => {
        setCurrentUser(user);
        // Automatically fetch live administrative records once logged in
        if (user && user.email === 'kingjudecole@gmail.com') {
          getAdminData();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Set selected vendor and query their catalog SKUs
  const handleVendorClick = async (v: Vendor) => {
    setSelectedVendor(v);
    try {
      const prods = await fetchVendorProducts(v.id);
      setSelectedProducts(prods);
    } catch (e) {
      setSelectedProducts([]);
    }
  };

  // Helper to determine elapsed and remaining limits (30-day TTL)
  const calculateTTL = (createdAtString: string) => {
    const createdDate = new Date(createdAtString);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = 30 - diffDays;
    return {
      daysLeft: Math.max(0, daysLeft),
      isExpired: daysLeft <= 0,
      daysElapsed: diffDays
    };
  };

  // One-click action to purge ALL vendors who have exceeded 30 days and remain incomplete
  const handlePurgeExpiredOnes = async () => {
    setLoading(true);
    let count = 0;
    try {
      const expiredVendors = vendors.filter(v => {
        const ttl = calculateTTL(v.createdAt);
        return ttl.isExpired && !v.completed;
      });

      for (const v of expiredVendors) {
        await purgeVendorRecord(v.id);
        count++;
      }

      setActionMessage(`System Clean-up complete. Permanently purged ${count} expired partner draft sessions.`);
      await getAdminData();
      setTimeout(() => setActionMessage(''), 6000);
    } catch (err: any) {
      setActionMessage(`Clean-up failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Purge singular vendor details
  const handlePurgeSingle = async (vendorId: string, businessName: string) => {
    if (confirm(`Are you sure you want to permanently erase registration session for "${businessName}"?`)) {
      setLoading(true);
      // Instantly wipe from active local state list for immediate real-time feedback
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      try {
        await purgeVendorRecord(vendorId);
        setActionMessage(`Purged profile for ${businessName}.`);
        await getAdminData();
        setSelectedVendor(null);
        setSelectedProducts([]);
        setTimeout(() => setActionMessage(''), 5000);
      } catch (err: any) {
        setActionMessage(`Failed to delete record: ${err.message}`);
        await getAdminData(); // Restore if error occurred
      } finally {
        setLoading(false);
      }
    }
  };

  // Text copier helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setActionMessage(`Copied ${label} securely to clipboard!`);
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Image downloader decoder helper
  const downloadBase64Image = (base64String: string, filename: string) => {
    if (!base64String) return;
    
    // Check if it's already a clean dataUrl
    const isDataUrl = base64String.startsWith('data:');
    const hrefUrl = isDataUrl ? base64String : `data:image/png;base64,${base64String}`;

    const link = document.createElement('a');
    link.href = hrefUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setActionMessage(`Downloading ${filename}...`);
    setTimeout(() => setActionMessage(''), 3000);
  };

  // Trigger simulated 7-Day reminder or Completion confirmation SMS manual dispatch
  const handleManualSMSDispatch = (v: Vendor, type: 'reminder_7d' | 'confirmation') => {
    if (!v.phone) {
      setActionMessage(`Send failed: Vendor has no registered contact number yet.`);
      setTimeout(() => setActionMessage(''), 4000);
      return;
    }

    const newSmsText = type === 'reminder_7d' 
      ? `Jude here. Hello ${v.firstName}. Please finish your shop setup in Makolastores. Your shop address ${v.preferredDomain || 'sandbox.makolastores.com'} is only held for 30 days.`
      : `Makolastores: Congratulations ${v.firstName}. Your vendor catalog is complete. Jude has set up your shop. Use code ${v.serialCode} to resume.`;

    const newLogItem = {
      id: `sms_${Date.now()}`,
      recipient: `${v.firstName} ${v.lastName}`,
      phone: v.phone,
      message: newSmsText,
      type: type,
      timestamp: new Date().toISOString(),
      status: 'Delivered' as const
    };

    setSmsLogs([newLogItem, ...smsLogs]);
    setActionMessage(`SMS dispatched successfully to ${v.phone}! [SIMULATION LOGGED]`);
    setTimeout(() => setActionMessage(''), 5000);
  };

  // Multi-tab filtering logic
  const filteredVendors = vendors.filter(v => {
    const ttl = calculateTTL(v.createdAt);
    const isDormant = !v.completed && (Date.now() - new Date(v.lastActive).getTime() > 7 * 24 * 60 * 60 * 1000);
    
    const matchesSearch = 
      v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.serialCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'completed') return v.completed;
    if (activeTab === 'ongoing') return !v.completed && !ttl.isExpired;
    if (activeTab === 'dormant') return isDormant;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none bg-[#F8FAFC]">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center pb-8 border-b border-slate-200">
        <div>
          <button 
            onClick={onBackToMain}
            className="flex items-center gap-1.5 text-xs text-[#1A5B70] hover:text-[#1A5B70]/80 transition-colors mb-2 font-mono font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={12} />
            Back to Gateway
          </button>
          
          <div className="flex items-center gap-3">
            <MakolaLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Makolastores <span className="text-[#1A5B70]">Vendors</span> Dashboard
                </h1>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-mono font-bold rounded border border-amber-200 uppercase tracking-widest">
                  ADMINISTRATIVE CONTROL
                </span>
              </div>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                Oversee store layouts, verify catalogs, and trigger SMS notifications under Department Head Jude.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 h-fit items-center self-end">
          {isFirebaseConfigured && (
            currentUser && currentUser.email === 'kingjudecole@gmail.com' ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-mono font-bold rounded-xl shadow-xs h-[42px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>AUTHENTICATED ADMIN</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const user = await loginWithGooglePopup();
                    if (user) {
                      setActionMessage(`Successfully authenticated admin privileges as: ${user.email}`);
                      setTimeout(() => setActionMessage(''), 5000);
                    }
                  } catch (err: any) {
                    setActionMessage(`Auth failed: ${err.message}`);
                    setTimeout(() => setActionMessage(''), 5500);
                  }
                }}
                id="btn_admin_auth"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-wider h-[42px]"
              >
                <Shield size={13} className="animate-pulse" />
                Auth Live DB
              </button>
            )
          )}
          <button
            onClick={getAdminData}
            id="btn_admin_refresh"
            className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 transition-all flex items-center justify-center shadow-sm h-[42px] w-[42px]"
            title="Refresh database records"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handlePurgeExpiredOnes}
            id="btn_admin_purge"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95 uppercase tracking-wider h-[42px]"
          >
            <Trash2 size={14} />
            Purge Expired (30+ Days)
          </button>
        </div>
      </div>

      {actionMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }} 
          animate={{ opacity: 1, y: 0 }}
          className="my-4 p-4 text-xs font-mono rounded-xl bg-slate-900 text-white flex items-center gap-2 shadow-lg border border-slate-850"
        >
          <AlertCircle size={15} className="text-[#F05A28]" />
          <span>{actionMessage}</span>
        </motion.div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
            <Users size={20} />
          </div>
          <div>
            <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Total Partners</span>
            <span className="text-2xl font-black text-slate-900">{vendors.length}</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-50 rounded-xl text-green-600 border border-green-100">
            <Award size={20} />
          </div>
          <div>
            <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Finished Onboarding</span>
            <span className="text-2xl font-black text-slate-900">
              {vendors.filter(v => v.completed).length}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-[#1A5B70]/10 rounded-xl text-[#1A5B70] border border-[#1A5B70]/10">
            <Power size={20} />
          </div>
          <div>
            <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Active Progressing</span>
            <span className="text-2xl font-black text-slate-900">
              {vendors.filter(v => !v.completed && !calculateTTL(v.createdAt).isExpired).length}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
            <Trash2 size={20} />
          </div>
          <div>
            <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Expired Incomplete</span>
            <span className="text-2xl font-black text-slate-900">
              {vendors.filter(v => !v.completed && calculateTTL(v.createdAt).isExpired).length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Lefthand spreadsheet list, Righthand rich vendor profile card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* LEFTHAND: Sparse Activity List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">Indexed Storefronts</h2>
              <span className="bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 rounded font-mono">
                {vendors.length} Total
              </span>
            </div>

            {/* In-tab Dense Filters */}
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-[10px] uppercase font-mono font-bold rounded-lg transition-all ${
                  activeTab === 'all' 
                    ? 'bg-[#1A5B70] text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1 text-[10px] uppercase font-mono font-bold rounded-lg transition-all ${
                  activeTab === 'completed' 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Completed
              </button>
              <button 
                onClick={() => setActiveTab('ongoing')}
                className={`px-3 py-1 text-[10px] uppercase font-mono font-bold rounded-lg transition-all ${
                  activeTab === 'ongoing' 
                    ? 'bg-[#F05A28] text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Drafts
              </button>
              <button 
                onClick={() => setActiveTab('dormant')}
                className={`px-3 py-1 text-[10px] uppercase font-mono font-bold rounded-lg transition-all ${
                  activeTab === 'dormant' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Dormant (&gt;7d)
              </button>
            </div>

            {/* Quick Search Input */}
            <input
              type="text"
              placeholder="Filter by serial name, code, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-lg text-slate-800"
            />
          </div>

          {filteredVendors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <span>No matching storefronts indexes found.</span>
              {vendors.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('macular_admin_seeded');
                    getAdminData();
                  }}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-750 text-white rounded-lg font-bold text-[10px] uppercase hover:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                  Load Sample Partners
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
              {filteredVendors.map((v) => {
                const isSelected = selectedVendor?.id === v.id;
                const ttl = calculateTTL(v.createdAt);
                
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVendorClick(v)}
                    className={`p-4 cursor-pointer transition-all flex justify-between items-center ${
                      isSelected 
                        ? 'bg-[#1A5B70]/5 border-l-4 border-l-[#1A5B70]' 
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="font-bold text-xs text-slate-900">{v.businessName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {v.firstName} {v.lastName} • <span className="font-bold">{v.serialCode}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          v.completed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {v.completed ? 'COMPLETED' : `${v.progress}% PROGRESS`}
                        </span>
                        
                        <span className="text-[9px] font-mono text-slate-400">
                          TTL Ref: {ttl.daysLeft}d left
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-2">
                      {/* Delete Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurgeSingle(v.id, v.businessName);
                        }}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95"
                        title="Purge session"
                      >
                        <Trash2 size={11} /> Wipe Vendor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHTHAND: Sophisticated, Dense Visual Information Card */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {selectedVendor ? (
              <motion.div
                key={selectedVendor.id}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
              >
                
                {/* Meta Header */}
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Selected Store Profile</span>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{selectedVendor.businessName}</h2>
                    <p className="text-xs text-[#1A5B70] font-mono font-bold">Serial Code: {selectedVendor.serialCode}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleManualSMSDispatch(selectedVendor, 'reminder_7d')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-mono font-bold uppercase rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                      title="Simulates sending Duolingo style 7-day reminder SMS"
                    >
                      <Send size={11} />
                      Trigger 7D Reminder
                    </button>
                    <button
                      onClick={() => handleManualSMSDispatch(selectedVendor, 'confirmation')}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-mono font-bold uppercase rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                      title="Simulates sending completion confirmation SMS"
                    >
                      <Send size={11} />
                      Send Completion SMS
                    </button>
                  </div>
                </div>

                {/* Grid metrics details about the vendor */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/55 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Session UUID</span>
                    <span className="block font-mono text-[10px] truncate max-w-[120px] text-slate-700 mt-0.5">{selectedVendor.id}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Progress Rate</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{selectedVendor.progress}% completed</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Created On</span>
                    <span className="block text-[11px] text-slate-600 mt-0.5">{new Date(selectedVendor.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Days Remaining</span>
                    <span className="block font-bold text-[#F05A28] mt-0.5">{calculateTTL(selectedVendor.createdAt).daysLeft} days left</span>
                  </div>
                </div>

                {/* Category 1: Profile Text Fields with Copy triggers */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Dimension Fields</h4>
                    <span className="text-[10px] text-slate-400">Click icon to securely copy</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Copy Phone */}
                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 max-w-[80%]">
                        <Phone size={13} className="text-[#1A5B70] shrink-0" />
                        <div>
                          <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Partner Phone</span>
                          <span className="block text-xs font-mono font-semibold truncate text-slate-800">{selectedVendor.phone || 'No phone provided yet'}</span>
                        </div>
                      </div>
                      {selectedVendor.phone && (
                        <button 
                          onClick={() => copyToClipboard(selectedVendor.phone, 'phone')}
                          className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>

                    {/* Copy Email */}
                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 max-w-[80%]">
                        <Mail size={13} className="text-[#1A5B70] shrink-0" />
                        <div>
                          <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Partner Email</span>
                          <span className="block text-xs font-mono font-semibold truncate text-slate-800">{selectedVendor.email || 'No email provided yet'}</span>
                        </div>
                      </div>
                      {selectedVendor.email && (
                        <button 
                          onClick={() => copyToClipboard(selectedVendor.email, 'email')}
                          className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>

                    {/* Desired Web domain link */}
                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 max-w-[80%]">
                        <Globe size={13} className="text-[#1A5B70] shrink-0" />
                        <div>
                          <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Preferred Web URL</span>
                          <span className="block text-xs font-mono font-semibold truncate text-slate-800">{selectedVendor.preferredDomain || 'No domain selected'}</span>
                        </div>
                      </div>
                      {selectedVendor.preferredDomain && (
                        <button 
                          onClick={() => copyToClipboard(selectedVendor.preferredDomain, 'domain name')}
                          className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>

                    {/* Full registered name */}
                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 max-w-[80%]">
                        <Users size={13} className="text-[#1A5B70] shrink-0" />
                        <div>
                          <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Legal Representative</span>
                          <span className="block text-xs font-semibold truncate text-slate-800">{selectedVendor.firstName} {selectedVendor.lastName}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(`${selectedVendor.firstName} ${selectedVendor.lastName}`, 'legal name')}
                        className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 2: Media and Visual Assets previews and downloads */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Brand Visual Assets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Logo Asset */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Registered Logo Asset</span>
                        <div className="mt-2 flex items-center justify-center h-20 bg-white border border-slate-200 rounded-lg overflow-hidden relative group">
                          {selectedVendor.logoUrl ? (
                            <img src={selectedVendor.logoUrl} alt="Vendor Logo" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No logo uploaded yet</span>
                          )}
                        </div>
                      </div>

                      {selectedVendor.logoUrl && (
                        <div className="flex gap-2 w-full pt-1">
                          <button
                            onClick={() => downloadBase64Image(selectedVendor.logoUrl!, `${selectedVendor.businessName}_logo.png`)}
                            className="flex-1 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-md tracking-wider flex items-center justify-center gap-1 active:scale-95"
                          >
                            <Download size={11} /> Download PNG
                          </button>
                          <button
                            onClick={() => copyToClipboard(selectedVendor.logoUrl!, 'Logo URI Base64')}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-md hover:text-slate-800"
                            title="Copy image base64 data string"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Banner Asset */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Storefront Banner Scheme</span>
                        <div className="mt-2 flex items-center justify-center h-20 bg-white border border-slate-200 rounded-lg overflow-hidden relative">
                          {selectedVendor.bannerUrl ? (
                            (() => {
                              try {
                                const banner = JSON.parse(selectedVendor.bannerUrl);
                                return (
                                  <div 
                                    className="w-full h-full p-2.5 flex flex-col justify-between"
                                    style={{
                                      background: `linear-gradient(135deg, ${banner.gradientStart}, ${banner.gradientEnd})`,
                                      color: banner.textColor || '#FFFFFF'
                                    }}
                                  >
                                    <span className="text-[7px] font-mono uppercase tracking-widest">{banner.welcomeSlogan || 'Slogan active'}</span>
                                    <div className="text-[8px] font-bold opacity-90 truncate">Glow Start: {banner.gradientStart}</div>
                                  </div>
                                );
                              } catch(e) {
                                // Assume normal image raw base64
                                return <img src={selectedVendor.bannerUrl} alt="Raw Banner" className="h-full w-full object-cover" referrerPolicy="no-referrer" />;
                              }
                            })()
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No banner configured yet</span>
                          )}
                        </div>
                      </div>

                      {selectedVendor.bannerUrl && (
                        <div className="flex gap-2 w-full pt-1">
                          <button
                            onClick={() => {
                              try {
                                const banner = JSON.parse(selectedVendor.bannerUrl!);
                                copyToClipboard(JSON.stringify(banner, null, 2), 'Banner Color Scheme');
                              } catch(e) {
                                downloadBase64Image(selectedVendor.bannerUrl!, `${selectedVendor.businessName}_banner.png`);
                              }
                            }}
                            className="flex-1 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-md tracking-wider flex items-center justify-center gap-1 active:scale-95"
                          >
                            {selectedVendor.bannerUrl?.startsWith('{') ? <><Copy size={11} /> Copy JSON Scheme</> : <><Download size={11} /> Download PNG</>}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Category 3: Dense List of Catalog Products */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Catalog SKUs ({selectedProducts.length})</h4>
                    <span className="text-[10px] text-slate-400 italic">Double-click or copy rows below</span>
                  </div>

                  {selectedProducts.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400 italic">
                      This partner hasn't completed product cataloging steps yet.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 px-3 font-semibold">Image</th>
                            <th className="py-2.5 px-3 font-semibold">Product Title</th>
                            <th className="py-2.5 px-3 font-semibold">Weight</th>
                            <th className="py-2.5 px-3 font-semibold">Price</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Copy Draft</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {selectedProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} className="w-8 h-8 rounded border border-slate-200 object-contain p-0.5 bg-white" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic">No image</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="block font-bold text-slate-800">{p.name || 'Unnamed Product'}</span>
                                <span className="block text-[9px] text-slate-400 max-w-[150px] truncate leading-tight">{p.description}</span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">{p.weight} kg</td>
                              <td className="py-2 px-3 font-mono font-bold text-[#F05A28]">${p.price}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => copyToClipboard(`Product: ${p.name}\nPrice: $${p.price}\nWeight: ${p.weight}kg\nDescription: ${p.description}`, 'product draft details')}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                                >
                                  <Copy size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </motion.div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center text-slate-400 italic text-sm">
                Select an indexed partner storefront from the registry rail on the left to review metrics and media.
              </div>
            )}
          </AnimatePresence>
          
          {/* Simulated SMS dispatch audit trail panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#1A5B70]" />
                <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">SMS Dispatch Activity Log (Sandboxed Gateway)</h3>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-bold text-[9px] font-mono rounded">
                {smsLogs.length} Records
              </span>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {smsLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 hover:shadow-xs transition-shadow">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold text-slate-700">{log.recipient} ({log.phone})</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-light leading-relaxed font-sans">{log.message}</p>
                  <div className="flex justify-between items-center pt-1 text-[9px] font-mono">
                    <span className={`px-1.5 rounded-sm ${
                      log.type === 'confirmation' ? 'bg-green-100 text-green-700 font-bold' : 'bg-amber-100 text-amber-700 font-bold'
                    }`}>
                      {log.type === 'confirmation' ? 'CONFIRMATION DELIVERED' : '7-DAY REMINDER DELIVERED'}
                    </span>
                    <span className="text-green-600 font-bold flex items-center gap-0.5">● SMS Delivered</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
