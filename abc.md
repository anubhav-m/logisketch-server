# 📘 LogiSketch

Generate system architecture, ER, flowchart, network packet, circuit logic, 3D, math, and sequence diagrams from natural language prompts. A backend-powered diagram assistant for developers, educators, and system designers. Supports 13+ diagram engines like PlantUML, Mermaid, Graphviz, Structurizr, D2, Vega-Lite, Tikz, and many more.

---

## 📡 Section 2: API Usage

### 📤 Sample API Request

```json
POST /api/generate
{
  "prompt": {
    "text": "Create an ER diagram for a bookstore management system",
    "image": "<optional image URL>"
  },
  "model": "mistralai/mistral-small-3.2-24b-instruct-2506:free",
  "engine": "plantuml"
}
```

### 📥 Sample API Response

```json
{
  "code": "@startuml\n...diagram code here...\n@enduml"
}
```

- Use the returned code with a Kroki endpoint to render the diagram.

---

## 🔐 .env Configuration

Create a `.env` file at the root of the project with the following:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
CODE=optional_ui_access_password
BASE_URL=https://openrouter.ai/api/v1/chat/completions
DEFAULT_MODEL=mistralai/mistral-small-3.2-24b-instruct-2506:free
```

> Add more environment variables if needed for other providers (like Claude, DeepSeek, etc.)

---

## 🛠️ How to Run Locally

### Prerequisites

- Node.js v18 or higher
- npm

### 🧪 Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/logisketch.git
cd logisketch

# 2. Install dependencies
npm install

# 3. Create and configure your .env
cp .env.example .env

# 4. Run the development server
npm run dev
```

The backend will start on `http://localhost:3000` (or your configured port).