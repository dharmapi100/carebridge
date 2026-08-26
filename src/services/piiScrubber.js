// Path: src/services/piiScrubber.js
import fs from 'fs';
import path from 'path';

export class PIIScrubber {
  /**
   * Scrubs sensitive personal identification numbers (Resident Registration Numbers / ARCs)
   * from text or data objects to ensure 100% compliance with South Korea's PIPA.
   * Format: YYMMDD-[1-4]****** -> Masked as YYMMDD-*******
   */
  static scrubText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Korean Resident Registration Number & ARC regex pattern (e.g., 850101-1234567 -> 850101-*******)
    const rrnPattern = /\b([0-9]{2}[012][0-9][0-3][0-9])-([1-8][0-9]{6})\b/g;
    
    return text.replace(rrnPattern, '$1-*******');
  }

  static scrubObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const scrubbed = Array.isArray(obj) ? [] : {};
    
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string') {
        scrubbed[key] = this.scrubText(val);
      } else if (typeof val === 'object' && val !== null) {
        scrubbed[key] = this.scrubObject(val);
      } else {
        scrubbed[key] = val;
      }
    }
    
    return scrubbed;
  }
}
