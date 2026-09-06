const axios = require("axios");

// ----- IN‑MEMORY SESSION STORE (Resets on server restart) -----
const sessionStore = new Map();

// Helper: keyword matching with punctuation handling (ONLY for safety guardrails)
const containsKeyword = (text, keywords) => {
  const clean = text.replace(/[^\w\s]/gi, " ").replace(/\s+/g, " ").trim();
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(clean);
  });
};

// Language detection: Roman Urdu fallback
const detectLanguage = (text) => {
  const romanUrduWords = ["mujhe","mera","meri","tum","tumhara","kya","kyun","kaise","hai","hain","hoon","karna","chahiye","nahi","bohat","bimaar","tabiyat","udaas","pareshan","thaka"];
  const matches = romanUrduWords.filter(w => new RegExp(`\\b${w}\\b`, "i").test(text)).length;
  return matches >= 2 ? "urdu" : "english";
};

// ---------- STATIC SAFETY GUARDRAILS (Never bypass) ----------
const EMERGENCY_KEYWORDS = ["ambulance","1122","911","dying","can't breathe","cannot breathe","shortness of breath","chest pain","passed out","unconscious","heavy bleeding","severe bleeding","heart attack","stroke","seizure","allergic reaction","choking"];
const MEDICAL_REQUEST_KEYWORDS = ["prescribe","dosage","dose","how much","medicine","tablet","capsule","injection","antibiotic","painkiller","paracetamol","ibuprofen","brufen","panadol"];
const DIET_KEYWORDS = ["diet plan","meal plan","custom diet","personalized diet"];

// ---------- SIMPLIFIED CLASSIFICATION (ONLY safety + diet) ----------
const classifyQuestion = (question) => {
  const lower = question.toLowerCase().trim();
  if (containsKeyword(lower, EMERGENCY_KEYWORDS)) return "emergency";
  if (containsKeyword(lower, DIET_KEYWORDS)) return "nutritionist";
  if (containsKeyword(lower, MEDICAL_REQUEST_KEYWORDS)) return "medical_request";
  return "allowed";
};

// ---------- SYSTEM PROMPT (Context-Aware + Anatomical Location Rule) ----------
const getSystemPrompt = (language) => {
  const langInstruction = (language === "urdu")
    ? "Respond in natural Roman Urdu (Latin script)."
    : "Respond in clear, simple English.";

  return `
You are PoseFit — a strictly focused fitness, nutrition, and wellness assistant.

CRITICAL RULE: STAY IN THE CONVERSATION
- You will receive the full conversation history. Use it to understand what the user is referring to.
- If the user gives a short reply (like "inside", "front", "yes", "no", "left") AFTER you asked them a question, treat it as a CONTINUATION of that conversation. Do NOT reset to a generic opening.

ANATOMICAL LOCATION RULE:
- If a user replies with a short location word like "front", "back", "inside", "outside", "left", "right", "top", "bottom" – and you previously asked them about pain location – you MUST interpret these as specific anatomical locations. Do NOT ask for clarification on these words. Continue giving injury advice (RICE, stretches, doctor referral) based on that location.

IN-SCOPE TOPICS (Always answer):
- Exercise, workouts, stretching, cardio, strength training.
- Muscle pain, stiffness, soreness, injuries (RICE + doctor referral).
- Tiredness, fatigue, low energy (hydration, rest, light activity).
- Food, diet, weight, nutrition.

OUT-OF-SCOPE TOPICS (Politely decline):
- Politics, finance, astronomy, animals, unrelated events, clinical mental health (depression, anxiety) unless tied to fitness fatigue.

RULES:
1. ${langInstruction}
2. NEVER prescribe medication or dosages. Say: "Consult a doctor for severe pain."
3. Keep answers concise (2–4 sentences). No emojis.
4. If truly vague (not answering a previous question), ask for clarification.
`;
};

// Main handler
const handleChatbot = async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ reply: "Chatbot service unavailable." });

  const { message, sessionId } = req.body; // Expect sessionId from frontend
  if (!message || message.trim() === "") {
    return res.status(400).json({ reply: "Please ask a question about fitness or nutrition." });
  }

  // ----- 1. Get or create session memory -----
  // Use provided sessionId, or fallback to IP address
  const id = sessionId || req.headers['x-session-id'] || req.ip || 'default-session';
  if (!sessionStore.has(id)) {
    sessionStore.set(id, []);
  }
  let chatHistory = sessionStore.get(id);

  // ----- 2. Add user message to history -----
  chatHistory.push({ role: "user", content: message });
  // Keep only last 8 messages to save tokens
  if (chatHistory.length > 8) {
    chatHistory = chatHistory.slice(-8);
    sessionStore.set(id, chatHistory);
  }

  const lang = detectLanguage(message);
  const isUrdu = (lang === "urdu");
  const intent = classifyQuestion(message);

  // ----- HARDCODED SAFETY GUARDRAILS (Run before LLM) -----
  if (intent === "emergency") {
    return res.json({
      reply: isUrdu
        ? "Agar emergency hai to foran local emergency services (1122) ko call karein aur kisi qareebi shakhs ko bataayein."
        : "If you are experiencing an emergency, please call local emergency services immediately."
    });
  }
  if (intent === "nutritionist") {
    return res.json({
      reply: isUrdu
        ? "Personalized diet plan ke liye aap PoseFit ke certified nutritionist se rabta kar sakte hain."
        : "For a customized meal plan, please consult with a PoseFit certified nutritionist."
    });
  }
  if (intent === "medical_request") {
    return res.json({
      reply: isUrdu
        ? "Main medicines ya medical treatments suggest nahi kar sakta. Khas dosage ke liye doctor ya pharmacist se mashwara karein."
        : "I cannot prescribe or recommend specific medications. Please consult a qualified doctor or pharmacist."
    });
  }

  // ----- 3. Build full conversation with history -----
  const conversation = [
    { role: "system", content: getSystemPrompt(lang) },
    ...chatHistory
  ];

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: conversation,
        max_tokens: 400,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      }
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();

    // Fallback if LLM returns empty
    if (!reply) {
      reply = isUrdu
        ? "Mai is sawal ka jawab nahi de sakta, lekin agar aap fitness ya nutrition ke baare mein poochhna chahte hain toh main madad kar sakta hoon."
        : "I can only assist with fitness and nutrition questions. How can I help you with your health today?";
    }

    // ----- 4. Save assistant reply to memory -----
    chatHistory.push({ role: "assistant", content: reply });
    if (chatHistory.length > 8) {
      chatHistory = chatHistory.slice(-8);
    }
    sessionStore.set(id, chatHistory);

    return res.json({ reply });

  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return res.status(500).json({
      reply: isUrdu
        ? "Server mein masla aa raha hai. Baraye meherbani kuch der baad dobara koshish karein."
        : "Something went wrong on our end. Please try again in a moment."
    });
  }
};

module.exports = { handleChatbot };