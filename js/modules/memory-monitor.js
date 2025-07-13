// Memory Monitor Module
// Memory usage monitoring and cleanup

export class MemoryMonitor {
    constructor() {
        this.maxMemoryUsage = 512 * 1024 * 1024; // 512MB limit
        this.warningThreshold = 0.7; // Warning at 70%
        this.criticalThreshold = 0.85; // Critical handling at 85%
        this.monitoringInterval = null;
        this.isMonitoring = false;
        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.callbacks = {
            onMemoryUpdate: null,
            onWarning: null,
            onCritical: null
        };
    }
    
    // Start monitoring
    startMonitoring(intervalMs = 2000) {
        if (this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemory();
        }, intervalMs);
        
        console.log('🔍 Memory monitoring started');
    }
    
    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.isMonitoring = false;
        console.log('🔍 Memory monitoring stopped');
    }
    
    // Check memory usage
    checkMemory() {
        const memoryInfo = this.getMemoryInfo();
        const status = this.getMemoryStatus(memoryInfo);
        
        // Add to history
        this.addToHistory(memoryInfo);
        
        // Execute callback
        if (this.callbacks.onMemoryUpdate) {
            this.callbacks.onMemoryUpdate(memoryInfo.usedJSHeapSize, status);
        }
        
        // Handle based on status
        switch (status) {
            case 'critical':
                this.handleCriticalMemory(memoryInfo);
                break;
            case 'warning':
                this.handleWarningMemory(memoryInfo);
                break;
        }
        
        return { memoryInfo, status };
    }
    
    // Get memory information
    getMemoryInfo() {
        if (performance && performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
        } else {
            // Fallback: estimated values
            return {
                usedJSHeapSize: this.estimateMemoryUsage(),
                totalJSHeapSize: this.maxMemoryUsage,
                jsHeapSizeLimit: this.maxMemoryUsage,
                timestamp: Date.now()
            };
        }
    }
    
    // Estimate memory usage
    estimateMemoryUsage() {
        // Basic estimate (differs from actual usage)
        const baseUsage = 50 * 1024 * 1024; // 50MB base
        
        // Estimation based on DOM element count
        const domElements = document.querySelectorAll('*').length;
        const domMemory = domElements * 1024; // 1KB per element
        
        // Estimation based on canvas elements
        const canvasElements = document.querySelectorAll('canvas');
        let canvasMemory = 0;
        
        canvasElements.forEach(canvas => {
            if (canvas.width && canvas.height) {
                canvasMemory += canvas.width * canvas.height * 4; // RGBA
            }
        });
        
        return baseUsage + domMemory + canvasMemory;
    }
    
    // Determine memory status
    getMemoryStatus(memoryInfo) {
        const ratio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        
        if (ratio >= this.criticalThreshold) {
            return 'critical';
        } else if (ratio >= this.warningThreshold) {
            return 'warning';
        } else {
            return 'normal';
        }
    }
    
    // Handle warning level
    handleWarningMemory(memoryInfo) {
        console.warn('⚠️ Memory usage warning:', this.formatMemorySize(memoryInfo.usedJSHeapSize));
        
        // Perform light cleanup
        this.performLightCleanup();
        
        if (this.callbacks.onWarning) {
            this.callbacks.onWarning(memoryInfo);
        }
    }
    
    // Handle critical level
    handleCriticalMemory(memoryInfo) {
        console.error('🚨 Critical memory usage:', this.formatMemorySize(memoryInfo.usedJSHeapSize));
        
        // Perform aggressive cleanup
        this.performAggressiveCleanup();
        
        if (this.callbacks.onCritical) {
            this.callbacks.onCritical(memoryInfo);
        }
    }
    
    // Light cleanup
    performLightCleanup() {
        // Clear unused canvases
        this.clearUnusedCanvases();
        
        // Cleanup old event listeners
        this.cleanupEventListeners();
        
        // Encourage garbage collection
        this.suggestGarbageCollection();
    }
    
    // Aggressive cleanup
    performAggressiveCleanup() {
        // Also perform light cleanup
        this.performLightCleanup();
        
        // Clear all caches
        this.clearAllCaches();
        
        // Remove unused DOM nodes
        this.removeUnusedDOMNodes();
        
        // Force garbage collection
        this.forceGarbageCollection();
    }
    
    // Clear unused canvases
    clearUnusedCanvases() {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.style.display === 'none' || canvas.offsetParent === null) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        });
    }
    
    // Event listener cleanup
    cleanupEventListeners() {
        // Implementation depends on specific application
        // General cleanup processing
        if (window.photoMosaicApp) {
            // Application-specific cleanup
        }
    }
    
    // Clear all caches
    clearAllCaches() {
        // Application-specific cache clearing
        if (window.photoMosaicApp) {
            const app = window.photoMosaicApp;
            
            // Clear tile manager cache
            if (app.tileManager) {
                app.tileManager.cleanup();
            }
            
            // Image processor cleanup
            if (app.imageProcessor) {
                // Implement as needed
            }
        }
    }
    
    // Remove unused DOM nodes
    removeUnusedDOMNodes() {
        // Clear hidden preview elements
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(element => {
            if (element.tagName === 'IMG' || element.tagName === 'CANVAS') {
                element.src = '';
                if (element.getContext) {
                    const ctx = element.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, element.width, element.height);
                    }
                }
            }
        });
    }
    
    // Encourage garbage collection
    suggestGarbageCollection() {
        // Create and release many temporary variables to encourage GC
        const temp = new Array(1000).fill(null);
        temp.length = 0;
        
        // Add small wait time
        setTimeout(() => {
            // Do nothing (give time for GC)
        }, 10);
    }
    
    // Force garbage collection
    forceGarbageCollection() {
        // Available only in development environment
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        // Encourage GC using general methods
        this.suggestGarbageCollection();
    }
    
    // Add to history
    addToHistory(memoryInfo) {
        this.memoryHistory.push({
            ...memoryInfo,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }
    
    // Analyze memory usage trend
    analyzeTrend() {
        if (this.memoryHistory.length < 10) {
            return 'insufficient_data';
        }
        
        const recent = this.memoryHistory.slice(-10);
        const older = this.memoryHistory.slice(-20, -10);
        
        const recentAvg = recent.reduce((sum, item) => sum + item.usedJSHeapSize, 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + item.usedJSHeapSize, 0) / older.length;
        
        const trend = recentAvg - olderAvg;
        const trendPercentage = (trend / olderAvg) * 100;
        
        if (trendPercentage > 10) {
            return 'increasing';
        } else if (trendPercentage < -10) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }
    
    // Get statistics
    getStatistics() {
        const currentMemory = this.getMemoryInfo();
        const trend = this.analyzeTrend();
        
        return {
            current: currentMemory,
            status: this.getMemoryStatus(currentMemory),
            trend: trend,
            historySize: this.memoryHistory.length,
            maxMemory: this.maxMemoryUsage,
            warningThreshold: this.warningThreshold,
            criticalThreshold: this.criticalThreshold
        };
    }
    
    // Format memory size
    formatMemorySize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Set callback
    set onMemoryUpdate(callback) {
        this.callbacks.onMemoryUpdate = callback;
    }
    
    set onWarning(callback) {
        this.callbacks.onWarning = callback;
    }
    
    set onCritical(callback) {
        this.callbacks.onCritical = callback;
    }
    
    // Manual memory pressure check
    async checkMemoryPressure() {
        const { memoryInfo, status } = this.checkMemory();
        
        if (status === 'critical') {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
        }
        
        return false;
    }
    
    // Cleanup
    cleanup() {
        this.stopMonitoring();
        this.memoryHistory = [];
        this.callbacks = {
            onMemoryUpdate: null,
            onWarning: null,
            onCritical: null
        };
    }
}