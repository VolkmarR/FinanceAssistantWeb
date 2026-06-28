// Tiny className combiner. Components keep their own base Tailwind string and
// merge in a caller-supplied `className` (which may be undefined/false), so we
// drop falsy entries and join the rest with a space. This is the minimal subset
// of `clsx`/`classnames` this app needs — no need for the dependency.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
