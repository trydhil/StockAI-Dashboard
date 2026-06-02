require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { google } = require('googleapis');
const axios = require('axios');
const multer = require('multer');
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ─── Google Drive Auth ────────────────────────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ─── Auth ─────────────────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  if (req.headers['x-dashboard-pin'] !== process.env.DASHBOARD_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  next();
};

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (pin === process.env.DASHBOARD_PIN) res.json({ success: true });
  else res.status(401).json({ error: 'PIN salah!' });
});

// ─── Google Drive ─────────────────────────────────────────────────────────────
app.get('/api/drive/files', auth, async (req, res) => {
  try {
    const folderId = req.query.folderId;
    if (!folderId) return res.status(400).json({ error: 'folderId required' });
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100
    });
    res.json({ files: response.data.files || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/drive/upload', auth, upload.array('files'), async (req, res) => {
  try {
    const folderId = req.body.folderId;
    if (!folderId) return res.status(400).json({ error: 'folderId required' });
    const results = [];
    for (const file of req.files) {
      const { Readable } = require('stream');
      const stream = Readable.from(file.buffer);
      const response = await drive.files.create({
        requestBody: { name: file.originalname, parents: [folderId] },
        media: { mimeType: file.mimetype, body: stream },
        fields: 'id,name,size'
      });
      results.push(response.data);
    }
    res.json({ success: true, uploaded: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/drive/files/:fileId', auth, async (req, res) => {
  try {
    await drive.files.delete({ fileId: req.params.fileId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/drive/folders', auth, (req, res) => {
  res.json({
    // Pictures
    pictures: process.env.PICTURES_FOLDER_ID,
    pictures_upload: process.env.PICTURES_UPLOAD_FOLDER_ID,
    converted_jpeg: process.env.CONVERTED_JPEG_FOLDER_ID,
    transparent_png: process.env.TRANSPARENT_PNG_FOLDER_ID,
    vector: process.env.VECTOR_FOLDER_ID,
    ai_generated_image: process.env.AI_GENERATED_IMAGE_FOLDER_ID,
    pictures_csv: process.env.PICTURES_CSV_FOLDER_ID,
    // Videos
    videos: process.env.VIDEOS_FOLDER_ID,
    videos_upload: process.env.VIDEOS_UPLOAD_FOLDER_ID,
    converted_mp4: process.env.CONVERTED_MP4_FOLDER_ID,
    ai_generated_video: process.env.AI_GENERATED_VIDEO_FOLDER_ID,
    videos_csv: process.env.VIDEOS_CSV_FOLDER_ID,
    // Legacy
    csv_output: process.env.PICTURES_CSV_FOLDER_ID,
  });
});

// ─── n8n ──────────────────────────────────────────────────────────────────────
const n8nHeaders = () => ({
  'X-N8N-API-KEY': process.env.N8N_API_KEY,
  'Content-Type': 'application/json'
});

const triggerWorkflow = async () => {
  const response = await axios.post(
    `${process.env.N8N_BASE_URL}/api/v1/workflows/${process.env.N8N_WORKFLOW_ID}/run`,
    {}, { headers: n8nHeaders() }
  );
  return response.data;
};

app.post('/api/n8n/execute', auth, async (req, res) => {
  try {
    const data = await triggerWorkflow();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/n8n/executions', auth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.N8N_BASE_URL}/api/v1/executions?workflowId=${process.env.N8N_WORKFLOW_ID}&limit=20`,
      { headers: n8nHeaders() }
    );
    res.json(response.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/n8n/status', auth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.N8N_BASE_URL}/api/v1/workflows/${process.env.N8N_WORKFLOW_ID}`,
      { headers: n8nHeaders() }
    );
    res.json({ active: response.data.active, name: response.data.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Bot ───────────────────────────────────────────────────────────────────
app.post('/api/bot/chat', auth, async (req, res) => {
  try {
    const { messages, mode } = req.body;
    const modeContext = {
      image: `You are an expert Adobe Stock image prompt consultant. Help create compelling prompts for stock photography. Requirements: JPEG, 4MP-100MP, max 45MB, no watermarks, commercially safe. Guide them with: subject, lighting, style, mood, composition, color palette. When prompt is ready, clearly label it as "**Final Prompt:**" followed by the prompt on the same line. Always respond in the same language the user uses.`,
      transparent_png: `You are an expert Adobe Stock transparent PNG consultant. Help create prompts for transparent background cutout images. Requirements: PNG with alpha channel, 4MP-100MP, max 45MB, no background. When ready, label "**Final Prompt:**" on same line. Always respond in same language as user.`,
      vector: `You are an expert Adobe Stock vector illustration consultant. Help create prompts for vector art. Requirements: AI/EPS/SVG, 15MP-65MP artboard, max 45MB. Style options: flat, line art, isometric. When ready, label "**Final Prompt:**" on same line. Respond in same language as user.`,
      video: `You are an expert Adobe Stock video prompt consultant. Help create prompts for stock video footage. Requirements: MP4/MOV, min 720p (prefer 4K), 5-60 seconds, no watermarks, commercially safe. Include: scene, camera movement, lighting, mood, duration hint. When ready, label "**Final Prompt:**" on same line. Respond in same language as user.`
    };

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        system_instruction: { parts: [{ text: modeContext[mode] || modeContext.image }] },
        contents: geminiMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, tidak bisa merespons.';
    res.json({ reply });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Generate Image ───────────────────────────────────────────────────────────
app.post('/api/generate/image', auth, async (req, res) => {
  try {
    const { prompt, mode } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const enhancedPrompt = mode === 'transparent_png'
      ? `${prompt}, isolated on pure white background, no background elements, clean cutout, professional stock image style`
      : mode === 'vector'
      ? `${prompt}, vector illustration, flat design style, clean geometric shapes, professional illustration, scalable graphics`
      : `${prompt}, professional stock photography, high quality, sharp focus, commercial use, well-lit`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GEMINI_API_KEY}`,
      {
        instances: [{ prompt: enhancedPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_few' }
      }
    );

    const imageData = response.data?.predictions?.[0]?.bytesBase64Encoded;
    if (!imageData) return res.status(500).json({ error: 'Gagal generate gambar — coba prompt yang berbeda' });

    const { Readable } = require('stream');
    const buffer = Buffer.from(imageData, 'base64');
    const stream = Readable.from(buffer);
    const fileName = `ai_${mode}_${Date.now()}.jpg`;

    const driveResponse = await drive.files.create({
      requestBody: { name: fileName, parents: [process.env.AI_GENERATED_IMAGE_FOLDER_ID] },
      media: { mimeType: 'image/jpeg', body: stream },
      fields: 'id,name,webViewLink'
    });

    res.json({ success: true, imageBase64: imageData, fileName, driveFile: driveResponse.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// ─── Generate Video (Veo 3) ───────────────────────────────────────────────────
app.post('/api/generate/video', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    // Submit generate request ke Veo 3
    const submitResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001:predictLongRunning?key=${process.env.GEMINI_API_KEY}`,
      {
        instances: [{ prompt }],
        parameters: {
          aspectRatio: '16:9',
          durationSeconds: 8,
          personGeneration: 'dont_allow',
          addWatermark: false
        }
      },
      { timeout: 30000 }
    );

    const operationName = submitResponse.data?.name;
    if (!operationName) return res.status(500).json({ error: 'Gagal submit generate video', prompt });

    // Poll sampai selesai (max 3 menit)
    let videoData = null;
    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollResponse = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`
      );
      if (pollResponse.data?.done) {
        videoData = pollResponse.data?.response?.predictions?.[0]?.bytesBase64Encoded ||
                    pollResponse.data?.response?.predictions?.[0]?.video?.bytesBase64Encoded;
        break;
      }
    }

    if (!videoData) return res.status(500).json({ error: 'Timeout generate video', prompt });

    // Upload ke Drive
    const { Readable } = require('stream');
    const buffer = Buffer.from(videoData, 'base64');
    const stream = Readable.from(buffer);
    const fileName = `veo3_video_${Date.now()}.mp4`;

    const driveResponse = await drive.files.create({
      requestBody: { name: fileName, parents: [process.env.AI_GENERATED_VIDEO_FOLDER_ID] },
      media: { mimeType: 'video/mp4', body: stream },
      fields: 'id,name,webViewLink'
    });

    res.json({ success: true, fileName, driveFile: driveResponse.data });
  } catch (err) {
    res.status(503).json({
      error: err.response?.data?.error?.message || err.message,
      limitReached: err.response?.status === 429,
      prompt: req.body.prompt
    });
  }
});

app.get('/api/generate/video/status', auth, async (req, res) => {
  try {
    // Test apakah Veo 3 bisa diakses
    await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001?key=${process.env.GEMINI_API_KEY}`,
      { timeout: 5000 }
    );
    res.json({ available: true, model: 'Veo 3.0' });
  } catch {
    res.json({ available: false });
  }
});

// ─── Desktop Remote ───────────────────────────────────────────────────────────
app.post('/api/desktop/upscayl', auth, (req, res) => {
  const p = process.env.UPSCAYL_PATH || 'C:\\Program Files\\Upscayl\\upscayl.exe';
  exec(`"${p}"`, (err) => {
    if (err) return res.status(500).json({ error: 'Upscayl tidak ditemukan' });
    res.json({ success: true });
  });
});

app.post('/api/desktop/explorer', auth, (req, res) => {
  const safePath = req.body.path || 'C:\\Users\\ASUS\\kerja';
  exec(`explorer "${safePath}"`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/desktop/cmd', auth, (req, res) => {
  exec('start cmd', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/desktop/sysinfo', auth, (req, res) => {
  const os = require('os');
  res.json({
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: Math.floor(os.uptime() / 60),
    totalMem: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10,
    freeMem: Math.round(os.freemem() / 1024 / 1024 / 1024 * 10) / 10,
    cpus: os.cpus().length
  });
});

// ─── Auto Mode ────────────────────────────────────────────────────────────────
let autoMode = false;
let autoJob = null;
let lastPicturesCount = 0;
let lastVideosCount = 0;

const checkAndRun = async () => {
  try {
    // Cek folder Pictures/Upload
    const picRes = await drive.files.list({
      q: `'${process.env.PICTURES_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id)',
      pageSize: 100
    });
    const picCount = (picRes.data.files || []).length;

    // Cek folder Videos/Upload
    const vidRes = await drive.files.list({
      q: `'${process.env.VIDEOS_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id)',
      pageSize: 100
    });
    const vidCount = (vidRes.data.files || []).length;

    const hasNewPictures = picCount > lastPicturesCount;
    const hasNewVideos = vidCount > lastVideosCount;

    if (hasNewPictures || hasNewVideos) {
      const newPic = picCount - lastPicturesCount;
      const newVid = vidCount - lastVideosCount;
      console.log(`[AutoMode] File baru — Pictures: +${newPic > 0 ? newPic : 0}, Videos: +${newVid > 0 ? newVid : 0}`);
      await triggerWorkflow();
      console.log(`[AutoMode] Workflow triggered ✅`);
    }

    lastPicturesCount = picCount;
    lastVideosCount = vidCount;
  } catch (err) {
    console.error('[AutoMode] Error:', err.message);
  }
};

app.post('/api/automode', auth, (req, res) => {
  const { enabled } = req.body;
  autoMode = enabled;
  if (enabled) {
    // Reset counter saat aktifkan
    lastPicturesCount = 0;
    lastVideosCount = 0;
    autoJob = schedule.scheduleJob('*/5 * * * *', checkAndRun);
    console.log('[AutoMode] Aktif — cek setiap 5 menit');
    res.json({ success: true, message: 'Auto mode aktif — cek Pictures & Videos setiap 5 menit' });
  } else {
    if (autoJob) autoJob.cancel();
    console.log('[AutoMode] Dimatikan');
    res.json({ success: true, message: 'Auto mode dimatikan' });
  }
});

app.get('/api/automode', auth, (req, res) => res.json({ enabled: autoMode }));

// ─── Serve React ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 StockAI V2.0 → http://localhost:${PORT}`);
  console.log(`📱 Mobile → http://YOUR_PC_IP:${PORT}\n`);
});