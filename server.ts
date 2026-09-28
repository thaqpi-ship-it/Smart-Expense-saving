import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// Scan slip / receipt / PDF document using Gemini
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in the Settings > Secrets panel.',
      });
    }

    // 1. Extract raw base64 string and detect declared MIME type from data URI
    let rawBase64 = String(imageBase64 || '').trim();
    let detectedMimeFromUri: string | null = null;
    const uriMatch = rawBase64.match(/^data:([^;,]+)(?:;[^,]*)?;base64,/i);
    if (uriMatch && uriMatch[1]) {
      detectedMimeFromUri = uriMatch[1].toLowerCase().trim();
    }

    if (rawBase64.includes(';base64,')) {
      rawBase64 = rawBase64.split(';base64,')[1];
    } else {
      const commaIndex = rawBase64.indexOf(',');
      if (rawBase64.startsWith('data:') && commaIndex !== -1) {
        rawBase64 = rawBase64.slice(commaIndex + 1);
      }
    }

    // 2. Strip all newlines, carriage returns, tabs, and spaces that cause Base64 decoding errors (INVALID_ARGUMENT)
    let cleanBase64 = rawBase64.replace(/[\r\n\s\t]/g, '').trim();

    // In case base64 string was URL-encoded in transit
    if (cleanBase64.includes('%')) {
      try {
        cleanBase64 = decodeURIComponent(cleanBase64);
      } catch {}
      cleanBase64 = cleanBase64.replace(/[\r\n\s\t]/g, '').trim();
    }

    // Ensure valid base64 padding with '='
    while (cleanBase64.length % 4 !== 0) {
      cleanBase64 += '=';
    }

    if (!cleanBase64) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลไฟล์ที่อัปโหลด' });
    }

    // 3. Inspect magic bytes to strictly guarantee the correct MIME type for Gemini
    let finalMimeType = (detectedMimeFromUri || mimeType || '').toLowerCase().trim();

    // Check for PDF signature: %PDF in base64 starts with 'JVBER'
    if (cleanBase64.startsWith('JVBER')) {
      finalMimeType = 'application/pdf';
    } else {
      try {
        const headBuffer = Buffer.from(cleanBase64.slice(0, 64), 'base64');
        const headString = headBuffer.subarray(0, 32).toString('ascii');
        if (headString.includes('%PDF')) {
          finalMimeType = 'application/pdf';
        } else if (headBuffer[0] === 0xff && headBuffer[1] === 0xd8) {
          finalMimeType = 'image/jpeg';
        } else if (
          headBuffer[0] === 0x89 &&
          headBuffer[1] === 0x50 &&
          headBuffer[2] === 0x4e &&
          headBuffer[3] === 0x47
        ) {
          finalMimeType = 'image/png';
        } else if (headBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
          finalMimeType = 'image/webp';
        }
      } catch {
        // fallback
      }
    }

    // Ensure explicit PDF assignment if client marked it as PDF or filename was .pdf
    if (
      finalMimeType.includes('pdf') ||
      mimeType === 'application/pdf' ||
      cleanBase64.startsWith('JVBER')
    ) {
      finalMimeType = 'application/pdf';
    } else if (!finalMimeType || finalMimeType === 'application/octet-stream') {
      finalMimeType = 'image/jpeg';
    }

    const isPdf = finalMimeType === 'application/pdf';

    // 4. Check payload size (~3/4 of base64 length)
    const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
    if (approxBytes > 22 * 1024 * 1024) {
      return res.status(400).json({
        error: 'ไฟล์มีขนาดใหญ่เกิน 20MB กรุณาเลือกไฟล์ PDF หรือรูปภาพที่มีขนาดเล็กลง',
      });
    }

    const prompt = isPdf
      ? `You are an expert financial document analyzer. Analyze this PDF document (e.g. bank statement, e-statement, credit card statement, utility bill, tax invoice, or receipt).
Extract the primary transaction details into structured JSON:
- Total amount paid, transferred, billed, or deposited (number only, e.g. 1500.00). If it is a bank statement or multi-entry statement, extract the main, latest, or net total transaction amount.
- Date of transaction formatted as YYYY-MM-DD. Note: If the document uses Buddhist Era (e.g. 2567 = 2024, 2568 = 2025, 2569 = 2026), convert to CE year. If year is missing, assume 2026.
- Merchant, bank, store, recipient, or issuer name (e.g. ธนาคารกสิกรไทย, ธนาคารไทยพาณิชย์, MEA, PEA, True, AIS).
- Best matching Category among: Food & Dining, Shopping, Groceries, Transportation, Utilities & Bills, Entertainment, Health & Beauty, Education, Investment, Salary, Gift & Bonus, Other.
- Transaction type: 'expense' (if money debited/spent/paid) or 'income' (if credited/salary/deposit).
- Brief summary or item notes (e.g. 'เอกสาร PDF: ...').`
      : `Analyze this payment slip, bank transfer slip, invoice, or receipt (e.g. PromptPay, Thai bank slip, store receipt, restaurant bill).
Extract key details accurately:
- Total amount paid or transferred (number only, e.g. 350.50).
- Date of transaction formatted as YYYY-MM-DD. Note: If the slip uses Buddhist Era (e.g. 2567 = 2024, 2568 = 2025, 2569 = 2026), convert to CE year. If year is missing, assume 2026.
- Merchant, store, recipient, or sender name.
- Best matching Category among: Food & Dining, Shopping, Groceries, Transportation, Utilities & Bills, Entertainment, Health & Beauty, Education, Investment, Salary, Gift & Bonus, Other.
- Transaction type: 'expense' (if money sent/paid) or 'income' (if received).
- Brief summary or item notes.`;

    // 5. Structure multimodal content adhering strictly to Google GenAI API spec:
    // Standard Part objects:
    // Part 1: inlineData with mimeType and data
    // Part 2: text prompt
    const documentPart = {
      inlineData: {
        mimeType: finalMimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: prompt,
    };

    // Canonical Content object with role: 'user' and array of parts
    const contents = {
      role: 'user',
      parts: [documentPart, textPart],
    };

    const modelConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER, description: 'Total transaction amount' },
          date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
          merchantName: { type: Type.STRING, description: 'Merchant or recipient name' },
          category: { type: Type.STRING, description: 'Category name' },
          type: { type: Type.STRING, description: 'expense or income' },
          notes: { type: Type.STRING, description: 'Short description or memo' },
        },
        required: ['amount', 'date', 'type'],
      },
    };

    let responseText = '';
    let lastError: any = null;
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: modelConfig,
          });
          responseText = response.text || '';
          if (responseText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} attempt ${attempt} returned:`, err?.message || err);
          const errMsg = String(err?.message || '');
          const isTransient =
            err?.status === 503 ||
            err?.code === 503 ||
            err?.status === 429 ||
            err?.code === 429 ||
            errMsg.includes('503') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('RESOURCE_EXHAUSTED');

          if (isTransient) {
            await new Promise((r) => setTimeout(r, 1000));
            // If quota exhausted on this model, switch immediately to next model
            if (
              err?.status === 429 ||
              err?.code === 429 ||
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED')
            ) {
              break;
            }
            continue;
          }
          break;
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      throw lastError || new Error('No response returned from Gemini model');
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error scanning document:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to scan document with AI',
    });
  }
});

// Smart text / voice input parsing
app.post('/api/smart-parse-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const ai = getGenAI();
    if (!ai) {
      // Graceful regex fallback if key is not yet set
      const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      return res.json({
        success: true,
        data: {
          amount,
          date: new Date().toISOString().split('T')[0],
          merchantName: text.slice(0, 30),
          category: 'Other',
          type: 'expense',
          notes: text,
        },
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const prompt = `The user said or typed: "${text}".
Today's date is ${todayStr}.
Extract the personal finance transaction details into JSON:
- amount: number
- date: YYYY-MM-DD (resolve relative words like 'today', 'yesterday', 'เมื่อวาน', 'วันนี้' relative to ${todayStr})
- merchantName: store, person, or purpose (clean name)
- category: One of [Food & Dining, Shopping, Groceries, Transportation, Utilities & Bills, Entertainment, Health & Beauty, Education, Investment, Salary, Gift & Bonus, Other]
- type: 'expense' or 'income'
- notes: full descriptive memo`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            merchantName: { type: Type.STRING },
            category: { type: Type.STRING },
            type: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ['amount', 'date', 'type'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error parsing text:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to parse text with AI',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
