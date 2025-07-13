// Language Manager Module
// Multi-language support system

export class LanguageManager {
    constructor() {
        this.currentLanguage = 'ja'; // Default to Japanese
        this.supportedLanguages = ['ja', 'en'];
        this.translations = {};
        this.listeners = new Set();
        
        this.initializeTranslations();
        this.loadStoredLanguage();
    }
    
    // Initialize translation data
    initializeTranslations() {
        this.translations = {
            ja: {
                // Header
                'app-title': 'PhotoMosaic Generator',
                'memory-label': 'メモリ:',
                'tile-count-label': 'タイル:',
                'tile-count-unit': '枚',
                
                // File Selection Section
                'source-image-title': '🖼️ ソース画像',
                'source-file-label': '画像を選択してください',
                'tile-images-title': '🧩 タイル画像',
                'tile-files-label': '複数の画像を選択してください',
                'tiles-selected': '選択済み:',
                'tiles-processed': '処理済み:',
                'parallel-processing': '並列処理:',
                'parallel-enabled': '有効',
                
                // Settings Section
                'settings-title': '⚙️ 設定',
                'grid-size-label': 'グリッドサイズ:',
                'tile-size-label': 'タイルサイズ:',
                'quality-setting-label': '品質設定:',
                'quality-low': '低品質（高速）',
                'quality-medium': '中品質（標準）',
                'quality-high': '高品質（高精度）',
                'color-matching-label': '色マッチング:',
                'color-rgb': 'RGB',
                'color-lab': 'LAB（高精度）',
                'neighbor-diversity-label': '隣接多様性:',
                'neighbor-enabled': '有効（隣接タイルは異なる画像）',
                'neighbor-disabled': '無効（従来の処理）',
                'generate-btn': '🚀 モザイク生成',
                
                // Result Section
                'result-title': '🎨 結果',
                'zoom-in': '拡大',
                'zoom-out': '縮小',
                'fit-window': 'ウィンドウに合わせる',
                'actual-size': '実際のサイズ',
                'download-btn': '完全なモザイク画像をダウンロード（拡大状態に関係なく全体画像を保存）',
                'share-btn': '画像を共有',
                'placeholder-text': 'モザイク画像がここに表示されます',
                
                // Progress
                'progress-title': '🔄 モザイク生成中',
                'progress-minimize': '最小化',
                'current-stage-label': '現在の処理:',
                'progress-info-label': '進捗:',
                'elapsed-time-label': '経過時間:',
                'remaining-time-label': '残り時間:',
                'preview-title': 'リアルタイムプレビュー',
                'pause-btn': '⏸️ 一時停止',
                'resume-btn': '▶️ 再開',
                'cancel-btn': '❌ キャンセル',
                'background-btn': '🔙 バックグラウンド',
                'generating-text': '生成中...',
                'restore-progress': '詳細を表示',
                
                // Processing Stages
                'stage-loading-source': 'ソース画像を読み込み中...',
                'stage-loading-tiles': 'タイル画像を読み込み中...',
                'stage-converting-tiles': 'タイル画像を変換中...',
                'stage-analyzing-colors': '色分析中...',
                'stage-building-index': '検索インデックス構築中...',
                'stage-generating-mosaic': 'モザイク生成中...',
                'stage-optimizing': '最適化中...',
                'stage-finalizing': '最終処理中...',
                
                // Notification Messages
                'notification-processing-start': 'モザイク生成を開始しました',
                'notification-processing-complete': 'モザイク生成が完了しました',
                'notification-processing-cancelled': '処理がキャンセルされました',
                'notification-error': 'エラーが発生しました',
                'notification-memory-warning': 'メモリ使用量が制限に近づいています',
                
                // Language Toggle
                'language-toggle': '🌐 English',
                'language-toggle-title': '言語を英語に切り替え',
                'language-switched': '言語を日本語に切り替えました',
                
                // Notification Messages (Detailed)
                'loading-source-image': 'ソース画像を読み込んでいます...',
                'source-image-loaded': 'ソース画像を読み込みました',
                'source-image-load-failed': 'ソース画像の読み込みに失敗しました',
                'processing-tile-images': '枚のタイル画像を処理しています...',
                'tile-images-load-failed': 'タイル画像の読み込みに失敗しました',
                'tiles-processed-time': '枚のタイル画像を処理しました',
                'parallel-processing-progress': 'タイル画像を並列処理中...',
                'neighbor-diversity-enabled': '隣接多様性が有効になりました - 隣り合うタイルは異なる画像を使用します',
                'neighbor-diversity-disabled': '隣接多様性が無効になりました - 従来の処理を使用します',
                'mosaic-generation-error': 'モザイク生成でエラーが発生しました',
                'processing-error': '処理中にエラーが発生しました',
                'mosaic-complete': 'モザイク生成が完了しました！',
                'high-res-tiles-info': 'ズーム時に高解像度タイルが表示されます',
                'generating-high-res': '高解像度画像を生成しています...',
                'tile-size-adjusted': 'グリッドサイズが大きいため、タイルサイズを調整します',
                'image-size-limit': '画像サイズがブラウザの制限を超えています。グリッドサイズを小さくしてください。',
                'high-res-progress': '高解像度生成中...',
                'high-res-complete': '高解像度画像の生成が完了しました',
                'no-download-image': 'ダウンロードできる画像がありません',
                'canvas-init-failed': 'キャンバスの初期化に失敗しました',
                'download-success': 'をダウンロードしました',
                'image-download-failed': '画像のダウンロードに失敗しました',
                'download-link-failed': 'ダウンロードリンクの作成に失敗しました',
                'image-generation-failed': '画像の生成に失敗しました',
                'download-failed': 'ダウンロードに失敗しました',
                'generating-1to1': '1:1サイズ画像を生成しています...',
                '1to1-complete': '1:1サイズ画像の生成が完了しました',
                '1to1-failed': '1:1サイズ画像の生成に失敗しました',
                'no-share-image': '共有できる画像がありません',
                'copy-to-clipboard': '画像をクリップボードにコピーしました',
                'share-failed': '共有に失敗しました',
                'download-success-detailed': 'ファイルをダウンロードしました',
                
                // Download Dialog
                'download-type-prompt': '保存する画像の種類を選択してください：\n\n1: 高解像度（各タイル256px）- 最高品質、大容量\n2: 1:1サイズ（Worker生成画像）- 標準品質、中容量\n3: 標準サイズ（同じく完全画像）- 標準品質、中容量\n\n※全ての選択肢で完全なモザイク画像を保存します\n※拡大状態に関係なく、常に全体画像を保存します\n\n番号を入力してください (1-3):',
                'high-res-image': '高解像度画像',
                '1to1-image': '1:1サイズ画像',
                'display-image-full': '表示画像（完全版）',
                
                // Parallel Processing Info
                'parallel-cores': 'コア',
                'parallel-cores-tooltip': 'コアを使用した並列処理で高速化',
                
                // Progress Management
                'stage-complete': '完了',
                'stage-cancelled': 'キャンセル',
                'progress-stagnant': '進捗が長時間更新されていません',
                'processing-slow': '処理速度が異常に遅くなっています',
                'initializing': '初期化中...',
                
                // File Loading Progress
                'file-loading-title': 'ファイル読み込み中',
                'file-loading-source': 'ソース画像を読み込み中...',
                'file-loading-tiles': 'タイル画像を読み込み中...',
                'files-processed': 'ファイル処理済み',
                'files-per-second': '枚/秒',
                'loading-complete': '読み込み完了',
                'loading-cancelled': '読み込みがキャンセルされました'
            },
            
            en: {
                // Header
                'app-title': 'PhotoMosaic Generator',
                'memory-label': 'Memory:',
                'tile-count-label': 'Tiles:',
                'tile-count-unit': '',
                
                // File Selection Section
                'source-image-title': '🖼️ Source Image',
                'source-file-label': 'Select an image',
                'tile-images-title': '🧩 Tile Images',
                'tile-files-label': 'Select multiple images',
                'tiles-selected': 'Selected:',
                'tiles-processed': 'Processed:',
                'parallel-processing': 'Parallel:',
                'parallel-enabled': 'Enabled',
                
                // Settings Section
                'settings-title': '⚙️ Settings',
                'grid-size-label': 'Grid Size:',
                'tile-size-label': 'Tile Size:',
                'quality-setting-label': 'Quality:',
                'quality-low': 'Low (Fast)',
                'quality-medium': 'Medium (Standard)',
                'quality-high': 'High (Precise)',
                'color-matching-label': 'Color Matching:',
                'color-rgb': 'RGB',
                'color-lab': 'LAB (High Precision)',
                'neighbor-diversity-label': 'Neighbor Diversity:',
                'neighbor-enabled': 'Enabled (Adjacent tiles use different images)',
                'neighbor-disabled': 'Disabled (Traditional processing)',
                'generate-btn': '🚀 Generate Mosaic',
                
                // Result Section
                'result-title': '🎨 Result',
                'zoom-in': 'Zoom In',
                'zoom-out': 'Zoom Out',
                'fit-window': 'Fit to Window',
                'actual-size': 'Actual Size',
                'download-btn': 'Download complete mosaic image (saves full image regardless of zoom state)',
                'share-btn': 'Share Image',
                'placeholder-text': 'Mosaic image will be displayed here',
                
                // Progress
                'progress-title': '🔄 Generating Mosaic',
                'progress-minimize': 'Minimize',
                'current-stage-label': 'Current Stage:',
                'progress-info-label': 'Progress:',
                'elapsed-time-label': 'Elapsed:',
                'remaining-time-label': 'Remaining:',
                'preview-title': 'Real-time Preview',
                'pause-btn': '⏸️ Pause',
                'resume-btn': '▶️ Resume',
                'cancel-btn': '❌ Cancel',
                'background-btn': '🔙 Background',
                'generating-text': 'Generating...',
                'restore-progress': 'Show Details',
                
                // Processing Stages
                'stage-loading-source': 'Loading source image...',
                'stage-loading-tiles': 'Loading tile images...',
                'stage-converting-tiles': 'Converting tile images...',
                'stage-analyzing-colors': 'Analyzing colors...',
                'stage-building-index': 'Building search index...',
                'stage-generating-mosaic': 'Generating mosaic...',
                'stage-optimizing': 'Optimizing...',
                'stage-finalizing': 'Finalizing...',
                
                // Notification Messages
                'notification-processing-start': 'Mosaic generation started',
                'notification-processing-complete': 'Mosaic generation completed',
                'notification-processing-cancelled': 'Processing cancelled',
                'notification-error': 'An error occurred',
                'notification-memory-warning': 'Memory usage approaching limit',
                
                // Language Toggle
                'language-toggle': '🌐 日本語',
                'language-toggle-title': 'Switch to Japanese',
                'language-switched': 'Language switched to English',
                
                // Notification Messages (Detailed)
                'loading-source-image': 'Loading source image...',
                'source-image-loaded': 'Source image loaded',
                'source-image-load-failed': 'Failed to load source image',
                'processing-tile-images': ' tile images are being processed...',
                'tile-images-load-failed': 'Failed to load tile images',
                'tiles-processed-time': ' tile images processed',
                'parallel-processing-progress': 'Processing tile images in parallel...',
                'neighbor-diversity-enabled': 'Neighbor diversity enabled - adjacent tiles will use different images',
                'neighbor-diversity-disabled': 'Neighbor diversity disabled - using traditional processing',
                'mosaic-generation-error': 'An error occurred during mosaic generation',
                'processing-error': 'An error occurred during processing',
                'mosaic-complete': 'Mosaic generation completed!',
                'high-res-tiles-info': 'High-resolution tiles will be displayed when zoomed',
                'generating-high-res': 'Generating high-resolution image...',
                'tile-size-adjusted': 'Tile size adjusted due to large grid size',
                'image-size-limit': 'Image size exceeds browser limits. Please reduce grid size.',
                'high-res-progress': 'Generating high-resolution...',
                'high-res-complete': 'High-resolution image generation completed',
                'no-download-image': 'No image available for download',
                'canvas-init-failed': 'Failed to initialize canvas',
                'download-success': ' downloaded',
                'image-download-failed': 'Failed to download image',
                'download-link-failed': 'Failed to create download link',
                'image-generation-failed': 'Failed to generate image',
                'download-failed': 'Download failed',
                'generating-1to1': 'Generating 1:1 size image...',
                '1to1-complete': '1:1 size image generation completed',
                '1to1-failed': '1:1 size image generation failed',
                'no-share-image': 'No image available for sharing',
                'copy-to-clipboard': 'Image copied to clipboard',
                'share-failed': 'Sharing failed',
                'download-success-detailed': 'File downloaded successfully',
                
                // Download Dialog
                'download-type-prompt': 'Select the type of image to save:\n\n1: High Resolution (256px per tile) - Best quality, large file\n2: 1:1 Size (Worker-generated image) - Standard quality, medium file\n3: Standard Size (full image) - Standard quality, medium file\n\n※All options save the complete mosaic image\n※Full image is always saved regardless of zoom state\n\nEnter number (1-3):',
                'high-res-image': 'High Resolution Image',
                '1to1-image': '1:1 Size Image',
                'display-image-full': 'Display Image (Full)',
                
                // Parallel Processing Info
                'parallel-cores': 'cores',
                'parallel-cores-tooltip': 'cores for accelerated parallel processing',
                
                // Progress Management
                'stage-complete': 'Complete',
                'stage-cancelled': 'Cancelled',
                'progress-stagnant': 'Progress has not been updated for a long time',
                'processing-slow': 'Processing speed is abnormally slow',
                'initializing': 'Initializing...',
                
                // File Loading Progress
                'file-loading-title': 'Loading Files',
                'file-loading-source': 'Loading source image...',
                'file-loading-tiles': 'Loading tile images...',
                'files-processed': 'files processed',
                'files-per-second': 'files/sec',
                'loading-complete': 'Loading complete',
                'loading-cancelled': 'Loading was cancelled'
            }
        };
    }
    
    // Load stored language settings
    loadStoredLanguage() {
        const stored = localStorage.getItem('photomosaic-language');
        if (stored && this.supportedLanguages.includes(stored)) {
            this.currentLanguage = stored;
        }
    }
    
    // Save language settings
    saveLanguage() {
        localStorage.setItem('photomosaic-language', this.currentLanguage);
    }
    
    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    // Get list of supported languages
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    // Get translated text
    translate(key, fallback = key) {
        const translations = this.translations[this.currentLanguage];
        return translations?.[key] || fallback;
    }
    
    // Switch language
    switchLanguage(language) {
        if (!this.supportedLanguages.includes(language)) {
            console.warn(`Unsupported language: ${language}`);
            return false;
        }
        
        const oldLanguage = this.currentLanguage;
        this.currentLanguage = language;
        this.saveLanguage();
        
        // Notify listeners
        this.notifyListeners(language, oldLanguage);
        
        console.log(`🌐 Language switched: ${oldLanguage} → ${language}`);
        return true;
    }
    
    // Toggle language
    toggleLanguage() {
        const currentIndex = this.supportedLanguages.indexOf(this.currentLanguage);
        const nextIndex = (currentIndex + 1) % this.supportedLanguages.length;
        const nextLanguage = this.supportedLanguages[nextIndex];
        
        return this.switchLanguage(nextLanguage);
    }
    
    // Add language change listener
    addLanguageChangeListener(listener) {
        this.listeners.add(listener);
    }
    
    // Remove language change listener
    removeLanguageChangeListener(listener) {
        this.listeners.delete(listener);
    }
    
    // Notify listeners
    notifyListeners(newLanguage, oldLanguage) {
        for (const listener of this.listeners) {
            try {
                listener(newLanguage, oldLanguage);
            } catch (error) {
                console.error('Language change listener error:', error);
            }
        }
    }
    
    // Apply translations to HTML page
    translatePage() {
        // Translate elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            // Apply according to element type
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translation;
            } else if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.hasAttribute('title')) {
                element.title = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Handle special elements
        this.translateSpecialElements();
    }
    
    // Handle special element translations
    translateSpecialElements() {
        // File input labels
        const sourceLabel = document.querySelector('label[for="source-file"] .file-text');
        if (sourceLabel) {
            sourceLabel.textContent = this.translate('source-file-label');
        }
        
        const tileLabel = document.querySelector('label[for="tile-files"] .file-text');
        if (tileLabel) {
            tileLabel.textContent = this.translate('tile-files-label');
        }
        
        // Placeholder text
        const placeholder = document.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.textContent = this.translate('placeholder-text');
        }
        
        // Update language toggle button text
        this.updateLanguageToggleButton();
    }
    
    // Update language toggle button
    updateLanguageToggleButton() {
        const button = document.getElementById('language-toggle');
        if (button) {
            button.textContent = this.translate('language-toggle');
            button.title = this.translate('language-toggle-title');
        }
    }
    
    // Translate dynamic text (progress, etc.)
    translateDynamicText(key, fallback) {
        return this.translate(key, fallback);
    }
    
    // Translation statistics
    getStatistics() {
        const currentTranslations = this.translations[this.currentLanguage];
        const totalKeys = Object.keys(currentTranslations || {}).length;
        
        return {
            currentLanguage: this.currentLanguage,
            supportedLanguages: this.supportedLanguages,
            totalTranslationKeys: totalKeys,
            listenersCount: this.listeners.size
        };
    }
    
    // Cleanup
    cleanup() {
        this.listeners.clear();
        console.log('🌐 Language manager cleaned up');
    }
}