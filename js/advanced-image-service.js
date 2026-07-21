const AdvancedImageService = {
    initialized: false,
    canvas: null,
    ctx: null,
    maxDimension: 2048,
    defaultQuality: 0.85,
    
    async init() {
        if (this.initialized) return;
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.initialized = true;
        
        console.log('[AdvancedImageService] 图片处理服务初始化完成');
    },
    
    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            
            if (src.startsWith('data:')) {
                img.src = src;
            } else if (src.startsWith('http') || src.startsWith('//')) {
                img.src = src;
            } else {
                img.src = src;
            }
        });
    },
    
    async resize(file, options = {}) {
        const {
            maxWidth = this.maxDimension,
            maxHeight = this.maxDimension,
            maintainAspectRatio = true,
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 调整图片大小...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            let { width, height } = img;
            
            if (maintainAspectRatio) {
                const aspectRatio = width / height;
                
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / aspectRatio;
                }
                
                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }
            } else {
                width = Math.min(width, maxWidth);
                height = Math.min(height, maxHeight);
            }
            
            this.canvas.width = width;
            this.canvas.height = height;
            
            this.ctx.fillStyle = format === 'png' ? 'transparent' : '#ffffff';
            this.ctx.fillRect(0, 0, width, height);
            
            this.ctx.drawImage(img, 0, 0, width, height);
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log(`[AdvancedImageService] 图片调整完成: ${width}x${height}`);
            
            return {
                blob,
                width,
                height,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 图片调整失败:', error);
            throw error;
        }
    },
    
    async compress(file, options = {}) {
        const {
            quality = this.defaultQuality,
            format = 'jpeg',
            maxSizeKB = 500
        } = options;
        
        console.log('[AdvancedImageService] 压缩图片...');
        
        try {
            let result = await this.resize(file, { format, quality });
            
            let currentQuality = quality;
            
            while (result.size > maxSizeKB * 1024 && currentQuality > 0.1) {
                currentQuality -= 0.1;
                result = await this.resize(file, { format, quality: currentQuality });
            }
            
            console.log(`[AdvancedImageService] 图片压缩完成: ${(result.size / 1024).toFixed(2)}KB`);
            
            return result;
        } catch (error) {
            console.error('[AdvancedImageService] 图片压缩失败:', error);
            throw error;
        }
    },
    
    async crop(file, options = {}) {
        const {
            x = 0,
            y = 0,
            width,
            height,
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 裁剪图片...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            const cropWidth = width || img.width;
            const cropHeight = height || img.height;
            
            this.canvas.width = cropWidth;
            this.canvas.height = cropHeight;
            
            this.ctx.fillStyle = format === 'png' ? 'transparent' : '#ffffff';
            this.ctx.fillRect(0, 0, cropWidth, cropHeight);
            
            this.ctx.drawImage(img, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log(`[AdvancedImageService] 图片裁剪完成: ${cropWidth}x${cropHeight}`);
            
            return {
                blob,
                width: cropWidth,
                height: cropHeight,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 图片裁剪失败:', error);
            throw error;
        }
    },
    
    async rotate(file, options = {}) {
        const {
            angle = 90,
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 旋转图片...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            const radian = angle * Math.PI / 180;
            const cos = Math.abs(Math.cos(radian));
            const sin = Math.abs(Math.sin(radian));
            
            const newWidth = img.width * cos + img.height * sin;
            const newHeight = img.width * sin + img.height * cos;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            
            this.ctx.fillStyle = format === 'png' ? 'transparent' : '#ffffff';
            this.ctx.fillRect(0, 0, newWidth, newHeight);
            
            this.ctx.translate(newWidth / 2, newHeight / 2);
            this.ctx.rotate(radian);
            this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log(`[AdvancedImageService] 图片旋转完成: ${angle}度`);
            
            return {
                blob,
                width: newWidth,
                height: newHeight,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 图片旋转失败:', error);
            throw error;
        }
    },
    
    async flip(file, options = {}) {
        const {
            horizontal = false,
            vertical = true,
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 翻转图片...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            
            this.ctx.fillStyle = format === 'png' ? 'transparent' : '#ffffff';
            this.ctx.fillRect(0, 0, img.width, img.height);
            
            if (horizontal && vertical) {
                this.ctx.scale(-1, -1);
                this.ctx.drawImage(img, -img.width, -img.height);
            } else if (horizontal) {
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(img, -img.width, 0);
            } else if (vertical) {
                this.ctx.scale(1, -1);
                this.ctx.drawImage(img, 0, -img.height);
            }
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log('[AdvancedImageService] 图片翻转完成');
            
            return {
                blob,
                width: img.width,
                height: img.height,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 图片翻转失败:', error);
            throw error;
        }
    },
    
    async addWatermark(file, options = {}) {
        const {
            text = 'Watermark',
            position = 'bottom-right',
            opacity = 0.5,
            fontSize = 24,
            fontColor = '#ffffff',
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 添加水印...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            
            this.ctx.drawImage(img, 0, 0);
            
            this.ctx.globalAlpha = opacity;
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.fillStyle = fontColor;
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'bottom';
            
            let x, y;
            
            switch (position) {
                case 'top-left':
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    x = 20;
                    y = 20;
                    break;
                case 'top-right':
                    this.ctx.textAlign = 'right';
                    this.ctx.textBaseline = 'top';
                    x = img.width - 20;
                    y = 20;
                    break;
                case 'bottom-left':
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'bottom';
                    x = 20;
                    y = img.height - 20;
                    break;
                case 'bottom-right':
                default:
                    x = img.width - 20;
                    y = img.height - 20;
                    break;
                case 'center':
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    x = img.width / 2;
                    y = img.height / 2;
                    break;
            }
            
            this.ctx.fillText(text, x, y);
            
            this.ctx.globalAlpha = 1;
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log('[AdvancedImageService] 水印添加完成');
            
            return {
                blob,
                width: img.width,
                height: img.height,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 添加水印失败:', error);
            throw error;
        }
    },
    
    async toGrayscale(file, options = {}) {
        const {
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 转换为灰度图...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            
            this.ctx.drawImage(img, 0, 0);
            
            const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            
            this.ctx.putImageData(imageData, 0, 0);
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log('[AdvancedImageService] 灰度转换完成');
            
            return {
                blob,
                width: img.width,
                height: img.height,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 灰度转换失败:', error);
            throw error;
        }
    },
    
    async adjustBrightness(file, options = {}) {
        const {
            brightness = 0,
            contrast = 0,
            quality = this.defaultQuality,
            format = 'jpeg'
        } = options;
        
        console.log('[AdvancedImageService] 调整亮度对比度...');
        
        try {
            const img = await this.loadImage(URL.createObjectURL(file));
            URL.revokeObjectURL(img.src);
            
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            
            this.ctx.drawImage(img, 0, 0);
            
            const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
            const data = imageData.data;
            
            const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = this.clamp(data[i] * contrastFactor + brightness + contrast);
                data[i + 1] = this.clamp(data[i + 1] * contrastFactor + brightness + contrast);
                data[i + 2] = this.clamp(data[i + 2] * contrastFactor + brightness + contrast);
            }
            
            this.ctx.putImageData(imageData, 0, 0);
            
            const blob = await this.canvasToBlob(this.canvas, format, quality);
            
            console.log('[AdvancedImageService] 亮度对比度调整完成');
            
            return {
                blob,
                width: img.width,
                height: img.height,
                size: blob.size,
                url: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.error('[AdvancedImageService] 调整亮度对比度失败:', error);
            throw error;
        }
    },
    
    clamp(value) {
        return Math.max(0, Math.min(255, value));
    },
    
    async canvasToBlob(canvas, format, quality) {
        return new Promise((resolve, reject) => {
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob转换失败'));
                    }
                },
                mimeType,
                quality
            );
        });
    },
    
    async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    async dataURLToBlob(dataURL) {
        const response = await fetch(dataURL);
        return response.blob();
    },
    
    async blobToFile(blob, filename) {
        return new File([blob], filename, { type: blob.type });
    },
    
    async imageToBase64(file, options = {}) {
        const { format = 'jpeg', quality = this.defaultQuality } = options;
        
        const result = await this.resize(file, { format, quality });
        const dataURL = await this.fileToDataURL(result.blob);
        
        URL.revokeObjectURL(result.url);
        
        return dataURL;
    },
    
    async base64ToBlob(base64) {
        const dataURL = base64.includes(',') ? base64 : `data:image/jpeg;base64,${base64}`;
        return this.dataURLToBlob(dataURL);
    },
    
    getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height
                });
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('无法读取图片信息'));
            };
            
            img.src = url;
        });
    },
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
};

window.AdvancedImageService = AdvancedImageService;