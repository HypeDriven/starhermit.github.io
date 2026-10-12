#!/usr/bin/env python3
"""Analyze a GA4 Free form CSV with Event name, Total users, and Event count."""
import argparse
import csv
import datetime as dt
import math
from pathlib import Path


def wilson(successes, total):
    z = 1.95996398454
    rate = successes / total
    denominator = 1 + z * z / total
    center = (rate + z * z / (2 * total)) / denominator
    half = z * math.sqrt(rate * (1 - rate) / total + z * z / (4 * total * total)) / denominator
    return center - half, center + half


def number(value):
    return float(value.strip().replace(',', '').replace('\u00a0', ''))


def read_export(path):
    lines = Path(path).read_text(encoding='utf-8-sig').splitlines()
    header = next((i for i, line in enumerate(lines) if 'Event name' in line and 'Total users' in line and 'Event count' in line), None)
    if header is None:
        raise ValueError('Export must contain Event name, Total users, and Event count columns.')
    rows = csv.DictReader(lines[header:])
    events = {}
    for raw in rows:
        row = {(k or '').strip(): (v or '').strip() for k, v in raw.items()}
        name = row.get('Event name', '')
        if not name.startswith('sh_'):
            continue
        if name in events:
            raise ValueError(f'Duplicate event row {name}; export a table grouped only by Event name.')
        events[name] = {key: number(row[key]) for key in ('Total users', 'Event count')}
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv')
    parser.add_argument('--minimum-per-arm', type=int, default=8200, help='Prespecified sample size; do not lower after inspecting results.')
    args = parser.parse_args()
    if args.minimum_per_arm <= 0:
        parser.error('Sample size must be positive.')
    events = read_export(args.csv)

    def count(prefix, variant, metric='Total users'):
        return events.get(f'{prefix}_{variant}', {}).get(metric, 0)

    samples, successes = [], []
    print('hero_v1 — primary outcome: newly created account / exposed visitor\n')
    for variant in ('control', 'game_first'):
        n = count('sh_exposure', variant)
        k = count('sh_signup', variant)
        if n <= 0 or not 0 <= k <= n:
            raise ValueError(f'{variant}: missing exposure users or signup users exceed exposure users. Check date range and filters.')
        samples.append(n)
        successes.append(k)
        low, high = wilson(k, n)
        print(f'{variant}: {k:g}/{n:g} new accounts = {k/n:.2%} (95% interval {low:.2%}–{high:.2%})')
        for prefix, label in [('sh_conversion', 'all first sign-ins'), ('sh_returning_signin', 'existing accounts'), ('sh_game_launch', 'game launch users'), ('sh_return_visit', 'return visitors')]:
            value = count(prefix, variant)
            print(f'  {label}: {value:g} ({value/n:.2%} of exposure users)')
        for prefix, label in [('sh_home_tick', 'homepage'), ('sh_app_tick', 'dashboard')]:
            seconds = count(prefix, variant, 'Event count') * 15
            print(f'  {label}: approximately {seconds/n:.1f} focused seconds per exposed visitor')

    n0, n1 = samples
    k0, k1 = successes
    p0, p1 = k0/n0, k1/n1
    pooled = (k0+k1)/(n0+n1)
    error = math.sqrt(pooled*(1-pooled)*(1/n0+1/n1))
    p_value = math.erfc(abs(p1-p0)/error/math.sqrt(2)) if error else 1.0
    imbalance = (n0-n1)**2/(n0+n1)
    srm_p = math.erfc(math.sqrt(imbalance/2))
    print(f'\nDifference: {(p1-p0)*100:+.2f} percentage points')
    if p0:
        print(f'Relative change: {(p1/p0-1):+.1%}')
    print(f'Two-sided primary p-value: {p_value:.5g}; assignment-balance p-value: {srm_p:.5g}')

    reasons = []
    mature = dt.datetime.now(dt.timezone.utc) >= dt.datetime(2026, 11, 16, tzinfo=dt.timezone.utc)
    if not mature:
        reasons.append('conversion window has not matured (November 16 UTC)')
    if min(samples) < args.minimum_per_arm:
        reasons.append(f'fewer than {args.minimum_per_arm:,} exposed users in an arm')
    if srm_p < .001:
        reasons.append('assignment imbalance requires investigation')
    if min(k0, k1, n0-k0, n1-k1) < 5:
        reasons.append('too few outcomes for the normal approximation')
    if reasons:
        print('No winner: ' + '; '.join(reasons) + '.')
    elif p_value >= .05:
        print('Inconclusive: primary difference does not meet the prespecified 5% threshold.')
    else:
        winner = 'game_first' if p1 > p0 else 'control'
        print(f'Primary outcome favors {winner}. Review secondary outcomes and data quality before shipping.')
    print('Counts describe measured browsers; verify the export spans the complete experiment and maturity window.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error))
