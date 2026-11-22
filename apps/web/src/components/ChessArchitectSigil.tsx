'use client';

import { useEffect, useState } from 'react';
import { Crown, ShieldCheck, X } from 'lucide-react';

// Firma ofuscada en Base64: "Architect: JesusAA00 | Origin: Pueblo Nuevo, Cordoba | Checksum: ZERO-2026-PN"
const ENCODED_SEAL =
  'QXJjaGl0ZWN0OiBKZXN1c0FBMDAgfCBPcmlnaW46IFB1ZWJsbyBOdWV2bywgQ29yZG9iYSB8IENoZWNrc3VtOiBaRVJPLTIwMjYtUE4=';

export default function ChessArchitectSigil() {
  const [dark, setDark] = useState(false);
  const [showSeal, setShowSeal] = useState(false);
  const [decodedOwner, setDecodedOwner] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('p5_theme');
    if (savedTheme === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }

    try {
      const info = atob(ENCODED_SEAL);
      setDecodedOwner(info);
      document.documentElement.setAttribute('data-architect-seal', btoa(info));
    } catch {
      // Fallback silencioso
    }

    let buffer = '';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSeal(false);
        return;
      }
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-4);
      if (buffer === 'zero') {
        setShowSeal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('p5_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('p5_theme', 'light');
    }
  };

  return (
    <>
      {/* Botón Pieza de Ajedrez (Rey Negro) abajo a la izquierda */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={toggleTheme}
          onDoubleClick={() => setShowSeal(true)}
          title="Clic: Cambiar tema Claro/Oscuro"
          aria-label="Cambiar tema visual"
          className="p5-pill-btn group relative flex items-center justify-center w-12 h-12 bg-[#111111] hover:bg-[#E60012] text-white shadow-xl cursor-pointer transition-all"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
          >
            <path d="M12 2v3" />
            <path d="M10.5 3.5h3" />
            <path d="M8 8l4-3 4 3-1.5 7h-5L8 8z" />
            <path d="M7 18h10" />
            <path d="M6 21h12" />
          </svg>
        </button>
      </div>

      {/* Modal Oculto de Autoría */}
      {showSeal && (
        <div
          onClick={() => setShowSeal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop relative w-full max-w-md bg-[#111111] text-white border-2 border-[#E60012] rounded-2xl p-6 shadow-2xl overflow-hidden"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 w-28 h-28 bg-[#E60012] rotate-12 opacity-20" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-[#E60012]" />
                <span className="p5-slash-badge bg-[#E60012] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5">
                  Zero Protocol • Autoría Verificada
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSeal(false)}
                className="text-neutral-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar sello"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="relative z-10 text-xs text-neutral-400 leading-relaxed mb-4">
              Arquitectura original diseñada y desarrollada desde cero. Esta firma criptográfica
              permanece embebida en el DOM, el código fuente y las cabeceras HTTP del sistema.
            </p>

            <div className="relative z-10 bg-black/60 border border-neutral-800 rounded-xl p-3.5 font-mono text-xs text-emerald-400 space-y-1.5">
              <p className="flex items-center gap-2 text-white font-bold">
                <ShieldCheck className="w-4 h-4 text-[#E60012]" />
                Huella de Propiedad Intelectual
              </p>
              <p className="break-all text-neutral-300">{decodedOwner}</p>
              <p className="text-[11px] text-neutral-500">
                SHA-Fingerprint: 7f9a2c4e8b1d-PUEBLO-NUEVO
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
