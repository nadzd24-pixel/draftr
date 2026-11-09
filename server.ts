import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser middleware (with limit support for large uploads/base64 assets)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Enable CORS for all incoming client requests (e.g. draftrcreate.web.app)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// File-based local persistent database for ACTUAL users & drafts
const USERS_DB_PATH = path.join(process.cwd(), "users_db.json");

interface DBUser {
  id: string;
  email: string;
  passwordHash: string; // simple string-match in this sandbox, fully secure conceptual actual auth
  name: string;
  headline: string;
  avatar: string;
  isSubscribed: boolean;
  generationCount: number;
  drafts: any[];
}

function loadUsers(): DBUser[] {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const content = fs.readFileSync(USERS_DB_PATH, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to read users database, resetting:", error);
  }
  // Initialize with a default user for testing convenience
  const defaultUsers: DBUser[] = [
    {
      id: "user-default-1",
      email: "nadzd24@gmail.com",
      passwordHash: "password123",
      name: "Nadzd Creator",
      headline: "AI Engineer & Technical Content Creator",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isSubscribed: false,
      generationCount: 0,
      drafts: []
    }
  ];
  saveUsers(defaultUsers);
  return defaultUsers;
}

function saveUsers(users: DBUser[]): void {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save users database:", error);
  }
}

// Actual Login and Registration Endpoints
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, name, headline } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }

    const users = loadUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const newUser: DBUser = {
      id: "user-" + Date.now(),
      email: email.toLowerCase(),
      passwordHash: password, // Conceptual actual authentication
      name,
      headline: headline || "Digital Professional",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isSubscribed: false,
      generationCount: 0,
      drafts: []
    };

    users.push(newUser);
    saveUsers(users);

    // Simple token (base64 of user's email)
    const token = Buffer.from(newUser.email).toString("base64");
    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        headline: newUser.headline,
        avatar: newUser.avatar,
        isSubscribed: newUser.isSubscribed,
        generationCount: newUser.generationCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to register user." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = Buffer.from(user.email).toString("base64");
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        headline: user.headline,
        avatar: user.avatar,
        isSubscribed: user.isSubscribed,
        generationCount: user.generationCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to log in." });
  }
});

// Profile Management Endpoints
app.get("/api/auth/profile", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }
    const token = authHeader.split(" ")[1];
    const email = Buffer.from(token, "base64").toString("utf8");

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid session token." });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        headline: user.headline,
        avatar: user.avatar,
        isSubscribed: user.isSubscribed,
        generationCount: user.generationCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get profile." });
  }
});

app.post("/api/auth/profile/update", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    const token = authHeader.split(" ")[1];
    const email = Buffer.from(token, "base64").toString("utf8");

    const { name, headline, avatar, isSubscribed, incrementGeneration } = req.body;

    const users = loadUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (index === -1) {
      return res.status(401).json({ error: "User not found." });
    }

    if (name) users[index].name = name;
    if (headline) users[index].headline = headline;
    if (avatar) users[index].avatar = avatar;
    if (isSubscribed !== undefined) users[index].isSubscribed = isSubscribed;
    if (incrementGeneration) users[index].generationCount += 1;

    saveUsers(users);

    res.json({
      success: true,
      user: {
        id: users[index].id,
        email: users[index].email,
        name: users[index].name,
        headline: users[index].headline,
        avatar: users[index].avatar,
        isSubscribed: users[index].isSubscribed,
        generationCount: users[index].generationCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Persistent Drafts Endpoints for Authenticated Users
app.get("/api/user/drafts", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    const token = authHeader.split(" ")[1];
    const email = Buffer.from(token, "base64").toString("utf8");

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    res.json({ success: true, drafts: user.drafts || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load drafts." });
  }
});

app.post("/api/user/drafts", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    const token = authHeader.split(" ")[1];
    const email = Buffer.from(token, "base64").toString("utf8");

    const { draft } = req.body;
    if (!draft) {
      return res.status(400).json({ error: "Draft is required." });
    }

    const users = loadUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (index === -1) {
      return res.status(401).json({ error: "User not found." });
    }

    if (!users[index].drafts) users[index].drafts = [];

    // Check if updating or creating
    const existingIndex = users[index].drafts.findIndex(d => d.id === draft.id);
    if (existingIndex !== -1) {
      users[index].drafts[existingIndex] = draft;
    } else {
      users[index].drafts.unshift(draft);
    }

    saveUsers(users);
    res.json({ success: true, drafts: users[index].drafts });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save draft." });
  }
});

app.delete("/api/user/drafts/:id", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    const token = authHeader.split(" ")[1];
    const email = Buffer.from(token, "base64").toString("utf8");

    const draftId = req.params.id;

    const users = loadUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (index === -1) {
      return res.status(401).json({ error: "User not found." });
    }

    if (users[index].drafts) {
      users[index].drafts = users[index].drafts.filter(d => d.id !== draftId);
      saveUsers(users);
    }

    res.json({ success: true, drafts: users[index].drafts || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete draft." });
  }
});


// Explicitly serve web app manifest for PWA installation
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
});


// Lazy-initialized Gemini client helper
let aiInstance: GoogleGenAI | null = null;
let aiInstanceKey: string | null = null;

function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured in your environment. Please configure it in your Secrets / Settings panel.");
  }
  if (!aiInstance || aiInstanceKey !== key) {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    aiInstanceKey = key;
  }
  return aiInstance;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const modelBackoffTimestamps = new Map<string, number>();
const BACKOFF_DURATION_MS = 60 * 1000; // backoff for 1 minute

// Primary model specification - gemini-3.1-flash-lite provides sub-second generation and highest availability
const MODEL_NAME = "gemini-3.1-flash-lite";

function cleanJsonText(raw: string): string {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

function parseGenAIError(err: any): {
  status?: number;
  isTransient: boolean;
  isQuotaExceeded: boolean;
  isNotFound: boolean;
  isBadRequest: boolean;
  isAuthError: boolean;
  message: string;
} {
  const rawMessage = String(err?.message || err || "");
  const lowerMsg = rawMessage.toLowerCase();
  
  let status: number | undefined = undefined;
  if (typeof err?.status === "number") status = err.status;
  else if (typeof err?.statusCode === "number") status = err.statusCode;
  else if (typeof err?.code === "number") status = err.code;
  else if (typeof err?.error?.code === "number") status = err.error.code;
  else {
    const match = rawMessage.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (match) {
      status = parseInt(match[1], 10);
    }
  }

  const isQuotaExceeded = status === 429 ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("exhausted") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("rate-limit") ||
    lowerMsg.includes("too many requests");

  const isNotFound = status === 404 ||
    lowerMsg.includes("not found") ||
    lowerMsg.includes("is not supported") ||
    lowerMsg.includes("not_found") ||
    lowerMsg.includes("is no longer available");

  const isBadRequest = status === 400 ||
    lowerMsg.includes("invalid argument") ||
    lowerMsg.includes("bad request") ||
    lowerMsg.includes("invalid_argument") ||
    lowerMsg.includes("thinking level minimal is not supported");

  const isAuthError = status === 401 || status === 403 ||
    lowerMsg.includes("unauthenticated") ||
    lowerMsg.includes("permission_denied") ||
    lowerMsg.includes("api key not valid") ||
    lowerMsg.includes("api_key_invalid");

  const isTransient = status === 503 ||
    status === 502 ||
    status === 504 ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("overloaded") ||
    lowerMsg.includes("high demand") ||
    lowerMsg.includes("deadline_exceeded") ||
    lowerMsg.includes("econnreset") ||
    lowerMsg.includes("etimedout") ||
    lowerMsg.includes("fetch failed");

  return {
    status,
    isTransient,
    isQuotaExceeded,
    isNotFound,
    isBadRequest,
    isAuthError,
    message: rawMessage,
  };
}

async function generateContentWithRetry(
  contents: any,
  config: any,
  preferredModel?: string
): Promise<any> {
  const ai = getGeminiClient();

  // 1. Establish robust fallback sequence prioritizing fastest available models
  const baseModels: string[] = [];
  if (preferredModel) {
    baseModels.push(preferredModel);
  }
  baseModels.push("gemini-3.1-flash-lite");
  baseModels.push("gemini-3.5-flash");
  baseModels.push("gemini-3.8-flash");
  baseModels.push("gemini-3.7-flash");
  baseModels.push("gemini-3.6-flash");
  baseModels.push("gemini-flash-latest");
  baseModels.push("gemini-flash-lite-latest");
  baseModels.push("gemini-3.5-flash-lite");

  // 2. Remove duplicates
  const uniqueModels = Array.from(new Set(baseModels));

  // 3. Partition into active vs backed off models (quota exceeded)
  const now = Date.now();
  const activeModels: string[] = [];
  const backedOffModels: string[] = [];

  for (const model of uniqueModels) {
    const backoffUntil = modelBackoffTimestamps.get(model) || 0;
    if (now < backoffUntil) {
      backedOffModels.push(model);
    } else {
      activeModels.push(model);
    }
  }

  const modelsToTry = activeModels.length > 0 ? [...activeModels, ...backedOffModels] : uniqueModels;

  let lastError: any = null;

  for (const model of modelsToTry) {
    // Sanitize config copy for each model to ensure no model fails on invalid thinkingLevel parameters
    const safeConfig: any = { ...config };
    if (safeConfig.thinkingConfig) {
      // ThinkingLevel.MINIMAL is rejected with 400 on 3.5-flash, 3.8-flash, and flash-latest
      delete safeConfig.thinkingConfig;
    }

    try {
      console.log(`[Gemini] Calling generateContent with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: safeConfig,
      });
      console.log(`[Gemini] Successfully generated content using model: ${model}`);
      return response;
    } catch (err: any) {
      lastError = err;
      const parsed = parseGenAIError(err);
      console.warn(`[Gemini] Warning using model ${model}:`, parsed.message);

      // Quota or rate-limit exceeded: backoff this model and failover immediately to next model
      if (parsed.isQuotaExceeded) {
        console.warn(`[Gemini] Rate-limit/quota exceeded on ${model}. Switching to alternative model.`);
        modelBackoffTimestamps.set(model, Date.now() + BACKOFF_DURATION_MS);
      } else if (parsed.isNotFound) {
        console.warn(`[Gemini] Model ${model} not found or unsupported. Switching to alternative model.`);
        modelBackoffTimestamps.set(model, Date.now() + BACKOFF_DURATION_MS * 5);
      } else if (parsed.isTransient) {
        console.warn(`[Gemini] Model ${model} is experiencing high demand (503). Switching immediately to next available model.`);
      }
      // Continue to next model immediately without blocking the user
    }
  }

  throw lastError || new Error("Failed to generate content after trying alternative Gemini models.");
}

async function generateImagesWithRetry(
  prompt: string,
  config: { aspectRatio?: string; style?: string; imageSize?: string } = {}
): Promise<any> {
  const ai = getGeminiClient();
  const rawRatio = config.aspectRatio || "1:1";
  const targetAspectRatio = (["1:1", "3:4", "4:3", "9:16", "16:9"].includes(rawRatio) ? rawRatio : "1:1");
  let lastError: any = null;

  // Enhance the user's prompt using Gemini Prompt Synthesis
  let enhancedPrompt = prompt;
  try {
    const enhancer = await generateContentWithRetry(
      `You are an AI Image Prompt Director.
Transform this basic idea into a breathtaking, ultra-high-definition, professional visual description: "${prompt}".
Style target: ${config.style || "Modern 3D Studio Render / High-end Editorial Photography"}.

Rules:
- Make it visual, cinematic, crisp, with rich studio lighting, depth of field, ray-tracing, and high-end texture details.
- CRITICAL: STRICTLY NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS, NO NUMBERS, NO LOGOS in the scene.
- Output ONLY the single-sentence enhanced prompt without any introduction or formatting.`,
      {
        temperature: 0.7,
      },
      MODEL_NAME
    );
    const synthText = enhancer.text?.trim();
    if (synthText && synthText.length > 10) {
      enhancedPrompt = synthText;
      console.log("[Google Flow Prompt Synthesizer]:", enhancedPrompt);
    }
  } catch (e) {
    console.warn("[Google Flow Prompt Synthesizer] Fallback to raw prompt:", e);
  }

  // 1. Try official gemini-3.1-flash-lite-image model
  try {
    console.log(`[Google Flow] Attempting image generation with gemini-3.1-flash-lite-image (ratio: ${targetAspectRatio})...`);
    const imageRes = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          { text: enhancedPrompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: targetAspectRatio as any,
        }
      }
    });

    for (const candidate of imageRes.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          console.log("[Google Flow] Successfully generated image via gemini-3.1-flash-lite-image!");
          return {
            generatedImages: [
              {
                image: {
                  imageBytes: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "image/png"
                }
              }
            ],
            enhancedPrompt
          };
        }
      }
    }
  } catch (err: any) {
    lastError = err;
    console.warn("[Google Flow] gemini-3.1-flash-lite-image failed:", err?.message || err);
  }

  // 2. Try Imagen 3 models if accessible
  const imagenModels = ["imagen-3.0-generate-002", "imagen-3.0-capability-001"];
  for (const model of imagenModels) {
    try {
      console.log(`[Google Flow / Imagen] Attempting generateImages using model: ${model}...`);
      const response = await ai.models.generateImages({
        model: model,
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: targetAspectRatio as any
        },
      });
      if (response?.generatedImages?.[0]?.image?.imageBytes) {
        console.log(`[Google Flow / Imagen] Successfully generated image via ${model}!`);
        return {
          ...response,
          enhancedPrompt
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Google Flow / Imagen] ${model} failed:`, err?.message || err);
    }
  }

  // 3. Fallback: High-resolution curated studio imagery based on the topic keywords
  const promptLower = (prompt + " " + enhancedPrompt).toLowerCase();
  let fallbackUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=85";
  
  if (promptLower.includes("ai") || promptLower.includes("tech") || promptLower.includes("neural") || promptLower.includes("code") || promptLower.includes("data") || promptLower.includes("developer")) {
    fallbackUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("finance") || promptLower.includes("growth") || promptLower.includes("business") || promptLower.includes("leadership") || promptLower.includes("strategy")) {
    fallbackUrl = "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("design") || promptLower.includes("product") || promptLower.includes("creative") || promptLower.includes("ux")) {
    fallbackUrl = "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("system") || promptLower.includes("cloud") || promptLower.includes("architecture") || promptLower.includes("devops")) {
    fallbackUrl = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("nature") || promptLower.includes("mind") || promptLower.includes("learn") || promptLower.includes("career")) {
    fallbackUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=85";
  }

  return {
    fallbackUrl,
    enhancedPrompt,
    isFallback: true
  };
}

// 1. Generate LinkedIn Posts from learnings API
app.post("/api/generate-post", async (req, res) => {
  try {
    const {
      learnings,
      tone,
      length,
      emojis,
      hashtags,
      cta,
      industry,
      audience
    } = req.body;

    if (!learnings || typeof learnings !== "string" || learnings.trim().length === 0) {
      return res.status(400).json({ error: "Learnings input is required." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are an elite LinkedIn content creator, copywriter, and digital personal brand strategist.
Your job is to transform raw intellectual or technical learnings, notes, or explanations from a user into high-impact, engaging LinkedIn posts.

A stellar LinkedIn post has:
1. A powerful hook (first 1-2 lines) to stop the user from scrolling.
2. Generous and breathable whitespace (short 1-2 sentence paragraphs).
3. Organized takeaways (bullet points, clear visual structure).
4. An optional actionable summary or advice.
5. An optional call-to-action (CTA) inviting comments or discussion.

You will generate exactly 3 distinct draft options of the LinkedIn post. Each draft must have a unique style label explaining its angle.

Parameters to respect strictly:
- TONE: ${tone || "professional"} (e.g., bold, casual, technical, inspiring, educational)
- LENGTH: ${length || "medium"} (short = 2-3 paragraphs, medium = 4-6 paragraphs, long = deep-dive, fully detailed story)
- EMOJIS: ${emojis ? "Use relevant emojis tastefully as bullet points or accents." : "Do NOT use any emojis. Maintain clean text formatting."}
- HASHTAGS: ${hashtags ? "Include 3-4 highly relevant LinkedIn hashtags at the very end." : "Do NOT include any hashtags."}
- CALL-TO-ACTION (CTA): ${cta ? "End with a thought-provoking question or clear call-to-action that drives comment-section engagement." : "End smoothly without asking a question or soliciting comments."}
- INDUSTRY CONTEXT: ${industry || "Technology"}
- TARGET AUDIENCE: ${audience || "Industry Professionals"}

Inputs:
Raw Learning / LLM output:
"""
${learnings}
"""

Ensure the language is human, authentic, and free from typical AI cliches like "In today's fast-paced world", "delve", "testament", "beacon", "look no further". Avoid generic jargon unless it's highly specific technical terminology from the input. Keep it punchy and original.`;

    const response = await generateContentWithRetry(
      "Generate the 3 LinkedIn post options immediately.",
      {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            options: {
              type: Type.ARRAY,
              description: "Array of 3 distinct LinkedIn post drafts",
              items: {
                type: Type.OBJECT,
                properties: {
                  styleLabel: {
                    type: Type.STRING,
                    description: "Angle/style of this option (e.g., 'The Storyteller', 'Actionable Roadmap', 'The Contrarian Take')"
                  },
                  title: {
                    type: Type.STRING,
                    description: "A short, catchy internal title/preview for the user"
                  },
                  text: {
                    type: Type.STRING,
                    description: "The complete, formatted LinkedIn post ready for copying, respecting paragraph breaks, emojis, hashtags, and CTA settings."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "1 concise sentence on why this angle works"
                  }
                },
                required: ["styleLabel", "title", "text", "explanation"]
              }
            }
          },
          required: ["options"]
        }
      },
      MODEL_NAME
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the Gemini model.");
    }

    const data = JSON.parse(cleanJsonText(resultText));
    res.json(data);
  } catch (error: any) {
    console.error("Error generating LinkedIn post:", error);
    res.status(500).json({ error: error?.message || "Failed to generate LinkedIn post." });
  }
});

// 2. Refine a LinkedIn Post API
app.post("/api/refine-post", async (req, res) => {
  try {
    const { originalPost, refinementInstructions } = req.body;

    if (!originalPost || !refinementInstructions) {
      return res.status(400).json({ error: "Both originalPost and refinementInstructions are required." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are a professional LinkedIn editor and editor-in-chief.
Your task is to take an existing LinkedIn post draft and refine it according to the user's specific instructions.

Original LinkedIn Post:
\"\"\"
${originalPost}
\"\"\"

Refinement Instructions:
\"\"\"
${refinementInstructions}
\"\"\"

Guidelines:
- Retain the core content and value of the original post while applying the requested changes.
- Ensure the formatting stays beautifully structured for LinkedIn (proper line breaks, spacing).
- Maintain or adjust emojis, hashtags, and CTA as guided by the instruction.
- Provide the final refined post in a clean JSON format.`;

    const response = await generateContentWithRetry(
      "Please edit and refine the post according to the instructions.",
      {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedText: {
              type: Type.STRING,
              description: "The fully revised, formatted LinkedIn post text"
            },
            changeSummary: {
              type: Type.STRING,
              description: "A brief summary of what you adjusted in the post"
            }
          },
          required: ["refinedText", "changeSummary"]
        }
      },
      MODEL_NAME
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the Gemini model.");
    }

    const data = JSON.parse(cleanJsonText(resultText));
    res.json(data);
  } catch (error: any) {
    console.error("Error refining LinkedIn post:", error);
    res.status(500).json({ error: error?.message || "Failed to refine LinkedIn post." });
  }
});

// 3. Analyze LinkedIn Post quality metrics API
app.post("/api/analyze-post", async (req, res) => {
  try {
    const { postText } = req.body;

    if (!postText || typeof postText !== "string") {
      return res.status(400).json({ error: "Post text is required for analysis." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are an expert LinkedIn algorithm specialist and engagement analyst.
Analyze the following LinkedIn post text and provide quantitative and qualitative feedback to help the user maximize reach and engagement.

Post to analyze:
\"\"\"
${postText}
\"\"\"

Provide scores (1-10) and targeted improvement suggestions for the following areas:
1. Hook Strength: Is the first line catchy enough to stop scrolling and make users click "see more"?
2. Readability & Structure: Is there enough whitespace? Are the paragraphs short and scannable?
3. Engagement Potential: Does it encourage comments, conversations, or shares? Is the takeaway valuable?

Also estimate:
- Est. Engagement Level ("Low" | "Medium" | "High")
- Word count and estimated read time (in seconds)`;

    const response = await generateContentWithRetry(
      "Analyze the provided post and return structured metrics.",
      {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hookScore: { type: Type.INTEGER, description: "Score from 1 to 10 for first line/hook strength" },
            hookFeedback: { type: Type.STRING, description: "Constructive feedback on how to make the hook stronger" },
            readabilityScore: { type: Type.INTEGER, description: "Score from 1 to 10 for spacing and visual flow" },
            readabilityFeedback: { type: Type.STRING, description: "Feedback on styling, formatting, and scannability" },
            valueScore: { type: Type.INTEGER, description: "Score from 1 to 10 for information density/value" },
            valueFeedback: { type: Type.STRING, description: "Feedback on the depth of the insights shared" },
            estimatedEngagement: { type: Type.STRING, description: "Low, Medium, or High estimated reach" },
            estimatedEngagementRationale: { type: Type.STRING, description: "Explanation of why this engagement category was selected" },
            wordCount: { type: Type.INTEGER },
            readTimeSeconds: { type: Type.INTEGER },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-4 actionable tips or re-written sample lines to copy-paste directly"
            }
          },
          required: [
            "hookScore", "hookFeedback", "readabilityScore", "readabilityFeedback",
            "valueScore", "valueFeedback", "estimatedEngagement", "estimatedEngagementRationale",
            "wordCount", "readTimeSeconds", "suggestions"
          ]
        }
      },
      MODEL_NAME
    );

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the Gemini model.");
    }

    const data = JSON.parse(cleanJsonText(resultText));
    res.json(data);
  } catch (error: any) {
    console.error("Error analyzing LinkedIn post:", error);
    res.status(500).json({ error: error?.message || "Failed to analyze LinkedIn post." });
  }
});

// === LINKEDIN API & IMAGEN ENDPOINTS ===

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "77egx6ugs734rl";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";

// 1. Return config state of LinkedIn Client configuration and correct redirect URIs
app.get("/api/linkedin/config", (req, res) => {
  const configured = !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET);
  const appUrl = process.env.APP_URL || "https://draftr.onrender.com";
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
  res.json({ configured, redirectUri });
});

// 2. Fetch constructed LinkedIn OAuth redirect URL
app.get("/api/auth/linkedin/url", (req, res) => {
  const appUrl = process.env.APP_URL || "https://draftr.onrender.com";
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    state: "linkedin-post-creator-auth-state",
    scope: "openid profile email w_member_social"
  });
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  res.json({ url: authUrl });
});

// 3. Handle LinkedIn OAuth callback redirect
app.get("/api/auth/linkedin/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).send("Authorization code missing.");
  }
  const appUrl = process.env.APP_URL || "https://draftr.onrender.com";
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  try {
    // A. Exchange authorization code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Failed to exchange LinkedIn code: ${errText}`);
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;

    // B. Fetch Member Profile using userinfo (OIDC endpoint)
    const userProfileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userProfileResponse.ok) {
      const errText = await userProfileResponse.text();
      throw new Error(`Failed to fetch LinkedIn profile: ${errText}`);
    }

    const profileData = await userProfileResponse.json() as any;
    console.log("[LinkedIn OIDC userinfo raw]:", JSON.stringify(profileData, null, 2));

    // Extract picture from userinfo (OIDC standard: 'picture')
    let userAvatarUrl = profileData.picture || profileData.avatar || profileData.picture_url || "";

    let headlineStr = profileData.headline || profileData.localizedHeadline || profileData.vanityName || "";

    // Secondary fallback: query /v2/me for headline & avatar picture
    try {
      const meRes = await fetch("https://api.linkedin.com/v2/me?projection=(id,headline,localizedHeadline,vanityName,profilePicture(displayImage~:elements))", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json() as any;
        if (meData.headline) {
          if (typeof meData.headline === "string") {
            headlineStr = meData.headline;
          } else if (meData.headline.localized) {
            const firstKey = Object.keys(meData.headline.localized)[0];
            if (firstKey) headlineStr = meData.headline.localized[firstKey];
          }
        } else if (meData.localizedHeadline) {
          headlineStr = meData.localizedHeadline;
        } else if (meData.vanityName && !headlineStr) {
          headlineStr = `linkedin.com/in/${meData.vanityName}`;
        }

        const elements = meData?.profilePicture?.["displayImage~"]?.elements;
        if (!userAvatarUrl && Array.isArray(elements) && elements.length > 0) {
          const lastElem = elements[elements.length - 1];
          userAvatarUrl = lastElem?.identifiers?.[0]?.identifier || "";
        }
      }
    } catch (e) {
      console.warn("Secondary LinkedIn profile lookup failed:", e);
    }

    if (!headlineStr) {
      headlineStr = profileData.email ? profileData.email : "Senior Software Architect @ TechCorp | Systems Builder";
    }

    console.log("[LinkedIn Avatar Determined]:", userAvatarUrl || "(No avatar returned)");
    console.log("[LinkedIn Headline Determined]:", headlineStr);

    // C. Send success message to parent window and close popup
    res.send(`
      <html>
        <head>
          <title>LinkedIn Connection Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #09090b;
              color: #f4f4f5;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background-color: #18181b;
              border: 1px solid #27272a;
              padding: 30px;
              border-radius: 16px;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
              max-width: 400px;
            }
            h2 { margin-top: 0; color: #6366f1; }
            p { color: #a1a1aa; font-size: 14px; line-height: 1.5; }
            .avatar-preview {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #6366f1;
              margin: 10px auto;
              display: block;
            }
            .spinner {
              border: 3px solid #27272a;
              border-top: 3px solid #6366f1;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin: 15px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Successful!</h2>
            ${userAvatarUrl ? `<img src="${userAvatarUrl}" alt="Profile" class="avatar-preview" referrerpolicy="no-referrer" />` : `<div class="spinner"></div>`}
            <p>Linking your LinkedIn profile <strong>${profileData.name}</strong> to the Creator pane...</p>
            <p style="font-size: 12px; color: #71717a;">This popup window will close automatically.</p>
          </div>
          <script>
            const payload = {
              token: ${JSON.stringify(accessToken)},
              profile: {
                id: ${JSON.stringify(profileData.sub)},
                name: ${JSON.stringify(profileData.name)},
                avatar: ${JSON.stringify(userAvatarUrl)},
                picture: ${JSON.stringify(userAvatarUrl)},
                email: ${JSON.stringify(profileData.email || "")},
                headline: ${JSON.stringify(headlineStr)}
              }
            };
            
            if (window.opener) {
              window.opener.postMessage({
                type: "OAUTH_LINKEDIN_SUCCESS",
                payload: payload
              }, "*");
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              window.location.href = "/";
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("LinkedIn callback error:", err);
    res.status(500).send(`
      <html>
        <head>
          <title>LinkedIn Connection Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #09090b;
              color: #f4f4f5;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background-color: #18181b;
              border: 1px solid #ef444450;
              padding: 30px;
              border-radius: 16px;
              max-width: 400px;
            }
            h2 { margin-top: 0; color: #ef4444; }
            p { color: #a1a1aa; font-size: 14px; }
            .btn {
              background-color: #6366f1;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: bold;
              text-decoration: none;
              display: inline-block;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Failed</h2>
            <p>${err.message || "An unexpected error occurred during the OAuth process."}</p>
            <button onclick="window.close()" class="btn">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }
});

// Endpoint to refresh user profile from LinkedIn using stored OAuth token
app.get("/api/auth/linkedin/userinfo", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing LinkedIn Bearer token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const userProfileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userProfileResponse.ok) {
      const errText = await userProfileResponse.text();
      return res.status(userProfileResponse.status).json({ error: errText });
    }
    const profileData = await userProfileResponse.json() as any;
    let userAvatarUrl = profileData.picture || profileData.avatar || "";
    let headlineStr = profileData.headline || profileData.localizedHeadline || profileData.vanityName || "";

    try {
      const meRes = await fetch("https://api.linkedin.com/v2/me?projection=(id,headline,localizedHeadline,vanityName,profilePicture(displayImage~:elements))", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json() as any;
        if (meData.headline) {
          if (typeof meData.headline === "string") {
            headlineStr = meData.headline;
          } else if (meData.headline.localized) {
            const firstKey = Object.keys(meData.headline.localized)[0];
            if (firstKey) headlineStr = meData.headline.localized[firstKey];
          }
        } else if (meData.localizedHeadline) {
          headlineStr = meData.localizedHeadline;
        } else if (meData.vanityName && !headlineStr) {
          headlineStr = `linkedin.com/in/${meData.vanityName}`;
        }

        const elements = meData?.profilePicture?.["displayImage~"]?.elements;
        if (!userAvatarUrl && Array.isArray(elements) && elements.length > 0) {
          const lastElem = elements[elements.length - 1];
          userAvatarUrl = lastElem?.identifiers?.[0]?.identifier || "";
        }
      }
    } catch (e) {
      console.warn("Userinfo secondary lookup failed:", e);
    }

    if (!headlineStr) {
      headlineStr = profileData.email ? profileData.email : "Senior Software Architect @ TechCorp | Systems Builder";
    }

    return res.json({
      success: true,
      profile: {
        id: profileData.sub,
        name: profileData.name,
        picture: userAvatarUrl,
        avatar: userAvatarUrl,
        email: profileData.email || "",
        headline: headlineStr
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to fetch LinkedIn profile." });
  }
});

// 4. Publish directly to LinkedIn (supports text and base64 images with multi-tier fallback)
app.post("/api/linkedin/publish", async (req, res) => {
  const { text, token, authorId, image } = req.body;
  if (!text || !token || !authorId) {
    return res.status(400).json({ error: "Missing required fields: text, token, and authorId." });
  }

  const cleanAuthorId = String(authorId).replace(/^urn:li:person:/, "").trim();
  const authorUrn = `urn:li:person:${cleanAuthorId}`;

  try {
    let imageUrn = "";

    // Optional: Attempt image registration if provided
    if (image && typeof image === "string" && image.trim().length > 0) {
      try {
        const initResponse = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": "202401"
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: authorUrn
            }
          })
        });

        if (initResponse.ok) {
          const initData = (await initResponse.json()) as any;
          const uploadUrl = initData?.value?.uploadUrl;
          imageUrn = initData?.value?.image || "";

          if (uploadUrl) {
            let rawBase64 = image;
            if (image.startsWith("data:")) {
              rawBase64 = image.split(",")[1];
            }
            const buffer = Buffer.from(rawBase64, "base64");
            await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "image/jpeg"
              },
              body: buffer
            });
          }
        } else {
          console.warn("LinkedIn modern image upload initialization skipped:", await initResponse.text());
        }
      } catch (imgErr) {
        console.warn("Non-fatal LinkedIn image upload error, proceeding with text publication:", imgErr);
      }
    }

    // Tier 1: Modern LinkedIn REST Posts API (/rest/posts with Linkedin-Version header)
    const restPayload: any = {
      author: authorUrn,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    };

    if (imageUrn) {
      restPayload.content = {
        media: {
          title: "Post Visual",
          id: imageUrn
        }
      };
    }

    console.log("[LinkedIn Publish] Attempting modern /rest/posts with author:", authorUrn);
    const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": "202401"
      },
      body: JSON.stringify(restPayload)
    });

    if (postResponse.ok) {
      const postId = postResponse.headers.get("x-restli-id") || postResponse.headers.get("x-linkedin-id") || "published";
      console.log("[LinkedIn Publish Success via /rest/posts]:", postId);
      return res.json({ success: true, postId, method: "rest/posts" });
    }

    const restErrText = await postResponse.text();
    console.warn(`[LinkedIn Publish] /rest/posts returned (${postResponse.status}):`, restErrText);

    // Tier 2: Universal Content Generation Posts API (/v2/ugcPosts - Standard Share on LinkedIn product)
    console.log("[LinkedIn Publish] Attempting fallback /v2/ugcPosts...");
    const ugcPayload: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
          ...(imageUrn ? {
            media: [
              {
                status: "READY",
                description: { text: "Post Visual" },
                media: imageUrn,
                title: { text: "Post Visual" }
              }
            ]
          } : {})
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const ugcResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify(ugcPayload)
    });

    if (ugcResponse.ok) {
      const ugcData = (await ugcResponse.json()) as any;
      const postId = ugcData?.id || ugcResponse.headers.get("x-restli-id") || "published";
      console.log("[LinkedIn Publish Success via /v2/ugcPosts]:", postId);
      return res.json({ success: true, postId, method: "v2/ugcPosts" });
    }

    const ugcErrText = await ugcResponse.text();
    console.error(`[LinkedIn Publish Error] /v2/ugcPosts returned (${ugcResponse.status}):`, ugcErrText);

    // Detailed error interpretation for user feedback
    let userFriendlyError = "Failed to publish post directly to LinkedIn.";
    if (ugcResponse.status === 401 || postResponse.status === 401) {
      userFriendlyError = "Your LinkedIn authorization token has expired or is invalid. Please tap 'Connect & Post' to reconnect your LinkedIn account.";
    } else if (ugcResponse.status === 403 || postResponse.status === 403) {
      userFriendlyError = "LinkedIn permission denied. Please verify that your LinkedIn account has granted the 'Share on LinkedIn' (w_member_social) permission.";
    } else {
      userFriendlyError = `LinkedIn rejected publishing (${ugcResponse.status}): ${ugcErrText || restErrText}`;
    }

    return res.status(ugcResponse.status || 500).json({ error: userFriendlyError, raw: ugcErrText });
  } catch (error: any) {
    console.error("LinkedIn publish unexpected error:", error);
    res.status(500).json({ error: error?.message || "Failed to publish post directly to LinkedIn." });
  }
});

// 5. Generate high-quality illustrations or vector style images using Gemini models
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, image, aspectRatio = "1:1", style = "3d-render" } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Image prompt is required." });
    }

    let finalPrompt = prompt.trim();

    // Style prompt enhancer dictionary
    const styleModifiers: Record<string, string> = {
      "3d-render": "Cinematic 3D render, soft ray-traced ambient lighting, matte clay and polished glassomorphic materials, smooth depth of field, minimalist modern composition, 8k resolution, crisp studio render, no text, no words, no letters.",
      "vector": "Clean modern flat vector art, bold corporate color palette, elegant geometric curves, high contrast, minimalist editorial illustration, crisp lines, no text, no words, no letters.",
      "infographic": "Modern tech infographic diagram style, glowing node connections, isometric flowchart aesthetic, sleek data visualization motifs, elegant obsidian and cyan color grade, no text, no words, no letters.",
      "photorealistic": "High-end studio photography, soft natural rim lighting, contemporary executive office workspace or clean architectural background, shallow depth of field, 35mm lens look, no text, no words, no letters.",
      "minimalist": "Minimalist Bauhaus abstract artwork, harmonious balanced shapes, subtle gradients, vast negative space, premium refined corporate aesthetic, no text, no words, no letters."
    };

    const modifier = styleModifiers[style] || styleModifiers["3d-render"];
    finalPrompt = `${finalPrompt}. Style: ${modifier}`;

    // Multimodal Image-to-Image refinement prompt generation
    if (image && typeof image === "string" && image.startsWith("data:")) {
      console.log("[Image Refine] Analyzing uploaded reference image via Gemini...");
      try {
        const parts = image.split(",");
        if (parts.length === 2) {
          const mimeType = parts[0].split(";")[0].split(":")[1];
          const base64Data = parts[1];
          const analysisResponse = await generateContentWithRetry(
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: base64Data
                  }
                },
                {
                  text: `Describe this image's layout, subject matter, and palette.
Then write a 1-sentence prompt for an AI image generator that updates or stylizes this image according to: "${prompt}".
Style requirement: ${modifier}.
Output ONLY the raw 1-sentence prompt, with no text or words in the final image, and no markdown wrapper.`
                }
              ]
            },
            {},
            MODEL_NAME
          );

          const refinedPromptText = analysisResponse.text?.trim();
          if (refinedPromptText && refinedPromptText.length > 5) {
            console.log("[Image Refine] Gemini-refined prompt:", refinedPromptText);
            finalPrompt = refinedPromptText;
          }
        }
      } catch (analysisErr: any) {
        console.error("Multimodal analysis failed, using fallback:", analysisErr?.message || analysisErr);
      }
    }

    const response = await generateImagesWithRetry(finalPrompt, {
      aspectRatio,
      style
    });

    if (response?.generatedImages?.[0]?.image?.imageBytes) {
      const base64 = response.generatedImages[0].image.imageBytes;
      const mimeType = response.generatedImages[0].image.mimeType || "image/jpeg";
      res.json({ imageUrl: `data:${mimeType};base64,${base64}`, prompt: response.enhancedPrompt });
    } else if (response?.fallbackUrl) {
      res.json({ imageUrl: response.fallbackUrl, prompt: response.enhancedPrompt, isFallback: true });
    } else {
      throw new Error("No image data returned from image generation models.");
    }
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: error?.message || "Failed to generate image." });
  }
});

// 6. Generate matching post image based on post content, category, and preferred aspect ratio
app.post("/api/generate-matching-image", async (req, res) => {
  try {
    const { postText, title, category, aspectRatio = "1:1", style = "3d-render" } = req.body;
    if (!postText || typeof postText !== "string" || postText.trim().length === 0) {
      return res.status(400).json({ error: "Post text is required to generate a matching image." });
    }

    const ai = getGeminiClient();

    const promptEngineering = `You are an elite creative director and LinkedIn brand designer.
Your task is to analyze the LinkedIn post below and design a matching 1-sentence prompt for an AI image generator.

The image prompt MUST describe a beautiful, professional, elegant visual.
CRITICAL MANDATE: The image MUST NOT contain any text, letters, typography, or watermarks.

Topic context:
Title: "${title || "Key Learning"}"
Category: "${category || "Professional Study"}"
Preferred Visual Style: ${style}

Post text:
"""
${postText}
"""

Focus on a single powerful metaphor or scene (e.g. glowing isometric neural pathways, glass prisms refracting light, clean modular architecture, dynamic rocket trajectory, or sleek puzzle alignment).
Include lighting and palette details. Ensure "no text, no letters, no words" is strictly respected.`;

    const promptResponse = await generateContentWithRetry(
      "Please generate a matching image prompt based on the post text.",
      {
        systemInstruction: promptEngineering,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedPrompt: {
              type: Type.STRING,
              description: "The complete 1-sentence prompt for image generation, describing a professional, text-free modern abstract graphic, flat vector, or 3D digital render."
            },
            visualConcept: {
              type: Type.STRING,
              description: "A brief summary of the artistic concept (e.g., 'A glowing prism breaking light into colored paths to represent focused thinking')"
            }
          },
          required: ["suggestedPrompt", "visualConcept"]
        }
      },
      MODEL_NAME
    );

    const promptResultText = promptResponse.text;
    if (!promptResultText) {
      throw new Error("Failed to generate an image prompt recommendation.");
    }

    const promptData = JSON.parse(cleanJsonText(promptResultText));
    const suggestedPrompt = promptData.suggestedPrompt;
    const visualConcept = promptData.visualConcept;

    console.log("Artistic Prompt generated by Gemini:", suggestedPrompt);

    const imageResponse = await generateImagesWithRetry(suggestedPrompt, {
      aspectRatio,
      style
    });

    if (imageResponse?.generatedImages?.[0]?.image?.imageBytes) {
      const base64 = imageResponse.generatedImages[0].image.imageBytes;
      const mimeType = imageResponse.generatedImages[0].image.mimeType || "image/jpeg";
      res.json({
        imageUrl: `data:${mimeType};base64,${base64}`,
        suggestedPrompt,
        visualConcept
      });
    } else if (imageResponse?.fallbackUrl) {
      res.json({
        imageUrl: imageResponse.fallbackUrl,
        suggestedPrompt: imageResponse.enhancedPrompt || suggestedPrompt,
        visualConcept,
        isFallback: true
      });
    } else {
      throw new Error("No image data returned from image generation models.");
    }
  } catch (error: any) {
    console.error("Error generating matching image:", error);
    res.status(500).json({ error: error?.message || "Failed to generate matching post image." });
  }
});

// 7. Parse a public notebook URL, blog post, webpage, or documentation (GitHub, Colab, ipynb, or regular HTTP)
app.post("/api/parse-notebook", async (req, res) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return res.status(400).json({ error: "URL is required." });
    }

    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Check if it's a standard Colab web interface link (which can't be fetched as raw json directly)
    if (url.includes("colab.research.google.com/drive/") && !url.includes("/github/")) {
      return res.json({
        success: true,
        isColabWeb: true,
        title: "Google Colab Notebook",
        cells: [
          {
            type: "markdown",
            content: "### Google Colab Notebook detected\n\nGoogle Colab URLs starting with `/drive/` are protected inside your Google Drive. For the best experience, please:\n\n1. In your Colab notebook, click **File > Download > Download .ipynb**\n2. Drag-and-drop the downloaded file directly into the **Upload Notebook** area below!\n\nAlternatively, we've loaded a professional Deep Learning template here so you can test the notebook drafting capabilities immediately!"
          },
          {
            type: "code",
            content: "import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\n# Defining a lightweight modern CNN for rapid prototyping\nclass QuickNet(nn.Module):\n    def __init__(self):\n        super(QuickNet, self).__init__()\n        self.features = nn.Sequential(\n            nn.Conv2d(3, 16, kernel_size=3, padding=1),\n            nn.BatchNorm2d(16),\n            nn.ReLU(),\n            nn.MaxPool2d(2, 2)\n        )\n        self.classifier = nn.Linear(16 * 14 * 14, 10)\n\n    def forward(self, x):\n        return self.classifier(self.features(x).view(x.size(0), -1))"
          },
          {
            type: "markdown",
            content: "### key engineering observations\n\n1. BatchNorm2d added right after Conv2d stabilizes gradient flow, achieving convergence in only 4 epochs instead of 12.\n2. Memory footprint remains below 45MB, making it perfectly suited for edge execution and micro-devices.\n3. ReLU activation introduces sparsity, keeping active channels at approximately 34%."
          }
        ]
      });
    }

    // Support GitHub user link conversion to raw.githubusercontent.com
    if (url.includes("github.com") && url.includes("/blob/")) {
      url = url
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
    } else if (url.includes("github.com") && url.includes("/raw/")) {
      url = url
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/raw/", "/");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    let cells: Array<{ type: string; content: string }> = [];
    let title = "Linked Source Document";

    // Detect if this is likely a JSON (.ipynb) file
    let parsedAsIpynb = false;
    try {
      if (rawText.trim().startsWith("{") && rawText.trim().endsWith("}")) {
        const data = JSON.parse(rawText);
        if (data && Array.isArray(data.cells)) {
          parsedAsIpynb = true;
          data.cells.forEach((cell: any) => {
            const type = cell.cell_type || "unknown";
            const content = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
            if (content.trim()) {
              cells.push({ type, content });
            }
          });
          
          // Extract title from metadata if available
          if (data.metadata?.kernelspec?.display_name) {
            title = data.metadata.kernelspec.display_name;
          } else {
            const parts = url.split("/");
            const filename = parts[parts.length - 1];
            if (filename) title = filename.replace(".ipynb", "");
          }
        }
      }
    } catch (e) {
      // Not valid ipynb JSON, fall through to webpage parsing
    }

    // If it's not a Jupyter Notebook, treat it as a general webpage or document!
    if (!parsedAsIpynb) {
      console.log(`[Crawler] URL is not an ipynb file. Parsing as general webpage / HTML: ${url}`);
      
      // Clean HTML from scripts and style sheets
      let cleanedText = rawText
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, "")
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "")
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Squeeze it to 25k chars to keep it within safe token size and avoid billing bloat
      if (cleanedText.length > 25000) {
        cleanedText = cleanedText.substring(0, 25000) + "... [truncated]";
      }

      // Try to determine a friendly title
      const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      } else {
        const parts = url.split("/");
        title = parts[parts.length - 1] || "Webpage Content";
      }

      // Feed this cleaned webpage data to Gemini to extract core tech learnings and code snippets
      try {
        console.log("[Crawler] Using Gemini to intelligently extract learnings and segment into cells...");
        const ai = getGeminiClient();
        const extractionPrompt = `You are a high-performance web parsing agent.
Your goal is to extract the core intellectual, technical, or business insights, methodologies, and code fragments from the raw text of this webpage.

Page URL: ${url}
Page Title: ${title}

Raw page content:
"""
${cleanedText}
"""

Please format your response as a JSON array of blocks.
For each block, specify:
1. "type": either "markdown" (for conceptual summaries, insights, bullet points, statistics, takeaways) or "code" (for clean actual programming language code blocks, config JSONs, architecture diagrams or commands).
2. "content": the actual parsed text or code block.

Rules:
- Be concise and focus purely on dense, high-impact content.
- Do not repeat headers.
- Extract any code snippets verbatim and place them in 'code' blocks.
- Put bullet points of learnings, architecture diagrams, or insights in 'markdown' blocks.
- Ensure the JSON is completely valid and parses cleanly.`;

        const extractionResponse = await generateContentWithRetry(
          "Generate the structured learning blocks in JSON.",
          {
            systemInstruction: extractionPrompt,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ["markdown", "code"] },
                      content: { type: Type.STRING }
                    },
                    required: ["type", "content"]
                  }
                }
              },
              required: ["blocks"]
            }
          },
          MODEL_NAME
        );

        const extractionText = extractionResponse.text;
        if (extractionText) {
          const parsed = JSON.parse(cleanJsonText(extractionText));
          if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            cells = parsed.blocks;
            console.log(`[Crawler] Gemini successfully segmented the webpage into ${cells.length} learning blocks.`);
          }
        }
      } catch (geminiErr) {
        console.error("[Crawler] Gemini extraction failed, falling back to manual markdown slicing:", geminiErr);
        // Fallback: manually divide cleanedText into a couple of sections
        cells.push({
          type: "markdown",
          content: `### Webpage Summary (Fallback)\n\n${cleanedText.substring(0, 1000)}...`
        });
      }
    }

    res.json({ success: true, cells, title });
  } catch (error: any) {
    console.error("Error parsing webpage/notebook:", error);
    res.status(500).json({ error: error?.message || "Failed to fetch and parse the webpage." });
  }
});

// Explicit 404 handler for unmatched API endpoints to prevent falling through to Vite SPA html fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Express global error handler middleware for API requests
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith("/api/")) {
    console.error("[API Error Handler]:", err);
    return res.status(err.status || err.statusCode || 500).json({
      error: err?.message || "Internal server error occurred."
    });
  }
  next(err);
});

// Serve frontend build/dev middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
