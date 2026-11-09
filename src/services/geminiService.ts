// Browser-safe Gemini client using @google/genai web build
// This service calls Gemini directly from the browser when no backend is available.

import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPost, PostAnalysis } from "../types";

function getApiKey(): string {
  // 1. Check localStorage for user-provided key
  const stored = typeof window !== "undefined" ? localStorage.getItem("lnk_custom_gemini_key") : null;
  if (stored && stored.trim()) return stored.trim();

  // 2. Vite-injected env vars (from .env VITE_GEMINI_API_KEY)
  const viteEnv = (import.meta as any).env;
  const viteKey = viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.GEMINI_API_KEY;
  if (viteKey && typeof viteKey === "string" && viteKey.trim()) return viteKey.trim();

  return "";
}

function getClient(): GoogleGenAI {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "Gemini API key not configured. Please add your API key in Settings (⚙️) or set VITE_GEMINI_API_KEY in .env."
    );
  }
  return new GoogleGenAI({ apiKey: key });
}

const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

async function generateWithFallback(contents: string, config: any): Promise<any> {
  const ai = getClient();
  let lastErr: any;
  for (const model of MODELS) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after 12s on model ${model}`)), 12000)
      );
      const generatePromise = ai.models.generateContent({
        model,
        contents,
        config,
      });
      const resp: any = await Promise.race([generatePromise, timeoutPromise]);
      if (resp && resp.text) {
        return resp;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed, falling back to next candidate:`, err?.message || err);
      lastErr = err;
      continue;
    }
  }
  throw lastErr ?? new Error("All Gemini models failed. Please try again or check your API key in Settings.");
}

export async function generatePostsClient(payload: {
  learnings: string;
  tone?: string;
  length?: string;
  emojis?: boolean;
  hashtags?: boolean;
  cta?: boolean;
  industry?: string;
  audience?: string;
}): Promise<{ options: GeneratedPost[] }> {
  const { learnings, tone, length, emojis, hashtags, cta, industry, audience } = payload;

  const systemPrompt = `You are an elite LinkedIn content creator, copywriter, and digital personal brand strategist.
Your job is to transform raw intellectual or technical learnings, notes, or explanations from a user into high-impact, engaging LinkedIn posts.

A stellar LinkedIn post has:
1. A powerful hook (first 1-2 lines) to stop the user from scrolling.
2. Generous and breathable whitespace (short 1-2 sentence paragraphs).
3. Organized takeaways (bullet points, clear visual structure).
4. An optional actionable summary or advice.
5. An optional call-to-action (CTA) inviting comments or discussion.

You will generate exactly 3 distinct draft options. Each draft must have a unique style label.

Parameters:
- TONE: ${tone || "professional"}
- LENGTH: ${length || "medium"} (short = 2-3 paragraphs, medium = 4-6 paragraphs, long = deep-dive)
- EMOJIS: ${emojis ? "Use relevant emojis tastefully." : "No emojis."}
- HASHTAGS: ${hashtags ? "Include 3-4 relevant hashtags at the end." : "No hashtags."}
- CTA: ${cta ? "End with a thought-provoking question." : "End smoothly without a CTA."}
- INDUSTRY: ${industry || "Technology"}
- AUDIENCE: ${audience || "Industry Professionals"}

Raw Learning:
"""
${learnings}
"""

Write like a human. Avoid AI clichés: "In today's fast-paced world", "delve", "testament", "beacon".`;

  const resp = await generateWithFallback(
    "Transform the provided raw learnings into 3 distinct, high-impact LinkedIn post draft options in JSON format now.",
    {
      temperature: 0.7,
      systemInstruction: systemPrompt,
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
                styleLabel: { type: Type.STRING },
                title: { type: Type.STRING },
                text: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["styleLabel", "title", "text", "explanation"],
            },
          },
        },
        required: ["options"],
      },
    }
  );

  const text = resp.text;
  if (!text) throw new Error("Empty response from Gemini.");
  const data = JSON.parse(text);
  if (!data?.options?.length) throw new Error("No drafts returned from Gemini.");
  return data;
}

export async function refinePostClient(
  originalPost: string,
  instructions: string
): Promise<{ refinedText: string; changeSummary?: string }> {
  const systemPrompt = `You are a professional LinkedIn editor.
Take the existing post below and refine it per the instructions.

Original:
"""
${originalPost}
"""

Instructions:
"""
${instructions}
"""

Keep formatting, line breaks, and core content. Apply requested changes only.`;

  const resp = await generateWithFallback(
    "Edit and refine the post per the instructions.",
    {
      temperature: 0.6,
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedText: { type: Type.STRING },
          changeSummary: { type: Type.STRING },
        },
        required: ["refinedText", "changeSummary"],
      },
    }
  );

  const text = resp.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return JSON.parse(text);
}

export async function analyzePostClient(postText: string): Promise<PostAnalysis> {
  const systemPrompt = `You are a LinkedIn engagement analyst.
Analyze the following post for hook strength, readability, and engagement potential.

Post:
"""
${postText}
"""

Score each dimension 1-10 and provide improvement suggestions.`;

  const resp = await generateWithFallback(
    "Analyze this post and return structured metrics.",
    {
      temperature: 0.3,
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hookScore: { type: Type.INTEGER },
          hookFeedback: { type: Type.STRING },
          readabilityScore: { type: Type.INTEGER },
          readabilityFeedback: { type: Type.STRING },
          valueScore: { type: Type.INTEGER },
          valueFeedback: { type: Type.STRING },
          estimatedEngagement: { type: Type.STRING },
          estimatedEngagementRationale: { type: Type.STRING },
          wordCount: { type: Type.INTEGER },
          readTimeSeconds: { type: Type.INTEGER },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "hookScore", "hookFeedback", "readabilityScore", "readabilityFeedback",
          "valueScore", "valueFeedback", "estimatedEngagement", "estimatedEngagementRationale",
          "wordCount", "readTimeSeconds", "suggestions",
        ],
      },
    }
  );

  const text = resp.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return JSON.parse(text);
}

export async function generateMatchingImageClient(
  postText: string,
  title?: string,
  category?: string,
  style: string = "3d-render"
): Promise<{ imageUrl: string; visualConcept?: string; suggestedPrompt?: string }> {
  // Curated high quality imagery based on keywords (image generation needs Imagen which requires billing)
  const promptLower = (postText + " " + title + " " + category).toLowerCase();
  let fallbackUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=85";

  if (promptLower.includes("ai") || promptLower.includes("tech") || promptLower.includes("code") || promptLower.includes("data")) {
    fallbackUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("business") || promptLower.includes("leadership") || promptLower.includes("growth")) {
    fallbackUrl = "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("design") || promptLower.includes("creative") || promptLower.includes("ux")) {
    fallbackUrl = "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=85";
  } else if (promptLower.includes("cloud") || promptLower.includes("system") || promptLower.includes("architecture")) {
    fallbackUrl = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=85";
  }

  return {
    imageUrl: fallbackUrl,
    suggestedPrompt: `A minimalist abstract 3D render illustrating ${category || "modern professional"} concepts`,
    visualConcept: `Professional visual for a ${category || "technology"} LinkedIn post`,
  };
}

export async function parseNotebookClient(
  rawUrl: string
): Promise<{ cells: Array<{ type: string; content: string }>; title?: string; isColabWeb?: boolean }> {
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // 1. Detect Google Colab links directly
  if (url.includes("colab.research.google.com/drive/") && !url.includes("/github/")) {
    return {
      isColabWeb: true,
      title: "Google Colab Notebook",
      cells: [
        {
          type: "markdown",
          content:
            "### Google Colab Notebook detected\n\nGoogle Colab URLs starting with `/drive/` are protected inside your Google Drive. For the best experience, please:\n\n1. In your Colab notebook, click **File > Download > Download .ipynb**\n2. Drag-and-drop the downloaded file directly into the **Upload Notebook** area below!\n\nAlternatively, we've loaded a professional Deep Learning template here so you can test the notebook drafting capabilities immediately!",
        },
        {
          type: "code",
          content:
            "import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\n# Defining a lightweight modern CNN for rapid prototyping\nclass QuickNet(nn.Module):\n    def __init__(self):\n        super(QuickNet, self).__init__()\n        self.features = nn.Sequential(\n            nn.Conv2d(3, 16, kernel_size=3, padding=1),\n            nn.BatchNorm2d(16),\n            nn.ReLU(),\n            nn.MaxPool2d(2, 2)\n        )\n        self.classifier = nn.Linear(16 * 14 * 14, 10)\n\n    def forward(self, x):\n        return self.classifier(self.features(x).view(x.size(0), -1))",
        },
        {
          type: "markdown",
          content:
            "### key engineering observations\n\n1. BatchNorm2d added right after Conv2d stabilizes gradient flow, achieving convergence in only 4 epochs instead of 12.\n2. Memory footprint remains below 45MB, making it perfectly suited for edge execution and micro-devices.\n3. ReLU activation introduces sparsity, keeping active channels at approximately 34%.",
        },
      ],
    };
  }

  // 2. Convert GitHub blob/raw links to raw.githubusercontent.com
  let fetchUrl = url;
  if (url.includes("github.com") && url.includes("/blob/")) {
    fetchUrl = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  } else if (url.includes("github.com") && url.includes("/raw/")) {
    fetchUrl = url.replace("github.com", "raw.githubusercontent.com").replace("/raw/", "/");
  }

  // 3. Fetch content with CORS fallback
  let rawText = "";
  try {
    const res = await fetch(fetchUrl);
    if (res.ok) {
      rawText = await res.text();
    }
  } catch {
    // Direct browser fetch failed (likely CORS on external domain)
  }

  if (!rawText) {
    try {
      const res = await fetch(`https://r.jina.ai/${url}`);
      if (res.ok) {
        rawText = await res.text();
      }
    } catch {
      // Jina reader fallback
    }
  }

  if (!rawText) {
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        rawText = await res.text();
      }
    } catch {
      // allorigins proxy fallback
    }
  }

  if (!rawText || !rawText.trim()) {
    throw new Error("Unable to fetch content from this URL due to website CORS restrictions. Please use the Upload Notebook or Paste Notes tab directly.");
  }

  // 4. Try parsing as Jupyter Notebook (.ipynb JSON)
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const data = JSON.parse(trimmed);
      if (data && Array.isArray(data.cells)) {
        const cells: Array<{ type: string; content: string }> = [];
        data.cells.forEach((cell: any) => {
          const type = cell.cell_type || "markdown";
          const content = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
          if (content.trim()) {
            cells.push({ type, content });
          }
        });

        let title = "Linked Notebook";
        if (data.metadata?.kernelspec?.display_name) {
          title = data.metadata.kernelspec.display_name;
        } else {
          const parts = url.split("/");
          const filename = parts[parts.length - 1];
          if (filename) title = filename.replace(".ipynb", "");
        }

        if (cells.length > 0) {
          return { cells, title };
        }
      }
    } catch {
      // Fall through to AI extraction
    }
  }

  // 5. Clean HTML / markdown text if it was a web page
  let cleaned = rawText
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 15000) {
    cleaned = cleaned.substring(0, 15000) + "... [truncated]";
  }

  // Extract title
  let title = "Web Document";
  const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || rawText.match(/^Title:\s*(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // 6. Use Gemini to segment the webpage text into structured learning blocks
  try {
    const prompt = `You are a high-performance document parsing agent.
Extract the core intellectual, technical, or business insights, methodologies, and code fragments from the text of this webpage.

Page URL: ${url}
Page Title: ${title}

Raw content:
"""
${cleaned}
"""

Format your response as a JSON object with a "blocks" array.
Each block has:
- "type": "markdown" (for takeaways, bullet points, concepts) or "code" (for code, configs, commands)
- "content": the actual text/code.`;

    const resp = await generateWithFallback(prompt, {
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
                type: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ["type", "content"],
            },
          },
        },
        required: ["blocks"],
      },
    });

    const parsed = JSON.parse(resp.text);
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      return { cells: parsed.blocks, title };
    }
  } catch (err) {
    console.warn("Gemini extraction failed, using fallback slicing:", err);
  }

  // Fallback if AI extraction failed
  return {
    cells: [
      {
        type: "markdown",
        content: `### Document Takeaways from ${title}\n\n${cleaned.substring(0, 2500)}`,
      },
    ],
    title,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Parses ANY uploaded file type (PDF, Images, Code, Word, Excel, Notebooks, Audio, Text) into structured blocks */
export async function parseUploadedFileClient(
  file: File
): Promise<{ cells: Array<{ type: string; content: string }>; title: string; imagePreview?: string }> {
  const filename = file.name || "Uploaded File";
  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "" : "";
  const title = filename.replace(/\.[^/.]+$/, "");

  // 1. Jupyter Notebook (.ipynb)
  if (ext === "ipynb") {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data && Array.isArray(data.cells)) {
        const cells: Array<{ type: string; content: string }> = [];
        data.cells.forEach((cell: any) => {
          const type = cell.cell_type || "markdown";
          const content = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
          if (content.trim()) {
            cells.push({ type, content });
          }
        });
        if (cells.length > 0) return { cells, title };
      }
    } catch (e) {
      console.warn("Could not parse as standard JSON notebook, falling back:", e);
    }
  }

  // 2. Images (PNG, JPG, JPEG, WEBP, GIF, SVG, BMP, HEIC, etc.)
  const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "heic"].includes(ext);
  if (isImage) {
    const dataUrl = await readFileAsDataUrl(file);
    const base64Data = dataUrl.split(",")[1];
    const mimeType = file.type || (ext === "png" ? "image/png" : "image/jpeg");

    const prompt = `You are an elite analyst. Look at this uploaded image (${filename}).
Extract all visible text, diagram architectures, data figures, strategic ideas, or meeting notes.
Organize into distinct, structured takeaways formatted as a JSON object with a "blocks" array.
Each block has:
- "type": "markdown" (for notes, concepts, insights) or "code" (for code, configs, CLI commands)
- "content": the actual text/code.`;

    const ai = getClient();
    const resp = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
      config: {
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
                  type: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["type", "content"],
              },
            },
          },
          required: ["blocks"],
        },
      },
    });

    const parsed = JSON.parse(resp.text);
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      return { cells: parsed.blocks, title, imagePreview: dataUrl };
    }
    return {
      cells: [{ type: "markdown", content: resp.text }],
      title,
      imagePreview: dataUrl,
    };
  }

  // 3. PDF Document
  const isPdf = file.type === "application/pdf" || ext === "pdf";
  if (isPdf) {
    const dataUrl = await readFileAsDataUrl(file);
    const base64Data = dataUrl.split(",")[1];

    const prompt = `You are an executive knowledge extraction assistant.
Extract the key intellectual insights, core arguments, methodologies, statistics, and any code or diagrams from this PDF (${filename}).
Organize into distinct, high-impact blocks in a JSON object with a "blocks" array.
Each block has:
- "type": "markdown" (for insights, takeaways, sections) or "code" (for code, formulas, configs)
- "content": the actual text/code.`;

    const ai = getClient();
    const resp = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64Data } },
            { text: prompt },
          ],
        },
      ],
      config: {
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
                  type: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["type", "content"],
              },
            },
          },
          required: ["blocks"],
        },
      },
    });

    const parsed = JSON.parse(resp.text);
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      return { cells: parsed.blocks, title };
    }
    return { cells: [{ type: "markdown", content: resp.text }], title };
  }

  // 4. Plain Text & Code Files (txt, md, py, js, ts, json, csv, sql, html, xml, etc.)
  try {
    const rawText = await file.text();
    const isBinary = /[\x00-\x08\x0E-\x1F]/.test(rawText.slice(0, 500));
    if (!isBinary && rawText.trim().length > 0) {
      if (rawText.length > 3000) {
        const prompt = `You are an expert editor. Extract the most important insights, principles, and code from this file (${filename}):\n\n"""\n${rawText.slice(0, 20000)}\n"""`;
        const resp = await generateWithFallback(prompt, {
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
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ["type", "content"],
                },
              },
            },
            required: ["blocks"],
          },
        });
        const parsed = JSON.parse(resp.text);
        if (parsed?.blocks?.length > 0) {
          return { cells: parsed.blocks, title };
        }
      }

      const sections = rawText
        .split(/\n{2,}/)
        .filter((b) => b.trim().length > 0)
        .map((b) => ({
          type: ["py", "js", "ts", "jsx", "tsx", "sql", "sh", "c", "cpp", "java", "go", "rs"].includes(ext)
            ? "code"
            : "markdown",
          content: b.trim(),
        }));

      if (sections.length > 0) {
        return { cells: sections, title };
      }
    }
  } catch {
    // Fall through to multimodal
  }

  // 5. Any Other Document or Binary File (Word, Excel, PowerPoint, audio, etc.)
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const base64Data = dataUrl.split(",")[1];
    const mimeType = file.type || "application/octet-stream";

    const prompt = `Extract all usable text, notes, key points, tabular summaries, or learnings from this attached document/file (${filename}) in JSON format.
Return a "blocks" array where each block has "type" (markdown or code) and "content".`;

    const ai = getClient();
    const resp = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
      config: {
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
                  type: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["type", "content"],
              },
            },
          },
          required: ["blocks"],
        },
      },
    });

    const parsed = JSON.parse(resp.text);
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      return { cells: parsed.blocks, title };
    }
  } catch (binaryErr: any) {
    console.warn("Binary extraction failed:", binaryErr);
  }

  throw new Error(`Could not extract readable text from "${filename}". Please try pasting the notes directly.`);
}

/** Returns true when running on static Firebase Hosting (no Express backend) */
export function isStaticHosting(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.endsWith(".web.app") ||
    host.endsWith(".firebaseapp.com") ||
    host.endsWith(".netlify.app") ||
    host.endsWith(".vercel.app")
  );
}
