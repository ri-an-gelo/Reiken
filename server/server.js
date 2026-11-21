import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import modelRoutes from "./routes/modelRoutes.js";
import { prisma } from "./prisma.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allow both production frontend URL and localhost dev
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((u) => u.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
                return callback(null, true);
            }
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", authRoutes);
app.use("/rag", modelRoutes);

// Health check
app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "OK", db: "Neon connected", ts: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ status: "Error", message: err.message });
    }
});

// Start server (not on Vercel)
if (process.env.VERCEL !== "1") {
    app.listen(PORT, () => {
        console.log(`🚀 Reiken API running → http://localhost:${PORT}`);
    });
}

export default app;
