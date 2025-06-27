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

---

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

| Parameter | Type           | Allowed Values                                                                                      | Description                             |
|-----------|----------------|------------------------------------------------------------------------------------------------------|-----------------------------------------|
| `model`   | string (LLM)   | `meta-llama/llama-4-scout-17b-16e-instruct`<br>`llama-3.3-70b-versatile`<br>`llama-3.1-8b-instant`<br>`meta-llama/llama-4-maverick-17b-128e-instruct` | Text-based LLMs                         |
|           |                | `mistralai/mistral-small-3.2-24b-instruct-2506:free`                                                 | Text + Image LLM                        |
| `engine`  | string (Diagram Engine) | `plantuml`, `mermaid`, `graphviz`, `structurizr`, `blockdiag`, `seqdiag`, `packetdiag`, `c4`, `d2`, `erd`, `nomnoml`, `tikz`, `vega-lite`, `symbolator`, `wavedrom` | Rendering engines supported by Kroki   |

---
<br>