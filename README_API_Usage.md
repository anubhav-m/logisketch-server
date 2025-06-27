## 📡 API Usage

### 🔤 For Text-based Models

```json
{
  "prompt": {
    "text": "Create a CI/CD pipeline diagram with key stages and tool relationships."
  },
  "model": "llama-3.3-70b-versatile",
  "engine": "plantuml"
}
```

### 🖼️ For Text + Image Models

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

### ✅ Success Response

```json
{
  "success": "true",
  "code": "...",
  "svg": "..."
}
```

### ❌ Error Response

```json
{
  "success": "false",
  "error": "..."
}
```