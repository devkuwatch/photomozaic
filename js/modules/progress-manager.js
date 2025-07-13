// Progress Manager Module
// Progress tracking and progress bar control

export class ProgressManager {
    constructor(languageManager = null) {
        this.languageManager = languageManager;
        this.isActive = false;
        this.isMinimized = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        
        this.progress = {
            current: 0,
            stage: '',
            info: '',
            elapsedTime: 0,
            remainingTime: 0
        };
        
        this.stages = {
            LOADING_SOURCE: { weight: 10, labelKey: 'stage-loading-source' },
            LOADING_TILES: { weight: 20, labelKey: 'stage-loading-tiles' },
            ANALYZING_COLORS: { weight: 15, labelKey: 'stage-analyzing-colors' },
            BUILDING_INDEX: { weight: 10, labelKey: 'stage-building-index' },
            GENERATING_MOSAIC: { weight: 40, labelKey: 'stage-generating-mosaic' },
            OPTIMIZING: { weight: 3, labelKey: 'stage-optimizing' },
            FINALIZING: { weight: 2, labelKey: 'stage-finalizing' }
        };
        
        this.callbacks = {
            onStart: null,
            onUpdate: null,
            onComplete: null,
            onCancel: null,
            onPause: null,
            onResume: null
        };
    }
    
    // Get translated text
    getTranslatedText(key, fallback) {
        if (this.languageManager && this.languageManager.translate) {
            return this.languageManager.translate(key, fallback);
        }
        return fallback;
    }
    
    // Get stage label
    getStageLabel(stageKey) {
        const stage = this.stages[stageKey];
        if (!stage) return stageKey;
        
        return this.getTranslatedText(stage.labelKey, stage.labelKey);
    }
    
    // Start progress
    start() {
        this.isActive = true;
        this.isMinimized = false;
        this.isPaused = false;
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        
        this.progress = {
            current: 0,
            stage: this.getTranslatedText('stage-loading-source', 'Loading source image...'),
            info: '0%',
            elapsedTime: 0,
            remainingTime: 0
        };
        
        if (this.callbacks.onStart) {
            this.callbacks.onStart();
        }
        
        // Send initial progress immediately
        if (this.callbacks.onUpdate) {
            this.callbacks.onUpdate(this.progress);
        }
        
        console.log('📊 Progress tracking started');
    }
    
    // Update progress
    updateProgress(data) {
        if (!this.isActive) return;
        
        this.progress = {
            current: data.progress || 0,
            stage: data.stage || '',
            info: data.info || '',
            elapsedTime: this.calculateElapsedTime(),
            remainingTime: this.calculateRemainingTime(data.progress || 0)
        };
        
        if (this.callbacks.onUpdate) {
            this.callbacks.onUpdate(this.progress);
        }
    }
    
    // Complete progress
    complete() {
        this.isActive = false;
        this.progress.current = 100;
        this.progress.stage = this.getTranslatedText('stage-complete', '完了');
        this.progress.info = this.getTranslatedText('mosaic-complete', 'Mosaic generation completed');
        this.progress.elapsedTime = this.calculateElapsedTime();
        this.progress.remainingTime = 0;
        
        if (this.callbacks.onComplete) {
            this.callbacks.onComplete(this.progress);
        }
        
        console.log('✅ Progress tracking completed');
    }
    
    // Cancel progress
    cancel() {
        this.isActive = false;
        this.progress.stage = this.getTranslatedText('stage-cancelled', 'Cancelled');
        this.progress.info = this.getTranslatedText('notification-processing-cancelled', 'Processing was cancelled');
        
        if (this.callbacks.onCancel) {
            this.callbacks.onCancel(this.progress);
        }
        
        console.log('❌ Progress tracking cancelled');
    }
    
    // Pause progress
    pause() {
        if (!this.isActive || this.isPaused) return;
        
        this.isPaused = true;
        this.pausedTime = Date.now();
        
        if (this.callbacks.onPause) {
            this.callbacks.onPause(this.progress);
        }
        
        console.log('⏸️ Progress tracking paused');
    }
    
    // Resume progress
    resume() {
        if (!this.isActive || !this.isPaused) return;
        
        this.isPaused = false;
        this.totalPausedTime += Date.now() - this.pausedTime;
        this.pausedTime = 0;
        
        if (this.callbacks.onResume) {
            this.callbacks.onResume(this.progress);
        }
        
        console.log('▶️ Progress tracking resumed');
    }
    
    // Minimize
    minimize() {
        this.isMinimized = true;
        console.log('➖ Progress display minimized');
    }
    
    // Restore
    restore() {
        this.isMinimized = false;
        console.log('📈 Progress display restored');
    }
    
    // Calculate elapsed time
    calculateElapsedTime() {
        if (!this.startTime) return 0;
        
        const currentTime = Date.now();
        const pausedTime = this.isPaused ? 
            (currentTime - this.pausedTime) : 0;
        
        return currentTime - this.startTime - this.totalPausedTime - pausedTime;
    }
    
    // Calculate remaining time
    calculateRemainingTime(progress) {
        if (!this.startTime || progress === 0) return 0;
        
        const elapsed = this.calculateElapsedTime();
        const remaining = (elapsed / progress) * (100 - progress);
        
        return Math.max(0, remaining);
    }
    
    // Format time
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
    
    // Get progress data
    getProgress() {
        return {
            ...this.progress,
            isActive: this.isActive,
            isMinimized: this.isMinimized,
            isPaused: this.isPaused,
            formattedElapsedTime: this.formatTime(this.progress.elapsedTime),
            formattedRemainingTime: this.formatTime(this.progress.remainingTime)
        };
    }
    
    // Get statistics
    getStatistics() {
        return {
            isActive: this.isActive,
            isMinimized: this.isMinimized,
            isPaused: this.isPaused,
            startTime: this.startTime,
            totalPausedTime: this.totalPausedTime,
            currentProgress: this.progress.current,
            elapsedTime: this.progress.elapsedTime,
            remainingTime: this.progress.remainingTime,
            averageSpeed: this.calculateAverageSpeed()
        };
    }
    
    // Calculate average processing speed
    calculateAverageSpeed() {
        if (!this.startTime || this.progress.current === 0) return 0;
        
        const elapsed = this.calculateElapsedTime();
        return elapsed > 0 ? (this.progress.current / elapsed) * 1000 : 0; // % per second
    }
    
    // Estimated completion time
    getEstimatedCompletionTime() {
        if (!this.startTime) return null;
        
        const remaining = this.calculateRemainingTime(this.progress.current);
        return new Date(Date.now() + remaining);
    }
    
    // Generate progress report
    generateReport() {
        const stats = this.getStatistics();
        const completion = this.getEstimatedCompletionTime();
        
        return {
            status: this.isActive ? 'active' : 'inactive',
            progress: this.progress.current,
            stage: this.progress.stage,
            elapsedTime: this.formatTime(stats.elapsedTime),
            remainingTime: this.formatTime(stats.remainingTime),
            averageSpeed: `${stats.averageSpeed.toFixed(2)}%/sec`,
            estimatedCompletion: completion ? completion.toLocaleTimeString() : null,
            pausedTime: this.formatTime(stats.totalPausedTime),
            isMinimized: this.isMinimized,
            isPaused: this.isPaused
        };
    }
    
    // Callback configuration
    onStart(callback) {
        this.callbacks.onStart = callback;
    }
    
    onUpdate(callback) {
        this.callbacks.onUpdate = callback;
    }
    
    onComplete(callback) {
        this.callbacks.onComplete = callback;
    }
    
    onCancel(callback) {
        this.callbacks.onCancel = callback;
    }
    
    onPause(callback) {
        this.callbacks.onPause = callback;
    }
    
    onResume(callback) {
        this.callbacks.onResume = callback;
    }
    
    // Check warning level
    checkWarningLevel() {
        const elapsed = this.calculateElapsedTime();
        const minutes = elapsed / (1000 * 60);
        
        if (minutes > 10) {
            return 'long_running';
        } else if (minutes > 5) {
            return 'moderate';
        } else {
            return 'normal';
        }
    }
    
    // Detect anomalies
    detectAnomalies() {
        const anomalies = [];
        
        // Progress is stagnant
        if (this.isActive && !this.isPaused) {
            const stagnantTime = 30000; // 30 seconds
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
            
            if (timeSinceLastUpdate > stagnantTime) {
                anomalies.push({
                    type: 'stagnant_progress',
                    message: this.getTranslatedText('progress-stagnant', 'Progress has not been updated for a long time'),
                    duration: timeSinceLastUpdate
                });
            }
        }
        
        // Abnormally slow processing
        const speed = this.calculateAverageSpeed();
        if (speed > 0 && speed < 0.1) { // Less than 0.1%/sec
            anomalies.push({
                type: 'slow_processing',
                message: this.getTranslatedText('processing-slow', 'Processing speed is abnormally slow'),
                speed: speed
            });
        }
        
        return anomalies;
    }
    
    // Reset
    reset() {
        this.isActive = false;
        this.isMinimized = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.totalPausedTime = 0;
        
        this.progress = {
            current: 0,
            stage: '',
            info: '',
            elapsedTime: 0,
            remainingTime: 0
        };
        
        console.log('🔄 Progress manager reset');
    }
    
    // Cleanup
    cleanup() {
        this.reset();
        this.callbacks = {
            onStart: null,
            onUpdate: null,
            onComplete: null,
            onCancel: null,
            onPause: null,
            onResume: null
        };
        
        console.log('🧹 Progress manager cleaned up');
    }
}