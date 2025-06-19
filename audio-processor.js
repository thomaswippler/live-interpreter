class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.volume = 0;
    this.smoothingFactor = 0.95; // Helps to smooth out the volume readings
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input[0];

    let sum = 0;
    for (let i = 0; i < channel.length; i++) {
        sum += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sum / channel.length);
    // Smooth the volume to make the indicator less flickery
    this.volume = Math.max(rms, this.volume * this.smoothingFactor);


    const int16Buffer = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      int16Buffer[i] = Math.max(-1, Math.min(1, channel[i])) * 32767;
    }

    this.port.postMessage({
        audio: int16Buffer.buffer,
        volume: this.volume 
    }, [int16Buffer.buffer]); // Transfer the audio buffer to avoid copying

    return true; // Keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);