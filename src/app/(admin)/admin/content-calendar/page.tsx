'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Copy, Check, Sparkles, Filter, Share2 } from 'lucide-react';

interface PostTemplate {
  id: string;
  trade: 'HVAC' | 'Plumbing' | 'Electrical' | 'General Trade';
  category: 'Before & After' | 'Seasonal Tip' | 'Promo Offer' | 'Community Focus';
  title: string;
  caption: string;
  suggestedHashtags: string;
  bestDayToPost: string;
}

const POST_TEMPLATES: PostTemplate[] = [
  {
    id: '1',
    trade: 'HVAC',
    category: 'Seasonal Tip',
    title: 'AC Air Filter Check Reminder',
    caption: `🚨 Quick Homeowner Tip: When was the last time you checked your AC air filter? \n\nA clogged filter forces your system to work 20% harder, driving up electric bills and shortening system lifespan. Swap it out today or give us a call if your air isn't blowing ice cold! ❄️`,
    suggestedHashtags: '#HVACTips #LocalContractor #HomeMaintenance #ACRepair',
    bestDayToPost: 'Monday Morning',
  },
  {
    id: '2',
    trade: 'HVAC',
    category: 'Promo Offer',
    title: 'Seasonal System Tune-Up Special',
    caption: `Don't wait for the heatwave to find out your AC is down! ☀️\n\nFor a limited time, we're offering our 21-Point System Inspection & Tune-Up for just $79. Claim your spot before our schedule fills up! Link in bio or call us directly. 📞`,
    suggestedHashtags: '#HVACSpecial #SummerPrep #LocalBusiness #ACService',
    bestDayToPost: 'Wednesday Afternoon',
  },
  {
    id: '3',
    trade: 'Plumbing',
    category: 'Before & After',
    title: 'Tankless Water Heater Upgrade',
    caption: `Out with the rusty old tank, in with endless hot water! 🚿\n\nCompleted this clean tankless water heater installation for a local family today. Saved them floor space and slashed their gas bill. Tap the link to get a quote for your home!`,
    suggestedHashtags: '#PlumberLife #TanklessWaterHeater #HomeImprovement #PlumbingRepair',
    bestDayToPost: 'Thursday Evening',
  },
  {
    id: '4',
    trade: 'Electrical',
    category: 'Community Focus',
    title: 'EV Charger Installation Showcase',
    caption: `Fired up another home EV charging station today! ⚡🚗\n\nNo more waiting hours at public charging stations. Charge overnight from the comfort of your garage. DM us for a quick installation estimate!`,
    suggestedHashtags: '#Electrician #EVCharging #SmartHome #CleanEnergy',
    bestDayToPost: 'Friday Morning',
  },
];

export default function ContentCalendarPage() {
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPosts = POST_TEMPLATES.filter(
    (post) => selectedTrade === 'All' || post.trade === selectedTrade
  );

  const handleCopyPost = (post: PostTemplate) => {
    const fullText = `${post.caption}\n\n${post.suggestedHashtags}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(post.id);
    toast.success('Post copy & hashtags copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest font-mono block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> TIER 2 • CONTENT MARKETING
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Mini Content Calendar & Post Generator
          </h1>
          <p className="text-xs text-slate-400">
            Pre-written, high-converting social posts designed for local home service contractors.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
          {['All', 'HVAC', 'Plumbing', 'Electrical'].map((trade) => (
            <button
              key={trade}
              onClick={() => setSelectedTrade(trade)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTrade === trade
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {trade}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Post Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between transition-all"
          >
            <div className="space-y-3">

              {/* Card Header Meta */}
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold rounded-md uppercase">
                  {post.trade} • {post.category}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" /> Best: {post.bestDayToPost}
                </span>
              </div>

              <h3 className="text-base font-bold text-white tracking-tight">
                {post.title}
              </h3>

              {/* Caption Box */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 font-sans whitespace-pre-line leading-relaxed">
                {post.caption}
              </div>

              {/* Hashtags */}
              <div className="text-[11px] font-mono text-sky-400/80">
                {post.suggestedHashtags}
              </div>

            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex justify-end items-center gap-2">
              <button
                onClick={() => handleCopyPost(post)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedId === post.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Post & Hashtags</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
