# log-alert

Node.js-Tool, das Log-Dateien verfolgt, jede neue Zeile gegen konfigurierte Regex-Regeln prüft und bei einem Treffer eine E-Mail verschickt.

## Installation

```bash
npm install
npm run build:jar   # optional: baut lib/logpipe-parser.jar (JDK nötig)
```

## Konfiguration

Kopiere `config.example.json` zu `config.json` und passe sie an:

```json
{
  "logs": [
    { "path": "/var/log/app.log", "label": "app" }
  ],
  "rules": [
    { "name": "errors", "pattern": "error", "flags": "i", "enabled": true }
  ],
  "mail": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": { "user": "user@example.com", "pass": "secret" },
    "from": "log-alert@example.com",
    "to": "admin@example.com",
    "subject": "[log-alert] ${rule} in ${file}"
  },
  "throttleMs": 5000
}
```

### Felder

- `logs` – Liste der zu überwachenden Dateien. `path` ist relativ zum Verzeichnis der Konfigurationsdatei oder absolut. `label` optional, für die Betreff/E-Mails.
- `rules` – Liste der Regex-Regeln. `pattern` ist ein Regex-String, `flags` optional (z. B. `"i"`). `enabled: false` deaktiviert eine Regel.
- `mail` – SMTP-Konfiguration für [nodemailer](https://nodemailer.com/). Wenn weggelassen, läuft das Tool im Dry-Run-Modus und gibt Treffer nur auf der Konsole aus.
- `throttleMs` – Mindestabstand in Millisekunden zwischen zwei E-Mails pro `datei::regel` (0 deaktiviert das Throttling).
- `parserJar` – Optionaler Pfad zu einer `.jar` (z. B. `./lib/logpipe-parser.jar`). Jede Log-Zeile wird vor dem Regex-Check durch das Jar gepiped (stdin → stdout, zeilenweise). Pro Log-Eintrag überschreibbar (`logs[].parserJar`).

### Mitgelieferte Parser-Jar (`lib/logpipe-parser.jar`)

Eine kleine Java-Anwendung, die Log-Zeilen von stdin liest, Zeitstempel normalisiert (z. B. `2024/01/02 03:04:05` → `2024-01-02T03:04:05`) und nach stdout schreibt. So können Regeln einheitlich gegen ISO-Zeitstempel formuliert werden. Quelldatei: `java-src/com/mwildt/logalert/LogPipeParser.java`. Neu bauen mit `npm run build:jar` (JDK erforderlich).

### Variablen im Betreff

Im Feld `mail.subject` sind Platzhalter möglich: `${file}`, `${rule}`, `${line}`, `${match}`, `${time}`.

## Start

```bash
npm start
# oder mit eigener Konfigurationsdatei:
npm start -- /pfad/zur/config.json
```

Beim Start springt der Tailer an das Ende der Datei und überwacht nur neu angehängte Zeilen.

## Tests

```bash
npm test
```

## Hinweise

- Ohne `mail`-Block werden Treffer nur geloggt (Dry-Run), praktisch zum Testen der Regeln.
- Wird eine Log-Datei gekürzt/rotiert (kleinere Datei), setzt der Tailer die Position zurück.
- Authentifizierungsdaten gehören nicht ins Repository; `config.json` steht in der `.gitignore`.
