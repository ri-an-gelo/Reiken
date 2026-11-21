import express from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import {
    uploadNotes,
    uploadQuestions,
    generate,
} from "../controllers/modelController.js";

const router = express.Router();

// temp uploads
const upload = multer({
    dest: process.env.VERCEL === "1"
        ? path.join(os.tmpdir(), "etp-uploads")
        : "uploads/tmp/",
    limits: { fileSize: 40 * 1024 * 1024 },
});

router.post("/upload-notes", upload.single("notes"), uploadNotes);
router.post("/upload-questions", upload.single("questions"), uploadQuestions);
router.post("/generate", generate);

export default router;
