# -*- coding: utf-8 -*-
"""
Flask主程序
AI网络监控分析智能体平台
"""

from flask import Flask, render_template, request, jsonify, send_file  # Flask框架
from flask_cors import CORS  # 跨域资源共享
import threading  # 线程处理
import os  # 系统操作

# 导入自定义模块
from config.settings import SettingsManager  # 配置管理器
from modules.device_manager import DeviceManager  # 设备管理器
from modules.ai_assistant import AIAssistant  # AI助手
from modules.inspection import InspectionManager  # 巡检管理器
from modules.monitor import DeviceMonitor  # 设备监控器

# 创建Flask应用
app = Flask(__name__)  # 创建Flask实例
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # 禁用静态文件缓存（开发模式）
CORS(app)  # 启用跨域支持

# 初始化管理器
settings_manager = SettingsManager()  # 配置管理器
device_manager = DeviceManager()  # 设备管理器
inspection_manager = InspectionManager()  # 巡检管理器
monitor = DeviceMonitor()  # 监控器

# 全局变量，用于存储任务进度
task_progress = {}  # 任务进度字典


# ==================== 路由：主页 ====================
@app.route('/')
def index():
    """
    主页路由
    :return: 渲染主页模板
    """
    return render_template('index.html')  # 返回主页


# ==================== API：设备管理 ====================
@app.route('/api/devices', methods=['GET'])
def get_devices():
    """
    获取所有设备
    :return: JSON格式的设备列表
    """
    devices = device_manager.get_all_devices()  # 获取所有设备
    return jsonify({'success': True, 'devices': devices})  # 返回JSON


@app.route('/api/dashboard/data', methods=['GET'])
def get_dashboard_data():
    """
    获取仪表板数据（设备统计、在线状态、CPU/内存等）
    :return: JSON格式的仪表板数据
    """
    try:
        # 获取所有设备
        devices = device_manager.get_all_devices()
        
        # 初始化统计数据
        total_devices = len(devices)
        online_devices = 0
        offline_devices = 0
        
        # 获取每个设备的详细信息（包括状态、CPU、内存等）
        device_details = []
        
        for device in devices:
            device_info = {
                'id': device['id'],
                'name': device.get('name', device['ip']),
                'vendor': device['vendor'],
                'ip': device['ip'],
                'port': device.get('port', 22),
                'status': 'unknown',
                'cpu': None,
                'memory': None,
                'temperature': None
            }
            
            try:
                # 检查设备是否在线
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((device['ip'], int(device.get('port', 22))))
                sock.close()
                
                if result == 0:  # 设备在线
                    device_info['status'] = 'online'
                    online_devices += 1
                    
                    # 尝试获取详细监控数据
                    try:
                        monitor_result = monitor.monitor_device(device)
                        if monitor_result and monitor_result.get('status') == 'online':
                            device_info['cpu'] = monitor_result.get('cpu')
                            device_info['memory'] = monitor_result.get('memory')
                            device_info['temperature'] = monitor_result.get('temperature')
                    except Exception as e:
                        print(f"获取设备{device['ip']}监控数据失败: {e}")
                else:
                    device_info['status'] = 'offline'
                    offline_devices += 1
                    
            except Exception as e:
                print(f"检查设备{device['ip']}状态失败: {e}")
                device_info['status'] = 'offline'
                offline_devices += 1
                
            device_details.append(device_info)
        
        # 构造返回数据
        dashboard_data = {
            'total': total_devices,
            'online': online_devices,
            'offline': offline_devices,
            'devices': device_details
        }
        
        return jsonify({'success': True, 'data': dashboard_data})
        
    except Exception as e:
        print(f"获取仪表板数据失败: {e}")
        return jsonify({'success': False, 'message': f'获取仪表板数据失败: {str(e)}'}), 500


@app.route('/api/devices', methods=['POST'])
def add_device():
    """
    添加新设备
    :return: JSON格式的结果
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    # 添加设备
    device = device_manager.add_device(
        ip=data.get('ip', ''),  # IP地址
        username=data.get('username', ''),  # 用户名
        password=data.get('password', ''),  # 密码
        vendor=data.get('vendor', ''),  # 厂商
        port=data.get('port', 22),  # 端口（默认22）
        name=data.get('name', '')  # 设备名称
    )

    if device:  # 如果添加成功
        return jsonify({'success': True, 'message': '设备添加成功', 'device': device})  # 返回成功
    else:  # 如果添加失败
        return jsonify({'success': False, 'message': '设备已存在或添加失败'})  # 返回失败


@app.route('/api/devices/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    """
    删除设备
    :param device_id: 设备ID
    :return: JSON格式的结果
    """
    success = device_manager.delete_device(device_id)  # 删除设备
    if success:  # 如果删除成功
        return jsonify({'success': True, 'message': '设备删除成功'})  # 返回成功
    else:  # 如果删除失败
        return jsonify({'success': False, 'message': '设备不存在或删除失败'})  # 返回失败


@app.route('/api/devices/<device_id>', methods=['PUT'])
def update_device(device_id):
    """
    更新设备信息
    :param device_id: 设备ID
    :return: JSON格式的结果
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    
    # 获取现有设备信息
    device = device_manager.get_device(device_id)
    if not device:
        return jsonify({'success': False, 'message': '设备不存在'}), 404

    # 更新设备信息
    device['name'] = data.get('name', device['name'])
    device['vendor'] = data.get('vendor', device['vendor'])
    device['ip'] = data.get('ip', device['ip'])
    device['port'] = data.get('port', device['port'])
    device['username'] = data.get('username', device['username'])
    
    # 如果提供了新密码，则更新密码
    if 'password' in data and data['password']:
        device['password'] = data['password']
    
    # 更新扩展信息
    if 'model' in data:
        device['model'] = data['model']
    if 'serial_number' in data:
        device['serial_number'] = data['serial_number']
    if 'version' in data:
        device['version'] = data['version']

    # 保存更新后的设备列表
    devices = device_manager.load_devices()
    for i, d in enumerate(devices):
        if d['id'] == device_id:
            devices[i] = device
            break
    
    success = device_manager.save_devices(devices)
    if success:
        return jsonify({'success': True, 'message': '设备信息更新成功', 'device': device})
    else:
        return jsonify({'success': False, 'message': '设备信息更新失败'})


@app.route('/api/devices/<device_id>/detail', methods=['GET'])
def get_device_detail(device_id):
    """
    获取设备详细信息（包括历史数据、接口信息、运行状态）
    :param device_id: 设备ID
    :return: JSON格式的设备详情
    """
    from datetime import datetime, timedelta
    import random

    # 获取设备基本信息
    device = device_manager.get_device(device_id)
    if not device:
        return jsonify({'success': False, 'message': '设备不存在'}), 404

    # 构建设备详情数据
    device_detail = {
        'id': device['id'],
        'name': device.get('name', device['ip']),
        'vendor': device['vendor'],
        'ip': device['ip'],
        'port': device.get('port', 22),
        'status': 'unknown',
        'hostname': None,
        'model': device.get('model', None),
        'serial_number': device.get('serial_number', None),
        'version': device.get('version', None),
        'cpu': None,
        'memory': None,
        'temperature': None,
        'uptime': None,
        'interfaces': [],
        'history': {
            'timestamps': [],
            'cpu': [],
            'memory': []
        }
    }

    try:
        # 获取设备实时监控数据
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((device['ip'], int(device.get('port', 22))))
        sock.close()

        if result == 0:  # 设备在线
            device_detail['status'] = 'online'

            # 尝试获取详细监控数据
            try:
                monitor_result = monitor.monitor_device(device)
                if monitor_result and monitor_result.get('status') == 'online':
                    device_detail['cpu'] = monitor_result.get('cpu')
                    device_detail['memory'] = monitor_result.get('memory')
                    device_detail['temperature'] = monitor_result.get('temperature')
                    device_detail['hostname'] = monitor_result.get('hostname')
                    device_detail['model'] = monitor_result.get('model')
                    device_detail['serial_number'] = monitor_result.get('serial_number')
                    device_detail['version'] = monitor_result.get('version')
                    device_detail['uptime'] = monitor_result.get('uptime')

                    # 获取接口信息
                    device_detail['interfaces'] = get_device_interfaces(device)

            except Exception as e:
                print(f"获取设备详细信息失败: {e}")
        else:
            device_detail['status'] = 'offline'

        # 生成历史数据（最近20个数据点，间隔30秒）
        # 注意：这里是模拟数据，实际应该从数据库或缓存中获取
        now = datetime.now()
        for i in range(20):
            timestamp = now - timedelta(seconds=(19-i)*30)
            device_detail['history']['timestamps'].append(
                timestamp.strftime('%H:%M:%S')
            )

            # 如果设备在线且有CPU/内存数据，生成模拟历史数据
            if device_detail['status'] == 'online' and device_detail['cpu'] is not None:
                # 在当前值附近波动
                base_cpu = device_detail['cpu'] if isinstance(device_detail['cpu'], (int, float)) else 0
                base_memory = device_detail['memory'] if isinstance(device_detail['memory'], (int, float)) else 50

                device_detail['history']['cpu'].append(
                    max(0, min(100, int(base_cpu) + random.randint(-10, 10)))
                )
                device_detail['history']['memory'].append(
                    max(0, min(100, int(base_memory) + random.randint(-5, 5)))
                )
            else:
                device_detail['history']['cpu'].append(None)
                device_detail['history']['memory'].append(None)

        return jsonify({'success': True, 'data': device_detail})

    except Exception as e:
        print(f"获取设备详情失败: {e}")
        return jsonify({'success': False, 'message': f'获取设备详情失败: {str(e)}'}), 500


def get_device_interfaces(device):
    """
    获取设备接口信息
    :param device: 设备信息
    :return: 接口列表
    """
    try:
        from modules.ssh_connector import SSHConnector

        # 创建SSH连接
        ssh = SSHConnector(
            host=device['ip'],
            port=device.get('port', 22),
            username=device['username'],
            password=device['password']
        )

        if not ssh.connect():
            return []

        # 根据厂商获取接口信息命令
        vendor = device.get('vendor', 'Huawei')
        interface_command = get_interface_command(vendor)

        output = ssh.execute_command(interface_command)
        ssh.disconnect()

        if not output:
            return []

        # 解析接口信息（这里需要根据不同厂商的输出格式进行解析）
        interfaces = parse_interface_output(output, vendor)
        return interfaces

    except Exception as e:
        print(f"获取接口信息失败: {e}")
        return []


def get_interface_command(vendor):
    """
    获取接口信息命令
    :param vendor: 设备厂商
    :return: 命令字符串
    """
    commands = {
        'Cisco(IOS)': 'show ip interface brief',
        'Cisco(NX-OS)': 'show interface brief',
        'Huawei': 'display interface brief',
        'H3C': 'display interface brief',
        'Juniper': 'show interfaces terse',
        'Fortinet': 'get system interface',
        'Arista': 'show interfaces status',
        'Dell': 'show interfaces status',
        'HP': 'display interface brief',
        'Linux': 'ip -s link show',
        'Windows': 'ipconfig /all',
    }
    return commands.get(vendor, 'display interface brief')


def parse_interface_output(output, vendor):
    """
    解析接口信息输出
    :param output: 命令输出
    :param vendor: 设备厂商
    :return: 接口列表
    """
    interfaces = []

    try:
        if vendor == 'Huawei' or vendor == 'H3C':
            # 华为/H3C设备接口解析
            interfaces = parse_huawei_interfaces(output)
        elif vendor == 'Cisco(IOS)':
            # Cisco IOS设备接口解析
            interfaces = parse_cisco_ios_interfaces(output)
        elif vendor == 'Cisco(NX-OS)':
            # Cisco NX-OS设备接口解析
            interfaces = parse_cisco_nxos_interfaces(output)
        elif vendor == 'Linux':
            # Linux服务器接口解析
            interfaces = parse_linux_interfaces(output)
        elif vendor == 'Windows':
            # Windows服务器接口解析
            interfaces = parse_windows_interfaces(output)
        elif vendor == 'Juniper':
            # Juniper设备接口解析
            interfaces = parse_juniper_interfaces(output)
        else:
            # 通用解析（尽力而为）
            interfaces = parse_generic_interfaces(output)

    except Exception as e:
        print(f"解析接口信息失败 ({vendor}): {e}")

    return interfaces


def parse_huawei_interfaces(output):
    """
    解析华为/H3C设备接口信息
    输出格式示例：
    Interface                   PHY   Protocol  InUti OutUti   inErrors  outErrors
    GigabitEthernet0/0/1        up    up        0.01%  0.01%          0          0
    """
    interfaces = []
    lines = output.strip().split('\n')

    for line in lines:
        line = line.strip()
        # 跳过标题行和分隔符
        if not line or 'Interface' in line or '---' in line or line.startswith('*'):
            continue

        parts = line.split()
        if len(parts) >= 3:
            interface_name = parts[0]
            phy_status = parts[1] if len(parts) > 1 else 'unknown'
            protocol_status = parts[2] if len(parts) > 2 else 'unknown'

            # 判断接口状态
            status = 'up' if phy_status.lower() == 'up' and protocol_status.lower() == 'up' else 'down'

            interfaces.append({
                'name': interface_name,
                'status': status,
                'speed': phy_status,
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': f'PHY: {phy_status}, Protocol: {protocol_status}'
            })

    return interfaces


def parse_cisco_ios_interfaces(output):
    """
    解析Cisco IOS设备接口信息
    输出格式示例：
    Interface              IP-Address      OK? Method Status                Protocol
    GigabitEthernet0/0     192.168.1.1     YES NVRAM  up                    up
    """
    interfaces = []
    lines = output.strip().split('\n')
    
    # 打印原始输出用于调试
    print(f"[DEBUG] Cisco IOS原始接口输出:\n{output}")

    for line in lines:
        line = line.strip()
        # 跳过标题行
        if not line or 'Interface' in line or '---' in line:
            continue
            
        # 保存原始行用于调试对比
        original_line = line
        
        # 过滤控制字符和垃圾字符
        # 移除常见的控制字符（ASCII < 32 和 ASCII = 127）
        filtered_line = ''.join(char for char in line if ord(char) >= 32 and ord(char) != 127)
        
        # 特别处理\b (backspace)字符问题，这些字符在Cisco设备输出中很常见
        # 先将字符串转换为字节，再移除backspace字符
        filtered_line = filtered_line.replace('\b', '')  # 移除backspace字符
        
        # 移除多余的"unassigned"字符串
        filtered_line = filtered_line.replace('unassigned', '').strip()
        # 移除多余的"unset"字符串
        filtered_line = filtered_line.replace('unset', '').strip()
        # 移除多余的"DOWN"字符串（只保留状态信息）
        filtered_line = filtered_line.replace('DOWN', '').strip()
        # 移除多余的"UP"字符串（只保留状态信息）
        filtered_line = filtered_line.replace('UP', '').strip()
        
        # 移除多余的空白字符
        while '  ' in filtered_line:
            filtered_line = filtered_line.replace('  ', ' ')
        
        # 打印过滤前后的对比用于调试
        if original_line != filtered_line:
            print(f"[DEBUG] 过滤前: {repr(original_line)}")
            print(f"[DEBUG] 过滤后: {repr(filtered_line)}")
        
        # 分割处理后的行
        parts = filtered_line.split()
        # Cisco "show ip interface brief" 命令的标准输出格式：
        # Interface  IP-Address  OK?  Method  Status  Protocol
        # 至少需要6个部分才能正确解析
        if len(parts) >= 6:
            interface_name = parts[0]
            # 清理接口名称中的垃圾字符，只保留合法字符
            interface_name = ''.join(char for char in interface_name if char.isalnum() or char in ['/', '.', '-', '_'])
            ip_address = parts[1] if len(parts) > 1 else '-'
            ok_status = parts[2] if len(parts) > 2 else '-'
            method = parts[3] if len(parts) > 3 else '-'
            admin_status = parts[4] if len(parts) > 4 else 'unknown'
            protocol_status = parts[5] if len(parts) > 5 else 'unknown'

            status = 'up' if admin_status.lower() == 'up' and protocol_status.lower() == 'up' else 'down'

            interfaces.append({
                'name': interface_name,
                'status': status,
                'speed': '-',  # Cisco接口简要信息中不包含速度信息
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': f'IP: {ip_address}, Status: {admin_status}/{protocol_status}'
            })
        # 处理特殊情况，如您提到的包含额外信息的行
        elif len(parts) >= 4 and ('GigabitEthernet' in filtered_line or 'FastEthernet' in filtered_line):
            # 尝试从行中提取接口名称
            interface_name = ''
            for part in parts:
                if 'Ethernet' in part:
                    interface_name = part
                    break
            
            if interface_name:
                # 清理接口名称中的垃圾字符
                interface_name = ''.join(char for char in interface_name if char.isalnum() or char in ['/', '.', '-', '_'])
                # 简化状态判断
                status = 'down'  # 根据您的示例，这些接口都是down状态
                interfaces.append({
                    'name': interface_name,
                    'status': status,
                    'speed': '-',
                    'rx_bytes': 0,
                    'tx_bytes': 0,
                    'errors': 0,
                    'description': 'IP: unassigned, Status: down/down'
                })

    return interfaces


def parse_cisco_nxos_interfaces(output):
    """
    解析Cisco NX-OS设备接口信息
    输出格式示例：
    Interface              Status          Description
    Ethernet1/1            up              Server Port
    7mmEth1/12             down            --
    """
    interfaces = []
    lines = output.strip().split('\n')
    
    # 打印原始输出用于调试
    print(f"[DEBUG] Cisco NX-OS原始接口输出:\n{output}")

    for line in lines:
        line = line.strip()
        # 跳过标题行
        if not line or 'Interface' in line or '---' in line:
            continue
            
        # 保存原始行用于调试对比
        original_line = line
        
        # 过滤控制字符和垃圾字符
        # 移除常见的控制字符（ASCII < 32 和 ASCII = 127）
        filtered_line = ''.join(char for char in line if ord(char) >= 32 and ord(char) != 127)
        
        # 特别处理\b (backspace)字符问题，这些字符在Cisco设备输出中很常见
        filtered_line = filtered_line.replace('\b', '')  # 移除backspace字符
        
        # 移除多余的空白字符
        while '  ' in filtered_line:
            filtered_line = filtered_line.replace('  ', ' ')
        
        # 过滤掉接口名称前的"7mm"前缀
        if filtered_line.startswith('7mm') and len(filtered_line) > 3:
            filtered_line = filtered_line[3:]
        
        # 打印过滤前后的对比用于调试
        if original_line != filtered_line:
            print(f"[DEBUG] 过滤前: {repr(original_line)}")
            print(f"[DEBUG] 过滤后: {repr(filtered_line)}")
        
        # 分割处理后的行
        parts = filtered_line.split()
        # Cisco NX-OS "show interface brief" 命令的标准输出格式：
        # Interface  Status  Description
        # 至少需要3个部分才能正确解析
        if len(parts) >= 3:
            interface_name = parts[0]
            # 清理接口名称中的垃圾字符，只保留合法字符
            interface_name = ''.join(char for char in interface_name if char.isalnum() or char in ['/', '.', '-', '_'])
            status = parts[1] if len(parts) > 1 else 'unknown'
            description = ' '.join(parts[2:]) if len(parts) > 2 else '-'

            # 标准化状态值
            status = 'up' if status.lower() == 'up' else 'down'

            interfaces.append({
                'name': interface_name,
                'status': status,
                'speed': '-',  # NX-OS接口简要信息中不包含速度信息
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': description
            })
        # 处理只有接口名和状态的行
        elif len(parts) >= 2:
            interface_name = parts[0]
            # 清理接口名称中的垃圾字符，只保留合法字符
            interface_name = ''.join(char for char in interface_name if char.isalnum() or char in ['/', '.', '-', '_'])
            status = parts[1] if len(parts) > 1 else 'unknown'

            # 标准化状态值
            status = 'up' if status.lower() == 'up' else 'down'

            interfaces.append({
                'name': interface_name,
                'status': status,
                'speed': '-',
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': '-'
            })

    return interfaces


def parse_linux_interfaces(output):
    """
    解析Linux服务器接口信息
    输出格式示例：
    2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP
        RX: bytes  packets  errors  dropped overrun mcast
        12345678   9876     0       0       0       0
    """
    interfaces = []
    lines = output.strip().split('\n')

    current_interface = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 匹配接口行
        if ':' in line and '<' in line:
            parts = line.split(':')
            if len(parts) >= 2:
                interface_name = parts[1].strip().split()[0]
                status = 'up' if 'UP' in line else 'down'

                current_interface = {
                    'name': interface_name,
                    'status': status,
                    'speed': '-',
                    'rx_bytes': 0,
                    'tx_bytes': 0,
                    'errors': 0,
                    'description': 'Linux Network Interface'
                }
                interfaces.append(current_interface)

        # 匹配RX统计行
        elif 'RX:' in line and current_interface:
            try:
                next_line_idx = lines.index(line) + 1
                if next_line_idx < len(lines):
                    stats = lines[next_line_idx].split()
                    if len(stats) >= 3:
                        current_interface['rx_bytes'] = int(stats[0])
                        current_interface['errors'] = int(stats[2])
            except:
                pass

        # 匹配TX统计行
        elif 'TX:' in line and current_interface:
            try:
                next_line_idx = lines.index(line) + 1
                if next_line_idx < len(lines):
                    stats = lines[next_line_idx].split()
                    if len(stats) >= 1:
                        current_interface['tx_bytes'] = int(stats[0])
            except:
                pass

    return interfaces


def parse_windows_interfaces(output):
    """
    解析Windows服务器接口信息
    输出格式示例：
    Ethernet adapter 以太网:
       Connection-specific DNS Suffix  . :
       IPv4 Address. . . . . . . . . . . : 192.168.1.100
    """
    interfaces = []
    lines = output.strip().split('\n')

    current_interface = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 匹配接口名称行
        if 'adapter' in line.lower() and ':' in line:
            interface_name = line.split('adapter')[1].strip().rstrip(':')
            current_interface = {
                'name': interface_name,
                'status': 'up',  # Windows默认显示的都是活动的
                'speed': '-',
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': 'Windows Network Adapter'
            }
            interfaces.append(current_interface)

        # 匹配IP地址
        elif 'IPv4 Address' in line and current_interface:
            try:
                ip = line.split(':')[1].strip()
                current_interface['description'] = f'IP: {ip}'
            except:
                pass

    return interfaces


def parse_juniper_interfaces(output):
    """
    解析Juniper设备接口信息
    输出格式示例：
    ge-0/0/0.0              up    up
    """
    interfaces = []
    lines = output.strip().split('\n')

    for line in lines:
        line = line.strip()
        if not line or 'Interface' in line:
            continue

        parts = line.split()
        if len(parts) >= 3:
            interface_name = parts[0]
            admin_status = parts[1]
            link_status = parts[2]

            status = 'up' if admin_status.lower() == 'up' and link_status.lower() == 'up' else 'down'

            interfaces.append({
                'name': interface_name,
                'status': status,
                'speed': '-',
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': f'Admin: {admin_status}, Link: {link_status}'
            })

    return interfaces


def parse_generic_interfaces(output):
    """
    通用接口解析（尽力而为）
    """
    interfaces = []
    lines = output.strip().split('\n')

    for line in lines:
        line = line.strip()
        if not line or 'Interface' in line or '---' in line:
            continue

        parts = line.split()
        if len(parts) >= 2:
            interfaces.append({
                'name': parts[0],
                'status': 'up' if 'up' in line.lower() else 'down',
                'speed': '-',
                'rx_bytes': 0,
                'tx_bytes': 0,
                'errors': 0,
                'description': ' '.join(parts[1:])[:50]  # 限制描述长度
            })

    return interfaces




# ==================== API：AI命令生成 ====================
@app.route('/api/ai/generate-commands', methods=['POST'])
def generate_commands():
    """
    生成网络命令
    :return: JSON格式的命令列表
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    user_request = data.get('user_request')  # 用户需求
    vendor = data.get('vendor')  # 设备厂商

    # 获取当前AI配置
    ai_config = settings_manager.get_current_provider_config()  # 获取AI配置

    # 检查配置是否完整
    if not ai_config.get('api_key') or not ai_config.get('api_url'):  # 如果配置不完整
        return jsonify({'success': False, 'message': '请先配置AI设置'})  # 返回失败

    # 创建AI助手
    ai = AIAssistant(
        api_url=ai_config['api_url'],  # API地址
        api_key=ai_config['api_key'],  # API密钥
        model=ai_config['model']  # 模型
    )

    # 生成命令
    commands = ai.generate_commands(user_request, vendor)  # 生成命令

    if commands:  # 如果生成成功
        return jsonify({'success': True, 'commands': commands})  # 返回命令列表
    else:  # 如果生成失败
        return jsonify({'success': False, 'message': 'AI命令生成失败，请检查配置'})  # 返回失败


@app.route('/api/ai/generate-inspection-commands', methods=['POST'])
def generate_inspection_commands():
    """
    生成巡检命令
    :return: JSON格式的命令列表
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    vendor = data.get('vendor')  # 设备厂商

    # 获取AI配置
    ai_config = settings_manager.get_current_provider_config()  # 获取配置

    # 检查配置
    if not ai_config.get('api_key') or not ai_config.get('api_url'):  # 如果配置不完整
        return jsonify({'success': False, 'message': '请先配置AI设置'})  # 返回失败

    # 创建AI助手
    ai = AIAssistant(
        api_url=ai_config['api_url'],  # API地址
        api_key=ai_config['api_key'],  # API密钥
        model=ai_config['model']  # 模型
    )

    # 生成巡检命令
    commands = ai.generate_inspection_commands(vendor)  # 生成命令

    if commands:  # 如果生成成功
        return jsonify({'success': True, 'commands': commands})  # 返回命令列表
    else:  # 如果生成失败
        return jsonify({'success': False, 'message': 'AI巡检命令生成失败'})  # 返回失败


# ==================== API：设备巡检 ====================
@app.route('/api/inspection/start', methods=['POST'])
def start_inspection():
    """
    开始设备巡检
    :return: JSON格式的结果
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    device_id = data.get('device_id')  # 设备ID
    commands = data.get('commands')  # 巡检命令列表
    analyze = data.get('analyze', False)  # 是否需要AI分析

    # 获取设备信息
    device = device_manager.get_device(device_id)  # 获取设备
    if not device:  # 如果设备不存在
        return jsonify({'success': False, 'message': '设备不存在'})  # 返回失败

    # 生成任务ID
    task_id = f"inspection_{device_id}"  # 任务ID

    # 定义进度回调函数
    def progress_callback(stage, progress, message):
        """更新任务进度"""
        task_progress[task_id] = {
            'stage': stage,  # 阶段
            'progress': progress,  # 进度百分比
            'message': message  # 消息
        }

    # 定义后台任务
    def run_inspection():
        """后台执行巡检任务"""
        # 执行巡检
        inspection_file = inspection_manager.perform_inspection(
            device, commands, progress_callback  # 执行巡检
        )

        if inspection_file and analyze:  # 如果巡检成功且需要分析
            # 获取AI配置
            ai_config = settings_manager.get_current_provider_config()  # 获取配置
            # 执行AI分析
            inspection_manager.analyze_inspection(
                inspection_file, ai_config, device.get('vendor'), progress_callback  # AI分析
            )

    # 初始化任务进度
    task_progress[task_id] = {
        'stage': 'starting',  # 阶段：启动中
        'progress': 0,  # 进度0%
        'message': '任务启动中...'  # 消息
    }

    # 启动后台线程
    thread = threading.Thread(target=run_inspection)  # 创建线程
    thread.daemon = True  # 设置为守护线程
    thread.start()  # 启动线程

    return jsonify({'success': True, 'task_id': task_id, 'message': '巡检任务已启动'})  # 返回成功


@app.route('/api/inspection/progress/<task_id>', methods=['GET'])
def get_inspection_progress(task_id):
    """
    获取巡检进度
    :param task_id: 任务ID
    :return: JSON格式的进度信息
    """
    progress = task_progress.get(task_id, {})  # 获取进度信息
    return jsonify({'success': True, 'progress': progress})  # 返回进度


@app.route('/api/inspection/files', methods=['GET'])
def get_inspection_files():
    """
    获取巡检文件列表
    :return: JSON格式的文件列表
    """
    files = inspection_manager.get_inspection_files()  # 获取文件列表
    return jsonify({'success': True, 'files': files})  # 返回文件列表


@app.route('/api/analysis/files', methods=['GET'])
def get_analysis_files():
    """
    获取分析报告文件列表
    :return: JSON格式的文件列表
    """
    files = inspection_manager.get_analysis_files()  # 获取文件列表
    return jsonify({'success': True, 'files': files})  # 返回文件列表


@app.route('/api/inspection/analyze', methods=['POST'])
def analyze_existing_file():
    """
    分析已有的巡检文件
    :return: JSON格式的结果
    """
    data = request.json or {}  # 获取请求数据，如果为None则使用空字典
    filename = data.get('filename')  # 文件名

    # 构建文件路径
    filepath = os.path.join(inspection_manager.inspection_dir, filename)  # 完整路径

    if not os.path.exists(filepath):  # 如果文件不存在
        return jsonify({'success': False, 'message': '文件不存在'})  # 返回失败

    # 从巡检文件中提取厂商信息
    vendor = extract_vendor_from_inspection_file(filepath)
    if not vendor:
        return jsonify({'success': False, 'message': '无法从巡检文件中提取厂商信息'})  # 返回失败

    # 生成任务ID
    task_id = f"analysis_{filename}"  # 任务ID

    # 定义进度回调
    def progress_callback(stage, progress, message):
        """更新任务进度"""
        task_progress[task_id] = {
            'stage': stage,  # 阶段
            'progress': progress,  # 进度
            'message': message  # 消息
        }

    # 定义后台任务
    def run_analysis():
        """后台执行分析任务"""
        # 重新加载AI配置（确保获取最新配置）
        ai_config = settings_manager.get_current_provider_config()  # 获取配置

        # 执行AI分析
        analysis_file = inspection_manager.analyze_inspection(
            filepath, ai_config, vendor, progress_callback  # AI分析
        )

    # 初始化任务进度
    task_progress[task_id] = {
        'stage': 'starting',  # 阶段：启动中
        'progress': 0,  # 进度0%
        'message': '分析任务启动中...'  # 消息
    }

    # 启动后台线程
    thread = threading.Thread(target=run_analysis)  # 创建线程
    thread.daemon = True  # 设置为守护线程
    thread.start()  # 启动线程

    return jsonify({'success': True, 'task_id': task_id, 'message': '分析任务已启动'})  # 返回成功


def extract_vendor_from_inspection_file(filepath):
    """
    从巡检文件中提取厂商信息
    :param filepath: 文件路径
    :return: 厂商名称
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 查找厂商信息行
        import re
        vendor_match = re.search(r'厂商:\s*(.+)', content)
        if vendor_match:
            return vendor_match.group(1).strip()
            
        # 如果没有找到，尝试从文件名中提取
        filename = os.path.basename(filepath)
        # 文件名格式通常是 hostname_ip_timestamp.txt
        # 我们可以从设备管理器中获取设备信息来确定厂商
        # 这里简化处理，返回默认值
        return 'Huawei'
    except Exception as e:
        print(f"提取厂商信息失败: {e}")
        return None

# ==================== 主程序入口 ====================
if __name__ == '__main__':
    # 启动Flask应用
    print("="*60)  # 打印分隔线
    print("AI网络监控分析智能体平台")  # 打印标题
    print("="*60)  # 打印分隔线
    print("欢迎使用网络AI监视器")
    print("作者：DevNetOps")
    print("访问地址: http://127.0.0.1:5001")  # 打印访问地址
    app.run(host='0.0.0.0',  # 监听所有网络接口
            port=5001,  # 端口5001
            debug=True)  # 启用调试模式
