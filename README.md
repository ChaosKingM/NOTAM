# SKYJOS - NOTAM Analyzer & Visualizer 

An advanced aeronautical tool designed to parse complex NOTAM (Notice to Air Missions) data and visualize them on a state-of-the-art interactive map.

<p align="center">
  <a href="https://chaoskingm.github.io/NOTAM/src/frontend/index.html">
    <img src="https://img.shields.io/badge/START_NOW-00A357?style=for-the-badge&logo=github&labelColor=000000" alt="Start Now">
  </a>

<p align="center">
  <img src="https://img.shields.io/badge/UI-PREMIUM_DARK-00bef0?style=for-the-badge" alt="Premium UI">
  <img src="https://img.shields.io/badge/LICENSE-GPLv3-00A357?style=for-the-badge" alt="License">
</p>

---

## ✨ Features

### 🗺️ Advanced Visualization
- **Smart Geometries:** Automatic rendering of **Areas**, **Routes**, and **Radius**.
- **Interactive Markers:** Hover over any marker to see real-time **GPS Coordinates**.
- **Route Tracking:** Clear identification of start and end points for flight paths.

### 🔍 Powerful Engine
- **Intelligent Parser:** Extracts coordinates, altitudes, dates, and NAVAIDs from raw text.
- **Multi-NOTAM Stack:** Navigate through NOTAMs in the same area without clutter.
- **Real-time Filters:** Sort by altitude and date ranges on the fly.

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed (recommended for the local dev server).

### Installation & Run
1. Clone the repository:
   ```bash
   git clone https://github.com/chaoskingm/NOTAM.git
   ```
2. Navigate to the project folder and install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:3000`.

---

## 📂 Project Structure

- `src/frontend/`:
  - `css/style.css`: The design system.
  - `js/map/`: MapLibre integration and layer management.
  - `js/parser/`: The logic core for NOTAM text analysis.
  - `js/ui/`: Sidebar and UI event handling.
- `src/backend/`: Simple Express server for local development.

---

## ⚖️ License

Distributed under the **GNU General Public License v3.0 (GPLv3)**.

- **Copyleft**: Any modifications or derivative works must also be licensed under GPLv3.
- **Source Sharing**: You must make the source code available if you distribute the software.
- **Open Future**: Ensures the tool remains free and accessible to the aviation community.

---

<p align="center">Made with ❤️ for aviators and developers.</p>
