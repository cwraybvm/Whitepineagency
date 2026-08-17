'use client';

interface Variant {
  id: string;
  headline: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

function ctr(v: Variant): string {
  if (v.impressions === 0) return '—';
  return `${((v.clicks / v.impressions) * 100).toFixed(2)}%`;
}

function cpa(v: Variant): string {
  if (v.conversions === 0) return '—';
  return `$${(v.spend / v.conversions).toFixed(2)}`;
}

export default function CampaignComparisonTable({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) {
    return <div className="text-gray-500 text-sm">No variants yet.</div>;
  }

  return (
    <div className="overflow-x-auto border border-white/10 rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
          <tr>
            <th className="text-left p-3">Headline</th>
            <th className="text-right p-3">Spend</th>
            <th className="text-right p-3">Impressions</th>
            <th className="text-right p-3">Clicks</th>
            <th className="text-right p-3">CTR</th>
            <th className="text-right p-3">Conversions</th>
            <th className="text-right p-3">CPA</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className="border-t border-white/5">
              <td className="p-3 text-white">{v.headline}</td>
              <td className="p-3 text-right text-gray-300">${v.spend.toFixed(2)}</td>
              <td className="p-3 text-right text-gray-300">{v.impressions.toLocaleString()}</td>
              <td className="p-3 text-right text-gray-300">{v.clicks.toLocaleString()}</td>
              <td className="p-3 text-right text-emerald-400">{ctr(v)}</td>
              <td className="p-3 text-right text-gray-300">{v.conversions}</td>
              <td className="p-3 text-right text-emerald-400">{cpa(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
