# seqdiag

## Structure
Wrap everything in `seqdiag { ... }`. Each statement ends with `;`. Participants are created
the first time they are used; to fix the order, list them first: `browser; webserver; database;`.
Labels on participants: `browser [label = "Web Browser"];`.

## Messages
`A -> B [label = "request"];` call, `A <-- B [label = "response"];` reply (dashed, written
from the caller side), `A ->> B` async, `A => B [label = "call", return = "result"];` call with
automatic return, nested calls: `A => B [label = "x"] { B => C [label = "y"]; }`.
Self message: `A -> A [label = "check"];`. Notes: `[label = "x", note = "comment"]`.

## Separators and options
Separators: `=== Section title ===` and delay `... wait ...`. Options at the top:
`edge_length = 200;`, `span_height = 15;`, `activation = none;`, `autonumber = True;`.

## Example: login sequence

```seqdiag
seqdiag {
  user; frontend; api; database;
  user -> frontend [label = "submit credentials"];
  frontend -> api [label = "POST /login"];
  api -> database [label = "find user"];
  api <-- database [label = "user row"];
  === Token issued ===
  frontend <-- api [label = "JWT"];
  user <-- frontend [label = "dashboard"];
}
```

## Common mistakes
Missing outer `seqdiag {}`, missing `;`, Mermaid/PlantUML syntax like `A->>B: text`,
labels without quotes, writing replies as `B --> A` instead of `A <-- B`,
participant names with spaces (use an id and a `label`).
