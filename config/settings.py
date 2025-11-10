# -*- coding: utf-8 -*-
"""
配置管理模块
负责管理AI模型配置、应用设置等
"""

import json  # 用于JSON数据处理
import os  # 用于文件和目录操作


class SettingsManager:
    """配置管理类，负责AI配置的读取和保存"""

    def __init__(self, config_file='config/ai_config.json'):
        """
        初始化配置管理器
        :param config_file: 配置文件路径
        """
        self.config_file = config_file  # 配置文件路径
        self._ensure_config_file()  # 确保配置文件存在

    def _ensure_config_file(self):
        """确保配置文件存在，如果不存在则创建默认配置"""
        if not os.path.exists(self.config_file):  # 如果配置文件不存在
            # 创建默认配置
            default_config = {
                "current_provider": "siliconflow",  # 当前使用的AI提供商（默认：硅基流动）
                "providers": {  # AI提供商配置
                    "siliconflow": {  # 硅基流动配置
                        "name": "硅基流动",  # 提供商名称
                        "api_url": "https://api.siliconflow.cn/v1/chat/completions",  # API地址
                        "api_key": "",  # API密钥（用户需要自行设置）
                        "model": "Qwen/Qwen2.5-7B-Instruct"  # 默认模型
                    },
                    "openai": {  # OpenAI配置
                        "name": "OpenAI",  # 提供商名称
                        "api_url": "https://api.openai.com/v1/chat/completions",  # API地址
                        "api_key": "",  # API密钥
                        "model": "gpt-3.5-turbo"  # 默认模型
                    },
                    "deepseek": {  # DeepSeek配置
                        "name": "DeepSeek",  # 提供商名称
                        "api_url": "https://api.deepseek.com/v1/chat/completions",  # API地址
                        "api_key": "",  # API密钥
                        "model": "deepseek-chat"  # 默认模型
                    },
                    "custom": {  # 自定义配置
                        "name": "自定义",  # 提供商名称
                        "api_url": "",  # API地址（用户自定义）
                        "api_key": "",  # API密钥
                        "model": ""  # 模型名称
                    }
                }
            }
            self.save_config(default_config)  # 保存默认配置

    def load_config(self):
        """
        加载配置
        :return: 配置字典
        """
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:  # 打开配置文件
                return json.load(f)  # 返回JSON配置数据
        except Exception as e:  # 如果加载失败
            print(f"加载配置失败: {e}")  # 打印错误信息
            return {}  # 返回空字典

    def save_config(self, config):
        """
        保存配置
        :param config: 配置字典
        :return: True表示成功，False表示失败
        """
        try:
            # 确保配置目录存在
            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)  # 创建目录
            with open(self.config_file, 'w', encoding='utf-8') as f:  # 打开文件进行写入
                json.dump(config, f, ensure_ascii=False, indent=4)  # 保存JSON数据（格式化输出）
            return True  # 返回成功
        except Exception as e:  # 如果保存失败
            print(f"保存配置失败: {e}")  # 打印错误信息
            return False  # 返回失败

    def get_current_provider_config(self):
        """
        获取当前选择的AI提供商配置
        :return: 当前提供商配置字典
        """
        config = self.load_config()  # 加载配置
        current_provider = config.get('current_provider', 'siliconflow')  # 获取当前提供商（默认硅基流动）
        return config.get('providers', {}).get(current_provider, {})  # 返回提供商配置

    def update_provider(self, provider_name, provider_config):
        """
        更新指定提供商的配置
        :param provider_name: 提供商名称
        :param provider_config: 提供商配置字典
        :return: True表示成功，False表示失败
        """
        config = self.load_config()  # 加载当前配置
        if 'providers' not in config:  # 如果没有providers字段
            config['providers'] = {}  # 创建providers字段
        config['providers'][provider_name] = provider_config  # 更新提供商配置
        return self.save_config(config)  # 保存配置

    def set_current_provider(self, provider_name):
        """
        设置当前使用的AI提供商
        :param provider_name: 提供商名称
        :return: True表示成功，False表示失败
        """
        config = self.load_config()  # 加载配置
        config['current_provider'] = provider_name  # 设置当前提供商
        return self.save_config(config)  # 保存配置