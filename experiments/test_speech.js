// test_speech.js
// A simple script to test the Google Speech-to-Text API with a local file.

const fs = require('fs');
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');

// --- CONFIGURATION ---
const AUDIO_FILE_PATH = path.join(__dirname, 'test.wav');
const LANGUAGE_CODE = 'de-DE';
const SAMPLE_RATE_HERTZ = 16000;
const ENCODING = 'LINEAR16';

// -------------------------------------------------------------------

async function runTest() {
    console.log('--- Starting Google Speech-to-Text API Test ---');

    // 1. Create a client
    const speechClient = new SpeechClient();
    console.log('[TEST] Speech client created.');

    // 2. Read the local audio file into a buffer
    if (!fs.existsSync(AUDIO_FILE_PATH)) {
        console.error(`\n--- ERROR ---`);
        console.error(`Audio file not found at: ${AUDIO_FILE_PATH}`);
        console.error('Please make sure you have downloaded "test-german.wav" and placed it in the same folder as this script.');
        return;
    }
    console.log(`[TEST] Reading audio file: ${AUDIO_FILE_PATH}`);
    const audioFileBuffer = fs.readFileSync(AUDIO_FILE_PATH);

    // 3. Convert the audio buffer to a base64 string (required for non-streaming recognition)
    const audioBytes = audioFileBuffer.toString('base64');
    console.log('[TEST] Audio file converted to base64.');

    // 4. Construct the API request
    const request = {
        config: {
            encoding: ENCODING,
            sampleRateHertz: SAMPLE_RATE_HERTZ,
            languageCode: LANGUAGE_CODE,
        },
        audio: {
            content: audioBytes,
        },
    };
    console.log('[TEST] Constructed API request. Sending to Google...');

    // 5. Call the API and handle the response
    try {
        const [response] = await speechClient.recognize(request);
        console.log('\n--- SUCCESS! ---');
        console.log('[TEST] Received a response from the Google Speech API.');

        if (response.results && response.results.length > 0) {
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
            console.log('\n--- TRANSCRIPTION ---');
            console.log(transcription);
            console.log('---------------------\n');
            console.log('CONCLUSION: Your setup (credentials, permissions, API) is working correctly!');
        } else {
            console.log('\n--- EMPTY RESPONSE ---');
            console.log('The API call was successful, but it returned no transcription.');
            console.log('This can sometimes happen, but with the test file, it should work.');
        }

    } catch (err) {
        console.error('\n--- API CALL FAILED ---');
        console.error('An error occurred while calling the Google Speech-to-Text API:');
        console.error(err);
        console.log('\nCONCLUSION: There is a problem with your project setup or credentials.');
    }
}

runTest();