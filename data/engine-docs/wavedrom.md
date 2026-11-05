# WaveDrom

## Structure
A JSON-like object with a `signal` array: `{ signal: [ { name: "clk", wave: "p...." } ] }`.
Keys may be unquoted (WaveJSON). Each lane has a `name` and a `wave`; one wave character per
clock period. Optional `head: { text: "Title" }`, `foot`, `config: { hscale: 2 }`.

## Wave characters
`p`/`n` clock with positive/negative edge, `P`/`N` with arrow, `0`/`1` low/high,
`x` unknown, `z` high impedance, `.` repeat previous, `=` or `2`..`9` data value (labels from
`data: ["a", "b"]`), `u`/`d` pull up/down, `|` gap. Example: `wave: "x.=.=x", data: ["A", "B"]`.

## Groups and spacing
Group lanes with nested arrays: `["Bus", {name: "addr", wave: "x=.x"}, {name: "data", wave: "x.=x"}]`.
An empty object `{}` adds a spacer row. Keep all lanes the same length.

## Example: read cycle

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......" },
  { name: "req",  wave: "01..0.." },
  { name: "addr", wave: "x=..x..", data: ["A1"] },
  { name: "ack",  wave: "0..10.." },
  { name: "data", wave: "x..=x..", data: ["D1"] }
],
  head: { text: "Read cycle" }
}
```

## Common mistakes
Different wave lengths, fewer data labels than `=` segments, wave values like `high`,
trailing commas, wrapping the object in JavaScript (`var x = ...`).
