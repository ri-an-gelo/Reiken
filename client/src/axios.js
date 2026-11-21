import axios from "axios";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

// ── Auth API instance (/api/*)  ───────────────────────────────────────────────
const api = axios.create({
    baseURL: `${apiUrl}/api`,
    timeout: 15000,
});

// ── RAG API instance (/rag/*) — longer timeout for LLM generation ─────────────
export const ragApi = axios.create({
    baseURL: `${apiUrl}/rag`,
    timeout: 180000, // 3 min — LLM over multiple questions can be slow
});

// Attach JWT token from localStorage to every request automatically
const attachToken = (config) => {
    const user = localStorage.getItem("user");
    if (user) {
        try {
            const { token } = JSON.parse(user);
            if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch (_) {}
    }
    return config;
};

api.interceptors.request.use(attachToken);
ragApi.interceptors.request.use(attachToken);

export default api;
