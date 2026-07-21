const AdvancedCharts = {
    charts: {},
    
    init() {
        console.log('[AdvancedCharts] 图表组件库初始化完成');
    },
    
    createBarChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.map(d => d.label),
            datasets: [{
                label: options.label || '数据',
                data: data.map(d => d.value),
                backgroundColor: options.colors || this.generateColors(data.length),
                borderColor: options.borderColors || this.generateBorderColors(data.length),
                borderWidth: 1,
                borderRadius: 8,
                barThickness: options.barThickness || 40
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createLineChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.map(d => d.label),
            datasets: [{
                label: options.label || '数据',
                data: data.map(d => d.value),
                borderColor: options.color || '#3B82F6',
                backgroundColor: options.fill ? this.hexToRgba(options.color || '#3B82F6', 0.1) : 'transparent',
                borderWidth: 3,
                fill: options.fill || false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: options.color || '#3B82F6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createPieChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: options.colors || this.generateColors(data.length),
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 800,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createDoughnutChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: options.colors || this.generateColors(data.length),
                borderColor: '#fff',
                borderWidth: 4,
                hoverOffset: 15,
                cutout: options.cutout || '65%'
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 800,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createAreaChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.map(d => d.label),
            datasets: [{
                label: options.label || '数据',
                data: data.map(d => d.value),
                borderColor: options.color || '#10B981',
                backgroundColor: this.hexToRgba(options.color || '#10B981', 0.15),
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: options.color || '#10B981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createRadarChart(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const config = {
            labels: data.labels,
            datasets: data.datasets.map((dataset, index) => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: this.hexToRgba(dataset.color || this.generateColors(data.datasets.length)[index], 0.2),
                borderColor: dataset.color || this.generateColors(data.datasets.length)[index],
                borderWidth: 2,
                pointBackgroundColor: dataset.color || this.generateColors(data.datasets.length)[index],
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        };
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: options.showLegend !== false,
                    position: options.legendPosition || 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 12
                        }
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'radar',
            data: config,
            options: chartOptions
        });
        
        this.charts[containerId] = chart;
        return chart;
    },
    
    createGaugeChart(containerId, value, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const min = options.min || 0;
        const max = options.max || 100;
        const percentage = ((value - min) / (max - min)) * 100;
        
        const config = {
            type: 'doughnut',
            data: {
                labels: ['进度', ''],
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [options.color || '#3B82F6', '#E5E7EB'],
                    borderColor: ['#fff', '#fff'],
                    borderWidth: 4,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                rotation: 270,
                circumference: 180,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        };
        
        const ctx = container.getContext('2d');
        const chart = new Chart(ctx, config);
        
        this.charts[containerId] = chart;
        
        const centerX = container.width / 2;
        const centerY = container.height / 2;
        
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(percentage)}%`, centerX, centerY);
        
        if (options.label) {
            ctx.font = '12px Inter, sans-serif';
            ctx.fillStyle = '#6B7280';
            ctx.fillText(options.label, centerX, centerY + 20);
        }
        
        return chart;
    },
    
    generateColors(count) {
        const baseColors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    },
    
    generateBorderColors(count) {
        const baseColors = [
            '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED',
            '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    },
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    updateChart(containerId, newData) {
        const chart = this.charts[containerId];
        if (!chart) {
            console.error('[AdvancedCharts] 图表不存在:', containerId);
            return;
        }
        
        chart.data.labels = newData.map(d => d.label);
        chart.data.datasets[0].data = newData.map(d => d.value);
        chart.update('none');
    },
    
    destroyChart(containerId) {
        const chart = this.charts[containerId];
        if (chart) {
            chart.destroy();
            delete this.charts[containerId];
        }
    },
    
    createSparkline(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[AdvancedCharts] 容器不存在:', containerId);
            return null;
        }
        
        const ctx = container.getContext('2d');
        const width = container.width;
        const height = container.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length === 0) return;
        
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        const points = data.map((value, index) => ({
            x: (index / (data.length - 1)) * width,
            y: height - ((value - min) / range) * (height - 8) - 4
        }));
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        
        ctx.strokeStyle = options.color || '#3B82F6';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.hexToRgba(options.color || '#3B82F6', 0.2));
        gradient.addColorStop(1, this.hexToRgba(options.color || '#3B82F6', 0));
        
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.lineTo(points[0].x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        if (options.showPoints !== false) {
            points.forEach((point, index) => {
                if (index === points.length - 1) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = options.color || '#3B82F6';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                    ctx.strokeStyle = this.hexToRgba(options.color || '#3B82F6', 0.3);
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
        }
    }
};

window.AdvancedCharts = AdvancedCharts;