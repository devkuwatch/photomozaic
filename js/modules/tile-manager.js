// Tile Manager Module
// Tile image management and metadata processing

export class TileManager {
    constructor() {
        this.tileMetadata = new Map();
        this.tileCache = new Map();
        this.maxCacheSize = 100;
        this.thumbnailSize = 64;
    }
    
    // Extract metadata from tile images
    async extractMetadata(file) {
        const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
        
        if (this.tileMetadata.has(cacheKey)) {
            return this.tileMetadata.get(cacheKey);
        }
        
        try {
            const metadata = await this.processTileFile(file);
            this.tileMetadata.set(cacheKey, metadata);
            return metadata;
        } catch (error) {
            console.warn('Failed to extract metadata for:', file.name, error);
            return null;
        }
    }
    
    // Process tile file
    async processTileFile(file) {
        const img = await this.loadImageFromFile(file);
        const thumbnail = await this.createThumbnail(img);
        
        const metadata = {
            filename: file.name,
            size: file.size,
            lastModified: file.lastModified,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            averageColor: this.calculateAverageColor(thumbnail),
            dominantColors: this.extractDominantColors(thumbnail),
            brightness: this.calculateBrightness(thumbnail),
            contrast: this.calculateContrast(thumbnail),
            thumbnail: thumbnail
        };
        
        return metadata;
    }
    
    // Load image from file
    async loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                    resolve(img);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(img.src);
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
    
    // Generate thumbnail
    async createThumbnail(img) {
        const canvas = document.createElement('canvas');
        canvas.width = this.thumbnailSize;
        canvas.height = this.thumbnailSize;
        
        const ctx = canvas.getContext('2d');
        
        // Resize while maintaining aspect ratio
        const scale = Math.min(
            this.thumbnailSize / img.width,
            this.thumbnailSize / img.height
        );
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (this.thumbnailSize - scaledWidth) / 2;
        const offsetY = (this.thumbnailSize - scaledHeight) / 2;
        
        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.thumbnailSize, this.thumbnailSize);
        
        // Draw image
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        return ctx.getImageData(0, 0, this.thumbnailSize, this.thumbnailSize);
    }
    
    // Calculate average color
    calculateAverageColor(imageData) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            // Check transparency
            if (data[i + 3] > 0) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
        }
        
        return count > 0 ? {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        } : { r: 255, g: 255, b: 255 };
    }
    
    // Extract dominant colors
    extractDominantColors(imageData) {
        const data = imageData.data;
        const colorCounts = new Map();
        
        // Quantize colors and count
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // If not transparent
                const r = Math.floor(data[i] / 32) * 32;
                const g = Math.floor(data[i + 1] / 32) * 32;
                const b = Math.floor(data[i + 2] / 32) * 32;
                const key = `${r},${g},${b}`;
                
                colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
            }
        }
        
        // Get top 3 colors
        return Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b, count };
            });
    }
    
    // Calculate brightness
    calculateBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                // Luminance calculation (ITU-R BT.709)
                const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                totalBrightness += brightness;
                count++;
            }
        }
        
        return count > 0 ? totalBrightness / count : 0;
    }
    
    // Calculate contrast
    calculateContrast(imageData) {
        const data = imageData.data;
        const brightness = this.calculateBrightness(imageData);
        let variance = 0;
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                const pixelBrightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                variance += Math.pow(pixelBrightness - brightness, 2);
                count++;
            }
        }
        
        return count > 0 ? Math.sqrt(variance / count) : 0;
    }
    
    // Calculate color distance
    calculateColorDistance(color1, color2) {
        const deltaR = color1.r - color2.r;
        const deltaG = color1.g - color2.g;
        const deltaB = color1.b - color2.b;
        
        // Weighted Euclidean distance
        return Math.sqrt(
            2 * deltaR * deltaR +
            4 * deltaG * deltaG +
            3 * deltaB * deltaB
        );
    }
    
    // Search for optimal tiles
    findBestMatches(targetColor, tileMetadataArray, maxResults = 5) {
        const matches = tileMetadataArray.map(metadata => ({
            metadata,
            distance: this.calculateColorDistance(targetColor, metadata.averageColor)
        }));
        
        return matches
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxResults)
            .map(match => match.metadata);
    }
    
    // Get tile image from cache
    async getTileImage(metadata, size = 64) {
        const cacheKey = `${metadata.filename}_${size}`;
        
        if (this.tileCache.has(cacheKey)) {
            return this.tileCache.get(cacheKey);
        }
        
        // Generate if not in cache
        const tileImage = await this.generateTileImage(metadata, size);
        
        // Save to cache
        this.manageTileCache(cacheKey, tileImage);
        
        return tileImage;
    }
    
    // Generate tile image
    async generateTileImage(metadata, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Resize thumbnail
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.thumbnailSize;
        tempCanvas.height = this.thumbnailSize;
        
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(metadata.thumbnail, 0, 0);
        
        // Draw to specified size
        ctx.drawImage(tempCanvas, 0, 0, size, size);
        
        return canvas;
    }
    
    // Manage cache
    manageTileCache(key, value) {
        if (this.tileCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.tileCache.keys().next().value;
            this.tileCache.delete(firstKey);
        }
        
        this.tileCache.set(key, value);
    }
    
    // Get metadata
    getMetadata(filename) {
        for (const [key, metadata] of this.tileMetadata) {
            if (metadata.filename === filename) {
                return metadata;
            }
        }
        return null;
    }
    
    // Get all metadata
    getAllMetadata() {
        return Array.from(this.tileMetadata.values());
    }
    
    // Get statistics
    getStatistics() {
        const metadata = this.getAllMetadata();
        
        if (metadata.length === 0) {
            return null;
        }
        
        const totalSize = metadata.reduce((sum, m) => sum + m.size, 0);
        const avgBrightness = metadata.reduce((sum, m) => sum + m.brightness, 0) / metadata.length;
        const avgContrast = metadata.reduce((sum, m) => sum + m.contrast, 0) / metadata.length;
        
        return {
            totalTiles: metadata.length,
            totalSize: totalSize,
            averageBrightness: avgBrightness,
            averageContrast: avgContrast,
            cacheSize: this.tileCache.size
        };
    }
    
    // Cleanup
    cleanup() {
        this.tileMetadata.clear();
        this.tileCache.clear();
    }
}