# R11 Hosted Checkout Fix

## Failure
The first hosted Workers Builds run used a shallow checkout and did not contain historical commit object:
`de0504f191ab2ba5e0bdbdebd312f162f25f035e`.

The candidate contract used:
`git diff de0504f... -- app lib db worker/index.ts middleware.ts`

This made the build fail even though the current protected source still matched the authoritative Production baseline.

## Fix
Replace the historical-commit diff dependency with pinned Git object identities for the protected Production paths:

- app tree: 041b5362e85cddd452ef60cf681a233eac5203e7
- lib tree: 06b6e16e02cad824334b3b6ab6ce930f65020210
- db tree: a3be0334fddebdc8eb38fee875240dc34909a72a
- middleware.ts blob: 4ef4b6f9d9296bd1fd0ec5019cdaee9738cd2763
- worker/index.ts blob: c3a8a884001d6af211257bee7ff64f7208641a28

These identities were verified against both:
- authoritative Production source de0504f...
- current migration source 3c00b214...

The check now uses only objects reachable from the current HEAD, so it is compatible with shallow/detached hosted checkouts.

It also checks staged/working-tree drift for the same protected paths.

## Safety
This does not relax the protected-source contract.
It changes only how identity is proven in a shallow checkout.

Production/DNS/D1/main runtime changes: 0.
