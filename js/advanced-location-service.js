const AdvancedLocationService = {
    initialized: false,
    watchId: null,
    currentLocation: null,
    locationHistory: [],
    options: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    },
    
    async init(options = {}) {
        if (this.initialized) return;
        
        this.options = { ...this.options, ...options };
        this.initialized = true;
        
        console.log('[AdvancedLocationService] 高级定位服务初始化完成');
        console.log('[AdvancedLocationService] 定位选项:', this.options);
    },
    
    async getCurrentLocation(useNetworkPriority = true) {
        console.log('[AdvancedLocationService] 开始获取当前位置...');
        
        const startTime = Date.now();
        let bestResult = null;
        let bestAccuracy = Infinity;
        
        try {
            if (useNetworkPriority) {
                console.log('[AdvancedLocationService] 优先使用网络定位...');
                const networkResult = await this.tryNetworkLocation();
                if (networkResult) {
                    bestResult = networkResult;
                    bestAccuracy = networkResult.accuracy || Infinity;
                    console.log('[AdvancedLocationService] 网络定位成功，精度:', bestAccuracy, 'm');
                }
            }
            
            if (!bestResult || bestAccuracy > 100) {
                console.log('[AdvancedLocationService] 尝试GPS定位...');
                const gpsResult = await this.tryGPSLocation();
                if (gpsResult) {
                    const gpsAccuracy = gpsResult.accuracy || Infinity;
                    if (gpsAccuracy < bestAccuracy) {
                        bestResult = gpsResult;
                        bestAccuracy = gpsAccuracy;
                    }
                    console.log('[AdvancedLocationService] GPS定位成功，精度:', gpsAccuracy, 'm');
                }
            }
            
            if (!bestResult) {
                console.log('[AdvancedLocationService] 尝试IP定位作为备选...');
                const ipResult = await this.tryIPLocation();
                if (ipResult) {
                    bestResult = ipResult;
                    console.log('[AdvancedLocationService] IP定位成功');
                }
            }
            
            if (bestResult) {
                this.currentLocation = bestResult;
                this.locationHistory.push({ ...bestResult, timestamp: Date.now() });
                
                if (this.locationHistory.length > 20) {
                    this.locationHistory.shift();
                }
                
                const duration = Date.now() - startTime;
                console.log(`[AdvancedLocationService] 定位完成，耗时: ${duration}ms，精度: ${bestAccuracy}m`);
            }
            
            return bestResult;
            
        } catch (error) {
            console.error('[AdvancedLocationService] 定位失败:', error);
            throw error;
        }
    },
    
    async tryNetworkLocation() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('[AdvancedLocationService] 网络定位超时');
                resolve(null);
            }, 8000);
            
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(timeout);
                        const result = this.formatLocation(position);
                        result.provider = 'network';
                        resolve(result);
                    },
                    (error) => {
                        clearTimeout(timeout);
                        console.log('[AdvancedLocationService] 网络定位失败:', error.message);
                        resolve(null);
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 8000,
                        maximumAge: 60000
                    }
                );
            } else {
                clearTimeout(timeout);
                resolve(null);
            }
        });
    },
    
    async tryGPSLocation() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('[AdvancedLocationService] GPS定位超时');
                resolve(null);
            }, 10000);
            
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(timeout);
                        const result = this.formatLocation(position);
                        result.provider = 'gps';
                        resolve(result);
                    },
                    (error) => {
                        clearTimeout(timeout);
                        console.log('[AdvancedLocationService] GPS定位失败:', error.message);
                        resolve(null);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                clearTimeout(timeout);
                resolve(null);
            }
        });
    },
    
    async tryIPLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                return {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    accuracy: 5000,
                    provider: 'ip',
                    address: `${data.city || ''} ${data.region || ''} ${data.country_name || ''}`.trim()
                };
            }
        } catch (error) {
            console.log('[AdvancedLocationService] IP定位失败:', error);
        }
        
        return null;
    },
    
    formatLocation(position) {
        const coords = position.coords;
        return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            altitudeAccuracy: coords.altitudeAccuracy,
            heading: coords.heading,
            speed: coords.speed,
            timestamp: position.timestamp
        };
    },
    
    startWatch(onLocationUpdate, onError) {
        if (this.watchId) {
            this.stopWatch();
        }
        
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const location = this.formatLocation(position);
                    location.provider = 'continuous';
                    this.currentLocation = location;
                    this.locationHistory.push({ ...location, timestamp: Date.now() });
                    
                    if (this.locationHistory.length > 50) {
                        this.locationHistory.shift();
                    }
                    
                    if (onLocationUpdate) {
                        onLocationUpdate(location);
                    }
                },
                (error) => {
                    console.error('[AdvancedLocationService] 位置监听失败:', error);
                    if (onError) {
                        onError(error);
                    }
                },
                this.options
            );
            
            console.log('[AdvancedLocationService] 位置监听已启动');
        }
    },
    
    stopWatch() {
        if (this.watchId && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            console.log('[AdvancedLocationService] 位置监听已停止');
        }
    },
    
    getLocationHistory() {
        return [...this.locationHistory];
    },
    
    getCurrentPosition() {
        return this.currentLocation;
    },
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    
    toRad(deg) {
        return deg * (Math.PI / 180);
    },
    
    isWithinRange(location, targetLat, targetLon, rangeMeters) {
        if (!location) return false;
        
        const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            targetLat,
            targetLon
        );
        
        return distance <= rangeMeters;
    },
    
    async reverseGeocode(latitude, longitude) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
                return data.display_name;
            }
        } catch (error) {
            console.error('[AdvancedLocationService] 逆地理编码失败:', error);
        }
        
        return null;
    },
    
    getLocationAccuracyLevel(accuracy) {
        if (accuracy <= 10) return { level: '亚米级', color: '#22C55E', description: '高精度定位' };
        if (accuracy <= 50) return { level: '米级', color: '#3B82F6', description: '良好精度' };
        if (accuracy <= 100) return { level: '一般', color: '#F59E0B', description: '普通精度' };
        return { level: '低精度', color: '#EF4444', description: '需要改善' };
    },
    
    getLocationStatus() {
        return {
            initialized: this.initialized,
            watching: this.watchId !== null,
            currentLocation: this.currentLocation,
            historyLength: this.locationHistory.length,
            accuracyLevel: this.currentLocation 
                ? this.getLocationAccuracyLevel(this.currentLocation.accuracy)
                : null
        };
    },
    
    async calibrate() {
        console.log('[AdvancedLocationService] 开始校准定位...');
        
        const results = [];
        
        for (let i = 0; i < 3; i++) {
            const result = await this.getCurrentLocation();
            if (result) {
                results.push(result);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (results.length > 0) {
            const avgLat = results.reduce((sum, r) => sum + r.latitude, 0) / results.length;
            const avgLng = results.reduce((sum, r) => sum + r.longitude, 0) / results.length;
            
            this.currentLocation = {
                latitude: avgLat,
                longitude: avgLng,
                accuracy: Math.min(...results.map(r => r.accuracy || Infinity)),
                provider: 'calibrated',
                timestamp: Date.now()
            };
            
            console.log('[AdvancedLocationService] 校准完成，平均位置:', avgLat, avgLng);
            return this.currentLocation;
        }
        
        return null;
    },
    
    simulateLocation(latitude, longitude) {
        console.log('[AdvancedLocationService] 使用模拟位置:', latitude, longitude);
        
        this.currentLocation = {
            latitude,
            longitude,
            accuracy: 10,
            provider: 'simulated',
            timestamp: Date.now()
        };
        
        return this.currentLocation;
    }
};

window.AdvancedLocationService = AdvancedLocationService;