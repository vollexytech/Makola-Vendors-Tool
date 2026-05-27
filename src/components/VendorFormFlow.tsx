import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ArrowRight, ArrowLeft, Upload, Grid, HelpCircle, 
  DollarSign, Scale, FileText, Check, Plus, Image as ImageIcon, Globe, Mail, Phone, ShoppingBag, Send, AlertTriangle, Key, Copy, HelpCircle as HelpIcon, Smile, RefreshCw
} from 'lucide-react';
import { Vendor, Product } from '../types';
import { saveVendorProfile, saveProductToCatalog, fetchVendorProducts } from '../lib/firebase';
import MakolaLogo from './MakolaLogo';

interface VendorFormFlowProps {
  initialVendor: Vendor;
  onExit: () => void;
  onComplete: (updatedVendor: Vendor) => void;
}

function TypewriterText({ text, speed = 15, className = "" }: { text: string; speed?: number; className?: string }) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className={className}>{displayedText}</span>;
}

export default function VendorFormFlow({ initialVendor, onExit, onComplete }: VendorFormFlowProps) {
  const [vendor, setVendor] = useState<Vendor>(initialVendor);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step state for Profile Setup
  const [firstName, setFirstName] = useState(vendor.firstName || '');
  const [lastName, setLastName] = useState(vendor.lastName || '');
  const [businessName, setBusinessName] = useState(vendor.businessName || '');
  
  const [email, setEmail] = useState(vendor.email || '');
  const [phone, setPhone] = useState(vendor.phone || '');
  
  const [domainQuery, setDomainQuery] = useState(vendor.preferredDomain || '');
  const [domainSuggestions, setDomainSuggestions] = useState<Array<{domain: string, reason: string, score: number}>>([]);
  
  const [logoFile, setLogoFile] = useState<string | null>(vendor.logoUrl || null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);

  // Banner states
  const [bannerOption, setBannerOption] = useState<'upload' | 'ai'>('ai'); // 'upload' or 'ai' preset
  const [rawBannerFile, setRawBannerFile] = useState<string | null>(null);
  const [aiBannerData, setAiBannerData] = useState<any>(null);
  
  // Custom 6-information branding questionnaire answers (Apple / Tesla high proficiency setup)
  const [bannerAnswers, setBannerAnswers] = useState({
    aesthetic: 'Minimal Luxury',
    focus: 'High-Status Apparel',
    colors: 'Royal Teal & Sunset Copper',
    sentiment: 'Prestigious & Elite',
    slogan: 'Crafted for the Discerning',
    pattern: 'Subtle Geometric Lines'
  });
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);

  const [nanoBananaProcessing, setNanoBananaProcessing] = useState<boolean>(false);
  const [nanoBananaOriginalDim, setNanoBananaOriginalDim] = useState<{w: number, h: number} | null>(null);
  const [nanoBananaRedesigned, setNanoBananaRedesigned] = useState<boolean>(false);

  // Banner Crop-Resizer state attributes
  const [cropFile, setCropFile] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(100);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropBgColor, setCropBgColor] = useState('#F8FAFC');
  const [isCropDragging, setIsCropDragging] = useState(false);

  // Phase 2: Cataloging states (runs after Phase 1 completed)
  const [phase, setPhase] = useState<'profile' | 'catalog' | 'catalog_summary'>('profile');
  const [catalogStep, setCatalogStep] = useState<number>(1);

  // Active product drafting state
  const [prodImageOption, setProdImageOption] = useState<'upload' | 'ai'>('ai');
  const [prodUploadedImage, setProdUploadedImage] = useState<string | null>(null);
  const [prodUploadedImages, setProdUploadedImages] = useState<string[]>([]);
  const [prodAIEnhanced, setProdAIEnhanced] = useState<boolean>(false);
  const [prodAISettings, setProdAISettings] = useState<any>(null);

  const [prodDraftName, setProdDraftName] = useState('');
  const [prodOptimizedNames, setProdOptimizedNames] = useState<Array<{name: string, style: string}>>([]);
  const [prodSelectedName, setProdSelectedName] = useState('');

  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodWeight, setProdWeight] = useState<string>('');
  const [showWeightTooltip, setShowWeightTooltip] = useState(false);

  const [prodKeywords, setProdKeywords] = useState('');
  const [prodAIDesc, setProdAIDesc] = useState<any>(null);

  // Jude Interactive Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'jude' | 'user', text: string }>>([
    { 
      sender: 'jude', 
      text: `Hello ${initialVendor.firstName}. I am Jude. I am the Head of the Vendors Department for Makolastores. I coordinate our vendor setups. Feel free to type questions in the chat if you need help on shop links or logos.` 
    }
  ]);

  // Crying Mascot Exit Protection Modal
  const [showExitModal, setShowExitModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Rotator Index for stock imagery (made static to prevent distracting periodic redraws)
  const [rotatingIndex] = useState(0);

  // Sync catalog lists on load
  useEffect(() => {
    const syncCatalog = async () => {
      const items = await fetchVendorProducts(vendor.id);
      setProductsList(items);
    };
    syncCatalog();
  }, [vendor.id]);

  // Dynamic automatic progress alerts based on step checkpoints
  const [judeToast, setJudeToast] = useState('');
  useEffect(() => {
    let msg = '';
    if (phase === 'profile') {
      switch (currentStep) {
        case 1: msg = "Jude: Please enter your first name and last name. This helps us know who you are."; break;
        case 2: msg = "Jude: Enter your contact details. This is how we will send you message notifications."; break;
        case 3: msg = "Jude: Let us choose a website link for your shop. Clients will type this to find you."; break;
        case 4: msg = "Jude: Upload a beautiful image for your logo. It shows clients your shop brand."; break;
        case 5: msg = "Jude: Now we will set up a banner for your storefront background."; break;
      }
    } else if (phase === 'catalog') {
      switch (catalogStep) {
        case 1: msg = "Jude: Let us add a product to your catalog. Upload a clean image of your item."; break;
        case 2: msg = "Jude: Type in a nice name for your item. Simple product names are easy to read."; break;
        case 3: msg = "Jude: Enter the price for your product. Clients will pay this amount in your store."; break;
        case 4: msg = "Jude: Please tell me the weight of your item in kilograms. It determines transport costs."; break;
        case 5: msg = "Jude: I am writing a simple product description for you. Just a short moment."; break;
      }
    } else {
      msg = "Jude: You have completed your setup. Excellent work.";
    }
    setJudeToast(msg);
    // Append to chatlog to keep Jude aligned
    setChatLog(prev => [...prev, { sender: 'jude', text: msg }]);
  }, [currentStep, catalogStep, phase]);

  // Autoscroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Helper: compute and update progress rate in Firebase
  const updateProgressValue = async (newStep: number, currentPhase: 'profile' | 'catalog' | 'catalog_summary') => {
    let pct = 0;
    if (currentPhase === 'profile') {
      pct = Math.min(50, Math.floor((newStep / 5) * 50));
    } else if (currentPhase === 'catalog') {
      pct = 50 + Math.min(40, Math.floor((catalogStep / 5) * 40));
    } else {
      pct = 95;
    }

    const updated = {
      ...vendor,
      firstName,
      lastName,
      businessName,
      email,
      phone,
      preferredDomain: domainQuery,
      logoUrl: logoFile || undefined,
      bannerUrl: aiBannerData?.gradientStart ? JSON.stringify(aiBannerData) : undefined,
      bannerOption,
      progress: pct,
      lastActive: new Date().toISOString(),
    };
    
    setVendor(updated);
    await saveVendorProfile(updated);
  };

  // Domain recommendations auto-trigger on step arrival or input
  useEffect(() => {
    if (domainQuery.length > 2 && phase === 'profile' && currentStep === 3) {
      const timer = setTimeout(() => {
        triggerAIForDomain();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [domainQuery, currentStep]);

  const triggerAIForDomain = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/suggest-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: domainQuery || businessName })
      });
      const data = await res.json();
      if (data.suggestions) {
        setDomainSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  // Banner design auto-loader
  const triggerAIBanner = async (overrideAnswers?: typeof bannerAnswers) => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessName, 
          niche: "Luxury Everyday Boutique",
          products: ["Premium Essential Selection"],
          answers: overrideAnswers || bannerAnswers
        })
      });
      const data = await res.json();
      setAiBannerData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (phase === 'profile' && currentStep === 5 && !aiBannerData) {
      triggerAIBanner();
    }
  }, [currentStep, phase]);

  // Product helper optimizations
  const triggerAIProductNameList = async () => {
    if (!prodDraftName.trim()) return;
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/optimize-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftName: prodDraftName })
      });
      const data = await res.json();
      if (data.optimizedNames) {
        setProdOptimizedNames(data.optimizedNames);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const triggerAIEnhancedImage = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/enhance-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUri: prodUploadedImage })
      });
      const data = await res.json();
      setProdAISettings(data);
      setProdAIEnhanced(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const triggerAIDescription = async () => {
    if (!prodKeywords.trim()) return;
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productName: prodSelectedName || prodDraftName, 
          keywords: prodKeywords 
        })
      });
      const data = await res.json();
      setProdAIDesc(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  // Chatbot submission to live Gemini API / Local intents
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    // Append user input
    setChatLog(prev => [...prev, { sender: 'user', text: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          partnerName: firstName,
          activeStep: phase === 'profile' ? currentStep : catalogStep,
          phase: phase
        })
      });
      const data = await res.json();
      if (data.reply) {
        setChatLog(prev => [...prev, { sender: 'jude', text: data.reply }]);
      }
    } catch (err: any) {
      console.error("Chat error fallback:", err);
    } finally {
      setChatLoading(false);
    }
  };

  // Wizard navigation
  const handleNextProfileStep = async () => {
    if (currentStep < 5) {
      const next = currentStep + 1;
      setCurrentStep(next);
      await updateProgressValue(next, 'profile');
    } else {
      setPhase('catalog');
      setCatalogStep(1);
      await updateProgressValue(1, 'catalog');
    }
  };

  const handlePrevProfileStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setShowExitModal(true); // Catch exit draft action
    }
  };

  const handleNextCatalogStep = async () => {
    if (catalogStep < 5) {
      const next = catalogStep + 1;
      setCatalogStep(next);
      await updateProgressValue(next, 'catalog');
      
      if (next === 2 && prodDraftName && prodOptimizedNames.length === 0) {
        triggerAIProductNameList();
      }
      if (next === 5 && prodKeywords && !prodAIDesc) {
        triggerAIDescription();
      }
    } else {
      // Save Catalog Item
      const newProd: Product = {
        id: `p_${Date.now()}`,
        name: prodSelectedName || prodDraftName || 'Premium Product Line',
        price: parseFloat(prodPrice) || 0,
        weight: parseFloat(prodWeight) || 0,
        description: prodAIDesc ? `${prodAIDesc.salesCopy}\n\nUpkeep: ${prodAIDesc.howToPreserve}` : prodKeywords,
        imageUrl: prodUploadedImages[0] || prodUploadedImage || undefined,
        imageUrls: prodUploadedImages.length > 0 ? prodUploadedImages : (prodUploadedImage ? [prodUploadedImage] : []),
        createdAt: new Date().toISOString()
      };

      await saveProductToCatalog(vendor.id, newProd);
      
      // Reset drafting variables
      setProdUploadedImage(null);
      setProdUploadedImages([]);
      setProdAIEnhanced(false);
      setProdAISettings(null);
      setProdDraftName('');
      setProdOptimizedNames([]);
      setProdSelectedName('');
      setProdPrice('');
      setProdWeight('');
      setProdKeywords('');
      setProdAIDesc(null);

      setPhase('catalog_summary');
      await updateProgressValue(5, 'catalog_summary');
    }
  };

  const handlePrevCatalogStep = () => {
    if (catalogStep > 1) {
      setCatalogStep(catalogStep - 1);
    } else {
      setPhase('profile');
      setCurrentStep(5);
    }
  };

  const finalizeStoreRegister = async () => {
    const fullyCompleted = {
      ...vendor,
      progress: 100,
      completed: true,
      updatedAt: new Date().toISOString(),
    };
    await saveVendorProfile(fullyCompleted);
    onComplete(fullyCompleted);
  };

  // File Upload Handlers (Logo & Banner)
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setLogoFile(event.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Non-landscape Crop-resizer trigger image select
  const handleCropImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCropFile(event.target.result as string);
          setAiBannerData({
            gradientStart: "#1E293B",
            gradientEnd: "#1A5B70",
            textColor: "#FFFFFF",
            welcomeSlogan: "Our Premium Storefront Collection"
          });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Automated Nano Banana Resizer and Alignment Engine (Invisible auto-converts images to exactly 600x325)
  const handleBannerSelectForNanoBanana = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64Url = event.target.result as string;
          setRawBannerFile(base64Url);
          setNanoBananaProcessing(true);
          setNanoBananaRedesigned(false);

          const img = new Image();
          img.src = base64Url;
          img.onload = () => {
            const w = img.width;
            const h = img.height;
            setNanoBananaOriginalDim({ w, h });

            // Create HTML5 Canvas for real-time pixel crop alignment
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 325;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const scale = Math.max(600 / w, 325 / h);
              const nw = w * scale;
              const nh = h * scale;
              const x = (600 - nw) / 2;
              const y = (325 - nh) / 2;

              ctx.drawImage(img, x, y, nw, nh);
              const redesignedDataUrl = canvas.toDataURL('image/png');

              setTimeout(() => {
                setAiBannerData({
                  gradientStart: "#1E293B",
                  gradientEnd: "#1A5B70",
                  textColor: "#FFFFFF",
                  welcomeSlogan: "Our Premium Storefront Collection",
                  appliedCrop: { scale: 100, x: 0, y: 0, image: redesignedDataUrl }
                });
                setVendor(prev => ({
                  ...prev,
                  bannerUrl: redesignedDataUrl
                }));
                setNanoBananaProcessing(false);
                setNanoBananaRedesigned(true);
              }, 1100);
            }
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset stock images galleries rotating every 3 seconds
  const stockLogos = [
    "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=150&q=80",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=150&q=80"
  ];

  const stockProducts = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=300&q=80"
  ];

  // Specific custom banner rendering based on requested templates (rotating indexing)
  const renderMiniatureBannerSlide = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-full h-full bg-[#FCF8E3] border border-amber-200 text-amber-900 p-3 flex flex-col justify-between transition-all duration-500 rounded-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-700">FirstPick Food Ventures</span>
            <div className="text-xs font-light">"Gari, Shito sauce, yellow organic elements"</div>
            <div className="h-1 w-12 bg-amber-600 rounded-full" />
          </div>
        );
      case 1:
        return (
          <div className="w-full h-full bg-[#EBF7EE] border border-green-200 text-green-900 p-3 flex flex-col justify-between transition-all duration-500 rounded-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-green-700">JRA Foodstuff Specialty</span>
            <div className="text-xs font-light">"Fresh tomato branches, yellow spices, green nature vibes"</div>
            <div className="h-1 w-12 bg-green-600 rounded-full" />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full bg-[#111827] border border-slate-800 text-white p-3 flex flex-col justify-between transition-all duration-500 rounded-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Abuja Car Stand</span>
            <div className="text-xs font-light text-slate-350">"Black G-Wagon, red Mercedes, yellow Lambo style"</div>
            <div className="h-1 w-12 bg-emerald-500 rounded-full" />
          </div>
        );
      default:
        return (
          <div className="w-full h-full bg-[#FAF5FF] border border-purple-200 text-purple-900 p-3 flex flex-col justify-between transition-all duration-500 rounded-xl">
            <span className="text-[10px] uppercase tracking-widest font-bold text-purple-700">Makolastores Giftshop (Mother's Day)</span>
            <div className="text-xs font-light">"Lavender backdrop with cosmetic tubes and bags"</div>
            <div className="h-1 w-12 bg-purple-500 rounded-full" />
          </div>
        );
    }
  };

  const getStepInstructionText = () => {
    if (phase === 'profile') {
      switch (currentStep) {
        case 1:
          return "Hello. I am Jude Cole. I am the Head of the Vendors Department at Makolastores. Let us start setting up your store. Please type your name and brand name below.";
        case 2:
          return "Excellent. Next, write down your contact email and phone number. I will use these to send your official vendor files.";
        case 3:
          return "Wonderful. We need a web link for your store. This is how buyers will find your shop online. Please type a link name, and I will show you recommendations.";
        case 4:
          return "Good. Please upload your company logo now. We will put this logo on your customer invoices. If you need inspiration, view the samples on the right.";
        case 5:
          return "Very good. Now we will style a beautiful minimalist banner for your store. Let our design tool, MakolaStores Ghana Autolayout Engine, synthesize a professional, high-status storefront background for you.";
        default:
          return "Let us continue to the next setup step.";
      }
    } else if (phase === 'catalog') {
      switch (catalogStep) {
        case 1:
          return "Let us add a product to your catalogue. Please upload a clear photo of the item.";
        case 2:
          return "Great photo. What is the name of this product? Write a basic title. I will suggest optimized search terms so more buyers discover your page.";
        case 3:
          return "Excellent. How many US Dollars do you want to charge for this product? Set a price that matches the premium quality.";
        case 4:
          return "Okay. How heavy is this item in kilograms? Our logistics partners need to know the mass to estimate shipping rates.";
        case 5:
          return "Almost done. Type a few simple keywords about this product. I will immediately write a clean sales description and care guide for your store.";
        default:
          return "Let us save this item to your catalogue.";
      }
    } else {
      return "Your storefront is now ready. Click the publish button below. It will open your professional digital store.";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 select-none relative bg-transparent text-slate-800">
      
      {/* High precision step sub-header with visual progression indicators */}
      <div className="mb-8 p-5 bg-white border border-slate-200/60 rounded-3xl shadow-sm flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#1A5B70]">
            ONBOARDING STATION
          </span>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-0.5">
            {phase === 'profile' ? `Phase I • Building Profile Brand` : `Phase II • Cataloging Merchandises`}
          </h2>
        </div>

        {/* Dynamic Nodes progress rail */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[1,2,3,4,5].map((step) => {
            const isActive = phase === 'profile' ? currentStep === step : catalogStep === step;
            const isCompleted = phase === 'profile' ? currentStep > step : catalogStep > step;
            return (
              <div key={step} className="flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full font-mono text-xs font-bold font-semibold flex items-center justify-center border transition-all ${
                  isActive 
                    ? 'bg-[#1A5B70] text-white border-[#1A5B70] shadow-sm' 
                    : isCompleted 
                      ? 'bg-[#1A5B70]/10 text-[#1A5B70] border-[#1A5B70]/30' 
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : step}
                </div>
                {step < 5 && <div className={`w-4 h-0.5 ${isCompleted ? 'bg-[#1A5B70]' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Setup Module, Right Jude Companion Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFTHAND: SETUP COMPONENT CARD */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-[2rem] shadow-xl p-6 md:p-8 relative">
          
          {/* Conversational Balloon representing interactive department head dialogue */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-4 items-start select-none mb-6">
            <div className="w-10 h-10 rounded-full bg-[#1A5B70] text-white flex items-center justify-center font-bold tracking-tight text-xs font-mono shrink-0 shadow-sm border border-white/20">
              JC
            </div>
            <div className="space-y-1">
              <span className="block text-[8px] font-mono uppercase tracking-widest text-[#1A5B70] font-extrabold">
                Jude Cole • Head of Vendors Department
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                <TypewriterText text={getStepInstructionText()} speed={12} />
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* Phase 1 steps */}
            {phase === 'profile' && (
              <motion.div
                key={`p1_step_${currentStep}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-md font-bold text-slate-900 uppercase font-mono tracking-wider">
                    {currentStep === 1 && <TypewriterText text="Tell us who you are" />}
                    {currentStep === 2 && <TypewriterText text="Your email and phone" />}
                    {currentStep === 3 && <TypewriterText text="Choose your shop link" />}
                    {currentStep === 4 && <TypewriterText text="Upload your shop logo" />}
                    {currentStep === 5 && <TypewriterText text="Set your storefront banner" />}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-200 px-3.5 py-1 rounded text-slate-500">
                    Progress: {vendor.progress}%
                  </span>
                </div>

                {/* STEP 1: Identity */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Business Brand Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: Contacts */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Authorized Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-slate-400" size={16} />
                        <input
                          type="email"
                          placeholder="owner@boutique.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm text-slate-800"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Contact Phone (International)</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={16} />
                        <input
                          type="tel"
                          placeholder="+233 24 123 4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Domain */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Premium Domain Name</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-3.5 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="e.g., africanmall"
                          value={domainQuery}
                          onChange={(e) => setDomainQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm font-semibold text-slate-800"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Typing triggers automatic AI availability and marketability audits.</span>
                    </div>

                    {/* Suggestions list */}
                    <div className="pt-2">
                      <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">AI Suggestions Matrix</span>
                      {loadingAI ? (
                        <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-50 rounded-xl border">
                          Jude Cole is auditing domains...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {domainSuggestions.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDomainQuery(s.domain)}
                              className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-[#1A5B70]/5 hover:border-[#1A5B70]/30 transition-all flex justify-between items-center"
                            >
                              <div>
                                <span className="block font-mono text-xs font-bold text-slate-850">{s.domain}</span>
                                <span className="block text-[10px] text-slate-400 font-light mt-0.5">{s.reason}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded font-mono">
                                Match Score: {s.score}/10
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: Logo Upload with changing stock photography carousels */}
                {currentStep === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Left: upload drag drop block */}
                    <div className="md:col-span-7 space-y-4">
                      <span className="block text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">Upload Logo asset</span>
                      
                      <div 
                        onDragEnter={() => setIsLogoDragging(true)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={() => setIsLogoDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsLogoDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setLogoFile(ev.target.result as string);
                            };
                            reader.readAsDataURL(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed p-8 rounded-2xl text-center transition-all flex flex-col items-center justify-center ${
                          isLogoDragging ? 'border-[#1A5B70] bg-[#1A5B70]/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="file"
                          id="logo_file_input"
                          accept="image/*"
                          onChange={handleLogoSelect}
                          className="hidden"
                        />
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <label 
                          htmlFor="logo_file_input"
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          Select Image
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2 font-light">Supports PNG, SVG, JPG. Drag & Drop directly.</p>
                      </div>

                      {logoFile && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-3">
                            <img src={logoFile} alt="Logo preview" className="w-10 h-10 rounded border object-contain bg-white" referrerPolicy="no-referrer" />
                            <span className="text-xs font-mono text-slate-500">Logo registered</span>
                          </div>
                          <button onClick={() => setLogoFile(null)} className="text-xs font-bold text-red-500 hover:underline">Change</button>
                        </div>
                      )}
                    </div>

                    {/* Right: rotating stock photogaphy logos slide */}
                    <div className="md:col-span-5 p-4 bg-[#1A5B70]/5 border border-[#1A5B70]/10 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Logo Inspirations</span>
                        <p className="text-[10px] text-slate-500 font-light mt-1">Changes every 3s to spark your vision:</p>
                      </div>

                      <div className="my-6 flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl relative overflow-hidden h-24 shadow-sm">
                        <motion.img 
                          key={rotatingIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          src={stockLogos[rotatingIndex]} 
                          alt="Inspirational logo" 
                          className="h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <span className="text-[8px] font-mono text-slate-400 text-center block">Securely optimized for transparent vector formats.</span>
                    </div>

                  </div>
                )}
                              {/* STEP 5: Banner Option, crop resizer, or AI schema */}
                {currentStep === 5 && (() => {
                  const questionsList = [
                    {
                      id: 'aesthetic',
                      title: "1. Brand Aesthetic Style",
                      question: "What theme vibe describes your boutique storefront?",
                      suggestions: ["Minimal Luxury", "Vibrant African Contemporary", "Cyberpunk Techwear", "Organic Earthy Artisanal", "Classic Heritage Premium"]
                    },
                    {
                      id: 'focus',
                      title: "2. Hero Product Focus",
                      question: "What is your main flagship product category?",
                      suggestions: ["High-Status Kente & Apparel", "Organic African Skincare", "Signature Roasted Beans", "Handcrafted Beads & Gems", "Sleek Bespoke Furniture"]
                    },
                    {
                      id: 'colors',
                      title: "3. Core Brand Color Palette",
                      question: "Which luxury color harmony fits your brand?",
                      suggestions: ["Royal Teal & Sunset Copper", "Imperial Gold & Slate Obsidian", "Vintage Ivory & Forest Olive", "Hot Pepper Red & Charcoal Jet", "Midnight Indigo & Stardust Gold"]
                    },
                    {
                      id: 'sentiment',
                      title: "4. Target Customer Sentiment",
                      question: "How should customers feel when opening your storefront?",
                      suggestions: ["Prestigious & Elite", "Warm, Welcoming & Friendly", "Sleek, Modern & High-Tech", "Inspired & Culturally Connected", "Artistic & Bold"]
                    },
                    {
                      id: 'slogan',
                      title: "5. Brand Narrative Slogan",
                      question: "What's the core promise or catchphrase of your boutique?",
                      suggestions: ["Crafted for the Discerning", "Tradition Reimagined Daily", "The Absolute Best in Every Piece", "Sustainably Sourced Luxury", "Uncompromising Elegance"]
                    },
                    {
                      id: 'pattern',
                      title: "6. Background Pattern Concept",
                      question: "What subtle visual background accent do you prefer?",
                      suggestions: ["Subtle Geometric Lines", "Elegant Abstract Radial Gradient", "African Wax Print Motifs", "Minimal Polka Dots & Clean Curves", "Futuristic Tech Grid"]
                    }
                  ];

                  const currentQ = questionsList[activeQuestionIdx];

                  return (
                    <div className="space-y-6">
                      <span className="block text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">Storefront Banner System</span>
                      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Do you have custom banner artwork for your boutique?</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CARD 1: Yes, upload artwork */}
                        <button
                          type="button"
                          onClick={() => {
                            setBannerOption('upload');
                            setRawBannerFile(null);
                            setNanoBananaOriginalDim(null);
                            setNanoBananaRedesigned(false);
                          }}
                          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between h-36 outline-none ${
                            bannerOption === 'upload' 
                              ? 'border-[#1A5B70] bg-[#1A5B70]/5 shadow-md ring-1 ring-[#1A5B70]' 
                              : 'border-slate-200 dark:border-neutral-800 hover:border-slate-350 dark:hover:border-neutral-700 bg-white dark:bg-[#121214]'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className={`p-2 rounded-xl ${bannerOption === 'upload' ? 'bg-[#1A5B70] text-white' : 'bg-slate-150 dark:bg-neutral-800 text-slate-650'}`}>
                              <Upload size={18} />
                            </span>
                            {bannerOption === 'upload' && <span className="text-[10px] font-mono text-[#1A5B70] font-bold uppercase tracking-wider">Active</span>}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100">Yes, I have artwork</h4>
                            <p className="text-xs text-slate-500 font-light mt-1">Upload your file and let Jude's Graphics Engine alignment-conform it.</p>
                          </div>
                        </button>

                        {/* CARD 2: No, generate layout */}
                        <button
                          type="button"
                          onClick={() => {
                            setBannerOption('ai');
                          }}
                          className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between h-36 outline-none ${
                            bannerOption === 'ai' 
                              ? 'border-[#1A5B70] bg-[#1A5B70]/5 shadow-md ring-1 ring-[#1A5B70]' 
                              : 'border-slate-200 dark:border-neutral-800 hover:border-slate-350 dark:hover:border-neutral-700 bg-white dark:bg-[#121214]'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className={`p-2 rounded-xl ${bannerOption === 'ai' ? 'bg-[#1A5B70] text-white' : 'bg-slate-150 dark:bg-neutral-800 text-slate-655'}`}>
                              <Sparkles size={18} />
                            </span>
                            {bannerOption === 'ai' && <span className="text-[10px] font-mono text-[#1A5B70] font-bold uppercase tracking-wider">Active</span>}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-855 dark:text-slate-100">No, help me design one</h4>
                            <p className="text-xs text-slate-500 font-light mt-1">Answer 6 branding questions to synthesize high-status backgrounds via Gemini.</p>
                          </div>
                        </button>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-neutral-800">
                        {bannerOption === 'upload' ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Upload Existing Artwork</h4>
                                <p className="text-xs text-slate-500 font-light mt-0.5">We support PNG or JPG format. It will be alignment-formatted to 600x325 px.</p>
                              </div>
                              
                              <input 
                                type="file" 
                                id="cropper_file_input_nano" 
                                accept="image/*" 
                                onChange={handleBannerSelectForNanoBanana} 
                                className="hidden" 
                              />
                              <label 
                                htmlFor="cropper_file_input_nano"
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95 shadow transition-all flex items-center gap-2"
                              >
                                <Upload size={14} />
                                Select Image File
                              </label>
                            </div>

                            {nanoBananaProcessing && (
                              <div className="p-6 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
                                <RefreshCw size={22} className="text-[#1A5B70] animate-spin" />
                                <div className="space-y-1 text-center">
                                  <span className="block text-xs font-mono text-slate-600 dark:text-slate-300 font-bold">MakolaStores Engine Engaged</span>
                                  <span className="block text-[10px] text-slate-400 font-mono">Analyzing, aligning, and auto-redesigning to 600 x 325 pixels...</span>
                                </div>
                              </div>
                            )}

                            {nanoBananaRedesigned && !nanoBananaProcessing && aiBannerData?.appliedCrop?.image && (
                              <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-950/60 rounded-2xl flex items-start gap-3">
                                  <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                  <div className="space-y-1">
                                    <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-400">MakolaStores Layout Alignment Complete</span>
                                    {nanoBananaOriginalDim && (
                                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400/90 font-mono">
                                        Raw Dimensions: {nanoBananaOriginalDim.w} x {nanoBananaOriginalDim.h} px. Resized cleanly to 600 x 325 px.
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-slate-900 max-w-[450px] mx-auto shadow-sm">
                                  <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[8px] font-mono tracking-widest py-1 px-2.5 rounded-full uppercase font-bold z-10">
                                    Automated Output: 600 x 325 px
                                  </span>
                                  <img 
                                    src={aiBannerData.appliedCrop.image} 
                                    alt="Automated Redesigned Banner" 
                                    className="w-full object-cover aspect-[600/325] block font-sans"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* AI CUSTOM SYNTHETIZER WITH INTERACTIVE 6-STEP SIDEBAR */
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Interactive Questionnaire Left Column */}
                            <div className="lg:col-span-7 space-y-4 bg-slate-50 dark:bg-[#121214] p-5 rounded-2xl border border-slate-200/60 dark:border-neutral-800/80">
                              
                              {/* QUESTION NAVIGATION NODES */}
                              <div className="grid grid-cols-6 gap-1.5 pt-1">
                                {questionsList.map((_, idx) => (
                                  <div 
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                      idx === activeQuestionIdx 
                                        ? "bg-amber-500 shadow-[0_0_8px_#F59E0B]" 
                                        : idx < activeQuestionIdx 
                                          ? "bg-emerald-500" 
                                          : "bg-slate-200 dark:bg-neutral-800"
                                    }`}
                                  />
                                ))}
                              </div>

                              <div className="pt-2">
                                <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-amber-505 bg-amber-500/10 px-2 py-0.5 rounded leading-none">
                                  {currentQ.title}
                                </span>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 leading-snug">
                                  {currentQ.question}
                                </h4>
                              </div>

                              {/* Autosuggest Alternative Answer Pill Sidebar / Column */}
                              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                                <span className="block text-[8px] font-mono text-slate-400 dark:text-neutral-500 uppercase tracking-widest font-extrabold">Suggested Answers</span>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {currentQ.suggestions.map((suggestion) => {
                                    const isSelected = bannerAnswers[currentQ.id as keyof typeof bannerAnswers] === suggestion;
                                    return (
                                      <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => {
                                          setBannerAnswers(prev => ({ ...prev, [currentQ.id]: suggestion }));
                                          if (activeQuestionIdx < 5) {
                                            setActiveQuestionIdx(activeQuestionIdx + 1);
                                          }
                                        }}
                                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-all border outline-none active:scale-[0.99] ${
                                          isSelected 
                                            ? "bg-gradient-to-r from-[#1A5B70]/10 to-[#1A5B70]/15 border-[#1A5B70] text-[#1A5B70] dark:text-teal-400 font-bold shadow-xs" 
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-neutral-800 text-slate-650 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-850"
                                        }`}
                                      >
                                        {suggestion}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Manual Input field for precise custom curation */}
                              <div className="pt-1">
                                <span className="block text-[8px] font-mono text-slate-400 dark:text-neutral-500 uppercase tracking-widest font-extrabold mb-1">Define Custom Curation</span>
                                <input
                                  type="text"
                                  value={bannerAnswers[currentQ.id as keyof typeof bannerAnswers]}
                                  onChange={(e) => setBannerAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                                  placeholder={`Type custom ${currentQ.id}...`}
                                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-neutral-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-slate-800 dark:text-slate-100 font-medium font-sans"
                                />
                              </div>

                              {/* Wizard Prev/Next Control triggers */}
                              <div className="flex gap-2 justify-between items-center pt-2 border-t border-slate-200/50 dark:border-neutral-800/40">
                                <button
                                  type="button"
                                  disabled={activeQuestionIdx === 0}
                                  onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                                  className="px-3 py-1.5 border border-slate-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-850 rounded-xl text-[9px] font-extrabold text-slate-500 disabled:opacity-30 uppercase transition-all flex items-center gap-1 active:scale-95"
                                >
                                  <ArrowLeft size={10} /> Back
                                </button>
                                
                                <span className="text-[9px] font-mono text-slate-400 dark:text-neutral-500 select-none">
                                  Option {activeQuestionIdx + 1} of 6
                                </span>

                                <button
                                  type="button"
                                  disabled={activeQuestionIdx === 5}
                                  onClick={() => setActiveQuestionIdx(prev => Math.min(5, prev + 1))}
                                  className="px-3 py-1.5 border border-slate-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-850 rounded-xl text-[9px] font-extrabold text-slate-500 disabled:opacity-30 uppercase transition-all flex items-center gap-1 active:scale-95"
                                >
                                  Next <ArrowRight size={10} />
                                </button>
                              </div>

                              {/* Large synthesis trigger button */}
                              <button
                                type="button"
                                onClick={() => triggerAIBanner(bannerAnswers)}
                                className="w-full mt-3 py-3 px-5 bg-gradient-to-r from-[#1A5B70] to-[#2E8B57] hover:from-[#1A5B70]/90 hover:to-[#2E8B57]/90 text-white text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                <Sparkles size={13} className="animate-pulse text-amber-300" />
                                Synthesize Custom Design Layout
                              </button>
                            </div>

                            {/* Storefront Layout Live Preview Column */}
                            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <span className="block text-[8px] font-mono text-slate-450 dark:text-neutral-500 uppercase tracking-widest font-extrabold">Active Layout Synthesis Preview</span>
                                
                                {loadingAI ? (
                                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 bg-white dark:bg-slate-900/40 h-44 flex flex-col items-center justify-center text-center p-4 animate-pulse shadow-sm">
                                    <Sparkles size={18} className="text-amber-500 animate-bounce mb-2" />
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-neutral-400">Jude's Graphics Studio</span>
                                    <p className="text-[9px] text-slate-400 dark:text-neutral-500 mt-1 max-w-[170px]">Compiling aesthetic ratios and drafting patterns via Gemini core...</p>
                                  </div>
                                ) : aiBannerData ? (
                                  <div 
                                    className="rounded-2xl p-4 flex flex-col justify-between h-44 border shadow-md relative overflow-hidden transition-all duration-500"
                                    style={{
                                      background: `linear-gradient(135deg, ${aiBannerData.gradientStart}, ${aiBannerData.gradientEnd})`,
                                      color: aiBannerData.textColor || '#FFFFFF',
                                      borderColor: `${aiBannerData.gradientEnd}30`
                                    }}
                                  >
                                    {/* Dynamic Premium Pattern Overlay rendering (Nvidia / Antigravity style) */}
                                    {aiBannerData.patternType === 'waves' && (
                                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: aiBannerData.patternOpacity || 0.12 }} xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 40 C 150 100, 350 0, 600 40 T 1200 40" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="1.5" />
                                        <path d="M0 60 C 120 120, 380 20, 600 80 T 1200 85" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="1" strokeDasharray="5,5" />
                                        <path d="M0 80 C 180 60, 320 110, 600 50 T 1200 60" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.5" />
                                      </svg>
                                    )}
                                    {aiBannerData.patternType === 'circles' && (
                                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: aiBannerData.patternOpacity || 0.1 }} xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="20%" cy="40%" r="45" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="1" />
                                        <circle cx="20%" cy="40%" r="75" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.5" strokeDasharray="3,3" />
                                        <circle cx="85%" cy="75%" r="60" fill="none" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.75" />
                                      </svg>
                                    )}
                                    {aiBannerData.patternType === 'lines' && (
                                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: aiBannerData.patternOpacity || 0.12 }} xmlns="http://www.w3.org/2000/svg">
                                        <line x1="0" y1="0" x2="600" y2="300" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.75" />
                                        <line x1="100" y1="-50" x2="700" y2="250" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.5" strokeDasharray="10,5" />
                                        <line x1="-100" y1="50" x2="500" y2="350" stroke={aiBannerData.textColor || "#FFFFFF"} strokeWidth="0.5" />
                                      </svg>
                                    )}
                                    {aiBannerData.patternType === 'grid' && (
                                      <div className="absolute inset-0 pointer-events-none" style={{
                                        backgroundImage: `radial-gradient(${aiBannerData.textColor || "#FFFFFF"}20 1px, transparent 1px)`,
                                        backgroundSize: '15px 15px',
                                        opacity: aiBannerData.patternOpacity || 0.15
                                      }} />
                                    )}
                                    {aiBannerData.patternType === 'dots' && (
                                      <div className="absolute inset-0 pointer-events-none" style={{
                                        backgroundImage: `radial-gradient(circle, ${aiBannerData.textColor || "#FFFFFF"}30 2px, transparent 2px)`,
                                        backgroundSize: '24px 24px',
                                        opacity: aiBannerData.patternOpacity || 0.12
                                      }} />
                                    )}

                                    <div className="flex justify-between items-start">
                                      {logoFile ? (
                                        <img 
                                          src={logoFile} 
                                          alt="Brand Logo" 
                                          className="w-8 h-8 rounded-full bg-white object-contain border p-0.5 shadow-xs" 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black border border-white/20 select-none">
                                          {businessName ? businessName.charAt(0) : "M"}
                                        </div>
                                      )}
                                      <span className="text-[7px] font-mono uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded backdrop-blur-xs font-bold">
                                        {bannerAnswers.aesthetic}
                                      </span>
                                    </div>

                                    <div className="space-y-1 mt-auto">
                                      <h5 className="text-[12px] font-black tracking-tight uppercase leading-none">{businessName || "Your Boutique"}</h5>
                                      <p className="text-[8px] opacity-90 font-light leading-snug line-clamp-2 max-w-[280px]">
                                        {aiBannerData.welcomeSlogan || `Welcome to ${businessName}. Professional cataloging hubs established.`}
                                      </p>
                                      
                                      <div className="pt-1.5 select-none pointer-events-none">
                                        <button 
                                          type="button"
                                          className="px-2.5 py-1 font-mono text-[7px] font-bold tracking-widest uppercase rounded-lg shadow-xs border transition-all"
                                          style={{ 
                                            backgroundColor: aiBannerData.textColor || '#FFFFFF', 
                                            color: aiBannerData.gradientStart || '#0F172A',
                                            borderColor: aiBannerData.textColor || '#FFFFFF'
                                          }}
                                        >
                                          {aiBannerData.ctaText || "Explore Boutique"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 bg-white dark:bg-slate-900/60 h-44 flex flex-col items-center justify-center text-center p-4">
                                    <span className="text-slate-350"><ImageIcon size={18} className="text-slate-300" /></span>
                                    <p className="text-[10px] text-slate-400 mt-1">Select option values and click synthesize to load.</p>
                                  </div>
                                )}
                              </div>

                              <div className="p-3.5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-neutral-800/80">
                                <span className="block text-[8px] font-mono text-[#1A5B70] dark:text-teal-450 uppercase tracking-widest font-extrabold">Professional Design standard</span>
                                <p className="text-[9px] text-slate-500 dark:text-neutral-450 font-light mt-1 leading-relaxed">
                                  MakolaStores graphics system locks brand backdrops at strict high contrast ratios. Gradient overlays are dynamically compiled so typography is readable.
                                </p>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Foot Navigation phase 1 */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevProfileStep}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-mono font-bold"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextProfileStep}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/90 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow active:scale-95 transition-all"
                  >
                    Next Step <ArrowRight size={13} />
                  </button>
                </div>

              </motion.div>
            )}

            {/* Phase 2 steps */}
            {phase === 'catalog' && (
              <motion.div
                key={`p2_step_${catalogStep}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                
                <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#F05A28] font-bold">Phase II • Add Products</span>
                    <h3 className="text-md font-bold text-slate-900 uppercase font-mono tracking-wider mt-0.5">
                      {catalogStep === 1 && <TypewriterText text="Add a product photo" />}
                      {catalogStep === 2 && <TypewriterText text="Give your product a name" />}
                      {catalogStep === 3 && <TypewriterText text="Set your product price" />}
                      {catalogStep === 4 && <TypewriterText text="Set your product weight" />}
                      {catalogStep === 5 && <TypewriterText text="Review product details" />}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-200 px-3.5 py-1 rounded text-slate-500">
                    Step {catalogStep}/5
                  </span>
                </div>

                {/* CATALOG STEP 1: Product Image with stock carousels */}
                {catalogStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    <div className="md:col-span-7 space-y-4">
                      <span className="block text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">Product Photography</span>
                      <p className="text-xs text-slate-500 font-light mt-0.5">Please upload product photos. You can select multiple files to represent different angles.</p>
                      
                      <input 
                        type="file" 
                        id="product_photo_input" 
                        accept="image/*" 
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const filesArray: File[] = [];
                            for (let i = 0; i < e.target.files.length; i++) {
                              const f = e.target.files.item(i);
                              if (f) filesArray.push(f);
                            }
                            const loadedImages: string[] = [];
                            
                            filesArray.forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  const base64 = ev.target.result as string;
                                  loadedImages.push(base64);
                                  if (loadedImages.length === filesArray.length) {
                                    setProdUploadedImages(prev => [...prev, ...loadedImages]);
                                    setProdUploadedImage(loadedImages[0]);
                                  }
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="product_photo_input"
                        className="inline-block px-5 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold active:scale-95 shadow-md cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Upload Photos (Multiple)
                      </label>

                      {prodUploadedImages.length > 0 && (
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Uploaded Boutique Pictures ({prodUploadedImages.length})</span>
                          
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                            {prodUploadedImages.map((imgUrl, idx) => (
                              <div key={`prod_img_${idx}`} className="relative border border-slate-200 bg-white rounded-xl overflow-hidden aspect-square flex items-center justify-center p-1 group shadow-xs">
                                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = prodUploadedImages.filter((_, i) => i !== idx);
                                    setProdUploadedImages(updated);
                                    if (updated.length > 0) {
                                      setProdUploadedImage(updated[0]);
                                    } else {
                                      setProdUploadedImage(null);
                                    }
                                  }}
                                  className="absolute inset-0 bg-red-650 text-white font-mono font-bold text-[8px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all uppercase tracking-wider"
                                >
                                  Remove
                                </button>
                                {idx === 0 && (
                                  <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white font-mono font-semibold text-[7px] px-1.5 py-0.5 rounded uppercase leading-none">
                                    Primary
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                            <button
                              type="button"
                              onClick={triggerAIEnhancedImage}
                              className="px-3.5 py-2 bg-slate-900 text-white text-[10px] font-mono font-bold uppercase rounded-lg shadow-sm flex items-center gap-1 active:scale-95 hover:bg-slate-800 transition-all"
                            >
                              <Sparkles size={11} className="text-amber-400" /> AI Studio Light Refactor (All photos)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProdUploadedImages([]);
                                setProdUploadedImage(null);
                              }}
                              className="text-xs text-red-500 hover:underline px-2"
                            >
                              Clear All
                            </button>
                          </div>

                          {prodAIEnhanced && (
                            <span className="block text-[10px] text-green-650 font-bold font-sans">
                              ✨ AI Studio background balance applied to your collection successfully!
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stock photo gallery flipping */}
                    <div className="md:col-span-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between h-48">
                      <div>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest font-bold">Standard SKU Shots</span>
                        <p className="text-[10px] text-slate-500 font-light mt-1">Standard visual catalog layouts:</p>
                      </div>

                      <div className="my-2 h-20 overflow-hidden relative rounded-xl border bg-white flex items-center justify-center p-2">
                        <motion.img 
                          key={rotatingIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          src={stockProducts[rotatingIndex]} 
                          alt="Product slide" 
                          className="h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <span className="text-[8px] font-mono text-slate-400 text-center block">Slight margin shadows yield premium focus</span>
                    </div>

                  </div>
                )}

                {/* CATALOG STEP 2: Name suggestions query */}
                {catalogStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Draft Product Title</label>
                      <input
                        type="text"
                        placeholder="e.g., leather shoes"
                        value={prodDraftName}
                        onChange={(e) => setProdDraftName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={triggerAIProductNameList}
                      className="px-4 py-2 bg-[#1A5B70] text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5 active:scale-95"
                    >
                      Optimize Search Names
                    </button>

                    {loadingAI ? (
                      <div className="p-4 text-center text-xs font-mono text-slate-400 bg-slate-50 border rounded-xl animate-pulse">Jude is writing optimized titles...</div>
                    ) : prodOptimizedNames.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Optimized Recommendations</span>
                        {prodOptimizedNames.map((o, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setProdSelectedName(o.name);
                              setProdDraftName(o.name);
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${
                              prodSelectedName === o.name 
                                ? 'bg-[#1A5B70]/10 border-[#1A5B70] text-[#1A5B70]' 
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            <div>
                              <span className="block text-xs font-bold font-mono">{o.name}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">{o.style}</span>
                            </div>
                            <span className="text-[10px] uppercase font-mono font-bold font-medium">Select Option</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* CATALOG STEP 3: Simple Price tags */}
                {catalogStep === 3 && (
                  <div>
                    <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">SKU Price ($ USD)</label>
                    <div className="relative max-w-sm">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        placeholder="29.99"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:ring-1 focus:ring-[#1A5B70] focus:outline-none rounded-xl text-sm font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* CATALOG STEP 4: Logistics kg mass cargo calculator */}
                {catalogStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">Physical Mass Cargo Fee (KG)</label>
                        <button 
                          type="button" 
                          onMouseEnter={() => setShowWeightTooltip(true)}
                          onMouseLeave={() => setShowWeightTooltip(false)}
                          onClick={() => setShowWeightTooltip(!showWeightTooltip)}
                          className="text-slate-400 hover:text-slate-650"
                        >
                          <HelpIcon size={14} className="animate-pulse" />
                        </button>
                      </div>

                      <div className="relative max-w-sm">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-mono font-bold">KG</span>
                        <input
                          type="number"
                          placeholder="1.25"
                          value={prodWeight}
                          onChange={(e) => setProdWeight(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:ring-1 focus:ring-[#1A5B70] focus:outline-none rounded-xl text-sm font-mono font-bold"
                        />
                      </div>

                      <AnimatePresence>
                        {showWeightTooltip && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-3 bg-[#1A5B70]/5 border border-[#1A5B70]/10 rounded-xl text-[11px] text-[#1A5B70] max-w-md leading-relaxed"
                          >
                            Jude's Cargo Guide: Please enter the weight in kilograms. Shipping fees are calculated at two dollars and fifty cents per key-low-gram. Give your best guess.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="p-4 bg-slate-55 text-xs text-slate-500 rounded-xl border font-light space-y-1.5">
                      <span className="block font-mono font-bold text-[9px] uppercase tracking-wider text-slate-400 mb-1">Standard Mass Reference Weights</span>
                      <p>● T-Shirt / Dress: <code>0.20 kg</code></p>
                      <p>● Running Shoes: <code>0.75 kg</code></p>
                      <p>● Heavy Leather Jacket: <code>1.50 kg</code></p>
                    </div>
                  </div>
                )}

                {/* CATALOG STEP 5: AI Description */}
                {catalogStep === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">Product Keywords / Key Highlights</label>
                      <textarea
                        rows={3}
                        placeholder="e.g., natural cotton, breathable mesh, durable rubber soles"
                        value={prodKeywords}
                        onChange={(e) => setProdKeywords(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1A5B70] focus:outline-none rounded-xl text-sm text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={triggerAIDescription}
                      className="px-5 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow uppercase tracking-wider inline-flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Sparkles size={13} className="text-amber-500" /> Optimize Sales prospectus
                    </button>

                    {loadingAI ? (
                      <div className="p-4 text-center text-xs font-mono text-slate-400 animate-pulse bg-slate-50 border rounded-xl">Jude Cole is writing simple details for your store...</div>
                    ) : prodAIDesc && (
                      <div className="p-4 bg-slate-50 border border-green-250 rounded-2xl space-y-3 font-sans text-xs">
                        <span className="block text-[8px] font-mono text-green-700 uppercase tracking-widest font-extrabold text-teal-800">Your product description is ready</span>
                        
                        <div>
                          <span className="block font-bold text-slate-900">High-converting sales copy</span>
                          <p className="text-slate-600 leading-relaxed font-light mt-0.5">{prodAIDesc.salesCopy}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <span className="block font-bold text-slate-900">How to care / Use instructions</span>
                          <p className="text-slate-600 leading-relaxed font-light mt-0.5">{prodAIDesc.howToUse || prodAIDesc.howToPreserve}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation foot Phase 2 */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevCatalogStep}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-mono font-bold"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCatalogStep}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/90 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow active:scale-95 transition-all"
                  >
                    Next SKU Dimension <ArrowRight size={13} />
                  </button>
                </div>

              </motion.div>
            )}

            {/* Catalog Summary View */}
            {phase === 'catalog_summary' && (
              <motion.div
                key="catalog_summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                
                <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                      Phase II Completed
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">Catalog Summary Overview</h3>
                  </div>
                  <span className="text-xs bg-slate-100 px-3 py-1 rounded text-slate-500 font-mono font-bold">
                    Total SKUs: {productsList.length}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">Active Onboard Space</span>
                    <h4 className="text-sm font-bold text-slate-900">{firstName} {lastName} • {businessName}</h4>
                  </div>
                  <button
                    onClick={() => {
                      setPhase('catalog');
                      setCatalogStep(1);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    + Catalog Another Item
                  </button>
                </div>

                {/* Products registered table */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  {productsList.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400 italic bg-white">No items registered in catalog.</p>
                  ) : (
                    productsList.map((p) => (
                      <div key={p.id} className="p-4 flex items-center gap-4 bg-white hover:bg-slate-50 transition-colors">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded border bg-slate-50 object-contain p-1 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-150 flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                        <div>
                          <h5 className="font-bold text-xs text-slate-800">{p.name}</h5>
                          <span className="block font-mono text-xs font-extrabold text-[#F05A28] mt-0.5">${p.price}</span>
                          <span className="block text-[9px] text-slate-400 font-mono">Mass: {p.weight} kg</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Final step buttons */}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('catalog');
                      setCatalogStep(5);
                    }}
                    className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-mono"
                  >
                    Back to Catalog Draft
                  </button>
                  <button
                    type="button"
                    onClick={finalizeStoreRegister}
                    className="flex-1 py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/95 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Publish My Storefront <ArrowRight size={13} />
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

        {/* RIGHTHAND: HIGH-FIDELITY STOREFRONT PASSPORT & BANNER PREVIEW */}
        <div className="lg:col-span-4 space-y-6 sticky top-20">
          
          <div className="bg-white border border-slate-200/90 rounded-[2rem] shadow-lg overflow-hidden flex flex-col p-6 space-y-6">
            <div className="pb-4 border-b border-rose-100/50 flex justify-between items-center">
              <div>
                <span className="block text-[8px] font-mono uppercase tracking-widest text-[#1A5B70] font-bold">MAKOLASTORES PASSPORT</span>
                <h4 className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">Live Storefront Progress</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-mono font-bold uppercase border border-emerald-200">
                ACTIVE
              </span>
            </div>

            {/* MOCK ADDRESS LINK */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 font-mono text-slate-600">
              <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">DESIRED WEB PATH</span>
              <div className="flex items-center gap-1.5 text-[11px] select-all font-semibold break-all text-slate-700">
                <Globe size={11} className="text-[#1A5B70] shrink-0" />
                <span>makolastores.com/{domainQuery || "your-brand"}</span>
              </div>
            </div>

            {/* LIVE THEME BANNER PREVIEW WITH BRAND BUTTON (MakolaStores graphics showcase) */}
            <div className="space-y-2">
              <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-400 font-extrabold">MAKOLASTORES STYLING SCHEME PREVIEW</span>
              
              {aiBannerData ? (
                <div 
                  className="rounded-2xl p-4 flex flex-col justify-between h-40 border shadow-md relative overflow-hidden transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${aiBannerData.gradientStart}, ${aiBannerData.gradientEnd})`,
                    color: aiBannerData.textColor || '#FFFFFF'
                  }}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-md" />
                  
                  {/* Brand logo image or text symbol inside preview */}
                  {logoFile ? (
                    <img 
                      src={logoFile} 
                      alt="Brand Emblem" 
                      className="w-10 h-10 rounded-full bg-white object-contain border p-0.5 mb-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold font-mono border border-white/20 select-none">
                      {businessName ? businessName.charAt(0).toUpperCase() : "M"}
                    </div>
                  )}

                  <div className="space-y-1 mt-auto">
                    <h5 className="text-[13px] font-black tracking-tight">{businessName || "Your Store"}</h5>
                    <p className="text-[9px] opacity-90 line-clamp-2 font-light leading-snug">{aiBannerData.welcomeSlogan || "A Premium Storefront Selection."}</p>
                    
                    {/* Professional, high contrast clear CTA button as requested */}
                    <div className="pt-2">
                      <button 
                        type="button"
                        className="px-3.5 py-1.5 font-mono text-[8px] font-bold tracking-widest uppercase rounded-lg shadow-sm border transition-shadow hover:shadow-md cursor-default"
                        style={{ 
                          backgroundColor: aiBannerData.textColor || '#FFFFFF', 
                          color: aiBannerData.gradientStart || '#0F172A',
                          borderColor: aiBannerData.textColor || '#FFFFFF'
                        }}
                      >
                        {aiBannerData.ctaText || "Shop Collection"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 h-40 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xl text-slate-350"><ImageIcon size={20} className="text-slate-300" /></span>
                  <p className="text-[10px] text-slate-400 font-light mt-1 max-w-[180px]">Gradient banner and clear action buttons will synthesize automatically on step 5.</p>
                </div>
              )}
            </div>

            {/* DRAFT MERCHANDISE RECAP */}
            <div className="space-y-2">
              <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-400 font-extrabold">CATALOGED DRAFTS</span>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 divide-y divide-slate-150">
                <div className="pb-2 text-[10px] text-slate-500 font-mono flex justify-between">
                  <span>Merchant: {firstName || "Linda"} {lastName || "Owusu"}</span>
                  <span className="font-bold text-[#1A5B70]">{productsList.length} SKUs</span>
                </div>
                
                {/* Active draft info */}
                {phase === 'catalog' && (
                  <div className="pt-2 space-y-1">
                    <span className="block text-[8px] font-mono uppercase text-[#F05A28] font-bold">Currently Drafting:</span>
                    <div className="flex gap-2.5 items-center">
                      {prodUploadedImage ? (
                        <img 
                          src={prodUploadedImage} 
                          alt="Draft pic" 
                          className="w-8 h-8 rounded border bg-white object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-250 flex items-center justify-center text-[10px] text-slate-400">
                          <ImageIcon size={14} />
                        </div>
                      )}
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-700 truncate max-w-[150px]">
                          {prodSelectedName || prodDraftName || "Unnamed SKU"}
                        </span>
                        <div className="flex gap-2 text-[9px] text-slate-400 font-mono">
                          <span>${prodPrice || "0.00"}</span>
                          <span>•</span>
                          <span>{prodWeight || "0.00"} kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fallback when not catalog phase */}
                {phase !== 'catalog' && (
                  <p className="pt-2 text-[10px] text-slate-400 font-light">
                    {productsList.length > 0 ? "Stored catalog lists verified." : "No registered items yet. Added in Phase II."}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Department Head Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-[#1A5B70] font-mono text-[10px] font-bold flex items-center justify-center">
                JC
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-800 leading-none">Jude Cole</h5>
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold">Head of Vendors Department</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal font-light">
              We verify and finalize all digital store registrations. Keep your Serial Code safe to resume setup at any time.
            </p>
          </div>

        </div>

      </div>

      {/* SECURE SAVE/EXIT TERMINAL MODAL */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-250 p-6 md:p-8 max-w-sm w-full shadow-2xl relative space-y-6 text-center"
            >
              <div className="flex flex-col items-center">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 mb-3 animate-pulse">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Unsaved Shop Progress</h3>
                <p className="text-xs text-slate-500 font-light leading-relaxed mt-2">
                  Do you want to leave? Your progress and custom links are saved using your key code shown below. Please copy it before you close the screen.
                </p>
              </div>

              {/* Unique saved serial code block with copy */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <span className="block text-[8px] font-mono text-slate-400 uppercase font-bold tracking-wider">Your saved Gateway Serial Key</span>
                <div className="flex items-center justify-between bg-white border p-2 rounded-lg font-mono font-bold">
                  <span className="text-[#F05A28] text-sm tracking-widest">{vendor.serialCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(vendor.serialCode);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 3000);
                    }}
                    className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy serial key"
                  >
                    {copiedKey ? <span className="text-[10px] text-green-600 font-bold">Copied</span> : <Copy size={13} />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-light pt-1">Type this code on the welcome page next time to continue setting up your store over the next 30 days.</p>
              </div>

              {/* Option triggers to stay or exit */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="w-full py-3 bg-[#1A5B70] hover:bg-[#1A5B70]/95 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95"
                >
                  Stay and Finish Setup
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    onExit(); // triggers App layout exit
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                >
                  Save Progress and Exit
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
