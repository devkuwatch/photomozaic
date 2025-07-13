// Memory Utilities for PhotoMosaic Worker
// Memory efficiency utilities

// LRU Cache implementation
class LRUCache {
    constructor(maxSize = 100, maxMemory = 64 * 1024 * 1024) {
        this.maxSize = maxSize;
        this.maxMemory = maxMemory;
        this.cache = new Map();
        this.currentMemory = 0;
    }
    
    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            // Update LRU
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    
    set(key, value) {
        const memorySize = this.estimateMemorySize(value);
        
        // Check memory limit
        while (this.currentMemory + memorySize > this.maxMemory || 
               this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        // Update existing value
        if (this.cache.has(key)) {
            const oldValue = this.cache.get(key);
            this.currentMemory -= this.estimateMemorySize(oldValue);
            this.cache.delete(key);
        }
        
        this.cache.set(key, value);
        this.currentMemory += memorySize;
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    delete(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.currentMemory -= this.estimateMemorySize(value);
            this.cache.delete(key);
            return true;
        }
        return false;
    }
    
    clear() {
        this.cache.clear();
        this.currentMemory = 0;
    }
    
    evictLRU() {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.delete(firstKey);
        }
    }
    
    estimateMemorySize(value) {
        if (value instanceof OffscreenCanvas) {
            return value.width * value.height * 4; // RGBA
        }
        if (value instanceof ImageData) {
            return value.data.length;
        }
        if (value instanceof Uint16Array) {
            return value.length * 2;
        }
        if (value instanceof Uint8Array) {
            return value.length;
        }
        return 1024; // Default estimate
    }
    
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            memoryUsage: this.currentMemory,
            maxMemory: this.maxMemory,
            memoryRatio: this.currentMemory / this.maxMemory
        };
    }
}

// Image data compression utilities
class ImageDataCompressor {
    
    // Compress to RGB565 format
    static compressRGB565(imageData) {
        const compressed = new Uint16Array(imageData.data.length / 4);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 8);     // 5bit
            const g = Math.floor(data[i + 1] / 4); // 6bit
            const b = Math.floor(data[i + 2] / 8); // 5bit
            compressed[i / 4] = (r << 11) | (g << 5) | b;
        }
        
        return compressed;
    }
    
    // Decompress from RGB565 format
    static decompressRGB565(compressed, width, height) {
        const imageData = new ImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < compressed.length; i++) {
            const pixel = compressed[i];
            const r = (pixel >> 11) * 8;
            const g = ((pixel >> 5) & 0x3F) * 4;
            const b = (pixel & 0x1F) * 8;
            
            data[i * 4] = r;
            data[i * 4 + 1] = g;
            data[i * 4 + 2] = b;
            data[i * 4 + 3] = 255;
        }
        
        return imageData;
    }
    
    // Color quantization (memory saving)
    static quantizeColors(imageData, levels = 16) {
        const data = imageData.data;
        const step = 256 / levels;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.floor(data[i] / step) * step;     // R
            data[i + 1] = Math.floor(data[i + 1] / step) * step; // G
            data[i + 2] = Math.floor(data[i + 2] / step) * step; // B
        }
        
        return imageData;
    }
    
    // Generate thumbnail
    static createThumbnail(imageData, maxSize = 64) {
        const scale = Math.min(maxSize / imageData.width, maxSize / imageData.height);
        const newWidth = Math.floor(imageData.width * scale);
        const newHeight = Math.floor(imageData.height * scale);
        
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvas.getContext('2d');
        
        // Draw original image to temporary canvas
        const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Resize
        ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
        
        return ctx.getImageData(0, 0, newWidth, newHeight);
    }
}

// Color calculation utilities
class ColorUtils {
    
    // RGB to LAB 変換（高精度版）
    static rgbToLab(r, g, b) {
        // sRGB to XYZ
        let rNorm = r / 255;
        let gNorm = g / 255;
        let bNorm = b / 255;
        
        // Gamma correction
        rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
        gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
        bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;
        
        // sRGB to XYZ (D65/2°)
        let x = rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375;
        let y = rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750;
        let z = rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041;
        
        // XYZ to LAB
        const xn = 0.95047, yn = 1.00000, zn = 1.08883; // D65
        
        x = x / xn;
        y = y / yn;
        z = z / zn;
        
        const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
        const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
        const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
        
        const l = 116 * fy - 16;
        const a = 500 * (fx - fy);
        const bLab = 200 * (fy - fz);
        
        return { l, a, b: bLab };
    }
    
    // RGB to LAB 変換（高速版）
    static rgbToLabFast(r, g, b) {
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        // Simple approximation
        const l = 0.299 * rNorm + 0.587 * gNorm + 0.114 * bNorm;
        const a = 0.5 * (rNorm - gNorm);
        const bVal = 0.5 * (gNorm - bNorm);
        
        return {
            l: l * 100,
            a: a * 100,
            b: bVal * 100
        };
    }
    
    // CIE Delta E 2000 色差計算
    static deltaE2000(lab1, lab2) {
        const l1 = lab1.l, a1 = lab1.a, b1 = lab1.b;
        const l2 = lab2.l, a2 = lab2.a, b2 = lab2.b;
        
        const deltaL = l2 - l1;
        const lBar = (l1 + l2) / 2;
        
        const c1 = Math.sqrt(a1 * a1 + b1 * b1);
        const c2 = Math.sqrt(a2 * a2 + b2 * b2);
        const cBar = (c1 + c2) / 2;
        
        const a1Prime = a1 + (a1 / 2) * (1 - Math.sqrt(Math.pow(cBar, 7) / (Math.pow(cBar, 7) + Math.pow(25, 7))));
        const a2Prime = a2 + (a2 / 2) * (1 - Math.sqrt(Math.pow(cBar, 7) / (Math.pow(cBar, 7) + Math.pow(25, 7))));
        
        const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
        const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
        const cBarPrime = (c1Prime + c2Prime) / 2;
        const deltaCPrime = c2Prime - c1Prime;
        
        const h1Prime = Math.atan2(b1, a1Prime) * 180 / Math.PI;
        const h2Prime = Math.atan2(b2, a2Prime) * 180 / Math.PI;
        
        let deltaHPrime = h2Prime - h1Prime;
        if (Math.abs(deltaHPrime) > 180) {
            deltaHPrime = deltaHPrime > 0 ? deltaHPrime - 360 : deltaHPrime + 360;
        }
        
        const deltaHPrimeRad = deltaHPrime * Math.PI / 180;
        const deltaH = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrimeRad / 2);
        
        const hBarPrime = Math.abs(h1Prime - h2Prime) <= 180 ? (h1Prime + h2Prime) / 2 : (h1Prime + h2Prime + 360) / 2;
        
        const t = 1 - 0.17 * Math.cos((hBarPrime - 30) * Math.PI / 180) +
                  0.24 * Math.cos(2 * hBarPrime * Math.PI / 180) +
                  0.32 * Math.cos((3 * hBarPrime + 6) * Math.PI / 180) -
                  0.20 * Math.cos((4 * hBarPrime - 63) * Math.PI / 180);
        
        const deltaRo = 30 * Math.exp(-Math.pow((hBarPrime - 275) / 25, 2));
        const rc = 2 * Math.sqrt(Math.pow(cBarPrime, 7) / (Math.pow(cBarPrime, 7) + Math.pow(25, 7)));
        const sl = 1 + ((0.015 * Math.pow(lBar - 50, 2)) / Math.sqrt(20 + Math.pow(lBar - 50, 2)));
        const sc = 1 + 0.045 * cBarPrime;
        const sh = 1 + 0.015 * cBarPrime * t;
        const rt = -Math.sin(2 * deltaRo * Math.PI / 180) * rc;
        
        const deltaE = Math.sqrt(
            Math.pow(deltaL / sl, 2) +
            Math.pow(deltaCPrime / sc, 2) +
            Math.pow(deltaH / sh, 2) +
            rt * (deltaCPrime / sc) * (deltaH / sh)
        );
        
        return deltaE;
    }
    
    // Fast color difference calculation (RGB space)
    static deltaEFast(rgb1, rgb2) {
        const deltaR = rgb1.r - rgb2.r;
        const deltaG = rgb1.g - rgb2.g;
        const deltaB = rgb1.b - rgb2.b;
        
        // Weighted Euclidean distance
        return Math.sqrt(
            2 * deltaR * deltaR +
            4 * deltaG * deltaG +
            3 * deltaB * deltaB
        );
    }
    
    // Calculate average color of image
    static calculateAverageColor(imageData) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        
        return {
            r: Math.round(r / pixelCount),
            g: Math.round(g / pixelCount),
            b: Math.round(b / pixelCount)
        };
    }
    
    // Extract dominant colors
    static extractDominantColors(imageData, maxColors = 3) {
        const data = imageData.data;
        const colorCounts = new Map();
        
        // Quantize color and count
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 32) * 32;
            const g = Math.floor(data[i + 1] / 32) * 32;
            const b = Math.floor(data[i + 2] / 32) * 32;
            const key = `${r},${g},${b}`;
            
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
        
        // Extract top colors
        return Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { 
                    r, g, b, 
                    weight: count / (data.length / 4)
                };
            });
    }
}

// Memory monitoring utilities
class MemoryMonitor {
    constructor() {
        this.maxMemory = 512 * 1024 * 1024; // 512MB
        this.warningThreshold = 0.8;
        this.criticalThreshold = 0.9;
        this.monitoringInterval = null;
        this.callbacks = [];
    }
    
    startMonitoring(intervalMs = 1000) {
        this.monitoringInterval = setInterval(() => {
            this.checkMemory();
        }, intervalMs);
    }
    
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    checkMemory() {
        const usage = this.getMemoryUsage();
        const status = this.getMemoryStatus(usage);
        
        this.callbacks.forEach(callback => {
            callback(usage, status);
        });
        
        return { usage, status };
    }
    
    getMemoryUsage() {
        // Simple estimation as performance.memory may not be available in Workers
        return this.estimateMemoryUsage();
    }
    
    estimateMemoryUsage() {
        // Basic estimate (may differ from actual usage)
        return 64 * 1024 * 1024; // Estimated as 64MB
    }
    
    getMemoryStatus(usage) {
        const ratio = usage / this.maxMemory;
        
        if (ratio > this.criticalThreshold) {
            return 'critical';
        } else if (ratio > this.warningThreshold) {
            return 'warning';
        } else {
            return 'normal';
        }
    }
    
    addCallback(callback) {
        this.callbacks.push(callback);
    }
    
    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }
}

// Export as global functions
if (typeof self !== 'undefined') {
    self.LRUCache = LRUCache;
    self.ImageDataCompressor = ImageDataCompressor;
    self.ColorUtils = ColorUtils;
    self.MemoryMonitor = MemoryMonitor;
}

// Export as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LRUCache,
        ImageDataCompressor,
        ColorUtils,
        MemoryMonitor
    };
}