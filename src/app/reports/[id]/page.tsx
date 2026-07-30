'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';

interface Lead {
  id: string;
  businessName: string;
  url: string;
  overallScore: number;
  estimatedLoss: number;
  proximityLimit: number;
  industry: string;
  targetKeywords: string[];
  vulnerabilities: number;
  lcp: string;
  cls: string;
  inp: string;
  competitorA: string;
  competitorB: string;
  aiOutreachScript?: string;
}

// 💰 PRODUCTIZED AGENCY PRICING TIERS
const PRICING_PACKAGES = {
  tier1: {
    key: 'tier1',
    name: "Tier 1: Core Speed & Infrastructure Patch",
    price: 199,
    setup: 0,
    loss: 1990,
    toggles: { speed: true, missedcall: false, ai: false, forms: true, maps: false },
    summary: "Fix Core Web Vitals, Cloudflare CDN edge routing, and local Geo-Schema code."
  },
  tier2: {
    key: 'tier2',
    name: "Tier 2: Revenue Recovery & AI Answering",
    price: 599,
    setup: 299,
    loss: 3450,
    toggles: { speed: true, missedcall: true, ai: true, forms: true, maps: true },
    summary: "Tier 1 + 24/7 AI Voice Receptionist, Missed-Call Text Back, and Review Booster."
  },
  tier3: {
    key: 'tier3',
    name: "Tier 3: Full Fractional CMO Growth Retainer",
    price: 1499,
    setup: 499,
    loss: 6500,
    toggles: { speed: true, missedcall: true, ai: true, forms: true, maps: true },
    summary: "Tier 2 + Database Reactivation, Google LSA Ads, and Map Spam Cleaning."
  }
};

const urlParamsHasKey = (key: string) => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(key);
};

// 📊 INDUSTRY-STANDARD GOOGLE CTR CALCULATOR MATRIX
const calculateCTR = (rank: string | number): number => {
  const numericRank = typeof rank === 'string' ? parseInt(rank, 10) : rank;
  if (isNaN(numericRank) || numericRank > 10 || numericRank < 1) return 0.5;
  
  const ctrMap: Record<number, number> = {
    1: 39.8,
    2: 18.7,
    3: 10.2,
    4: 1.8,
    5: 1.4,
    6: 1.2,
    7: 1.0,
    8: 0.9,
    9: 0.8,
    10: 0.7
  };

  return ctrMap[numericRank] || 0.5;
};

// 🛰️ INDUSTRY-AWARE SMART LOCAL COMPETITOR GUESSING ENGINE
const guessCompetitors = (name: string) => {
  const cleanName = name.trim().toLowerCase();
  
  if (!cleanName || cleanName === 'local business partner') {
    return {
      a: "Top Local Competitor",
      b: "Secondary Area Competitor"
    };
  }

  if (
    cleanName.includes('care') || 
    cleanName.includes('senior') || 
    cleanName.includes('home') || 
    cleanName.includes('assisted') || 
    cleanName.includes('elder') ||
    cleanName.includes('living')
  ) {
    return {
      a: "Home Instead Senior Care",
      b: "Visiting Angels Home Care"
    };
  }

  if (
    cleanName.includes('plumb') || 
    cleanName.includes('drain') || 
    cleanName.includes('root') || 
    cleanName.includes('hvac') || 
    cleanName.includes('air') || 
    cleanName.includes('heat') ||
    cleanName.includes('electric')
  ) {
    return {
      a: "Roto-Rooter Plumbing & Water Cleanup",
      b: "Apex Heating & Air Conditioning"
    };
  }

  if (
    cleanName.includes('dent') || 
    cleanName.includes('smile') || 
    cleanName.includes('ortho') || 
    cleanName.includes('tooth') || 
    cleanName.includes('oral') ||
    cleanName.includes('clinic')
  ) {
    return {
      a: "Aspen Dental Group",
      b: "Apex Orthodontics & Family Dentistry"
    };
  }

  if (
    cleanName.includes('roof') || 
    cleanName.includes('construct') || 
    cleanName.includes('build') || 
    cleanName.includes('exterior') ||
    cleanName.includes('gutters')
  ) {
    return {
      a: "Vanguard Roofing Systems",
      b: "Apex Local Exterior Contracting"
    };
  }

  if (
    cleanName.includes('law') || 
    cleanName.includes('legal') || 
    cleanName.includes('attorney') || 
    cleanName.includes('injury') || 
    cleanName.includes('defense') ||
    cleanName.includes('firm')
  ) {
    return {
      a: "Morgan & Morgan Legal Group",
      b: "Apex Local Defense Associates"
    };
  }

  const capitalizedWord = name.trim().split(' ')[0];
  const lastWord = name.trim().split(' ').pop() || 'Specialist';
  return {
    a: `${capitalizedWord} Area Competitor`,
    b: `Local ${lastWord} Specialist`
  };
};

export default function ClientReportPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const initialFetchExecuted = useRef(false);
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [mountedDate, setMountedDate] = useState(""); 

  // Mobile Drawer State
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'tier1' | 'tier2' | 'tier3'>('tier2');

  // Core Presentation States
  const [localName, setLocalName] = useState("");
  const [localUrl, setLocalUrl] = useState("white-pine-portal.vercel.app");
  const [localLoss, setLocalLoss] = useState(3450);
  const [baseLoss, setBaseLoss] = useState(3450); 
  const [localRank, setLocalRank] = useState("4"); 
  const [targetKeyword, setTargetKeyword] = useState("plumbing near me");
  const [isEstimationMode, setIsEstimationMode] = useState(false);
  const [clientReviews, setClientReviews] = useState("12"); 
  const [speedPass, setSpeedPass] = useState(false);
  const [mapsPass, setMapsPass] = useState(false);
  const [missedCallPass, setMissedCallPass] = useState(false);
  const [aiPass, setAiPass] = useState(false);
  const [formsPass, setFormsPass] = useState(false);
  const [aiOverviewPresent, setAiOverviewPresent] = useState(false);

  // Competitor Intelligence States
  const [compA, setCompA] = useState("");
  const [compB, setCompB] = useState("");
  const [compAData, setCompAData] = useState({ name: "Top Local Competitor", reviews: 48, rating: 4.7 });
  const [compBData, setCompBData] = useState({ name: "Secondary Area Competitor", reviews: 32, rating: 4.4 });

  const [hasManuallyOverriddenA, setHasManuallyOverriddenA] = useState(false);
  const [hasManuallyOverriddenB, setHasManuallyOverriddenB] = useState(false);

  // ─── STEP 1: INITIAL BOOT & HYDRATION LAYER ───
  useEffect(() => {
    if (initialFetchExecuted.current) return;
    initialFetchExecuted.current = true;

    setMountedDate(new Date().toLocaleDateString());

    const checkStatus = (param: string | null) => param === "pass";
    const token = searchParams.get("token");
    let decodedData: any = {};

    if (token) {
      try {
        decodedData = JSON.parse(decodeURIComponent(atob(token)));
      } catch (err) {
        console.error("Secure presentation node decryption warning:", err);
      }
    }

    const speedParam = token ? decodedData.speed : searchParams.get("speed");
    const mapsParam = token ? decodedData.maps : searchParams.get("maps");
    const missedCallParam = token ? decodedData.missedcall : searchParams.get("missedcall");
    const aiParam = token ? decodedData.ai : searchParams.get("ai");
    const formsParam = token ? decodedData.forms : searchParams.get("forms");
    const urlLoss = token ? decodedData.l : (searchParams.get("estimatedLoss") || searchParams.get("loss"));
    const urlParam = token ? decodedData.u : (searchParams.get("url") || 'white-pine-portal.vercel.app');
    const fallbackBusinessName = token ? decodedData.n : (searchParams.get("businessName") || 'Local Business Partner');
    const urlCompA = token ? decodedData.ca : searchParams.get("compA");
    const urlCompB = token ? decodedData.cb : searchParams.get("compB");
    const urlRank = token ? decodedData.r : searchParams.get("rank");
    const urlKeyword = token ? decodedData.k : (searchParams.get("keyword") || "plumbing near me");
    const urlEstimation = searchParams.get("estimation") === "true";
    const urlReviews = token ? decodedData.v : (searchParams.get("reviews") || "12");
    const urlAio = token ? decodedData.aio : (searchParams.get("aio") === "true");

    fetch(`/api/leads?orgId=default-tenant-workspace`)
      .then((res) => res.json())
      .then((data) => {
        const leadsArray = (data.leads || data) as Lead[];
        const found = leadsArray.find((l: Lead) => l.id === id);
        setLead(found || null);
        
        const finalName = fallbackBusinessName;
        const finalUrl = found?.url || urlParam;
        const finalLoss = urlLoss ? Number(urlLoss) : (found ? found.estimatedLoss : 3450);
        const finalRank = urlRank || "4";

        setLocalName(finalName);
        setLocalUrl(finalUrl);
        setLocalLoss(finalLoss);
        setBaseLoss(finalLoss); 
        setLocalRank(finalRank);
        setTargetKeyword(urlKeyword);
        setIsEstimationMode(urlEstimation);
        setClientReviews(urlReviews);
        setAiOverviewPresent(urlAio);
        
        setSpeedPass(token ? checkStatus(speedParam) : (urlParamsHasKey("speed") ? checkStatus(speedParam) : (found ? checkStatus(found.lcp) : false)));
        setMapsPass(token ? checkStatus(mapsParam) : (urlParamsHasKey("maps") ? checkStatus(mapsParam) : (found ? found.overallScore > 50 : false)));
        setMissedCallPass(checkStatus(missedCallParam));
        setAiPass(checkStatus(aiParam));
        setFormsPass(token ? checkStatus(formsParam) : (urlParamsHasKey("forms") ? checkStatus(formsParam) : (found ? checkStatus(found.cls) : false)));

        const activeCompA = urlCompA || found?.competitorA || "";
        const activeCompB = urlCompB || found?.competitorB || "";
        
        if (urlCompA) setHasManuallyOverriddenA(true);
        if (urlCompB) setHasManuallyOverriddenB(true);

        const guesses = guessCompetitors(finalName);
        const finalA = activeCompA || guesses.a;
        const finalB = activeCompB || guesses.b;

        setCompA(finalA);
        setCompB(finalB);
        setCompAData({ name: finalA, reviews: Math.abs((finalA.length % 180) + 20), rating: parseFloat((Math.abs(finalA.length % 10) / 10 + 4.0).toFixed(1)) });
        setCompBData({ name: finalB, reviews: Math.abs((finalB.length % 180) + 20), rating: parseFloat((Math.abs(finalB.length % 10) / 10 + 4.0).toFixed(1)) });
        setLoading(false);
      })
      .catch(() => {
        const finalName = fallbackBusinessName;
        setLocalName(finalName);
        setLocalUrl(urlParam);
        setLocalLoss(urlLoss ? Number(urlLoss) : 3450);
        setBaseLoss(urlLoss ? Number(urlLoss) : 3450); 
        setLocalRank(urlRank || "4");
        setTargetKeyword(urlKeyword);
        setIsEstimationMode(urlEstimation);
        setClientReviews(urlReviews);
        setAiOverviewPresent(urlAio);
        
        setSpeedPass(checkStatus(speedParam));
        setMapsPass(checkStatus(mapsParam));
        setMissedCallPass(checkStatus(missedCallParam));
        setAiPass(checkStatus(aiParam));
        setFormsPass(checkStatus(formsParam));

        if (urlCompA) setHasManuallyOverriddenA(true);
        if (urlCompB) setHasManuallyOverriddenB(true);

        const guesses = guessCompetitors(finalName);
        const finalA = urlCompA || guesses.a;
        const finalB = urlCompB || guesses.b;
        
        setCompA(finalA);
        setCompB(finalB);
        setCompAData({ name: finalA, reviews: Math.abs((finalA.length % 180) + 20), rating: parseFloat((Math.abs(finalA.length % 10) / 10 + 4.0).toFixed(1)) });
        setCompBData({ name: finalB, reviews: Math.abs((finalB.length % 180) + 20), rating: parseFloat((Math.abs(finalB.length % 10) / 10 + 4.0).toFixed(1)) });
        setLoading(false);
      });
  }, [id, searchParams]);

  // ─── STEP 2: COMPETITOR DICTIONARY GUESSER ───
  useEffect(() => {
    if (hasManuallyOverriddenA || hasManuallyOverriddenB) return;
    if (!localName || loading) return;

    const guesses = guessCompetitors(localName);
    
    setCompA(guesses.a);
    setCompAData(prev => ({ 
      ...prev, 
      name: guesses.a,
      reviews: Math.abs((guesses.a.length % 180) + 20), 
      rating: parseFloat((Math.abs(guesses.a.length % 10) / 10 + 4.0).toFixed(1))
    }));

    setCompB(guesses.b);
    setCompBData(prev => ({ 
      ...prev, 
      name: guesses.b,
      reviews: Math.abs((guesses.b.length % 180) + 20), 
      rating: parseFloat((Math.abs(guesses.b.length % 10) / 10 + 4.0).toFixed(1))
    }));
  }, [localName, loading, hasManuallyOverriddenA, hasManuallyOverriddenB]);

  // ─── STEP 3: URL STATE REPLACER ───
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams();
    if (localName) params.set("businessName", localName);
    if (localUrl) params.set("url", localUrl);
    params.set("speed", speedPass ? "pass" : "fail");
    params.set("maps", mapsPass ? "pass" : "fail");
    params.set("missedcall", missedCallPass ? "pass" : "fail");
    params.set("ai", aiPass ? "pass" : "fail");
    params.set("forms", formsPass ? "pass" : "fail");
    if (localLoss) params.set("estimatedLoss", localLoss.toString());
    if (localRank) params.set("rank", localRank);
    if (targetKeyword) params.set("keyword", targetKeyword);
    if (isEstimationMode) params.set("estimation", "true");
    if (clientReviews) params.set("reviews", clientReviews);
    if (compA) params.set("compA", compA);
    if (compB) params.set("compB", compB);
    if (aiOverviewPresent) params.set("aio", "true");

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  }, [localName, localUrl, speedPass, mapsPass, missedCallPass, aiPass, formsPass, localLoss, compA, compB, localRank, clientReviews, targetKeyword, isEstimationMode, aiOverviewPresent, loading]);

  useEffect(() => {
    if (loading || !localName) return;

    const triggered = sessionStorage.getItem(`alert_triggered_${id || 'test'}`);
    if (!triggered) {
      fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: localName,
          url: window.location.href
        })
      })
      .then(() => sessionStorage.setItem(`alert_triggered_${id || 'test'}`, 'true'))
      .catch((err) => console.error("Radar sweep exception caught:", err));
    }
  }, [id, localName, loading]);

  // ⚡ TRI-ENGINE PARALLEL TELEMETRY SCAN
  const autoScanSpeed = async () => {
    if (!localUrl) return;
    setScanning(true);
    try {
      const [speedRes, compRes, rankRes] = await Promise.all([
        fetch(`/api/audit/speed?url=${encodeURIComponent(localUrl)}`),
        fetch(`/api/audit/competitors?compA=${encodeURIComponent(compA)}&compB=${encodeURIComponent(compB)}`),
        fetch(`/api/audit/rank?keyword=${encodeURIComponent(targetKeyword)}&domain=${encodeURIComponent(localUrl)}`)
      ]);

      const speedData = await speedRes.json();
      const compData = await compRes.json();
      const rankData = await rankRes.json();

      if (speedData.lcp) {
        setSpeedPass(speedData.status === 'pass');
        const seconds = parseFloat(speedData.lcp) || 0;
        
        if (seconds > 2.5) {
          const structuralPenalty = Math.round(baseLoss * (seconds / 2.5));
          setLocalLoss(structuralPenalty);
        } else {
          setLocalLoss(baseLoss);
        }
      }

      if (compData.competitors && compData.competitors.length >= 2) {
        setCompAData(compData.competitors[0]);
        setCompBData(compData.competitors[1]);
      }

      if (rankData) {
        const computedRankStr = rankData.rank ? rankData.rank.toString() : "4";
        setLocalRank(computedRankStr);
        setIsEstimationMode(!!rankData.estimationMode);
        setAiOverviewPresent(!!rankData.aiOverviewPresent);
        
        const numericRank = parseInt(computedRankStr, 10);
        setMapsPass(!isNaN(numericRank) && numericRank <= 3);

        if (rankData.competitors && rankData.competitors.length >= 2) {
          setCompA(rankData.competitors[0].name);
          setCompB(rankData.competitors[1].name);
          setCompAData(rankData.competitors[0]);
          setCompBData(rankData.competitors[1]);
        }
      }
    } catch (err) {
      console.error("Tri-engine telemetry run failed:", err);
    } finally {
      setScanning(false);
    }
  };

  // 📦 PACKAGE PROPOSAL PRESET APPLIER
  const applyPackagePreset = (packageKey: 'tier1' | 'tier2' | 'tier3') => {
    const pkg = PRICING_PACKAGES[packageKey];
    setSelectedTier(packageKey);
    
    setSpeedPass(pkg.toggles.speed);
    setMissedCallPass(pkg.toggles.missedcall);
    setAiPass(pkg.toggles.ai);
    setFormsPass(pkg.toggles.forms);
    setMapsPass(pkg.toggles.maps);
    
    setLocalLoss(pkg.loss);
    setBaseLoss(pkg.loss);
  };

  // 📋 OUTREACH EMAIL & PROPOSAL GENERATOR
  const copyCustomOutreach = () => {
    const activePkg = PRICING_PACKAGES[selectedTier];
    const liveLink = window.location.href;

    const emailTemplate = `
Subject: Quick question about ${localName}'s mobile response speed...

Hi ${localName} Team,

I ran a quick performance sweep across local search visibility maps in our area this morning and looked at your mobile load speed (${localUrl}).

According to Google's public performance index, small delays and uncaptured after-hours calls are resulting in roughly $${localLoss.toLocaleString()}/month in missed job opportunities to competitors like ${compA || compAData.name}.

I put together an interactive diagnostic breakdown showing where these calls are dropping, along with a 3-step blueprint to patch them:

👉 View Your Interactive Diagnostic: ${liveLink}

We have a simple $${activePkg.price}/mo proposal (${activePkg.name}) that connects our 24/7 AI Receptionist and instant missed-call text back safety net to save these jobs automatically.

Are you open to a quick 5-minute call tomorrow afternoon to look at getting this set up?

Best,

[Your Name]
White Pine Agency
`.trim();

    navigator.clipboard.writeText(emailTemplate);
    alert(`📋 Proposal quote for ${activePkg.name} ($${activePkg.price}/mo) copied to clipboard!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center font-mono text-xs tracking-widest text-indigo-400 animate-pulse gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>📡 MOUNTING ENTERPRISE CONTROL CORE AND VALUE ASSETS...</span>
      </div>
    );
  }

  const calculatedScore = () => {
    let base = 35;
    if (speedPass) base += 15;
    if (missedCallPass) base += 15;
    if (aiPass) base += 15;
    if (formsPass) base += 10;
    if (mapsPass) base += 10;
    return Math.min(100, base);
  };

  const targetUrl = localUrl;
  const finalScore = calculatedScore();
  const keywordArray = [targetKeyword, 'Nearby Customer Searches', 'Local Competitors'];

  const defaultFriendlyBriefing = `
We completed a look at your public search infrastructure. Right now, technical delays and missing mobile safety nets are letting valuable local phone calls and website inquiries slip through the cracks. 

Immediate Action Recommendations:
1. Fix Mobile Response Latency: Compress your structural image assets so your homepage loads in under 3 seconds.
2. Capture Front-Page Map Placement: Adjust your Google Business Profile keywords to move from spot #4 into the top 3-pack where 60% of clicks happen.
3. Deploy an Automated Safety Net: Connect an instant text-back trigger so you save customers who call when your phone line is busy.
  `.trim();

  const activeOutreachScript = lead?.aiOutreachScript || defaultFriendlyBriefing;

  // 🏛️ FULL 9-CARD CORE PRESENTATION MATRIX ARRAY
  const healthCards = [
    { title: "Speed-to-Lead Response", desc: "Automated 90-second client text back routing.", status: speedPass },
    { title: "Missed-Call Capture", desc: "Instant SMS safety net recovery triggers.", status: missedCallPass },
    { title: "24/7 AI Receptionist", desc: "Interactive conversational target intake agent.", status: aiPass },
    { title: "Form Abandonment Rescue", desc: "Captures drop-off lead profiles in real-time.", status: formsPass },
    { title: "Smart Booking Calendar", desc: "Direct platform scheduling sync mechanisms.", status: true }, 
    { title: "Google Maps 3-Pack Rank", desc: "Front-page local search directory placement.", status: mapsPass },
    { title: "BVM Campaign Page", desc: "Hyper-focused landing page architecture.", status: true },
    { title: "Review Booster Engine", desc: "Automated high-velocity review expansion loops.", status: true },
    { title: "ADA Interface Compliance", desc: "Statutory web accessibility schema tracking.", status: false } 
  ];

  const currentRankIndex = parseInt(localRank, 10) || 4;
  const dynamicQRCodeValue = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden p-4 md:p-12 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] text-gray-200 bg-[#030712]">
      
      <div className="cyber-grid absolute inset-0 -z-10 w-full h-full pointer-events-none opacity-20" />

      {/* ==================== 💻 SCREEN DASHBOARD RENDERING ==================== */}
      <div className="no-print max-w-7xl mx-auto space-y-6 md:space-y-10 animate-fadeIn">
        
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 md:pb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-xl border border-white/10 p-1.5 overflow-hidden">
              <img src="/logo.jpg" alt="White Pine" className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <p className="text-[9px] md:text-xs font-bold tracking-widest text-indigo-400 uppercase text-glow-indigo">WHITE PINE AGENCY // LOCAL BUSINESS DIAGNOSTICS</p>
              <h1 className="text-xl md:text-3xl font-black text-white mt-0.5 md:mt-1 leading-tight">{localName}</h1>
              <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 font-mono">
                Website Audited:{" "}
                {scanning ? (
                  <span className="text-amber-400 animate-pulse">📡 Fetching Multi-Point Google Telemetry...</span>
                ) : (
                  <span className="text-indigo-300 break-all">{targetUrl}</span>
                )}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-3">
            {/* Mirrors the score badge in the print leave-behind's header — same
                headline number, so the on-screen and printed views open the
                same way instead of the score only existing in the printout. */}
            <div className="border-2 border-indigo-500/40 px-4 py-2 font-mono rounded-lg bg-black/40 text-center shrink-0">
              <p className="text-[8px] uppercase tracking-wider text-gray-400 leading-none">Visibility Score</p>
              <p className="text-xl font-black text-white mt-1">{finalScore} / 100</p>
            </div>

            <button
              onClick={() => window.print()}
              className="flex-1 md:flex-none px-5 py-3 md:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl font-mono shadow-xl transition-all tracking-wider cursor-pointer"
            >
              🖨️ Print Executive Leave-Behind Report
            </button>
          </div>
        </header>

        {/* 💸 Leak Metric Box */}
        <div className="relative z-10 bg-gradient-to-r from-red-950/20 to-transparent border border-red-500/15 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-[10px] md:text-xs uppercase font-mono font-black tracking-wider text-red-400">💸 Estimated Monthly Missed Revenue</h3>
            <p className="text-[10px] md:text-[11px] text-gray-400 font-mono mt-0.5">Found income lost due to delayed text routing or busy customer inquiry lines.</p>
          </div>
          <div className="w-full sm:w-auto bg-black/45 border border-red-500/20 px-5 py-2.5 rounded-xl text-center font-mono">
            <span className="text-[9px] uppercase font-bold text-red-400 block">Calculated Leak</span>
            <span className="text-xl font-black text-white tracking-tight">${Number(localLoss).toLocaleString()}/mo</span>
          </div>
        </div>

        {/* 📊 Maps Search Intercept */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white/95">Google Maps Search-Intercept Audit</h2>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">📡 Source: Google Places Live Directory Index</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs mb-4">
            
            {/* Card 1: Your Local Ranking Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between h-32 md:h-36 relative overflow-hidden transition-all ${
              mapsPass 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-glow-emerald" 
                : "bg-rose-500/5 border-rose-500/10 text-rose-400"
            }`}>
              {isEstimationMode && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500/15 text-amber-400 font-mono text-[8px] uppercase tracking-wider rounded border border-amber-500/20 scale-90">
                  📍 Estimate Mode
                </span>
              )}
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 block text-[9px] uppercase font-black tracking-wider">Your Local Ranking</span>
                  {aiOverviewPresent ? (
                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-mono uppercase tracking-wider rounded border border-indigo-500/20 animate-pulse scale-90 origin-right">
                      🤖 AI Verified Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-white/5 text-gray-400 text-[8px] font-mono uppercase tracking-wider rounded scale-90 origin-right">
                      Standard SERP
                    </span>
                  )}
                </div>
                <span className="text-white font-bold block mt-0.5 truncate">{localName || 'Local Business Partner'}</span>
              </div>

              {/* Dynamic Click Share Progress Meter */}
              <div className="mt-1 space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>Local Click Share:</span>
                  <span className={mapsPass ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {calculateCTR(localRank)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-500 ${mapsPass ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}
                    style={{ width: `${Math.max(2, calculateCTR(localRank))}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-end mt-1">
                <span className={`font-bold block text-sm md:text-xs ${mapsPass ? "text-emerald-400" : "text-rose-400"}`}>
                  {mapsPass ? `Pos. #${localRank} (Top 3-Pack Active)` : `Pos. #${localRank} (Below 3-Pack Bound)`}
                </span>
                <span className="text-gray-400 text-[10px]">⭐ {clientReviews} Revs</span>
              </div>
            </div>
            
            {/* Card 2: Competitor A Card */}
            <div className="p-4 bg-white/[0.01] rounded-xl border border-white/[0.04] flex flex-col justify-between h-32 md:h-36">
              <div>
                <span className="text-gray-500 block text-[9px] uppercase font-black tracking-wider">Top High-Intent Competitor</span>
                <span className="text-white font-bold block mt-0.5 truncate">{compA || compAData.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>Local Click Share:</span>
                  <span className="text-emerald-400 font-bold">39.8%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500 w-[39.8%]" />
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-amber-400 font-bold block">⭐ {compAData.rating || 4.7} ({compAData.reviews || 48} Reviews)</span>
                <span className="text-gray-500 text-[10px] font-bold font-mono">
                  {currentRankIndex === 1 ? "Pos. #2" : "Pos. #1"}
                </span>
              </div>
            </div>
            
            {/* Card 3: Competitor B Card */}
            <div className="p-4 bg-white/[0.01] rounded-xl border border-white/[0.04] flex flex-col justify-between h-32 md:h-36">
              <div>
                <span className="text-gray-500 block text-[9px] uppercase font-black tracking-wider">Secondary Local Intercept</span>
                <span className="text-white font-bold block mt-0.5 truncate">{compB || compBData.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>Local Click Share:</span>
                  <span className="text-amber-400 font-bold">10.2%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-amber-500 w-[10.2%]" />
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-amber-400 font-bold block">⭐ {compBData.rating || 4.4} ({compBData.reviews || 32} Reviews)</span>
                <span className="text-gray-500 text-[10px] font-bold font-mono">
                  {currentRankIndex <= 2 ? "Pos. #3" : "Pos. #2"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🏛️ 3x3 Infrastructure Diagnostics Section Layout */}
        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white/90">Infrastructure Diagnostic Matrix</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {healthCards.map((card, idx) => (
              <div key={idx} className="glass-card border border-white/5 rounded-xl p-4 md:p-5 flex flex-col justify-between h-36 md:h-40 bg-black/20 transition-all hover:border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide font-mono uppercase text-indigo-300">{card.title}</h3>
                  <p className="text-[11px] md:text-xs text-gray-400 mt-2 leading-relaxed">{card.desc}</p>
                </div>
                <div className="flex items-center mt-3 md:mt-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-wider font-mono ${
                    card.status 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-glow-emerald" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                  }`}>
                    {card.status ? "Optimized" : "Revenue Leak"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Blueprints Footer Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs pt-4">
          <div className="lg:col-span-1 bg-black/40 border border-white/5 p-5 rounded-2xl">
            <h3 className="text-[10px] uppercase font-black text-red-400 mb-2">✕ High-Value Missed Targets</h3>
            <div className="flex flex-wrap gap-1.5">
              {keywordArray.map((kw, i) => (
                <span key={i} className="px-2.5 py-1.5 bg-red-500/5 border border-red-500/10 text-red-400 rounded-xl font-bold">
                  ✕ {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-black/40 border border-white/5 p-5 rounded-2xl">
            <h3 className="text-[10px] uppercase font-black text-indigo-400 mb-2">⚙️ Customized Roadmap Blueprint</h3>
            <p className="text-gray-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/[0.03] whitespace-pre-line">
              {activeOutreachScript}
            </p>
          </div>
        </div>

        {/* Mirrors the print leave-behind's closing footer (agency signature
            + QR code) — same sign-off on screen as on the printout. */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono text-gray-500">
          <div>
            <p className="font-bold text-gray-300">White Pine Agency Support System</p>
            <p className="mt-0.5">Portal Mirror Framework Node: white-pine-portal.vercel.app</p>
          </div>
          <div className="flex items-center gap-4 bg-black/40 p-2.5 border border-white/5 rounded-lg">
            <div className="w-[60px] h-[60px] bg-white p-1 rounded">
              <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={dynamicQRCodeValue}
                viewBox="0 0 256 256"
              />
            </div>
            <p className="text-[8px] font-black uppercase text-gray-300 leading-tight w-24">
              SCAN TO VIEW LIVE DASHBOARD
            </p>
          </div>
        </div>

      </div>

      {/* ==================== 🖨️ DOCUMENT LEAVE-BEHIND PRINT OVERLAY ==================== */}
      <div className="hidden print:block w-full max-w-4xl mx-auto text-gray-900 font-sans leading-relaxed bg-white">
        
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
          <div>
            <span className="text-[10px] tracking-widest text-indigo-600 font-mono font-black uppercase block">WHITE PINE AGENCY // LOCAL BUSINESS HEALTH CHECK</span>
            <h1 className="text-3xl font-black text-gray-900 mt-1">{localName}</h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">Date Compiled: {mountedDate || "Loading..."}</p>
          </div>
          <div className="text-right font-mono">
            <div className="border-2 border-gray-900 px-4 py-2 font-black rounded-lg bg-gray-50 text-center">
              <p className="text-[8px] uppercase tracking-wider text-gray-500 leading-none">Overall Digital Visibility Score</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{finalScore} / 100</p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h2 className="text-base font-black tracking-tight text-red-600 uppercase font-mono">💸 Estimated Monthly Missed Revenue: ${Number(localLoss).toLocaleString()}</h2>
            <p className="text-xs text-gray-700 mt-1.5 leading-relaxed font-mono">
              When local customers try to find you on their phones, small technical delays can cause them to click away to a competitor before they ever call or fill out a form.
            </p>
          </div>

          <div className="border-2 border-gray-900 p-5 rounded-xl space-y-4 font-mono relative overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-gray-100 pb-1">
              <h3 className="text-xs font-black tracking-wide uppercase text-gray-900">📍 Front-Page Google Maps Intercept Analysis</h3>
              <span className="text-[7px] text-gray-400 uppercase tracking-wider">
                {isEstimationMode ? "Estimated Market Base Analysis" : "Scraped Live via Google Places Directory"}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] mt-2">
              <div className={`p-3 border rounded-lg relative flex flex-col justify-between h-28 ${mapsPass ? "bg-emerald-55 border-emerald-300 text-emerald-950" : "bg-rose-55 border-rose-200 text-rose-950"}`}>
                {isEstimationMode && (
                  <span className="absolute top-1 right-1 text-[6px] px-1 border border-amber-500/20 bg-amber-50 text-amber-600 rounded">
                    Estimate
                  </span>
                )}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-500 block text-[8px] uppercase">Your Position</span>
                    {aiOverviewPresent && (
                      <span className="text-[6px] font-bold text-indigo-700 bg-indigo-55 border border-indigo-200 px-1 rounded uppercase">
                        AI Active
                      </span>
                    )}
                  </div>
                  <span className="font-black text-gray-900 block mt-0.5 truncate">{localName}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-gray-500">
                    <span>Click Share:</span>
                    <span className="font-bold">{calculateCTR(localRank)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className={`h-full ${mapsPass ? 'bg-emerald-600' : 'bg-rose-600'}`} style={{ width: `${Math.max(4, calculateCTR(localRank))}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <span className={`font-bold ${mapsPass ? "text-emerald-700" : "text-rose-700"}`}>
                    {mapsPass ? `Pos. #${localRank} (Active)` : `Pos. #${localRank}`}
                  </span>
                  <span className="text-[8px] text-gray-400">{clientReviews} Revs</span>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col justify-between h-28">
                <div>
                  <span className="font-bold text-gray-500 block text-[8px] uppercase">Top Competitor</span>
                  <span className="font-black text-gray-800 block mt-0.5 truncate">{compA || compAData.name}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-gray-500">
                    <span>Click Share:</span>
                    <span className="font-bold text-emerald-600">39.8%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 w-[39.8%]" />
                  </div>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-amber-600 font-bold block">⭐ {compAData.rating || 4.7} ({compAData.reviews || 48} Reviews)</span>
                  <span className="text-gray-400 text-[8px] font-bold font-mono">
                    {currentRankIndex === 1 ? "Pos. #2" : "Pos. #1"}
                  </span>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col justify-between h-28">
                <div>
                  <span className="font-bold text-gray-500 block text-[8px] uppercase">Secondary Competitor</span>
                  <span className="font-black text-gray-800 block mt-0.5 truncate">{compB || compBData.name}</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[8px] text-gray-500">
                    <span>Click Share:</span>
                    <span className="font-bold text-amber-600">10.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[10.2%]" />
                  </div>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-amber-600 font-bold block">⭐ {compBData.rating || 4.4} ({compBData.reviews || 32} Reviews)</span>
                  <span className="text-gray-400 text-[8px] font-bold font-mono">
                    {currentRankIndex <= 2 ? "Pos. #3" : "Pos. #2"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mt-2">
              On mobile Google searches for "{targetKeyword}", your target keywords are heavily contested. Because you are currently sitting at Pos #{localRank}, your consumer click-through capture rate is down to just {calculateCTR(localRank)}%. {aiOverviewPresent && "Furthermore, the active AI Overview block at the top of the interface is shifting search traffic parameters, making top-three map optimization absolutely structural to protect your incoming metrics from drop-offs."} Competitors like {compA || compAData.name} are capturing almost all high-intent customer phone traffic in your neighborhood.
            </p>
          </div>

          {/* Same healthCards array that drives the on-screen "Infrastructure
              Diagnostic Matrix" — this used to be a separate, hand-written
              3-item subset that dropped 6 of the 9 diagnostic points from
              the printed leave-behind. Single source of truth now. */}
          <div className="border border-gray-200 p-5 rounded-xl space-y-3 font-mono">
            <h3 className="text-xs font-black tracking-wide uppercase text-gray-900">Infrastructure Diagnostic Matrix</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {healthCards.map((card, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900">{card.title}</p>
                  <p className={`font-black tracking-wider uppercase text-[9px] mt-1 ${card.status ? "text-emerald-600" : "text-rose-600"}`}>
                    {card.status ? "✓ Optimized" : "⚠️ Revenue Leak"}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mirrors the on-screen "Customized Roadmap Blueprint" — this pitch
              copy used to be screen-only and never made it into the printed
              leave-behind, even though it's the actual call to action. */}
          <div className="border-2 border-gray-900 p-5 rounded-xl font-mono">
            <h3 className="text-xs font-black tracking-wide uppercase text-indigo-600 mb-2">Customized Roadmap Blueprint</h3>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{activeOutreachScript}</p>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-gray-200 flex justify-between items-center text-xs font-mono text-gray-500">
          <div>
            <p className="font-bold text-gray-800">White Pine Agency Support System</p>
            <p className="mt-0.5">Portal Mirror Framework Node: white-pine-portal.vercel.app</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 p-2.5 border border-gray-200 rounded-lg">
            <div className="w-[60px] h-[60px]">
              <QRCode 
                size={256} 
                style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                value={dynamicQRCodeValue} 
                viewBox="0 0 256 256" 
              />
            </div>
            <p className="text-[8px] font-black uppercase text-gray-900 leading-tight w-24">
              SCAN TO VIEW LIVE DASHBOARD
            </p>
          </div>
        </div>

      </div>

      {/* ==================== 🛠️ MOBILE-FRIENDLY SLIDE-UP DRAWER REMOTE PANEL ==================== */}
      <div className="no-print">
        <button
          onClick={() => setIsRemoteOpen(!isRemoteOpen)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl transition-all border border-indigo-400 select-none cursor-pointer text-xl"
        >
          {isRemoteOpen ? "✕" : "🛠️"}
        </button>

        {isRemoteOpen && (
          <div 
            onClick={() => setIsRemoteOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          />
        )}

        <div className={`fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-slate-950 border-t border-white/10 rounded-t-3xl shadow-2xl p-6 z-50 font-mono transition-transform duration-300 ease-out transform ${
          isRemoteOpen ? "translate-y-0" : "translate-y-full"
        }`}>
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <h2 className="text-sm font-black tracking-widest text-indigo-400 uppercase">🛠️ QUICK CONFIG REMOTE</h2>
            <button onClick={() => setIsRemoteOpen(false)} className="text-xs text-gray-400 hover:text-white font-bold">CLOSE</button>
          </div>
          
          <div className="space-y-4">
            
            {/* 📦 INSTANT PROPOSAL TIER PRESETS */}
            <div className="space-y-2 border-b border-white/10 pb-4">
              <label className="text-[9px] uppercase font-bold text-indigo-400 block tracking-wider font-mono">
                📦 INSTANT PROPOSAL TIER PRESETS
              </label>
              
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => applyPackagePreset('tier1')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedTier === 'tier1'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900 border-white/10 text-gray-400 hover:border-emerald-500/50'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-wider font-normal text-emerald-400">PATCH</span>
                  $199/mo
                </button>

                <button
                  type="button"
                  onClick={() => applyPackagePreset('tier2')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedTier === 'tier2'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                      : 'bg-slate-900 border-white/10 text-indigo-300 hover:border-indigo-500/50'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-amber-400">⭐ SWEET SPOT</span>
                  $599/mo
                </button>

                <button
                  type="button"
                  onClick={() => applyPackagePreset('tier3')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedTier === 'tier3'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-900 border-white/10 text-gray-400 hover:border-purple-500/50'
                  }`}
                >
                  <span className="block text-[8px] uppercase tracking-wider font-normal text-purple-400">CMO SCALE</span>
                  $1,499/mo
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={scanning}
              onClick={autoScanSpeed}
              className={`w-full py-3.5 px-3 font-bold rounded-xl text-xs transition-all tracking-wider cursor-pointer font-mono flex items-center justify-center gap-2 ${
                scanning 
                  ? "bg-amber-600 text-white animate-pulse" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
              }`}
            >
              {scanning ? (
                <>
                  <span className="animate-spin">🔄</span> RUNNING TELEMETRY (10s)...
                </>
              ) : (
                "⚡ RUN AUTOMATIC SPEED & SEO SCAN"
              )}
            </button>

            <button
              type="button"
              onClick={copyCustomOutreach}
              className="w-full py-3.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all tracking-wider cursor-pointer font-mono shadow-lg"
            >
              📋 COPY OUTREACH EMAIL & PROPOSAL
            </button>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Business Name</label>
              <input 
                type="text" 
                value={localName} 
                onChange={(e) => {
                  setHasManuallyOverriddenA(false);
                  setHasManuallyOverriddenB(false);
                  setLocalName(e.target.value);
                }} 
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Website URL</label>
              <input 
                type="text" 
                value={localUrl} 
                onChange={(e) => setLocalUrl(e.target.value)} 
                placeholder="example.com"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Target SEO Keyword</label>
              <input 
                type="text" 
                value={targetKeyword} 
                onChange={(e) => setTargetKeyword(e.target.value)} 
                placeholder="e.g. plumber near me"
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400">Map Rank (#)</label>
                <input 
                  type="text" 
                  value={localRank} 
                  onChange={(e) => setLocalRank(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400">Client Reviews</label>
                <input 
                  type="number" 
                  value={clientReviews} 
                  onChange={(e) => setClientReviews(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400">Competitor A</label>
                <input 
                  type="text" 
                  value={compA} 
                  onChange={(e) => {
                    setHasManuallyOverriddenA(true);
                    setCompA(e.target.value);
                    setCompAData(prev => ({ ...prev, name: e.target.value }));
                  }} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400">Competitor B</label>
                <input 
                  type="text" 
                  value={compB} 
                  onChange={(e) => {
                    setHasManuallyOverriddenB(true);
                    setCompB(e.target.value);
                    setCompBData(prev => ({ ...prev, name: e.target.value }));
                  }} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-gray-400">Est. Monthly Leak ($)</label>
              <input 
                type="number" 
                value={localLoss} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLocalLoss(val);
                  setBaseLoss(val); 
                }} 
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-2 text-xs font-mono pt-2 border-t border-white/5">
              <label className="text-[9px] uppercase font-bold text-gray-400 block mb-2">Diagnostic Toggles</label>
              
              <label className="flex items-center justify-between cursor-pointer py-2">
                <span className="text-gray-300">1. Speed-to-Lead</span>
                <input 
                  type="checkbox" checked={speedPass} onChange={() => setSpeedPass(!speedPass)}
                  className="w-5 h-5 accent-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2">
                <span className="text-gray-300">2. Missed-Call SMS</span>
                <input 
                  type="checkbox" checked={missedCallPass} onChange={() => setMissedCallPass(!missedCallPass)}
                  className="w-5 h-5 accent-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2">
                <span className="text-gray-300">3. AI Receptionist</span>
                <input 
                  type="checkbox" checked={aiPass} onChange={() => setAiPass(!aiPass)}
                  className="w-5 h-5 accent-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2">
                <span className="text-gray-300">4. Form Abandonment</span>
                <input 
                  type="checkbox" checked={formsPass} onChange={() => setFormsPass(!formsPass)}
                  className="w-5 h-5 accent-indigo-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2">
                <span className="text-gray-300">5. Google Map Rank</span>
                <input 
                  type="checkbox" checked={mapsPass} onChange={() => setMapsPass(!mapsPass)}
                  className="w-5 h-5 accent-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}