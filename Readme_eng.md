# AI Network Monitoring and Analysis Agent Platform

[中文版本](Readme_cn.md)

## Project Introduction

The AI Network Monitoring and Analysis Agent Platform is a Flask-based network device monitoring system that supports real-time monitoring, interface information retrieval, and device management for multi-vendor devices (Cisco, Huawei, H3C, Juniper, Fortinet, Arista, HP, Dell, ZTE, Linux, Windows, etc.). The system integrates AI analysis capabilities to intelligently analyze device inspection results.

## Features

### Core Functions
- **Multi-vendor Device Support**: Supports mainstream network devices and server operating systems including Cisco, Huawei, H3C, Juniper, Fortinet, Arista, HP, Dell, ZTE, Linux, Windows, and others
- **Real-time Device Monitoring**: Monitors key indicators such as CPU, memory, and temperature
- **Interface Information Management**: Retrieves and displays device interface status information
- **Device Management**: Complete CRUD operations (Create, Read, Update, Delete devices)
- **Device Inspection**: Executes device command inspections and generates reports
- **AI Intelligent Analysis**: Integrates AI models for intelligent analysis of inspection results
- **Command Generation**: AI-based generation of configuration commands for specific vendor devices

### Garbage Character Handling Mechanism
- **Control Character Filtering**: Automatically filters ASCII control characters (including \b backspace characters)
- **Junk Data Cleaning**: Removes invalid strings like "unassigned" and "unset"
- **Debug Information Output**: Provides before-and-after comparison information for verification

## System Architecture

```
AI Network Monitoring and Analysis Agent Platform
├── ai_monitor_app.py          # Flask main application
├── config/                    # Configuration directory
│   ├── devices.json           # Device information storage
│   └── ai_config.json         # AI configuration file
├── modules/                   # Functional modules
│   ├── device_manager.py      # Device management module
│   ├── ssh_connector.py       # SSH connection module
│   ├── monitor.py             # Device monitoring module
│   ├── inspection.py          # Device inspection module
│   └── ai_assistant.py        # AI assistant module
├── static/                    # Static resources
│   ├── css/                   # CSS files
│   ├── js/                    # JavaScript files
│   └── images/                # Image resources
├── templates/                 # HTML templates
│   └── index.html             # Main page template
├── outputs/                   # Output directory
│   ├── inspection/            # Inspection result storage
│   └── analysis/              # Analysis report storage
└── requirements.txt           # Project dependencies
```

## Installation and Deployment

### Requirements
- Python 3.7+
- Flask 3.0.0
- paramiko 3.4.0
- requests 2.31.0

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd network_ai_monitor
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure AI keys:
Edit the `config/ai_config.json` file and fill in your AI service keys.

5. Start the application:
```bash
python ai_monitor_app.py
```

6. Access the application:
Open your browser and visit `http://127.0.0.1:5001`

## Usage Guide

### Adding Devices
1. Click the "Device Management" tab in the left navigation bar
2. Click the "Add Device" button
3. Fill in device information (IP address, username, password, vendor, etc.)
   - Supported vendors include: Huawei, H3C, Cisco(IOS), Cisco(NX-OS), Ruijie, Fortinet, Juniper, Arista, HP, Dell, ZTE, Linux, Windows, Other
4. Click "Add Device" to complete the addition

### Device Monitoring
1. Click the "Details" button for a device in the device list
2. View real-time monitoring data (CPU, memory, temperature, etc.)
3. View device interface status information

### Command Generation
1. Click the "Command Generation" tab in the left navigation bar
2. Select the device vendor (supports all added vendor types)
3. Describe your requirements (e.g., "Configure VLAN 10 and add port GigabitEthernet0/0/1 to this VLAN")
4. Click the "Generate Commands" button
5. View the AI-generated device configuration commands

### Device Inspection
1. Click the "Device Inspection" tab in the left navigation bar
2. Select the device and vendor type to inspect
3. Click the "Generate Inspection Commands" button
4. Edit the generated inspection commands if needed
5. Click the "Start Inspection" button
6. Wait for inspection to complete and view results

### AI Analysis
1. Click the "AI Analysis" button on the inspection results page
2. Wait for AI analysis to complete
3. View the AI-generated analysis report

## Garbage Character Handling Mechanism Explained

### Background
When retrieving interface information from Cisco devices, garbled output containing control characters may occur, such as:
```bash
\b\b\b\b\b\b\b\b\b DOWN \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20 0 B 0 B 0 IP: \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20, Status: unset/down
```

### Solution
The system implements a dedicated garbage character filtering mechanism:

1. **Control Character Filtering**:
   - Removes control characters with ASCII values less than 32 (including \b backspace characters)
   - Removes delete characters with ASCII value 127

2. **Specific String Filtering**:
   - Removes "unassigned" (unassigned IP address identifier)
   - Removes "unset" (unset status identifier)
   - Removes redundant "DOWN" and "UP" strings

3. **Debug Information Output**:
   - Prints raw output for debugging
   - Prints before-and-after string comparison for verification

### Processing Results
After filtering, garbled data is properly cleaned:
```bash
Original: \b\b\b\b\b\b\b\b\b DOWN \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20 0 B 0 B 0 IP: \b\b\b\b\b\b\b\b\bGigabitEthernet1/0/20, Status: unset/down
Filtered: GigabitEthernet1/0/20 0 B 0 B 0 IP: GigabitEthernet1/0/20, Status: /down
```

## Data Storage

### Device Information Storage
- **Storage Location**: `config/devices.json`
- **Storage Format**: JSON format
- **Storage Content**: Basic device information (IP, username, password, vendor, etc.)

### Inspection Data Storage
- **Storage Location**: `outputs/inspection/` directory
- **Storage Content**: Raw command output from device inspections
- **File Naming**: `hostname_ip_inspection_time.txt`

### Analysis Report Storage
- **Storage Location**: `outputs/analysis/` directory
- **Storage Content**: Reports generated by AI analysis
- **File Naming**: `AI_Analytics_original_inspection_filename`

## API Endpoints

### Device Management APIs
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Add new device
- `PUT /api/devices/<device_id>` - Update device information
- `DELETE /api/devices/<device_id>` - Delete device

### Device Details APIs
- `GET /api/devices/<device_id>/detail` - Get device detailed information

### Command Generation APIs
- `POST /api/ai/generate-commands` - Generate device configuration commands

### Inspection APIs
- `POST /api/inspection/start` - Start device inspection
- `GET /api/inspection/files` - Get inspection file list
- `GET /api/inspection/download/<filename>` - Download inspection file

### AI Analysis APIs
- `POST /api/analysis/start` - Start AI analysis
- `GET /api/analysis/files` - Get analysis report list

## Technology Stack

- **Backend Framework**: Flask
- **Frontend Framework**: Bootstrap 5
- **SSH Connection**: paramiko
- **AI Integration**: RESTful API calls
- **Data Storage**: JSON file storage

## Development Guide

### Code Structure
- `ai_monitor_app.py` - Main application entry point
- `modules/` - Functional modules
- `static/` - Static resources
- `templates/` - HTML templates

### Extension Development
1. Add new vendor support: Add command mapping in the `get_interface_command` function
2. Add new monitoring metrics: Add new monitoring methods in the `DeviceMonitor` class
3. Extend AI functionality: Modify prompt templates in the `AIAssistant` class

## FAQ

### 1. Device Connection Failure
- Check if device IP address, port, username, and password are correct
- Ensure device SSH service is enabled
- Check network connectivity

### 2. Interface Information Display Issues
- Check if device vendor selection is correct
- View debug logs to confirm command execution results
- Verify if device supports corresponding commands

### 3. AI Analysis Failure
- Check if AI configuration is correct
- Confirm if AI service keys are valid
- Check if network connection is normal

## Contribution Guidelines

Issues and Pull Requests are welcome to improve the project.

## License

This project is licensed under the MIT License.

## Contact

For any questions, please contact the project maintainers.