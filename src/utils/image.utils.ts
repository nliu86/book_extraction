import sharp from 'sharp';

export class ImageUtils {
  static async processImage(buffer: Buffer): Promise<{
    base64: string;
    mimeType: string;
  }> {
    try {
      // Process image with sharp to ensure it's in a valid format
      const processedBuffer = await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      const base64 = processedBuffer.toString('base64');
      
      return {
        base64,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  static async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Check if it's a valid image
      if (!metadata.width || !metadata.height) {
        return false;
      }

      // Check minimum dimensions
      if (metadata.width < 100 || metadata.height < 100) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating image:', error);
      return false;
    }
  }
}