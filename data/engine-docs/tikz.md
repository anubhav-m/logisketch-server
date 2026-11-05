# TikZ

## Structure
Kroki compiles a full LaTeX document. Use
`\documentclass[tikz,border=5pt]{standalone}`, load libraries with
`\usetikzlibrary{positioning,arrows.meta,shapes.geometric}`, then
`\begin{document}`, `\begin{tikzpicture} ... \end{tikzpicture}`, `\end{document}`.

## Nodes and edges
`\node[draw, rectangle] (a) {Text};` and place relative: `\node[draw, right=2cm of a] (b) {B};`
(needs `positioning`). Lines: `\draw[->] (a) -- (b);`, labelled:
`\draw[->] (a) -- node[above] {yes} (b);`.
Styles: `\tikzset{box/.style={draw, rounded corners, minimum width=2.5cm}}`.
Shapes from `shapes.geometric`: `diamond`, `ellipse`, `trapezium`, `cylinder`.

## Example: flowchart

```latex
\documentclass[tikz,border=5pt]{standalone}
\usetikzlibrary{positioning,arrows.meta,shapes.geometric}
\begin{document}
\begin{tikzpicture}[node distance=1.2cm, every node/.style={font=\small},
  box/.style={draw, rounded corners, minimum width=2.6cm, minimum height=0.8cm},
  dec/.style={draw, diamond, aspect=2}]
  \node[box] (start) {Start};
  \node[dec, below=of start] (check) {Valid?};
  \node[box, below=of check] (save) {Save};
  \node[box, right=1.5cm of check] (err) {Error};
  \draw[-{Stealth}] (start) -- (check);
  \draw[-{Stealth}] (check) -- node[left] {yes} (save);
  \draw[-{Stealth}] (check) -- node[above] {no} (err);
\end{tikzpicture}
\end{document}
```

## Common mistakes
Missing `\documentclass` or `\begin{document}`, using `right=of` without the `positioning`
library, missing `;` at the end of each `\node` or `\draw`, unescaped `&`, `%`, `_` in labels,
packages that are not installed on the server.
