/**
 * 配置备份管理 - JavaScript模块
 * 处理设备配置备份的前端逻辑
 */

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载备份文件列表
    loadBackupFiles();
    // 加载设备列表到备份选择框
    loadBackupDevicesList();
});

// 加载设备列表到备份选择框
async function loadBackupDevicesList() {
    try {
        const response = await fetch('/api/devices');
        const data = await response.json();

        if (data.success && data.devices) {
            const selectElement = document.getElementById('backupDeviceSelect');
            if (!selectElement) return;

            // 清空现有选项（保留默认选项）
            selectElement.innerHTML = '<option value="">请选择设备</option>';

            // 添加设备选项
            data.devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = `${device.name || device.ip} (${device.vendor})`;
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载设备列表失败:', error);
    }
}

// 备份单个设备
async function backupSingleDevice() {
    const deviceId = document.getElementById('backupDeviceSelect').value;

    if (!deviceId) {
        showBackupAlert('warning', '请先选择要备份的设备');
        return;
    }

    // 显示进度条
    showBackupProgress(true);
    updateBackupProgress(0, '正在连接设备...');

    try {
        const response = await fetch(`/api/backup/config/${deviceId}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            updateBackupProgress(100, `备份成功！文件: ${result.filename}`);
            showBackupAlert('success', `✅ 配置备份成功！文件大小: ${formatBytes(result.size)}`);

            // 延迟后隐藏进度条并刷新文件列表
            setTimeout(() => {
                showBackupProgress(false);
                loadBackupFiles();
            }, 2000);
        } else {
            throw new Error(result.message || '备份失败');
        }
    } catch (error) {
        updateBackupProgress(0, `备份失败: ${error.message}`);
        showBackupAlert('danger', `❌ 备份失败: ${error.message}`);
        setTimeout(() => showBackupProgress(false), 3000);
    }
}

// 备份所有设备
async function backupAllDevices() {
    if (!confirm('确定要备份所有设备的配置吗？此操作可能需要较长时间。')) {
        return;
    }

    // 显示进度条
    showBackupProgress(true);
    updateBackupProgress(0, '正在准备批量备份...');

    try {
        const response = await fetch('/api/backup/auto', {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const successRate = (result.success_count / result.total * 100).toFixed(0);
            updateBackupProgress(100, `批量备份完成！成功: ${result.success_count}/${result.total}`);

            // 显示详细结果
            let message = `批量备份完成！\n成功: ${result.success_count}/${result.total} (${successRate}%)\n\n`;
            if (result.results) {
                result.results.forEach(r => {
                    message += `${r.success ? '✅' : '❌'} ${r.device}`;
                    if (r.error) message += ` - ${r.error}`;
                    message += '\n';
                });
            }

            showBackupAlert('success', message.replace(/\n/g, '<br>'));

            // 延迟后隐藏进度条并刷新文件列表
            setTimeout(() => {
                showBackupProgress(false);
                loadBackupFiles();
            }, 5000);
        } else {
            throw new Error(result.message || '批量备份失败');
        }
    } catch (error) {
        updateBackupProgress(0, `批量备份失败: ${error.message}`);
        showBackupAlert('danger', `❌ 批量备份失败: ${error.message}`);
        setTimeout(() => showBackupProgress(false), 3000);
    }
}

// 加载备份文件列表
async function loadBackupFiles() {
    const listElement = document.getElementById('backupFilesList');
    if (!listElement) return;

    listElement.innerHTML = '<p class="text-center text-muted">加载中...</p>';

    try {
        const response = await fetch('/api/backup/files');
        const data = await response.json();

        if (data.success && data.files && data.files.length > 0) {
            let html = '<div class="table-responsive"><table class="table table-hover">';
            html += '<thead><tr>';
            html += '<th><i class="bi bi-file-earmark-text"></i> 文件名</th>';
            html += '<th><i class="bi bi-hdd"></i> 大小</th>';
            html += '<th><i class="bi bi-calendar"></i> 备份时间</th>';
            html += '<th><i class="bi bi-gear"></i> 操作</th>';
            html += '</tr></thead><tbody>';

            data.files.forEach(file => {
                html += '<tr>';
                html += `<td><i class="bi bi-file-text text-primary"></i> ${file.name}</td>`;
                html += `<td>${formatBytes(file.size)}</td>`;
                html += `<td>${formatDateTime(file.modified)}</td>`;
                html += '<td>';
                html += `<button class="btn btn-sm btn-info me-1" onclick="downloadBackupFile('${file.name}')">`;
                html += '<i class="bi bi-download"></i> 下载</button>';
                html += `<button class="btn btn-sm btn-danger" onclick="deleteBackupFile('${file.name}')">`;
                html += '<i class="bi bi-trash"></i> 删除</button>';
                html += '</td></tr>';
            });

            html += '</tbody></table></div>';
            listElement.innerHTML = html;
        } else {
            listElement.innerHTML = '<p class="text-center text-muted">暂无备份文件</p>';
        }
    } catch (error) {
        console.error('加载备份文件列表失败:', error);
        listElement.innerHTML = `<p class="text-center text-danger">加载失败: ${error.message}</p>`;
    }
}

// 下载备份文件
function downloadBackupFile(filename) {
    window.location.href = `/api/backup/download/${encodeURIComponent(filename)}`;
}

// 删除备份文件
async function deleteBackupFile(filename) {
    if (!confirm(`确定要删除备份文件 "${filename}" 吗？此操作不可恢复。`)) {
        return;
    }

    try {
        const response = await fetch(`/api/backup/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showBackupAlert('success', '✅ 文件删除成功');
            loadBackupFiles();  // 刷新文件列表
        } else {
            throw new Error(result.message || '删除失败');
        }
    } catch (error) {
        showBackupAlert('danger', `❌ 删除失败: ${error.message}`);
    }
}

// 显示/隐藏备份进度条
function showBackupProgress(show) {
    const progressElement = document.getElementById('backupProgress');
    if (progressElement) {
        progressElement.style.display = show ? 'block' : 'none';
    }
}

// 更新备份进度
function updateBackupProgress(percent, message) {
    const progressBar = document.getElementById('backupProgressBar');
    const messageElement = document.getElementById('backupMessage');

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
    }

    if (messageElement) {
        messageElement.textContent = message;
    }
}

// 显示备份提示
function showBackupAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '500px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// 格式化文件大小
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 格式化日期时间
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}