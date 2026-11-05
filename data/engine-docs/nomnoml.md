# nomnoml

## Structure
Everything is a box in square brackets: `[Customer]`. Compartments are split by `|`:
`[Customer|name: string; email: string|login(); logout()]` (name | fields | methods);
items in one compartment are separated by `;`. Directives start with `#`:
`#direction: right`, `#spacing: 40`, `#fill: #eee8d5`.

## Relations
`[A]-[B]` association, `[A]->[B]` directed association, `[A]-->[B]` dependency,
`[Child]-:>[Parent]` generalization (inheritance, arrow points to the parent),
`[Class]--:>[Interface]` implementation, `[Whole]+->[Part]` composition,
`[Whole]o->[Part]` aggregation. Labels and multiplicity at the ends:
`[Customer] 1 - * [Order]` or `[A] owns -> [B]`.

## Classifiers and state diagrams
Prefix with a tag: `[<abstract> Shape]`, `[<interface> Payable]`, `[<actor> User]`,
`[<database> DB]`, `[<package> Billing|[Invoice]]` (nested), `[<state> Idle]`,
`[<choice> ok?]`, `[<start> s]`, `[<end> e]`, `[<note> text]`.

## Example: class diagram

```nomnoml
#direction: down
[<abstract> Vehicle|wheels: int|move()]
[Car|seats: int|honk()]
[Truck|load: float|unload()]
[Engine|power: int]
[Driver|name: string]
[Car]-:>[Vehicle]
[Truck]-:>[Vehicle]
[Vehicle]+->[Engine]
[Driver] 1 - 0..* [Vehicle]
```

## Common mistakes
Missing brackets around names, `:` between compartments instead of `|`, `,` instead of `;`
inside a compartment, PlantUML arrows like `<|--`, `{}` class bodies. Relations must use
names written exactly like the box names (a typo creates a new box).
