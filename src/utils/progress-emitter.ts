import { EventEmitter } from 'events';

export interface ProgressUpdate {
  stage: 'book_detection' | 'volume_search' | 'volume_attempt' | 'page_capture' | 
         'content_analysis' | 'validation' | 'completed' | 'error';
  message: string;
  details?: {
    volumeNumber?: number;
    totalVolumes?: number;
    volumeTitle?: string;
    pageNumber?: number;
    totalPages?: number;
    confidence?: number;
    error?: string;
  };
  timestamp: Date;
}

export class ProgressEmitter extends EventEmitter {
  private updates: ProgressUpdate[] = [];

  emitProgress(update: Omit<ProgressUpdate, 'timestamp'>) {
    const fullUpdate: ProgressUpdate = {
      ...update,
      timestamp: new Date()
    };
    
    this.updates.push(fullUpdate);
    this.emit('progress', fullUpdate);
  }

  getUpdates(): ProgressUpdate[] {
    return this.updates;
  }

  clear() {
    this.updates = [];
  }
}