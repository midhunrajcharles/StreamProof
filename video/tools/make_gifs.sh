#!/usr/bin/env bash
# Short GIFs for the Devpost story, cut from the app recordings.
# Usage: bash video/tools/make_gifs.sh   (from the repo root)
set -euo pipefail
cd "$(dirname "$0")/../.."
src=video/remotion/public/footage
out=docs/gifs
mkdir -p "$out"

# gif NAME INPUT START END WIDTH SPEED
gif() {
  local name=$1 in=$2 ss=$3 to=$4 w=$5 speed=$6
  local f="fps=12,setpts=PTS/${speed},scale=${w}:-1:flags=lanczos"
  ffmpeg -v error -y -ss "$ss" -to "$to" -i "$in" \
    -filter_complex "[0:v]${f},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    -loop 0 "$out/$name.gif"
  printf '%-12s %6s KB\n' "$name" "$(( $(stat -c %s "$out/$name.gif") / 1024 ))"
}

gif 1-report   $src/citizen.mp4   6.4 25.6 300 2     # Reportar -> camera -> chips -> locate -> submit
gif 2-grade    $src/citizen.mp4  25.3 34.0 300 1     # grade card, reasons, nearby people
gif 3-gate     $src/reviewer.mp4  6.7 16.6 720 1     # export refused, then expert verifies
gif 4-brief    $src/reviewer.mp4 18.4 24.0 720 1     # River Health Brief + advisory
gif 5-city     $src/city.mp4      0.4 14.2 720 1.5   # Catalogue measures, coverage, mission, ground truth
