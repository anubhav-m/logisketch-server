# PlantUML

## Structure
Every diagram is wrapped in `@startuml` and `@enduml`. The diagram type is detected from the
content (sequence, class, activity, state, use case, component). Use `title Text` for a title,
`left to right direction` to change layout. Quote names with spaces: `participant "Web App" as web`.

## Sequence diagram
Participants: `actor`, `participant`, `database`, `queue`, `boundary`, `control`, `entity`.
Messages: `A -> B : text` (sync), `A --> B : text` (reply), `A ->> B : text` (async).
Groups: `alt cond` / `else other` / `end`, `loop text` / `end`, `opt`, `par`.
Notes: `note right of A : text`. `activate A` / `deactivate A` show lifelines.

```plantuml
@startuml
actor Customer
participant "Web Shop" as shop
database "Orders DB" as db
Customer -> shop : Place order
activate shop
shop -> db : INSERT order
db --> shop : order id
shop --> Customer : Confirmation
deactivate shop
@enduml
```

## Class diagram
`class Name { -type field  +method() }`, `abstract class`, `interface`, `enum`. Visibility:
`+` public, `-` private, `#` protected. Relations: `A <|-- B` inheritance, `A <|.. B` implements,
`A *-- B` composition, `A o-- B` aggregation, `A --> B` association, `A ..> B` dependency.
Multiplicity: `Customer "1" -- "*" Order : places`.

```plantuml
@startuml
interface Payable {
  +pay(amount : double)
}
abstract class Account {
  -balance : double
  +deposit(amount : double)
}
class SavingsAccount
class Customer
Account <|-- SavingsAccount
Payable <|.. Account
Customer "1" -- "*" Account : owns
@enduml
```

## Activity and state diagrams
Activity (new syntax): `start`, `:Action;`, `if (cond?) then (yes)` ... `else (no)` ... `endif`,
`while (cond?)` ... `endwhile`, `fork` / `fork again` / `end fork`, `stop`. Swimlanes: `|Lane|`.
State: `[*] --> Idle`, `Idle --> Busy : event`, `state Busy { ... }`.

```plantuml
@startuml
start
:Receive request;
if (Authenticated?) then (yes)
  :Process request;
else (no)
  :Return 401;
endif
stop
@enduml
```

## Use case, component and ER-style diagrams
Use case: `actor User`, `usecase (Login)`, `User --> (Login)`, `rectangle System { ... }`.
Component/deployment: `component`, `node`, `database`, `cloud`, `[A] --> [B]`.
ER-style: `entity name { * id : int <<PK>>  --  email : text }` and crow's foot links
`A ||--o{ B` (`|o`, `||`, `}o`, `}|`).

```plantuml
@startuml
entity customer {
  * id : int <<PK>>
  --
  email : text
}
entity orders {
  * id : int <<PK>>
  --
  customer_id : int <<FK>>
}
customer ||--o{ orders : places
@enduml
```

## Common mistakes
Missing `@startuml`/`@enduml`; mixing old and new activity syntax; forgetting `;` after
`:Action`; unbalanced `if/endif`, `alt/end`; Mermaid reply arrows like `-->>`; spaces in
alias names without quotes.
