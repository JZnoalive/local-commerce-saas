'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

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
      text: '¡Hola! Soy el asistente de comercios y domicilios de Pueblo Nuevo. Pregúntame qué tiendas están abiertas o busca cualquier producto.',
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
      const res = await fetch('http://localhost:8000/chat', {
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
          text: 'No pude conectarme con el servidor IA. Verifica que FastAPI esté encendido en el puerto 8000.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg transition-all cursor-pointer font-medium"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Asistente IA</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Asistente Local</p>
                <p className="text-xs text-emerald-100">Inventario y horarios en vivo</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-emerald-700 p-1 rounded cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50 text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[85%] whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white ml-auto'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-xl max-w-[70%] animate-pulse">
                Consultando inventario...
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-2 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: ¿Qué hay de comer hoy?"
              className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2 rounded-xl cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
