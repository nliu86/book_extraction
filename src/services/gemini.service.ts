import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateContent(
    modelName: string,
    prompt: string,
    imageData?: { inlineData: { data: string; mimeType: string } }
  ) {
    const model = this.genAI.getGenerativeModel({ model: modelName });
    
    const contents = imageData 
      ? [{ text: prompt }, { inlineData: imageData.inlineData }]
      : [{ text: prompt }];
    
    const result = await model.generateContent(contents);
    const response = await result.response;
    
    return response.text();
  }

  async analyzeImage(modelName: string, prompt: string, imageBase64: string, mimeType: string = 'image/jpeg') {
    return this.generateContent(modelName, prompt, {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    });
  }

  async analyzeMultipleImages(
    modelName: string,
    prompt: string,
    imagesBase64: string[],
    mimeType: string = 'image/png'
  ) {
    const model = this.genAI.getGenerativeModel({ model: modelName });
    
    // Build content array with prompt and all images
    const contents: any[] = [{ text: prompt }];
    
    // Add each image to the content
    imagesBase64.forEach((imageBase64, index) => {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType
        }
      });
    });
    
    const result = await model.generateContent(contents);
    const response = await result.response;
    
    return response.text();
  }
}