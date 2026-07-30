'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function IntakeFormContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [submitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [clientName, setClientName] = useState('');
  const [offerDetails, setOfferDetails] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Please enter your business name.');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo or file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadStatus('Creating Google Drive folder & uploading files...');

    try {
      // Package form fields & binary files into FormData
      const formData = new FormData();
      formData.append('clientName', clientName);
      formData.append('offerDetails', offerDetails);

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Post directly to our Next.js Google Drive API Route
      const res = await fetch('/api/drive', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload files to Google Drive');
      }

      setDriveFolderUrl(data.folderUrl);
      setSubmitted(true);
      toast.success('Files successfully uploaded to Google Drive!');
    } catch (err: any) {
      console.error('Submission Error:', err);
      toast.error(err.message || 'Something went wrong with the upload.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0E131F] text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#171F2E] border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✅
          </div>
          <h2 className="text-xl font-bold text-white">Assets Received!</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Thank you, <strong>{clientName}</strong>. A dedicated Google Drive folder has been created for your business and your production files are saved.
          </p>

          {driveFolderUrl && (
            <div className="pt-2">
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
              >
                📁 Open Shared Google Drive Folder ↗
              </a>
            </div>
          )}

          <div className="pt-4 text-[10px] text-slate-500 border-t border-slate-800">
            Apex Mechanical Services • Automated Client Portal
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E131F] text-slate-100 font-sans p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-[#171F2E] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 space-y-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
            CLIENT ONBOARDING PORTAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {clientName ? `${clientName} Asset Upload` : 'Project Content Intake'}
          </h1>
          <p className="text-xs text-slate-400">
            Please upload your logos, promo offer details, and job photos below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Business Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Apex Mechanical"
              className="w-full bg-[#0E131F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
            />
          </div>

          {/* Offer Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Current Promo Offer / Headline Details
            </label>
            <textarea
              rows={3}
              value={offerDetails}
              onChange={(e) => setOfferDetails(e.target.value)}
              placeholder="e.g., $79 Seasonal AC Tune-Up Special, or 10% Off First Service Call"
              className="w-full bg-[#0E131F] border border-slate-800 rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Upload Logos & Job Site Photos
            </label>
            
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-[#0E131F] transition-colors relative cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 pointer-events-none">
                <span className="text-3xl block group-hover:scale-110 transition-transform">📁</span>
                <p className="text-xs font-bold text-slate-200">
                  Tap or Drag & Drop Files Here
                </p>
                <p className="text-[10px] text-slate-500">
                  Files upload directly to Google Drive
                </p>
              </div>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Selected Files ({selectedFiles.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-[#0E131F] border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="text-slate-400">🖼️</span>
                        <span className="text-white truncate text-[11px]">{file.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-500 hover:text-rose-400 font-bold px-1.5 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Alert */}
          {uploadStatus && (
            <p className="text-xs text-blue-400 font-semibold text-center animate-pulse">
              {uploadStatus}
            </p>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? 'Uploading to Google Drive...' : '🚀 Submit to Production Drive'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default function IntakePortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E131F]" />}>
      <IntakeFormContent />
    </Suspense>
  );
}