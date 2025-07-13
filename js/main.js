// PhotoMosaic Generator - Main Application
// Memory-optimized implementation following Carmack & Knuth design principles

import { ImageProcessor } from './modules/image-processor.js';
import { TileManager } from './modules/tile-manager.js';
import { MemoryMonitor } from './modules/memory-monitor.js';
import { UIController } from './modules/ui-controller.js';
import { ProgressManager } from './modules/progress-manager.js';
import { ImageViewer } from './modules/image-viewer.js';
import { LanguageManager } from './modules/language-manager.js';

class PhotoMosaicApp {
    constructor() {
        // Initialize core components
        this.imageProcessor = new ImageProcessor();
        this.tileManager = new TileManager();
        this.memoryMonitor = new MemoryMonitor();
        this.uiController = new UIController();
        this.imageViewer = new ImageViewer();
        this.languageManager = new LanguageManager();
        this.progressManager = new ProgressManager(this.languageManager);
        
        // State management
        this.state = {
            sourceImage: null,
            tileFiles: [],
            isProcessing: false,
            isTileProcessing: false,
            tileProcessingComplete: false,
            settings: {
                gridSize: 50,
                tileSize: 32,
                quality: 'medium',
                colorMatching: 'rgb',
                neighborDiversity: 'enabled'
            }
        };
        
        // Web Worker instance
        this.worker = null;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        console.log('🚀 PhotoMosaic Generator starting...');
        
        // Initialize UI
        this.setupEventListeners();
        this.initializeWorker();
        
        // Start memory monitoring
        this.memoryMonitor.startMonitoring();
        this.memoryMonitor.onMemoryUpdate = (usage) => {
            this.updateMemoryDisplay(usage);
        };
        
        // Initialize settings
        this.initializeSettings();
        
        // Display parallel processing info
        this.initializeParallelInfo();
        
        // Initialize language management
        this.initializeLanguage();
        
        console.log('✅ Application initialized successfully');
    }
    
    setupEventListeners() {
        // File selection
        document.getElementById('source-file').addEventListener('change', 
            this.handleSourceFileSelect.bind(this));
        document.getElementById('tile-files').addEventListener('change', 
            this.handleTileFilesSelect.bind(this));
        
        // Settings changes
        document.getElementById('grid-size').addEventListener('input', 
            this.handleGridSizeChange.bind(this));
        document.getElementById('tile-size').addEventListener('input', 
            this.handleTileSizeChange.bind(this));
        document.getElementById('quality-setting').addEventListener('change', 
            this.handleQualityChange.bind(this));
        document.getElementById('color-matching').addEventListener('change', 
            this.handleColorMatchingChange.bind(this));
        document.getElementById('neighbor-diversity').addEventListener('change', 
            this.handleNeighborDiversityChange.bind(this));
        
        // Language toggle
        document.getElementById('language-toggle').addEventListener('click', 
            this.handleLanguageToggle.bind(this));
        
        // Generate button
        document.getElementById('generate-btn').addEventListener('click', 
            this.handleGenerateClick.bind(this));
        
        // Viewer controls
        document.getElementById('zoom-in').addEventListener('click', 
            () => this.imageViewer.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', 
            () => this.imageViewer.zoomOut());
        document.getElementById('fit-window').addEventListener('click', 
            () => this.imageViewer.fitToWindow());
        document.getElementById('actual-size').addEventListener('click', 
            () => this.imageViewer.actualSize());
        
        // Progress controls
        document.getElementById('pause-btn').addEventListener('click', 
            this.handlePauseClick.bind(this));
        document.getElementById('cancel-btn').addEventListener('click', 
            this.handleCancelClick.bind(this));
        document.getElementById('background-btn').addEventListener('click', 
            this.handleBackgroundClick.bind(this));
        document.getElementById('minimize-progress').addEventListener('click', 
            this.handleMinimizeClick.bind(this));
        document.getElementById('restore-progress').addEventListener('click', 
            this.handleRestoreClick.bind(this));
        
        // Download and share
        document.getElementById('download-btn').addEventListener('click', 
            this.handleDownloadClick.bind(this));
        document.getElementById('share-btn').addEventListener('click', 
            this.handleShareClick.bind(this));
        
        // Notification close
        document.getElementById('notification-close').addEventListener('click', 
            this.hideNotification.bind(this));
        
        // File loading progress close
        document.getElementById('file-loading-close').addEventListener('click', 
            this.hideFileLoadingProgress.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    initializeWorker() {
        if (this.worker) {
            this.worker.terminate();
        }
        
        this.worker = new Worker('./js/workers/mosaic-worker.js');
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);
    }
    
    initializeSettings() {
        // Initialize settings UI
        this.updateGridSizeDisplay();
        this.updateTileSizeDisplay();
        this.updateGenerateButton();
    }
    
    initializeParallelInfo() {
        // Display CPU core count and parallel processing info
        const coreCount = navigator.hardwareConcurrency || 4;
        const parallelInfo = document.getElementById('parallel-info');
        if (parallelInfo) {
            parallelInfo.textContent = `${this.languageManager.translate('parallel-enabled')} (${coreCount}${this.languageManager.translate('parallel-cores')})`;
            parallelInfo.title = `CPU ${coreCount}${this.languageManager.translate('parallel-cores-tooltip')}`;
        }
    }
    
    // File selection handlers
    async handleSourceFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Show progress bar for source image loading
            this.showFileLoadingProgress('file-loading-title');
            this.updateFileLoadingProgress(0, 0, 1, '');
            
            // Load image
            const imageData = await this.imageProcessor.loadImage(file);
            this.state.sourceImage = imageData;
            
            // Update progress to 100%
            this.updateFileLoadingProgress(100, 1, 1, this.languageManager.translate('loading-complete'));
            
            // Display preview
            this.displaySourcePreview(imageData);
            
            // Update generate button state
            this.updateGenerateButton();
            
            // Hide progress bar after short delay
            setTimeout(() => {
                this.hideFileLoadingProgress();
                this.showNotification(this.languageManager.translate('source-image-loaded'), 'success');
            }, 500);
            
        } catch (error) {
            console.error('Source image loading error:', error);
            this.hideFileLoadingProgress();
            this.showNotification(this.languageManager.translate('source-image-load-failed'), 'error');
        }
    }
    
    async handleTileFilesSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) {
            // Reset flags if no files selected
            this.state.isTileProcessing = false;
            this.state.tileProcessingComplete = false;
            this.state.tileFiles = [];
            this.updateGenerateButton();
            return;
        }
        
        try {
            // Show progress bar for tile images loading
            this.showFileLoadingProgress('file-loading-title');
            this.updateFileLoadingProgress(0, 0, files.length, '');
            
            // Set tile processing state to started
            this.state.isTileProcessing = true;
            this.state.tileProcessingComplete = false;
            this.state.tileFiles = files;
            this.updateTileCount(files.length);
            
            // Update button state immediately (disabled during processing)
            this.updateGenerateButton();
            
            // Extract metadata in background
            this.processTileFilesBackground(files);
            
        } catch (error) {
            console.error('Tile files loading error:', error);
            this.state.isTileProcessing = false;
            this.state.tileProcessingComplete = false;
            this.updateGenerateButton();
            this.hideFileLoadingProgress();
            this.showNotification(this.languageManager.translate('tile-images-load-failed'), 'error');
        }
    }
    
    async processTileFilesBackground(files) {
        try {
            const startTime = Date.now();
            this.tileLoadingStartTime = startTime; // Record start time for speed calculation
            let processedCount = 0;
            const previewGrid = document.getElementById('tile-preview-grid');
            previewGrid.innerHTML = '';
            
            // Parallel processing configuration
            const batchSize = Math.min(8, navigator.hardwareConcurrency || 4); // Based on CPU core count
            const memoryBatchSize = 20; // For memory control
            
            console.log(`🚀 Starting parallel processing: ${files.length} files with ${batchSize} parallel workers`);
            
            // Split files into batches
            const batches = this.createBatches(files, memoryBatchSize);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const batchStartTime = Date.now();
                
                try {
                    // Parallel processing within batch
                    const results = await this.processBatchInParallel(batch, batchSize);
                    
                    // Process successful results
                    for (const result of results) {
                        if (result.success) {
                            // Add preview
                            previewGrid.appendChild(result.preview);
                            processedCount++;
                        } else {
                            console.warn('Failed to process tile:', result.fileName, result.error);
                        }
                    }
                    
                    // Update progress
                    document.getElementById('tile-processed-count').textContent = processedCount;
                    
                    // Calculate and display progress rate
                    const progressPercent = Math.round((processedCount / files.length) * 100);
                    this.updateTileLoadingProgress(progressPercent, processedCount, files.length);
                    
                    // Log batch processing time
                    const batchTime = Date.now() - batchStartTime;
                    const imagesPerSecond = (batch.length / batchTime * 1000).toFixed(1);
                    console.log(`📦 Batch ${batchIndex + 1}/${batches.length} completed: ${batch.length} files (${batchTime}ms, ${imagesPerSecond} files/sec)`);
                    
                    // Check memory pressure
                    await this.memoryMonitor.checkMemoryPressure();
                    
                    // Small delay until next batch (memory stabilization)
                    if (batchIndex < batches.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    
                } catch (error) {
                    console.error('Batch processing error:', error);
                }
            }
            
            const totalTime = Date.now() - startTime;
            const avgTimePerImage = totalTime / processedCount;
            
            console.log(`✅ Parallel processing completed: ${processedCount} files, total time: ${totalTime}ms, average: ${avgTimePerImage.toFixed(1)}ms/file`);
            
            // Update progress to 100% and hide progress bar
            this.updateFileLoadingProgress(100, processedCount, files.length, this.languageManager.translate('loading-complete'));
            setTimeout(() => {
                this.hideFileLoadingProgress();
                this.showNotification(`${processedCount}${this.languageManager.translate('tiles-processed-time')} (${(totalTime/1000).toFixed(1)}s)`, 'success');
            }, 500);
        
            // Set tile processing completion flag
            this.state.isTileProcessing = false;
            this.state.tileProcessingComplete = true;
            
            // Update button state (enable)
            this.updateGenerateButton();
            
        } catch (error) {
            console.error('❌ Error occurred during tile processing:', error);
            
            // Hide progress bar on error
            this.hideFileLoadingProgress();
            
            // Reset flags on error
            this.state.isTileProcessing = false;
            this.state.tileProcessingComplete = false;
            this.updateGenerateButton();
            
            this.showNotification(this.languageManager.translate('tile-images-load-failed'), 'error');
        }
    }
    
    // Split files into batches
    createBatches(files, batchSize) {
        const batches = [];
        for (let i = 0; i < files.length; i += batchSize) {
            batches.push(files.slice(i, i + batchSize));
        }
        return batches;
    }
    
    // Parallel processing within batch
    async processBatchInParallel(batch, concurrency) {
        const results = [];
        
        // Promise control for parallel processing
        const executeInParallel = async (files) => {
            const promises = files.map(async (file) => {
                try {
                    // Extract metadata
                    const metadata = await this.tileManager.extractMetadata(file);
                    
                    // Create preview
                    const preview = await this.createTilePreview(file);
                    
                    return {
                        success: true,
                        fileName: file.name,
                        metadata: metadata,
                        preview: preview
                    };
                } catch (error) {
                    return {
                        success: false,
                        fileName: file.name,
                        error: error
                    };
                }
            });
            
            return Promise.all(promises);
        };
        
        // Process batches with controlled concurrency
        for (let i = 0; i < batch.length; i += concurrency) {
            const chunk = batch.slice(i, i + concurrency);
            const chunkResults = await executeInParallel(chunk);
            results.push(...chunkResults);
        }
        
        return results;
    }
    
    // Update tile loading progress
    updateTileLoadingProgress(percent, processed, total) {
        // Update file loading progress bar
        const speed = `${(processed / ((Date.now() - this.tileLoadingStartTime || Date.now()) / 1000)).toFixed(1)} ${this.languageManager.translate('files-per-second')}`;
        this.updateFileLoadingProgress(percent, processed, total, speed);
        
        // Output detailed progress information to console
        if (processed % 50 === 0 || percent === 100) {
            console.log(`🔄 Tile processing progress: ${percent}% (${processed}/${total} tiles)`);
        }
    }
    
    async createTilePreview(file) {
        const img = document.createElement('img');
        img.className = 'tile-preview-item';
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        return img;
    }
    
    // Settings change handlers
    handleGridSizeChange(event) {
        this.state.settings.gridSize = parseInt(event.target.value);
        this.updateGridSizeDisplay();
    }
    
    handleTileSizeChange(event) {
        this.state.settings.tileSize = parseInt(event.target.value);
        this.updateTileSizeDisplay();
    }
    
    handleQualityChange(event) {
        this.state.settings.quality = event.target.value;
    }
    
    handleColorMatchingChange(event) {
        this.state.settings.colorMatching = event.target.value;
    }
    
    handleNeighborDiversityChange(event) {
        this.state.settings.neighborDiversity = event.target.value;
        
        // Display feature explanation to user
        if (event.target.value === 'enabled') {
            this.showNotification(this.languageManager.translate('neighbor-diversity-enabled'), 'info');
        } else {
            this.showNotification(this.languageManager.translate('neighbor-diversity-disabled'), 'info');
        }
    }
    
    // UI update methods
    updateGridSizeDisplay() {
        const size = this.state.settings.gridSize;
        document.getElementById('grid-size-value').textContent = `${size}×${size}`;
    }
    
    updateTileSizeDisplay() {
        const size = this.state.settings.tileSize;
        document.getElementById('tile-size-value').textContent = `${size}px`;
    }
    
    updateGenerateButton() {
        const btn = document.getElementById('generate-btn');
        const canGenerate = this.state.sourceImage && 
                           this.state.tileFiles.length > 0 && 
                           !this.state.isProcessing &&
                           !this.state.isTileProcessing &&
                           this.state.tileProcessingComplete;
        
        btn.disabled = !canGenerate;
        
        if (canGenerate) {
            btn.classList.remove('disabled');
        } else {
            btn.classList.add('disabled');
        }
        
        // Output debug information to log
        console.log('🔘 Generate button state:', {
            canGenerate,
            hasSourceImage: !!this.state.sourceImage,
            tileFilesCount: this.state.tileFiles.length,
            isProcessing: this.state.isProcessing,
            isTileProcessing: this.state.isTileProcessing,
            tileProcessingComplete: this.state.tileProcessingComplete
        });
    }
    
    updateTileCount(count) {
        const unit = this.languageManager ? this.languageManager.translate('tile-count-unit') : 'tiles';
        document.getElementById('tile-count').innerHTML = `${count}<span data-i18n="tile-count-unit">${unit}</span>`;
        document.getElementById('tile-selected-count').textContent = count;
    }
    
    updateMemoryDisplay(usage) {
        const memoryElement = document.getElementById('memory-usage');
        const mb = Math.round(usage / 1024 / 1024);
        memoryElement.textContent = `${mb}MB`;
        
        // Color change based on memory usage
        if (mb > 400) {
            memoryElement.style.color = '#e74c3c';
        } else if (mb > 200) {
            memoryElement.style.color = '#f39c12';
        } else {
            memoryElement.style.color = '#2980b9';
        }
    }
    
    displaySourcePreview(imageData) {
        const canvas = document.getElementById('source-preview');
        const ctx = canvas.getContext('2d');
        
        // Adjust canvas size
        const maxSize = 200;
        const scale = Math.min(maxSize / imageData.width, maxSize / imageData.height);
        
        canvas.width = imageData.width * scale;
        canvas.height = imageData.height * scale;
        
        // Draw image
        ctx.drawImage(imageData.imageElement, 0, 0, canvas.width, canvas.height);
    }
    
    // Generate mosaic
    async handleGenerateClick() {
        if (this.state.isProcessing) return;
        
        try {
            this.state.isProcessing = true;
            this.updateGenerateButton();
            
            // Start progress display
            this.showProgressOverlay();
            this.progressManager.start();
            
            // Display initial progress immediately
            this.updateProgressDisplay({
                progress: 0,
                stage: this.languageManager.translate('stage-loading-source'),
                info: '0%',
                elapsedTime: 0,
                remainingTime: 0
            });
            
            // Request processing from worker
            // Get ImageData of source image
            this.updateProgressDisplay({
                progress: 5,
                stage: this.languageManager.translate('stage-loading-source'),
                info: 'Processing source image...',
                elapsedTime: 0,
                remainingTime: 0
            });
            
            const sourceCanvas = this.state.sourceImage.canvas;
            const sourceCtx = sourceCanvas.getContext('2d');
            const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            
            // Prepare ImageData for tile images with progress
            this.updateProgressDisplay({
                progress: 10,
                stage: this.languageManager.translate('stage-converting-tiles'),
                info: 'Converting tile images to ImageData...',
                elapsedTime: 0,
                remainingTime: 0
            });
            
            const tileImageDataArray = await this.processFilesToImageDataWithProgress(this.state.tileFiles);
            
            // Update progress before sending to worker
            this.updateProgressDisplay({
                progress: 45,
                stage: this.languageManager.translate('stage-analyzing-colors'),
                info: 'Starting mosaic generation...',
                elapsedTime: 0,
                remainingTime: 0
            });
            
            const message = {
                type: 'generate_mosaic',
                sourceImage: {
                    imageData: sourceImageData,
                    width: this.state.sourceImage.width,
                    height: this.state.sourceImage.height
                },
                tileFiles: tileImageDataArray,
                settings: this.state.settings
            };
            
            this.worker.postMessage(message);
            
        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification(this.languageManager.translate('mosaic-generation-error'), 'error');
            this.state.isProcessing = false;
            this.updateGenerateButton();
            this.hideProgressOverlay();
        }
    }
    
    // Worker message handler
    handleWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'progress':
                this.handleProgressUpdate(data);
                break;
            case 'preview':
                this.handlePreviewUpdate(data);
                break;
            case 'complete':
                this.handleGenerationComplete(data);
                break;
            case 'error':
                this.handleGenerationError(data);
                break;
            case 'paused':
                this.handleGenerationPaused();
                break;
            case 'resumed':
                this.handleGenerationResumed();
                break;
        }
    }
    
    handleWorkerError(error) {
        console.error('Worker error:', error);
        this.showNotification(this.languageManager.translate('processing-error'), 'error');
        this.state.isProcessing = false;
        this.updateGenerateButton();
        this.hideProgressOverlay();
    }
    
    handleProgressUpdate(data) {
        // Translate labelKey received from Worker
        const translatedData = {
            ...data,
            stage: data.stage ? this.languageManager.translate(data.stage, data.stage) : data.stage
        };
        
        this.progressManager.updateProgress(translatedData);
        this.updateProgressDisplay(translatedData);
    }
    
    handlePreviewUpdate(data) {
        this.updateProgressPreview(data);
    }
    
    handleGenerationComplete(data) {
        this.state.isProcessing = false;
        this.updateGenerateButton();
        this.hideProgressOverlay();
        
        // Display result
        this.displayResult(data.result);
        
        this.showNotification(this.languageManager.translate('mosaic-complete'), 'success');
        
        // Completion notification (when in background)
        if (this.progressManager.isMinimized) {
            this.showBrowserNotification(
                this.languageManager.translate('notification-processing-complete', 'Mosaic generation completed'), 
                this.languageManager.translate('mosaic-complete', 'PhotoMosaic generation completed.')
            );
        }
    }
    
    handleGenerationError(data) {
        this.state.isProcessing = false;
        this.updateGenerateButton();
        this.hideProgressOverlay();
        
        this.showNotification(`${this.languageManager.translate('notification-error')}: ${data.error}`, 'error');
    }
    
    handleGenerationPaused() {
        document.getElementById('pause-btn').textContent = '▶️ Resume';
    }
    
    handleGenerationResumed() {
        document.getElementById('pause-btn').textContent = '⏸️ Pause';
    }
    
    // Progress display
    showProgressOverlay() {
        document.getElementById('progress-overlay').style.display = 'flex';
        
        // Initialize progress display
        this.resetProgressDisplay();
    }
    
    resetProgressDisplay() {
        // Set progress bar to 0%
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        // Initialize progress information
        const currentStage = document.getElementById('current-stage');
        if (currentStage) {
            currentStage.textContent = this.languageManager.translate('stage-loading-source');
        }
        
        const progressInfo = document.getElementById('progress-info');
        if (progressInfo) {
            progressInfo.textContent = '0%';
        }
        
        const elapsedTime = document.getElementById('elapsed-time');
        if (elapsedTime) {
            elapsedTime.textContent = '0:00';
        }
        
        const remainingTime = document.getElementById('remaining-time');
        if (remainingTime) {
            remainingTime.textContent = '--:--';
        }
        
        // Clear preview canvas
        const previewCanvas = document.getElementById('preview-canvas');
        if (previewCanvas) {
            const ctx = previewCanvas.getContext('2d');
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
        
        console.log('🔄 Progress display initialized');
    }
    
    hideProgressOverlay() {
        document.getElementById('progress-overlay').style.display = 'none';
        document.getElementById('floating-progress').style.display = 'none';
    }
    
    updateProgressDisplay(data) {
        // Update progress bar
        document.getElementById('progress-fill').style.width = `${data.progress}%`;
        document.getElementById('progress-text').textContent = `${Math.round(data.progress)}%`;
        
        // Record current stage (for language switching)
        this.currentProcessingStage = data.stage;
        
        // Update detailed information
        document.getElementById('current-stage').textContent = data.stage || '';
        document.getElementById('progress-info').textContent = data.info || '';
        document.getElementById('elapsed-time').textContent = this.formatTime(data.elapsedTime || 0);
        document.getElementById('remaining-time').textContent = this.formatTime(data.remainingTime || 0);
        
        // Update floating progress
        document.getElementById('floating-fill').style.width = `${data.progress}%`;
        document.getElementById('floating-percent').textContent = `${Math.round(data.progress)}%`;
    }
    
    updateProgressPreview(data) {
        const canvas = document.getElementById('preview-canvas');
        const ctx = canvas.getContext('2d');
        
        if (data.preview) {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = data.preview;
        }
    }
    
    // Progress control
    handlePauseClick() {
        this.worker.postMessage({ type: 'pause' });
    }
    
    handleCancelClick() {
        this.worker.postMessage({ type: 'cancel' });
        this.state.isProcessing = false;
        this.updateGenerateButton();
        this.hideProgressOverlay();
    }
    
    handleBackgroundClick() {
        this.handleMinimizeClick();
    }
    
    handleMinimizeClick() {
        document.getElementById('progress-overlay').style.display = 'none';
        document.getElementById('floating-progress').style.display = 'block';
        this.progressManager.isMinimized = true;
    }
    
    handleRestoreClick() {
        document.getElementById('progress-overlay').style.display = 'flex';
        document.getElementById('floating-progress').style.display = 'none';
        this.progressManager.isMinimized = false;
    }
    
    // Display result
    displayResult(resultData) {
        const canvas = document.getElementById('result-canvas');
        const overlay = document.getElementById('viewer-overlay');
        
        // Hide overlay
        overlay.style.display = 'none';
        
        // Save result data (for download)
        this.lastResultData = resultData;
        
        // Display result image (with high-resolution metadata)
        this.imageViewer.setCanvas(canvas);
        this.imageViewer.loadImage(resultData.imageData, resultData);
        
        // Enable download button
        document.getElementById('download-btn').disabled = false;
        document.getElementById('share-btn').disabled = false;
        
        // High-resolution mode support notification
        if (resultData.tileMap && resultData.tileMap.length > 0) {
            console.log(`🔍 High-resolution tile display support: ${resultData.tileMap.length} tiles`);
            this.showNotification(this.languageManager.translate('high-res-tiles-info'), 'info');
        }
    }
    
    // Generate high-resolution mosaic image
    async generateHighResolutionMosaic(resultData) {
        console.log('🎨 Starting high-resolution mosaic generation:', {
            hasResultData: !!resultData,
            hasTileMap: !!(resultData && resultData.tileMap),
            hasGridInfo: !!(resultData && resultData.gridInfo),
            tileMapLength: resultData?.tileMap?.length,
            gridInfo: resultData?.gridInfo
        });
        
        if (!resultData || !resultData.tileMap || !resultData.gridInfo) {
            console.error('❌ Required data for high-resolution generation is missing:', {
                resultData: !!resultData,
                tileMap: !!(resultData && resultData.tileMap),
                gridInfo: !!(resultData && resultData.gridInfo)
            });
            return null;
        }
        
        this.showNotification(this.languageManager.translate('generating-high-res'), 'info');
        
        const { gridInfo, tileMap } = resultData;
        let highResTileSize = 256; // High-resolution tile size
        
        // Check canvas size limits (most browsers have a limit of 32767x32767)
        const maxCanvasSize = 32767;
        const maxGridSizeFor256 = Math.floor(maxCanvasSize / 256); // About 128
        
        if (gridInfo.gridSize > maxGridSizeFor256) {
            // Auto-adjust tile size
            highResTileSize = Math.floor(maxCanvasSize / gridInfo.gridSize);
            console.warn(`⚠️ Grid size too large, tile size adjusted to ${highResTileSize}px`);
            this.showNotification(`${this.languageManager.translate('tile-size-adjusted')} ${highResTileSize}px`, 'warning');
        }
        
        const fullWidth = gridInfo.gridSize * highResTileSize;
        const fullHeight = gridInfo.gridSize * highResTileSize;
        
        // Final size limit check
        if (fullWidth > maxCanvasSize || fullHeight > maxCanvasSize) {
            console.error('❌ Calculated canvas size exceeds browser limits:', {
                requested: `${fullWidth}x${fullHeight}`,
                maxAllowed: `${maxCanvasSize}x${maxCanvasSize}`
            });
            this.showNotification(this.languageManager.translate('image-size-limit'), 'error');
            return null;
        }
        
        console.log('🖼️ High-resolution generation info:', {
            gridSize: gridInfo.gridSize,
            tileCount: tileMap.length,
            originalTileSize: 256,
            adjustedTileSize: highResTileSize,
            fullWidth,
            fullHeight,
            maxCanvasSize,
            isWithinLimits: fullWidth <= maxCanvasSize && fullHeight <= maxCanvasSize,
            expectedTiles: gridInfo.gridSize * gridInfo.gridSize
        });
        
        // Create high-resolution canvas
        const canvas = document.createElement('canvas');
        canvas.width = fullWidth;
        canvas.height = fullHeight;
        const ctx = canvas.getContext('2d');
        
        console.log('📐 Canvas size:', {
            width: canvas.width,
            height: canvas.height,
            gridSize: gridInfo.gridSize,
            highResTileSize,
            calculatedSize: gridInfo.gridSize * highResTileSize
        });
        
        // Verify canvas creation
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
            console.error('❌ Canvas creation failed:', {
                ctx: !!ctx,
                width: canvas.width,
                height: canvas.height
            });
            return null;
        }
        
        // Fill background with black (to easily identify areas where tiles are not drawn)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, fullWidth, fullHeight);
        
        // Draw test border
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, fullWidth, fullHeight);
        
        // Draw each tile in high resolution
        let processedCount = 0;
        let validTileCount = 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // Promote garbage collection at regular intervals for memory management
        const gcInterval = 500; // Every 500 tiles
        
        for (const tile of tileMap) {
            // Collect tile position statistics
            minX = Math.min(minX, tile.x);
            minY = Math.min(minY, tile.y);
            maxX = Math.max(maxX, tile.x);
            maxY = Math.max(maxY, tile.y);
            
            // Detailed check of tile metadata
            const hasValidMetadata = tile.tileMetadata && 
                                     tile.tileMetadata.originalImageData && 
                                     tile.tileMetadata.originalImageData.data &&
                                     tile.tileMetadata.originalImageData.data.length > 0;
                                     
            if (hasValidMetadata) {
                validTileCount++;
                
                // Create high-resolution tile canvas
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = highResTileSize;
                tileCanvas.height = highResTileSize;
                const tileCtx = tileCanvas.getContext('2d');
                
                try {
                    // Draw original ImageData to canvas
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 64;
                    tempCanvas.height = 64;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(tile.tileMetadata.originalImageData, 0, 0);
                    
                    // Resize to high resolution
                    tileCtx.imageSmoothingEnabled = true;
                    tileCtx.imageSmoothingQuality = 'high';
                    tileCtx.drawImage(tempCanvas, 0, 0, highResTileSize, highResTileSize);
                } catch (imageError) {
                    console.warn(`⚠️ Error processing ImageData for tile (${tile.x}, ${tile.y}):`, imageError);
                    // Fill with average color as alternative
                    if (tile.tileMetadata.averageColor) {
                        const { r, g, b } = tile.tileMetadata.averageColor;
                        tileCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                        tileCtx.fillRect(0, 0, highResTileSize, highResTileSize);
                    } else {
                        // Last resort: gray
                        tileCtx.fillStyle = '#808080';
                        tileCtx.fillRect(0, 0, highResTileSize, highResTileSize);
                    }
                }
                
                // Verify tile drawing completion
                try {
                    const testPixel = tileCtx.getImageData(0, 0, 1, 1);
                    if (!testPixel || testPixel.data[3] === 0) {
                        console.warn(`⚠️ Tile (${tile.x}, ${tile.y}) drawing is incomplete`);
                    }
                } catch (e) {
                    console.warn(`⚠️ Error verifying tile (${tile.x}, ${tile.y}):`, e);
                }
                
                // Place on main canvas
                const x = tile.x * highResTileSize;
                const y = tile.y * highResTileSize;
                
                // Range check before drawing
                if (x + highResTileSize > canvas.width || y + highResTileSize > canvas.height) {
                    console.warn(`⚠️ Tile (${tile.x}, ${tile.y}) out of canvas bounds: ${x},${y} -> ${x + highResTileSize},${y + highResTileSize} (canvas: ${canvas.width}x${canvas.height})`);
                    continue;
                }
                
                ctx.drawImage(tileCanvas, x, y);
                
                // Debug first few tiles
                if (processedCount < 3) {
                    // Sample corresponding part of main canvas after tile drawing
                    const sampleX = Math.min(x + Math.floor(highResTileSize / 2), canvas.width - 1);
                    const sampleY = Math.min(y + Math.floor(highResTileSize / 2), canvas.height - 1);
                    const mainSample = ctx.getImageData(sampleX, sampleY, 1, 1);
                    
                    console.log(`🔍 Tile ${processedCount}: position (${tile.x}, ${tile.y}) -> canvas position (${x}, ${y})`, {
                        tileSize: highResTileSize,
                        hasMetadata: !!tile.tileMetadata,
                        hasOriginalImageData: !!tile.tileMetadata?.originalImageData,
                        mainCanvasSample: {
                            position: [sampleX, sampleY],
                            color: Array.from(mainSample.data)
                        }
                    });
                }
                
                processedCount++;
                
                // Progress update (every 100 tiles)
                if (processedCount % 100 === 0) {
                    this.showNotification(`${this.languageManager.translate('high-res-progress')} ${Math.round((processedCount / tileMap.length) * 100)}%`, 'info');
                    // Small delay to avoid blocking UI
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
                
                // Memory management (every 500 tiles)
                if (processedCount % gcInterval === 0) {
                    // Force garbage collection
                    if (window.gc) {
                        window.gc();
                    }
                    console.log(`🗑️ Memory management: ${processedCount}/${tileMap.length} tiles processed`);
                }
            } else {
                // Draw tile even with invalid metadata (for debugging)
                console.warn(`⚠️ Tile ${tile.x}, ${tile.y} has no valid metadata`, {
                    hasMetadata: !!tile.tileMetadata,
                    hasOriginalImageData: !!(tile.tileMetadata && tile.tileMetadata.originalImageData),
                    hasData: !!(tile.tileMetadata && tile.tileMetadata.originalImageData && tile.tileMetadata.originalImageData.data),
                    dataLength: tile.tileMetadata?.originalImageData?.data?.length || 0
                });
                
                // Draw red tile for debugging
                const x = tile.x * highResTileSize;
                const y = tile.y * highResTileSize;
                
                if (x + highResTileSize <= canvas.width && y + highResTileSize <= canvas.height) {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(x, y, highResTileSize, highResTileSize);
                    
                    // Draw border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, highResTileSize, highResTileSize);
                }
            }
        }
        
        // Wait a bit to ensure all drawing processes are complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('📊 Tile placement statistics:', {
            totalTiles: tileMap.length,
            processedTiles: processedCount,
            validTiles: validTileCount,
            tileRange: { minX, minY, maxX, maxY },
            expectedRange: { minX: 0, minY: 0, maxX: gridInfo.gridSize - 1, maxY: gridInfo.gridSize - 1 }
        });
        
        // Final verification
        if (canvas.width === 0 || canvas.height === 0) {
            console.error('❌ Final canvas size is 0:', {
                width: canvas.width,
                height: canvas.height,
                processedTiles: processedCount,
                validTiles: validTileCount
            });
            return null;
        }
        
        // Verify canvas contents (check first pixel)
        try {
            const imageData = ctx.getImageData(0, 0, 1, 1);
            console.log('🖼️ Canvas content verification:', {
                hasImageData: !!imageData,
                pixelData: imageData ? Array.from(imageData.data) : null
            });
        } catch (error) {
            console.warn('⚠️ Canvas content verification error:', error);
        }
        
        // Detailed check of final canvas contents
        const finalCheck = {
            size: `${canvas.width}x${canvas.height}`,
            processedTiles: processedCount,
            validTiles: validTileCount,
            canvasData: null
        };
        
        try {
            // Sample multiple points on canvas
            const checkPoints = [
                [0, 0], 
                [Math.floor(canvas.width / 4), Math.floor(canvas.height / 4)],
                [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)],
                [Math.floor(canvas.width * 3 / 4), Math.floor(canvas.height * 3 / 4)],
                [canvas.width - 1, canvas.height - 1]
            ];
            
            finalCheck.canvasData = checkPoints.map(([x, y]) => {
                try {
                    const imageData = ctx.getImageData(x, y, 1, 1);
                    return { 
                        position: [x, y], 
                        color: Array.from(imageData.data),
                        isTransparent: imageData.data[3] === 0,
                        isBlack: imageData.data[0] === 0 && imageData.data[1] === 0 && imageData.data[2] === 0
                    };
                } catch (e) {
                    return { position: [x, y], error: e.message };
                }
            });
        } catch (e) {
            finalCheck.canvasError = e.message;
        }
        
        console.log('✅ High-resolution image generation complete:', finalCheck);
        
        this.showNotification(this.languageManager.translate('high-res-complete'), 'success');
        return canvas;
    }
    
    // Download and share
    async handleDownloadClick() {
        if (!this.lastResultData) {
            this.showNotification(this.languageManager.translate('no-download-image'), 'error');
            return;
        }
        
        try {
            // Provide user with options
            const options = [
                'High resolution (256px per tile)',
                '1:1 size (Worker-generated image)',
                'Display size (current screen size)'
            ];
            
            const choice = prompt(this.languageManager.translate('download-type-prompt'));
            
            const choiceNum = parseInt(choice);
            let canvas = null;
            let filename = '';
            let description = '';
            
            switch (choiceNum) {
                case 1:
                    // Generate high-resolution image
                    canvas = await this.generateHighResolutionMosaic(this.lastResultData);
                    filename = `mosaic-highres-${this.lastResultData.gridInfo?.gridSize || 'unknown'}x${this.lastResultData.gridInfo?.gridSize || 'unknown'}-${Date.now()}.png`;
                    description = this.languageManager.translate('high-res-image');
                    break;
                    
                case 2:
                    // Worker-generated 1:1 size image
                    canvas = await this.generateOriginalSizeMosaic(this.lastResultData);
                    filename = `mosaic-original-${this.lastResultData.gridInfo?.gridSize || 'unknown'}x${this.lastResultData.gridInfo?.gridSize || 'unknown'}-${Date.now()}.png`;
                    description = this.languageManager.translate('1to1-image');
                    break;
                    
                case 3:
                default:
                    // Display image (complete image, independent of zoom state)
                    canvas = await this.generateOriginalSizeMosaic(this.lastResultData);
                    filename = `mosaic-display-${Date.now()}.png`;
                    description = this.languageManager.translate('display-image-full');
                    break;
            }
            
            console.log('🔍 Download process debug:', {
                choiceNum,
                canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
                resultData: this.lastResultData ? {
                    hasImageData: !!this.lastResultData.imageData,
                    gridInfo: this.lastResultData.gridInfo,
                    hasTileMap: !!this.lastResultData.tileMap
                } : null
            });
            
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                try {
                    // Pre-verify canvas contents
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        console.error('❌ Cannot get canvas context');
                        this.showNotification(this.languageManager.translate('canvas-init-failed'), 'error');
                        return;
                    }
                    
                    // Verify canvas contents (sample center and corners)
                    const samplePoints = [
                        [0, 0], // Top-left
                        [canvas.width - 1, 0], // Top-right
                        [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)], // Center
                        [0, canvas.height - 1], // Bottom-left
                        [canvas.width - 1, canvas.height - 1] // Bottom-right
                    ];
                    
                    let hasContent = false;
                    let backgroundInfo = [];
                    for (const [x, y] of samplePoints) {
                        try {
                            const imageData = ctx.getImageData(x, y, 1, 1);
                            const [r, g, b, a] = imageData.data;
                            backgroundInfo.push({ x, y, r, g, b, a });
                            
                            // If there are opaque pixels, consider it has content (including background color)
                            if (a > 0) {
                                hasContent = true;
                                // More certain if there are colors other than black and white
                                if ((r !== 0 || g !== 0 || b !== 0) && (r !== 255 || g !== 255 || b !== 255)) {
                                    break;
                                }
                            }
                        } catch (e) {
                            console.warn(`Error verifying sample point (${x}, ${y}):`, e);
                        }
                    }
                    
                    // More detailed content analysis
                    const colorCounts = backgroundInfo.reduce((acc, info) => {
                        if (info.a === 0) acc.transparent++;
                        else if (info.r === 0 && info.g === 0 && info.b === 0) acc.black++;
                        else if (info.r === 255 && info.g === 255 && info.b === 255) acc.white++;
                        else acc.colored++;
                        return acc;
                    }, { transparent: 0, black: 0, white: 0, colored: 0 });
                    
                    console.log('🔍 Canvas content verification:', {
                        size: `${canvas.width}x${canvas.height}`,
                        hasContent,
                        samplePoints: samplePoints.length,
                        colorCounts,
                        backgroundInfo: backgroundInfo.slice(0, 3) // Show only first 3
                    });
                    
                    // Even if mostly black background, consider valid if there are drawn tiles
                    if (!hasContent && colorCounts.black > 0 && colorCounts.transparent === 0) {
                        console.log('🎨 Black background detected, but this is considered valid content');
                        hasContent = true;
                    }
                    
                    // Consider white background as valid content (mosaic tiles may be drawn)
                    if (!hasContent && colorCounts.white > 0 && colorCounts.transparent === 0) {
                        console.log('🎨 White background detected, but this is considered valid content');
                        hasContent = true;
                    }
                    
                    // Consider valid unless completely transparent
                    if (!hasContent && colorCounts.transparent < samplePoints.length) {
                        console.log('🎨 Opaque pixels detected, considered valid content');
                        hasContent = true;
                    }
                    
                    if (!hasContent) {
                        console.warn('⚠️ No valid content detected in canvas');
                        
                        // Test DataURL generation with small test canvas
                        const testCanvas = document.createElement('canvas');
                        testCanvas.width = 100;
                        testCanvas.height = 100;
                        const testCtx = testCanvas.getContext('2d');
                        testCtx.fillStyle = '#ff0000';
                        testCtx.fillRect(0, 0, 100, 100);
                        
                        try {
                            const testDataURL = testCanvas.toDataURL('image/png');
                            console.log('🧪 Test canvas DataURL generation:', {
                                success: !!testDataURL,
                                length: testDataURL.length,
                                start: testDataURL.substring(0, 30)
                            });
                        } catch (testError) {
                            console.error('❌ DataURL generation failed even with test canvas:', testError);
                        }
                    }
                    
                    // Attempt DataURL generation
                    let dataURL;
                    let useBlob = false;
                    
                    try {
                        dataURL = canvas.toDataURL('image/png');
                        
                        // DataURL validation (more lenient conditions)
                        if (!dataURL || dataURL === 'data:,' || dataURL.length < 100) {
                            console.warn('⚠️ DataURL too short. Trying Blob method:', {
                                hasDataURL: !!dataURL,
                                dataURLStart: dataURL ? dataURL.substring(0, 50) : null,
                                length: dataURL ? dataURL.length : 0
                            });
                            useBlob = true;
                        } else {
                            console.log('✅ DataURL generation successful:', {
                                length: dataURL.length,
                                start: dataURL.substring(0, 30)
                            });
                        }
                    } catch (taintError) {
                        console.error('❌ Canvas tainted or DataURL generation error:', taintError);
                        useBlob = true;
                    }
                    
                    // Alternative download using Blob method
                    if (useBlob) {
                        console.log('🔄 Attempting download using Blob method...');
                        try {
                            const blob = await new Promise((resolve, reject) => {
                                try {
                                    canvas.toBlob((blob) => {
                                        if (blob && blob.size > 0) {
                                            console.log('✅ Blob generation successful:', {
                                                size: blob.size,
                                                type: blob.type
                                            });
                                            resolve(blob);
                                        } else {
                                            console.error('❌ Blob is empty or invalid:', blob);
                                            reject(new Error('Blob generation failed: empty Blob was generated'));
                                        }
                                    }, 'image/png', 0.95); // Add quality specification
                                } catch (blobError) {
                                    console.error('❌ toBlob execution error:', blobError);
                                    reject(blobError);
                                }
                            });
                            
                            const blobUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.download = filename;
                            link.href = blobUrl;
                            link.click();
                            
                            // Cleanup
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                            
                            const fileSize = Math.round(blob.size / 1024 / 1024 * 100) / 100;
                            console.log('✅ Blob download successful:', {
                                filename,
                                size: `${canvas.width}x${canvas.height}`,
                                fileSize: `${fileSize}MB`
                            });
                            
                            this.showNotification(`${this.languageManager.translate('download-success-detailed')}: "${filename}" (${canvas.width}x${canvas.height}, ${fileSize}MB)`, 'success');
                            return;
                            
                        } catch (blobError) {
                            console.error('❌ Blob download also failed:', blobError);
                            this.showNotification(this.languageManager.translate('image-download-failed'), 'error');
                            return;
                        }
                    }
                    
                    // Normal DataURL download
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = dataURL;
                    link.click();
                    
                    // Display file size information
                    const fileSize = Math.round((dataURL.length * 0.75) / 1024 / 1024 * 100) / 100; // MB
                    console.log('✅ Download successful:', {
                        filename,
                        size: `${canvas.width}x${canvas.height}`,
                        fileSize: `${fileSize}MB`,
                        dataURLLength: dataURL.length
                    });
                    
                    this.showNotification(`${this.languageManager.translate('download-success-detailed')}: "${filename}" (${canvas.width}x${canvas.height}, ${fileSize}MB)`, 'success');
                } catch (error) {
                    console.error('❌ Download link creation error:', error);
                    this.showNotification(this.languageManager.translate('download-link-failed'), 'error');
                }
            } else {
                console.error('❌ Invalid canvas:', {
                    canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
                    hasCanvas: !!canvas
                });
                this.showNotification(this.languageManager.translate('image-generation-failed'), 'error');
            }
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification(this.languageManager.translate('download-failed'), 'error');
        }
    }
    
    // Generate original size mosaic image from Worker
    async generateOriginalSizeMosaic(resultData) {
        if (!resultData || !resultData.imageData) {
            console.warn('Required data for original size generation is missing');
            return null;
        }
        
        this.showNotification(this.languageManager.translate('generating-1to1'), 'info');
        
        try {
            // Check if DataURL is valid
            if (!resultData.imageData.startsWith('data:image/')) {
                console.error('❌ Invalid DataURL format:', resultData.imageData.substring(0, 100));
                throw new Error('Invalid DataURL format');
            }
            
            // Create image from Worker-generated DataURL
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('🖼️ Image loading successful:', {
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        complete: img.complete
                    });
                    resolve();
                };
                img.onerror = (error) => {
                    console.error('❌ Image loading failed:', error);
                    reject(new Error('Image loading failed'));
                };
                img.src = resultData.imageData;
            });
            
            // Check if image size is valid
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                console.error('❌ Invalid image size:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                });
                throw new Error('Image size is invalid');
            }
            
            // Create original size canvas (completely independent)
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Failed to get canvas context');
            }
            
            // Clear background (initialize with white background)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw image completely fitted
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
            
            // Verify drawing result
            const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
            const hasNonWhitePixels = Array.from(imageData.data).some((value, index) => {
                // Check if there are non-white (255) values in non-alpha channels
                return index % 4 !== 3 && value !== 255;
            });
            
            console.log('✅ 1:1 size image generation complete:', {
                width: canvas.width,
                height: canvas.height,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                imageComplete: img.complete,
                hasNonWhitePixels,
                canvasValid: canvas.width > 0 && canvas.height > 0
            });
            
            if (!hasNonWhitePixels) {
                console.warn('⚠️ Only white background detected. Mosaic tiles may not have been drawn correctly.');
            }
            
            this.showNotification(this.languageManager.translate('1to1-complete'), 'success');
            return canvas;
            
        } catch (error) {
            console.error('1:1 size image generation error:', error);
            this.showNotification(`${this.languageManager.translate('1to1-failed')}: ${error.message}`, 'error');
            return null;
        }
    }
    
    // Create complete copy of display canvas
    generateFullDisplayImage() {
        const displayCanvas = document.getElementById('result-canvas');
        if (!displayCanvas || !displayCanvas.width) {
            console.warn('Display canvas not available');
            return null;
        }
        
        // Create complete copy of display canvas
        const canvas = document.createElement('canvas');
        canvas.width = displayCanvas.width;
        canvas.height = displayCanvas.height;
        const ctx = canvas.getContext('2d');
        
        // Copy display canvas contents
        ctx.drawImage(displayCanvas, 0, 0);
        
        console.log('📋 Display image copy created:', {
            width: canvas.width,
            height: canvas.height,
            displayWidth: displayCanvas.width,
            displayHeight: displayCanvas.height
        });
        
        return canvas;
    }
    
    // Generate completely independent mosaic image (not dependent on display state)
    async generateCompleteImage(resultData, targetTileSize = null) {
        if (!resultData) {
            console.warn('Required data for image generation is missing');
            return null;
        }
        
        // First try 1:1 size
        if (resultData.imageData) {
            try {
                const canvas = await this.generateOriginalSizeMosaic(resultData);
                if (canvas && canvas.width > 0) {
                    console.log('✅ Generated complete image at 1:1 size');
                    return canvas;
                }
            } catch (error) {
                console.warn('1:1 size generation failed, retrying with high resolution:', error);
            }
        }
        
        // Reconstruct with high-resolution tile images
        if (resultData.tileMap && resultData.gridInfo && targetTileSize) {
            try {
                const canvas = await this.generateHighResolutionMosaic(resultData);
                if (canvas && canvas.width > 0) {
                    console.log('✅ Generated complete image at high resolution');
                    return canvas;
                }
            } catch (error) {
                console.warn('High resolution generation failed:', error);
            }
        }
        
        // Last resort: display canvas copy (with warning)
        console.warn('⚠️ Using display canvas as other methods failed');
        return this.generateFullDisplayImage();
    }
    
    async handleShareClick() {
        if (!this.lastResultData) {
            this.showNotification(this.languageManager.translate('no-share-image'), 'error');
            return;
        }
        
        try {
            // Provide user with options
            const useHighRes = confirm('Share high-resolution image?\n\n"OK": High resolution (takes processing time)\n"Cancel": Display image (fast)');
            
            let canvas;
            let filename = 'mosaic.png';
            
            if (useHighRes) {
                // Generate high-resolution image
                canvas = await this.generateHighResolutionMosaic(this.lastResultData);
                const gridSize = this.lastResultData.gridInfo?.gridSize || 'unknown';
                filename = `mosaic-${gridSize}x${gridSize}-highres.png`;
            } else {
                // Use display canvas
                canvas = document.getElementById('result-canvas');
            }
            
            if (!canvas || !canvas.width) return;
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], filename, { type: 'image/png' });
            
            if (navigator.share) {
                await navigator.share({
                    title: 'PhotoMosaic',
                    text: 'Generated with PhotoMosaic Generator',
                    files: [file]
                });
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                this.showNotification(this.languageManager.translate('copy-to-clipboard'), 'success');
            }
        } catch (error) {
            console.error('Share error:', error);
            this.showNotification(this.languageManager.translate('share-failed'), 'error');
        }
    }
    
    // Keyboard shortcuts
    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '=':
                case '+':
                    event.preventDefault();
                    this.imageViewer.zoomIn();
                    break;
                case '-':
                    event.preventDefault();
                    this.imageViewer.zoomOut();
                    break;
                case '0':
                    event.preventDefault();
                    this.imageViewer.actualSize();
                    break;
                case 'f':
                    event.preventDefault();
                    this.imageViewer.fitToWindow();
                    break;
            }
        }
        
        if (event.key === 'Escape') {
            this.hideNotification();
        }
    }
    
    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = document.getElementById('notification-icon');
        const text = document.getElementById('notification-text');
        
        // Icon settings
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        icon.textContent = icons[type] || icons.info;
        text.textContent = message;
        
        notification.style.display = 'block';
        notification.className = `notification ${type}`;
        
        // Auto-hide
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }
    
    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }
    
    async showBrowserNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico'
            });
        }
    }
    
    // Convert file to ImageData
    async processFileToImageData(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Draw to 64x64 canvas
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                // Resize and draw image
                ctx.drawImage(img, 0, 0, 64, 64);
                const imageData = ctx.getImageData(0, 0, 64, 64);
                
                URL.revokeObjectURL(img.src);
                resolve(imageData);
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Image loading failed'));
            };
            img.src = URL.createObjectURL(file);
        });
    }
    
    // Utility methods
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }
    
    // Initialize language management
    initializeLanguage() {
        // Add language change listener
        this.languageManager.addLanguageChangeListener((newLanguage, oldLanguage) => {
            this.onLanguageChange(newLanguage, oldLanguage);
        });
        
        // Apply initial translation
        this.languageManager.translatePage();
        
        console.log(`🌐 Language manager initialized: ${this.languageManager.getCurrentLanguage()}`);
    }
    
    // Language toggle handler
    handleLanguageToggle() {
        this.languageManager.toggleLanguage();
    }
    
    // Processing when language changes
    onLanguageChange(newLanguage, oldLanguage) {
        console.log(`🔄 Language changed: ${oldLanguage} → ${newLanguage}`);
        
        // Update translation for entire page
        this.languageManager.translatePage();
        
        // Update translation for dynamic elements
        this.updateDynamicTranslations(newLanguage);
        
        // Feedback via notification
        const message = this.languageManager.translate('language-switched');
        this.showNotification(message, 'success');
    }
    
    // Update translation for dynamic elements
    updateDynamicTranslations(language) {
        // Update tile count display
        const tileCount = document.getElementById('tile-count');
        if (tileCount) {
            const count = parseInt(document.getElementById('tile-selected-count').textContent) || 0;
            const unit = this.languageManager.translate('tile-count-unit');
            tileCount.innerHTML = `${count}<span data-i18n="tile-count-unit">${unit}</span>`;
        }
        
        // Update progress display
        this.updateProgressTranslations(language);
        
        // Update parallel processing info
        this.initializeParallelInfo();
    }
    
    // Update progress display translation
    updateProgressTranslations(language) {
        // Translate current stage display
        const currentStageElement = document.getElementById('current-stage');
        if (currentStageElement && this.currentProcessingStage) {
            const translatedStage = this.languageManager.translate(this.currentProcessingStage);
            currentStageElement.textContent = translatedStage;
        }
        
        // Update pause/resume button text
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn && this.state.isProcessing) {
            const isPaused = pauseBtn.classList.contains('paused');
            const key = isPaused ? 'resume-btn' : 'pause-btn';
            pauseBtn.textContent = this.languageManager.translate(key);
        }
    }
    
    // Save processing stage translation key
    setCurrentProcessingStage(stageKey) {
        this.currentProcessingStage = stageKey;
        const currentStageElement = document.getElementById('current-stage');
        if (currentStageElement) {
            currentStageElement.textContent = this.languageManager.translate(stageKey);
        }
    }
    
    // File loading progress bar methods
    showFileLoadingProgress(title = 'file-loading-title') {
        const overlay = document.getElementById('file-loading-progress');
        const titleElement = document.getElementById('file-loading-title');
        
        if (overlay && titleElement) {
            titleElement.textContent = this.languageManager.translate(title);
            overlay.style.display = 'flex';
            this.updateFileLoadingProgress(0, 0, 0, '');
        }
    }
    
    hideFileLoadingProgress() {
        const overlay = document.getElementById('file-loading-progress');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    updateFileLoadingProgress(percent, processed, total, speed = '') {
        const percentElement = document.getElementById('file-loading-percent');
        const fillElement = document.getElementById('file-loading-fill');
        const countElement = document.getElementById('file-loading-count');
        const totalElement = document.getElementById('file-loading-total');
        const speedElement = document.getElementById('file-loading-speed');
        const textElement = document.getElementById('file-loading-text');
        
        if (percentElement) percentElement.textContent = `${percent}%`;
        if (fillElement) fillElement.style.width = `${percent}%`;
        if (countElement) countElement.textContent = processed;
        if (totalElement) totalElement.textContent = total;
        if (speedElement) speedElement.textContent = speed;
        
        if (textElement) {
            if (total === 1) {
                textElement.textContent = this.languageManager.translate('file-loading-source');
            } else if (total > 1) {
                textElement.textContent = this.languageManager.translate('file-loading-tiles');
            } else {
                textElement.textContent = this.languageManager.translate('file-loading-title');
            }
        }
    }
    
    // Process files to ImageData with progress display
    async processFilesToImageDataWithProgress(files) {
        const tileImageDataArray = [];
        const totalFiles = files.length;
        const startTime = Date.now();
        
        // Process in batches for better performance
        const batchSize = Math.min(10, Math.max(1, Math.floor(totalFiles / 20))); // Adaptive batch size
        
        for (let i = 0; i < totalFiles; i += batchSize) {
            const batch = files.slice(i, Math.min(i + batchSize, totalFiles));
            const batchPromises = batch.map(async (file) => {
                try {
                    const imageData = await this.processFileToImageData(file);
                    return {
                        name: file.name,
                        size: file.size,
                        imageData: imageData
                    };
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            
            // Add successful results
            batchResults.forEach(result => {
                if (result) {
                    tileImageDataArray.push(result);
                }
            });
            
            // Update progress
            const processedCount = Math.min(i + batchSize, totalFiles);
            const progress = 10 + Math.round((processedCount / totalFiles) * 30); // 10% to 40%
            const elapsedTime = Date.now() - startTime;
            const avgTimePerFile = processedCount > 0 ? elapsedTime / processedCount : 0;
            const remainingFiles = totalFiles - processedCount;
            const estimatedRemainingTime = avgTimePerFile * remainingFiles;
            
            this.updateProgressDisplay({
                progress: progress,
                stage: this.languageManager.translate('stage-converting-tiles'),
                info: `Converting tiles ${processedCount}/${totalFiles} (batch processing)`,
                elapsedTime: elapsedTime,
                remainingTime: estimatedRemainingTime
            });
            
            // Small delay to allow UI update
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        // Final progress update for this stage
        this.updateProgressDisplay({
            progress: 40,
            stage: this.languageManager.translate('stage-converting-tiles'),
            info: `Converted ${totalFiles} tile images to ImageData`,
            elapsedTime: Date.now() - startTime,
            remainingTime: 0
        });
        
        return tileImageDataArray;
    }
    
    // Cleanup
    destroy() {
        if (this.worker) {
            this.worker.terminate();
        }
        this.memoryMonitor.stopMonitoring();
        this.languageManager.cleanup();
    }
}

// Application startup
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 PhotoMosaic Generator - Starting Application');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Initialize application
    window.photoMosaicApp = new PhotoMosaicApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.photoMosaicApp) {
        window.photoMosaicApp.destroy();
    }
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});