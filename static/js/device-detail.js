/**
 * 设备详情页面 - JavaScript模块
 * 实现设备详情查看、历史数据图表、接口监控
 */

// 全局变量
let currentDeviceId = null;
let deviceCpuChart = null;
let deviceMemoryChart = null;
let deviceDataRefreshInterval = null;

// 返回仪表板
function backToDashboard() {
    // 停止详情页刷新
    if (deviceDataRefreshInterval) {
        clearInterval(deviceDataRefreshInterval);
        deviceDataRefreshInterval = null;
    }

    // 清除当前设备ID
    currentDeviceId = null;

    // 切换到仪表板
    switchTab('dashboard');

    console.log('[DeviceDetail] 返回仪表板');
}

// 查看设备详情（从Dashboard调用）
function viewDeviceDetails(deviceId) {
    console.log(`[DeviceDetail] 查看设备详情: ${deviceId}`);

    // 保存设备ID
    currentDeviceId = deviceId;
    sessionStorage.setItem('currentDeviceId', deviceId);

    // 切换到设备详情选项卡
    switchTab('device-detail');

    // 加载设备数据
    loadDeviceDetail(deviceId);

    // 设置自动刷新（每30秒刷新一次）
    if (deviceDataRefreshInterval) {
        clearInterval(deviceDataRefreshInterval);
    }
    deviceDataRefreshInterval = setInterval(() => {
        if (currentDeviceId) {
            loadDeviceDetail(currentDeviceId);
        }
    }, 30000);
}

// 加载设备详情数据
async function loadDeviceDetail(deviceId) {
    try {
        console.log(`[DeviceDetail] 加载设备详情数据: ${deviceId}`);

        const response = await fetch(`/api/devices/${deviceId}/detail`);
        const result = await response.json();

        if (result.success && result.data) {
            const device = result.data;

            // 更新基本信息
            updateDeviceBasicInfo(device);

            // 更新历史图表
            updateDeviceCharts(device);

            // 更新接口信息
            updateDeviceInterfaces(device);

            // 更新运行状态
            updateDeviceStatus(device);

            console.log('[DeviceDetail] 设备详情加载成功');
        } else {
            showToast('加载设备详情失败: ' + (result.message || '未知错误'), 'danger');
        }
    } catch (error) {
        console.error('[DeviceDetail] 加载设备详情失败:', error);
        showToast('加载设备详情失败', 'danger');
    }
}

// 更新设备基本信息
function updateDeviceBasicInfo(device) {
    const container = document.getElementById('deviceBasicInfo');
    if (!container) return;

    const statusClass = device.status === 'online' ? 'success' : 'danger';
    const statusIcon = device.status === 'online' ? 'check-circle-fill' : 'x-circle-fill';
    const statusText = device.status === 'online' ? '在线' : '离线';

    let html = `
        <div class="col-md-3 mb-3">
            <div class="info-item">
                <div class="info-label"><i class="bi bi-tag"></i> 设备名称</div>
                <div class="info-value">${device.name || '-'}</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="info-item">
                <div class="info-label"><i class="bi bi-hdd-network"></i> 设备厂商</div>
                <div class="info-value">${device.vendor || '-'}</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="info-item">
                <div class="info-label"><i class="bi bi-globe"></i> IP地址</div>
                <div class="info-value">${device.ip || '-'}</div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="info-item">
                <div class="info-label"><i class="bi bi-activity"></i> 状态</div>
                <div class="info-value">
                    <span class="badge bg-${statusClass}">
                        <i class="bi bi-${statusIcon}"></i> ${statusText}
                    </span>
                </div>
            </div>
        </div>
    `;

    // 添加主机名、型号、序列号等信息
    if (device.hostname) {
        html += `
            <div class="col-md-3 mb-3">
                <div class="info-item">
                    <div class="info-label"><i class="bi bi-pc-display"></i> 主机名</div>
                    <div class="info-value">${device.hostname}</div>
                </div>
            </div>
        `;
    }

    if (device.model) {
        html += `
            <div class="col-md-3 mb-3">
                <div class="info-item">
                    <div class="info-label"><i class="bi bi-box"></i> 设备型号</div>
                    <div class="info-value">${device.model}</div>
                </div>
            </div>
        `;
    }

    if (device.serial_number) {
        html += `
            <div class="col-md-3 mb-3">
                <div class="info-item">
                    <div class="info-label"><i class="bi bi-upc"></i> 序列号</div>
                    <div class="info-value">${device.serial_number}</div>
                </div>
            </div>
        `;
    }

    if (device.version) {
        html += `
            <div class="col-md-3 mb-3">
                <div class="info-item">
                    <div class="info-label"><i class="bi bi-code-square"></i> 系统版本</div>
                    <div class="info-value">${device.version}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 更新设备历史图表
function updateDeviceCharts(device) {
    if (!device.history) {
        console.log('[DeviceDetail] 无历史数据');
        return;
    }

    const history = device.history;
    const labels = history.timestamps || [];
    const cpuData = history.cpu || [];
    const memoryData = history.memory || [];

    // 更新CPU图表
    const cpuCanvas = document.getElementById('deviceCpuChart');
    if (cpuCanvas) {
        if (deviceCpuChart) {
            deviceCpuChart.data.labels = labels;
            deviceCpuChart.data.datasets[0].data = cpuData;
            deviceCpuChart.update('none');
        } else {
            deviceCpuChart = new Chart(cpuCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'CPU使用率 (%)',
                        data: cpuData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        }
    }

    // 更新内存图表
    const memoryCanvas = document.getElementById('deviceMemoryChart');
    if (memoryCanvas) {
        if (deviceMemoryChart) {
            deviceMemoryChart.data.labels = labels;
            deviceMemoryChart.data.datasets[0].data = memoryData;
            deviceMemoryChart.update('none');
        } else {
            deviceMemoryChart = new Chart(memoryCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '内存使用率 (%)',
                        data: memoryData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        }
    }
}

// 更新接口信息
function updateDeviceInterfaces(device) {
    const container = document.getElementById('deviceInterfacesList');
    if (!container) return;

    const interfaces = device.interfaces || [];

    if (interfaces.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">暂无接口信息</p>';
        return;
    }

    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr>';
    html += '<th><i class="bi bi-ethernet"></i> 接口名称</th>';
    html += '<th><i class="bi bi-activity"></i> 状态</th>';
    html += '<th><i class="bi bi-speedometer"></i> 速率</th>';
    html += '<th><i class="bi bi-arrow-down"></i> 入流量</th>';
    html += '<th><i class="bi bi-arrow-up"></i> 出流量</th>';
    html += '<th><i class="bi bi-exclamation-triangle"></i> 错误</th>';
    html += '<th><i class="bi bi-info-circle"></i> 描述</th>';
    html += '</tr></thead><tbody>';

    interfaces.forEach(iface => {
        const statusClass = iface.status === 'up' ? 'success' : 'danger';
        const statusIcon = iface.status === 'up' ? 'check-circle-fill' : 'x-circle-fill';
        const statusText = iface.status === 'up' ? 'UP' : 'DOWN';

        html += '<tr>';
        html += `<td><strong>${iface.name}</strong></td>`;
        html += `<td><span class="badge bg-${statusClass}"><i class="bi bi-${statusIcon}"></i> ${statusText}</span></td>`;
        html += `<td>${iface.speed || '-'}</td>`;
        html += `<td>${formatBytes(iface.rx_bytes)}</td>`;
        html += `<td>${formatBytes(iface.tx_bytes)}</td>`;
        html += `<td>${iface.errors || 0}</td>`;
        html += `<td>${iface.description || '-'}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// 更新设备运行状态
function updateDeviceStatus(device) {
    const container = document.getElementById('deviceStatusInfo');
    if (!container) return;

    let html = '<div class="row">';

    // CPU使用率
    if (device.cpu !== null && device.cpu !== undefined) {
        const cpuClass = device.cpu > 80 ? 'danger' : device.cpu > 60 ? 'warning' : 'success';
        html += `
            <div class="col-md-3 mb-3">
                <div class="status-item">
                    <div class="status-label"><i class="bi bi-cpu"></i> CPU使用率</div>
                    <div class="status-value">
                        <span class="badge bg-${cpuClass}">${device.cpu}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 内存使用率
    if (device.memory !== null && device.memory !== undefined) {
        const memClass = device.memory > 80 ? 'danger' : device.memory > 60 ? 'warning' : 'success';
        html += `
            <div class="col-md-3 mb-3">
                <div class="status-item">
                    <div class="status-label"><i class="bi bi-memory"></i> 内存使用率</div>
                    <div class="status-value">
                        <span class="badge bg-${memClass}">${device.memory}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 温度
    if (device.temperature !== null && device.temperature !== undefined) {
        const tempClass = device.temperature > 70 ? 'danger' : device.temperature > 50 ? 'warning' : 'success';
        html += `
            <div class="col-md-3 mb-3">
                <div class="status-item">
                    <div class="status-label"><i class="bi bi-thermometer-half"></i> 温度</div>
                    <div class="status-value">
                        <span class="badge bg-${tempClass}">${device.temperature}°C</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 运行时间
    if (device.uptime) {
        html += `
            <div class="col-md-3 mb-3">
                <div class="status-item">
                    <div class="status-label"><i class="bi bi-clock-history"></i> 运行时间</div>
                    <div class="status-value">${device.uptime}</div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// 刷新接口信息
async function refreshInterfaceInfo() {
    if (!currentDeviceId) {
        showToast('无当前设备信息', 'warning');
        return;
    }

    console.log('[DeviceDetail] 刷新接口信息...');
    showToast('正在刷新接口信息...', 'info');

    await loadDeviceDetail(currentDeviceId);
    showToast('接口信息已刷新', 'success');
}

// 格式化字节数
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}