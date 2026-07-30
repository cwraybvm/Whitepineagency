// src/app/estimate/page.tsx
'use client';

import InstantQuoteEstimator from '@/components/InstantQuoteEstimator';

export default function CustomerEstimatePage() {
  return (
    <div className="min-h-screen bg-[#030712] py-12 px-4 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full space-y-2 mb-6 text-center">
        <h1 className="text-2xl font-black text-white font-mono uppercase tracking-tight">
          Get an Instant Estimate in 60 Seconds
        </h1>
        <p className="text-xs text-gray-400 font-mono">
          No waiting for calls. Select your project scope below for instant ballpark pricing.
        </p>
        <p className="text-[10px] text-gray-500 font-mono">
          No obligation to book. No spam calls — ever.
        </p>
      </div>

      <InstantQuoteEstimator 
        businessName="White Pine Local Services"
        webhookUrl="/api/leads" // Point directly to your Next.js internal API route!
      />
    </div>
  );
}