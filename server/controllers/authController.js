import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "reiken-dev-secret-change-in-prod";
const SALT_ROUNDS = 10;

// ─── Signup ───────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "name, email and password are required" });
        }

        // Check duplicate
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: "Email already registered" });
        }

        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: { name, email, password: hashed },
        });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.status(201).json({ name: user.name, email: user.email, token });
    } catch (error) {
        console.error("signup error:", error);
        res.status(400).json({ error: error.message });
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "email and password are required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.status(200).json({ name: user.name, email: user.email, token });
    } catch (error) {
        console.error("login error:", error);
        res.status(400).json({ error: error.message });
    }
};
