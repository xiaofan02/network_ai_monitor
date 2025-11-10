# -*- coding: utf-8 -*-
"""
监控功能模块
负责设备状态监控（CPU、内存、接口、温度等）
"""

import re  # 正则表达式
from .ssh_connector import SSHConnector  # SSH连接器


class DeviceMonitor:
    """设备监控类，负责监控设备状态"""

    def __init__(self):
        """初始化监控器"""
        pass  # 无需初始化参数

    def monitor_device(self, device_info):
        """
        监控设备状态
        :param device_info: 设备信息字典
        :return: 监控结果字典，失败返回None
        """
        try:
            # 创建SSH连接
            ssh = SSHConnector(
                host=device_info['ip'],  # IP地址
                port=device_info.get('port', 22),  # 端口
                username=device_info['username'],  # 用户名
                password=device_info['password']  # 密码
            )

            # 连接设备
            if not ssh.connect():  # 如果连接失败
                return {
                    'status': 'offline',  # 状态：离线
                    'error': '连接失败'  # 错误信息
                }

            # 根据厂商获取监控数据
            vendor = device_info.get('vendor', 'huawei')  # 获取厂商（保持原始大小写）
            result = {
                'status': 'online',  # 状态：在线
                'cpu': self._get_cpu_usage(ssh, vendor),  # CPU使用率
                'memory': self._get_memory_usage(ssh, vendor),  # 内存使用率
                'temperature': self._get_temperature(ssh, vendor),  # 设备温度
                'interfaces': self._get_interface_status(ssh, vendor)  # 接口状态
            }

            # 断开连接
            ssh.disconnect()  # 断开SSH

            return result  # 返回监控结果

        except Exception as e:  # 异常处理
            print(f"监控设备失败 {device_info['ip']}: {e}")  # 打印错误
            return {
                'status': 'error',  # 状态：错误
                'error': str(e)  # 错误信息
            }

    def _get_cpu_usage(self, ssh, vendor):
        """
        获取CPU使用率
        :param ssh: SSH连接对象
        :param vendor: 设备厂商
        :return: CPU使用率（百分比）
        """
        try:
            if vendor in ['huawei', 'h3c']:  # 华为、H3C设备
                output = ssh.execute_command('display cpu-usage', wait_time=2)  # 执行命令
                # 匹配CPU使用率（例如：CPU Usage: 10%）
                match = re.search(r'CPU\s+[Uu]sage.*?(\d+)%', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回CPU使用率
            elif vendor == 'Cisco(IOS)':  # Cisco IOS设备
                output = ssh.execute_command('show processes cpu', wait_time=2)  # 执行命令
                # 匹配CPU使用率
                match = re.search(r'five seconds:\s*(\d+)%', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回CPU使用率
            elif vendor == 'Cisco(NX-OS)':  # Cisco NX-OS设备
                output = ssh.execute_command('show processes cpu', wait_time=2)  # 执行命令
                # 匹配CPU使用率
                match = re.search(r'five seconds:\s*(\d+)%', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回CPU使用率
            elif vendor == 'linux':  # Linux服务器
                output = ssh.execute_command('top -bn1 | grep "Cpu(s)"', wait_time=2)  # 执行命令
                # 匹配CPU使用率
                match = re.search(r'Cpu\(s\):\s+(\d+\.\d+)%', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(float(match.group(1)))  # 返回CPU使用率
            elif vendor == 'windows':  # Windows服务器
                output = ssh.execute_command('wmic cpu get loadpercentage', wait_time=2)  # 执行命令
                # 解析输出，获取CPU使用率
                lines = output.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if line and line.isdigit():
                        return int(line)
        except Exception as e:  # 异常处理
            print(f"获取CPU使用率失败: {e}")  # 打印错误
        return None  # 返回None

    def _get_memory_usage(self, ssh, vendor):
        """
        获取内存使用率
        :param ssh: SSH连接对象
        :param vendor: 设备厂商
        :return: 内存使用率（百分比）
        """
        try:
            if vendor in ['huawei', 'h3c']:  # 华为、H3C设备
                output = ssh.execute_command('display memory-usage', wait_time=2)  # 执行命令
                # 匹配内存使用率
                match = re.search(r'Memory\s+[Uu]tilization.*?(\d+)%', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回内存使用率
            elif vendor == 'Cisco(IOS)':  # Cisco IOS设备
                output = ssh.execute_command('show processes memory', wait_time=2)  # 执行命令
                # 解析内存信息，计算使用率百分比
                # 输出格式示例：
                # Processor Pool Total: 3710293952 Used: 1234567890 Free: 2475726062
                # 或者：
                # Total: 3710293952  Free: 2475726062  Largest: 1234567890

                # 尝试匹配 Total 和 Used 或 Free
                match_total = re.search(r'Total[:\s]+(\d+)', output, re.IGNORECASE)  # 匹配总内存
                match_used = re.search(r'Used[:\s]+(\d+)', output, re.IGNORECASE)  # 匹配已用内存
                match_free = re.search(r'Free[:\s]+(\d+)', output, re.IGNORECASE)  # 匹配空闲内存

                if match_total:  # 如果找到总内存
                    total = int(match_total.group(1))  # 总内存
                    used = 0  # 已用内存

                    if match_used:  # 如果有已用内存
                        used = int(match_used.group(1))
                    elif match_free:  # 如果只有空闲内存，计算已用
                        free = int(match_free.group(1))
                        used = total - free

                    if total > 0:  # 避免除零错误
                        usage_percent = int((used / total) * 100)  # 计算使用率百分比
                        return usage_percent  # 返回百分比

                # 如果上面的方法失败，尝试直接匹配百分比
                match_percent = re.search(r'(\d+)%', output)  # 匹配百分比
                if match_percent:  # 如果匹配成功
                    return int(match_percent.group(1))  # 返回百分比
            elif vendor == 'Cisco(NX-OS)':  # Cisco NX-OS设备
                output = ssh.execute_command('show processes memory shared', wait_time=2)  # 执行命令
                # 解析NX-OS内存信息
                # 输出格式示例：
                # Shared memory totals - Size: 1411 MB, Used: 101 MB, Available: 1318 MB
                
                # 匹配内存总量和已用内存
                match_totals = re.search(r'Shared memory totals.*?Size[:\s]+(\d+)\s*MB.*?Used[:\s]+(\d+)\s*MB', output, re.IGNORECASE | re.DOTALL)
                if match_totals:
                    total_mb = int(match_totals.group(1))
                    used_mb = int(match_totals.group(2))
                    if total_mb > 0:
                        usage_percent = int((used_mb / total_mb) * 100)
                        return usage_percent
                
                # 如果上面的方法失败，尝试匹配其他格式
                match_size = re.search(r'Size[:\s]+(\d+)\s*MB', output, re.IGNORECASE)
                match_used = re.search(r'Used[:\s]+(\d+)\s*MB', output, re.IGNORECASE)
                
                if match_size and match_used:
                    total_mb = int(match_size.group(1))
                    used_mb = int(match_used.group(1))
                    if total_mb > 0:
                        usage_percent = int((used_mb / total_mb) * 100)
                        return usage_percent
            elif vendor == 'linux':  # Linux服务器
                output = ssh.execute_command('free | grep Mem', wait_time=2)  # 执行命令
                # 解析内存信息
                # 输出格式示例：Mem:        8192000     4096000     4096000      123456      512000     3584000
                parts = output.split()
                if len(parts) >= 7:
                    total = int(parts[1])  # 总内存
                    used = int(parts[2])   # 已用内存
                    if total > 0:
                        usage_percent = int((used / total) * 100)  # 计算使用率百分比
                        return usage_percent  # 返回百分比
            elif vendor == 'windows':  # Windows服务器
                output = ssh.execute_command('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', wait_time=2)  # 执行命令
                # 解析内存信息
                lines = output.strip().split('\n')
                total_memory = None
                free_memory = None
                for line in lines:
                    if 'TotalVisibleMemorySize=' in line:
                        total_memory = int(line.split('=')[1])
                    elif 'FreePhysicalMemory=' in line:
                        free_memory = int(line.split('=')[1])
                
                if total_memory and free_memory:
                    used_memory = total_memory - free_memory
                    usage_percent = int((used_memory / total_memory) * 100)
                    return usage_percent

        except Exception as e:  # 异常处理
            print(f"获取内存使用率失败: {e}")  # 打印错误
        return None  # 返回None

    def _get_temperature(self, ssh, vendor):
        """
        获取设备温度
        :param ssh: SSH连接对象
        :param vendor: 设备厂商
        :return: 温度值（摄氏度）
        """
        try:
            if vendor in ['huawei', 'h3c']:  # 华为、H3C设备
                output = ssh.execute_command('display environment', wait_time=2)  # 执行命令
                # 匹配温度（例如：Temperature: 45C）
                match = re.search(r'[Tt]emperature.*?(\d+)[°]?C', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回温度
            elif vendor == 'Cisco(IOS)':  # Cisco IOS设备
                output = ssh.execute_command('show env temperature status', wait_time=2)  # 执行命令
                # 解析温度信息
                # 输出格式示例：
                # Temperature Value: 45 Degree Celsius
                # 或者表格形式：
                # Sensor        Current(C)  Threshold(C)  Status
                # Inlet         45          55            OK

                # 尝试匹配 "Temperature Value: XX" 格式
                match = re.search(r'Temperature\s+Value[:\s]+(\d+)', output, re.IGNORECASE)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回温度

                # 尝试匹配 "XX Degree Celsius" 或 "XX Celsius" 或 "XX°C" 格式
                match = re.search(r'(\d+)\s*(?:Degree[s]?)?\s*Celsius', output, re.IGNORECASE)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回温度

                # 尝试匹配表格中的 Current(C) 列（通常是第一行数据）
                match = re.search(r'(?:Inlet|Outlet|Sensor)\s+(\d+)', output, re.IGNORECASE)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回温度

                # 最后尝试匹配任何 "XX°C" 或 "XXC" 格式
                match = re.search(r'(\d+)\s*[°]?C', output)  # 正则匹配
                if match:  # 如果匹配成功
                    return int(match.group(1))  # 返回温度
            elif vendor == 'Cisco(NX-OS)':  # Cisco NX-OS设备
                output = ssh.execute_command('show env temperature', wait_time=2)  # 执行命令
                # 解析NX-OS温度信息
                # 输出格式示例：
                # Module   Sensor        MajorThresh   MinorThres   CurTemp     Status
                #                       (Celsius)     (Celsius)    (Celsius)         
                # 27       Sensor0         75              55          0          Ok       
                
                # 尝试匹配温度阈值（MajorThresh列），这是设备的最高温度阈值
                # 使用多种模式匹配，以适应不同的输出格式
                patterns = [
                    r'MajorThresh.*?(\d+)',  # 匹配MajorThresh列的第一个数值
                    r'\d+\s+\w+\s+(\d+)',    # 匹配数字、单词、数字的模式（Module Sensor MajorThresh）
                    r'^\s*\d+\s+\w+\s+(\d+)', # 从行首开始匹配
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, output, re.MULTILINE)
                    if matches:
                        # 返回第一个匹配的MajorThresh值
                        return int(matches[0])
                
                # 如果上面的方法失败，尝试匹配任何温度值并返回最大值
                temp_matches = re.findall(r'\d+\s+[CF]\s+(\d+)', output)
                if temp_matches:
                    temps = [int(t) for t in temp_matches]
                    return max(temps) if temps else None
            elif vendor in ['linux', 'windows']:  # Linux/Windows服务器通常不支持温度监控
                # 服务器设备通常不通过SSH提供温度信息
                return None

        except Exception as e:  # 异常处理
            print(f"获取设备温度失败: {e}")  # 打印错误
        return None  # 返回None

    def _get_interface_status(self, ssh, vendor):
        """
        获取接口状态
        :param ssh: SSH连接对象
        :param vendor: 设备厂商
        :return: 接口状态列表
        """
        interfaces = []  # 初始化接口列表
        try:
            if vendor in ['huawei', 'h3c']:  # 华为、H3C设备
                output = ssh.execute_command('display interface brief', wait_time=3)  # 执行命令
                # 解析接口信息（简化处理，只获取接口名和状态）
                lines = output.split('\n')  # 按行分割
                for line in lines:  # 遍历每行
                    # 匹配接口行（例如：GigabitEthernet0/0/1  up  up）
                    match = re.search(r'(\S+Ethernet\S*)\s+(\S+)\s+(\S+)', line)  # 正则匹配
                    if match:  # 如果匹配成功
                        interfaces.append({
                            'name': match.group(1),  # 接口名
                            'admin_status': match.group(2),  # 管理状态
                            'oper_status': match.group(3)  # 操作状态
                        })
            elif vendor == 'Cisco(IOS)':  # Cisco IOS设备
                output = ssh.execute_command('show ip interface brief', wait_time=3)  # 执行命令
                # 解析接口信息
                lines = output.split('\n')  # 按行分割
                for line in lines:  # 遍历每行
                    # 匹配接口行
                    match = re.search(r'(\S+)\s+\S+\s+\S+\s+\S+\s+(\S+)\s+(\S+)', line)  # 正则匹配
                    if match and 'Interface' not in line:  # 如果匹配且不是表头
                        interfaces.append({
                            'name': match.group(1),  # 接口名
                            'admin_status': match.group(2),  # 管理状态
                            'oper_status': match.group(3)  # 操作状态
                        })
            elif vendor == 'Cisco(NX-OS)':  # Cisco NX-OS设备
                output = ssh.execute_command('show interface brief', wait_time=3)  # 执行命令
                # 解析接口信息
                lines = output.split('\n')  # 按行分割
                for line in lines:  # 遍历每行
                    # 匹配接口行
                    match = re.search(r'(\S+)\s+(\S+)\s+(.*)', line)  # 正则匹配
                    if match and 'Interface' not in line and '--' not in line:  # 如果匹配且不是表头或分隔符
                        interfaces.append({
                            'name': match.group(1),  # 接口名
                            'admin_status': match.group(2),  # 管理状态
                            'oper_status': match.group(2)  # 操作状态（NX-OS简要信息中状态列只有一个）
                        })
            elif vendor == 'linux':  # Linux服务器
                output = ssh.execute_command('ip -s link show', wait_time=3)  # 执行命令
                # 解析接口信息
                lines = output.split('\n')  # 按行分割
                for line in lines:  # 遍历每行
                    # 匹配接口行
                    if ':' in line and '<' in line:
                        parts = line.split(':')
                        if len(parts) >= 2:
                            interface_name = parts[1].strip().split()[0]
                            status = 'up' if 'UP' in line else 'down'
                            interfaces.append({
                                'name': interface_name,
                                'admin_status': status,
                                'oper_status': status
                            })
            elif vendor == 'windows':  # Windows服务器
                output = ssh.execute_command('ipconfig', wait_time=3)  # 执行命令
                # 解析接口信息
                lines = output.split('\n')  # 按行分割
                for line in lines:  # 遍历每行
                    # 匹配接口行
                    if 'adapter' in line.lower() and ':' in line:
                        interface_name = line.split('adapter')[1].strip().rstrip(':')
                        interfaces.append({
                            'name': interface_name,
                            'admin_status': 'up',
                            'oper_status': 'up'
                        })
        except Exception as e:  # 异常处理
            print(f"获取接口状态失败: {e}")  # 打印错误

        return interfaces[:5] if interfaces else []  # 返回前5个接口（避免数据过多）

    def test_connectivity(self, device_info):
        """
        测试设备连通性
        :param device_info: 设备信息字典
        :return: True表示连通，False表示不通
        """
        try:
            ssh = SSHConnector(
                host=device_info['ip'],  # IP地址
                port=device_info.get('port', 22),  # 端口
                username=device_info['username'],  # 用户名
                password=device_info['password'],  # 密码
                timeout=5  # 超时5秒
            )
            return ssh.test_connection()  # 测试连接
        except Exception as e:  # 异常处理
            print(f"测试连通性失败 {device_info['ip']}: {e}")  # 打印错误
            return False  # 返回失败