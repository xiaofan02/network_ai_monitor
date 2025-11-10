/**
 * AI配置管理 - JavaScript模块
 * 处理AI模型选择、测试连接、高级设置等功能
 */

// AI提供商的预设模型配置
const AI_MODELS = {
    siliconflow: [
        { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B-Instruct (推荐)' },
        { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B-Instruct' },
        { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B-Instruct' },
        { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek-V2.5' },
        { value: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B-Chat' },
        { value: 'Pro/Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B-Instruct-Pro' },
        { value: 'custom', label: '✏️ 自定义模型' }
    ],
    openai: [
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (推荐)' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
        { value: 'custom', label: '✏️ 自定义模型' }
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (推荐)' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' },
        { value: 'custom', label: '✏️ 自定义模型' }
    ],
    custom: [
        { value: 'custom', label: '✏️ 自定义模型' }
    ]
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeAIConfig();
});

// 初始化AI配置功能
function initializeAIConfig() {
    console.log('[AI Config] 初始化AI配置模块...');

    // 监听提供商变更
    const providerSelect = document.getElementById('aiProviderSelect');
    if (providerSelect) {
        providerSelect.addEventListener('change', handleProviderChange);
    }

    // 监听模型选择变更
    const modelSelect = document.getElementById('aiModelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', handleModelSelectChange);
    }

    // 监听温度滑动条变化
    const temperatureSlider = document.getElementById('aiTemperature');
    const temperatureValue = document.getElementById('temperatureValue');
    if (temperatureSlider && temperatureValue) {
        temperatureSlider.addEventListener('input', function() {
            temperatureValue.textContent = this.value;
        });
    }

    // 立即初始化模型列表（在加载配置之前）
    handleProviderChange();
    console.log('[AI Config] 模型列表初始化完成');

    // 加载现有配置（异步）
    loadAIConfig();
}

// 处理提供商变更
function handleProviderChange() {
    const provider = document.getElementById('aiProviderSelect').value;
    const modelSelect = document.getElementById('aiModelSelect');

    console.log(`[AI Config] handleProviderChange 被调用，当前provider: ${provider}`);

    // 清空模型列表
    modelSelect.innerHTML = '';

    // 加载对应提供商的模型
    const models = AI_MODELS[provider] || AI_MODELS.custom;
    console.log(`[AI Config] 准备加载 ${models.length} 个模型`);

    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
    });

    console.log(`[AI Config] 模型列表已更新，当前选项数: ${modelSelect.options.length}`);

    // 触发模型选择变更
    handleModelSelectChange();
}

// 处理模型选择变更
function handleModelSelectChange() {
    const modelSelect = document.getElementById('aiModelSelect');
    const customModelGroup = document.getElementById('customModelInputGroup');

    if (modelSelect.value === 'custom') {
        customModelGroup.style.display = 'block';
    } else {
        customModelGroup.style.display = 'none';
    }
}

// 加载AI配置
async function loadAIConfig() {
    console.log('[AI Config] 开始加载AI配置...');
    try {
        const response = await fetch('/api/ai-config');
        const data = await response.json();

        console.log('[AI Config] API返回数据:', data);

        // 修复：API返回的格式是 {success: true, config: {...}}
        const config = data.config || data;

        console.log('[AI Config] 当前提供商:', config.current_provider);

        if (config.current_provider) {
            document.getElementById('aiProviderSelect').value = config.current_provider;
            console.log('[AI Config] 切换提供商后，重新调用handleProviderChange...');
            handleProviderChange(); // 更新模型列表
        }

        const currentProvider = config.providers && config.providers[config.current_provider];
        if (currentProvider) {
            console.log('[AI Config] 当前提供商配置:', currentProvider);

            document.getElementById('aiApiUrl').value = currentProvider.api_url || '';
            document.getElementById('aiApiKey').value = currentProvider.api_key || '';

            // 设置模型
            const modelSelect = document.getElementById('aiModelSelect');
            const modelValue = currentProvider.model;
            console.log('[AI Config] 保存的模型值:', modelValue);
            console.log('[AI Config] 当前模型列表选项数:', modelSelect.options.length);

            const modelExists = Array.from(modelSelect.options).some(opt => opt.value === modelValue);
            console.log('[AI Config] 模型是否存在于列表:', modelExists);

            if (modelExists) {
                modelSelect.value = modelValue;
                console.log('[AI Config] 设置为保存的模型:', modelValue);
            } else {
                modelSelect.value = 'custom';
                document.getElementById('aiModel').value = modelValue || '';
                console.log('[AI Config] 模型不在列表中，设置为custom，自定义值:', modelValue);
            }

            handleModelSelectChange();

            // 加载高级设置
            if (currentProvider.temperature !== undefined) {
                document.getElementById('aiTemperature').value = currentProvider.temperature;
                document.getElementById('temperatureValue').textContent = currentProvider.temperature;
            }
            if (currentProvider.max_tokens) {
                document.getElementById('aiMaxTokens').value = currentProvider.max_tokens;
            }
        } else {
            console.log('[AI Config] 未找到当前提供商的配置');
        }

        console.log('[AI Config] 配置加载完成');
    } catch (error) {
        console.error('[AI Config] 加载AI配置失败:', error);
    }
}

// 测试AI连接
async function testAIConnection() {
    const testResult = document.getElementById('testResult');
    const testAlert = document.getElementById('testAlert');
    const testMessage = document.getElementById('testMessage');

    // 获取配置
    const apiUrl = document.getElementById('aiApiUrl').value;
    const apiKey = document.getElementById('aiApiKey').value;
    const modelSelect = document.getElementById('aiModelSelect');
    let model = modelSelect.value;

    if (model === 'custom') {
        model = document.getElementById('aiModel').value;
    }

    const temperature = parseFloat(document.getElementById('aiTemperature').value);

    if (!apiUrl || !apiKey || !model) {
        showTestResult('danger', '请填写完整的API配置信息');
        return;
    }

    // 显示测试中
    testResult.style.display = 'block';
    testAlert.className = 'alert alert-info';
    testMessage.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>测试连接中...';

    try {
        const startTime = Date.now();

        const response = await fetch('/api/ai-config/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_url: apiUrl,
                api_key: apiKey,
                model: model,
                temperature: temperature
            })
        });

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        if (response.ok && result.success) {
            showTestResult('success', `✅ 连接成功！响应时间: ${responseTime}ms`);
        } else {
            showTestResult('danger', `❌ 连接失败: ${result.error || '未知错误'}`);
        }
    } catch (error) {
        showTestResult('danger', `❌ 连接失败: ${error.message}`);
    }
}

// 显示测试结果
function showTestResult(type, message) {
    const testResult = document.getElementById('testResult');
    const testAlert = document.getElementById('testAlert');
    const testMessage = document.getElementById('testMessage');

    testResult.style.display = 'block';
    testAlert.className = `alert alert-${type}`;
    testMessage.textContent = message;

    // 3秒后自动隐藏（仅对成功消息）
    if (type === 'success') {
        setTimeout(() => {
            testResult.style.display = 'none';
        }, 3000);
    }
}

// 保存高级设置
async function saveAdvancedSettings() {
    const temperature = parseFloat(document.getElementById('aiTemperature').value);
    const maxTokens = parseInt(document.getElementById('aiMaxTokens').value);
    const provider = document.getElementById('aiProviderSelect').value;

    try {
        // 先获取当前配置
        const getResponse = await fetch('/api/ai-config');
        const data = await getResponse.json();

        // 修复：正确提取配置对象
        const config = data.config || data;

        // 检查providers是否存在
        if (!config.providers || !config.providers[provider]) {
            throw new Error(`未找到提供商 "${provider}" 的配置`);
        }

        // 更新高级设置
        config.providers[provider].temperature = temperature;
        config.providers[provider].max_tokens = maxTokens;

        // 保存配置 - 修复参数名称以匹配后端API
        const saveResponse = await fetch('/api/ai-config/provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider_name: provider,  // 修复：使用正确的参数名
                provider_config: config.providers[provider]  // 修复：使用正确的参数名
            })
        });

        const result = await saveResponse.json();

        if (saveResponse.ok && result.success) {
            showAlert('success', '✅ 高级设置已保存');
        } else {
            throw new Error(result.message || '保存失败');
        }
    } catch (error) {
        console.error('[AI Config] 保存高级设置失败:', error);
        showAlert('danger', `❌ 保存失败: ${error.message}`);
    }
}

// 通用提示函数
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}