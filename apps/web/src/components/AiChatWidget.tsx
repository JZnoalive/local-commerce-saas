'use client';

import { useState } from 'react';
import { MessageSquareText, X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '¡Hola! Soy el asistente de Pueblo Nuevo. Pregúntame qué tiendas están abiertas ahora mismo, precios o valor de domicilios.',
    },
  ]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_BOT_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'No pude conectar con el servidor IA. Verifica que el backend esté encendido.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p5-pill-btn group flex items-center gap-3 bg-[#111111] hover:bg-[#E60012] text-white pl-5 pr-6 py-3.5 shadow-xl cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E60012] group-hover:bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E60012] group-hover:bg-white" />
          </span>
          <MessageSquareText className="w-4 h-4 text-white/90" />
          <span className="text-xs font-extrabold tracking-wider uppercase">Asistente IA</span>
        </button>
      ) : (
        <div className="animate-modal-pop w-80 sm:w-96 bg-white border border-neutral-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Cabecera limpia con acento diagonal carmesí */}
          <div className="relative bg-[#111111] text-white px-5 py-4 flex items-center justify-between overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#E60012] rotate-12 opacity-90" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl">
                <Sparkles className="w-4 h-4 text-[#E60012]" />
              </div>
              <div>
                <p className="font-extrabold text-sm tracking-wide">Asistente Local</p>
                <p className="text-[11px] text-neutral-400">Inventario y horarios en vivo</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative z-10 bg-black/30 hover:bg-black/60 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[#F7F7F5] text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-line leading-relaxed transition-all ${
                  m.role === 'user'
                    ? 'bg-[#111111] text-white ml-auto rounded-br-sm shadow-sm'
                    : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-white border border-neutral-200 text-neutral-500 px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-[70%] text-xs font-medium animate-pulse">
                Consultando inventario en vivo...
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-neutral-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="¿Qué tortas o comidas hay hoy?"
              className="flex-1 text-sm px-3.5 py-2.5 bg-[#F7F7F5] border border-transparent focus:border-neutral-300 focus:bg-white rounded-xl text-neutral-900 transition-all focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#E60012] hover:bg-[#111111] disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
