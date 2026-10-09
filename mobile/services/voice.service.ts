import { Platform } from 'react-native';
import api from './api';
import { Product } from '../types';

export interface VoiceSearchResult {
  transcript: string;
  language?: string | null;
  query: string;
  reply: string;
  products: Product[];
}

function guessMime(uri: string): { name: string; type: string } {
  const ext = (uri.split('?')[0].split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'm4a':
      return { name: 'recording.m4a', type: 'audio/m4a' };
    case 'mp4':
      return { name: 'recording.mp4', type: 'audio/mp4' };
    case 'wav':
      return { name: 'recording.wav', type: 'audio/wav' };
    case '3gp':
      return { name: 'recording.3gp', type: 'audio/3gpp' };
    case 'webm':
    default:
      return { name: 'recording.webm', type: 'audio/webm' };
  }
}

async function buildAudioForm(uri: string): Promise<FormData> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const type = blob.type || 'audio/webm';
    const ext = type.includes('wav') ? 'wav' : type.includes('mp4') ? 'm4a' : 'webm';
    form.append('audio', blob, `recording.${ext}`);
    return form;
  }

  const { name, type } = guessMime(uri);
  form.append('audio', { uri, name, type } as unknown as Blob);
  return form;
}

export const voiceService = {
  async search(uri: string, language?: string): Promise<VoiceSearchResult> {
    const form = await buildAudioForm(uri);
    if (language) form.append('language', language);

    const { data } = await api.post<VoiceSearchResult>('/api/search/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  },

  async searchText(query: string): Promise<VoiceSearchResult> {
    const { data } = await api.post<VoiceSearchResult>('/api/search/query', { query });
    return data;
  },
};

export default voiceService;
