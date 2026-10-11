# `_normalizeAutoClosingPairs`

Defined at [extensionSettings.js:22](src/extensionSettings.js#L22).

## What it is for

It takes the value a user wrote for `"<lang>.autoClosingPairs"` in settings,
which is in the language-configuration.json format, and returns it in the
format `vscode.languages.setLanguageConfiguration()` requires. The two formats
differ in two ways:

| | Settings / JSON format | API format |
| --- | --- | --- |
| A pair | `["(", ")"]` or `{ "open": "(", "close": ")" }` | only `{ open, close }` |
| `notIn` | strings: `"string"`, `"comment"` | numbers: `SyntaxTokenType.String` (2), `.Comment` (1), `.RegEx` (3) |

It is called from two places, so every list of pairs goes through it before
the configuration is registered:

- [extensionSettings.js:306](src/extensionSettings.js#L306) - for the starting
  list, which is the `"<lang>.autoClosingPairs"` value if there is one, else
  the language's default pairs (used when only `.add` or `.remove` is set).
- [extensionSettings.js:129](src/extensionSettings.js#L129) - in
  `_addAutoClosingPairs`, for the `"<lang>.autoClosingPairs.add"` value.

## Step by step

1. **Guard against a non-array.** If the setting's value is not an array, it
   returns `[]`.
2. **Build a lookup table** from the lower-cased token name to the enum value:
   `string`, `comment`, `regex`.
3. **Loop over each pair** and handle it by shape:
   - **Tuple** (`Array.isArray(pair)`): if both elements are strings, push
     `{ open: pair[0], close: pair[1] }`. Otherwise skip it. A tuple can't
     carry `notIn`.
   - **Anything without string `open` and `close`**: skip it. The `pair?.open`
     optional chaining means `null` entries are skipped, not thrown on.
   - **Object**: build a new `{ open, close }`. If `notIn` is an array, convert
     each entry through the lookup table and keep only the ones it recognises.
4. **Return the new array.** The input is never modified.

## Examples

**Tuple and object forms mixed** (the shape reported in
[vscode issue #189517](https://github.com/microsoft/vscode/issues/189517)):

```js
_normalizeAutoClosingPairs([
  ["{", "}"],
  { "open": "(", "close": ")" }
])
// => [ { open: "{", close: "}" },
//      { open: "(", close: ")" } ]
```

**`notIn` strings become enum numbers** (the fix for `notIn` being ignored in
a `setLanguageConfiguration()` call):

```js
_normalizeAutoClosingPairs([
  { "open": "'", "close": "'", "notIn": ["string", "comment"] }
])
// => [ { open: "'", close: "'", notIn: [2, 1] } ]
//    i.e. [SyntaxTokenType.String, SyntaxTokenType.Comment]
```

**Case does not matter, and unknown token names are dropped:**

```js
_normalizeAutoClosingPairs([
  { "open": "<", "close": ">", "notIn": ["String", "REGEX", "banana"] }
])
// => [ { open: "<", close: ">", notIn: [2, 3] } ]
```

**Malformed entries are skipped, the rest survive:**

```js
_normalizeAutoClosingPairs([
  ["(" ],                       // only one element
  { "open": "[" },              // no close
  null,
  42,
  { "open": "{", "close": "}" }
])
// => [ { open: "{", close: "}" } ]
```

**Not an array at all:**

```js
_normalizeAutoClosingPairs("oops")    // => []
_normalizeAutoClosingPairs(undefined) // => []
```

## Behaviours worth knowing

- **An empty result removes all auto-closing for that language.** Because the
  result replaces the language's whole `autoClosingPairs` list, a setting like
  `"javascript.autoClosingPairs": "oops"` or `[]` registers an empty list, so
  nothing auto-closes in JavaScript while that entry is present. That is useful
  deliberately (removing backtick completion in markdown relies on leaving
  pairs out), but a typo has the same effect silently.
- **A `notIn` with only unrecognised names becomes `notIn: []`**, which means
  "close everywhere", the same as having no `notIn`.
- **Extra properties are discarded.** Only `open`, `close` and `notIn` are
  copied, so anything else on the object is dropped.
- **`"other"` is not mapped.** `SyntaxTokenType.Other` (0) exists in the API,
  but language-configuration files only use `string`, `comment` and `regex`,
  so it is left out.

---

---

## How the `notIn` mapping was verified

The mapping in question:

| JSON / settings string | API value |
| --- | --- |
| `"string"` | `SyntaxTokenType.String` (2) |
| `"comment"` | `SyntaxTokenType.Comment` (1) |
| `"regex"` | `SyntaxTokenType.RegEx` (3) |

### Verified first, before reading the vscode source

- **The API side (numbers).** Read directly from the installed typings,
  `node_modules/@types/vscode/index.d.ts`:
  `enum SyntaxTokenType { Other = 0, Comment = 1, String = 2, RegEx = 3 }` and
  `AutoClosingPair.notIn?: SyntaxTokenType[]`.
- **The JSON side for `"string"` and `"comment"`.** These appear in the
  built-in JavaScript language configuration file.
- **`"string"` to `String` (2) at runtime.** In an Extension Development Host
  test, a `<` / `>` pair with `notIn: ["string"]` closed inside a string when
  the raw value was passed, and stopped closing when the converted value was
  passed.

### Inferred at first, then confirmed from the vscode source

- That `"comment"` maps to `Comment` and `"regex"` maps to `RegEx` (assumed
  from the names).
- That `"regex"` is a valid JSON-side value at all.

### What the vscode source shows

- **The extension host converts each number back to a string.** In
  [extHostLanguageFeatures.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostLanguageFeatures.ts),
  `_serializeAutoClosingPair` does:

  ```ts
  notIn: autoClosingPair.notIn ? autoClosingPair.notIn.map(v => SyntaxTokenType.toString(v)) : undefined,
  ```

- **`SyntaxTokenType.toString` gives the exact mapping.** In
  [extHostTypes.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostTypes.ts):

  ```ts
  export function toString(v: SyntaxTokenType | unknown): 'other' | 'comment' | 'string' | 'regex' {
    switch (v) {
      case SyntaxTokenType.Other: return 'other';
      case SyntaxTokenType.Comment: return 'comment';
      case SyntaxTokenType.String: return 'string';
      case SyntaxTokenType.RegEx: return 'regex';
    }
    return 'other';
  }
  ```

- **The editor then acts on only three strings.** In
  [languageConfiguration.ts](https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/languages/languageConfiguration.ts)
  (`StandardAutoClosingPairConditional`):

  ```ts
  switch (notIn) {
    case 'string':
      this._inString = false;
      break;
    case 'comment':
      this._inComment = false;
      break;
    case 'regex':
      this._inRegEx = false;
      break;
  }
  ```

So the conversion in `_normalizeAutoClosingPairs` is the exact inverse of what
vscode does, for all three values.

### Why the original bug happened

Passing the raw string `"string"` to the API hits no case in `toString`, falls
through to `'other'`, and `'other'` is ignored by the editor's `switch`. The
`notIn` silently disappears, so the pair auto-closes everywhere. This also
confirms that leaving `"other"` unmapped is harmless.

### Caveats

- **`"regex"` is accepted by the editor but not by the JSON schema.** The
  schema for language-configuration.json, in
  [languageConfigurationExtensionPoint.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/codeEditor/common/languageConfigurationExtensionPoint.ts),
  lists only `['string', 'comment']` for `notIn`, so `"regex"` is accepted but
  is undocumented there.
- **`"regex"` has no effect in JavaScript.** The inside of a JavaScript regex
  literal like `/abc/` is classified as a string token, not a regex token.
  Tested in an Extension Development Host (vscode 1.133) by typing `<` inside
  a regex literal with a `<` / `>` pair:

  | `notIn` | Result inside `/q0x tail/` | Meaning |
  | --- | --- | --- |
  | `["regex"]` | `/q0x<> tail/` | still closes: `"regex"` had no effect |
  | `["string"]` | `/q1x< tail/` | not closed: the literal counts as a string |
  | none | `/q2x<> tail/` | closes (control) |

  To keep a pair from closing inside a JavaScript regex literal, use
  `"notIn": ["string"]`, which also covers ordinary strings.
- **`"regex"` should only matter for a grammar that marks tokens as regex.**
  A grammar contribution can do that with a `tokenTypes` entry in its
  `package.json`, for example `"string.regexp.mylang": "regex"`. The built-in
  JavaScript and TypeScript grammars do not. This is from reading the vscode
  source; no real language that does this was found or tested.
- **Only `"string"` has been shown to suppress closing at runtime.**
  `"comment"` and `"regex"` are confirmed by reading the source on the `main`
  branch (2026-10-10); `"comment"` has not been run, `"regex"` was run only in
  JavaScript (see above), and the source was not checked as of vscode 1.83.
