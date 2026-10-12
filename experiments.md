# Homepage experiment

Experiment `hero_v2` compares four hero designs simultaneously, with 25% of new visitors per arm:

| Variant | Hero |
| --- | --- |
| `control` | Existing account-focused hero and “Create Free Account” CTA |
| `crown` | Crown & Chasm artwork and direct “Play Free Now” CTA |
| `variety` | Three linked games, “Pick your next adventure,” and “Explore the Library” CTA |
| `quick_start` | Simple account benefits, “Your next game starts here,” and “Explore Free Games” CTA |

Everything outside the hero is shared. Assignment persists across visits and the dashboard, and expires
90 days after first exposure. Known signed-in browsers are excluded from new enrollment.
Enrollment ends November 9, 2026 UTC; each visitor has seven days to convert. Analyze only
after November 16 so the final cohort has its full conversion window. Visitors keep their hero
after enrollment closes. Browsers blocking cookies see the original page and are not enrolled.
The earlier `hero_v1` cohort is closed to new enrollment. Browsers already exposed to it keep
their original treatment and seven-day attribution, with the original `sh_` events. They are
not enrolled in `hero_v2`. New assignments use cookie `sh_ab_hero_v2` and `sh2_` events.

## Measurement

Both sites use GA4 `G-W4D9C5NP9G`. Events end in `_control`, `_crown`, `_variety`, or `_quick_start`, so GA4's built-in
Event name and Total users dimensions suffice without new admin configuration.

| Event prefix | Meaning |
| --- | --- |
| `sh2_exposure` | First homepage exposure per persistent assignment |
| `sh2_account_click` / `sh2_game_click` | Dashboard/account or individual game link click |
| `sh2_signin_view` | Dashboard sign-in gate shown |
| `sh2_conversion` | First authenticated dashboard entry after Terms acceptance |
| `sh2_signup` | Converted account created since that visitor's first exposure |
| `sh2_returning_signin` | Converted account existed before exposure |
| `sh2_unclassified_signin` | Converted account has no usable creation date |
| `sh2_game_launch` | Game URL resolved and assigned to the authenticated game iframe |
| `sh2_home_tick` / `sh2_app_tick` | 15 seconds of visible, focused homepage/dashboard time |
| `sh2_return_visit` | First homepage revisit at least 24 hours after exposure, within seven days |

Primary outcome: unique users with `sh2_signup_<variant>` divided by unique users with
`sh2_exposure_<variant>`. Anonymous-to-signed-in conversion, game launches, return visits,
and engagement are secondary. Existing account sign-ins are reported separately. A game launch
event confirms a launch attempt reached the iframe, not successful gameplay initialization.

Focused time excludes hidden/unfocused windows and suspended timers; iframe keyboard input
does not need to reach the parent. Approximate focused seconds = tick Event count × 15. Each
page's last partial interval is omitted, so this is comparable coarse measurement, not an exact
stopwatch. Use tick **Event count**, not Total users. Divide by exposed unique users to compare
time per visitor. GA4's automatic engagement measurement also remains available.

The shared cookies contain only variant, timestamps, measurement flags, and a signed-in marker.
Events contain no account identifiers, emails, auth fragments, or raw invite/game URLs. Dashboard
GA initializes after the OAuth fragment is removed, with a clean URL/referrer. Ad blockers,
cookie deletion, device changes, and withheld analytics prevent complete attribution. First
exposure deduplication and conversion attribution are per browser; analytics is not an account ledger.

## View results in Google Analytics

1. Open the property containing stream `G-W4D9C5NP9G`.
2. Realtime shows the `sh2_*` events as visitors arrive. Standard reports can take 24–48 hours.
3. In Explore, create a Free form exploration: rows **Event name**, values **Total users** and
   **Event count**, filter Event name **begins with** `sh2_`. Use the entire experiment date range,
   October 12 through November 15 inclusive (adjust to the property's timezone).
4. Export as CSV. Run `python3 tools/analyze-experiment.py export.csv`. It calculates conversion
   rates, confidence intervals, the primary comparison, and assignment balance. It also summarizes
   sign-ins, game launches, return visits, and approximate time per visitor. To analyze the legacy
   cohort separately, export `sh_` events and pass `--experiment hero_v1`.

Optional admin improvements: mark each `sh2_signup_<variant>` event as a key event;
register event-scoped dimensions `experiment_id`, `experiment_variant`, `site_surface`, and
`cta_location`. These improve browsing but are not required to collect or compare results.

## Decision rule

Use one final analysis, a two-sided family significance threshold of 5%, and 80% target power.
Compare each of the three treatments against control with a Bonferroni correction: multiply each
raw p-value by three (capped at one), or test each at .05/3. This controls false positives across
the three planned comparisons; see [NIST's multiple comparison method](https://itl.nist.gov/div898/handbook/prc/section4/prc473.htm).
Treatment-to-treatment ranking is descriptive: two treatments beating control does not establish
that one beats the other. Each arm is a complete hero design, so results do not isolate individual copy/art effects. Planning
assumption: baseline new-account conversion 5%, meaningful increase to 6%; this needs about
11,000 exposed visitors per arm (44,000 total), accounting for three comparisons. Confirm that assumption against baseline traffic; if conversion
is much lower, a larger sample is needed. The fixed enrollment period has at least two complete
weekly cycles. Do not extend it because an interim result looks promising. If traffic is insufficient,
report the result as inconclusive and plan a fresh experiment with a new ID.

The analyzer never calls a winner before the conversion window matures or below the planned
sample. A four-way 25% assignment imbalance (chi-square with three degrees of freedom) at
p < .001 invalidates a winner claim pending investigation.
Assess secondary outcomes for regressions before shipping a significant primary improvement;
secondary p-values are not independent grounds for choosing a winner. GA4 exported user counts
are approximate; ambiguous results need deeper cohort analysis rather than overstating precision.

## Preview, deploy, and rollback

`/?ab_preview=control`, `crown`, `variety`, or `quick_start` preview each hero without assigning cookies
or emitting experiment events. Preview mode still has the site's existing automatic GA pageview.
The original `game_first` preview link is an alias for `crown`. No JavaScript shows the original hero.
Local previews never emit analytics events.

Keep `experiment.js` and dashboard `wwwroot/js/experiment.js` identical. Deploy dashboard first,
then public site, so authentication attribution exists when enrollment starts. Increment the public
script query version and the dashboard's shared asset version on changes.

To stop enrollment, set `ENROLL_UNTIL` in both copies to a past date. To restore the original hero
immediately, remove the public `experiment.js` script tag; dashboard attribution can stay through
the seven-day conversion window. Never reuse `hero_v1` for a changed treatment. Preserve the
collected data and use a fresh cookie/event namespace for the next experiment. Never reuse `hero_v2`
for changed treatments. Legacy attribution remains on its own namespace during rollback.
