# AI网络监控分析智能体平台

[English Version](Readme_eng.md)

## 项目简介

AI网络监控分析智能体平台是一个基于Flask的网络设备监控系统，支持多厂商设备（Cisco、华为、H3C、Juniper、Fortinet、Arista、HP、Dell、ZTE、Linux、Windows等）的实时监控、接口信息获取、设备管理等功能。系统集成了AI分析能力，可以对设备巡检结果进行智能分析。

## 功能特性

### 核心功能
- **多厂商设备支持**：支持Cisco、华为、H3C、Juniper、Fortinet、Arista、HP、Dell、ZTE、Linux、Windows等主流网络设备和服务器操作系统
- **实时设备监控**：监控设备的CPU、内存、温度等关键指标
- **接口信息管理**：获取并展示设备接口状态信息
- **设备管理**：完整的CRUD操作（创建、读取、更新、删除设备）
- **设备巡检**：执行设备命令巡检并生成报告
- **AI智能分析**：集成AI模型对巡检结果进行智能分析
- **命令生成**：基于AI生成特定厂商设备的配置命令

### 乱码处理机制
- **控制字符过滤**：自动过滤ASCII控制字符（包括\b退格符）
- **垃圾数据清理**：移除"unassigned"、"unset"等无效字符串
- **调试信息输出**：提供过滤前后的对比信息，便于验证处理效果

## 系统架构

```
AI网络监控分析智能体平台
├── ai_monitor_app.py          # Flask主应用
├── config/                    # 配置文件目录
│   ├── devices.json           # 设备信息存储
│   └── ai_config.json         # AI配置文件
├── modules/                   # 功能模块
│   ├── device_manager.py      # 设备管理模块
│   ├── ssh_connector.py       # SSH连接模块
│   ├── monitor.py             # 设备监控模块
│   ├── inspection.py          # 设备巡检模块
│   └── ai_assistant.py        # AI助手模块
├── static/                    # 静态资源
│   ├── css/                   # 样式文件
│   ├── js/                    # JavaScript文件
│   └── images/                # 图片资源
├── templates/                 # HTML模板
│   └── index.html             # 主页面模板
├── outputs/                   # 输出文件目录
│   ├── inspection/            # 巡检结果存储
│   └── analysis/              # 分析报告存储
└── requirements.txt           # 项目依赖
```

## 安装部署

### 环境要求
- Python 3.7+
- Flask 3.0.0
- paramiko 3.4.0
- requests 2.31.0

### 安装步骤

1. 克隆项目代码：
```bash
git clone <repository-url>
cd network_ai_monitor
```

2. 创建虚拟环境：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 配置AI密钥：
编辑 `config/ai_config.json` 文件，填入您的AI服务密钥。

5. 启动应用：
```bash
python ai_monitor_app.py
```

6. 访问应用：
打开浏览器访问 `http://127.0.0.1:5001`

## 使用说明

### 添加设备
1. 点击左侧导航栏的"设备管理"选项卡
2. 点击"添加设备"按钮
3. 填写设备信息（IP地址、用户名、密码、厂商等）
   - 支持的厂商包括：华为、华三、思科(IOS)、思科(NX-OS)、锐捷、飞塔、瞻博、Arista、惠普、戴尔、中兴、Linux、Windows、其他
4. 点击"添加设备"完成添加

### 设备监控
1. 在设备列表中点击设备的"详情"按钮
2. 查看设备的实时监控数据（CPU、内存、温度等）
3. 查看设备接口状态信息

### 命令生成
1. 点击左侧导航栏的"命令生成"选项卡
2. 选择设备厂商（支持所有已添加的厂商类型）
3. 描述您的需求（例如："配置VLAN 10，并将端口GigabitEthernet0/0/1加入该VLAN"）
4. 点击"生成命令"按钮
5. 查看AI生成的设备配置命令

### 设备巡检
1. 点击左侧导航栏的"设备巡检"选项卡
2. 选择要巡检的设备和厂商类型
3. 点击"生成巡检命令"按钮
4. 可编辑生成的巡检命令
5. 点击"开始巡检"按钮
6. 等待巡检完成，查看巡检结果

### AI分析
1. 在巡检结果页面点击"AI分析"按钮
2. 等待AI分析完成
3. 查看AI生成的分析报告

## 乱码处理机制详解

### 问题背景
在获取Cisco设备接口信息时，可能会遇到包含控制字符的乱码输出，如：
```bash
\b\b\b\b\b\b\b\b\b DOWN \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20 0 B 0 B 0 IP: \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20, Status: unset/down
```

### 解决方案
系统实现了专门的乱码过滤机制：

1. **控制字符过滤**：
   - 移除ASCII值小于32的控制字符（包括\b退格符）
   - 移除ASCII值等于127的删除字符

2. **特定字符串过滤**：
   - 移除"unassigned"（未分配IP地址的标识）
   - 移除"unset"（未设置状态的标识）
   - 移除多余的"DOWN"和"UP"字符串

3. **调试信息输出**：
   - 打印原始输出用于调试
   - 打印过滤前后的字符串对比，便于验证过滤效果

### 处理效果
经过过滤后，乱码数据被正确清理：
```
原始: \b\b\b\b\b\b\b\b\b DOWN \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20 0 B 0 B 0 IP: \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20, Status: unset/down
过滤后: GigabitEthernet1/0/20 0 B 0 B 0 IP: GigabitEthernet1/0/20, Status: /down
```

## 数据存储

### 设备信息存储
- **存储位置**：`config/devices.json`
- **存储格式**：JSON格式
- **存储内容**：设备基本信息（IP、用户名、密码、厂商等）

### 巡检数据存储
- **存储位置**：`outputs/inspection/` 目录
- **存储内容**：设备巡检的原始命令输出
- **文件命名**：`hostname_ip_巡检时间.txt`

### 分析报告存储
- **存储位置**：`outputs/analysis/` 目录
- **存储内容**：AI分析后的报告
- **文件命名**：`AI_Analytics_原始巡检文件名`

## API接口

### 设备管理接口
- `GET /api/devices` - 获取所有设备
- `POST /api/devices` - 添加新设备
- `PUT /api/devices/<device_id>` - 更新设备信息
- `DELETE /api/devices/<device_id>` - 删除设备

### 设备详情接口
- `GET /api/devices/<device_id>/detail` - 获取设备详细信息

### 命令生成接口
- `POST /api/ai/generate-commands` - 生成设备配置命令

### 巡检接口
- `POST /api/inspection/start` - 开始设备巡检
- `GET /api/inspection/files` - 获取巡检文件列表
- `GET /api/inspection/download/<filename>` - 下载巡检文件

### AI分析接口
- `POST /api/analysis/start` - 开始AI分析
- `GET /api/analysis/files` - 获取分析报告列表

## 技术栈

- **后端框架**：Flask
- **前端框架**：Bootstrap 5
- **SSH连接**：paramiko
- **AI集成**：RESTful API调用
- **数据存储**：JSON文件存储

## 开发指南

### 代码结构
- `ai_monitor_app.py` - 主应用入口
- `modules/` - 功能模块
- `static/` - 静态资源
- `templates/` - HTML模板

### 扩展开发
1. 添加新厂商支持：在 `get_interface_command` 函数中添加命令映射
2. 添加新监控指标：在 `DeviceMonitor` 类中添加新的监控方法
3. 扩展AI功能：修改 `AIAssistant` 类中的提示词模板

## 常见问题

### 1. 设备连接失败
- 检查设备IP地址、端口、用户名、密码是否正确
- 确保设备SSH服务已启用
- 检查网络连通性

### 2. 接口信息显示异常
- 检查设备厂商选择是否正确
- 查看调试日志确认命令执行结果
- 验证设备是否支持相应命令

### 3. AI分析失败
- 检查AI配置是否正确
- 确认AI服务密钥是否有效
- 查看网络连接是否正常

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

本项目采用MIT许可证。

## 联系方式

如有问题，请联系项目维护者。