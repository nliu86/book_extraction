import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

export class GeminiService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateContent(
    modelName: string,
    prompt: string,
    imageData?: { inlineData: { data: string; mimeType: string } }
  ) {
    const contents = imageData 
      ? [{ text: prompt }, { inlineData: imageData.inlineData }]
      : prompt;
    
    const result = await this.genAI.models.generateContent({
      model: modelName,
      contents
    });
    
    return result.text;
  }

  async analyzeImage(modelName: string, prompt: string, imageBase64: string, mimeType: string = 'image/jpeg') {
    return this.generateContent(modelName, prompt, {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    });
  }
}