# -*- coding: utf-8 -*-
"""
巡检功能模块
负责设备巡检和报告生成
"""

import os  # 文件操作
from datetime import datetime  # 日期时间处理
from .ssh_connector import SSHConnector  # SSH连接器
from .ai_assistant import AIAssistant  # AI助手


class InspectionManager:
    """巡检管理类，负责设备巡检流程"""

    def __init__(self, output_dir='outputs'):
        """
        初始化巡检管理器
        :param output_dir: 输出目录
        """
        self.output_dir = output_dir  # 输出根目录
        self.inspection_dir = os.path.join(output_dir, 'inspection')  # 巡检文件目录
        self.analysis_dir = os.path.join(output_dir, 'analysis')  # 分析报告目录
        self._ensure_directories()  # 确保目录存在

    def _ensure_directories(self):
        """确保输出目录存在"""
        os.makedirs(self.inspection_dir, exist_ok=True)  # 创建巡检目录
        os.makedirs(self.analysis_dir, exist_ok=True)  # 创建分析目录

    def perform_inspection(self, device_info, commands, progress_callback=None):
        """
        执行设备巡检
        :param device_info: 设备信息字典
        :param commands: 巡检命令列表
        :param progress_callback: 进度回调函数（可选）
        :return: 巡检结果文件路径，失败返回None
        """
        try:
            # 更新进度：连接设备
            if progress_callback:  # 如果有回调函数
                progress_callback('connecting', 10, f"正在连接设备 {device_info['ip']}...")  # 调用回调

            # 创建SSH连接
            ssh = SSHConnector(
                host=device_info['ip'],  # IP地址
                port=device_info.get('port', 22),  # 端口
                username=device_info['username'],  # 用户名
                password=device_info['password']  # 密码
            )

            # 连接设备
            if not ssh.connect():  # 如果连接失败
                if progress_callback:  # 通知失败
                    progress_callback('error', 0, f"连接设备失败: {device_info['ip']}")  # 调用回调
                return None  # 返回None

            # 更新进度：获取主机名
            if progress_callback:  # 如果有回调
                progress_callback('getting_hostname', 20, "正在获取设备主机名...")  # 调用回调

            # 获取设备主机名
            hostname = ssh.get_hostname(device_info.get('vendor', 'huawei'))  # 获取主机名

            # 更新进度：执行命令
            if progress_callback:  # 如果有回调
                progress_callback('executing', 30, f"正在执行巡检命令（共{len(commands)}条）...")  # 调用回调

            # 执行巡检命令
            output = ssh.execute_commands(commands, wait_time=3)  # 执行命令（等待3秒）

            # 断开连接
            ssh.disconnect()  # 断开SSH

            # 更新进度：保存结果
            if progress_callback:  # 如果有回调
                progress_callback('saving', 70, "正在保存巡检结果...")  # 调用回调

            # 生成文件名：hostname_ip_巡检时间.txt
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')  # 生成时间戳
            filename = f"{hostname}_{device_info['ip']}_{timestamp}.txt"  # 生成文件名
            filepath = os.path.join(self.inspection_dir, filename)  # 完整路径

            # 保存巡检结果
            with open(filepath, 'w', encoding='utf-8') as f:  # 打开文件写入
                # 写入文件头信息
                f.write(f"{'='*60}\n")  # 分隔线
                f.write(f"设备巡检报告\n")  # 标题
                f.write(f"{'='*60}\n")  # 分隔线
                f.write(f"设备IP: {device_info['ip']}\n")  # IP地址
                f.write(f"主机名: {hostname}\n")  # 主机名
                f.write(f"厂商: {device_info.get('vendor', 'Unknown')}\n")  # 厂商
                f.write(f"巡检时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")  # 巡检时间
                f.write(f"{'='*60}\n\n")  # 分隔线
                f.write(output)  # 写入命令输出

            # 更新进度：完成
            if progress_callback:  # 如果有回调
                progress_callback('completed', 100, f"巡检完成，结果已保存: {filename}")  # 调用回调

            return filepath  # 返回文件路径

        except Exception as e:  # 异常处理
            if progress_callback:  # 通知错误
                progress_callback('error', 0, f"巡检失败: {str(e)}")  # 调用回调
            print(f"巡检失败: {e}")  # 打印错误
            return None  # 返回None

    def analyze_inspection(self, inspection_file, ai_config, vendor, progress_callback=None):
        """
        分析巡检结果
        :param inspection_file: 巡检文件路径
        :param ai_config: AI配置字典
        :param vendor: 设备厂商
        :param progress_callback: 进度回调函数
        :return: 分析报告文件路径，失败返回None
        """
        try:
            # 更新进度：读取文件
            if progress_callback:  # 如果有回调
                progress_callback('reading', 10, "正在读取巡检文件...")  # 调用回调

            # 读取巡检文件
            with open(inspection_file, 'r', encoding='utf-8') as f:  # 打开文件
                inspection_content = f.read()  # 读取内容

            # 更新进度：调用AI分析
            if progress_callback:  # 如果有回调
                progress_callback('analyzing', 30, "正在调用AI进行分析，请稍候...")  # 调用回调

            # 创建AI助手
            ai = AIAssistant(
                api_url=ai_config.get('api_url'),  # API地址
                api_key=ai_config.get('api_key'),  # API密钥
                model=ai_config.get('model')  # 模型
            )

            # 调用AI分析
            analysis_result = ai.analyze_inspection_result(inspection_content, vendor)  # AI分析

            # 更新进度：保存报告
            if progress_callback:  # 如果有回调
                progress_callback('saving', 80, "正在保存分析报告...")  # 调用回调

            # 生成分析报告文件名
            inspection_filename = os.path.basename(inspection_file)  # 获取原文件名
            analysis_filename = f"AI_Analytics_{inspection_filename}"  # 添加前缀
            analysis_filepath = os.path.join(self.analysis_dir, analysis_filename)  # 完整路径

            # 保存分析报告
            with open(analysis_filepath, 'w', encoding='utf-8') as f:  # 打开文件写入
                f.write(f"{'='*60}\n")  # 分隔线
                f.write(f"AI 巡检分析报告\n")  # 标题
                f.write(f"{'='*60}\n")  # 分隔线
                f.write(f"原始巡检文件: {inspection_filename}\n")  # 原文件名
                f.write(f"分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")  # 分析时间
                f.write(f"{'='*60}\n\n")  # 分隔线
                f.write(analysis_result)  # 写入分析结果
                f.write(f"\n\n{'='*60}\n")  # 结束分隔线
                f.write(f"报告生成完成\n")  # 结束标记
                f.write(f"{'='*60}\n")  # 分隔线

            # 更新进度：完成
            if progress_callback:  # 如果有回调
                progress_callback('completed', 100, f"分析完成，报告已保存: {analysis_filename}")  # 调用回调

            return analysis_filepath  # 返回分析报告路径

        except Exception as e:  # 异常处理
            if progress_callback:  # 通知错误
                progress_callback('error', 0, f"分析失败: {str(e)}")  # 调用回调
            print(f"分析巡检结果失败: {e}")  # 打印错误
            return None  # 返回None

    def get_inspection_files(self):
        """
        获取所有巡检文件列表
        :return: 文件信息列表
        """
        files = []  # 初始化文件列表
        if os.path.exists(self.inspection_dir):  # 如果目录存在
            for filename in os.listdir(self.inspection_dir):  # 遍历目录
                if filename.endswith('.txt'):  # 如果是txt文件
                    filepath = os.path.join(self.inspection_dir, filename)  # 完整路径
                    stat = os.stat(filepath)  # 获取文件信息
                    files.append({
                        'name': filename,  # 文件名
                        'path': filepath,  # 完整路径
                        'size': stat.st_size,  # 文件大小（字节）
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')  # 修改时间
                    })
        # 按修改时间降序排序
        files.sort(key=lambda x: x['modified'], reverse=True)  # 排序
        return files  # 返回文件列表

    def get_analysis_files(self):
        """
        获取所有分析报告文件列表
        :return: 文件信息列表
        """
        files = []  # 初始化文件列表
        if os.path.exists(self.analysis_dir):  # 如果目录存在
            for filename in os.listdir(self.analysis_dir):  # 遍历目录
                if filename.endswith('.txt'):  # 如果是txt文件
                    filepath = os.path.join(self.analysis_dir, filename)  # 完整路径
                    stat = os.stat(filepath)  # 获取文件信息
                    files.append({
                        'name': filename,  # 文件名
                        'path': filepath,  # 完整路径
                        'size': stat.st_size,  # 文件大小
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')  # 修改时间
                    })
        # 按修改时间降序排序
        files.sort(key=lambda x: x['modified'], reverse=True)  # 排序
        return files  # 返回文件列表

    def delete_file(self, filepath):
        """
        删除文件
        :param filepath: 文件路径
        :return: True表示成功，False表示失败
        """
        try:
            if os.path.exists(filepath):  # 如果文件存在
                os.remove(filepath)  # 删除文件
                return True  # 返回成功
            return False  # 文件不存在
        except Exception as e:  # 异常处理
            print(f"删除文件失败: {e}")  # 打印错误
            return False  # 返回失败