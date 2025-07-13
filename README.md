# 📸 PhotoMosaic Generator

[![PWA](https://img.shields.io/badge/PWA-enabled-blue)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Performance](https://img.shields.io/badge/Performance-Optimized-green)](#performance)
[![Memory](https://img.shields.io/badge/Memory-512MB%20Limit-orange)](#memory-optimization)
[![Language](https://img.shields.io/badge/Language-Japanese%20%7C%20English-blue)](#internationalization)

A high-performance web application for creating stunning photo mosaics from your image collections. Built with memory optimization and advanced algorithms following John Carmack and Donald Knuth design principles.

## ✨ Features

### 🎨 Core Functionality
- **Photo Mosaic Generation**: Create beautiful mosaics using source images and tile collections
- **High-Resolution Display**: Automatic high-resolution mode (256px/tile) when zoomed 2x or higher
- **Neighbor Diversity Control**: Prevents adjacent tiles from using the same image for natural results
- **Multiple Save Options**: Export in high-resolution, 1:1, or standard sizes

### 🚀 Performance Features
- **Parallel Processing**: CPU core-based parallel processing for 65-80% faster performance
- **Memory Optimization**: Strict 512MB memory limit with LRU caching
- **Streaming Processing**: Efficient chunk-based processing for large image collections
- **Real-time Progress**: Detailed progress tracking with live preview

### 🌐 User Experience
- **Bilingual Support**: Complete Japanese and English internationalization
- **Progressive Web App**: Installable with offline capabilities
- **Interactive Viewer**: Zoom (10%-1000%), pan, and fit-to-window controls
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### ⚙️ Advanced Settings
- **Grid Size**: 20×20 to 200×200 tiles
- **Tile Size**: 8px to 64px per tile
- **Quality Modes**: Low (fast), Medium (standard), High (precision)
- **Color Matching**: RGB or LAB color space for precise color matching

## 🎯 Quick Start

### Option 1: Direct Download & Run
```bash
# Clone the repository
git clone https://github.com/devkuwatch/photomozaic.git
cd photomosaic-generator

# Open in browser
# Simply open index.html in any modern web browser
```

### Option 2: Web Server (Recommended)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000

# Then open http://localhost:8000 in your browser
```

### Option 3: Deploy to Static Hosting
Deploy to any static hosting service:
- **GitHub Pages**: Push to `gh-pages` branch
- **Netlify**: Drag & drop the folder
- **Vercel**: Connect your repository
- **AWS S3 + CloudFront**: Upload files to S3 bucket

### Demo
https://photomozaic.vercel.app/

### Browser Support
- **Chrome/Edge**: Version 80+ (recommended)
- **Firefox**: Version 75+
- **Safari**: Version 13+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+

### System Requirements
- **RAM**: 2GB minimum, 4GB+ recommended
- **Storage**: 100MB free space for caching
- **Internet**: Required only for initial download (runs offline after installation)

## 🎮 How to Use

![alt text](<assets/screenshot/PhotoMosaic Generator.png>)


### Step 1: Select Source Image
1. Click "📁 Select Image" in the source section
2. Choose your main image that will be recreated as a mosaic

### Step 2: Choose Tile Images
1. Click "📁 Select Multiple Images"
2. Select a collection of images (100+ recommended for better results)
3. Wait for parallel processing to complete

### Step 3: Configure Settings
- **Grid Size**: Larger = more detail, smaller = faster processing
- **Tile Size**: Affects final image resolution
- **Quality**: Balance between speed and accuracy
- **Color Matching**: LAB for better color precision
- **Neighbor Diversity**: Enable for more natural results

### Step 4: Generate Mosaic
1. Click "🚀 Generate Mosaic"
2. Monitor real-time progress with live preview
3. Use pause/resume/cancel controls as needed

### Step 5: View & Save
- **Zoom**: Mouse wheel or toolbar buttons
- **Pan**: Click and drag to move around
- **Save**: Choose from 3 export options
- **Share**: Generate shareable links

## 🔧 Technical Specifications

### Architecture
- **Frontend**: Vanilla JavaScript ES6+ modules
- **Processing**: Web Workers for non-blocking operations
- **Graphics**: Canvas API with WebGL acceleration
- **Storage**: IndexedDB for offline caching
- **PWA**: Service Worker with full offline support

### Memory Optimization
- **Streaming Processing**: 64×64 tile chunks to minimize memory usage
- **LRU Caching**: Maximum 100 tiles, 64MB limit
- **Compressed Data**: RGB565 format for 50% memory reduction
- **Metadata Processing**: 8×8 thumbnails for dominant color extraction
- **Automatic Cleanup**: Memory monitoring with automatic garbage collection

### Performance Features
- **Parallel Processing**: Up to 8 concurrent workers based on CPU cores
- **Batch Processing**: 20-image batches with memory control
- **Color Algorithms**: LAB color space for perceptually accurate matching
- **High-Resolution Mode**: Dynamic switching based on zoom level
- **Neighbor Constraints**: Advanced algorithm preventing adjacent duplicates

### Algorithms
- **Color Distance**: Delta E calculations in LAB color space
- **Tile Selection**: Multi-criteria optimization with usage balancing
- **Memory Management**: Adaptive quality control based on available memory
- **Progress Estimation**: Sophisticated time remaining calculations

## 📊 Performance Benchmarks

### Processing Speed
- **1,000 tiles**: ~2 minutes (with parallel processing)
- **5,000 tiles**: ~8 minutes
- **10,000 tiles**: ~15 minutes


## 🔒 Privacy & Security

- **Client-Side Only**: No data sent to external servers
- **Local Processing**: All image processing happens in your browser
- **No Tracking**: No analytics or user tracking
- **Secure**: Content Security Policy headers implemented
- **Private**: Images never leave your device

## 🛠️ Development

### Project Structure
```
photomosaic-generator/
├── index.html              # Main application page
├── manifest.json           # PWA configuration
├── sw.js                   # Service Worker
├── css/
│   └── main.css            # Application styles
├── js/
│   ├── main.js             # Main application logic
│   ├── modules/            # Core modules
│   │   ├── image-processor.js
│   │   ├── tile-manager.js
│   │   ├── memory-monitor.js
│   │   ├── ui-controller.js
│   │   ├── progress-manager.js
│   │   ├── image-viewer.js
│   │   └── language-manager.js
│   ├── workers/
│   │   └── mosaic-worker.js # Web Worker for processing
│   └── lib/
│       └── memory-utils.js  # Memory optimization utilities
└── assets/
    └── icons/              # PWA icons and favicons
```

### Key Components
- **MosaicWorker**: Heavy processing in separate thread
- **MemoryMonitor**: Real-time memory usage tracking
- **ImageViewer**: High-performance zoom and pan
- **TileManager**: Efficient tile processing and caching
- **ProgressManager**: Detailed progress tracking
- **LanguageManager**: Complete i18n support

### Common Issues
1. **Memory errors**: Reduce grid size or use fewer tiles
2. **Slow processing**: Enable parallel processing, reduce quality setting
3. **Browser crashes**: Use latest browser version, close other tabs
4. **Images not loading**: Check file formats (JPG, PNG, WEBP supported)

### Performance Tips
- Use 500-2000 tile images for optimal results
- Close unnecessary browser tabs during processing
- Use SSD storage for better file I/O performance
- Enable hardware acceleration in browser settings

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request


---

**Made with ❤️ for photographers and digital artists**

*Create stunning photo mosaics that tell your visual story.*
