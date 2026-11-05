# Structurizr DSL

## Structure
`workspace { model { ... } views { ... } }`. The model defines people, software systems,
containers and relationships; views say what to draw. Kroki renders the first view.
Identifiers are assigned with `=`: `user = person "User"`. Strings use double quotes.

## Model elements
`name = person "Name" "Description"`,
`name = softwareSystem "Name" "Description" { ... }`,
inside a system: `web = container "Web App" "Description" "Technology"`,
inside a container: `ctrl = component "Controller" "Description" "Technology"`.
Tags are the next string: `db = container "Database" "Stores data" "PostgreSQL" "Database"`.

## Relationships
`source -> destination "Description" "Technology"`. Both ends must be identifiers defined
earlier (nested identifiers are in scope). Put relationships inside `model`, after the elements.

## Views and styles
`systemContext <system> { include * autoLayout }`, `container <system> { include * autoLayout lr }`,
`component <container> { include * autoLayout }`.
Styles: `styles { element "Database" { shape Cylinder } element "Person" { shape Person } }`.
Do not use `theme` URLs (they need network access); keep styles inline.

## Example: container view

```structurizr
workspace {
  model {
    customer = person "Customer" "Places orders"
    shop = softwareSystem "Online Shop" "Sells products" {
      web = container "Web App" "Storefront" "React"
      api = container "API" "Business logic" "Node.js"
      db = container "Database" "Orders and products" "PostgreSQL" "Database"
    }
    payments = softwareSystem "Payment Provider" "Processes cards"
    customer -> web "Uses" "HTTPS"
    web -> api "Calls" "JSON/HTTPS"
    api -> db "Reads and writes" "SQL"
    api -> payments "Charges cards" "HTTPS"
  }
  views {
    container shop {
      include *
      autoLayout lr
    }
    styles {
      element "Database" {
        shape Cylinder
      }
      element "Person" {
        shape Person
      }
    }
  }
}
```

## Common mistakes
Missing `views` (nothing to render), relationships to undefined identifiers, identifiers with
dashes or spaces, single quotes, `container` outside a `softwareSystem` block,
`theme default` (needs network), `!include` of remote files.
