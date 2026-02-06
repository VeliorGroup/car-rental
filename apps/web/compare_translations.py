#!/usr/bin/env python3
import json
import os

def get_all_keys(obj, prefix=''):
    """Recursively get all keys from a nested dict"""
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys.update(get_all_keys(v, full_key))
    return keys

def compare_translations():
    messages_dir = '/Users/devisgjyzeli/WORKSPACE/PROJECTS/CAR RENTAL/frontend/messages'
    base_lang = 'el'  # Greek as reference
    other_langs = ['en', 'de', 'fr', 'es', 'it', 'pt', 'ro', 'sq', 'sr', 'mk']
    
    translation_files = [
        'analytics.json', 'auth.json', 'bookings.json', 'branches.json',
        'calendar.json', 'cautions.json', 'common.json', 'customers.json',
        'damages.json', 'dashboard.json', 'landing.json', 'maintenance.json',
        'notifications.json', 'settings.json', 'vehicles.json'
    ]
    
    missing_in_other = {}  # Keys in el but missing in other languages
    missing_in_el = {}  # Keys in other languages but missing in el
    
    for filename in translation_files:
        base_path = os.path.join(messages_dir, base_lang, filename)
        
        try:
            with open(base_path, 'r', encoding='utf-8') as f:
                base_data = json.load(f)
            base_keys = get_all_keys(base_data)
        except Exception as e:
            print(f"Error reading {base_path}: {e}")
            continue
        
        for lang in other_langs:
            lang_path = os.path.join(messages_dir, lang, filename)
            try:
                with open(lang_path, 'r', encoding='utf-8') as f:
                    lang_data = json.load(f)
                lang_keys = get_all_keys(lang_data)
                
                # Keys in el but not in this language
                missing = base_keys - lang_keys
                if missing:
                    if lang not in missing_in_other:
                        missing_in_other[lang] = {}
                    missing_in_other[lang][filename] = sorted(missing)
                
                # Keys in this language but not in el
                extra = lang_keys - base_keys
                if extra:
                    if lang not in missing_in_el:
                        missing_in_el[lang] = {}
                    missing_in_el[lang][filename] = sorted(extra)
                    
            except Exception as e:
                print(f"Error reading {lang_path}: {e}")
    
    print("\n=== KEYS IN GREEK (el) BUT MISSING IN OTHER LANGUAGES ===\n")
    for lang, files in sorted(missing_in_other.items()):
        print(f"\n--- {lang.upper()} ---")
        for filename, keys in files.items():
            if keys:
                print(f"  {filename}: {len(keys)} missing keys")
                for key in keys[:5]:  # Show first 5
                    print(f"    - {key}")
                if len(keys) > 5:
                    print(f"    ... and {len(keys) - 5} more")
    
    print("\n\n=== KEYS IN OTHER LANGUAGES BUT MISSING IN GREEK (el) ===\n")
    for lang, files in sorted(missing_in_el.items()):
        print(f"\n--- {lang.upper()} ---")
        for filename, keys in files.items():
            if keys:
                print(f"  {filename}: {len(keys)} extra keys")
                for key in keys[:5]:
                    print(f"    - {key}")
                if len(keys) > 5:
                    print(f"    ... and {len(keys) - 5} more")

if __name__ == '__main__':
    compare_translations()
