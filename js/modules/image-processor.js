// Image Processor Module
// Image processing and memory optimization

export class ImageProcessor {
    constructor() {
        this.maxImageSize = 4096; // Maximum image size
        this.compressionQuality = 0.9;
    }
    
    // Load image file
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // Check image size
                    const processedData = this.processImageData(img);
                    resolve(processedData);
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    // Process image data
    processImageData(img) {
        // Limit image size
        const scale = Math.min(
            this.maxImageSize / img.width,
            this.maxImageSize / img.height,
            1
        );
        
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        return {
            width: width,
            height: height,
            imageElement: img,
            canvas: canvas,
            originalWidth: img.width,
            originalHeight: img.height,
            scale: scale
        };
    }
    
    // Resize image
    resizeImage(canvas, newWidth, newHeight) {
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        return resizedCanvas;
    }
    
    // Analyze image colors
    analyzeImageColors(imageData) {
        const data = imageData.data;
        const colorCounts = new Map();
        
        // Quantize colors and count
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 32) * 32;
            const g = Math.floor(data[i + 1] / 32) * 32;
            const b = Math.floor(data[i + 2] / 32) * 32;
            const key = `${r},${g},${b}`;
            
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
        
        // Generate statistics
        const totalPixels = data.length / 4;
        const uniqueColors = colorCounts.size;
        const dominantColors = this.extractDominantColors(colorCounts, totalPixels);
        
        return {
            totalPixels,
            uniqueColors,
            dominantColors,
            averageColor: this.calculateAverageColor(imageData)
        };
    }
    
    // Calculate average color
    calculateAverageColor(imageData) {
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
    extractDominantColors(colorCounts, totalPixels) {
        return Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return {
                    r, g, b,
                    count,
                    percentage: (count / totalPixels) * 100
                };
            });
    }
    
    // Reduce image quality (memory saving)
    reduceImageQuality(canvas, quality = 0.8) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Color quantization
        const data = imageData.data;
        const levels = Math.floor(16 * quality); // Quantization level based on quality
        const step = 256 / levels;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.floor(data[i] / step) * step;
            data[i + 1] = Math.floor(data[i + 1] / step) * step;
            data[i + 2] = Math.floor(data[i + 2] / step) * step;
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    // Convert image to DataURL
    canvasToDataURL(canvas, format = 'image/jpeg', quality = 0.9) {
        return canvas.toDataURL(format, quality);
    }
    
    // Convert image to Blob
    canvasToBlob(canvas, format = 'image/jpeg', quality = 0.9) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, format, quality);
        });
    }
    
    // Estimate memory usage
    estimateMemoryUsage(width, height, format = 'rgba') {
        const bytesPerPixel = format === 'rgba' ? 4 : 3;
        return width * height * bytesPerPixel;
    }
    
    // Cleanup image
    cleanup(imageData) {
        if (imageData.canvas) {
            const ctx = imageData.canvas.getContext('2d');
            ctx.clearRect(0, 0, imageData.canvas.width, imageData.canvas.height);
        }
        
        if (imageData.imageElement) {
            imageData.imageElement.src = '';
        }
    }
}