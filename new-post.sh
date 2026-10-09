#!/usr/bin/env bash
# Usage: ./new-post.sh "My post title"
set -euo pipefail
title="${1:?Give the post a title, e.g. ./new-post.sh \"Why my PMF has two minima\"}"
slug=$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
file="content/notebook/$(date +%Y-%m-%d)-${slug}.md"
hugo new content "$file" >/dev/null
sed -i.bak "s/^title: .*/title: \"${title//\"/\\\"}\"/" "$file" && rm -f "$file.bak"
echo "Created $file"
${EDITOR:-code} "$file" 2>/dev/null || true
