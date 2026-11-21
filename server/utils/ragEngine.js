import { createClient } from "@libsql/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// ─── Turso / libSQL vector store ─────────────────────────────────────────────
const isLocal =
    !process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_DATABASE_URL.startsWith("file:");

const db = createClient(
    isLocal
        ? { url: "file:vectorstore.sqlite" }
        : {
              url: process.env.TURSO_DATABASE_URL,
              authToken: process.env.TURSO_AUTH_TOKEN,
          },
);

// Initialise table (runs once at startup)
await db.execute(`
  CREATE TABLE IF NOT EXISTS documents (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    source  TEXT,
    chunk   TEXT,
    embedding TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ─── API clients ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-004";
const LLM_MODEL = process.env.LLM_MODEL || "llama3-8b-8192";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
    let dot = 0,
        na = 0,
        nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── Embedding via Google Gemini ─────────────────────────────────────────────
export async function embedTextBatch(texts) {
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    const embeddings = [];
    for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
    }
    return embeddings;
}

// ─── Vector store operations ─────────────────────────────────────────────────
export async function saveChunk(source, chunk, embedding) {
    await db.execute({
        sql: "INSERT INTO documents (source, chunk, embedding) VALUES (?, ?, ?)",
        args: [source, chunk, JSON.stringify(embedding)],
    });
}

export async function searchTopK(queryEmbedding, k = 4, sourceFilter = null) {
    const result = sourceFilter
        ? await db.execute({
              sql: "SELECT id, source, chunk, embedding FROM documents WHERE source = ?",
              args: [sourceFilter],
          })
        : await db.execute(
              "SELECT id, source, chunk, embedding FROM documents",
          );

    const rows = result.rows;
    const scored = rows.map((r) => {
        const emb = JSON.parse(r.embedding);
        return {
            id: r.id,
            source: r.source,
            chunk: r.chunk,
            score: cosineSimilarity(queryEmbedding, emb),
        };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
}

// ─── LLM via Groq (llama3) ───────────────────────────────────────────────────
export async function generateAnswerWithLLM(messages) {
    const completion = await groq.chat.completions.create({
        model: LLM_MODEL,
        messages,
        max_tokens: 800,
        temperature: 0.2,
    });

    const answer = completion.choices?.[0]?.message?.content ?? "";
    return { llmAnswer: answer };
}

// ─── Text chunking ────────────────────────────────────────────────────────────
export function chunkText(text, size = 800, overlap = 100) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size - overlap;
        if (i + overlap >= text.length) break;
    }
    // last chunk
    if (i < text.length) chunks.push(text.slice(i));
    return chunks;
}
