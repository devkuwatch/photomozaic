// Image Viewer Module
// Image display with zoom and pan functionality

export class ImageViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        this.zoom = {
            level: 1.0,
            min: 0.1,
            max: 10.0,
            step: 0.2
        };
        
        this.pan = {
            x: 0,
            y: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };
        
        // For high-resolution mosaic display
        this.mosaicData = null;
        this.highResTiles = new Map(); // Cache
        this.isHighResMode = false;
        this.highResThreshold = 2.0; // High-res mode when zoom is 2x or higher
        
        this.eventListeners = new Map();
        this.animationFrameId = null;
        this.isInitialized = false;
    }
    
    // Initialize
    initialize(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.updateViewport();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('🖼️ Image viewer initialized');
    }
    
    // Set canvas
    setCanvas(canvasElement) {
        this.cleanup();
        this.initialize(canvasElement);
    }
    
    // Load image
    loadImage(imageData, mosaicMetadata = null) {
        // Save mosaic metadata
        this.mosaicData = mosaicMetadata;
        
        if (typeof imageData === 'string') {
            // In case of Data URL
            this.loadImageFromDataURL(imageData);
        } else if (imageData instanceof HTMLImageElement) {
            // In case of HTMLImageElement
            this.image = imageData;
            this.resetView();
            this.render();
        } else if (imageData instanceof ImageData) {
            // In case of ImageData
            this.loadImageFromImageData(imageData);
        }
    }
    
    // Load image from Data URL
    loadImageFromDataURL(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.resetView();
            this.render();
        };
        img.src = dataURL;
    }
    
    // Load image from ImageData
    loadImageFromImageData(imageData) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        this.image = tempCanvas;
        this.resetView();
        this.render();
    }
    
    // Update viewport
    updateViewport() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.viewport = {
            x: rect.left,
            y: rect.top,
            width: this.canvas.clientWidth,
            height: this.canvas.clientHeight
        };
        
        // Adjust actual canvas size
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.viewport.width * dpr;
        this.canvas.height = this.viewport.height * dpr;
        
        this.ctx.scale(dpr, dpr);
    }
    
    // Setup event listeners
    setupEventListeners() {
        if (!this.canvas) return;
        
        const events = {
            'mousedown': this.handleMouseDown.bind(this),
            'mousemove': this.handleMouseMove.bind(this),
            'mouseup': this.handleMouseUp.bind(this),
            'wheel': this.handleWheel.bind(this),
            'contextmenu': this.handleContextMenu.bind(this)
        };
        
        for (const [event, handler] of Object.entries(events)) {
            this.canvas.addEventListener(event, handler);
            this.eventListeners.set(event, handler);
        }
        
        // Window resize
        const resizeHandler = this.debounce(this.handleResize.bind(this), 300);
        window.addEventListener('resize', resizeHandler);
        this.eventListeners.set('resize', resizeHandler);
    }
    
    // Mouse down
    handleMouseDown(event) {
        if (!this.image) return;
        
        event.preventDefault();
        this.pan.isDragging = true;
        this.pan.lastX = event.clientX;
        this.pan.lastY = event.clientY;
        
        this.canvas.style.cursor = 'grabbing';
        
        // Record mouse cursor coordinates
        document.addEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
    }
    
    // Mouse move
    handleMouseMove(event) {
        if (!this.image) return;
        
        if (this.pan.isDragging) {
            const deltaX = event.clientX - this.pan.lastX;
            const deltaY = event.clientY - this.pan.lastY;
            
            this.pan.x += deltaX;
            this.pan.y += deltaY;
            
            this.pan.lastX = event.clientX;
            this.pan.lastY = event.clientY;
            
            this.render();
        }
    }
    
    // Mouse up
    handleMouseUp(event) {
        if (this.pan.isDragging) {
            this.pan.isDragging = false;
            this.canvas.style.cursor = 'grab';
            
            document.removeEventListener('mousemove', this.handleDocumentMouseMove);
            document.removeEventListener('mouseup', this.handleDocumentMouseUp);
        }
    }
    
    // Document mouse move
    handleDocumentMouseMove(event) {
        this.handleMouseMove(event);
    }
    
    // Document mouse up
    handleDocumentMouseUp(event) {
        this.handleMouseUp(event);
    }
    
    // Wheel
    handleWheel(event) {
        if (!this.image) return;
        
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoomAt(centerX, centerY, zoomFactor);
    }
    
    // Context menu
    handleContextMenu(event) {
        event.preventDefault();
    }
    
    // Resize
    handleResize() {
        this.updateViewport();
        this.render();
    }
    
    // Zoom at specified position
    zoomAt(x, y, factor) {
        const oldLevel = this.zoom.level;
        const newLevel = Math.max(this.zoom.min, Math.min(this.zoom.max, oldLevel * factor));
        
        if (newLevel !== oldLevel) {
            // Maintain zoom center
            const scaleFactor = newLevel / oldLevel;
            this.pan.x = x - (x - this.pan.x) * scaleFactor;
            this.pan.y = y - (y - this.pan.y) * scaleFactor;
            
            this.zoom.level = newLevel;
            
            // Check high-resolution mode switching
            this.checkHighResMode();
            
            this.render();
            this.updateZoomDisplay();
        }
    }
    
    // Zoom in
    zoomIn() {
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;
        this.zoomAt(centerX, centerY, 1 + this.zoom.step);
    }
    
    // Zoom out
    zoomOut() {
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;
        this.zoomAt(centerX, centerY, 1 - this.zoom.step);
    }
    
    // Actual size
    actualSize() {
        this.zoom.level = 1.0;
        this.centerImage();
        this.render();
        this.updateZoomDisplay();
    }
    
    // Fit to window
    fitToWindow() {
        if (!this.image) return;
        
        const imageWidth = this.image.width || this.image.naturalWidth;
        const imageHeight = this.image.height || this.image.naturalHeight;
        
        const scaleX = this.viewport.width / imageWidth;
        const scaleY = this.viewport.height / imageHeight;
        
        this.zoom.level = Math.min(scaleX, scaleY);
        this.centerImage();
        this.render();
        this.updateZoomDisplay();
    }
    
    // Center image
    centerImage() {
        if (!this.image) return;
        
        const imageWidth = this.image.width || this.image.naturalWidth;
        const imageHeight = this.image.height || this.image.naturalHeight;
        
        const scaledWidth = imageWidth * this.zoom.level;
        const scaledHeight = imageHeight * this.zoom.level;
        
        this.pan.x = (this.viewport.width - scaledWidth) / 2;
        this.pan.y = (this.viewport.height - scaledHeight) / 2;
    }
    
    // Reset view
    resetView() {
        this.zoom.level = 1.0;
        this.pan.x = 0;
        this.pan.y = 0;
        this.fitToWindow();
    }
    
    // Render image
    render() {
        if (!this.canvas || !this.ctx || !this.image) return;
        
        // Clear
        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
        
        if (this.isHighResMode && this.mosaicData) {
            // High-resolution mosaic rendering
            this.renderHighResMosaic();
        } else {
            // Standard rendering
            this.renderStandard();
        }
        
        // Update cursor
        this.updateCursor();
    }
    
    // Standard rendering
    renderStandard() {
        // Get image size
        const imageWidth = this.image.width || this.image.naturalWidth;
        const imageHeight = this.image.height || this.image.naturalHeight;
        
        // Calculate drawing position and size
        const drawWidth = imageWidth * this.zoom.level;
        const drawHeight = imageHeight * this.zoom.level;
        
        // Draw image
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = this.zoom.level < 1;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.ctx.drawImage(
            this.image,
            this.pan.x,
            this.pan.y,
            drawWidth,
            drawHeight
        );
        
        this.ctx.restore();
    }
    
    // High-resolution mosaic rendering
    renderHighResMosaic() {
        if (!this.mosaicData || !this.mosaicData.tileMap) return;
        
        const { gridInfo, tileMap } = this.mosaicData;
        const tileSize = gridInfo.tileSize * this.zoom.level;
        
        // Render only tiles within visible range
        const visibleBounds = this.getVisibleBounds();
        
        tileMap.forEach(tile => {
            const tileX = tile.x * gridInfo.tileSize;
            const tileY = tile.y * gridInfo.tileSize;
            
            // Check visible range
            if (tileX + gridInfo.tileSize < visibleBounds.left || 
                tileX > visibleBounds.right ||
                tileY + gridInfo.tileSize < visibleBounds.top || 
                tileY > visibleBounds.bottom) {
                return; // Outside visible range
            }
            
            // Render high-resolution tile
            this.renderHighResTile(tile, tileX, tileY, tileSize);
        });
    }
    
    // High-resolution tile rendering (with lazy loading)
    renderHighResTile(tile, x, y, size) {
        const cacheKey = `${tile.tile}_highres`;
        let tileCanvas = this.highResTiles.get(cacheKey);
        
        if (!tileCanvas && tile.tileMetadata) {
            // Create tile with lazy loading
            this.createHighResTileAsync(tile, cacheKey, size).then(() => {
                // Re-render after creation
                this.render();
            });
            
            // Temporarily display low-resolution tile
            this.renderTemporaryTile(tile, x, y, size);
            return;
        }
        
        if (tileCanvas) {
            // Convert to screen coordinates
            const screenX = x * this.zoom.level + this.pan.x;
            const screenY = y * this.zoom.level + this.pan.y;
            
            this.ctx.drawImage(tileCanvas, screenX, screenY, size, size);
        } else {
            // Display temporary tile if not in cache
            this.renderTemporaryTile(tile, x, y, size);
        }
    }
    
    // Asynchronous creation of high-resolution tiles
    async createHighResTileAsync(tile, cacheKey, size) {
        if (this.highResTiles.has(cacheKey)) return; // Already created
        
        try {
            // Create high-resolution tile canvas
            const tileCanvas = document.createElement('canvas');
            const tileSize = Math.max(size, 128); // Minimum 128px
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            
            const tileCtx = tileCanvas.getContext('2d');
            
            // Apply ImageData to canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 64;
            tempCanvas.height = 64;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(tile.tileMetadata.originalImageData, 0, 0);
            
            // Resize and draw to high-resolution canvas
            tileCtx.imageSmoothingEnabled = true;
            tileCtx.imageSmoothingQuality = 'high';
            tileCtx.drawImage(tempCanvas, 0, 0, tileSize, tileSize);
            
            // Memory optimization: cache size management
            this.manageHighResTileCache();
            
            this.highResTiles.set(cacheKey, tileCanvas);
            
        } catch (error) {
            console.warn('High-resolution tile creation error:', error);
        }
    }
    
    // Display temporary low-resolution tile
    renderTemporaryTile(tile, x, y, size) {
        // Fill with average color
        const color = tile.tileMetadata?.averageColor;
        if (color) {
            const screenX = x * this.zoom.level + this.pan.x;
            const screenY = y * this.zoom.level + this.pan.y;
            
            this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.ctx.fillRect(screenX, screenY, size, size);
            
            // Draw border
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(screenX, screenY, size, size);
        }
    }
    
    // High-resolution tile cache management
    manageHighResTileCache() {
        const maxCacheSize = 50; // Limit memory usage
        
        if (this.highResTiles.size >= maxCacheSize) {
            // Clear cache using LRU method
            const entriesToDelete = Math.floor(maxCacheSize * 0.3); // Delete 30%
            const keysToDelete = Array.from(this.highResTiles.keys()).slice(0, entriesToDelete);
            
            keysToDelete.forEach(key => this.highResTiles.delete(key));
            
            console.log(`🗑️ Deleted ${entriesToDelete} high-resolution tile cache entries (memory optimization)`);
        }
    }
    
    // Check high-resolution mode switching
    checkHighResMode() {
        const wasHighRes = this.isHighResMode;
        this.isHighResMode = this.zoom.level >= this.highResThreshold && !!this.mosaicData;
        
        if (wasHighRes !== this.isHighResMode) {
            console.log(`🔍 High-resolution mode: ${this.isHighResMode ? 'ON' : 'OFF'} (Zoom: ${this.zoom.level.toFixed(1)}x)`);
            
            if (!this.isHighResMode) {
                // Clear cache when returning to low-resolution mode
                this.highResTiles.clear();
            }
        }
    }
    
    // Update cursor
    updateCursor() {
        if (!this.canvas) return;
        
        if (this.pan.isDragging) {
            this.canvas.style.cursor = 'grabbing';
        } else if (this.image) {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    // Update zoom display
    updateZoomDisplay() {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoom.level * 100)}%`;
        }
    }
    
    // Get image information
    getImageInfo() {
        if (!this.image) return null;
        
        const imageWidth = this.image.width || this.image.naturalWidth;
        const imageHeight = this.image.height || this.image.naturalHeight;
        
        return {
            width: imageWidth,
            height: imageHeight,
            aspectRatio: imageWidth / imageHeight,
            zoomLevel: this.zoom.level,
            panX: this.pan.x,
            panY: this.pan.y
        };
    }
    
    // Get visible bounds
    getVisibleBounds() {
        if (!this.image) return null;
        
        const imageWidth = this.image.width || this.image.naturalWidth;
        const imageHeight = this.image.height || this.image.naturalHeight;
        
        const scaledWidth = imageWidth * this.zoom.level;
        const scaledHeight = imageHeight * this.zoom.level;
        
        return {
            left: -this.pan.x / this.zoom.level,
            top: -this.pan.y / this.zoom.level,
            right: (-this.pan.x + this.viewport.width) / this.zoom.level,
            bottom: (-this.pan.y + this.viewport.height) / this.zoom.level,
            width: this.viewport.width / this.zoom.level,
            height: this.viewport.height / this.zoom.level
        };
    }
    
    // Screenshot
    takeScreenshot() {
        if (!this.canvas) return null;
        
        return this.canvas.toDataURL('image/png');
    }
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Statistics
    getStatistics() {
        const info = this.getImageInfo();
        const bounds = this.getVisibleBounds();
        
        return {
            isInitialized: this.isInitialized,
            hasImage: !!this.image,
            imageInfo: info,
            visibleBounds: bounds,
            viewport: this.viewport,
            zoom: this.zoom,
            pan: this.pan
        };
    }
    
    // Cleanup
    cleanup() {
        // Stop animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        if (this.canvas) {
            for (const [event, handler] of this.eventListeners) {
                if (event === 'resize') {
                    window.removeEventListener(event, handler);
                } else {
                    this.canvas.removeEventListener(event, handler);
                }
            }
        }
        
        // Remove document event listeners
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
        document.removeEventListener('mouseup', this.handleDocumentMouseUp);
        
        this.eventListeners.clear();
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.isInitialized = false;
        
        console.log('🖼️ Image viewer cleaned up');
    }
}