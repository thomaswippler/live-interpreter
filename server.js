const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
const { TranslationServiceClient } = require('@google-cloud/translate');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const API_SAMPLE_RATE = 16000;

const speechClient = new SpeechClient();
const translateClient = new TranslationServiceClient();
const ttsClient = new TextToSpeechClient();

const server = http.createServer((req, res) => {
    let filePath;
    if (req.url === '/' || req.url === '/index.html') filePath = path.join(__dirname, 'index.html');
    else if (req.url === '/audio-processor.js') filePath = path.join(__dirname, 'audio-processor.js');
    else { res.writeHead(404); res.end('Not Found'); return; }
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(500); res.end('Error loading file'); }
        else {
            let contentType = req.url === '/audio-processor.js' ? 'application/javascript' : 'text/html';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('[SERVER] Client connected.');

    let audioBuffer = [];
    let isProcessing = false;
    let sourceLanguage = 'de-DE';
    let targetLanguage = 'en-US';

    const processAudioBatch = async () => {
        if (isProcessing || audioBuffer.length < 20) {
            if(isProcessing) console.log('[SERVER-BATCH] Already processing a batch.');
            audioBuffer = [];
            return;
        }

        isProcessing = true;
        const completeBuffer = Buffer.concat(audioBuffer);
        audioBuffer = [];

        try {
            const request = {
                config: { encoding: 'LINEAR16', sampleRateHertz: API_SAMPLE_RATE, languageCode: sourceLanguage },
                audio: { content: completeBuffer.toString('base64') },
            };
            
            const [response] = await speechClient.recognize(request);
            const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');

            if (transcription) {
                console.log(`[SERVER] Transcription (${sourceLanguage}): "${transcription}"`);
                
                const [translateResponse] = await translateClient.translateText({
                    parent: `projects/${PROJECT_ID}/locations/global`,
                    contents: [transcription], mimeType: 'text/plain',
                    sourceLanguageCode: sourceLanguage.split('-')[0],
                    targetLanguageCode: targetLanguage.split('-')[0],
                });
                const translation = translateResponse.translations[0].translatedText;
                console.log(`[SERVER] Translation (${targetLanguage}): "${translation}"`);

                ws.send(JSON.stringify({
                    event: 'transcript-pair',
                    sourceText: transcription,
                    translatedText: translation
                }));

                const [ttsResponse] = await ttsClient.synthesizeSpeech({
                    input: { text: translation },
                    voice: { languageCode: targetLanguage, ssmlGender: 'NEUTRAL' },
                    audioConfig: { audioEncoding: 'MP3' },
                });
                ws.send(JSON.stringify({ event: 'audioContent', data: ttsResponse.audioContent.toString('base64') }));
            }
        } catch (err) {
            console.error('--- [SERVER] API BATCH PROCESSING ERROR ---:', err);
        } finally {
            isProcessing = false;
        }
    };

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.event === 'client-ready') {
            sourceLanguage = msg.sourceLanguage;
            targetLanguage = msg.targetLanguage;
            console.log(`[SERVER] Client ready. Source: ${sourceLanguage}, Target: ${targetLanguage}`);
            ws.send(JSON.stringify({ event: 'server-ready' }));
        } else if (msg.event === 'audio') {
            audioBuffer.push(Buffer.from(msg.data, 'base64'));
        } else if (msg.event === 'end-of-speech') {
            processAudioBatch();
        }
    });

    ws.on('close', () => {
        console.log('[SERVER] Client disconnected.');
        if (audioBuffer.length > 0) processAudioBatch();
    });
    ws.on('error', (err) => console.error('[SERVER] WebSocket Error:', err));
});

server.listen(PORT, () => console.log(`[SERVER] Server is listening on http://localhost:${PORT}`));