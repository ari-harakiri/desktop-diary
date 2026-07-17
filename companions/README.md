# DesktopDiary companions

This folder keeps animated characters separate from the main single-file app.

- `companions.js` is the shared sprite registry and coordination point.
- `koba.css` owns Koba's approved animation mappings.
- `pigeon.css` owns pigeon artwork mappings.
- `sprites/koba/` and `sprites/pigeon/` keep each character's source sheets separate.

The mailbox collision watcher lives in `pigeon.js`. Each fresh entry by the
visible ball or Koba's body target raises the pigeon's session-only temper:

1. One anchored composite shows him peeking from a temporarily cracked,
   rattling mailbox. The normal mailbox art is restored afterward.
2. He pops out visibly annoyed.
3. He becomes furious, then chases Koba around the desktop.

The chase temporarily borrows Koba's approved run sprite and claims exclusive
ownership of Koba's motion timers. Sleep, roam, and interaction callbacks cannot
change his pose while he is moving. Koba then returns to his exact starting
position and prior valid idle state. The counter resets after the chase.
Mail-delivery state, saved icon positions, and the mailbox's clickable area are
unchanged. The shared `pigeon-chase-requested` event fires when the chase begins.
