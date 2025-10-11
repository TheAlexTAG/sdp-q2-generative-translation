import express from "express";

import cors from "cors";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

const reqSchema = z.object({
  text: z.string().min(1),
  srcLang: z.string().optional(),
  tgtLang: z.string().optional(),
});

function mockTranslate(s: string) {
  // simple ROT13 placeholder
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

app.post("/translate", (req, res) => {
  const parsed = reqSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad input" });
  const { text } = parsed.data;
  res.json({ translation: mockTranslate(text) });
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
