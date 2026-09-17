export function matchRules(rules, line) {
  const hits = [];
  for (const rule of rules) {
    const m = rule.regex.exec(line);
    if (m) hits.push({ rule, match: m[0], line });
  }
  return hits;
}
