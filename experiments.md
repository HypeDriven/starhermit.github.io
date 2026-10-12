# Homepage A/B experiment

Experiment `hero_v1` compares the existing account-focused hero (`control`) with a Crown &
Chasm hero, cover image, and direct “Play Free Now” link (`game_first`). Everything else is
shared. Cookie assignment is random 50/50, persists across visits and the dashboard, and expires
90 days after first exposure. Known signed-in browsers are excluded from new enrollment.
Enrollment ends November 9, 2026 UTC; each visitor has seven days to convert. Analyze only
after November 16 so the final cohort has its full conversion window. Visitors keep their hero
after enrollment closes. Browsers blocking cookies see the original page and are not enrolled.

## Measurement

Both sites use GA4 `G-W4D9C5NP9G`. Events end in `_control` or `_game_first`, so GA4's built-in
Event name and Total users dimensions suffice without new admin configuration.

| Event prefix | Meaning |
| --- | --- |
| `sh_exposure` | First homepage exposure per persistent assignment |
| `sh_account_click` / `sh_game_click` | Dashboard/account or individual game link click |
| `sh_signin_view` | Dashboard sign-in gate shown |
| `sh_conversion` | First authenticated dashboard entry after Terms acceptance |
| `sh_signup` | Converted account created since that visitor's first exposure |
| `sh_returning_signin` | Converted account existed before exposure |
| `sh_unclassified_signin` | Converted account has no usable creation date |
| `sh_game_launch` | Game URL resolved and assigned to the authenticated game iframe |
| `sh_home_tick` / `sh_app_tick` | 15 seconds of visible, focused homepage/dashboard time |
| `sh_return_visit` | First homepage revisit at least 24 hours after exposure, within seven days |

Primary outcome: unique users with `sh_signup_<variant>` divided by unique users with
`sh_exposure_<variant>`. Anonymous-to-signed-in conversion, game launches, return visits,
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
2. Realtime shows the `sh_*` events as visitors arrive. Standard reports can take 24–48 hours.
3. In Explore, create a Free form exploration: rows **Event name**, values **Total users** and
   **Event count**, filter Event name **begins with** `sh_`. Use the entire experiment date range,
   October 12 through November 15 inclusive (adjust to the property's timezone).
4. Export as CSV. Run `python3 tools/analyze-experiment.py export.csv`. It calculates conversion
   rates, confidence intervals, the primary comparison, and assignment balance. It also summarizes
   sign-ins, game launches, return visits, and approximate time per visitor.

Optional admin improvements: mark `sh_signup_control` and `sh_signup_game_first` as key events;
register event-scoped dimensions `experiment_id`, `experiment_variant`, `site_surface`, and
`cta_location`. These improve browsing but are not required to collect or compare results.

## Decision rule

Use one final analysis, a two-sided 5% significance threshold, and 80% target power. Planning
assumption: baseline new-account conversion 5%, meaningful increase to 6%; this needs about
8,200 exposed visitors per arm. Confirm that assumption against baseline traffic; if conversion
is much lower, a larger sample is needed. The fixed enrollment period has at least two complete
weekly cycles. Do not extend it because an interim result looks promising. If traffic is insufficient,
report the result as inconclusive and plan a fresh experiment with a new ID.

The analyzer never calls a winner before the conversion window matures or below the planned
sample. A 50/50 assignment imbalance at p < .001 invalidates a winner claim pending investigation.
Assess secondary outcomes for regressions before shipping a significant primary improvement;
secondary p-values are not independent grounds for choosing a winner. GA4 exported user counts
are approximate; ambiguous results need deeper cohort analysis rather than overstating precision.

## Preview, deploy, and rollback

`/?ab_preview=control` and `/?ab_preview=game_first` preview either hero without assigning cookies
or emitting experiment events. Preview mode still has the site's existing automatic GA pageview.
No JavaScript shows the original hero. Local previews never emit analytics events.

Keep `experiment.js` and dashboard `wwwroot/js/experiment.js` identical. Deploy dashboard first,
then public site, so authentication attribution exists when enrollment starts. Increment the public
script query version and the dashboard's shared asset version on changes.

To stop enrollment, set `ENROLL_UNTIL` in both copies to a past date. To restore the original hero
immediately, remove the public `experiment.js` script tag; dashboard attribution can stay through
the seven-day conversion window. Never reuse `hero_v1` for a changed treatment. Preserve the
collected data and use a fresh cookie/event namespace for the next experiment.
