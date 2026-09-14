# Technical Specifications for Users (Client-Side Requirements)

> **Project Name:** First 1,000 Days (F1KD) Maternal & Child Health and Nutrition Monitoring System  
> **Target Audience:** System Administrators, Community Organizers, Rural Health Workers, and Clinic Evaluators  
> **Document Reference:** Client Hardware & Software Specifications  
> **Generation Date:** 2026-09-14  

---

## 1. Overview
The **First 1,000 Days (F1KD)** Information System is delivered as a modern, responsive Single-Page Application (SPA) built with React and Vite. It communicates over secure HTTPS with an Express.js REST API. 

Because the application is accessible through standard web browsers, users do not need to install dedicated desktop client software. However, client workstations (laptops and desktop computers) must satisfy the minimum hardware and software criteria below to guarantee fast UI rendering, responsive data filtering, local caching, and reliable document uploads.

---

## 2. Hardware Specifications (Laptop / Desktop Computer)

| Component | Minimum Requirements | Recommended Specifications | Purpose / Technical Justification |
| :--- | :--- | :--- | :--- |
| **Processor (CPU)** | Intel Core i3 (7th Gen+) or AMD Ryzen 3 / Equivalent Dual-Core (1.8 GHz+) | Intel Core i5 (10th Gen+) or AMD Ryzen 5 / Apple Silicon M1+ (Quad-Core 2.4 GHz+) | Ensures smooth client-side DOM reconciliation, complex filter rendering, and fast data table paging. |
| **Memory (RAM)** | 4 GB DDR4 | 8 GB – 16 GB DDR4/DDR5 | Prevents browser tab crashing when loading large clinical records, data grids, and high-resolution document previews. |
| **Storage (Disk Space)** | 64 GB HDD/SSD with at least 10 GB free space | 256 GB SSD (NVMe preferred) with 30 GB+ free space | Required for browser cache storage, temporary document downloads, and exporting PDF/CSV reports. |
| **Display / Resolution** | 14-inch Display, 1366 × 768 (HD) | 14-inch to 15.6-inch Display, 1920 × 1080 (Full HD, 1080p), Anti-Glare | Ensures full visibility of multi-column health tables, stepper wizards, and clinical checkup charts without excessive horizontal scrolling. |
| **Network & Internet** | Broadband / Wi-Fi / 4G LTE with minimum 5 Mbps download / 2 Mbps upload | Stable High-Speed Wi-Fi / Fiber with 15+ Mbps download / 10 Mbps upload | Essential for real-time synchronization of check-up logs, batch attendance, and document uploads. |
| **Input Devices** | Standard QWERTY Keyboard and Touchpad or Mouse | Full-sized Ergonomic Keyboard with Numeric Keypad and Optical Mouse | Facilitates rapid numerical data entry (e.g., blood pressure, weight, heights, dates, and ID codes). |
| **Power & Battery (Laptops)** | 3-cell battery (approx. 2–3 hours battery backup) | 4-cell to 6-cell battery (5+ hours battery life) | Crucial for community organizers and health workers conducting fieldwork and off-site barangay visitations. |

---

## 3. Peripheral Hardware Specifications (Optional / Operational)

For clinics, school clusters, and administrative centers performing registration and document capture:

| Peripheral Device | Recommended Specification | Operational Role |
| :--- | :--- | :--- |
| **Document Scanner / Camera** | Integrated 720p/1080p HD Webcam or Flatbed Scanner (300 DPI) / Smartphone Camera | Capturing and uploading birth certificates, PhilHealth IDs, and signed maternal consent documents. |
| **Printer** | Standard Laser or Ink Tank Color Printer (USB / Network Wi-Fi) | Printing maternal monitoring summary receipts, growth milestone charts, and executive progress reports. |
| **Uninterruptible Power Supply (UPS)** | 600VA / 360W UPS (for desktop workstations) | Prevents abrupt shutdowns and data loss during localized power fluctuations in rural health units. |

---

## 4. Software Specifications (Laptop / Computer)

| Category | Minimum Requirement | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | • Windows 10 (64-bit, Version 1909+)<br>• macOS 11 (Big Sur)<br>• Linux (Ubuntu 20.04 LTS, Debian 11)<br>• ChromeOS (v90+) | • Windows 11 (64-bit, latest release)<br>• macOS 13 (Ventura) or macOS 14 (Sonoma)<br>• Linux (Ubuntu 22.04 LTS / 24.04 LTS) |
| **Web Browser** | Any modern Evergreen browser:<br>• Google Chrome (v100+)<br>• Microsoft Edge (v100+)<br>• Mozilla Firefox (v100+)<br>• Apple Safari (v15+) | **Google Chrome (latest stable version)** or **Microsoft Edge (latest stable version)** |
| **Browser Settings** | • JavaScript: **Enabled** (Mandatory)<br>• Cookies: **Enabled** (Required for JWT session persistence)<br>• LocalStorage / SessionStorage: **Enabled** | Standard browser default settings with hardware acceleration enabled. |
| **Office & Productivity** | Built-in browser PDF Viewer | • Adobe Acrobat Reader DC or Foxit PDF Reader<br>• Microsoft Excel, LibreOffice Calc, or Google Sheets (for viewing exported CSV/Excel datasets) |
| **Security Software** | Standard Windows Defender / OS built-in firewall | Up-to-date Antivirus / Endpoint Protection with active web protection. |

---

## 5. Tablet & Field Device Specifications (For Field Health Workers)

If health workers and community organizers access the responsive web portal using tablet computers in barangay health stations:

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Device Type** | Android Tablet or Apple iPad | Android Tablet (Samsung Galaxy Tab A/S series) or Apple iPad (9th Gen+) |
| **Operating System** | Android 10.0+ / iPadOS 15.0+ | Android 12.0+ / iPadOS 17.0+ |
| **Screen Size** | 8.0-inch touchscreen (1280 × 800) | 10.1-inch to 11.0-inch touchscreen (1920 × 1200 or Retina) |
| **RAM & Storage** | 3 GB RAM / 32 GB Storage | 4 GB to 6 GB RAM / 64 GB Storage |
| **Connectivity** | Wi-Fi + 4G LTE SIM Card capability | Wi-Fi + 4G LTE / 5G Mobile Data |
| **Rear Camera** | 8 MP with Auto-Focus and Flash | 12 MP or higher (for clear document capture in the field) |
