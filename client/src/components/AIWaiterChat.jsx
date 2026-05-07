import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const GREETINGS = {
  tr: 'Merhaba! Ben dijital garsonunuz. Ne istersiniz? "Acılı bir şey öner" veya "200 TL\'ye 2 kişilik" gibi sorabilirsiniz.',
  en: 'Hello! I\'m your digital waiter. Try asking "recommend something spicy" or "what fits a 200 TL budget for 2 people".',
  ar: 'مرحباً! أنا نادلك الرقمي. جرّب أن تسأل "اقترح شيئاً حاراً" أو "ما يناسب ميزانية 200 ليرة لشخصين".',
};

const PLACEHOLDER = {
  tr: 'Garsona sor...',
  en: 'Ask the waiter...',
  ar: 'اسأل النادل...',
};

const SEND = { tr: 'Gönder', en: 'Send', ar: 'إرسال' };
const TITLE = { tr: 'AI Garson', en: 'AI Waiter', ar: 'نادل ذكي' };
const THINKING = { tr: 'Düşünüyor...', en: 'Thinking...', ar: 'يفكر...' };
const ERROR_MSG = {
  tr: 'Cevap üretilemedi, tekrar deneyin.',
  en: 'Could not generate a reply, please try again.',
  ar: 'تعذر توليد الإجابة، حاول مرة أخرى.',
};

export default function AIWaiterChat({ menuQrToken, lang, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETINGS[lang] || GREETINGS.tr },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.slice(-7, -1); // son 6 mesajı history olarak gönder
      const res = await api.post(`/ai-waiter/${menuQrToken}/chat`, {
        message: text,
        history,
        lang,
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const msg = err?.response?.data?.error || ERROR_MSG[lang] || ERROR_MSG.tr;
      setMessages((m) => [...m, { role: 'assistant', content: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="ai-waiter-overlay" onClick={onClose}>
      <div className="ai-waiter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-waiter-header">
          <div className="ai-waiter-title">
            <span className="ai-waiter-icon">🤖</span>
            <span>{TITLE[lang] || TITLE.tr}</span>
          </div>
          <button className="ai-waiter-close" onClick={onClose} aria-label="close">×</button>
        </div>

        <div className="ai-waiter-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`ai-waiter-msg ${m.role === 'user' ? 'user' : 'assistant'} ${m.error ? 'error' : ''}`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="ai-waiter-msg assistant typing">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
          )}
        </div>

        <div className="ai-waiter-input-row">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={PLACEHOLDER[lang] || PLACEHOLDER.tr}
            maxLength={500}
            disabled={loading}
          />
          <button
            className="ai-waiter-send"
            onClick={send}
            disabled={loading || !input.trim()}
          >
            {loading ? '...' : (SEND[lang] || SEND.tr)}
          </button>
        </div>
      </div>
    </div>
  );
}
