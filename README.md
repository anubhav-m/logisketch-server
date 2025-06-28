# Logisketch – Smart Diagram Generator from Natural Language & Images

<br>

## About

Generate system architecture, ER, flowchart, network packet, circuit logic, 3D, math, and sequence diagrams from natural language prompts.  
A backend-powered diagram assistant for developers, educators, and system designers.  
Supports **13+ diagram engines** like PlantUML, Mermaid, Graphviz, Structurizr, D2, Vega-Lite, Tikz, and many more.

---

<br>

## Supported Models

### Text-based LLMs:

- `meta-llama/llama-4-scout-17b-16e-instruct`
- `llama-3.3-70b-versatile`
- `llama-3.1-8b-instant`
- `meta-llama/llama-4-maverick-17b-128e-instruct`

### Text + Image-based LLMs:

- `mistralai/mistral-small-3.2-24b-instruct-2506:free`

---

<br>

## Supported Diagram Engines (via Kroki)

| Engine      | Can Generate                                      |
| ----------- | ------------------------------------------------- |
| Graphviz    | Flowcharts, directed/undirected graphs            |
| Blockdiag   | Block diagrams                                    |
| Seqdiag     | Sequence diagrams                                 |
| Packetdiag  | Network packet diagrams                           |
| C4          | C4 model diagrams (software architecture)         |
| D2          | Entity relationships, org charts, architectures   |
| ERD         | Entity Relationship Diagrams                      |
| Mermaid     | Flowcharts, Gantt, class, pie, state diagrams     |
| Nomnoml     | UML class diagrams                                |
| PlantUML    | UML diagrams (sequence, activity, use-case, etc.) |
| Structurizr | Software architecture diagrams (C4 model)         |
| Symbolator  | Digital logic and circuit diagrams                |
| TikZ        | Math figures, circuit diagrams, flowcharts        |
| Vega-Lite   | Bar, line, scatter charts (data visualization)    |
| Wavedrom    | Digital timing diagrams                           |

---

<br>

## Key Features

- Natural language to diagram via Kroki
- Image + text-based diagram generation
- Multi-model LLM support
- Custom prompt engineering support
- Rate limiting and bot protection via Arcjet
- Supports 13+ diagram engines

---

<br>

## API Routes Description

### 1. `POST /api/generate-image`

Generates a diagram image from a natural language prompt, with optional image input (used for models that support images).  
This route performs the full LLM-to-Kroki pipeline and returns both the generated code and the rendered diagram.

### 2. `POST /api/render-code`

Renders a given diagram code (in a supported diagram syntax) directly into an image using the selected Kroki engine.  
This route bypasses the LLM and is ideal when you already have the code and just want to convert it to an image.

---

<br>

## API Usage

### For Text-based Models

> POST /api/generate-image

```json
{
  "prompt": {
    "text": "Create a CI/CD pipeline diagram with key stages and tool relationships."
  },
  "model": "llama-3.3-70b-versatile",
  "engine": "plantuml"
}
```

#### ✅ Success Response

```json
{
  "success": "true",
  "code": "...",
  "svg": "..."
}
```

#### ❌ Error Response

```json
{
  "success": "false",
  "error": "..."
}
```

---

### For Text + Image Models

> POST /api/generate-image

```json
{
  "prompt": {
    "text": "Create an ER diagram from following image",
    "image": "https://dataedo.com/asset/img/blog/erd_with_pen.png"
  },
  "model": "llama-3.3-70b-versatile",
  "engine": "erd"
}
```

#### ✅ Success Response

```json
{
  "success": "true",
  "code": "...",
  "svg": "..."
}
```

#### ❌ Error Response

```json
{
  "success": "false",
  "error": "..."
}
```

---

### For Rendering Code

> POST /api/render-code

```json
{
  "code":"..."
  "engine": "plantuml"
}
```

#### ✅ Success Response

```json
{
  "success": "true",
  "svg": "..."
}
```

#### ❌ Error Response

```json
{
  "success": "false",
  "error": "..."
}
```

---

<br>

## Accepted Parameters

| Parameter | Type                    | Allowed Values                                                                                                                                                                                                                                             | Description                          |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `model`   | string (LLM)            | Text-based LLMs<br>`meta-llama/llama-4-scout-17b-16e-instruct`,<br>`llama-3.3-70b-versatile`,<br>`llama-3.1-8b-instant`,<br>`meta-llama/llama-4-maverick-17b-128e-instruct`<br><br>Text+Image LLMs<br>`mistralai/mistral-small-3.2-24b-instruct-2506:free` | LLMs used for generating diagrams    |
| `engine`  | string (Diagram Engine) | `plantuml`, `mermaid`, `graphviz`, `structurizr`, `blockdiag`, `seqdiag`, `packetdiag`, `c4`, `d2`, `erd`, `nomnoml`, `tikz`, `vega-lite`, `symbolator`, `wavedrom`                                                                                        | Rendering engines supported by Kroki |

---

<br>

## Environment Configuration

Create a file named either:

- `.env.development.local` – for development
- `.env.production.local` – for production

> _⚠️ Other filenames **will not work** without changes to the environment loader config._

Place it in the root of your project directory.

---

### Sample `.env.*.local` File

```env
# ENVIRONMENT
NODE_ENV=development

# PORT
PORT=3000

# ARCJET
ARCJET_KEY=your_arcjet_key_here

# LLM PROVIDERS

# 1. GROQ
GROQ_API=your_groq_api_key_here
GROQ_ENDPOINT=https://api.groq.com/openai/v1/chat/completions

  # GROQ MODELS
  GROQ_LLM_1=meta-llama/llama-4-scout-17b-16e-instruct
  GROQ_LLM_2=llama-3.3-70b-versatile
  GROQ_LLM_3=llama-3.1-8b-instant
  GROQ_LLM_4=meta-llama/llama-4-maverick-17b-128e-instruct

# 2. OPENROUTER

OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions

  # OPENROUTER MODELS
  OPENROUTER_LLM_1=mistralai/mistral-small-3.2-24b-instruct-2506:free
  OPENROUTER_API_1=your_mistralai_api_key_here

# RENDER ENGINES
ENGINE_1=graphviz
ENGINE_2=blockdiag
ENGINE_3=seqdiag
ENGINE_4=packetdiag
ENGINE_5=c4plantuml
ENGINE_6=d2
ENGINE_7=erd
ENGINE_8=mermaid
ENGINE_9=nomnoml
ENGINE_10=plantuml
ENGINE_11=structurizr
ENGINE_12=symbolator
ENGINE_13=tikz
ENGINE_14=vegalite
ENGINE_15=wavedrom
```

---

### Get Your API Keys

- **ARCJET API Key** → [https://arcjet.com](https://arcjet.com)
  
  > _Sign up at [https://arcjet.com](https://arcjet.com) and create a new project._
  > _Once created, your API key will be displayed at the top under your project name as ARCJET_KEY = **************_

- **GROQ API Key** → [https://console.groq.com/keys](https://console.groq.com/keys)

- **Mistral API Key** → [https://openrouter.ai/mistralai/mistral-small-3.2-24b-instruct:free/api](https://openrouter.ai/mistralai/mistral-small-3.2-24b-instruct:free/api)

---
<br>

## How to Run Locally

 
### 1. Clone the repo and cd into it

```bash
git clone git@github.com:anubhav-m/logisketch-server.git
cd logisketch-server
```


### 2. Install dependencies

```bash
npm install
```

### 3. Create and configure your .env file
>_Refer to the [Environment Configuration](#environment-configuration) section for setup_

### 4. Run the development server
```bash
npm run dev
```

---
<br>


## Deployment Guide

When deploying on **Render**, **Railway**, **Fly.io**, or similar platforms, make sure to configure the following:

### Build Command:  
```bash
npm install
```

### **Start Command:**  
```bash
npm start
```

### **Environment Variable:**  
```env
NODE_ENV=production
```

### **Secrets:**  
Upload your `env.production.local` file.  
>_Refer to the [Environment Configuration](#environment-configuration) section for the full list of variables._

---
<br>

This project is licensed under the terms of the [MIT License](./LICENSE).
