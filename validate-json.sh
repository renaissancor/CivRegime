#!/bin/bash
errors=0
tested=0
for file in $(find data -name '*.json' -type f | shuf | head -50); do
  if ! jq empty "$file" 2>/dev/null; then
    echo "✗ Invalid JSON: $file"
    errors=$((errors+1))
  fi
  tested=$((tested+1))
done
echo ""
echo "Tested: $tested files"
echo "Errors: $errors files"
exit $errors
