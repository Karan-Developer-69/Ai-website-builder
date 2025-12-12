import { Blob } from '@google/genai';

// Convert base64 string to raw bytes
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert float32 audio data to 16-bit PCM base64 string
// Gemini expects 16kHz sample rate. 
export function float32To16BitPCMBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Create a Blob format expected by Gemini Live API
export function createAudioBlob(data: Float32Array): Blob {
  return {
    data: float32To16BitPCMBase64(data),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Decode raw PCM data (from Gemini) into an AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Resamples audio buffer to target sample rate.
 * Simple linear interpolation for real-time streams where quality loss is acceptable for speech.
 */
export function resampleAudio(audioData: Float32Array, oldSampleRate: number, newSampleRate: number): Float32Array {
  if (oldSampleRate === newSampleRate) return audioData;
  const ratio = oldSampleRate / newSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index1 = Math.floor(originalIndex);
    const index2 = Math.ceil(originalIndex);
    const fraction = originalIndex - index1;
    
    // Check bounds
    const val1 = audioData[index1] || 0;
    const val2 = audioData[index2] || val1;
    
    result[i] = val1 + (val2 - val1) * fraction;
  }
  return result;
}