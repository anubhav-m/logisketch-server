# packetdiag

## Structure
Wrap in `packetdiag { ... }`. Each field is `start-end: Label;` using bit positions,
or `bit: Label;` for a single bit. Options: `colwidth = 32;` bits per row, `node_height = 72;`,
`default_fontsize = 12;`. List fields in order without gaps or overlaps.

## Field attributes
`0-15: Source Port [color = "#ddeeff"];`, `[rotate = 270]` for narrow one-bit labels.
Instead of a range, `* Checksum [len = 16];` continues from the last bit.

## Example: UDP header

```packetdiag
packetdiag {
  colwidth = 32;
  node_height = 48;
  0-15: Source Port;
  16-31: Destination Port;
  32-47: Length;
  48-63: Checksum;
  64-95: Data;
}
```

## Common mistakes
Overlapping ranges, gaps between fields, missing `;`, ranges larger than the header,
labels with special characters like `(` or `,` without quotes.
