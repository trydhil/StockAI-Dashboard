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

app.get('/api/drive/folders', auth, async (req, res) => {
  try {
    const folders = {
      pictures: process.env.PICTURES_FOLDER_ID,
      pictures_upload: process.env.PICTURES_UPLOAD_FOLDER_ID,
      converted_jpeg: process.env.CONVERTED_JPEG_FOLDER_ID,
      transparent_png: process.env.TRANSPARENT_PNG_FOLDER_ID,
      vector: process.env.VECTOR_FOLDER_ID,
      ai_generated_image: process.env.AI_GENERATED_IMAGE_FOLDER_ID,
      pictures_csv: process.env.PICTURES_CSV_FOLDER_ID,
      videos: process.env.VIDEOS_FOLDER_ID,
      videos_upload: process.env.VIDEOS_UPLOAD_FOLDER_ID,
      converted_mp4: process.env.CONVERTED_MP4_FOLDER_ID,
      ai_generated_video: process.env.AI_GENERATED_VIDEO_FOLDER_ID,
      videos_csv: process.env.VIDEOS_CSV_FOLDER_ID,
      belum_upscale: process.env.BELUM_UPSCALE_FOLDER_ID || '1xqhO-4SdNsOgKl52cpT2TkwJ8nVtG0zU'
    };
    const missingFolders = [];
    for (const [key, value] of Object.entries(folders)) {
      if (!value) missingFolders.push(key);
    }
    if (missingFolders.length > 0) {
      console.warn('[Drive Folders] Missing folder IDs:', missingFolders);
    }
    res.json(folders);
  } catch (err) {
    console.error('[Drive Folders] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── n8n ──────────────────────────────────────────────────────────────────────
const n8nHeaders = () => ({
  'X-N8N-API-KEY': process.env.N8N_API_KEY,
  'Content-Type': 'application/json'
});

const triggerWorkflow = async () => {
  try {
    console.log('[N8N Trigger] Ambil file terbaru dari Drive...');
    
    let latestFile = null;
    let fileSource = null;
    
    // Coba Pictures Upload
    const picRes = await drive.files.list({
      q: `'${process.env.PICTURES_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size)',
      orderBy: 'createdTime desc',
      pageSize: 1
    });
    
    if (picRes.data.files?.length > 0) {
      fileSource = 'pictures';
      const detail = await drive.files.get({
        fileId: picRes.data.files[0].id,
        fields: 'id,name,mimeType,size'
      });
      latestFile = detail.data;
    } else {
      // Coba Videos Upload
      const vidRes = await drive.files.list({
        q: `'${process.env.VIDEOS_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size)',
        orderBy: 'createdTime desc',
        pageSize: 1
      });
      if (vidRes.data.files?.length > 0) {
        fileSource = 'videos';
        const detail = await drive.files.get({
          fileId: vidRes.data.files[0].id,
          fields: 'id,name,mimeType,size'
        });
        latestFile = detail.data;
      }
    }
    
    if (!latestFile) {
      throw new Error('Tidak ada file di folder Upload!');
    }

    console.log('[N8N Trigger] File detail:', JSON.stringify(latestFile));
    
    // Kirim ke webhook
    const response = await axios.post(
      `${process.env.N8N_BASE_URL}/webhook/trigger-stock`,
      {
        id: latestFile.id,
        name: latestFile.name,
        mimeType: latestFile.mimeType,
        size: latestFile.size,
        fileSource: fileSource
      },
      { 
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Cek response dari N8N
    if (response.data && response.data.code === 0) {
      console.log('[N8N Trigger] Webhook sukses, tapi tidak ada output (mungkin file tidak valid)');
      return { success: true, message: 'Workflow triggered, but no valid file processed' };
    }
    
    console.log('[N8N Trigger] Sukses:', response.status, response.data);
    return response.data;
    
  } catch (err) {
    const errDetail = err.response?.data?.message || err.message;
    console.error('[N8N Trigger] Error:', errDetail);
    throw new Error(errDetail);
  }
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

app.get('/api/n8n/workflow-info', auth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.N8N_BASE_URL}/api/v1/workflows/${process.env.N8N_WORKFLOW_ID}`,
      { headers: n8nHeaders() }
    );
    const wf = response.data;
    res.json({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      updatedAt: wf.updatedAt,
      n8nUrl: `${process.env.N8N_BASE_URL}/workflow/${wf.id}`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Bot (Gemini) ──────────────────────────────────────────────────────────
app.post('/api/bot/chat', auth, async (req, res) => {
  try {
    const { messages, mode } = req.body;

    const modeContext = {
      image: `You are an expert Adobe Stock image prompt consultant. Help create compelling prompts for stock photography. Adobe Stock requirements: JPEG format, minimum 4MP resolution, max 45MB file size, no watermarks, commercially safe content. Guide users to define: subject matter, lighting conditions, photography style, mood/atmosphere, composition, color palette. When the prompt is fully refined and ready to generate, clearly label it as "**Final Prompt:**" followed by the complete prompt on the same line. Always respond in the same language the user writes in.`,
      transparent_png: `You are an expert Adobe Stock transparent PNG consultant. Help create prompts for isolated cutout images with transparent backgrounds. Requirements: PNG with alpha channel, minimum 4MP, max 45MB, clean transparent background with no artifacts. Guide users to define: subject (products, objects, characters), style (realistic/illustrative), lighting for clean cutout. When ready, label "**Final Prompt:**" on same line. Respond in same language as user.`,
      vector: `You are an expert Adobe Stock vector illustration consultant. Help create prompts for vector artwork. Requirements: AI/EPS/SVG format, 15MP-65MP equivalent artboard, max 45MB, scalable without quality loss. Style options to discuss: flat design, line art, isometric, hand-drawn, geometric. When ready, label "**Final Prompt:**" on same line. Respond in same language as user.`,
      video: `You are an expert Adobe Stock video prompt consultant. Help create prompts for professional stock video footage. Requirements: MP4 or MOV format, minimum 720p resolution (4K preferred), duration 5-60 seconds, no watermarks, commercially safe. Include in prompt: scene description, camera movement (pan/zoom/static/dolly), lighting conditions, mood, color grading style, suggested duration. When ready, label "**Final Prompt:**" on same line. Respond in same language as user.`
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

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, tidak bisa merespons saat ini.';
    res.json({ reply });
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.error?.message || err.message;
    if (status === 429) {
      return res.status(429).json({
        error: 'Quota Gemini habis hari ini. Bot akan normal kembali besok (reset otomatis). Sementara itu, Anda masih bisa generate image dan video.',
        limitReached: true
      });
    }
    res.status(500).json({ error: errMsg });
  }
});

// ─── Generate Image (Pollinations AI) ────────────────────────────────────────
app.post('/api/generate/image', auth, async (req, res) => {
  try {
    const { prompt, mode } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    let enhancedPrompt;
    if (mode === 'transparent_png') {
      enhancedPrompt = `${prompt}, isolated subject on pure white background, clean edges, no background elements, product photography style, professional stock image`;
    } else if (mode === 'vector') {
      enhancedPrompt = `${prompt}, vector illustration, flat design style, clean geometric shapes, bold outlines, professional digital art, scalable graphics, white background`;
    } else {
      enhancedPrompt = `${prompt}, professional stock photography, high quality, sharp focus, well-lit, commercial use, clean composition`;
    }

    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 999999);

    console.log(`[Generate Image] Mode: ${mode} | Prompt: ${prompt.substring(0, 50)}...`);

    const imageResponse = await axios.get(
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`,
      { responseType: 'arraybuffer', timeout: 90000 }
    );

    if (!imageResponse.data || imageResponse.data.length < 1000) {
      return res.status(500).json({ error: 'Gagal generate gambar — coba prompt yang lebih spesifik' });
    }

    const imageData = Buffer.from(imageResponse.data).toString('base64');
    const fileName = `ai_${mode}_${Date.now()}.jpg`;

    const { Readable } = require('stream');
    const buffer = Buffer.from(imageResponse.data);
    const stream = Readable.from(buffer);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.AI_GENERATED_IMAGE_FOLDER_ID]
      },
      media: { mimeType: 'image/jpeg', body: stream },
      fields: 'id,name,webViewLink'
    });

    console.log(`[Generate Image] Sukses → Drive: ${driveResponse.data.id}`);
    res.json({
      success: true,
      imageBase64: imageData,
      fileName,
      driveFile: driveResponse.data
    });
  } catch (err) {
    console.error('[Generate Image] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gagal generate gambar' });
  }
});

// ─── Generate Video (Veo 3) ───────────────────────────────────────────────────
app.post('/api/generate/video', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    console.log(`[Generate Video] Submitting ke Veo 3: ${prompt.substring(0, 50)}...`);

    const submitResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001:predictLongRunning?key=${process.env.GEMINI_API_KEY}`,
      {
        instances: [{ prompt }],
        parameters: {
          aspectRatio: '16:9',
          durationSeconds: 8,
          personGeneration: 'dont_allow',
        }
      },
      { timeout: 30000 }
    );

    const operationName = submitResponse.data?.name;
    if (!operationName) {
      return res.status(500).json({ error: 'Gagal submit ke Veo 3 — coba lagi', prompt });
    }

    console.log(`[Generate Video] Operation: ${operationName}`);

    let videoData = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollResponse = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`
      );

      if (pollResponse.data?.done) {
        videoData = pollResponse.data?.response?.predictions?.[0]?.bytesBase64Encoded ||
                    pollResponse.data?.response?.predictions?.[0]?.video?.bytesBase64Encoded;
        console.log(`[Generate Video] Done setelah ${(i + 1) * 5} detik`);
        break;
      }
    }

    if (!videoData) {
      return res.status(500).json({ error: 'Timeout — video terlalu lama di-generate. Coba prompt yang lebih sederhana.', prompt });
    }

    const { Readable } = require('stream');
    const buffer = Buffer.from(videoData, 'base64');
    const stream = Readable.from(buffer);
    const fileName = `veo3_${Date.now()}.mp4`;

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.AI_GENERATED_VIDEO_FOLDER_ID]
      },
      media: { mimeType: 'video/mp4', body: stream },
      fields: 'id,name,webViewLink'
    });

    console.log(`[Generate Video] Sukses → Drive: ${driveResponse.data.id}`);
    res.json({ success: true, fileName, driveFile: driveResponse.data });
  } catch (err) {
    console.error('[Generate Video] Error:', err.response?.data?.error?.message || err.message);
    res.status(503).json({
      error: err.response?.data?.error?.message || err.message,
      limitReached: err.response?.status === 429,
      prompt: req.body.prompt
    });
  }
});

// Status Veo 3
app.get('/api/generate/video/status', auth, async (req, res) => {
  try {
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
    if (err) return res.status(500).json({ error: 'Upscayl tidak ditemukan di path: ' + p });
    res.json({ success: true });
  });
});

app.post('/api/desktop/explorer', auth, (req, res) => {
  const allowedPaths = [
    'C:\\Users\\ASUS\\kerja',
    'C:\\Users\\ASUS\\ContriAI_Stock',
    'C:\\Users\\ASUS\\Downloads',
    'C:\\Users\\ASUS\\Desktop'
  ];
  const reqPath = req.body.path || 'C:\\Users\\ASUS\\kerja';
  const safePath = allowedPaths.includes(reqPath) ? reqPath : 'C:\\Users\\ASUS\\kerja';
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
    const picRes = await drive.files.list({
      q: `'${process.env.PICTURES_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id)',
      pageSize: 100
    });
    const picCount = (picRes.data.files || []).length;

    const vidRes = await drive.files.list({
      q: `'${process.env.VIDEOS_UPLOAD_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id)',
      pageSize: 100
    });
    const vidCount = (vidRes.data.files || []).length;

    const hasNewPictures = picCount > lastPicturesCount;
    const hasNewVideos = vidCount > lastVideosCount;

    if (hasNewPictures || hasNewVideos) {
      const newPic = Math.max(0, picCount - lastPicturesCount);
      const newVid = Math.max(0, vidCount - lastVideosCount);
      console.log(`[AutoMode] File baru — Pictures: +${newPic}, Videos: +${newVid}`);
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
  console.log('📋 Services:');
  console.log('   🤖 Bot Chat    → Gemini 2.5 Flash (quota reset tiap hari)');
  console.log('   🖼️  Generate Image → Pollinations AI (gratis unlimited)');
  console.log('   🎬 Generate Video → Veo 3.0 (pakai Gemini key)');
  console.log('   ☁️  Storage      → Google Drive\n');
});