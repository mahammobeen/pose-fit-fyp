import { useState, useRef, useEffect } from "react";
import { httpClient } from "../../lib/http";
import { Send, Bot, User, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import UserLayout from "../../components/user/UserLayout";

// Helper: Get or create session ID stored in localStorage 
const getSessionId = () => {
  let id = localStorage.getItem('posefit_session_id');
  if (!id) {
    id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem('posefit_session_id', id);
  }
  return id;
};

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(getSessionId); // Initialize with persistent ID

  const messagesEndRef = useRef(null);

  // SCROLL TO BOTTOM
    const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // SEND MESSAGE 
  const sendMessage = async (textOverride = null) => {
    const text = textOverride ?? input;

    if (!text.trim() || loading) return;

    const cleanText = text.trim();

    // Add user message immediately
    const userMessage = {
      type: "user",
      text: cleanText,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (!textOverride) {
      setInput("");
    }

    setLoading(true);

    try {
      const { data } = await httpClient.post("/user/chatbot", {
        message: cleanText,
        sessionId: sessionId,  // <-- Include sessionId
      });

      const botReply = data?.reply || "Sorry, I could not generate a response.";

      const botMessage = {
        type: "bot",
        text: botReply,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);

      // Backend error message
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (error?.request
          ? "Unable to connect to the server. Please try again."
          : "Something went wrong. Please try again.");

      // Show error to user
      toast.error(errorMessage);

      // Also show message inside chat
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ENTER KEY
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // CLEAR CHAT (also resets session on backend)
  const clearChat = () => {
    if (messages.length === 0) return;

    // Generate a new session ID so the backend starts fresh
    const newId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem('posefit_session_id', newId);
    setSessionId(newId);

    // Clear messages locally
    setMessages([]);
    setInput("");

    toast.success("Chat cleared successfully");
  };

  // SUGGESTIONS
  const suggestions = [
    "Best exercises for beginners?",
    "How to lose weight?",
    "Healthy breakfast ideas",
    "Posture improvement tips",
  ];

  // UI
  return (
    <UserLayout>
      <div className="relative min-h-full bg-transparent p-4 sm:p-6 md:p-8 font-sans">
       
           // HEADER
        <header className="max-w-4xl mx-auto mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
              AI Fitness Assistant
              <Sparkles className="text-brand-dark h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
            </h1>

            <p className="text-gray-500 font-medium mt-1 sm:mt-2 text-sm sm:text-base">
              Your 24/7 fitness and nutrition assistant.
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-btn border border-brand-light/50 bg-surface/80 backdrop-blur-sm hover:bg-brand-light/25 text-gray-600 font-bold text-xs uppercase tracking-widest transition-all shadow-card disabled:opacity-50 self-start md:self-auto"
            >
              <Trash2 size={16} />
              Clear Chat
            </button>
          )}
        </header>

            // CHAT CONTAINER
              <div className="max-w-4xl mx-auto h-[calc(100vh-14rem)] min-h-[460px] flex flex-col bg-surface/85 rounded-3xl sm:rounded-[2rem] border border-brand-light/50 shadow-card-hover backdrop-blur-xl overflow-hidden">
         
             // CHAT HISTORY       
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-7 bg-brand-light/10">
           
              //  EMPTY STATE
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="h-20 w-20 bg-brand-light/35 rounded-card border border-brand-light/50 shadow-card flex items-center justify-center">
                    <Bot size={45} className="text-brand-dark" />
                  </div>

                  <div className="absolute -right-1 -top-1 h-5 w-5 bg-brand rounded-full border-4 border-surface" />
                </div>

                <h3 className="text-2xl font-extrabold text-gray-800">
                  Interactive Fitness AI
                </h3>

                <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2 font-medium">
                  Ask me anything about your diet, workouts, posture, or healthy
                  lifestyle.
                </p>

                {/* Suggestions */}

                <div className="flex flex-wrap justify-center gap-3 mt-7">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      disabled={loading}
                      className="px-4 py-3 bg-surface/80 hover:bg-brand hover:text-white border border-brand-light/40 rounded-btn text-xs font-bold text-gray-600 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

                // MESSAGES
              {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-3 ${
                  msg.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}

                <div
                  className={`h-10 w-10 shrink-0 rounded-btn flex items-center justify-center shadow-card ${
                    msg.type === "user"
                      ? "bg-brand text-white"
                      : "bg-brand-light/30 text-brand-dark border border-brand-light/50"
                  }`}
                >
                  {msg.type === "user" ? <User size={20} /> : <Bot size={20} />}
                </div>

                {/* Message */}

                <div
                  className={`max-w-[80%] px-5 py-4 rounded-card text-sm font-medium leading-relaxed shadow-card whitespace-pre-wrap ${
                    msg.type === "user"
                      ? "bg-brand text-white rounded-br-md"
                      : "bg-surface/90 text-gray-700 rounded-bl-md border border-brand-light/40"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

             // LOADING         
            {loading && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-btn bg-brand-light/30 text-brand-dark border border-brand-light/50 flex items-center justify-center shadow-card">
                  <Bot size={20} />
                </div>

                <div className="bg-surface/90 px-5 py-4 rounded-card rounded-bl-md border border-brand-light/40 shadow-card flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-brand-dark animate-spin" />

                  <span className="text-xs uppercase font-bold text-gray-400 tracking-widest">
                    AI is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

             // INPUT
          <div className="p-5 md:p-6 bg-surface/90 border-t border-brand-light/40">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your AI Coach..."
                disabled={loading}
                className="w-full h-14 pl-5 pr-16 bg-white/60 border border-brand-light/50 rounded-btn outline-none focus:ring-2 focus:ring-brand-light/60 focus:border-brand focus:bg-white/80 transition-all font-medium text-gray-700 placeholder:text-gray-400 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-btn bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
              AI provides general fitness guidance. Consult a qualified
              professional for specific medical or exercise advice.
            </p>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

export default Chatbot;