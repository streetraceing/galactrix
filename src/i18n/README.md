# Localization

Galactrix uses `i18next` with `react-i18next`. UI code references stable keys;
translated text lives only in `locales/<language>/<namespace>.json`.

Namespaces follow product features:

- `common` — shared navigation, actions, errors, dates, and counters;
- `chats`, `galaxies`, `telescope`, `profile`, `settings` — feature UI;
- `backend` — structured error keys returned by Tauri commands.

To add a language:

1. Copy `locales/en` to a new locale directory and translate every value.
2. Import the namespace files in `resources.ts`.
3. Add the locale to `supportedLocales` in `language.ts` and to the language
   selector.
4. Run `npm run i18n:check`, Prettier, and lint.

Use `useTranslation('<namespace>')` in React components and pass dynamic values
as interpolation variables. Use i18next v4 plural keys (`_one`, `_few`,
`_many`, `_other`) together with the required `count` option. Non-React
catalogs and formatting helpers use the typed `translate(namespace, key)`
helper.
