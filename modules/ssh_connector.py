# -*- coding: utf-8 -*-
"""
SSH连接模块
负责通过SSH连接网络设备并执行命令
"""

import paramiko  # SSH连接库
import time  # 时间处理
import re  # 正则表达式


class SSHConnector:
    """SSH连接器类，用于连接网络设备并执行命令"""

    def __init__(self, host, port, username, password, timeout=10):
        """
        初始化SSH连接器
        :param host: 设备IP地址
        :param port: SSH端口
        :param username: 登录用户名
        :param password: 登录密码
        :param timeout: 连接超时时间（秒）
        """
        self.host = host  # 设备IP
        self.port = port  # SSH端口
        self.username = username  # 用户名
        self.password = password  # 密码
        self.timeout = timeout  # 超时时间
        self.client = None  # SSH客户端对象
        self.shell = None  # Shell通道对象

    def connect(self):
        """
        建立SSH连接
        :return: True表示成功，False表示失败
        """
        try:
            self.client = paramiko.SSHClient()  # 创建SSH客户端
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())  # 自动添加主机密钥

            # 连接设备
            self.client.connect(
                hostname=self.host,  # 主机地址
                port=self.port,  # 端口
                username=self.username,  # 用户名
                password=self.password,  # 密码
                timeout=self.timeout,  # 超时时间
                look_for_keys=False,  # 不使用密钥认证
                allow_agent=False  # 不使用SSH代理
            )

            # 打开Shell通道（用于交互式命令执行）
            self.shell = self.client.invoke_shell()  # 创建Shell通道
            time.sleep(1)  # 等待Shell初始化
            self.shell.recv(65535)  # 清空初始输出缓冲区

            return True  # 连接成功
        except Exception as e:  # 连接失败
            print(f"SSH连接失败 {self.host}: {e}")  # 打印错误信息
            return False  # 返回失败

    def execute_command(self, command, wait_time=2, max_pages=100):
        """
        执行单条命令（支持自动处理分页输出）
        :param command: 要执行的命令
        :param wait_time: 命令执行等待时间（秒）
        :param max_pages: 最大分页次数（防止死循环）
        :return: 命令输出结果
        """
        if not self.shell:  # 如果Shell未连接
            return None  # 返回None

        try:
            self.shell.send(command + '\n')  # 发送命令（添加换行符）
            time.sleep(wait_time)  # 等待命令执行

            output = ""  # 初始化输出
            page_count = 0  # 分页计数器

            while page_count < max_pages:  # 循环读取，最多读取max_pages次
                # 接收输出
                chunk = self.shell.recv(65535).decode('utf-8', errors='ignore')
                output += chunk  # 追加输出

                # 检查是否有分页提示符（--More--, -- More --等）
                # 常见的分页提示符：--More--、-- More --、<--- More --->、---- More ----等
                more_patterns = [
                    '--More--', '-- More --',
                    '<--- More --->', '---- More ----',
                    '-- More--', '--More --',
                    'More', 'more'
                ]

                has_more = False
                for pattern in more_patterns:
                    if pattern in output[-100:]:  # 只检查最后100个字符
                        has_more = True
                        break

                if has_more:  # 如果有分页提示
                    page_count += 1  # 增加分页计数
                    self.shell.send(b' ')  # 发送空格继续显示
                    time.sleep(0.3)  # 短暂等待
                    # 清除分页提示符（避免在最终输出中出现）
                    for pattern in more_patterns:
                        output = output.replace(pattern, '')
                else:
                    # 没有分页提示，检查是否还有数据
                    if self.shell.recv_ready():  # 如果还有数据
                        time.sleep(0.2)  # 短暂等待
                        continue  # 继续读取
                    else:
                        break  # 没有数据了，退出循环

            return output  # 返回完整命令输出
        except Exception as e:  # 执行失败
            print(f"执行命令失败 {command}: {e}")  # 打印错误信息
            return None  # 返回None

    def execute_commands(self, commands, wait_time=2):
        """
        批量执行命令
        :param commands: 命令列表
        :param wait_time: 每条命令执行等待时间（秒）
        :return: 所有命令的输出结果（字符串）
        """
        if not self.shell:  # 如果Shell未连接
            return None  # 返回None

        output = ""  # 初始化输出字符串
        for command in commands:  # 遍历命令列表
            result = self.execute_command(command, wait_time)  # 执行命令
            if result:  # 如果有输出
                output += result  # 追加输出

        return output  # 返回所有输出

    def get_hostname(self, vendor='huawei'):
        """
        获取设备主机名
        :param vendor: 设备厂商（huawei, cisco, h3c等）
        :return: 主机名字符串
        """
        if not self.shell:  # 如果未连接
            return "unknown"  # 返回未知

        try:
            # 根据不同厂商发送不同命令
            if vendor.lower() in ['huawei', 'h3c']:  # 华为、H3C设备
                output = self.execute_command('display current-configuration | include sysname', wait_time=1)  # 查询sysname
                if output:  # 确保output不为None
                    match = re.search(r'sysname\s+(\S+)', output)  # 正则匹配主机名
                    if match:  # 如果匹配成功
                        return match.group(1)  # 返回主机名
            elif vendor.lower() in ['cisco(ios)', 'cisco(nx-os)']:  # Cisco设备
                output = self.execute_command('show running-config | include hostname', wait_time=1)  # 查询hostname
                if output:  # 确保output不为None
                    match = re.search(r'hostname\s+(\S+)', output)  # 正则匹配主机名
                    if match:  # 如果匹配成功
                        return match.group(1)  # 返回主机名

            # 如果上述方法失败，尝试从提示符获取
            self.shell.send(b'\n')  # 发送换行
            time.sleep(0.5)  # 等待
            output = self.shell.recv(1024).decode('utf-8', errors='ignore')  # 接收输出
            # 匹配提示符中的主机名（如：<hostname>或hostname#）
            match = re.search(r'[<\[]?(\S+?)[>\]#]', output)  # 正则匹配
            if match:  # 如果匹配成功
                return match.group(1)  # 返回主机名
        except Exception as e:  # 获取失败
            print(f"获取主机名失败: {e}")  # 打印错误

        return "unknown"  # 返回未知

    def disconnect(self):
        """断开SSH连接"""
        try:
            if self.shell:  # 如果Shell存在
                self.shell.close()  # 关闭Shell
            if self.client:  # 如果客户端存在
                self.client.close()  # 关闭客户端
        except Exception as e:  # 断开失败
            print(f"断开连接失败: {e}")  # 打印错误

    def test_connection(self):
        """
        测试连接
        :return: True表示连接成功，False表示失败
        """
        if self.connect():  # 尝试连接
            self.disconnect()  # 立即断开
            return True  # 返回成功
        return False  # 返回失败