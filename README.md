# 🧠 NexusAI — Autonomous Deep Intelligence & Decision Platform

<div align="center">

**Next-Generation Multi-Agent Research System with Adversarial Debate, Real-Time Audio Briefings, Interactive Knowledge Graph, and Instant Pitch Deck Generation.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.1_Flash_Lite-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[⚡ Features](#-key-features) • [🏗️ Architecture](#-system-architecture) • [🚀 Quick Start](#-quick-start) • [🏆 Judge Demo](#-stage-demo-mode)

</div>

---

## 🌟 What is NexusAI?

NexusAI goes beyond conventional search-and-summarize wrappers. It is an **autonomous intelligence engine** designed for executives, researchers, and venture analysts. When given an ambiguous or complex strategic topic, NexusAI autonomously decomposes, investigates, peer-reviews, and transforms raw web intelligence into actionable decision artifacts:

1. **Autonomous Multi-Agent Pipeline**: 5 specialized agents (Planner, Researcher, Analyst, Writer, Critic) orchestrated under a Supervisor ReAct loop.
2. **Adversarial Bull vs. Bear Debate**: Rigorous investment-grade thesis and counter-thesis analysis with dynamic conviction scoring.
3. **Dual-Host Executive Audio Briefing**: NotebookLM-style synthetic executive podcast with real-time waveform visualization and synchronized transcript.
4. **60 FPS Semantic Knowledge & Entity Graph**: Physics-simulated canvas mapping key entities, relationships, market impacts, and risks.
5. **Interactive Grounded Copilot**: Chat directly with your synthesized research dossier with source citations.
6. **Instant 5-Slide Executive Pitch Deck**: One-click generation of presentation slides with fullscreen presentation mode.
7. **Stage Demo Mode**: Zero-latency instant loading of authentic golden intelligence dossiers.

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 🎙️ **Executive Audio Briefing** | Dual-host conversational podcast with dynamic audio waveforms and karaoke-style line synchronization. Zero API cost using high-fidelity client-side speech synthesis. |
| 🕸️ **Interactive Knowledge Graph** | HTML5 Canvas physics engine modeling forces, draggable nodes, category filters (Entity, Trend, Risk, Market), and node inspector. |
| ⚔️ **Adversarial Bull vs. Bear** | Dual thesis analysis pitting market optimism against structural headwinds with an animated conviction score meter. |
| 💬 **Grounded Research Copilot** | Integrated drawer allowing executives to ask follow-up questions strictly grounded in the extracted sources. |
| 📊 **Executive Pitch Deck** | Instant 5-slide deck (Cover, Key Findings, Bull/Bear Split, Data Charts, Strategic Verdict) with keyboard navigation. |
| 🛡️ **Source Protocol & Credibility** | 100% verified URLs, cryptographic sha-256 fingerprinting, domain diversity scoring, and live source preview. |
| ⚡ **Stage Demo Mode** | Instant 0.5s pre-loaded dossier preview to guarantee smooth live hackathon presentations. |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Executive Web Dashboard (HTML5 / Vanilla CSS / JS)   │
│   • Sage Neumorphic Design System  • Real-time SSE Agent Stream        │
│   • Canvas Knowledge Graph (60fps) • Interactive Grounded Copilot      │
│   • Synthetic Audio Waveform       • 5-Slide Presentation Deck         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST + SSE Stream
┌───────────────────────────────────┴────────────────────────────────────┐
│                    FastAPI Autonomous Backend Server                   │
├────────────────────────────────────────────────────────────────────────┤
│                     🧠 Supervisor Agent (Orchestrator)                 │
│   ┌────────┐   ┌──────────┐   ┌────────┐   ┌───────┐   ┌────────┐      │
│   │Planner │ → │Researcher│ → │Analyst │ → │Writer │ → │ Critic │      │
│   │  📋    │   │    🔍    │   │  📊    │   │  ✍️   │   │  🔎    │      │
│   └────────┘   └──────────┘   └────────┘   └───┬───┘   └───┬────┘      │
│                                                ↑           │           │
│                                                └───────────┘           │
│                                            (Self-Correction Loop)      │
├────────────────────────────────────────────────────────────────────────┤
│                       Tool Registry & Synthesis                        │
│   • Web Search (DuckDuckGo API)    • URL Scraper (httpx + BS4)         │
│   • Data Analyzer & Debate Engine  • Knowledge Graph Extractor         │
│   • Matplotlib Visualization Engine • Dual-Host Script Generator       │
├────────────────────────────────────────────────────────────────────────┤
│               Model Tiering & Multi-Model Fallbacks                    │
│   Google Gemini 3.1 Flash-Lite / 2.5 Flash / 2.0 Flash / 1.5 Flash     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/nexus-ai.git
cd nexus-ai

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your Google Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Get a free Gemini API key in 10 seconds at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))*

### 3. Launch NexusAI

```bash
python run.py
```

Open your browser to: **`http://localhost:8000`**

---

## 🏆 Stage Demo Mode

During a live hackathon or demo pitch, live network searches and LLM calls can sometimes introduce unpredictable latency. NexusAI includes **Stage Demo Mode**:

1. Open `http://localhost:8000`.
2. Click **⚡ Instant EV Dossier (Stage Demo)** under the search bar.
3. The dashboard populates in **0.5s** with an authentic golden intelligence dossier:
   - Full 1,800-word structured research report with 12 cited web sources.
   - Dual-Host Audio Briefing ready to play with animated waveform.
   - 60 FPS interactive Knowledge Graph with draggable nodes.
   - Bull vs. Bear Debate Matrix with 74% conviction meter.
   - Click **"Pitch Deck"** in the top action toolbar to present the 5-slide deck!

---

## 📁 Repository Structure

```
├── run.py                     # Primary launcher & port binding
├── requirements.txt           # Production dependencies
├── .env.example              # Environment configuration template
├── .gitignore                # Security protection (ignores .env and secrets)
├── README.md                 # Project documentation
│
├── backend/                  # FastAPI Backend
│   ├── main.py               # REST API, SSE endpoints, showcase routes
│   ├── config.py             # Settings & environment validation
│   ├── core/
│   │   ├── state.py          # Typed dataclass pipeline state
│   │   ├── event_bus.py      # Real-time Server-Sent Events broker
│   │   ├── llm_engine.py     # Resilient multi-tier LLM engine
│   │   └── showcase_ev.json  # Serialized golden demo dossier
│   ├── agents/
│   │   ├── supervisor.py     # Autonomous workflow coordinator
│   │   ├── planner.py        # Strategic research planner
│   │   ├── researcher.py     # Live multi-source investigator
│   │   ├── analyst.py        # Quantitative & debate analyzer
│   │   ├── writer.py         # Executive report & script author
│   │   └── critic.py         # Self-evaluation & quality scorer
│   └── tools/
│       ├── web_search.py     # DuckDuckGo multi-query scraper
│       ├── url_scraper.py    # Deep content extractor
│       ├── data_analyzer.py  # Statistical & debate matrix parser
│       ├── chart_generator.py# Matplotlib chart engine
│       └── file_writer.py    # Artifact generator
│
├── frontend/                 # High-Performance Vanilla Dashboard
│   ├── index.html            # Semantic HTML5 executive workspace
│   ├── styles.css            # Soft-sage neumorphic design tokens
│   └── app.js                # Physics graph, audio player, pitch deck, SSE
│
└── outputs/                  # Auto-generated markdown reports & charts
```

---

## 🛡️ Security & Privacy

- **Zero Secret Exposure**: `.env` and all credential stores are strictly ignored by `.gitignore`.
- **Client-Side Synthesis**: Audio synthesis operates entirely in the browser with zero external telemetry or voice server costs.
- **Robust Model Fallbacks**: Resilient tiering across Gemini models prevents rate limit disruptions.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
Built with 🧠 for the Global AI Hackathon
</div>
