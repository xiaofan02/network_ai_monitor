/**
 * Dashboard实时监控 - JavaScript模块
 * 实现实时数据图表和自动刷新（支持用户自定义刷新频率）
 */

// 全局变量
let cpuChart = null;  // CPU图表对象
let memoryChart = null;  // 内存图表对象
let cpuRefreshInterval = null;  // CPU/内存图表刷新定时器
let deviceStatusRefreshInterval = null;  // 设备状态刷新定时器

// 默认刷新频率
const DEFAULT_CPU_REFRESH = 10000;  // CPU/内存图表 10秒
const DEFAULT_DEVICE_STATUS_REFRESH = 1800000;  // 设备状态 30分钟

// 历史数据存储 (最多保存20个数据点)
let cpuHistory = [];
let memoryHistory = [];
let timeLabels = [];
const MAX_DATA_POINTS = 20;

// 缓存的设备数据
let cachedDevicesData = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Dashboard
    initDashboard();
});

// 初始化Dashboard
function initDashboard() {
    console.log('[Dashboard] 初始化Dashboard监控面板...');

    // 从localStorage读取刷新频率设置
    const cpuRefreshRate = parseInt(localStorage.getItem('cpuRefreshInterval') || DEFAULT_CPU_REFRESH);
    const deviceStatusRefreshRate = parseInt(localStorage.getItem('deviceStatusRefreshInterval') || DEFAULT_DEVICE_STATUS_REFRESH);

    console.log(`[Dashboard] CPU/内存图表刷新间隔: ${cpuRefreshRate/1000}秒`);
    console.log(`[Dashboard] 设备状态刷新间隔: ${deviceStatusRefreshRate/1000}秒`);

    // 立即加载一次完整数据（包括设备列表）
    loadDeviceStatusAndData();

    // 计算到下一个整数秒的延迟时间
    const now = new Date();
    const currentSeconds = now.getSeconds();
    const currentMilliseconds = now.getMilliseconds();

    // 计算到下一个0秒或30秒的延迟
    let targetSecond = 0;
    if (currentSeconds < 30) {
        targetSecond = 30;
    } else {
        targetSecond = 60;
    }
    const delayToNextSync = (targetSecond - currentSeconds) * 1000 - currentMilliseconds;

    console.log(`[Dashboard] 当前时间: ${currentSeconds}.${currentMilliseconds}秒, ${delayToNextSync}毫秒后同步到整数秒`);

    // 延迟到下一个整数秒后开始定时刷新
    setTimeout(() => {
        // 立即执行一次（此时已经是整数秒）
        loadCpuMemoryData();

        // 设置CPU/内存图表自动刷新（只更新图表，不更新设备列表）
        cpuRefreshInterval = setInterval(() => {
            loadCpuMemoryData();
        }, cpuRefreshRate);

        console.log('[Dashboard] CPU/内存图表刷新已同步到整数秒');
    }, delayToNextSync);

    // 设置设备状态自动刷新（只更新设备列表和统计数字）
    deviceStatusRefreshInterval = setInterval(() => {
        loadDeviceStatusAndData();
    }, deviceStatusRefreshRate);

    console.log('[Dashboard] 自动刷新已启用');
}

// 停止Dashboard刷新 (切换页面时调用)
function stopDashboardRefresh() {
    if (cpuRefreshInterval) {
        clearInterval(cpuRefreshInterval);
        cpuRefreshInterval = null;
        console.log('[Dashboard] CPU/内存刷新已停止');
    }
    if (deviceStatusRefreshInterval) {
        clearInterval(deviceStatusRefreshInterval);
        deviceStatusRefreshInterval = null;
        console.log('[Dashboard] 设备状态刷新已停止');
    }
}

// 重启Dashboard刷新 (切换回页面时调用)
function restartDashboardRefresh() {
    stopDashboardRefresh();
    initDashboard();
}

// 加载设备状态和完整数据（包括设备列表、统计数字、图表）
async function loadDeviceStatusAndData() {
    try {
        console.log('[Dashboard] 刷新设备状态和完整数据...');
        const response = await fetch('/api/dashboard/data');
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // 缓存设备数据
            cachedDevicesData = data;

            // 更新统计数字
            updateStatistics(data);

            // 更新设备列表
            updateDevicesList(data.devices);

            // 更新图表数据
            updateCharts(data.devices);

            console.log(`[Dashboard] 完整数据更新成功 - 总数:${data.total} 在线:${data.online} 离线:${data.offline}`);
        }
    } catch (error) {
        console.error('[Dashboard] 数据加载失败:', error);
    }
}

// 只加载CPU/内存数据并更新图表（不更新设备列表）
async function loadCpuMemoryData() {
    try {
        const response = await fetch('/api/dashboard/data');
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // 只更新图表数据，不更新设备列表和统计数字
            updateCharts(data.devices);

            console.log(`[Dashboard] CPU/内存图表数据更新成功`);
        }
    } catch (error) {
        console.error('[Dashboard] CPU/内存数据加载失败:', error);
    }
}

// 更新统计数字
function updateStatistics(data) {
    // 更新设备总数
    const totalElement = document.getElementById('totalDevices');
    if (totalElement) {
        animateNumber(totalElement, data.total);
    }

    // 更新在线设备数
    const onlineElement = document.getElementById('onlineDevices');
    if (onlineElement) {
        animateNumber(onlineElement, data.online);
    }

    // 更新离线设备数
    const offlineElement = document.getElementById('offlineDevices');
    if (offlineElement) {
        animateNumber(offlineElement, data.offline);
    }
}

// 数字动画效果
function animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) return;

    const step = targetValue > currentValue ? 1 : -1;
    let current = currentValue;

    const animation = setInterval(() => {
        current += step;
        element.textContent = current;

        if (current === targetValue) {
            clearInterval(animation);
        }
    }, 50);
}

// 更新设备列表
function updateDevicesList(devices) {
    const listElement = document.getElementById('dashboardDevicesList');
    if (!listElement) return;

    if (!devices || devices.length === 0) {
        listElement.innerHTML = '<p class="text-center text-muted">暂无设备</p>';
        return;
    }

    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr>';
    html += '<th><i class="bi bi-hdd-network"></i> 设备名称</th>';
    html += '<th><i class="bi bi-globe"></i> IP地址</th>';
    html += '<th><i class="bi bi-cpu"></i> CPU</th>';
    html += '<th><i class="bi bi-memory"></i> 内存</th>';
    html += '<th><i class="bi bi-thermometer-half"></i> 温度</th>';
    html += '<th><i class="bi bi-activity"></i> 状态</th>';
    html += '<th><i class="bi bi-gear"></i> 操作</th>';
    html += '</tr></thead><tbody>';

    devices.forEach(device => {
        const statusClass = device.status === 'online' ? 'success' : 'danger';
        const statusIcon = device.status === 'online' ? 'check-circle-fill' : 'x-circle-fill';
        const statusText = device.status === 'online' ? '在线' : '离线';

        html += '<tr>';
        html += `<td><strong>${device.name}</strong> <small class="text-muted">(${device.vendor})</small></td>`;
        html += `<td>${device.ip}</td>`;
        html += `<td>${device.cpu !== null ? `<span class="badge bg-primary">${device.cpu}%</span>` : '<span class="text-muted">-</span>'}</td>`;
        html += `<td>${device.memory !== null ? `<span class="badge bg-info">${device.memory}%</span>` : '<span class="text-muted">-</span>'}</td>`;
        html += `<td>${device.temperature !== null ? `<span class="badge bg-warning">${device.temperature}°C</span>` : '<span class="text-muted">-</span>'}</td>`;
        html += `<td><span class="badge bg-${statusClass}"><i class="bi bi-${statusIcon}"></i> ${statusText}</span></td>`;
        html += `<td>
            <button class="btn btn-sm btn-primary" onclick="viewDeviceDetails('${device.id}')">
                <i class="bi bi-info-circle"></i> 详情
            </button>
            <button class="btn btn-sm btn-danger ms-1" onclick="deleteDeviceFromDashboard('${device.id}')">
                <i class="bi bi-trash"></i>
            </button>
        </td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    listElement.innerHTML = html;
}

// 更新图表数据
function updateCharts(devices) {
    // 收集在线设备的CPU和内存数据
    const onlineDevices = devices.filter(d => d.status === 'online' && d.cpu !== null);

    if (onlineDevices.length === 0) {
        console.log('[Dashboard] 没有在线设备或CPU/内存数据');
        return;
    }

    // 计算平均CPU和内存使用率
    const avgCpu = Math.round(onlineDevices.reduce((sum, d) => sum + d.cpu, 0) / onlineDevices.length);
    const avgMemory = Math.round(onlineDevices.reduce((sum, d) => sum + (d.memory || 0), 0) / onlineDevices.length);

    // 添加到历史数据
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    cpuHistory.push(avgCpu);
    memoryHistory.push(avgMemory);
    timeLabels.push(timeLabel);

    // 保持数据点数量限制
    if (cpuHistory.length > MAX_DATA_POINTS) {
        cpuHistory.shift();
        memoryHistory.shift();
        timeLabels.shift();
    }

    // 更新或创建图表
    updateOrCreateCharts();
}

// 更新或创建图表
function updateOrCreateCharts() {
    // CPU图表
    const cpuCanvas = document.getElementById('cpuChart');
    if (cpuCanvas) {
        if (cpuChart) {
            // 更新现有图表
            cpuChart.data.labels = timeLabels;
            cpuChart.data.datasets[0].data = cpuHistory;
            cpuChart.update('none'); // 不使用动画，提升性能
        } else {
            // 创建新图表
            cpuChart = new Chart(cpuCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'CPU使用率 (%)',
                        data: cpuHistory,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        fill: true
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

    // 内存图表
    const memoryCanvas = document.getElementById('memoryChart');
    if (memoryCanvas) {
        if (memoryChart) {
            // 更新现有图表
            memoryChart.data.labels = timeLabels;
            memoryChart.data.datasets[0].data = memoryHistory;
            memoryChart.update('none');
        } else {
            // 创建新图表
            memoryChart = new Chart(memoryCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: '内存使用率 (%)',
                        data: memoryHistory,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
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

// 手动刷新按钮
function refreshDashboard() {
    console.log('[Dashboard] 手动刷新数据...');
    loadDeviceStatusAndData();
}

// ========== Dashboard刷新设置功能 ==========

// 打开Dashboard设置模态框
function openDashboardSettings() {
    // 读取当前设置
    const cpuRefreshRate = localStorage.getItem('cpuRefreshInterval') || DEFAULT_CPU_REFRESH;
    const deviceStatusRefreshRate = localStorage.getItem('deviceStatusRefreshInterval') || DEFAULT_DEVICE_STATUS_REFRESH;

    // 设置下拉框的值
    document.getElementById('cpuRefreshInterval').value = cpuRefreshRate;
    document.getElementById('deviceStatusRefreshInterval').value = deviceStatusRefreshRate;

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('dashboardSettingsModal'));
    modal.show();

    console.log('[Dashboard] 打开刷新设置');
}

// 保存Dashboard设置
function saveDashboardSettings() {
    // 获取用户选择的刷新频率
    const cpuRefreshRate = document.getElementById('cpuRefreshInterval').value;
    const deviceStatusRefreshRate = document.getElementById('deviceStatusRefreshInterval').value;

    // 保存到localStorage
    localStorage.setItem('cpuRefreshInterval', cpuRefreshRate);
    localStorage.setItem('deviceStatusRefreshInterval', deviceStatusRefreshRate);

    console.log(`[Dashboard] 保存设置 - CPU刷新: ${cpuRefreshRate/1000}秒, 设备状态刷新: ${deviceStatusRefreshRate/1000}秒`);

    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('dashboardSettingsModal'));
    modal.hide();

    // 显示成功提示
    showToast('设置已保存，刷新频率已立即生效', 'success');

    // 重启刷新定时器
    restartDashboardRefresh();
}

// 显示提示消息
function showToast(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        <i class="bi bi-check-circle-fill"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // 3秒后自动移除
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ========== 设备详情查看功能 ==========
// 注意：此函数已被 device-detail.js 中的同名函数覆盖
// 这里保留作为备份，实际调用的是 device-detail.js 中的版本
/*
function viewDeviceDetails(deviceId) {
    console.log(`[Dashboard] 查看设备详情: ${deviceId}`);
    // 存储设备ID到sessionStorage，然后跳转
    sessionStorage.setItem('currentDeviceId', deviceId);

    // 切换到设备详情选项卡（暂时先切换到设备管理，后续会创建专门的设备详情页）
    alert('设备详情功能开发中，请稍后...');
    // TODO: 后续实现设备详情页面
}
*/

// ========== 从Dashboard删除设备 ==========
function deleteDeviceFromDashboard(deviceId) {
    if (!confirm('确定要删除这个设备吗？')) return;

    fetch(`/api/devices/${deviceId}`, {method: 'DELETE'})
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('设备删除成功！', 'success');
                // 重新加载Dashboard数据
                loadDeviceStatusAndData();
            } else {
                showToast('删除失败: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('删除设备失败:', error);
            showToast('删除设备失败', 'danger');
        });
}

// ========== 打开添加设备模态框 ==========
function openAddDeviceModal() {
    console.log('[Dashboard] 打开添加设备模态框');
    // 清空表单
    document.getElementById('modalDeviceName').value = '';
    document.getElementById('modalDeviceVendor').value = '';
    document.getElementById('modalDeviceIp').value = '';
    document.getElementById('modalDevicePort').value = '22';
    document.getElementById('modalDeviceUsername').value = '';
    document.getElementById('modalDevicePassword').value = '';

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
    modal.show();
}

// ========== 从模态框添加设备 ==========
function addDeviceFromModal() {
    // 获取表单数据
    const name = document.getElementById('modalDeviceName').value.trim();
    const vendor = document.getElementById('modalDeviceVendor').value;
    const ip = document.getElementById('modalDeviceIp').value.trim();
    const port = document.getElementById('modalDevicePort').value || '22';
    const username = document.getElementById('modalDeviceUsername').value.trim();
    const password = document.getElementById('modalDevicePassword').value;

    // 验证必填字段
    if (!vendor || !ip || !username || !password) {
        showToast('请填写所有必填字段！', 'warning');
        return;
    }

    // 显示加载状态
    showToast('正在添加设备，如果未提供设备名称将自动获取...', 'info');

    // 发送添加请求
    fetch('/api/devices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            vendor: vendor,
            ip: ip,
            port: parseInt(port),
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('设备添加成功！', 'success');
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('addDeviceModal'));
            modal.hide();
            // 重新加载Dashboard数据
            loadDeviceStatusAndData();
        } else {
            showToast('添加失败: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('添加设备失败:', error);
        showToast('添加设备失败', 'danger');
    });
}