import IssueTicker from '@/components/bvm/IssueTicker';

export default function BvmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="px-6 pt-3 md:px-8 md:pt-4 max-w-6xl mx-auto">
        <IssueTicker />
      </div>
      {children}
    </div>
  );
}
