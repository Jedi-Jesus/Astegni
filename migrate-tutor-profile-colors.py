#!/usr/bin/env python3
"""
Tutor Profile CSS Color Migration Script
Replaces hardcoded color values with CSS variables from theme.css
"""

import re
import sys
from pathlib import Path

# Color mapping table (hex -> CSS variable)
COLOR_MAP = {
    # Gray scale (theme-aware - changes with dark mode)
    '#e5e7eb': 'var(--border-color)',
    '#E5E7EB': 'var(--border-color)',

    '#f9fafb': 'var(--input-bg)',
    '#F9FAFB': 'var(--input-bg)',

    '#f3f4f6': 'var(--hover-bg)',
    '#F3F4F6': 'var(--hover-bg)',

    '#f8f9fa': 'var(--activity-bg)',
    '#F8F9FA': 'var(--activity-bg)',

    '#374151': 'var(--text-primary)',
    '#374151': 'var(--text-primary)',

    '#1f2937': 'var(--text-primary)',
    '#1F2937': 'var(--text-primary)',

    '#6b7280': 'var(--text-secondary)',
    '#6B7280': 'var(--text-secondary)',

    '#9ca3af': 'var(--text-muted)',
    '#9CA3AF': 'var(--text-muted)',

    '#4b5563': 'var(--text-primary)',
    '#4B5563': 'var(--text-primary)',

    # White/Backgrounds (context-dependent, using most common)
    '#ffffff': 'var(--card-bg)',
    '#FFFFFF': 'var(--card-bg)',
    '#fff': 'var(--card-bg)',
    '#FFF': 'var(--card-bg)',

    # Accent colors (theme-aware)
    '#667eea': 'var(--accent)',
    '#667EEA': 'var(--accent)',

    '#3b82f6': 'var(--primary-color)',
    '#3B82F6': 'var(--primary-color)',

    '#2563eb': 'var(--primary-hover)',
    '#2563EB': 'var(--primary-hover)',

    '#f0f4ff': 'var(--highlight)',
    '#F0F4FF': 'var(--highlight)',

    # SEMANTIC COLORS - DO NOT REPLACE (these should stay hardcoded)
    # Success colors
    # '#10b981': KEEP
    # '#059669': KEEP
    # '#10B981': KEEP
    # '#059669': KEEP

    # Error colors
    # '#ef4444': KEEP
    # '#dc2626': KEEP
    # '#fee2e2': KEEP (error background)

    # Warning colors
    # '#f59e0b': KEEP
    # '#d97706': KEEP
    # '#fbbf24': KEEP
    # '#92400e': KEEP

    # Special gradient colors (decorative)
    # '#f093fb': KEEP
    # '#f5576c': KEEP
}

def backup_file(file_path):
    """Create a backup of the original file"""
    backup_path = file_path.with_suffix('.css.backup')
    backup_path.write_text(file_path.read_text(encoding='utf-8'), encoding='utf-8')
    print(f"[SUCCESS] Backup created: {backup_path}")
    return backup_path

def migrate_colors(content):
    """Replace hardcoded colors with CSS variables"""
    stats = {
        'total_replacements': 0,
        'by_color': {},
        'lines_affected': set()
    }

    lines = content.split('\n')
    new_lines = []

    for line_num, line in enumerate(lines, 1):
        original_line = line
        modified = False

        # Skip lines that already use CSS variables or are comments
        if 'var(--' in line or line.strip().startswith('/*') or line.strip().startswith('*'):
            new_lines.append(line)
            continue

        # Replace each color in the mapping
        for hex_color, css_var in COLOR_MAP.items():
            # Create pattern that matches the hex color but not in comments
            pattern = re.escape(hex_color) + r'(?![a-fA-F0-9])'  # Ensure full hex match

            if re.search(pattern, line, re.IGNORECASE):
                # Only replace if not in a comment
                if not re.search(r'/\*.*' + pattern + r'.*\*/', line, re.IGNORECASE):
                    line = re.sub(pattern, css_var, line, flags=re.IGNORECASE)
                    modified = True

                    # Track statistics
                    stats['by_color'][hex_color] = stats['by_color'].get(hex_color, 0) + 1
                    stats['total_replacements'] += 1

        if modified:
            stats['lines_affected'].add(line_num)

        new_lines.append(line)

    return '\n'.join(new_lines), stats

def print_stats(stats):
    """Print migration statistics"""
    print("\n" + "="*60)
    print("MIGRATION STATISTICS")
    print("="*60)
    print(f"Total replacements: {stats['total_replacements']}")
    print(f"Lines affected: {len(stats['lines_affected'])}")
    print("\nReplacements by color:")
    for color, count in sorted(stats['by_color'].items(), key=lambda x: x[1], reverse=True):
        css_var = COLOR_MAP.get(color, 'unknown')
        print(f"  {color} -> {css_var}: {count}x")
    print("="*60 + "\n")

def main():
    # File paths
    css_file = Path(r"c:\Users\zenna\Downloads\Astegni\css\tutor-profile\tutor-profile.css")

    if not css_file.exists():
        print(f"[ERROR] File not found: {css_file}")
        sys.exit(1)

    print(f"[INFO] Processing: {css_file}")

    # Create backup
    backup_path = backup_file(css_file)

    # Read original content
    original_content = css_file.read_text(encoding='utf-8')

    # Migrate colors
    print("[INFO] Migrating colors...")
    migrated_content, stats = migrate_colors(original_content)

    # Write migrated content
    css_file.write_text(migrated_content, encoding='utf-8')
    print(f"[SUCCESS] Migration complete: {css_file}")

    # Print statistics
    print_stats(stats)

    print("[INFO] Next steps:")
    print("  1. Review the changes in git diff")
    print("  2. Test the appearance modal in tutor-profile.html")
    print("  3. Compare with advertiser-profile.html")
    print(f"  4. If issues occur, restore from: {backup_path}")
    print("\n[DONE] Migration complete!")

if __name__ == "__main__":
    main()
