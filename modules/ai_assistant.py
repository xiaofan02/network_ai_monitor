# -*- coding: utf-8 -*-
"""
AI助手模块
负责调用AI API生成网络命令和分析巡检结果
"""

import requests  # HTTP请求库
import json  # JSON数据处理


class AIAssistant:
    """AI助手类，用于调用AI API"""

    def __init__(self, api_url, api_key, model):
        """
        初始化AI助手
        :param api_url: AI API地址
        :param api_key: API密钥
        :param model: 使用的模型名称
        """
        self.api_url = api_url  # API地址
        self.api_key = api_key  # API密钥
        self.model = model  # 模型名称

    def _call_api(self, messages, temperature=0.7, max_tokens=4000):
        """
        调用AI API
        :param messages: 消息列表（对话历史）
        :param temperature: 温度参数（控制随机性，0-1）
        :param max_tokens: 最大生成token数
        :return: AI响应内容
        """
        try:
            # 检查必要参数
            if not self.model or not self.model.strip():
                print("错误：模型名称未配置，请在AI设置中配置model字段")
                return None

            if not self.api_key or not self.api_key.strip():
                print("错误：API密钥未配置")
                return None

            # 构建请求头
            headers = {
                'Content-Type': 'application/json',  # 内容类型
                'Authorization': f'Bearer {self.api_key}'  # 认证信息
            }

            # 构建请求体
            payload = {
                'model': self.model,  # 模型名称
                'messages': messages,  # 消息列表
                'temperature': temperature,  # 温度参数
                'max_tokens': max_tokens  # 最大token数
            }

            # 发送POST请求
            response = requests.post(
                self.api_url,  # API地址
                headers=headers,  # 请求头
                json=payload,  # 请求体
                timeout=60  # 超时时间60秒
            )

            # 检查响应状态
            if response.status_code == 200:  # 请求成功
                result = response.json()  # 解析JSON响应
                # 提取AI回复内容
                return result.get('choices', [{}])[0].get('message', {}).get('content', '')  # 返回内容
            else:  # 请求失败
                print(f"API调用失败，状态码: {response.status_code}")  # 打印状态码
                print(f"响应内容: {response.text}")  # 打印响应内容
                return None  # 返回None

        except Exception as e:  # 异常处理
            print(f"调用AI API失败: {e}")  # 打印错误信息
            return None  # 返回None

    def generate_commands(self, user_request, vendor):
        """
        生成网络命令
        :param user_request: 用户需求描述
        :param vendor: 设备厂商
        :return: 生成的命令列表
        """
        # 构建提示词
        system_prompt = f"""你是一个专业的网络工程师助手，擅长{vendor}设备的配置和管理。
请根据用户的需求，生成相应的{vendor}网络设备命令。
要求：
1. 命令必须准确、可执行
2. 考虑命令的顺序和依赖关系
3. 只输出命令，每行一条，不要有多余的解释
4. 如果需要进入特定视图，请包含进入和退出视图的命令"""

        user_prompt = f"用户需求：{user_request}\n\n请生成{vendor}设备的配置命令："

        # 构建消息列表
        messages = [
            {'role': 'system', 'content': system_prompt},  # 系统提示
            {'role': 'user', 'content': user_prompt}  # 用户输入
        ]

        # 调用API
        response = self._call_api(messages, temperature=0.3)  # 使用较低温度以获得更确定的输出

        if response:  # 如果有响应
            # 解析命令（按行分割，去除空行和注释）
            commands = [
                line.strip()  # 去除首尾空格
                for line in response.split('\n')  # 按行分割
                if line.strip() and not line.strip().startswith('#')  # 过滤空行和注释
            ]
            return commands  # 返回命令列表
        return []  # 返回空列表

    def generate_inspection_commands(self, vendor):
        """
        生成巡检命令
        :param vendor: 设备厂商
        :return: 巡检命令列表
        """
        # 构建提示词
        system_prompt = f"""你是一个专业的网络运维工程师，擅长{vendor}设备的巡检。
请生成一套完整的{vendor}设备巡检命令，用于收集设备的健康状态信息。
要求：
1. 命令要全面，包括CPU、内存、接口状态、温度、日志等
2. 只输出命令，每行一条
3. 不要包含配置修改命令，只包含查询命令
4. 命令顺序要合理"""

        user_prompt = f"请生成{vendor}设备的完整巡检命令列表："

        # 构建消息列表
        messages = [
            {'role': 'system', 'content': system_prompt},  # 系统提示
            {'role': 'user', 'content': user_prompt}  # 用户输入
        ]

        # 调用API
        response = self._call_api(messages, temperature=0.3)  # 使用较低温度

        if response:  # 如果有响应
            # 解析命令
            commands = [
                line.strip()  # 去除空格
                for line in response.split('\n')  # 分割行
                if line.strip() and not line.strip().startswith('#')  # 过滤
            ]
            return commands  # 返回命令列表
        return []  # 返回空列表

    def analyze_inspection_result(self, inspection_output, vendor):
        """
        分析巡检结果
        :param inspection_output: 设备巡检输出内容
        :param vendor: 设备厂商
        :return: 分析报告
        """
        # 智能截断内容，避免超出token限制
        # 粗略估算：中文1字符≈1 token，英文1字符≈0.5 token
        # 为了安全起见，我们限制到20000个字符（约15000 tokens，留足够的空间给system prompt和response）
        max_chars = 20000

        truncated_output = inspection_output
        if len(inspection_output) > max_chars:
            print(f"[警告] 巡检内容过长（{len(inspection_output)}字符），进行智能截断到{max_chars}字符")

            # 智能截断策略：保留开头和关键部分
            # 1. 保留前40%的内容（通常包含设备基本信息）
            head_chars = int(max_chars * 0.4)
            # 2. 保留中间部分作为采样（接口状态等）
            middle_start = len(inspection_output) // 2 - int(max_chars * 0.2)
            middle_end = middle_start + int(max_chars * 0.4)
            # 3. 保留后20%的内容（通常包含日志和错误信息）
            tail_chars = int(max_chars * 0.2)

            truncated_output = (
                inspection_output[:head_chars] +
                "\n\n[... 中间部分已省略，以下是采样内容 ...]\n\n" +
                inspection_output[middle_start:middle_end] +
                "\n\n[... 中间部分已省略，以下是尾部内容 ...]\n\n" +
                inspection_output[-tail_chars:]
            )

            print(f"[信息] 截断后内容长度: {len(truncated_output)}字符")

        # 构建提示词
        system_prompt = f"""你是一个专业的网络运维专家，擅长分析{vendor}设备的运行状态。
请仔细分析设备的巡检输出，识别潜在问题和异常，并给出专业建议。

分析要点：
1. 设备整体健康状态
2. CPU、内存使用率是否正常
3. 接口状态和流量是否异常
4. 是否有错误日志或告警
5. 设备温度是否正常
6. 其他需要关注的问题

请给出详细的分析报告，格式清晰，重点突出。

注意：如果巡检内容被截断，请根据提供的部分进行分析，并在报告中说明可能存在的信息不完整情况。"""

        user_prompt = f"以下是{vendor}设备的巡检输出，请进行分析：\n\n{truncated_output}"

        # 构建消息列表
        messages = [
            {'role': 'system', 'content': system_prompt},  # 系统提示
            {'role': 'user', 'content': user_prompt}  # 用户输入
        ]

        # 调用API（分析需要更多token）
        response = self._call_api(messages, temperature=0.5, max_tokens=4000)  # 中等温度，更多token

        return response if response else "分析失败，请检查AI配置"  # 返回分析结果

    def analyze_inspection_detailed(self, output_text, device_info):
        """
        优化的AI分析逻辑 - 提供5维度专业网络诊断建议
        :param output_text: 设备巡检输出内容
        :param device_info: 设备信息字典
        :return: 详细的分析报告
        """
        from datetime import datetime  # 导入时间模块

        # 限制输出长度避免超出token限制
        truncated_output = output_text[:5000] if len(output_text) > 5000 else output_text

        # 构建详细的分析提示词
        prompt = f"""你是一位资深的网络工程师和安全专家，拥有15年以上的网络设备管理和故障排查经验。现在需要分析以下网络设备的巡检输出。

**设备信息**:
- 设备名称: {device_info.get('name', '未知')}
- 设备类型: {device_info.get('vendor', '未知')}
- IP地址: {device_info.get('ip', '未知')}
- 巡检时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

**巡检输出内容**:
```
{truncated_output}
```

请从以下5个专业维度进行深度分析，提供具体且可执行的建议：

## 📊 1. 性能分析 (Performance Analysis)
### 当前状态评估
- **CPU使用率**: 是否正常？是否存在异常进程占用CPU？
- **内存使用情况**: 使用率如何？是否接近告警阈值（通常>80%需关注）？
- **接口流量分析**: 流量是否均衡？是否存在流量异常？
- **丢包率和错误率**: CRC错误、输入/输出丢包情况

### 性能瓶颈识别
- 识别可能的性能瓶颈点
- 预测未来1-3个月的容量趋势

### 优化建议
- 具体的性能优化措施
- 优先级排序（P0/P1/P2）

---

## 🔒 2. 安全评估 (Security Assessment)
### 安全风险识别
- 是否发现未授权访问尝试？
- 登录日志是否有异常（如暴力破解、异地登录）？
- ACL/防火墙规则是否合理？
- 是否存在已知CVE漏洞特征？

### 安全加固建议
- AAA配置优化建议
- 密码策略和访问控制改进
- 日志审计机制完善

---

## ⚙️ 3. 配置优化 (Configuration Optimization)
### 配置审查
- **VLAN配置**: 是否合理？是否存在未使用的VLAN？
- **路由配置**: 路由表是否最优？是否存在次优路径？
- **STP配置**: 是否存在环路风险？根桥选举是否合理？
- **QoS策略**: 是否匹配业务需求？

### 最佳实践建议
- 业界最佳实践对比
- 配置模板和示例命令

---

## ⚠️ 4. 故障预警 (Fault Warning)
### 潜在故障识别
- **硬件健康**: 风扇、电源、温度是否正常？
- **接口状态**: 是否有频繁Up/Down的接口？
- **协议稳定性**: BGP/OSPF邻居是否稳定？
- **日志告警**: 是否有Critical/Error级别日志？

### 预防措施
- 需要立即关注的问题（红色告警）
- 近期需要处理的隐患（黄色告警）
- 长期监控事项（蓝色提示）

---

## 🔧 5. 运维建议 (Operational Recommendations)
### 立即处理 (P0 - 24小时内)
- 列出需要立即处理的问题
- 提供具体的处理步骤和命令

### 近期优化 (P1 - 本周内)
- 需要在本周内完成的优化项
- 预估工作量和影响范围

### 长期改进 (P2 - 本月内)
- 长期规划建议
- 架构优化方向

### 预防性维护计划
- 建议的定期巡检项目
- 配置备份策略
- 硬件生命周期管理

---

## 📈 总体评分
请给出设备健康度评分（0-100分）并说明评分依据：
- **性能得分**: XX/20分
- **安全得分**: XX/20分
- **配置得分**: XX/20分
- **稳定性得分**: XX/20分
- **可维护性得分**: XX/20分
- **总分**: XX/100分

---

**输出要求**:
1. 使用清晰的Markdown格式
2. 每个建议必须具体、可执行、有针对性
3. 提供命令示例时使用代码块格式
4. 优先级明确标注（P0/P1/P2）
5. 避免空泛的建议，要有数据支撑
"""

        # 构建消息列表
        messages = [
            {
                "role": "system",
                "content": "你是一位经验丰富的网络运维专家，擅长网络设备巡检分析、故障诊断和性能优化。你的分析必须专业、准确、可执行。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        # 使用较低温度确保输出专业准确，增加token数以获得完整分析
        response = self._call_api(messages, temperature=0.3, max_tokens=4000)

        return response if response else "分析失败，请检查AI配置"

    def chat(self, user_message, conversation_history=None):
        """
        通用对话接口
        :param user_message: 用户消息
        :param conversation_history: 对话历史（可选）
        :return: AI回复
        """
        # 构建消息列表
        messages = conversation_history if conversation_history else []  # 使用历史或新建
        messages.append({'role': 'user', 'content': user_message})  # 添加用户消息

        # 调用API
        response = self._call_api(messages)  # 调用API

        return response if response else "回复失败，请检查AI配置"  # 返回响应