import { useState, useRef, useEffect } from "react";
import { httpClient } from "../../lib/http";
import { Send, Bot, User, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import UserLayout from "../../components/user/UserLayout";

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // =====================================================
  // SCROLL TO BOTTOM
  // =====================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

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

  // =====================================================
  // ENTER KEY
  // =====================================================

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // =====================================================
  // CLEAR CHAT
  // =====================================================

  const clearChat = () => {
    if (messages.length === 0) return;

    setMessages([]);
    setInput("");

    toast.success("Chat cleared successfully");
  };

  // =====================================================
  // SUGGESTIONS
  // =====================================================

  const suggestions = [
    "Best exercises for beginners?",
    "How to lose weight?",
    "Healthy breakfast ideas",
    "Posture improvement tips",
  ];

  // =====================================================
  // UI
  // =====================================================

  return (
    <UserLayout>
      <div className="min-h-full bg-gray-50/50 p-4 sm:p-6 md:p-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="max-w-4xl mx-auto mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              AI Fitness Assistant
              <Sparkles className="text-indigo-500 h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
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
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 self-start md:self-auto"
            >
              <Trash2 size={16} />
              Clear Chat
            </button>
          )}
        </header>

        {/* =====================================================
            CHAT CONTAINER
        ===================================================== */}

        <div className="max-w-4xl mx-auto h-[calc(100vh-14rem)] min-h-[460px] flex flex-col bg-white rounded-3xl sm:rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          {/* =====================================================
              CHAT HISTORY
          ===================================================== */}

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-7 bg-gray-50/30">
            {/* =====================================================
                EMPTY STATE
            ===================================================== */}

            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="h-20 w-20 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                    <Bot size={45} className="text-indigo-500" />
                  </div>

                  <div className="absolute -right-1 -top-1 h-5 w-5 bg-green-500 rounded-full border-4 border-white" />
                </div>

                <h3 className="text-2xl font-black text-gray-900">
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
                      className="px-4 py-3 bg-white hover:bg-indigo-600 hover:text-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 shadow-sm transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =====================================================
                MESSAGES
            ===================================================== */}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-3 ${
                  msg.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}

                <div
                  className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${
                    msg.type === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-indigo-600 border border-gray-100"
                  }`}
                >
                  {msg.type === "user" ? <User size={20} /> : <Bot size={20} />}
                </div>

                {/* Message */}

                <div
                  className={`max-w-[80%] px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.type === "user"
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-white text-gray-700 rounded-bl-md border border-gray-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* =====================================================
                LOADING
            ===================================================== */}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-white text-indigo-600 border border-gray-100 flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>

                <div className="bg-white px-5 py-4 rounded-3xl rounded-bl-md border border-gray-100 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />

                  <span className="text-xs uppercase font-bold text-gray-400 tracking-widest">
                    AI is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* =====================================================
              INPUT
          ===================================================== */}

          <div className="p-5 md:p-6 bg-white border-t border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your AI Coach..."
                disabled={loading}
                className="w-full h-14 pl-5 pr-16 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-all font-medium text-gray-700 placeholder:text-gray-400 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
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
