# -*- coding: utf-8 -*-
"""
设备管理模块
负责网络设备的增删改查操作
"""

import json  # 用于JSON数据处理
import os  # 用于文件操作
import uuid  # 用于生成唯一ID


class DeviceManager:
    """设备管理类，负责设备信息的存储和管理"""

    def __init__(self, devices_file='config/devices.json'):
        """
        初始化设备管理器
        :param devices_file: 设备信息存储文件路径
        """
        self.devices_file = devices_file  # 设备信息文件路径
        self._ensure_devices_file()  # 确保设备文件存在

    def _ensure_devices_file(self):
        """确保设备文件存在，如果不存在则创建空设备列表"""
        if not os.path.exists(self.devices_file):  # 如果设备文件不存在
            # 确保目录存在
            os.makedirs(os.path.dirname(self.devices_file), exist_ok=True)  # 创建目录
            # 创建空设备列表
            self.save_devices([])  # 保存空列表

    def load_devices(self):
        """
        加载所有设备信息
        :return: 设备列表
        """
        try:
            with open(self.devices_file, 'r', encoding='utf-8') as f:  # 打开设备文件
                return json.load(f)  # 返回设备列表
        except Exception as e:  # 如果加载失败
            print(f"加载设备信息失败: {e}")  # 打印错误信息
            return []  # 返回空列表

    def save_devices(self, devices):
        """
        保存设备信息
        :param devices: 设备列表
        :return: True表示成功，False表示失败
        """
        try:
            with open(self.devices_file, 'w', encoding='utf-8') as f:  # 打开文件进行写入
                json.dump(devices, f, ensure_ascii=False, indent=4)  # 保存JSON数据
            return True  # 返回成功
        except Exception as e:  # 如果保存失败
            print(f"保存设备信息失败: {e}")  # 打印错误信息
            return False  # 返回失败

    def add_device(self, ip, username, password, vendor, port=22, name=''):
        """
        添加新设备
        :param ip: 设备IP地址
        :param username: 登录用户名
        :param password: 登录密码
        :param vendor: 设备厂商（如：Huawei, Cisco, H3C等）
        :param port: SSH端口（默认22）
        :param name: 设备名称（可选，如果不提供则自动获取）
        :return: 新添加的设备信息字典，失败返回None
        """
        devices = self.load_devices()  # 加载现有设备

        # 检查设备是否已存在
        for device in devices:  # 遍历所有设备
            if device['ip'] == ip:  # 如果IP地址已存在
                return None  # 返回None表示设备已存在

        # 如果没有提供设备名称，尝试自动获取hostname
        if not name:
            try:
                from .ssh_connector import SSHConnector  # 导入SSH连接器
                ssh = SSHConnector(
                    host=ip,
                    port=port,
                    username=username,
                    password=password,
                    timeout=10
                )
                if ssh.connect():  # 如果连接成功
                    hostname = ssh.get_hostname(vendor)  # 获取主机名
                    ssh.disconnect()  # 断开连接
                    if hostname and hostname != 'unknown':  # 如果获取成功
                        name = hostname  # 使用获取的主机名
                        print(f"自动获取设备名称成功: {name}")  # 打印日志
                    else:
                        name = f"{vendor}_{ip}"  # 使用默认名称
                else:
                    name = f"{vendor}_{ip}"  # 连接失败，使用默认名称
            except Exception as e:
                print(f"自动获取设备名称失败: {e}")  # 打印错误
                name = f"{vendor}_{ip}"  # 使用默认名称

        # 如果name仍然为空，使用默认格式
        if not name:
            name = f"{vendor}_{ip}"

        # 创建新设备信息
        new_device = {
            'id': str(uuid.uuid4()),  # 生成唯一ID
            'name': name,  # 设备名称
            'ip': ip,  # IP地址
            'port': port,  # SSH端口
            'username': username,  # 用户名
            'password': password,  # 密码
            'vendor': vendor,  # 设备厂商
            'status': 'unknown'  # 设备状态（初始为未知）
        }

        devices.append(new_device)  # 添加新设备到列表
        self.save_devices(devices)  # 保存设备列表
        return new_device  # 返回新设备信息

    def delete_device(self, device_id):
        """
        删除设备
        :param device_id: 设备ID
        :return: True表示成功，False表示失败
        """
        devices = self.load_devices()  # 加载设备列表
        # 过滤掉要删除的设备
        updated_devices = [d for d in devices if d['id'] != device_id]  # 保留ID不匹配的设备

        if len(updated_devices) == len(devices):  # 如果列表长度没有变化
            return False  # 表示设备不存在，删除失败

        return self.save_devices(updated_devices)  # 保存更新后的设备列表

    def get_device(self, device_id):
        """
        根据ID获取设备信息
        :param device_id: 设备ID
        :return: 设备信息字典，不存在返回None
        """
        devices = self.load_devices()  # 加载设备列表
        for device in devices:  # 遍历所有设备
            if device['id'] == device_id:  # 如果找到匹配的设备
                return device  # 返回设备信息
        return None  # 设备不存在

    def update_device(self, device_id, **kwargs):
        """
        更新设备信息
        :param device_id: 设备ID
        :param kwargs: 要更新的字段
        :return: True表示成功，False表示失败
        """
        devices = self.load_devices()  # 加载设备列表
        for device in devices:  # 遍历所有设备
            if device['id'] == device_id:  # 如果找到目标设备
                # 更新设备信息
                for key, value in kwargs.items():
                    device[key] = value
                return self.save_devices(devices)  # 保存并返回结果
        return False  # 设备不存在

    def update_device_status(self, device_id, status):
        """
        更新设备状态
        :param device_id: 设备ID
        :param status: 新状态（如：online, offline, unknown）
        :return: True表示成功，False表示失败
        """
        devices = self.load_devices()  # 加载设备列表
        for device in devices:  # 遍历所有设备
            if device['id'] == device_id:  # 如果找到目标设备
                device['status'] = status  # 更新状态
                return self.save_devices(devices)  # 保存并返回结果
        return False  # 设备不存在

    def get_all_devices(self):
        """
        获取所有设备信息
        :return: 设备列表
        """
        return self.load_devices()  # 返回所有设备