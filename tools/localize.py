#!/usr/bin/env python3
"""Generate static landing-page translations. Default: offline render from the committed cache.

Use --translate to send changed public prose to Google Translate; code and API literals are
excluded. Interrupted runs save their progress. No translation service runs in the browser.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
import json
import re
from pathlib import Path
import subprocess
import tempfile
import threading
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tools/localization-cache.json'
LOCK = threading.Lock()

def key(text):
    return sha256(text.encode()).hexdigest()

def save(cache):
    temporary = CACHE.with_suffix('.tmp')
    temporary.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(CACHE)

def translate_around_names(language, text, pattern):
    """Recover the few strings where a low-resource model drops opaque tokens."""
    parts, position = [], 0
    for match in pattern.finditer(text):
        parts.extend([(text[position:match.start()], False), (match.group(), True)])
        position = match.end()
    parts.append((text[position:], False))
    indexes = [index for index, (part, protected) in enumerate(parts)
               if not protected and re.search(r'[a-z]{2}', part, re.I)]
    if indexes:
        values = translate(language, [parts[index][0].strip() for index in indexes])
        for index, value in zip(indexes, values):
            part = parts[index][0]
            parts[index] = (part.replace(part.strip(), value), False)
    return ''.join(part for part, _ in parts)

def translate(language, texts, protected_names=()):
    # Opaque tokens keep brands, game names and legal company names intact in prose.
    tokens = {name: f'ZXQ{index:04d}QXZ' for index, name in enumerate(protected_names)}
    pattern = re.compile('|'.join(re.escape(name) for name in sorted(tokens, key=len, reverse=True))) if tokens else None
    masked = [pattern.sub(lambda match: tokens[match.group()], text) for text in texts] if pattern else texts
    url = 'https://translate.googleapis.com/translate_a/t?' + urlencode({'client': 'gtx', 'sl': 'en', 'tl': language})
    body = urlencode([('q', text) for text in masked]).encode()
    for attempt in range(6):
        try:
            request = Request(url, data=body, headers={'User-Agent': 'StarHermit-Wiki-Localization/1.0'})
            with urlopen(request, timeout=45) as response:
                values = json.load(response)
            if not isinstance(values, list) or len(values) != len(texts) or any(
                not isinstance(v, str) or (not v.strip() and text.lower() not in {'the', 'a', 'an'})
                for text, v in zip(texts, values)
            ):
                raise ValueError(f'Unexpected translation response for {language}')
            restored = []
            for text, original, value in zip(texts, masked, values):
                # Some models remove leading zeroes from otherwise intact identifiers.
                value = re.sub(r'ZXQ\s*(\d+)\s*QXZ', lambda match: f'ZXQ{int(match[1]):04d}QXZ', value, flags=re.I)
                if any(value.count(token) != original.count(token) for token in tokens.values()):
                    restored.append(translate_around_names(language, text, pattern))
                    continue
                for name, token in tokens.items():
                    value = value.replace(token, name)
                restored.append(value)
            return restored
        except Exception as error:
            # Unsupported locales and invalid requests cannot recover by retrying.
            if isinstance(error, HTTPError) and 400 <= error.code < 500 and error.code != 429:
                raise
            if attempt == 5: raise
            time.sleep(min(2 ** attempt, 30))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--translate', action='store_true', help='Fetch missing translations from Google; sends public prose externally')
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if args.translate:
        with tempfile.TemporaryDirectory(prefix='wiki-l10n-') as folder:
            corpus_path = Path(folder) / 'corpus.json'
            subprocess.run(['node', 'tools/localize.mjs', 'prepare', str(corpus_path)], cwd=ROOT, check=True)
            corpus = json.loads(corpus_path.read_text())
        protected_names = corpus['protected_names']
        protection_hash = key(json.dumps(protected_names))
        if cache.get('_meta', {}).get('protected_names_hash') != protection_hash:
            # Upgrade old cache entries once; subsequent offline renders stay deterministic.
            protected_keys = {key(text) for text in corpus['strings'] if any(name in text for name in protected_names)}
            for lang in corpus['languages']:
                for entry in protected_keys:
                    cache.get(lang['code'], {}).pop(entry, None)
            cache.setdefault('_meta', {})['protected_names_hash'] = protection_hash
        jobs = []
        for lang in corpus['languages']:
            code = lang['code']
            cache.setdefault(code, {})
            batch, size = [], 0
            for text in corpus['strings']:
                if key(text) in cache[code]: continue
                if batch and (size + len(text) > 8000 or len(batch) >= 80):
                    jobs.append((code, lang.get('translate_code', code), batch)); batch, size = [], 0
                batch.append(text); size += len(text)
            if batch: jobs.append((code, lang.get('translate_code', code), batch))
        print(f'Fetching {len(jobs)} batches across {len(set(code for code, _, _ in jobs))} languages; completed translations are cached.', flush=True)
        errors = []
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(translate, target, texts, protected_names): (code, texts) for code, target, texts in jobs}
            for done, future in enumerate(as_completed(futures), 1):
                code, texts = futures[future]
                try:
                    values = future.result()
                    with LOCK:
                        cache[code].update({key(text): value for text, value in zip(texts, values)})
                        if done % 20 == 0 or done == len(jobs): save(cache)
                except Exception as error:
                    errors.append(f'{code}: {error}')
                    print(f'{code}: {error}', flush=True)
                if done % 20 == 0 or done == len(jobs):
                    print(f'{done}/{len(jobs)} batches completed ({len(errors)} failures)', flush=True)
        save(cache)
        if errors: raise RuntimeError('Translation failed; rerun to resume: ' + '; '.join(errors[:5]))
    subprocess.run(['node', 'tools/localize.mjs', 'render', str(CACHE)], cwd=ROOT, check=True)

if __name__ == '__main__':
    main()
