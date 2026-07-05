# Antigravity AI Code Reviewer

A premium, agentic single-page web application designed to analyze source code efficiency, provide optimization tips, trace time/space complexity improvements (Big-O notation), and recommend suitable compilers and optimization flags for compilation.

## Features

- **Agentic Terminal Console**: Simulates static code scanning pipelines dynamically.
- **Complexity Assessment**: Traces Time and Space complexity modifications ($O(N^2)$ to $O(N)$ etc.).
- **Code Efficiency Scoring**: Circular performance index displaying score-based feedback ratings.
- **Visual Bottlenecks**: Accurately describes program performance hotspots and suggested mitigations.
- **Compiler Optimizations & Playgrounds**: Recommends appropriate compiler flags (such as GCC `-O3 -march=native`), execution environments (like PyPy3), and provides direct references to online playground compilers (Godbolt Compiler Explorer, Replit, JSFiddle, JDoodle).
- **Interactive Source Diff**: Render optimized codes side-by-side with complete highlight styling.
- **Dual Review Engines**:
  - **Live AI Engine**: Secure, client-side fetches directly to Google Gemini 2.5 Flash API via user-supplied API keys (cached in local storage).
  - **Offline Simulation**: Rule-based parser mapping critical bottlenecks for common language snippets (C++, Python, JS, Java).
- **Responsive Dark/Light Layout**: Seamlessly toggle themes.
- **Analysis History Log**: Persistently review past checks.

## Setup & Running Instructions

1. **Locate the project folder**:
   ```
   E:\code-review-agent
   ```
2. **Launch the application**:
   - Double-click the `index.html` file to open it directly in any modern browser (Chrome, Edge, Firefox, Safari).
   - Alternatively, serve it locally using a light-weight static server:
     - **Python 3**:
       ```bash
       python -m http.server 8000
       ```
     - **Node.js (http-server)**:
       ```bash
       npx http-server -p 8000
       ```
3. **Configure Live AI Mode (Optional)**:
   - Click the **Settings** button in the lower left corner.
   - Enter your **Google Gemini API Key** (acquired from [Google AI Studio](https://aistudio.google.com/)).
   - Click **Save Configuration**. The API badge will shift to **Live AI Mode**.

## Technology Stack

- **Core**: HTML5, Vanilla JavaScript (ES6 Modules)
- **Styling**: Modern CSS3 (Grid/Flexbox layouts, glassmorphism filters, transitions)
- **Visual Assets & Icons**: Lucide Icons CDN
- **Code Presentation**: Prism.js CDN (Tomorrow theme syntax highlighting)
