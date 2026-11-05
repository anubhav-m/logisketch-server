# Symbolator

## Structure
Symbolator draws a component symbol from a VHDL entity (or Verilog module) declaration.
Only the interface matters: write the `entity ... is port (...); end entity;` part.
Put `library ieee; use ieee.std_logic_1164.all;` before the entity.

## Ports and sections
`port ( name : direction type; ... );` with directions `in`, `out`, `inout`. The last port has
no trailing `;`. Vectors: `std_logic_vector(7 downto 0)`. Generics go before ports:
`generic ( WIDTH : integer := 8 );`. Comments starting with `--#` create section labels in the
symbol, e.g. `--# {{clocks|}}` or `--# {{data|Data ports}}`.

## Example: counter

```vhdl
library ieee;
use ieee.std_logic_1164.all;

entity counter is
  generic (
    WIDTH : integer := 8
  );
  port (
    --# {{clocks|}}
    clk : in std_logic;
    rst : in std_logic;
    --# {{control|Control}}
    enable : in std_logic;
    --# {{data|Output}}
    count : out std_logic_vector(WIDTH-1 downto 0)
  );
end entity;
```

## Common mistakes
Writing an architecture body (not needed), a trailing `;` after the last port, missing
`end entity;`, missing library lines, mixing Verilog and VHDL in one file.
