# blockdiag

## Structure
Wrap in `blockdiag { ... }`. Edges: `A -> B -> C;`. Statements end with `;`.
Node labels: `A [label = "Load Balancer"];`. Options: `orientation = portrait;`
(default is landscape, left to right), `default_shape = roundedbox;`, `span_width = 64;`.

## Node and edge attributes
Shapes: `box`, `roundedbox`, `diamond`, `ellipse`, `note`, `cloud`, `mail`, `beginpoint`,
`endpoint`, `actor`, `flowchart.database`, `flowchart.condition`, `flowchart.terminator`,
`flowchart.input`. Example: `db [shape = flowchart.database];`. Colors: `color = "#ccddee"`.
Edge label: `A -> B [label = "yes"];`, styles `style = dashed`, `dir = none` or `both`.

## Groups
`group { label = "Backend"; color = "#77ff77"; api; worker; }` draws a box around nodes.
A node belongs to one group only.

## Example: request flow

```blockdiag
blockdiag {
  default_shape = roundedbox;
  user [shape = actor, label = "User"];
  lb [label = "Load Balancer"];
  check [shape = flowchart.condition, label = "Cached?"];
  db [shape = flowchart.database, label = "Database"];
  user -> lb -> check;
  check -> cache [label = "yes"];
  check -> app [label = "no"];
  app -> db;
  group {
    label = "Backend";
    app; cache;
  }
}
```

## Common mistakes
Missing outer `blockdiag {}`, missing `;`, using `-->` (use `->`), Mermaid brackets like
`A[Text]` (use `A [label = "Text"]`), node names with spaces (use an id plus a label),
putting one node in two groups.
