# Mermaid

## Structure and diagram type
The first line must name the diagram type: `flowchart TD` (or `graph TD`), `flowchart LR`,
`sequenceDiagram`, `classDiagram`, `erDiagram`, `stateDiagram-v2`, `gantt`, `pie`.
One diagram per code block. No HTML. Indentation is free but keep it consistent.

## Flowchart nodes and edges
Node id then shape: `A[Box]`, `B(Rounded)`, `C{Decision}`, `D[(Database)]`, `E((Circle))`.
Edges: `A --> B`, labelled `A -->|Yes| B` or `A -- Yes --> B`, dotted `A -.-> B`.
Group with `subgraph Title` ... `end`. Node ids must not contain spaces; put text in the label.
Quote labels that contain parentheses or special characters: `A["Save (draft)"]`.

```mermaid
flowchart TD
  start([Start]) --> input[Enter order]
  input --> check{Stock available?}
  check -->|Yes| pay[Take payment]
  check -->|No| notify[Notify customer]
  pay --> ship[Ship order]
  ship --> done([End])
  notify --> done
```

## Sequence diagram
Declare `participant` or `actor` first. Sync message `A->>B: text`, reply `B-->>A: text`.
Use `activate`/`deactivate`, `Note over A,B: text`, and blocks `alt` / `else` / `end`,
`loop` / `end`, `opt` / `end`.

```mermaid
sequenceDiagram
  actor User
  participant App
  participant Auth
  User->>App: Submit login
  App->>Auth: Verify credentials
  alt valid
    Auth-->>App: Token
    App-->>User: Show dashboard
  else invalid
    Auth-->>App: Error
    App-->>User: Show error
  end
```

## Class diagram
`class Name { +Type field  +method() Type }`. Relations: inheritance `Animal <|-- Dog`,
composition `Car *-- Engine`, aggregation `Team o-- Player`, association `A --> B`,
dependency `A ..> B`. Cardinality: `Customer "1" --> "*" Order : places`.

```mermaid
classDiagram
  class Animal {
    +String name
    +speak() String
  }
  class Dog {
    +fetch() void
  }
  Animal <|-- Dog
  Owner "1" --> "*" Animal : owns
```

## ER diagram
`erDiagram` then relationships `CUSTOMER ||--o{ ORDER : places`. Cardinality markers:
`||` exactly one, `o|` zero or one, `}o` / `o{` zero or more, `}|` / `|{` one or more.
The label after `:` is required. Attributes go in a block: type then name, then optional
`PK`, `FK`, `UK`. Entity names should not contain spaces.

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : "ordered in"
  CUSTOMER {
    int id PK
    string email
  }
  ORDER {
    int id PK
    int customer_id FK
    date created_at
  }
  ORDER_ITEM {
    int order_id FK
    int product_id FK
    int quantity
  }
  PRODUCT {
    int id PK
    string name
  }
```

## State diagram and common mistakes
`stateDiagram-v2`, start/end is `[*]`, transitions `Idle --> Running : start`. Composite states:
`state Running { ... }`. Common mistakes: missing type line, spaces in ids, using `->` instead of
`-->` in flowcharts, missing `end` for `subgraph`/`alt`/`loop`, missing `:` label in erDiagram.

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Paused : pause
  Paused --> Running : resume
  Running --> [*] : stop
```
