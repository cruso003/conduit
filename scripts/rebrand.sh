#!/bin/bash
# Rebrand TurboX → Conduit (or other name)

set -e

OLD_NAME_UPPER="TurboX"
OLD_NAME_LOWER="turbox"
NEW_NAME_UPPER="${1:-Conduit}"
NEW_NAME_LOWER=$(echo "$NEW_NAME_UPPER" | tr '[:upper:]' '[:lower:]')

if [ -z "$1" ]; then
    echo "Usage: $0 <NewName>"
    echo "Example: $0 Conduit"
    exit 1
fi

echo "🔄 Rebranding ${OLD_NAME_UPPER} → ${NEW_NAME_UPPER}..."
echo ""

# Backup
BACKUP_DIR="../turbox_backup_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup at ${BACKUP_DIR}..."
cp -r . "$BACKUP_DIR"

# Update file contents
echo "📝 Updating file contents..."

# Python/Codon files
find . -type f \( -name "*.codon" -o -name "*.py" \) \
    -not -path "*/\.*" \
    -exec sed -i '' "s/${OLD_NAME_LOWER}/${NEW_NAME_LOWER}/g" {} \;

# Documentation
find . -type f \( -name "*.md" -o -name "*.txt" -o -name "*.rst" \) \
    -not -path "*/\.*" \
    -exec sed -i '' "s/${OLD_NAME_UPPER}/${NEW_NAME_UPPER}/g" {} \;

find . -type f \( -name "*.md" -o -name "*.txt" -o -name "*.rst" \) \
    -not -path "*/\.*" \
    -exec sed -i '' "s/${OLD_NAME_LOWER}/${NEW_NAME_LOWER}/g" {} \;

# Rename directories
echo "📁 Renaming directories..."
if [ -d "${OLD_NAME_LOWER}" ]; then
    mv "${OLD_NAME_LOWER}" "${NEW_NAME_LOWER}"
fi

# Rename Python package
if [ -d "src/${OLD_NAME_LOWER}" ]; then
    mv "src/${OLD_NAME_LOWER}" "src/${NEW_NAME_LOWER}"
fi

# Update import statements more carefully
echo "🔍 Updating import statements..."
find . -type f \( -name "*.codon" -o -name "*.py" \) \
    -not -path "*/\.*" \
    -exec sed -i '' "s/from ${OLD_NAME_LOWER}/from ${NEW_NAME_LOWER}/g" {} \;

find . -type f \( -name "*.codon" -o -name "*.py" \) \
    -not -path "*/\.*" \
    -exec sed -i '' "s/import ${OLD_NAME_LOWER}/import ${NEW_NAME_LOWER}/g" {} \;

# Update GitHub URLs
echo "🔗 Updating GitHub URLs..."
find . -type f -name "*.md" \
    -not -path "*/\.*" \
    -exec sed -i '' "s/sir-george2500\/turboX/cruso003\/${NEW_NAME_LOWER}/g" {} \;

# Update package metadata
if [ -f "setup.py" ]; then
    sed -i '' "s/name=['\"]${OLD_NAME_LOWER}['\"]/name='${NEW_NAME_LOWER}'/g" setup.py
fi

if [ -f "pyproject.toml" ]; then
    sed -i '' "s/name = ['\"]${OLD_NAME_LOWER}['\"]/name = '${NEW_NAME_LOWER}'/g" pyproject.toml
fi

echo ""
echo "✅ Rebranding complete!"
echo ""
echo "📝 Manual steps remaining:"
echo "  1. Review changes: git diff"
echo "  2. Update logo/assets if needed"
echo "  3. Create new GitHub repo: github.com/cruso003/${NEW_NAME_LOWER}"
echo "  4. Update git remote: git remote set-url origin https://github.com/cruso003/${NEW_NAME_LOWER}.git"
echo "  5. Commit and push"
echo ""
echo "💾 Backup saved at: ${BACKUP_DIR}"
