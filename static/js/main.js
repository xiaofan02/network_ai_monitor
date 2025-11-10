/**
 * AI网络监控分析平台 - 前端交互脚本
 * 实现所有前端功能的交互逻辑
 */

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 页面加载完成后执行
    initClock();  // 初始化时钟
    initTabs();  // 初始化选项卡
    // 注意：Dashboard刷新已由 dashboard.js 负责，不要重复调用
    loadDevices();  // 加载设备列表
    // 注意：loadAIConfig 已由 ai-config.js 负责，不要重复调用
    loadFiles();  // 加载文件列表

    // 绑定表单提交事件
    document.getElementById('addDeviceForm').addEventListener('submit', handleAddDevice);  // 添加设备表单
    document.getElementById('aiConfigForm').addEventListener('submit', handleSaveAIConfig);  // AI配置表单

    // 注意：AI提供商选择变化事件已在 ai-config.js 中绑定，不要重复绑定

    // 注意：Dashboard刷新定时器已由 dashboard.js 管理，不要在此重复设置
});

// ==================== 时钟功能 ====================
/**
 * 初始化实时时钟
 */
function initClock() {
    updateTime();  // 立即更新一次时间
    setInterval(updateTime, 1000);  // 每秒更新时间
}

/**
 * 更新时间显示
 */
function updateTime() {
    const now = new Date();  // 获取当前时间
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',  // 年份
        month: '2-digit',  // 月份
        day: '2-digit',  // 日期
        hour: '2-digit',  // 小时
        minute: '2-digit',  // 分钟
        second: '2-digit'  // 秒钟
    });
    document.getElementById('currentTime').textContent = timeString;  // 更新时间显示
}

// ==================== 选项卡切换功能 ====================
/**
 * 初始化选项卡切换功能
 */
function initTabs() {
    const tabs = document.querySelectorAll('.list-group-item');  // 获取所有选项卡
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();  // 阻止默认行为

            // 移除所有active类
            tabs.forEach(t => t.classList.remove('active'));  // 移除所有激活状态
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');  // 移除所有内容激活状态
            });

            // 添加active类到当前选项卡
            this.classList.add('active');  // 激活当前选项卡
            const targetId = this.getAttribute('data-tab');  // 获取目标内容ID
            document.getElementById(targetId).classList.add('active');  // 激活目标内容

            // 根据选项卡刷新内容
            if (targetId === 'devices') {
                loadDevices();  // 刷新设备列表
            } else if (targetId === 'device-management') {
                // 延迟加载设备管理数据
                setTimeout(() => {
                    if (typeof loadDevicesForManagement === 'function') {
                        loadDevicesForManagement();
                    }
                }, 100);
            } else if (targetId === 'files') {
                loadFiles();  // 刷新文件列表
            }
        });
    });
}

/**
 * 切换到指定选项卡（编程方式）
 * @param {string} tabId - 选项卡ID
 */
function switchTab(tabId) {
    console.log(`[Main] 切换到选项卡: ${tabId}`);

    // 移除所有选项卡的激活状态
    const tabs = document.querySelectorAll('.list-group-item');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 移除所有内容的激活状态
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 激活指定的选项卡内容
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');

        // 激活对应的导航项
        const navItem = document.querySelector(`.list-group-item[data-tab="${tabId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // 根据选项卡执行特定逻辑
        if (tabId === 'dashboard') {
            // 切换到仪表板时，重启Dashboard刷新
            if (typeof restartDashboardRefresh === 'function') {
                restartDashboardRefresh();
            }
        } else if (tabId === 'device-detail') {
            // 切换到设备详情时，停止Dashboard刷新
            if (typeof stopDashboardRefresh === 'function') {
                stopDashboardRefresh();
            }
        } else if (tabId === 'devices') {
            loadDevices();
        } else if (tabId === 'device-management') {
            // 延迟加载设备管理数据
            setTimeout(() => {
                if (typeof loadDevicesForManagement === 'function') {
                    loadDevicesForManagement();
                }
            }, 100);
        } else if (tabId === 'files') {
            loadFiles();
        }
    } else {
        console.error(`[Main] 找不到选项卡内容: ${tabId}`);
    }
}

// ==================== 设备管理功能 ====================
/**
 * 加载设备列表
 */
function loadDevices() {
    fetch('/api/devices')  // 发起GET请求
        .then(response => response.json())  // 解析JSON响应
        .then(data => {
            if (data.success) {  // 如果请求成功
                displayDevices(data.devices);  // 显示设备列表
                updateDeviceSelects(data.devices);  // 更新设备选择框
            }
        })
        .catch(error => console.error('加载设备失败:', error));  // 错误处理
}

/**
 * 显示设备列表
 * @param {Array} devices - 设备数组
 */
function displayDevices(devices) {
    const container = document.getElementById('devicesList');  // 获取容器
    if (devices.length === 0) {  // 如果没有设备
        container.innerHTML = '<p class="text-muted">暂无设备</p>';  // 显示提示
        return;
    }

    container.innerHTML = devices.map(device => `
        <div class="device-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="device-status ${device.status}"></span>
                    <strong>${device.name}</strong> (${device.ip})
                </div>
                <div>
                    <span class="badge bg-secondary">${device.vendor}</span>
                    <button class="btn btn-sm btn-danger" onclick="deleteDevice('${device.id}')">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </div>
            </div>
        </div>
    `).join('');  // 生成HTML并插入
}

/**
 * 更新设备选择框
 * @param {Array} devices - 设备数组
 */
function updateDeviceSelects(devices) {
    const inspectionSelect = document.getElementById('inspectionDevice');  // 巡检设备选择框
    const monitorSelect = document.getElementById('monitorDevice');  // 监控设备选择框

    const options = devices.map(d =>
        `<option value="${d.id}">${d.name} (${d.ip})</option>`  // 生成选项
    ).join('');

    // 添加null检查，防止某些页面没有这些元素
    if (inspectionSelect) {
        inspectionSelect.innerHTML = '<option value="">请选择设备</option>' + options;  // 更新巡检选择框
    }
    if (monitorSelect) {
        monitorSelect.innerHTML = '<option value="">请选择设备</option>' + options;  // 更新监控选择框
    }
}

/**
 * 处理添加设备表单提交
 * @param {Event} e - 事件对象
 */
function handleAddDevice(e) {
    e.preventDefault();  // 阻止默认提交

    // 获取表单数据
    const deviceData = {
        name: document.getElementById('deviceName').value,  // 设备名称
        ip: document.getElementById('deviceIp').value,  // IP地址
        port: document.getElementById('devicePort').value,  // 端口
        username: document.getElementById('deviceUsername').value,  // 用户名
        password: document.getElementById('devicePassword').value,  // 密码
        vendor: document.getElementById('deviceVendor').value  // 厂商
    };

    // 发送POST请求
    fetch('/api/devices', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify(deviceData)  // 转为JSON字符串
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        if (data.success) {  // 如果成功
            alert('设备添加成功！');  // 提示成功
            document.getElementById('addDeviceForm').reset();  // 重置表单
            loadDevices();  // 重新加载设备列表
            // 如果在设备管理页面，也刷新设备管理列表
            if (typeof loadDevicesForManagement === 'function') {
                setTimeout(loadDevicesForManagement, 500);
            }
        } else {
            alert('添加失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        console.error('添加设备失败:', error);  // 错误处理
        alert('添加设备失败，请检查网络连接');  // 提示错误
    });
}

/**
 * 删除设备
 * @param {string} deviceId - 设备ID
 */
function deleteDevice(deviceId) {
    if (!confirm('确定要删除这个设备吗？')) return;  // 确认删除

    fetch(`/api/devices/${deviceId}`, {method: 'DELETE'})  // 发起DELETE请求
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                alert('设备删除成功！');  // 提示成功
                loadDevices();  // 重新加载设备列表
                // 如果在设备管理页面，也刷新设备管理列表
                if (typeof loadDevicesForManagement === 'function') {
                    setTimeout(loadDevicesForManagement, 500);
                }
            } else {
                alert('删除失败: ' + data.message);  // 提示失败
            }
        })
        .catch(error => {
            console.error('删除设备失败:', error);  // 错误处理
            alert('删除设备失败');  // 提示错误
        });
}

// ==================== AI配置功能 ====================
// 注意：loadAIConfig, loadProviderConfig, handleProviderChange 已由 ai-config.js 处理
// 不要在此重复定义，否则会覆盖 ai-config.js 的实现导致模型列表无法加载

/**
 * 处理保存AI配置
 * @param {Event} e - 事件对象
 */
function handleSaveAIConfig(e) {
    e.preventDefault();  // 阻止默认提交

    const providerName = document.getElementById('aiProviderSelect').value;  // 提供商名称

    // 获取模型名称：如果选择了custom，使用自定义输入框的值，否则使用下拉选择框的值
    const modelSelect = document.getElementById('aiModelSelect');
    let modelValue = modelSelect ? modelSelect.value : '';

    // 如果选择的是custom，使用自定义输入框的值
    if (modelValue === 'custom') {
        const customModelInput = document.getElementById('aiModel');
        modelValue = customModelInput ? customModelInput.value : '';
    }

    const providerConfig = {
        name: document.getElementById('aiProviderSelect').options[document.getElementById('aiProviderSelect').selectedIndex].text,  // 提供商显示名称
        api_url: document.getElementById('aiApiUrl').value,  // API地址
        api_key: document.getElementById('aiApiKey').value,  // API密钥
        model: modelValue  // 模型（从下拉框或自定义输入框获取）
    };

    console.log('[Main] 保存AI配置:', providerConfig);  // 调试日志

    // 更新提供商配置
    fetch('/api/ai-config/provider', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify({provider_name: providerName, provider_config: providerConfig})  // 请求体
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        if (data.success) {  // 如果成功
            // 设置当前提供商
            return fetch('/api/ai-config/current-provider', {
                method: 'POST',  // POST方法
                headers: {'Content-Type': 'application/json'},  // JSON类型
                body: JSON.stringify({provider_name: providerName})  // 请求体
            });
        } else {
            throw new Error(data.message);  // 抛出错误
        }
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        if (data.success) {  // 如果成功
            alert('AI配置保存成功！');  // 提示成功
        } else {
            alert('设置当前提供商失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        console.error('保存AI配置失败:', error);  // 错误处理
        alert('保存配置失败: ' + error.message);  // 提示错误
    });
}

// ==================== 命令生成功能 ====================
/**
 * 生成网络命令
 */
function generateCommands() {
    const vendor = document.getElementById('cmdVendor').value;  // 获取厂商
    const userRequest = document.getElementById('cmdRequest').value;  // 获取用户需求

    if (!userRequest.trim()) {  // 如果需求为空
        alert('请输入您的需求描述');  // 提示
        return;
    }

    // 显示加载状态
    const button = event.target;  // 获取按钮
    button.disabled = true;  // 禁用按钮
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> 生成中...';  // 修改按钮文本

    // 发送请求
    fetch('/api/ai/generate-commands', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify({user_request: userRequest, vendor: vendor})  // 请求体
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        button.disabled = false;  // 启用按钮
        button.innerHTML = '<i class="bi bi-magic"></i> 生成命令';  // 恢复按钮文本

        if (data.success) {  // 如果成功
            document.getElementById('generatedCommands').textContent = data.commands.join('\n');  // 显示命令
            document.getElementById('generatedCommandsCard').style.display = 'block';  // 显示命令卡片
        } else {
            alert('生成命令失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        button.disabled = false;  // 启用按钮
        button.innerHTML = '<i class="bi bi-magic"></i> 生成命令';  // 恢复按钮文本
        console.error('生成命令失败:', error);  // 错误处理
        alert('生成命令失败，请检查AI配置');  // 提示错误
    });
}

// ==================== 巡检功能 ====================
/**
 * 生成巡检命令
 */
function generateInspectionCommands() {
    const vendor = document.getElementById('inspectionVendor').value;  // 获取厂商
    const button = event.target;  // 获取按钮
    button.disabled = true;  // 禁用按钮
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> 生成中...';  // 修改按钮文本

    fetch('/api/ai/generate-inspection-commands', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify({vendor: vendor})  // 请求体
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        button.disabled = false;  // 启用按钮
        button.innerHTML = '<i class="bi bi-magic"></i> 生成巡检命令';  // 恢复按钮文本

        if (data.success) {  // 如果成功
            document.getElementById('inspectionCommands').value = data.commands.join('\n');  // 显示命令
            document.getElementById('inspectionCommandsCard').style.display = 'block';  // 显示命令卡片
        } else {
            alert('生成巡检命令失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        button.disabled = false;  // 启用按钮
        button.innerHTML = '<i class="bi bi-magic"></i> 生成巡检命令';  // 恢复按钮文本
        console.error('生成巡检命令失败:', error);  // 错误处理
        alert('生成巡检命令失败');  // 提示错误
    });
}

/**
 * 开始巡检
 */
function startInspection() {
    const deviceId = document.getElementById('inspectionDevice').value;  // 获取设备ID
    const commandsText = document.getElementById('inspectionCommands').value;  // 获取命令文本
    const analyze = document.getElementById('analyzeAfterInspection').checked;  // 是否分析

    if (!deviceId) {  // 如果未选择设备
        alert('请先选择设备');  // 提示
        return;
    }

    if (!commandsText.trim()) {  // 如果命令为空
        alert('请先生成巡检命令');  // 提示
        return;
    }

    const commands = commandsText.split('\n').filter(cmd => cmd.trim());  // 分割命令并过滤空行

    // 显示进度卡片
    document.getElementById('inspectionProgressCard').style.display = 'block';  // 显示进度卡片
    document.getElementById('inspectionProgress').style.width = '0%';  // 重置进度
    document.getElementById('inspectionProgress').textContent = '0%';  // 重置进度文本
    document.getElementById('inspectionMessage').textContent = '准备中...';  // 重置消息

    // 发起巡检请求
    fetch('/api/inspection/start', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify({device_id: deviceId, commands: commands, analyze: analyze})  // 请求体
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        if (data.success) {  // 如果成功
            monitorInspectionProgress(data.task_id);  // 监控进度
        } else {
            alert('启动巡检失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        console.error('启动巡检失败:', error);  // 错误处理
        alert('启动巡检失败');  // 提示错误
    });
}

/**
 * 监控巡检进度
 * @param {string} taskId - 任务ID
 */
function monitorInspectionProgress(taskId) {
    const interval = setInterval(() => {
        fetch(`/api/inspection/progress/${taskId}`)  // 查询进度
            .then(response => response.json())  // 解析响应
            .then(data => {
                if (data.success && data.progress) {  // 如果成功
                    const progress = data.progress;  // 获取进度
                    document.getElementById('inspectionProgress').style.width = progress.progress + '%';  // 更新进度条
                    document.getElementById('inspectionProgress').textContent = progress.progress + '%';  // 更新进度文本
                    document.getElementById('inspectionMessage').textContent = progress.message;  // 更新消息

                    if (progress.stage === 'completed' || progress.stage === 'error') {  // 如果完成或错误
                        clearInterval(interval);  // 停止轮询
                        if (progress.stage === 'completed') {  // 如果完成
                            alert('巡检完成！');  // 提示完成
                            loadFiles();  // 重新加载文件列表
                        }
                    }
                }
            })
            .catch(error => console.error('获取进度失败:', error));  // 错误处理
    }, 2000);  // 每2秒查询一次
}

// ==================== 文件管理功能 ====================
/**
 * 加载文件列表
 */
function loadFiles() {
    loadInspectionFiles();  // 加载巡检文件
    loadAnalysisFiles();  // 加载分析报告
}

/**
 * 加载巡检文件列表
 */
function loadInspectionFiles() {
    fetch('/api/inspection/files')  // 发起请求
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                displayFiles(data.files, 'inspectionFilesList', 'inspection');  // 显示文件
            }
        })
        .catch(error => console.error('加载巡检文件失败:', error));  // 错误处理
}

/**
 * 加载分析报告列表
 */
function loadAnalysisFiles() {
    fetch('/api/analysis/files')  // 发起请求
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                displayFiles(data.files, 'analysisFilesList', 'analysis');  // 显示文件
            }
        })
        .catch(error => console.error('加载分析报告失败:', error));  // 错误处理
}

/**
 * 显示文件列表
 * @param {Array} files - 文件数组
 * @param {string} containerId - 容器ID
 * @param {string} fileType - 文件类型
 */
function displayFiles(files, containerId, fileType) {
    const container = document.getElementById(containerId);  // 获取容器
    if (files.length === 0) {  // 如果没有文件
        container.innerHTML = '<p class="text-muted">暂无文件</p>';  // 显示提示
        return;
    }

    container.innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">
                    ${fileType === 'inspection' ? '<input type="checkbox" class="form-check-input me-2" onclick="toggleFileSelection(\'${file.name}\')">' : ''}
                    <i class="bi bi-file-earmark-text"></i> ${file.name}
                </div>
                <div class="file-meta">
                    大小: ${(file.size / 1024).toFixed(2)} KB | 修改时间: ${file.modified}
                </div>
            </div>
            <div class="file-actions">
                ${fileType === 'inspection' ? `<button class="btn btn-sm btn-info" onclick="analyzeFile('${file.name}')"><i class="bi bi-robot"></i> AI分析</button>` : ''}
                <button class="btn btn-sm btn-primary" onclick="downloadFile('${fileType}', '${file.name}')">
                    <i class="bi bi-download"></i> 下载
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteFile('${fileType}', '${file.name}')">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </div>
        </div>
    `).join('');  // 生成HTML
}

/**
 * 下载文件
 * @param {string} fileType - 文件类型
 * @param {string} filename - 文件名
 */
function downloadFile(fileType, filename) {
    window.location.href = `/api/files/download/${fileType}/${filename}`;  // 下载文件
}

/**
 * 删除文件
 * @param {string} fileType - 文件类型
 * @param {string} filename - 文件名
 */
function deleteFile(fileType, filename) {
    if (!confirm('确定要删除这个文件吗？')) return;  // 确认删除

    fetch(`/api/files/delete/${fileType}/${filename}`, {method: 'DELETE'})  // 发起DELETE请求
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                alert('文件删除成功！');  // 提示成功
                loadFiles();  // 重新加载文件列表
            } else {
                alert('删除失败: ' + data.message);  // 提示失败
            }
        })
        .catch(error => {
            console.error('删除文件失败:', error);  // 错误处理
            alert('删除文件失败');  // 提示错误
        });
}

/**
 * 分析已有巡检文件
 * @param {string} filename - 文件名
 */
function analyzeFile(filename) {
    // 不再需要用户输入厂商，后端会自动从文件中提取
    fetch('/api/inspection/analyze', {
        method: 'POST',  // POST方法
        headers: {'Content-Type': 'application/json'},  // JSON类型
        body: JSON.stringify({filename: filename})  // 只传文件名，厂商自动提取
    })
    .then(response => response.json())  // 解析响应
    .then(data => {
        if (data.success) {  // 如果成功
            alert('分析任务已启动，请稍候...');  // 提示成功
            // 可以添加进度监控
            setTimeout(loadFiles, 5000);  // 5秒后刷新文件列表
        } else {
            alert('启动分析失败: ' + data.message);  // 提示失败
        }
    })
    .catch(error => {
        console.error('启动分析失败:', error);  // 错误处理
        alert('启动分析失败');  // 提示错误
    });
}

// ==================== 设备监控功能 ====================
/**
 * 监控设备
 */
function monitorDevice() {
    const deviceId = document.getElementById('monitorDevice').value;  // 获取设备ID
    if (!deviceId) {  // 如果未选择
        alert('请先选择设备');  // 提示
        return;
    }

    const button = event.target;  // 获取按钮
    button.disabled = true;  // 禁用按钮
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> 监控中...';  // 修改按钮文本

    fetch(`/api/monitor/${deviceId}`)  // 发起请求
        .then(response => response.json())  // 解析响应
        .then(data => {
            button.disabled = false;  // 启用按钮
            button.innerHTML = '<i class="bi bi-bar-chart"></i> 开始监控';  // 恢复按钮文本

            if (data.success) {  // 如果成功
                displayMonitorResult(data.data);  // 显示监控结果
            } else {
                alert('监控失败: ' + data.message);  // 提示失败
            }
        })
        .catch(error => {
            button.disabled = false;  // 启用按钮
            button.innerHTML = '<i class="bi bi-bar-chart"></i> 开始监控';  // 恢复按钮文本
            console.error('监控设备失败:', error);  // 错误处理
            alert('监控设备失败');  // 提示错误
        });
}

/**
 * 显示监控结果
 * @param {Object} data - 监控数据
 */
function displayMonitorResult(data) {
    const container = document.getElementById('monitorResult');  // 获取容器
    document.getElementById('monitorResultCard').style.display = 'block';  // 显示结果卡片

    let html = `<div class="row">`;  // 开始行

    // 显示状态
    html += `
        <div class="col-md-12 mb-3">
            <div class="monitor-metric">
                <div class="monitor-metric-title">设备状态</div>
                <div class="monitor-metric-value ${data.status === 'online' ? '' : 'danger'}">
                    ${data.status === 'online' ? '在线' : '离线'}
                </div>
            </div>
        </div>
    `;

    if (data.status === 'online') {  // 如果在线
        // CPU使用率
        if (data.cpu !== null && data.cpu !== undefined) {  // 如果有CPU数据
            const cpuClass = data.cpu > 80 ? 'danger' : (data.cpu > 60 ? 'warning' : '');  // 根据值设置样式
            html += `
                <div class="col-md-6 mb-3">
                    <div class="monitor-metric">
                        <div class="monitor-metric-title">CPU使用率</div>
                        <div class="monitor-metric-value ${cpuClass}">${data.cpu}%</div>
                    </div>
                </div>
            `;
        }

        // 内存使用率
        if (data.memory !== null && data.memory !== undefined) {  // 如果有内存数据
            const memClass = data.memory > 80 ? 'danger' : (data.memory > 60 ? 'warning' : '');  // 根据值设置样式
            html += `
                <div class="col-md-6 mb-3">
                    <div class="monitor-metric">
                        <div class="monitor-metric-title">内存使用率</div>
                        <div class="monitor-metric-value ${memClass}">${data.memory}%</div>
                    </div>
                </div>
            `;
        }

        // 温度
        if (data.temperature !== null && data.temperature !== undefined) {  // 如果有温度数据
            const tempClass = data.temperature > 70 ? 'danger' : (data.temperature > 50 ? 'warning' : '');  // 根据值设置样式
            html += `
                <div class="col-md-6 mb-3">
                    <div class="monitor-metric">
                        <div class="monitor-metric-title">设备温度</div>
                        <div class="monitor-metric-value ${tempClass}">${data.temperature}°C</div>
                    </div>
                </div>
            `;
        }

        // 接口状态
        if (data.interfaces && data.interfaces.length > 0) {  // 如果有接口数据
            html += `
                <div class="col-md-12 mt-3">
                    <h5>接口状态</h5>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>接口名称</th>
                                <th>管理状态</th>
                                <th>操作状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.interfaces.map(iface => `
                                <tr>
                                    <td>${iface.name}</td>
                                    <td><span class="badge ${iface.admin_status === 'up' ? 'bg-success' : 'bg-secondary'}">${iface.admin_status}</span></td>
                                    <td><span class="badge ${iface.oper_status === 'up' ? 'bg-success' : 'bg-danger'}">${iface.oper_status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    html += `</div>`;  // 结束行
    container.innerHTML = html;  // 插入HTML
}

// ==================== 仪表板功能 ====================
/**
 * 加载仪表板数据
 */
function loadDashboard() {
    // 加载设备统计数据
    fetch('/api/devices')  // 获取设备列表
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                const devices = data.devices;  // 获取设备列表
                updateDashboardMetrics(devices);  // 更新仪表板指标
                displayDashboardDevices(devices);  // 显示仪表板设备列表
            }
        })
        .catch(error => console.error('加载仪表板数据失败:', error));  // 错误处理

    // 加载巡检报告统计
    fetch('/api/analysis/files')  // 获取分析文件列表
        .then(response => response.json())  // 解析响应
        .then(data => {
            if (data.success) {  // 如果成功
                document.getElementById('totalReports').textContent = data.files.length;  // 更新报告数量
            }
        })
        .catch(error => console.error('加载报告统计失败:', error));  // 错误处理
}

/**
 * 更新仪表板指标
 * @param {Array} devices - 设备数组
 */
function updateDashboardMetrics(devices) {
    const total = devices.length;  // 总设备数
    const online = devices.filter(d => d.status === 'online').length;  // 在线设备数
    const offline = devices.filter(d => d.status === 'offline').length;  // 离线设备数

    // 更新指标显示
    document.getElementById('totalDevices').textContent = total;  // 总数
    document.getElementById('onlineDevices').textContent = online;  // 在线数
    document.getElementById('offlineDevices').textContent = offline;  // 离线数
}

/**
 * 显示仪表板设备列表
 * @param {Array} devices - 设备数组
 */
function displayDashboardDevices(devices) {
    const container = document.getElementById('dashboardDevicesList');  // 获取容器

    if (devices.length === 0) {  // 如果没有设备
        container.innerHTML = '<p class="text-center text-muted">暂无设备，请先添加设备</p>';  // 显示提示
        return;
    }

    // 生成设备列表HTML
    container.innerHTML = devices.map(device => `
        <div class="device-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="device-status ${device.status}"></span>
                    <strong>${device.name}</strong> (${device.ip})
                </div>
                <div>
                    <span class="badge bg-secondary">${device.vendor}</span>
                    <span class="badge ${device.status === 'online' ? 'bg-success' : (device.status === 'offline' ? 'bg-danger' : 'bg-secondary')}">
                        ${device.status === 'online' ? '在线' : (device.status === 'offline' ? '离线' : '未知')}
                    </span>
                </div>
            </div>
        </div>
    `).join('');  // 生成HTML并插入
}

// ==================== 添加设备模态框功能 ====================
/**
 * 打开添加设备模态框
 */
function openAddDeviceModal() {
    const addDeviceModal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
    addDeviceModal.show();
}

/**
 * 从模态框添加设备
 */
function addDeviceFromModal() {
    // 获取表单数据
    const deviceData = {
        name: document.getElementById('modalDeviceName').value,
        ip: document.getElementById('modalDeviceIp').value,
        port: document.getElementById('modalDevicePort').value,
        username: document.getElementById('modalDeviceUsername').value,
        password: document.getElementById('modalDevicePassword').value,
        vendor: document.getElementById('modalDeviceVendor').value
    };

    // 验证必填字段
    if (!deviceData.ip || !deviceData.username || !deviceData.password || !deviceData.vendor) {
        alert('请填写所有必填字段');
        return;
    }

    // 发送POST请求
    fetch('/api/devices', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(deviceData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('设备添加成功！');
            // 关闭模态框
            const addDeviceModal = bootstrap.Modal.getInstance(document.getElementById('addDeviceModal'));
            addDeviceModal.hide();
            // 重置表单
            document.getElementById('modalAddDeviceForm').reset();
            // 重新加载设备列表
            loadDevices();
            // 如果在设备管理页面，也刷新设备管理列表
            if (typeof loadDevicesForManagement === 'function') {
                setTimeout(loadDevicesForManagement, 500);
            }
        } else {
            alert('添加失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('添加设备失败:', error);
        alert('添加设备失败，请检查网络连接');
    });
}