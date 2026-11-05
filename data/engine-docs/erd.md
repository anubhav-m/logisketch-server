# ERD (erd tool)

## Structure
Entities are written as `[name]` on their own line, followed by one attribute per line.
Attribute prefixes: `*` primary key, `+` foreign key, `*+` both. Plain line = normal attribute.
Leave a blank line between entities. Relationships come after the entities.

## Relationships and cardinality
Format: `entity1 C1--C2 entity2`, where each cardinality is `?` (0 or 1), `1` (exactly 1),
`*` (0 or more), `+` (1 or more). Examples: `customer 1--* order`, `order *--1 customer`,
`student *--* course`. Entity names in relationships must match the `[name]` exactly
(case sensitive). Write no label after a relationship.

## Optional styling
A title line `title {label: "Shop schema"}` can come first. Entity options:
`[customer] {bgcolor: "#d0e0d0"}`. Keep names simple (letters, digits, underscore).

## Example: shop schema

```erd
[customer]
*customer_id
name
email

[order]
*order_id
+customer_id
order_date

[product]
*product_id
title
price

[order_item]
*+order_id
*+product_id
quantity

customer 1--* order
order 1--+ order_item
product 1--* order_item
```

## Common mistakes
Using Mermaid syntax (`||--o{`), adding labels after relationships, mismatched case between
entity and relationship names, writing `PK`/`FK` words instead of `*`/`+`, adding types like
`int id` (write just the column name), missing blank line between entities.
