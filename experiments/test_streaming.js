// test_streaming.js
// This script tests the streamingRecognize API with a local file,
// simulating a live stream by sending it in small chunks.

const fs = require('fs');
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');

// --- CONFIGURATION ---
const AUDIO_FILE_PATH = path.join(__dirname, 'test.wav');
const LANGUAGE_CODE = 'de-DE';
const SAMPLE_RATE_HERTZ = 16000;
const ENCODING = 'LINEAR16';
const CHUNK_SIZE = 4096; // Size of chunks to send in bytes

// -------------------------------------------------------------------

async function runStreamingTest() {
    console.log('--- Starting Google STREAMING Speech-to-Text API Test ---');

    // 1. Check for the audio file
    if (!fs.existsSync(AUDIO_FILE_PATH)) {
        console.error(`\n--- ERROR: Audio file not found at: ${AUDIO_FILE_PATH}`);
        return;
    }

    // 2. Create the API client
    const speechClient = new SpeechClient();
    console.log('[STREAM-TEST] Speech client created.');

    // 3. Create the API stream
    const recognizeStream = speechClient.streamingRecognize({
        config: {
            encoding: ENCODING,
            sampleRateHertz: SAMPLE_RATE_HERTZ,
            languageCode: LANGUAGE_CODE,
        },
        interimResults: false,
    })
    .on('error', (err) => {
        console.error('\n--- STREAMING API ERROR ---');
        console.error(err);
    })
    .on('data', (data) => {
        console.log('\n--- SUCCESS! API RESPONDED WITH DATA! ---');
        const transcription = data.results[0]?.alternatives[0]?.transcript;
        if (transcription) {
            console.log(`Transcription: ${transcription}`);
        } else {
            console.log('API responded, but no transcription was found.');
        }
    });

    console.log('[STREAM-TEST] API stream created. Reading and sending audio file in chunks...');

    // 4. Read the file and stream it in chunks
    const fileStream = fs.createReadStream(AUDIO_FILE_PATH);

    // We need to wait for the stream to open before writing.
    recognizeStream.on('writing', () => {
        console.log('[STREAM-TEST] Google stream is ready for writing.');
        
        // Let's manually chunk and send the file.
        // We skip the first 44 bytes which is the WAV header.
        const audioBuffer = fs.readFileSync(AUDIO_FILE_PATH);
        const rawAudio = audioBuffer.slice(44); // Get raw PCM data
        
        console.log(`[STREAM-TEST] Total raw audio size: ${rawAudio.length} bytes.`);
        
        let offset = 0;
        const sendChunk = () => {
            if (offset < rawAudio.length) {
                const chunk = rawAudio.slice(offset, offset + CHUNK_SIZE);
                recognizeStream.write(chunk);
                offset += CHUNK_SIZE;
                console.log(`[STREAM-TEST] Sent chunk, ${offset} of ${rawAudio.length} bytes.`);
                setTimeout(sendChunk, 100); // Simulate a small delay between chunks
            } else {
                // 5. Signal the end of the audio stream
                console.log('[STREAM-TEST] All chunks sent. Ending stream.');
                recognizeStream.end();
            }
        };
        sendChunk();
    });
}

runStreamingTest();