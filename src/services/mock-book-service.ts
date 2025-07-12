import { BookExtractionResult } from '../types';

/**
 * Mock service to demonstrate the complete book extraction flow
 * In production, this would use actual Amazon scraping or alternative APIs
 */
export class MockBookService {
  async extractBookWithMockData(
    title: string,
    author: string | undefined,
    isbn: string,
    bookType: 'fiction' | 'non-fiction'
  ): Promise<BookExtractionResult> {
    // Mock page content based on book type
    const mockPages = {
      fiction: {
        page1: `Chapter 1

The morning light filtered through the dusty windowpanes of the old bookshop, casting long shadows across the worn wooden floor. Sarah had always loved this time of day, when the world was still quiet and the books seemed to whisper their secrets.

She moved between the towering shelves, her fingers trailing along the spines of countless stories. Each book held a universe within its pages, waiting to be discovered. The familiar scent of aged paper and binding glue filled her nostrils, a perfume more intoxicating than any flower.

"Every book chooses its reader," her grandfather used to say. Today, she wondered which story would choose her.`,
        
        page2: `The bell above the door chimed softly, breaking the morning stillness. Sarah looked up from her inventory to see a stranger enter—tall, wearing a weathered coat that had seen better days. His eyes scanned the shop with an intensity that made her pause.

"Can I help you?" she asked, setting down her clipboard.

The stranger's gaze settled on her, and for a moment, she felt as if he could see straight through to her soul. "I'm looking for a book," he said, his voice carrying an accent she couldn't quite place. "A very particular book that I believe only you can help me find."

Sarah's heart quickened. In all her years working in the shop, she had never encountered someone who spoke with such certainty about the unknown.`
      },
      'non-fiction': {
        page1: `Introduction

In the rapidly evolving landscape of modern technology, understanding the fundamental principles that govern our digital world has never been more crucial. This book aims to demystify the complex systems that power our daily lives, from the smartphones in our pockets to the vast networks that connect us globally.

We will explore how these technologies emerged, examine their current applications, and consider their potential future impacts on society. Through clear explanations and real-world examples, readers will gain a comprehensive understanding of the digital revolution.

Chapter 1: The Foundation of Digital Systems

The story of modern computing begins not with computers, but with a simple question: How can we represent and manipulate information systematically?`,
        
        page2: `This question led to the development of binary systems, Boolean logic, and eventually, the transistor—the building block of all modern electronics. To understand where we are today, we must first understand these fundamental concepts.

1.1 Binary: The Language of Computers

At its core, every computer operates on a simple principle: the presence or absence of an electrical signal. This on/off state, represented as 1 or 0, forms the basis of binary code. While this may seem limiting, the combination of billions of these simple switches enables the incredible complexity we see in modern computing.

Consider this: every image you view, every song you hear, every word you type is ultimately reduced to a series of 1s and 0s. This elegant simplicity underlying apparent complexity is one of the most beautiful aspects of computer science.`
      }
    };

    const selectedPages = mockPages[bookType];
    const returnText = bookType === 'fiction' ? selectedPages.page2 : selectedPages.page1;

    return {
      success: true,
      text: returnText,
      bookType,
      title,
      author,
      isbn
    };
  }
}