#!/usr/bin/env python3
"""Analyze a GA4 Free form CSV with Event name, Total users, and Event count."""
import argparse
import csv
import datetime as dt
import math
import re
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
        if not name.startswith(('sh_', 'sh2_', 'shf_', 'shf2_')):
            continue
        if name in events:
            raise ValueError(f'Duplicate event row {name}; export a table grouped only by Event name.')
        events[name] = {key: number(row[key]) for key in ('Total users', 'Event count')}
    return events


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv')
    parser.add_argument('--experiment', choices=['hero_v1', 'hero_v2', 'feature_v1', 'feature_v2'], default='hero_v2')
    parser.add_argument('--minimum-per-arm', type=int, help='Prespecified sample size; do not lower after inspecting results.')
    args = parser.parse_args()
    featured = args.experiment.startswith('feature_')
    homepage = Path(__file__).resolve().parent.parent / 'index.html'
    variants, namespace = {
        'hero_v1': (('control', 'game_first'), 'sh_'),
        'hero_v2': (('control', 'crown', 'variety', 'quick_start'), 'sh2_'),
        'feature_v1': (('crown', 'magus'), 'shf_'),
        'feature_v2': (tuple(re.findall(r'data-feature-arm="([a-z0-9_]+)"', homepage.read_text())), 'shf2_'),
    }[args.experiment]
    if args.minimum_per_arm is None:
        args.minimum_per_arm = {'hero_v2': 11000, 'feature_v2': 14478}.get(args.experiment, 8200)
    if args.minimum_per_arm <= 0:
        parser.error('Sample size must be positive.')
    events = read_export(args.csv)

    def count(prefix, variant, metric='Total users'):
        return events.get(f'{namespace}{prefix[3:]}_{variant}', {}).get(metric, 0)

    samples, successes = [], []
    print(f'{args.experiment} — primary outcome: newly created account / exposed visitor\n')
    for variant in variants:
        n = count('sh_exposure', variant)
        k = count('sh_signup', variant)
        if n <= 0 or not 0 <= k <= n:
            raise ValueError(f'{variant}: missing exposure users or signup users exceed exposure users. Check date range and filters.')
        samples.append(n)
        successes.append(k)
        low, high = wilson(k, n)
        print(f'{variant}: {k:g}/{n:g} new accounts = {k/n:.2%} (95% interval {low:.2%}–{high:.2%})')
        if featured:
            secondary = [('sh_click', 'featured-game click users'), ('sh_game_launch', 'any game launch users')]
        else:
            secondary = [('sh_conversion', 'all first sign-ins'), ('sh_returning_signin', 'existing accounts'),
                         ('sh_game_launch', 'game launch users'), ('sh_return_visit', 'return visitors')]
        for prefix, label in secondary:
            value = count(prefix, variant)
            print(f'  {label}: {value:g} ({value/n:.2%} of exposure users)')
        if not featured:
            for prefix, label in [('sh_home_tick', 'homepage'), ('sh_app_tick', 'dashboard')]:
                seconds = count(prefix, variant, 'Event count') * 15
                print(f'  {label}: approximately {seconds/n:.1f} focused seconds per exposed visitor')

    expected = sum(samples) / len(samples)
    imbalance = sum((n-expected)**2/expected for n in samples)
    # Chi-square survival function by recurrence from one degree of freedom.
    # All supported tests have an even number of arms, hence odd degrees of freedom.
    x = imbalance / 2
    srm_p = math.erfc(math.sqrt(x))
    if x:
        for df in range(1, len(samples) - 1, 2):
            shape = df / 2
            srm_p += math.exp(shape * math.log(x) - x - math.lgamma(shape + 1))
    n0, k0 = samples[0], successes[0]
    p0 = k0/n0
    comparisons = []
    for variant, n1, k1 in zip(variants[1:], samples[1:], successes[1:]):
        p1 = k1/n1
        pooled = (k0+k1)/(n0+n1)
        error = math.sqrt(pooled*(1-pooled)*(1/n0+1/n1))
        raw_p = math.erfc(abs(p1-p0)/error/math.sqrt(2)) if error else 1.0
        adjusted_p = min(1.0, raw_p*(len(variants)-1))
        comparisons.append((variant, p1, adjusted_p))
        print(f'\n{variant} vs {variants[0]}: {(p1-p0)*100:+.2f} percentage points')
        if p0:
            print(f'Relative change: {(p1/p0-1):+.1%}')
        print(f'Two-sided p-value: {raw_p:.5g}; Bonferroni-adjusted p-value: {adjusted_p:.5g}')
    print(f'\nAssignment-balance p-value: {srm_p:.5g}')

    reasons = []
    maturity = dt.datetime(2026, 12, 24, tzinfo=dt.timezone.utc) if featured else dt.datetime(2026, 11, 16, tzinfo=dt.timezone.utc)
    if dt.datetime.now(dt.timezone.utc) < maturity:
        reasons.append(f'conversion window has not matured ({maturity.date()} UTC)')
    if min(samples) < args.minimum_per_arm:
        reasons.append(f'fewer than {args.minimum_per_arm:,} exposed users in an arm')
    if srm_p < .001:
        reasons.append('assignment imbalance requires investigation')
    if any(min(k, n-k) < 5 for n, k in zip(samples, successes)):
        reasons.append('too few outcomes for the normal approximation')
    if reasons:
        print('No winner: ' + '; '.join(reasons) + '.')
    else:
        improved = [name for name, rate, p in comparisons if rate > p0 and p < .05]
        worse = [name for name, rate, p in comparisons if rate < p0 and p < .05]
        if improved:
            print('Primary outcome improves on control: ' + ', '.join(improved) + '. Review secondary outcomes before shipping.')
            if len(improved) > 1:
                print('This analysis does not establish which improving treatment is superior to the others.')
        elif worse:
            print('No established improvement; control outperforms: ' + ', '.join(worse) + '.')
        else:
            print('Inconclusive: no comparison meets the adjusted 5% threshold.')
    print('Counts describe measured browsers; verify the export spans the complete experiment and maturity window.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(str(error))
