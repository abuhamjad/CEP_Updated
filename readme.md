# CEP Memory Dashboard

A Flask-based web application for analyzing CEP infrastructure memory utilization reports. The application processes Excel or CSV reports, identifies high-memory CEP nodes, visualizes state-wise distribution, and generates downloadable reports through a modern interactive dashboard.

---

## Overview

CEP Memory Dashboard automates the analysis of infrastructure memory reports by:

* Processing uploaded Excel and CSV reports.
* Dynamically detecting date and memory utilization columns.
* Filtering CEP nodes exceeding predefined memory thresholds.
* Identifying the highest memory utilization per hypervisor.
* Displaying processed results in an interactive dashboard.
* Generating Excel and PDF reports.
* Providing encrypted storage for email configuration settings.

The application is designed to eliminate manual analysis and improve operational reporting efficiency.

---

## Features

| Feature                         | Description                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| Dynamic File Processing         | Supports both CSV and Excel reports                                 |
| Automatic Date Detection        | Automatically identifies date columns                               |
| Dynamic Memory Column Detection | Detects memory utilization columns without hardcoding               |
| CEP Filtering                   | Processes only CEP-related records                                  |
| Threshold Analysis              | Displays nodes with memory utilization greater than or equal to 70% |
| Duplicate Node Handling         | Keeps the highest memory value for each Site-Hypervisor pair        |
| Interactive Dashboard           | Displays processed results in a responsive UI                       |
| State-wise Visualization        | Generates node count charts grouped by state                        |
| Excel Export                    | Exports complete processed datasets                                 |
| PDF Export                      | Generates PDF reports containing dashboard data                     |
| Dark/Light Theme                | User-selectable application theme                                   |
| Progress Tracking               | Displays processing progress in real time                           |
| Secure Configuration Storage    | Encrypts and stores email settings locally                          |

---

## Technology Stack

| Category        | Technology                       |
| --------------- | -------------------------------- |
| Backend         | Flask                            |
| Frontend        | HTML, CSS, JavaScript            |
| Data Processing | Pandas                           |
| Charting        | Chart.js, Plotly                 |
| File Processing | OpenPyXL                         |
| Security        | Cryptography (Fernet Encryption) |
| PDF Generation  | jsPDF, html2canvas               |
| Excel Export    | Pandas, OpenPyXL                 |

---

## Data Processing Workflow

The application follows the workflow below:

1. Upload a CSV or Excel report.
2. Automatically detect:

   * Date column
   * Memory utilization column
3. Filter records containing `CEP`.
4. Exclude:

   * INSTALLER
   * DASHBOARD
5. Convert memory values to numeric format.
6. Apply memory threshold (`>= 70%`).
7. Split node information into:

   * Site
   * Hypervisor
8. Group records by Site and Hypervisor.
9. Retain the highest memory utilization for each node.
10. Generate:

    * Interactive table
    * State-wise chart
    * Downloadable reports

---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/CEP_Updated.git
cd CEP_Updated
```

### Create a virtual environment

```bash
python -m venv venv
```

Activate the environment:

**Windows**

```bash
venv\Scripts\activate
```

**Linux / macOS**

```bash
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

---

## Running the Application

Start the Flask server:

```bash
python app.py
```

Open your browser and navigate to:

```text
http://127.0.0.1:5000
```

---

## Usage

| Step | Action                               |
| ---- | ------------------------------------ |
| 1    | Upload a CSV or Excel report         |
| 2    | Click **Process Report**             |
| 3    | Review processed data and charts     |
| 4    | Export reports as Excel or PDF       |
| 5    | Configure email settings if required |

---

## Email Configuration

The application includes support for secure email configuration storage.

Stored settings include:

* Sender Email
* Sender Password
* Recipient Email
* CC Recipients
* Subject
* Message Template

Credentials are encrypted locally using Fernet encryption.

> Note: Automated email delivery functionality is currently disabled pending mail server approval.

---

## Security

| Security Feature         | Description                                 |
| ------------------------ | ------------------------------------------- |
| Encrypted Credentials    | Email settings are encrypted before storage |
| Local Storage            | Sensitive data is stored locally only       |
| No Hardcoded Credentials | Credentials are never stored in source code |

---

## Future Enhancements

| Planned Feature                  |
| -------------------------------- |
| Microsoft Graph API Integration  |
| Automated Email Scheduling       |
| Historical Report Storage        |
| User Authentication              |
| Multi-user Support               |
| Report Versioning                |
| Dashboard Analytics Enhancements |

---

## License

This project is intended for internal operational and reporting purposes.

---
