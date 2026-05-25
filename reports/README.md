# Generated reports

## Lines of code

Regenerate anytime:

```bash
npm run loc
```

Outputs:

| File | Description |
|------|-------------|
| `loc-report.md` | Human-readable breakdown (areas, languages, largest files) |
| `loc-report.json` | Machine-readable full stats (CI, dashboards) |

### Variants

| Command | Output |
|---------|--------|
| `npm run loc` | Console summary + writes both files above |
| `npm run loc:json` | JSON only to stdout |
| `npm run loc:md` | Markdown only to stdout |
| `npm run loc:verbose` | Includes per-file listing in JSON |

These files are gitignored by default; commit them only if you want tracked snapshots.
