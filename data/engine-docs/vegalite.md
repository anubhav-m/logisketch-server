# Vega-Lite

## Structure
A single JSON object with `"$schema": "https://vega.github.io/schema/vega-lite/v5.json"`,
`"description"`, `"data"`, `"mark"` and `"encoding"`. It must be strict JSON: double quotes,
no comments, no trailing commas. Inline data: `"data": {"values": [{"a": "A", "b": 28}]}`.

## Marks and encodings
Marks: `bar`, `line`, `point`, `area`, `arc` (pie), `rect` (heatmap), `tick`, `rule`, `text`.
Encoding channels: `x`, `y`, `color`, `size`, `theta` (for arc), `tooltip`. Each needs a
`"field"` and a `"type"`: `quantitative`, `nominal`, `ordinal`, `temporal`.
Aggregates: `{"aggregate": "sum", "field": "sales", "type": "quantitative"}`.

## Example: bar chart

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Monthly sales",
  "data": {"values": [
    {"month": "Jan", "sales": 120},
    {"month": "Feb", "sales": 90},
    {"month": "Mar", "sales": 150}
  ]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "month", "type": "ordinal", "sort": null},
    "y": {"field": "sales", "type": "quantitative"}
  }
}
```

## Pie charts, layers and common mistakes
Pie: `"mark": {"type": "arc"}` with `"theta": {"field": "value", "type": "quantitative"}` and
`"color": {"field": "category", "type": "nominal"}`. Layers: `"layer": [{...}, {...}]` sharing data.
Common mistakes: JavaScript object syntax instead of JSON, missing `type` in encodings,
external data URLs, Vega (not Lite) keys like `"marks"` or `"signals"`.
