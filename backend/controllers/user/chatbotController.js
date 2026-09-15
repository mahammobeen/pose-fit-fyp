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

// Language detection: Roman Urdu fallback
const detectLanguage = (text) => {
  const romanUrduWords = [
    "mujhe",
    "mera",
    "meri",
    "tum",
    "tumhara",
    "kya",
    "kyun",
    "kaise",
    "hai",
    "hain",
    "hoon",
    "karna",
    "chahiye",
    "nahi",
    "bohat",
    "bimaar",
    "tabiyat",
    "udaas",
    "pareshan",
    "thaka",
  ];
  const matches = romanUrduWords.filter((w) =>
    new RegExp(`\\b${w}\\b`, "i").test(text),
  ).length;
  return matches >= 2 ? "urdu" : "english";
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

// FIX: "how much" removed — it was matching normal fitness/nutrition
// questions ("how much protein", "how much water") and wrongly blocking
// them. Now only matches phrases that actually mean "give me a dosage".
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

// Generic diet-plan requests (not tied to a specific disease)
const DIET_KEYWORDS = [
  "diet plan",
  "meal plan",
  "custom diet",
  "personalized diet",
];

// NEW: any mention of a specific medical condition/disease — regardless of
// whether the user is asking about diet, exercise, or anything else for it.
// Per your requirement: chatbot should NEVER give advice tied to a named
// condition, it should always redirect to a doctor.
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

// NEW: common out-of-scope categories — handled with hardcoded refusal
// instead of relying on the LLM to self-police, since a small model won't
// reliably decline on its own.
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

// Fatigue-related words that make a "mental health-ish" message still in-scope
const FATIGUE_CONTEXT_WORDS = [
  "tired",
  "fatigue",
  "low energy",
  "thaka",
  "thaki",
  "susti",
  "kamzori",
  "exhausted",
];

// ---------- CLASSIFICATION ----------
const classifyQuestion = (question) => {
  const lower = question.toLowerCase().trim();

  if (containsKeyword(lower, EMERGENCY_KEYWORDS)) return "emergency";

  // Disease/condition mentions take priority over generic diet/medical checks
  if (containsKeyword(lower, MEDICAL_CONDITION_KEYWORDS))
    return "medical_condition";

  if (containsKeyword(lower, DIET_KEYWORDS)) return "nutritionist";
  if (containsKeyword(lower, MEDICAL_REQUEST_KEYWORDS))
    return "medical_request";

  if (containsKeyword(lower, OUT_OF_SCOPE_KEYWORDS)) {
    // don't block genuine "I feel tired/low energy" fitness questions
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
const getSystemPrompt = (language) => {
  const langInstruction =
    language === "urdu"
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
- Food, diet, weight, nutrition (general/healthy population only — NOT tied to any diagnosed disease).

OUT-OF-SCOPE TOPICS (Always decline, never answer even partially):
- Politics, finance, astronomy, animals, unrelated events, clinical mental health (depression, anxiety) unless tied to fitness fatigue.
- Example of a correct refusal: "I'm only able to help with fitness, exercise, and general nutrition questions — I can't help with that topic."

RULES:
1. ${langInstruction}
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
  // FIX: if the frontend doesn't send a sessionId, we generate one and send
  // it back in the response. The frontend MUST store this (e.g. in
  // localStorage or React state) and send it back with every subsequent
  // request under the same conversation — otherwise every message starts a
  // brand-new, empty history and the bot will "forget" everything.
  let id = sessionId || req.headers["x-session-id"];
  let isNewSession = false;
  if (!id) {
    id = crypto.randomUUID();
    isNewSession = true;
  }
  if (!sessionStore.has(id)) {
    sessionStore.set(id, []);
  }
  let chatHistory = sessionStore.get(id);

  // ----- 2. Add user message to history -----
  chatHistory.push({ role: "user", content: message });

  const lang = detectLanguage(message);
  const isUrdu = lang === "urdu";
  const intent = classifyQuestion(message);

  // ----- HARDCODED SAFETY GUARDRAILS (Run before LLM) -----
  const respondHardcoded = (reply) => {
    chatHistory.push({ role: "assistant", content: reply });
    sessionStore.set(id, chatHistory.slice(-8));
    return res.json({ reply, sessionId: id });
  };

  if (intent === "emergency") {
    return respondHardcoded(
      isUrdu
        ? "Agar emergency hai to foran local emergency services (1122) ko call karein aur kisi qareebi shakhs ko bataayein."
        : "If you are experiencing an emergency, please call local emergency services immediately.",
    );
  }
  if (intent === "medical_condition") {
    return respondHardcoded(
      isUrdu
        ? "Kisi bhi specific medical condition (jaise kidney, diabetes, thyroid, heart) ke liye main diet ya exercise advice nahi de sakta. Baraye meherbani apne doctor ya specialist se mashwara karein."
        : "I can't give diet or exercise advice tied to a specific medical condition. Please consult your doctor or a specialist for that.",
    );
  }
  if (intent === "nutritionist") {
    return respondHardcoded(
      isUrdu
        ? "Personalized diet plan ke liye aap PoseFit ke certified nutritionist se rabta kar sakte hain."
        : "For a customized meal plan, please consult with a PoseFit certified nutritionist.",
    );
  }
  if (intent === "medical_request") {
    return respondHardcoded(
      isUrdu
        ? "Main medicines ya medical treatments suggest nahi kar sakta. Khas dosage ke liye doctor ya pharmacist se mashwara karein."
        : "I cannot prescribe or recommend specific medications. Please consult a qualified doctor or pharmacist.",
    );
  }
  if (intent === "out_of_scope") {
    return respondHardcoded(
      isUrdu
        ? "Main sirf fitness, exercise aur general nutrition se related sawalon mein madad kar sakta hoon. Ye topic mere scope se bahar hai."
        : "I can only help with fitness, exercise, and general nutrition questions — that topic is outside what I can help with.",
    );
  }

  // ----- 3. Build full conversation with history -----
  // Trim to the last 8 messages right before sending to the LLM, so the
  // just-added user message is never lost and the trim reflects true state.
  chatHistory = chatHistory.slice(-8);
  sessionStore.set(id, chatHistory);

  const conversation = [
    { role: "system", content: getSystemPrompt(lang) },
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

    // Fallback if LLM returns empty
    if (!reply) {
      reply = isUrdu
        ? "Mai is sawal ka jawab nahi de sakta, lekin agar aap fitness ya nutrition ke baare mein poochhna chahte hain toh main madad kar sakta hoon."
        : "I can only assist with fitness and nutrition questions. How can I help you with your health today?";
    }

    // ----- 4. Save assistant reply to memory -----
    chatHistory.push({ role: "assistant", content: reply });
    chatHistory = chatHistory.slice(-8);
    sessionStore.set(id, chatHistory);

    return res.json({ reply, sessionId: id });
  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return res.status(500).json({
      reply: isUrdu
        ? "Server mein masla aa raha hai. Baraye meherbani kuch der baad dobara koshish karein."
        : "Something went wrong on our end. Please try again in a moment.",
      sessionId: id,
    });
  }
};

module.exports = { handleChatbot };
