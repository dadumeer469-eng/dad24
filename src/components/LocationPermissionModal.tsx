import React from 'react';
import { MapPin } from 'lucide-react';

export default function LocationPermissionModal({ 
  onAllow, 
  onLater 
}: { 
  onAllow: () => void, 
  onLater: () => void 
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-[#D70F64]/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <MapPin className="w-8 h-8 text-[#D70F64]" />
        </div>
        <h2 className="text-xl font-black text-white text-center mb-2 tracking-tight">Location Access</h2>
        <p className="text-zinc-400 text-sm text-center mb-8 leading-relaxed font-medium">
          📍 Dadu Food ko aapki location chahiye taake ghar tak khana pahunche!
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onAllow}
            className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-colors cursor-pointer"
          >
            Allow
          </button>
          <button 
            onClick={onLater}
            className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold py-4 rounded-2xl uppercase tracking-wider text-sm transition-colors cursor-pointer"
          >
            Baad Mein
          </button>
        </div>
      </div>
    </div>
  );
}
