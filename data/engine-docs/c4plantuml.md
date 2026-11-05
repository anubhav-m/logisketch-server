# C4-PlantUML

## Structure
PlantUML with the C4 library. Start with `@startuml`, include a level:
`!include C4_Context.puml`, `!include C4_Container.puml` or `!include C4_Component.puml`
(Container includes Context; Component includes Container). End with `@enduml`.
Optionally add `LAYOUT_LEFT_RIGHT()` or `LAYOUT_TOP_DOWN()` and `title ...`.

## Elements
`Person(alias, "Label", "Description")`, `Person_Ext(...)`, `System(alias, "Label", "Description")`,
`System_Ext(...)`, `Container(alias, "Label", "Technology", "Description")`,
`ContainerDb(...)`, `ContainerQueue(...)`, `Component(alias, "Label", "Technology", "Description")`.
Boundaries: `System_Boundary(alias, "Label") { ... }`, `Container_Boundary(...) { ... }`,
`Enterprise_Boundary(...) { ... }`. Aliases must be simple ids without spaces or dashes.

## Relationships
`Rel(from, to, "Label", "Technology")`, directional variants `Rel_D`, `Rel_U`, `Rel_L`, `Rel_R`,
`BiRel(a, b, "Label")`. Both ends must be existing aliases. `SHOW_LEGEND()` adds a legend.

## Example: container diagram

```c4plantuml
@startuml
!include C4_Container.puml
title Online shop - containers
Person(customer, "Customer", "Buys products")
System_Boundary(shop, "Online Shop") {
  Container(web, "Web App", "React", "Storefront UI")
  Container(api, "API", "Node.js", "Business logic")
  ContainerDb(db, "Database", "PostgreSQL", "Orders and products")
  ContainerQueue(queue, "Queue", "RabbitMQ", "Order events")
}
System_Ext(pay, "Payment Provider", "Card payments")
Rel(customer, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/writes", "SQL")
Rel(api, queue, "Publishes")
Rel(api, pay, "Charges", "HTTPS")
@enduml
```

## Common mistakes
Including the library from a URL (Kroki has it built in: `!include C4_Container.puml`),
using `Container` without including C4_Container, aliases with spaces or dashes, missing
quotes around labels, `Rel` to an alias that was never defined, missing `}` for boundaries.
