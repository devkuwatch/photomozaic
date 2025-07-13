// UI Controller Module
// User interface control

export class UIController {
    constructor() {
        this.elements = {};
        this.state = {
            isProcessing: false,
            currentView: 'main',
            zoomLevel: 1.0,
            isDragging: false
        };
        this.eventListeners = new Map();
        this.animationFrameId = null;
    }
    
    // Initialize
    initialize() {
        this.cacheElements();
        this.setupEventListeners();
        this.initializeAnimations();
        console.log('🎨 UI Controller initialized');
    }
    
    // Cache DOM elements
    cacheElements() {
        const elementIds = [
            'source-file', 'tile-files', 'generate-btn',
            'grid-size', 'tile-size', 'quality-setting', 'color-matching',
            'source-preview', 'tile-preview-grid', 'result-canvas',
            'progress-overlay', 'progress-fill', 'progress-text',
            'zoom-in', 'zoom-out', 'fit-window', 'actual-size',
            'memory-usage', 'tile-count', 'notification'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }
    
    // Set up event listeners
    setupEventListeners() {
        // File drop support
        this.setupDropZone();
        
        // Responsive support
        this.setupResponsiveHandlers();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Touch event support
        this.setupTouchEvents();
    }
    
    // Set up drop zone
    setupDropZone() {
        const dropZones = document.querySelectorAll('.file-label');
        
        dropZones.forEach(zone => {
            this.addEventListeners(zone, {
                'dragover': this.handleDragOver.bind(this),
                'dragleave': this.handleDragLeave.bind(this),
                'drop': this.handleDrop.bind(this)
            });
        });
    }
    
    // Drag over handler
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }
    
    // Drag leave handler
    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }
    
    // Drop handler
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(event.dataTransfer.files);
        const input = event.currentTarget.querySelector('input[type="file"]') || 
                     event.currentTarget.previousElementSibling;
        
        if (input && files.length > 0) {
            // Create FileList object
            const dt = new DataTransfer();
            files.forEach(file => dt.items.add(file));
            input.files = dt.files;
            
            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    // Responsive handler
    setupResponsiveHandlers() {
        this.addEventListeners(window, {
            'resize': this.debounce(this.handleResize.bind(this), 300)
        });
    }
    
    // Resize handler
    handleResize() {
        this.updateLayout();
        this.adjustCanvasSizes();
    }
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        this.addEventListeners(document, {
            'keydown': this.handleKeyDown.bind(this)
        });
    }
    
    // Key down handler
    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'o':
                    event.preventDefault();
                    this.elements['source-file'].click();
                    break;
                case 's':
                    event.preventDefault();
                    this.downloadResult();
                    break;
                case 'g':
                    event.preventDefault();
                    if (!this.state.isProcessing) {
                        this.elements['generate-btn'].click();
                    }
                    break;
            }
        }
        
        switch (event.key) {
            case 'Escape':
                this.hideNotification();
                break;
            case 'F11':
                event.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }
    
    // Touch events
    setupTouchEvents() {
        const canvas = this.elements['result-canvas'];
        if (canvas) {
            this.addEventListeners(canvas, {
                'touchstart': this.handleTouchStart.bind(this),
                'touchmove': this.handleTouchMove.bind(this),
                'touchend': this.handleTouchEnd.bind(this)
            });
        }
    }
    
    // Touch start
    handleTouchStart(event) {
        event.preventDefault();
        this.state.isDragging = true;
        
        const touch = event.touches[0];
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
    }
    
    // Touch move
    handleTouchMove(event) {
        if (!this.state.isDragging) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        
        this.panCanvas(deltaX, deltaY);
        
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
    }
    
    // Touch end
    handleTouchEnd(event) {
        event.preventDefault();
        this.state.isDragging = false;
    }
    
    // Initialize animations
    initializeAnimations() {
        this.startAnimationLoop();
    }
    
    // Animation loop
    startAnimationLoop() {
        const animate = () => {
            this.updateAnimations();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    // Update animations
    updateAnimations() {
        // Progress bar animation
        this.animateProgressBar();
        
        // Update memory usage display
        this.updateMemoryDisplay();
        
        // Smooth transitions
        this.updateTransitions();
    }
    
    // Progress bar animation
    animateProgressBar() {
        const progressFill = this.elements['progress-fill'];
        if (progressFill && progressFill.style.width) {
            // Smooth progress update
            const currentWidth = parseFloat(progressFill.style.width) || 0;
            const targetWidth = parseFloat(progressFill.dataset.targetWidth) || 0;
            
            if (Math.abs(currentWidth - targetWidth) > 0.1) {
                const newWidth = currentWidth + (targetWidth - currentWidth) * 0.1;
                progressFill.style.width = `${newWidth}%`;
            }
        }
    }
    
    // Update memory display
    updateMemoryDisplay() {
        const memoryElement = this.elements['memory-usage'];
        if (memoryElement && memoryElement.dataset.targetValue) {
            const targetValue = memoryElement.dataset.targetValue;
            if (memoryElement.textContent !== targetValue) {
                memoryElement.textContent = targetValue;
            }
        }
    }
    
    // Update transitions
    updateTransitions() {
        // Implement as needed
    }
    
    // Update layout
    updateLayout() {
        const width = window.innerWidth;
        
        // Mobile support
        if (width < 768) {
            document.body.classList.add('mobile');
            this.adjustMobileLayout();
        } else {
            document.body.classList.remove('mobile');
            this.adjustDesktopLayout();
        }
    }
    
    // Adjust mobile layout
    adjustMobileLayout() {
        const fileContainer = document.querySelector('.file-container');
        if (fileContainer) {
            fileContainer.style.gridTemplateColumns = '1fr';
        }
    }
    
    // Adjust desktop layout
    adjustDesktopLayout() {
        const fileContainer = document.querySelector('.file-container');
        if (fileContainer) {
            fileContainer.style.gridTemplateColumns = '1fr 1fr';
        }
    }
    
    // Adjust canvas sizes
    adjustCanvasSizes() {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.classList.contains('preview-canvas')) {
                this.adjustPreviewCanvasSize(canvas);
            }
        });
    }
    
    // Adjust preview canvas size
    adjustPreviewCanvasSize(canvas) {
        const container = canvas.parentElement;
        if (container) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            if (containerWidth > 0 && containerHeight > 0) {
                const scale = Math.min(
                    containerWidth / canvas.width,
                    containerHeight / canvas.height
                );
                
                canvas.style.width = `${canvas.width * scale}px`;
                canvas.style.height = `${canvas.height * scale}px`;
            }
        }
    }
    
    // Canvas pan
    panCanvas(deltaX, deltaY) {
        const canvas = this.elements['result-canvas'];
        if (canvas) {
            const currentTransform = canvas.style.transform || '';
            const matches = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            
            let currentX = matches ? parseFloat(matches[1]) : 0;
            let currentY = matches ? parseFloat(matches[2]) : 0;
            
            currentX += deltaX;
            currentY += deltaY;
            
            canvas.style.transform = `translate(${currentX}px, ${currentY}px) scale(${this.state.zoomLevel})`;
        }
    }
    
    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
        const notification = this.elements['notification'];
        if (!notification) return;
        
        const iconElement = notification.querySelector('.notification-icon');
        const textElement = notification.querySelector('.notification-text');
        
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        if (iconElement) iconElement.textContent = icons[type] || icons.info;
        if (textElement) textElement.textContent = message;
        
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Auto hide
        setTimeout(() => {
            this.hideNotification();
        }, duration);
    }
    
    // Hide notification
    hideNotification() {
        const notification = this.elements['notification'];
        if (notification) {
            notification.style.display = 'none';
        }
    }
    
    // Toggle fullscreen
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
    
    // Download result
    downloadResult() {
        const canvas = this.elements['result-canvas'];
        if (canvas && canvas.width > 0) {
            const link = document.createElement('a');
            link.download = `mosaic-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    }
    
    // Set processing state
    setProcessingState(isProcessing) {
        this.state.isProcessing = isProcessing;
        
        const generateBtn = this.elements['generate-btn'];
        if (generateBtn) {
            generateBtn.disabled = isProcessing;
            generateBtn.textContent = isProcessing ? 'Processing...' : 'Generate Mosaic';
        }
        
        document.body.classList.toggle('processing', isProcessing);
    }
    
    // Update progress
    updateProgress(progress, text = '') {
        const progressFill = this.elements['progress-fill'];
        const progressText = this.elements['progress-text'];
        
        if (progressFill) {
            progressFill.dataset.targetWidth = progress;
        }
        
        if (progressText) {
            progressText.textContent = text || `${Math.round(progress)}%`;
        }
    }
    
    // Add event listeners (with management)
    addEventListeners(element, events) {
        const listeners = [];
        
        for (const [event, handler] of Object.entries(events)) {
            element.addEventListener(event, handler);
            listeners.push({ element, event, handler });
        }
        
        this.eventListeners.set(element, listeners);
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
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Cleanup
    cleanup() {
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        for (const [element, listeners] of this.eventListeners) {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        }
        
        this.eventListeners.clear();
        this.elements = {};
        
        console.log('🎨 UI Controller cleaned up');
    }
}