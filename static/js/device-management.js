/**
 * 设备管理模块 - JavaScript
 * 实现设备的增删改查功能
 */

// 全局变量存储当前设备信息
let currentDevices = [];
let selectedDeviceIds = new Set();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定设备管理选项卡的显示事件
    const deviceManagementTab = document.querySelector('[data-tab="device-management"]');
    if (deviceManagementTab) {
        deviceManagementTab.addEventListener('click', function() {
            // 延迟加载设备数据，确保DOM已完全渲染
            setTimeout(() => {
                loadDevicesForManagement();
            }, 100);
        });
    }

    // 绑定全选复选框事件
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }

    // 绑定刷新按钮事件
    const refreshButton = document.querySelector('#device-management .btn-primary');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadDevicesForManagement);
    }

    // 绑定删除选中按钮事件
    const deleteSelectedButton = document.querySelector('#device-management .btn-danger');
    if (deleteSelectedButton) {
        deleteSelectedButton.addEventListener('click', deleteSelectedDevices);
    }
});

/**
 * 加载设备列表用于管理
 */
function loadDevicesForManagement() {
    console.log('[DeviceManagement] 加载设备列表...');
    
    fetch('/api/devices')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentDevices = data.devices;
                displayDevicesForManagement(data.devices);
                console.log('[DeviceManagement] 设备列表加载完成');
            } else {
                console.error('[DeviceManagement] 加载设备列表失败:', data.message);
                showManagementError('加载设备列表失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('[DeviceManagement] 加载设备列表出错:', error);
            showManagementError('加载设备列表出错，请检查网络连接');
        });
}

/**
 * 显示设备管理表格
 * @param {Array} devices - 设备数组
 */
function displayDevicesForManagement(devices) {
    const tableBody = document.getElementById('deviceManagementTable');
    if (!tableBody) return;

    if (!devices || devices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无设备数据</td></tr>';
        return;
    }

    // 生成表格行
    const rows = devices.map(device => {
        // 获取设备详细信息（如果有的话）
        const modelName = device.model || device.device_model || '-';
        const serialNumber = device.serial_number || device.serial || '-';
        const softwareVersion = device.version || device.software_version || '-';
        
        return `
            <tr data-device-id="${device.id}">
                <td><input type="checkbox" class="device-checkbox" data-device-id="${device.id}" onchange="toggleDeviceSelection('${device.id}')"></td>
                <td>${device.name || '-'}</td>
                <td>${device.ip || '-'}</td>
                <td>${device.vendor || '-'}</td>
                <td>${modelName}</td>
                <td>${serialNumber}</td>
                <td>${softwareVersion}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="viewDeviceDetails('${device.id}')" title="查看详情">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="openEditDeviceModal('${device.id}')" title="编辑">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDevice('${device.id}')" title="删除">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rows;

    // 更新全选状态
    updateSelectAllState();
}

/**
 * 显示管理错误信息
 * @param {string} message - 错误信息
 */
function showManagementError(message) {
    const tableBody = document.getElementById('deviceManagementTable');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${message}</td></tr>`;
    }
}

/**
 * 切换设备选择状态
 * @param {string} deviceId - 设备ID
 */
function toggleDeviceSelection(deviceId) {
    const checkbox = document.querySelector(`.device-checkbox[data-device-id="${deviceId}"]`);
    if (checkbox && checkbox.checked) {
        selectedDeviceIds.add(deviceId);
    } else {
        selectedDeviceIds.delete(deviceId);
    }
    
    updateSelectAllState();
}

/**
 * 切换全选状态
 */
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.device-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const deviceId = checkbox.getAttribute('data-device-id');
        if (selectAllCheckbox.checked) {
            selectedDeviceIds.add(deviceId);
        } else {
            selectedDeviceIds.delete(deviceId);
        }
    });
}

/**
 * 更新全选复选框状态
 */
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const allCheckboxes = document.querySelectorAll('.device-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.device-checkbox:checked');
    
    if (allCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

/**
 * 删除选中的设备
 */
function deleteSelectedDevices() {
    if (selectedDeviceIds.size === 0) {
        alert('请先选择要删除的设备');
        return;
    }

    if (!confirm(`确定要删除选中的 ${selectedDeviceIds.size} 个设备吗？`)) {
        return;
    }

    // 转换为数组并逐个删除
    const deviceIds = Array.from(selectedDeviceIds);
    let deleteCount = 0;
    let errorCount = 0;

    // 递归删除设备
    function deleteNextDevice() {
        if (deviceIds.length === 0) {
            // 所有设备删除完成
            if (errorCount > 0) {
                alert(`删除成功 ${deleteCount} 个设备，失败 ${errorCount} 个设备`);
            } else {
                alert(`成功删除 ${deleteCount} 个设备`);
            }
            
            // 重新加载设备列表
            loadDevicesForManagement();
            selectedDeviceIds.clear();
            updateSelectAllState();
            return;
        }

        const deviceId = deviceIds.pop();
        deleteDevice(deviceId, false) // 不显示确认对话框
            .then(success => {
                if (success) {
                    deleteCount++;
                } else {
                    errorCount++;
                }
                deleteNextDevice(); // 继续删除下一个设备
            })
            .catch(() => {
                errorCount++;
                deleteNextDevice(); // 继续删除下一个设备
            });
    }

    deleteNextDevice();
}

/**
 * 删除单个设备
 * @param {string} deviceId - 设备ID
 * @param {boolean} showConfirm - 是否显示确认对话框
 * @returns {Promise<boolean>} 删除是否成功
 */
function deleteDevice(deviceId, showConfirm = true) {
    return new Promise((resolve) => {
        // 查找设备名称用于提示
        const device = currentDevices.find(d => d.id === deviceId);
        const deviceName = device ? (device.name || device.ip) : '该设备';

        if (showConfirm && !confirm(`确定要删除设备 "${deviceName}" 吗？`)) {
            resolve(false);
            return;
        }

        fetch(`/api/devices/${deviceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`[DeviceManagement] 设备 "${deviceName}" 删除成功`);
                // 从选中列表中移除
                selectedDeviceIds.delete(deviceId);
                resolve(true);
            } else {
                console.error(`[DeviceManagement] 删除设备 "${deviceName}" 失败:`, data.message);
                alert(`删除设备 "${deviceName}" 失败: ${data.message}`);
                resolve(false);
            }
        })
        .catch(error => {
            console.error(`[DeviceManagement] 删除设备 "${deviceName}" 出错:`, error);
            alert(`删除设备 "${deviceName}" 出错，请检查网络连接`);
            resolve(false);
        });
    });
}

/**
 * 打开编辑设备模态框
 * @param {string} deviceId - 设备ID
 */
function openEditDeviceModal(deviceId) {
    // 查找设备信息
    const device = currentDevices.find(d => d.id === deviceId);
    if (!device) {
        alert('未找到设备信息');
        return;
    }

    // 填充表单数据
    document.getElementById('editDeviceId').value = device.id;
    document.getElementById('editDeviceName').value = device.name || '';
    document.getElementById('editDeviceVendor').value = device.vendor || '';
    document.getElementById('editDeviceIp').value = device.ip || '';
    document.getElementById('editDevicePort').value = device.port || 22;
    document.getElementById('editDeviceUsername').value = device.username || '';
    document.getElementById('editDeviceModel').value = device.model || device.device_model || '';
    document.getElementById('editDeviceSerial').value = device.serial_number || device.serial || '';
    document.getElementById('editDeviceVersion').value = device.version || device.software_version || '';

    // 清空密码字段
    document.getElementById('editDevicePassword').value = '';

    // 显示模态框
    const editModal = new bootstrap.Modal(document.getElementById('editDeviceModal'));
    editModal.show();
}

/**
 * 保存设备更改
 */
function saveDeviceChanges() {
    // 获取表单数据
    const deviceId = document.getElementById('editDeviceId').value;
    const deviceData = {
        name: document.getElementById('editDeviceName').value,
        vendor: document.getElementById('editDeviceVendor').value,
        ip: document.getElementById('editDeviceIp').value,
        port: parseInt(document.getElementById('editDevicePort').value) || 22,
        username: document.getElementById('editDeviceUsername').value,
        model: document.getElementById('editDeviceModel').value,
        serial_number: document.getElementById('editDeviceSerial').value,
        version: document.getElementById('editDeviceVersion').value
    };

    // 如果密码字段不为空，则更新密码
    const password = document.getElementById('editDevicePassword').value;
    if (password) {
        deviceData.password = password;
    }

    // 验证必填字段
    if (!deviceData.name || !deviceData.vendor || !deviceData.ip || !deviceData.username) {
        alert('请填写所有必填字段');
        return;
    }

    // 发送更新请求
    fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(deviceData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('设备信息更新成功');
            // 关闭模态框
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editDeviceModal'));
            editModal.hide();
            // 重新加载设备列表
            loadDevicesForManagement();
        } else {
            alert('更新设备信息失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('[DeviceManagement] 更新设备信息出错:', error);
        alert('更新设备信息出错，请检查网络连接');
    });
}

/**
 * 扩展设备管理器功能到全局作用域
 */
window.loadDevicesForManagement = loadDevicesForManagement;
window.toggleDeviceSelection = toggleDeviceSelection;
window.toggleSelectAll = toggleSelectAll;
window.deleteSelectedDevices = deleteSelectedDevices;
window.deleteDevice = deleteDevice;
window.openEditDeviceModal = openEditDeviceModal;
window.saveDeviceChanges = saveDeviceChanges;