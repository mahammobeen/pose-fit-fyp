const axios = require("axios");

// Classify question type
const classifyQuestionType = (question) => {
  const lower = question.toLowerCase();

  const medical = [
    "pain",
    "hurt",
    "injury",
    "doctor",
    "treatment",
    "diagnose",
    "fever",
    "nausea",
    "sore",
    "emergency",
  ];

  const nutrition = ["diet plan", "meal plan", "nutritionist", "custom diet"];

  const condition = [
    "diabetes",
    "heart",
    "cancer",
    "asthma",
    "bp",
    "thyroid",
    "pregnant",
  ];

  const offTopic = [
    "weather",
    "politics",
    "religion",
    "programming",
    "movie",
    "joke",
  ];

  if (medical.some((w) => lower.includes(w))) return "medical";
  if (nutrition.some((w) => lower.includes(w))) return "nutritionist";
  if (condition.some((w) => lower.includes(w))) return "medical-condition";
  if (offTopic.some((w) => lower.includes(w))) return "off-topic";

  return "fitness";
};

// System prompt for friendly, simple English / Roman Urdu chatbot
const systemPrompt = `
You are PoseFit – a friendly, motivating fitness assistant.
Reply ONLY in simple English or Roman Urdu.
Do NOT use Hindi or difficult/formal words.
Keep your answers short, 2–4 sentences max.
Use bullets only if needed, to make tips easy to read.
Be beginner-friendly, encouraging, and positive.

Topics:
- Exercises, workouts, posture
- Fitness tips, stretching, muscle building
- Healthy habits, hydration, equipment usage

Avoid:
- Medical advice → "I cannot give medical advice. Please see a doctor."
- Nutritionist advice → "For diet plans, consult a nutritionist."
- Injury treatment → "See a doctor or physiotherapist for injuries."
- Medications/supplements → "I cannot recommend medicines or supplements."
- Off-topic → "I can only help with fitness questions."
- Emergencies → "Seek immediate help in emergencies."

Rules:
- Use simple words only, never Hindi.
- Focus on practical tips, encouragement, and motivation.
- Do not make long paragraphs.
- Keep answers short and friendly.
`;

// Ensure the reply is safe
const ensureResponseSafety = (text) => {
  const bad = [
    /take .* medicine/i,
    /you should take/i,
    /diagnose/i,
    /you have .* disease/i,
  ];

  if (bad.some((r) => r.test(text))) {
    return "I cannot give medical advice. Please see a doctor.";
  }

  return text;
};

// Format reply into short, friendly chunks
const formatReply = (text) => {
  const sentences = text
    .split(". ")
    .map((s) => s.trim())
    .filter(Boolean);

  const limited = sentences.slice(0, 4);

  if (limited.length > 1) {
    return "- " + limited.join(".\n- ") + ".";
  }

  return limited[0];
};

// Main handler
const handleChatbot = async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      reply: "Chatbot is not configured on server.",
    });
  }

  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ reply: "Please ask a fitness question." });
  }

  const type = classifyQuestionType(message);

  const block = {
    medical: "I cannot give medical advice. Please see a doctor.",
    nutritionist: "For diet plans, consult a nutritionist.",
    "medical-condition": "I cannot give advice on medical conditions.",
    "off-topic": "I can only help with fitness questions.",
  };

  if (block[type]) {
    return res.json({ reply: block[type] });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.3,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      },
    );

    let reply = response.data.choices[0].message.content.trim();
    reply = ensureResponseSafety(reply);
    reply = formatReply(reply);

    res.json({ reply });
  } catch (error) {
    console.error("Groq error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Please try again later." });
  }
};

module.exports = {
  handleChatbot,
};
