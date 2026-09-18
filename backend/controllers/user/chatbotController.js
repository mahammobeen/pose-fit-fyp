const axios = require("axios");
const crypto = require("crypto");

// ----- IN‑MEMORY SESSION STORE (Resets on server restart) -----
const sessionStore = new Map();

// Helper: keyword matching with punctuation handling (ONLY for safety guardrails)
const containsKeyword = (text, keywords) => {
  const clean = text
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(clean);
  });
};

// ---------- LANGUAGE GATE: English-only chatbot ----------
// The bot must ONLY understand/answer English, and ONLY reply in English.
// Any other language (Urdu script, Roman Urdu, or anything else) gets a
// fixed English refusal and never reaches the LLM.
// Expanded on purpose: even ONE of these words appearing in an otherwise
// English-looking sentence means it's not pure English (e.g. "Can you
// mujhe beginner workout suggest kar sakte ho?" is mostly English words but
// is a Roman Urdu sentence and must be rejected).
const ROMAN_URDU_WORDS = [
  "mujhe",
  "mujhy",
  "mjhy",
  "mera",
  "meri",
  "mere",
  "tum",
  "tumhara",
  "tumhari",
  "tumhe",
  "kya",
  "kyun",
  "kyu",
  "kaise",
  "kaisay",
  "hai",
  "hain",
  "hoon",
  "ho",
  "raha",
  "rahi",
  "rahe",
  "karna",
  "karo",
  "kar",
  "krna",
  "kro",
  "sakte",
  "sakta",
  "sakti",
  "chahiye",
  "chahye",
  "nahi",
  "nahin",
  "bohat",
  "bahut",
  "bimaar",
  "tabiyat",
  "udaas",
  "pareshan",
  "thaka",
  "thaki",
  "pucha",
  "pochna",
  "poochna",
  "batao",
  "bataye",
  "dijiye",
  "dena",
  "kijiye",
  "aap",
  "ap",
  "hum",
  "humein",
  "humko",
  "apna",
  "apni",
  "apne",
  "iska",
  "uska",
  "iski",
  "uski",
  "se",
  "sy",
  "sey",
  "mein",
  "ke",
  "ki",
  "ka",
  "liye",
  "wala",
  "wali",
  "walay",
  "acha",
  "accha",
  "theek",
  "thek",
  "zyada",
  "thoda",
  "abhi",
  "phir",
  "lekin",
  "magar",
  "kuch",
  "sab",
  "koi",
  "kisi",
  "kaha",
  "kahan",
  "kab",
  "kitna",
  "kitni",
];
const isNonEnglish = (text) => {
  // Non-Latin script (Arabic/Urdu, Chinese, etc.)
  if (/[^\x00-\x7F]/.test(text)) return true;
  // Romanized Urdu / Hindi — a single strong indicator word is enough,
  // since these words essentially never appear in genuine English sentences.
  return ROMAN_URDU_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
};

// ---------- STATIC SAFETY GUARDRAILS (Never bypass) ----------
const EMERGENCY_KEYWORDS = [
  "ambulance",
  "1122",
  "911",
  "dying",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "chest pain",
  "passed out",
  "unconscious",
  "heavy bleeding",
  "severe bleeding",
  "heart attack",
  "stroke",
  "seizure",
  "allergic reaction",
  "choking",
];

// "how much" removed — was matching normal fitness/nutrition questions
// ("how much protein", "how much water") and wrongly blocking them.
const MEDICAL_REQUEST_KEYWORDS = [
  "prescribe",
  "prescription",
  "dosage",
  "what dose",
  "how many mg",
  "how many tablets",
  "how many pills",
  "medicine",
  "tablet",
  "capsule",
  "injection",
  "antibiotic",
  "painkiller",
  "paracetamol",
  "ibuprofen",
  "brufen",
  "panadol",
];

// Generic diet-plan / meal-schedule requests (not tied to a specific disease).
// Expanded to catch any request for concrete meal-by-meal recommendations,
// not just messages that literally say "diet plan".
const DIET_KEYWORDS = [
  "diet plan",
  "meal plan",
  "custom diet",
  "personalized diet",
  "nutrition plan",
  "diet schedule",
  "meal schedule",
  "eating schedule",
  "what should i eat",
  "eat for breakfast",
  "eat for lunch",
  "eat for dinner",
  "calculate my meals",
  "weekly meal",
  "monthly meal",
  "full day diet",
  "daily diet",
  "diet for a month",
  "diet for the month",
];

// Any mention of a specific medical condition/disease — regardless of
// whether the user is asking about diet, exercise, or anything else for it.
const MEDICAL_CONDITION_KEYWORDS = [
  "kidney",
  "gurda",
  "diabetes",
  "sugar ki bimari",
  "blood pressure",
  "high bp",
  "low bp",
  "thyroid",
  "liver",
  "hepatitis",
  "fatty liver",
  "heart disease",
  "cardiac",
  "cholesterol",
  "cancer",
  "tumor",
  "pcos",
  "pcod",
  "asthma",
  "arthritis",
  "ulcer",
  "hernia",
  "gallstone",
  "kidney stone",
  "gout",
  "anemia",
  "anaemia",
  "epilepsy",
  "migraine",
  "depression",
  "anxiety disorder",
  "copd",
  "tb",
  "tuberculosis",
];

// Common out-of-scope categories — handled with hardcoded refusal instead
// of relying on the LLM to self-police (a small model won't reliably decline).
const OUT_OF_SCOPE_KEYWORDS = [
  // politics
  "election",
  "government policy",
  "prime minister",
  "president",
  "parliament",
  "senate",
  "political party",
  "vote for",
  "geopolitics",
  // finance
  "stock market",
  "share price",
  "crypto",
  "bitcoin",
  "invest",
  "investment",
  "loan",
  "interest rate",
  "tax return",
  "forex",
  // astronomy
  "planet",
  "galaxy",
  "black hole",
  "astronaut",
  "nasa",
  "solar system",
  "telescope",
  "universe",
  // animals (unrelated to fitness)
  "dog breed",
  "cat breed",
  "wildlife",
  "zoo",
  "pet care",
  "animal species",
  // clinical mental health (standalone, not tied to fitness fatigue)
  "depression",
  "anxiety attack",
  "panic attack",
  "suicidal",
  "mental illness",
];

// NEW: any request to write code/programs/scripts, solve math/equations, or
// produce content for an unrelated subject (essays, homework, other
// sciences). Catches "wrapped" tricky requests like "write a Python program
// to calculate my BMI" — the ask is fundamentally a coding task, not
// fitness advice, so it must be refused regardless of the fitness wording.
const OFF_TOPIC_TASK_KEYWORDS = [
  "write a program",
  "write a python",
  "write code",
  "write a script",
  "write a function",
  "coding",
  "programming",
  "algorithm",
  "write an essay",
  "write a poem",
  "write a story",
  "solve for x",
  "math problem",
  "algebra",
  "calculus",
  "derivative",
  "integral",
  "chemistry formula",
  "physics formula",
  "homework",
  "assignment",
  "write a letter",
  "write an email",
  "sql query",
  "html code",
  "css code",
];

// Fatigue-related words that make a "mental health-ish" message still in-scope
const FATIGUE_CONTEXT_WORDS = ["tired", "fatigue", "low energy", "exhausted"];

// ---------- CLASSIFICATION ----------
const classifyQuestion = (question) => {
  const lower = question.toLowerCase().trim();

  if (containsKeyword(lower, EMERGENCY_KEYWORDS)) return "emergency";

  // Disease/condition mentions take priority over generic diet/medical checks
  if (containsKeyword(lower, MEDICAL_CONDITION_KEYWORDS))
    return "medical_condition";

  if (containsKeyword(lower, OFF_TOPIC_TASK_KEYWORDS)) return "out_of_scope";

  if (containsKeyword(lower, DIET_KEYWORDS)) return "nutritionist";
  if (containsKeyword(lower, MEDICAL_REQUEST_KEYWORDS))
    return "medical_request";

  if (containsKeyword(lower, OUT_OF_SCOPE_KEYWORDS)) {
    const isFatigueContext = containsKeyword(lower, FATIGUE_CONTEXT_WORDS);
    const isMentalHealthWord = containsKeyword(lower, [
      "depression",
      "anxiety attack",
      "panic attack",
      "suicidal",
      "mental illness",
    ]);
    if (isMentalHealthWord && isFatigueContext) {
      return "allowed";
    }
    return "out_of_scope";
  }

  return "allowed";
};

// ---------- SYSTEM PROMPT (Context-Aware + Anatomical Location Rule) ----------
const getSystemPrompt = () => {
  return `
You are PoseFit — a strictly focused fitness, nutrition, and wellness assistant.

LANGUAGE RULE (STRICT):
- ALWAYS respond only in English. Never respond in Urdu, Roman Urdu, or any other language, no matter what language the user writes in.

CRITICAL RULE: STAY IN THE CONVERSATION
- You will receive the full conversation history. Use it to understand what the user is referring to.
- If the user gives a short reply (like "inside", "front", "yes", "no", "left") AFTER you asked them a question, treat it as a CONTINUATION of that conversation. Do NOT reset to a generic opening.

CONSISTENCY RULE:
- Your answers must stay logically consistent with what you already told this user earlier in the conversation. Do not contradict your own previous advice. If new information genuinely changes your recommendation, briefly acknowledge the change rather than silently contradicting yourself.

ANATOMICAL LOCATION RULE:
- If a user replies with a short location word like "front", "back", "inside", "outside", "left", "right", "top", "bottom" – and you previously asked them about pain location – you MUST interpret these as specific anatomical locations. Do NOT ask for clarification on these words. Continue giving injury advice (RICE, stretches, doctor referral) based on that location.

IN-SCOPE TOPICS (Always answer):
- Exercise, workouts, stretching, cardio, strength training.
- Muscle pain, stiffness, soreness, injuries (RICE + doctor referral).
- Tiredness, fatigue, low energy (hydration, rest, light activity).
- Food, diet, weight, nutrition (general/healthy population only — NOT tied to any diagnosed disease).

OUT-OF-SCOPE — ALWAYS DECLINE, NEVER PARTIALLY ANSWER:
- Politics, finance, astronomy, animals, unrelated events, clinical mental health (unless tied to fitness fatigue), math, any academic subject other than fitness/nutrition.
- NEVER write code, a program, a script, a function, or solve equations/homework — even if the request is dressed up as a fitness task (e.g. "write a Python program to calculate my BMI"). Refuse and instead just explain the concept in plain language if relevant.
- Example refusal: "I'm only able to help with fitness, exercise, and general nutrition questions — I can't help with that."

RULES:
1. Respond only in English, always.
2. NEVER prescribe medication or dosages. Say: "Consult a doctor for severe pain."
3. NEVER give diet, exercise, or lifestyle advice tied to a specific diagnosed medical condition (e.g. kidney disease, diabetes, thyroid, heart conditions). Redirect to a doctor instead.
4. Keep answers concise (2–4 sentences). No emojis.
5. If truly vague (not answering a previous question), ask for clarification.
6. If the topic is out-of-scope, refuse clearly and briefly — do not partially answer before refusing.
`;
};

// Main handler
const handleChatbot = async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY)
    return res.status(500).json({ reply: "Chatbot service unavailable." });

  const { message, sessionId } = req.body; // Expect sessionId from frontend
  if (!message || message.trim() === "") {
    return res
      .status(400)
      .json({ reply: "Please ask a question about fitness or nutrition." });
  }

  // ----- 1. Get or create session memory -----
  // If the frontend doesn't send a sessionId, generate one and send it back
  // in the response. The frontend MUST store this and send it back with
  // every subsequent request in the same conversation, otherwise every
  // message starts a brand-new, empty history.
  let id = sessionId || req.headers["x-session-id"];
  if (!id) {
    id = crypto.randomUUID();
  }
  if (!sessionStore.has(id)) {
    sessionStore.set(id, []);
  }
  let chatHistory = sessionStore.get(id);

  // ----- 2. English-only gate (runs before anything else) -----
  if (isNonEnglish(message)) {
    return res.json({
      reply:
        "I can understand and respond only in English. Please ask your question in English.",
      sessionId: id,
    });
  }

  // ----- 3. Add user message to history -----
  chatHistory.push({ role: "user", content: message });

  const intent = classifyQuestion(message);

  // ----- HARDCODED SAFETY GUARDRAILS (Run before LLM) -----
  const respondHardcoded = (reply) => {
    chatHistory.push({ role: "assistant", content: reply });
    sessionStore.set(id, chatHistory.slice(-8));
    return res.json({ reply, sessionId: id });
  };

  if (intent === "emergency") {
    return respondHardcoded(
      "If you are experiencing an emergency, please call local emergency services immediately.",
    );
  }
  if (intent === "medical_condition") {
    return respondHardcoded(
      "I can't give diet or exercise advice tied to a specific medical condition. Please consult your doctor or a specialist for that.",
    );
  }
  if (intent === "nutritionist") {
    return respondHardcoded(
      "For a diet plan, please use the Diet Plan Generator module on our website. For more accurate, personalized guidance, you can also book an appointment with one of our professionals through the website.",
    );
  }
  if (intent === "medical_request") {
    return respondHardcoded(
      "I cannot prescribe or recommend specific medications. Please consult a qualified doctor or pharmacist.",
    );
  }
  if (intent === "out_of_scope") {
    return respondHardcoded(
      "I can only help with fitness, exercise, and general nutrition questions — that topic (or task) is outside what I can help with.",
    );
  }

  // ----- 4. Build full conversation with history -----
  chatHistory = chatHistory.slice(-8);
  sessionStore.set(id, chatHistory);

  const conversation = [
    { role: "system", content: getSystemPrompt() },
    ...chatHistory,
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
      },
    );

    let reply = response.data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      reply =
        "I can only assist with fitness and nutrition questions. How can I help you with your health today?";
    }

    // ----- 5. Save assistant reply to memory -----
    chatHistory.push({ role: "assistant", content: reply });
    chatHistory = chatHistory.slice(-8);
    sessionStore.set(id, chatHistory);

    return res.json({ reply, sessionId: id });
  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return res.status(500).json({
      reply: "Something went wrong on our end. Please try again in a moment.",
      sessionId: id,
    });
  }
};

module.exports = { handleChatbot };
