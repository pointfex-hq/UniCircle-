"""Compare the frozen endpoint inventory across the two contract documents."""

from collections import Counter
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ROUTE = re.compile(r"^\| \d{2} \| \x60(GET|POST|PATCH|DELETE) (/\S+)\x60 \|", re.M)
PATH = re.compile(r"^  (/\S+):$")
METHOD = re.compile(r"^    (get|post|patch|delete):$")

contract = (ROOT / "API_CONTRACT.md").read_text(encoding="utf-8")
described = Counter(
    (method, re.sub(r":(\w+)", r"{\1}", path))
    for method, path in ROUTE.findall(contract)
)
schema = (ROOT / "openapi.yaml").read_text(encoding="utf-8")
paths_section = schema.split("\npaths:\n", 1)[1].split("\ncomponents:", 1)[0]
declared = Counter()
path = None
for line in paths_section.splitlines():
    if match := PATH.fullmatch(line):
        path = match[1]
    elif match := METHOD.fullmatch(line):
        if path is None:
            raise SystemExit("HTTP method is missing its path.")
        declared[(match[1].upper(), path)] += 1

if declared != described:
    raise SystemExit(
        f"OpenAPI-only operations: {sorted((declared - described).elements())}\n"
        f"API contract-only operations: {sorted((described - declared).elements())}"
    )

count = sum(declared.values())
path_count = len({path for _, path in declared})
if count != 36 or path_count != 32 or any(value != 1 for value in declared.values()):
    raise SystemExit(f"Expected 36 unique operations on 32 paths, received {count} on {path_count}.")

print(f"Matched {count} HTTP operations on {path_count} unique paths.")
