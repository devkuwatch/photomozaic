// PhotoMosaic Worker - Memory-optimized mosaic generation processing
// Carmack-style fast processing + Knuth-style beautiful algorithms

// Memory optimization related imports
importScripts('../lib/memory-utils.js');

class MosaicWorker {
    constructor() {
        this.isProcessing = false;
        this.isPaused = false;
        this.isCancelled = false;
        this.startTime = null;
        
        // Memory limit settings
        this.maxMemoryUsage = 512 * 1024 * 1024; // 512MB
        this.tileCache = new Map();
        this.maxCacheSize = 100;
        
        // Processing stage definitions
        this.processingStages = {
            LOADING_SOURCE: { weight: 10, labelKey: 'stage-loading-source' },
            LOADING_TILES: { weight: 20, labelKey: 'stage-loading-tiles' },
            ANALYZING_COLORS: { weight: 15, labelKey: 'stage-analyzing-colors' },
            BUILDING_INDEX: { weight: 10, labelKey: 'stage-building-index' },
            GENERATING_MOSAIC: { weight: 40, labelKey: 'stage-generating-mosaic' },
            OPTIMIZING: { weight: 3, labelKey: 'stage-optimizing' },
            FINALIZING: { weight: 2, labelKey: 'stage-finalizing' }
        };
        
        this.currentStage = null;
        this.totalProgress = 0;
        this.stageProgress = 0;
    }
    
    // Main message handler
    async handleMessage(event) {
        const { type, ...data } = event.data;
        
        try {
            switch (type) {
                case 'generate_mosaic':
                    await this.generateMosaic(data);
                    break;
                case 'pause':
                    this.pauseProcessing();
                    break;
                case 'resume':
                    this.resumeProcessing();
                    break;
                case 'cancel':
                    this.cancelProcessing();
                    break;
                default:
                    console.warn('Unknown message type:', type);
            }
        } catch (error) {
            this.sendError('An error occurred during processing: ' + error.message);
        }
    }
    
    // Main mosaic generation processing
    async generateMosaic({ sourceImage, tileFiles, settings }) {
        this.isProcessing = true;
        this.isPaused = false;
        this.isCancelled = false;
        this.startTime = Date.now();
        
        try {
            // 1. Source image processing
            await this.setStage('LOADING_SOURCE');
            const processedSource = await this.processSourceImage(sourceImage, settings);
            
            // 2. Tile image metadata extraction
            await this.setStage('LOADING_TILES');
            const tileMetadata = await this.processTileImages(tileFiles, settings);
            
            // 3. Color analysis
            await this.setStage('ANALYZING_COLORS');
            const colorAnalysis = await this.analyzeColors(processedSource, tileMetadata);
            
            // 4. Search index construction
            await this.setStage('BUILDING_INDEX');
            const searchIndex = await this.buildSearchIndex(colorAnalysis);
            
            // 5. Mosaic generation (main processing)
            await this.setStage('GENERATING_MOSAIC');
            const mosaicData = await this.generateMosaicGrid(
                processedSource, 
                tileMetadata, 
                searchIndex, 
                settings
            );
            
            // 6. Optimization processing
            await this.setStage('OPTIMIZING');
            const optimizedResult = await this.optimizeResult(mosaicData, settings);
            
            // 7. Final processing
            await this.setStage('FINALIZING');
            const finalResult = await this.finalizeResult(optimizedResult);
            
            // Completion notification
            this.sendComplete(finalResult);
            
        } catch (error) {
            if (!this.isCancelled) {
                this.sendError(error.message);
            }
        } finally {
            this.isProcessing = false;
            this.cleanup();
        }
    }
    
    // Source image processing
    async processSourceImage(sourceImage, settings) {
        // Use ImageData sent from main thread
        const imageData = sourceImage.imageData;
        
        // Process based on grid size
        const gridSize = settings.gridSize;
        const cellWidth = Math.floor(sourceImage.width / gridSize);
        const cellHeight = Math.floor(sourceImage.height / gridSize);
        
        const processedData = {
            originalData: imageData,
            gridSize: gridSize,
            cellWidth: cellWidth,
            cellHeight: cellHeight,
            cells: []
        };
        
        // Calculate representative color for each cell
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cellColor = this.calculateCellColor(
                    imageData, 
                    x * cellWidth, 
                    y * cellHeight, 
                    cellWidth, 
                    cellHeight
                );
                
                processedData.cells.push({
                    x: x,
                    y: y,
                    color: cellColor,
                    lab: this.rgbToLab(cellColor)
                });
                
                // Progress update
                const progress = ((y * gridSize + x) / (gridSize * gridSize)) * 100;
                this.updateStageProgress(progress);
                
                // Pause/cancel check
                await this.checkPauseCancel();
            }
        }
        
        return processedData;
    }
    
    // Tile image processing (parallel processing version)
    async processTileImages(tileFiles, settings) {
        const tileMetadata = [];
        const tileSize = settings.tileSize;
        const startTime = Date.now();
        
        // Parallel processing settings
        const batchSize = Math.min(12, tileFiles.length); // More parallelization within Worker
        const memoryBatchSize = 30; // Batch size for memory control
        
        console.log(`🔧 Worker parallel processing started: processing ${tileFiles.length} images with ${batchSize} parallel threads`);
        
        // Divide files into batches
        const batches = this.createBatches(tileFiles, memoryBatchSize);
        let processedCount = 0;
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchStartTime = Date.now();
            
            try {
                // Parallel processing within batch
                const results = await this.processTileBatchInParallel(batch, batchSize, tileSize);
                
                // Add successful results to metadata array
                for (const result of results) {
                    if (result.success) {
                        tileMetadata.push(result.metadata);
                        processedCount++;
                    } else {
                        console.warn('Failed to process tile:', result.fileName, result.error);
                    }
                }
                
                // Progress update
                const progress = (processedCount / tileFiles.length) * 100;
                this.updateStageProgress(progress);
                
                // Log batch processing time
                const batchTime = Date.now() - batchStartTime;
                const imagesPerSecond = (batch.length / batchTime * 1000).toFixed(1);
                console.log(`🔧 Worker batch ${batchIndex + 1}/${batches.length}: ${batch.length} images (${imagesPerSecond} images/sec)`);
                
                // Memory pressure check
                if (batchIndex % 2 === 0) {
                    await this.checkMemoryPressure();
                }
                
                // Pause/cancel check
                await this.checkPauseCancel();
                
            } catch (error) {
                console.error('Worker batch processing error:', error);
            }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ Worker parallel processing completed: ${processedCount} images, total time: ${totalTime}ms`);
        
        return tileMetadata;
    }
    
    // Batch creation utility
    createBatches(files, batchSize) {
        const batches = [];
        for (let i = 0; i < files.length; i += batchSize) {
            batches.push(files.slice(i, i + batchSize));
        }
        return batches;
    }
    
    // Parallel processing of tile batches
    async processTileBatchInParallel(batch, concurrency, tileSize) {
        const results = [];
        
        // Promise control for parallel processing
        const executeInParallel = async (files) => {
            const promises = files.map(async (file) => {
                try {
                    const metadata = await this.extractTileMetadata(file, tileSize);
                    return {
                        success: true,
                        fileName: file.name,
                        metadata: metadata
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
        
        // Process batches with controlled parallelism
        for (let i = 0; i < batch.length; i += concurrency) {
            const chunk = batch.slice(i, i + concurrency);
            const chunkResults = await executeInParallel(chunk);
            results.push(...chunkResults);
        }
        
        return results;
    }
    
    // Tile metadata extraction
    async extractTileMetadata(file, tileSize) {
        // Use ImageData sent from main thread
        const imageData = file.imageData;
        
        // Representative color calculation
        const averageColor = this.calculateAverageColor(imageData);
        const dominantColors = this.extractDominantColors(imageData);
        
        return {
            filename: file.name,
            size: file.size,
            averageColor: averageColor,
            averageColorLab: this.rgbToLab(averageColor),
            dominantColors: dominantColors,
            imageData: this.compressImageData(imageData),
            // Preserve original image information for high-resolution display
            originalImageData: imageData, // Original 64x64 ImageData
            highResAvailable: true
        };
    }
    
    // Color analysis
    async analyzeColors(sourceData, tileMetadata) {
        const analysis = {
            sourceColorRange: this.calculateColorRange(sourceData.cells),
            tileColorRange: this.calculateColorRange(tileMetadata.map(t => ({ color: t.averageColor }))),
            colorMapping: new Map()
        };
        
        // Color mapping construction
        for (let i = 0; i < sourceData.cells.length; i++) {
            const cell = sourceData.cells[i];
            const bestMatches = this.findBestColorMatches(cell.lab, tileMetadata, 5);
            analysis.colorMapping.set(i, bestMatches);
            
            // Progress update
            const progress = ((i + 1) / sourceData.cells.length) * 100;
            this.updateStageProgress(progress);
            
            await this.checkPauseCancel();
        }
        
        return analysis;
    }
    
    // Search index construction
    async buildSearchIndex(colorAnalysis) {
        // Simple color space index
        const index = {
            redBuckets: new Array(16).fill(null).map(() => []),
            greenBuckets: new Array(16).fill(null).map(() => []),
            blueBuckets: new Array(16).fill(null).map(() => []),
            labBuckets: new Array(8).fill(null).map(() => [])
        };
        
        // Classify tiles into color buckets
        colorAnalysis.colorMapping.forEach((matches, cellIndex) => {
            matches.forEach(match => {
                const color = match.tile.averageColor;
                const lab = match.tile.averageColorLab;
                
                // RGB buckets
                const rBucket = Math.floor(color.r / 16);
                const gBucket = Math.floor(color.g / 16);
                const bBucket = Math.floor(color.b / 16);
                
                index.redBuckets[rBucket].push(match);
                index.greenBuckets[gBucket].push(match);
                index.blueBuckets[bBucket].push(match);
                
                // LAB buckets
                const lBucket = Math.floor(lab.l / 12.5);
                if (lBucket < 8) {
                    index.labBuckets[lBucket].push(match);
                }
            });
        });
        
        this.updateStageProgress(100);
        return index;
    }
    
    // Mosaic grid generation
    async generateMosaicGrid(sourceData, tileMetadata, searchIndex, settings) {
        const gridSize = sourceData.gridSize;
        const tileSize = settings.tileSize;
        const resultWidth = gridSize * tileSize;
        const resultHeight = gridSize * tileSize;
        
        const canvas = new OffscreenCanvas(resultWidth, resultHeight);
        const ctx = canvas.getContext('2d');
        
        // Result data
        const result = {
            canvas: canvas,
            width: resultWidth,
            height: resultHeight,
            tiles: [],
            gridSize: gridSize,
            tileSize: tileSize
        };
        
        // Tile usage count tracking
        const tileUsageCount = new Map();
        
        // Tile placement map (for adjacency checking)
        const tileMap = new Map(); // key: "x,y", value: tileFilename
        
        // Notification of processing method based on neighbor diversity settings
        if (settings.neighborDiversity === 'enabled') {
            console.log('🎨 Starting tile placement with neighbor diversity control enabled');
        } else {
            console.log('🎨 Using traditional tile placement algorithm');
        }
        
        // Tile placement for each cell (sequential processing for adjacency control)
        for (let i = 0; i < sourceData.cells.length; i++) {
            const cell = sourceData.cells[i];
            
            // Debug information (tracking issues with large grid sizes)
            if (settings.gridSize >= 60 && i % 500 === 0) {
                console.log(`🔍 Processing cell ${i}/${sourceData.cells.length}, position: (${cell.x}, ${cell.y}), color: rgb(${cell.color.r}, ${cell.color.g}, ${cell.color.b})`);
            }
            
            let selectedTile;
            
            // Branch processing based on neighbor diversity settings
            if (settings.neighborDiversity === 'enabled') {
                // Get neighbor tile information
                const neighborTiles = this.getNeighborTiles(cell.x, cell.y, tileMap, gridSize);
                
                // Select optimal tile (with adjacency constraints)
                selectedTile = await this.selectBestTileWithNeighborConstraint(
                    cell, 
                    tileMetadata, 
                    tileUsageCount, 
                    neighborTiles,
                    settings
                );
            } else {
                // Traditional processing (no adjacency constraints)
                selectedTile = await this.selectBestTile(
                    cell, 
                    tileMetadata, 
                    tileUsageCount, 
                    settings
                );
            }
            
            if (selectedTile) {
                // Draw tile image
                await this.drawTileToCanvas(
                    ctx, 
                    selectedTile, 
                    cell.x * tileSize, 
                    cell.y * tileSize, 
                    tileSize
                );
                
                // Update usage count
                const currentCount = tileUsageCount.get(selectedTile.filename) || 0;
                tileUsageCount.set(selectedTile.filename, currentCount + 1);
                
                // Record in tile placement map (for adjacency checking)
                tileMap.set(`${cell.x},${cell.y}`, selectedTile.filename);
                
                result.tiles.push({
                    x: cell.x,
                    y: cell.y,
                    tile: selectedTile.filename,
                    // Information for high-resolution display
                    tileMetadata: {
                        filename: selectedTile.filename,
                        averageColor: selectedTile.averageColor,
                        originalImageData: selectedTile.originalImageData
                    }
                });
            }
            
            // Progress update
            const progress = ((i + 1) / sourceData.cells.length) * 100;
            this.updateStageProgress(progress);
            
            // Preview update (every 100 tiles)
            if (i % 100 === 0) {
                await this.sendPreviewUpdate(canvas);
            }
            
            await this.checkPauseCancel();
        }
        
        // Statistical information for neighbor diversity
        if (settings.neighborDiversity === 'enabled') {
            const duplicateCount = this.checkNeighborDuplicates(tileMap, gridSize);
            console.log(`📊 Neighbor diversity results: adjacent duplicate tiles ${duplicateCount} / total tiles ${sourceData.cells.length}`);
        }
        
        return result;
    }
    
    // Get adjacent tiles
    getNeighborTiles(x, y, tileMap, gridSize) {
        const neighbors = [];
        
        // Define adjacent positions (up, down, left, right)
        const directions = [
            [-1, 0],  // left
            [1, 0],   // right
            [0, -1],  // up
            [0, 1],   // down
        ];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check if within grid bounds
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                const neighborTile = tileMap.get(`${nx},${ny}`);
                if (neighborTile) {
                    neighbors.push(neighborTile);
                }
            }
        }
        
        return neighbors;
    }
    
    // Check adjacent duplicates (for statistics)
    checkNeighborDuplicates(tileMap, gridSize) {
        let duplicateCount = 0;
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const currentTile = tileMap.get(`${x},${y}`);
                if (!currentTile) continue;
                
                // Check right and bottom adjacency (to avoid duplicate counting)
                const rightTile = x + 1 < gridSize ? tileMap.get(`${x+1},${y}`) : null;
                const bottomTile = y + 1 < gridSize ? tileMap.get(`${x},${y+1}`) : null;
                
                if (rightTile === currentTile || bottomTile === currentTile) {
                    duplicateCount++;
                }
            }
        }
        
        return duplicateCount;
    }
    
    // Optimal tile selection with adjacency constraints
    async selectBestTileWithNeighborConstraint(cell, tileMetadata, usageCount, neighborTiles, settings) {
        const totalCells = settings.gridSize * settings.gridSize;
        const tileCount = tileMetadata.length;
        
        // Dynamically calculate maximum usage count
        const baseMaxUsage = Math.max(1, Math.ceil(totalCells / tileCount));
        const maxUsage = baseMaxUsage + Math.ceil(tileCount / 20);
        
        // Adjacency constraint: exclude tiles with same filename as neighbors
        const excludedTileNames = new Set(neighborTiles);
        
        // Candidate selection based on color difference (excluding neighbor tiles)
        const allCandidates = tileMetadata
            .filter(tile => !excludedTileNames.has(tile.filename)) // exclude neighbors
            .map(tile => ({
                tile: tile,
                distance: this.calculateColorDistance(cell.lab, tile.averageColorLab, settings.colorMatching),
                usage: usageCount.get(tile.filename) || 0
            }))
            .sort((a, b) => a.distance - b.distance);
        
        // Fallback when no candidates available due to adjacency constraints
        if (allCandidates.length === 0) {
            console.warn(`⚠️ No candidates due to adjacency constraints at (${cell.x}, ${cell.y}), relaxing constraints`);
            return this.selectBestTile(cell, tileMetadata, usageCount, settings);
        }
        
        // Prioritize candidates within usage limit
        const limitedCandidates = allCandidates.filter(candidate => candidate.usage < maxUsage);
        
        let candidates;
        if (limitedCandidates.length > 0) {
            candidates = limitedCandidates.slice(0, 10);
        } else {
            // When all candidates have reached the limit
            const minUsage = Math.min(...allCandidates.map(c => c.usage));
            candidates = allCandidates.filter(c => c.usage === minUsage).slice(0, 10);
        }
        
        // Selection considering usage count (emphasizing diversity)
        const minUsageInCandidates = Math.min(...candidates.map(c => c.usage));
        const bestUsageCandidates = candidates.filter(c => c.usage === minUsageInCandidates);
        
        let bestCandidate;
        if (bestUsageCandidates.length === 1) {
            bestCandidate = bestUsageCandidates[0];
        } else {
            // When multiple candidates exist, select based on color distance and randomness
            const sortedByDistance = bestUsageCandidates.sort((a, b) => a.distance - b.distance);
            const topCandidatesCount = Math.max(1, Math.ceil(sortedByDistance.length * 0.4));
            const topCandidates = sortedByDistance.slice(0, topCandidatesCount);
            const randomIndex = Math.floor(Math.random() * topCandidates.length);
            bestCandidate = topCandidates[randomIndex];
        }
        
        // Debug information (to verify adjacency constraint effects)
        if (settings.gridSize >= 60 && neighborTiles.length > 0 && Math.random() < 0.005) {
            console.log(`🔍 Adjacency constraint: (${cell.x},${cell.y}) neighbors:${neighborTiles.length}, excluded:${excludedTileNames.size}, candidates:${candidates.length}, selected:${bestCandidate.tile.filename}`);
        }
        
        return bestCandidate.tile;
    }
    
    // Optimal tile selection (traditional version, for fallback)
    async selectBestTile(cell, tileMetadata, usageCount, settings) {
        const totalCells = settings.gridSize * settings.gridSize;
        const tileCount = tileMetadata.length;
        
        // Dynamically calculate maximum usage count (adjusted according to grid size)
        const baseMaxUsage = Math.max(1, Math.ceil(totalCells / tileCount));
        const maxUsage = baseMaxUsage + Math.ceil(tileCount / 20); // Add some margin
        
        // Candidate selection based on color difference (evaluate all tiles without filtering)
        const allCandidates = tileMetadata.map(tile => ({
            tile: tile,
            distance: this.calculateColorDistance(cell.lab, tile.averageColorLab, settings.colorMatching),
            usage: usageCount.get(tile.filename) || 0
        })).sort((a, b) => a.distance - b.distance);
        
        // Prioritize candidates within usage limit
        const limitedCandidates = allCandidates.filter(candidate => candidate.usage < maxUsage);
        
        let candidates;
        if (limitedCandidates.length > 0) {
            // Select from candidates within usage limit
            candidates = limitedCandidates.slice(0, 10);
        } else {
            // When all candidates have reached the limit, select from those with minimum usage
            const minUsage = Math.min(...allCandidates.map(c => c.usage));
            candidates = allCandidates.filter(c => c.usage === minUsage).slice(0, 10);
        }
        
        // Selection considering usage count (emphasizing diversity)
        // Identify tiles with minimum usage count
        const minUsageInCandidates = Math.min(...candidates.map(c => c.usage));
        const bestUsageCandidates = candidates.filter(c => c.usage === minUsageInCandidates);
        
        let bestCandidate;
        if (bestUsageCandidates.length === 1) {
            // When there's a clear optimal candidate
            bestCandidate = bestUsageCandidates[0];
        } else {
            // When multiple candidates have same usage count, select based on color distance and some randomness
            const sortedByDistance = bestUsageCandidates.sort((a, b) => a.distance - b.distance);
            
            // Randomly select from top 30% (to ensure diversity)
            const topCandidatesCount = Math.max(1, Math.ceil(sortedByDistance.length * 0.3));
            const topCandidates = sortedByDistance.slice(0, topCandidatesCount);
            const randomIndex = Math.floor(Math.random() * topCandidates.length);
            bestCandidate = topCandidates[randomIndex];
        }
        
        // Debug information (track tile selection for 60x60 and above)
        if (settings.gridSize >= 60) {
            const currentUsage = usageCount.get(bestCandidate.tile.filename) || 0;
            const isRepeated = currentUsage > baseMaxUsage;
            
            if (isRepeated && Math.random() < 0.01) { // 1% probability for log output
                console.log(`⚠️ Tile repetition: ${bestCandidate.tile.filename}, usage: ${currentUsage}/${maxUsage}, distance: ${bestCandidate.distance.toFixed(2)}, candidates: ${candidates.length}`);
            }
        }
        
        return bestCandidate.tile;
    }
    
    // Tile drawing
    async drawTileToCanvas(ctx, tile, x, y, size) {
        // Cache check
        const cacheKey = `${tile.filename}_${size}`;
        let tileCanvas = this.tileCache.get(cacheKey);
        
        if (!tileCanvas) {
            // Generate tile image
            tileCanvas = new OffscreenCanvas(size, size);
            const tileCtx = tileCanvas.getContext('2d');
            
            // Restore from compressed data
            const imageData = this.decompressImageData(tile.imageData, size);
            tileCtx.putImageData(imageData, 0, 0);
            
            // Save to cache
            this.manageTileCache(cacheKey, tileCanvas);
        }
        
        // Draw to main canvas
        ctx.drawImage(tileCanvas, x, y);
    }
    
    // Optimization processing
    async optimizeResult(mosaicData, settings) {
        if (settings.quality === 'high') {
            // Color adjustment for high quality
            await this.adjustColors(mosaicData);
        }
        
        this.updateStageProgress(100);
        return mosaicData;
    }
    
    // Color adjustment processing
    async adjustColors(mosaicData) {
        const canvas = mosaicData.canvas;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple color adjustment (contrast enhancement)
        for (let i = 0; i < data.length; i += 4) {
            // Slightly increase contrast
            data[i] = Math.min(255, data[i] * 1.1);     // Red
            data[i + 1] = Math.min(255, data[i + 1] * 1.1); // Green
            data[i + 2] = Math.min(255, data[i + 2] * 1.1); // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Final processing
    async finalizeResult(mosaicData) {
        const canvas = mosaicData.canvas;
        const blob = await canvas.convertToBlob();
        
        const result = {
            imageData: await this.blobToDataURL(blob),
            width: mosaicData.width,
            height: mosaicData.height,
            tilesUsed: mosaicData.tiles.length,
            fileSize: blob.size,
            // Tile information for high-resolution display
            tileMap: mosaicData.tiles,
            gridInfo: {
                gridSize: mosaicData.gridSize || 50,
                tileSize: mosaicData.tileSize || 32
            }
        };
        
        this.updateStageProgress(100);
        return result;
    }
    
    // Utility methods
    calculateCellColor(imageData, startX, startY, width, height) {
        const data = imageData.data;
        const imageWidth = imageData.width;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let y = startY; y < startY + height && y < imageData.height; y++) {
            for (let x = startX; x < startX + width && x < imageData.width; x++) {
                const index = (y * imageWidth + x) * 4;
                r += data[index];
                g += data[index + 1];
                b += data[index + 2];
                count++;
            }
        }
        
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }
    
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
    
    extractDominantColors(imageData) {
        const colorCounts = new Map();
        const data = imageData.data;
        
        // Quantize colors and count
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 32) * 32;
            const g = Math.floor(data[i + 1] / 32) * 32;
            const b = Math.floor(data[i + 2] / 32) * 32;
            const key = `${r},${g},${b}`;
            
            colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }
        
        // Extract top 3 colors
        return Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, count]) => {
                const [r, g, b] = key.split(',').map(Number);
                return { r, g, b, weight: count };
            });
    }
    
    rgbToLab(rgb) {
        // RGB to LAB conversion (simplified)
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        // Simple approximation for performance
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const a = 0.5 * (r - g);
        const bVal = 0.5 * (g - b);
        
        return {
            l: l * 100,
            a: a * 100,
            b: bVal * 100
        };
    }
    
    calculateColorDistance(lab1, lab2, method = 'rgb') {
        if (method === 'lab') {
            // Distance calculation in LAB color space
            const deltaL = lab1.l - lab2.l;
            const deltaA = lab1.a - lab2.a;
            const deltaB = lab1.b - lab2.b;
            return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
        } else {
            // Distance calculation in RGB color space (fast)
            const deltaL = lab1.l - lab2.l;
            return Math.abs(deltaL);
        }
    }
    
    calculateColorRange(colorObjects) {
        if (colorObjects.length === 0) {
            return { min: { r: 0, g: 0, b: 0 }, max: { r: 255, g: 255, b: 255 } };
        }
        
        let minR = 255, minG = 255, minB = 255;
        let maxR = 0, maxG = 0, maxB = 0;
        
        colorObjects.forEach(obj => {
            const color = obj.color;
            minR = Math.min(minR, color.r);
            minG = Math.min(minG, color.g);
            minB = Math.min(minB, color.b);
            maxR = Math.max(maxR, color.r);
            maxG = Math.max(maxG, color.g);
            maxB = Math.max(maxB, color.b);
        });
        
        return {
            min: { r: minR, g: minG, b: minB },
            max: { r: maxR, g: maxG, b: maxB }
        };
    }
    
    findBestColorMatches(targetLab, tileMetadata, maxMatches = 5) {
        const matches = tileMetadata.map(tile => ({
            tile: tile,
            distance: this.calculateColorDistance(targetLab, tile.averageColorLab, 'lab')
        }));
        
        matches.sort((a, b) => a.distance - b.distance);
        return matches.slice(0, maxMatches);
    }
    
    compressImageData(imageData) {
        // Compress in RGB565 format
        const compressed = new Uint16Array(imageData.data.length / 4);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 8);
            const g = Math.floor(data[i + 1] / 4);
            const b = Math.floor(data[i + 2] / 8);
            compressed[i / 4] = (r << 11) | (g << 5) | b;
        }
        
        return compressed;
    }
    
    decompressImageData(compressed, size) {
        const imageData = new ImageData(size, size);
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
    
    manageTileCache(key, canvas) {
        // Cache size management
        if (this.tileCache.size >= this.maxCacheSize) {
            // Remove old entries
            const firstKey = this.tileCache.keys().next().value;
            this.tileCache.delete(firstKey);
        }
        
        this.tileCache.set(key, canvas);
    }
    
    
    async blobToDataURL(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(blob);
        });
    }
    
    // Progress management
    async setStage(stageName) {
        this.currentStage = stageName;
        this.stageProgress = 0;
        this.updateTotalProgress();
    }
    
    updateStageProgress(progress) {
        this.stageProgress = Math.max(0, Math.min(100, progress));
        this.updateTotalProgress();
    }
    
    updateTotalProgress() {
        let completedWeight = 0;
        let currentWeight = 0;
        
        for (const [stage, config] of Object.entries(this.processingStages)) {
            if (stage === this.currentStage) {
                currentWeight = config.weight * (this.stageProgress / 100);
                break;
            }
            completedWeight += config.weight;
        }
        
        this.totalProgress = completedWeight + currentWeight;
        
        // Send progress update
        this.sendProgress({
            progress: this.totalProgress,
            stage: this.processingStages[this.currentStage]?.labelKey || '',
            info: `${Math.round(this.stageProgress)}%`,
            elapsedTime: Date.now() - this.startTime,
            remainingTime: this.estimateRemainingTime()
        });
    }
    
    estimateRemainingTime() {
        if (this.totalProgress === 0) return 0;
        
        const elapsed = Date.now() - this.startTime;
        const remaining = (elapsed / this.totalProgress) * (100 - this.totalProgress);
        return Math.max(0, remaining);
    }
    
    // Control methods
    async checkPauseCancel() {
        if (this.isCancelled) {
            throw new Error('Processing was cancelled');
        }
        
        while (this.isPaused && !this.isCancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    pauseProcessing() {
        this.isPaused = true;
        this.sendMessage({ type: 'paused' });
    }
    
    resumeProcessing() {
        this.isPaused = false;
        this.sendMessage({ type: 'resumed' });
    }
    
    cancelProcessing() {
        this.isCancelled = true;
        this.isPaused = false;
    }
    
    async checkMemoryPressure() {
        // Memory usage check (simple implementation)
        if (this.tileCache.size > this.maxCacheSize * 0.8) {
            // Cache clear
            const keysToDelete = Array.from(this.tileCache.keys()).slice(0, Math.floor(this.maxCacheSize * 0.3));
            keysToDelete.forEach(key => this.tileCache.delete(key));
        }
    }
    
    cleanup() {
        this.tileCache.clear();
        this.currentStage = null;
        this.totalProgress = 0;
        this.stageProgress = 0;
    }
    
    // Communication methods
    sendProgress(data) {
        this.sendMessage({ type: 'progress', data });
    }
    
    async sendPreviewUpdate(canvas) {
        const blob = await canvas.convertToBlob();
        const dataURL = await this.blobToDataURL(blob);
        
        this.sendMessage({
            type: 'preview',
            data: {
                preview: dataURL,
                timestamp: Date.now()
            }
        });
    }
    
    sendComplete(result) {
        this.sendMessage({
            type: 'complete',
            data: { result }
        });
    }
    
    sendError(error) {
        this.sendMessage({
            type: 'error',
            data: { error }
        });
    }
    
    sendMessage(message) {
        self.postMessage(message);
    }
}

// Worker initialization
const worker = new MosaicWorker();

// Message handler setup
self.onmessage = function(event) {
    worker.handleMessage(event);
};

// Error handler
self.onerror = function(error) {
    worker.sendError('Worker error: ' + error.message);
};

console.log('🔧 MosaicWorker initialized');