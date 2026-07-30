'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Share2 } from 'lucide-react';

interface ContentPost {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  platforms: string[];
  instagramCaption?: string;
  linkedinPost?: string;
}

export default function SocialCalendar({ organizationId }: { organizationId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [organizationId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/calendar?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Social Content Calendar</h2>
            <p className="text-xs text-neutral-400">Schedule & manage cross-channel releases</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={prevMonth}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white w-32 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Header Days */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-neutral-400 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 gap-2">
        {/* Blank Padding Days */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-28 bg-neutral-950/40 rounded-xl border border-neutral-800/40 opacity-30" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
          const dayNum = dayIdx + 1;
          const dayPosts = posts.filter((p) => {
            if (!p.scheduledAt) return false;
            const postDate = new Date(p.scheduledAt);
            return (
              postDate.getDate() === dayNum &&
              postDate.getMonth() === currentDate.getMonth() &&
              postDate.getFullYear() === currentDate.getFullYear()
            );
          });

          return (
            <div
              key={dayNum}
              className="h-28 bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-2 flex flex-col justify-between hover:border-neutral-700 transition"
            >
              <span className="text-xs font-semibold text-neutral-400">{dayNum}</span>

              <div className="space-y-1 overflow-y-auto max-h-20 custom-scrollbar">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-md text-[10px] text-emerald-200 truncate cursor-pointer hover:bg-emerald-500/25 transition"
                  >
                    <div className="font-semibold truncate">{post.title}</div>
                    <div className="flex items-center space-x-1 text-[9px] text-emerald-400/80">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(post.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}