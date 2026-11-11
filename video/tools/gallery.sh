#!/usr/bin/env bash
# Devpost image gallery from the raw APP recordings (no video title cards). All 3:2.
#   bash video/tools/gallery.sh   -> docs/gallery/NN-name.(jpg|gif)
set -euo pipefail
cd "$(dirname "$0")/../.."
src=video/remotion/public/footage
out=docs/gallery
BG=0xf5f5f7
rm -rf "$out"; mkdir -p "$out"

# desktop NAME VIDEO SECONDS: 1918x1200 recording on a 1920x1280 canvas
desktop() {
  ffmpeg -v error -y -ss "$3" -i "$src/$2.mp4" -frames:v 1 \
    -vf "scale=1920:-2,pad=1920:1280:0:(oh-ih)/2:color=$BG" -q:v 2 "$out/$1.jpg"
}
# phones NAME T1 T2 T3: three phone screens (citizen.mp4) side by side
phones() {
  local n=$1; shift
  ffmpeg -v error -y -ss "$1" -i $src/citizen.mp4 -ss "$2" -i $src/citizen.mp4 -ss "$3" -i $src/citizen.mp4 -filter_complex \
    "color=c=$BG:s=1920x1280[bg];[0:v]scale=-2:1160[a];[1:v]scale=-2:1160[b];[2:v]scale=-2:1160[c];\
[bg][a]overlay=96:60[x];[x][b]overlay=692:60[y];[y][c]overlay=1288:60" -frames:v 1 -q:v 2 "$out/$n.jpg"
}
# gif NAME VIDEO START END SPEED: 3:2 GIF, 960x640
gif() {
  ffmpeg -v error -y -ss "$3" -to "$4" -i "$src/$2.mp4" -filter_complex \
    "[0:v]fps=12,setpts=PTS/$5,scale=960:-2:flags=lanczos,pad=960:640:0:(oh-ih)/2:color=$BG,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    -loop 0 "$out/$1.gif"
}

phones 01-report-in-a-minute        5.5 12.0 19.0
phones 02-graded-with-reasons       27.0 29.5 33.0
desktop 03-review-queue             reviewer 1.2
desktop 04-gate-refused             reviewer 8.5
desktop 05-expert-verified          reviewer 16.5
desktop 06-river-health-brief       reviewer 22.0
desktop 07-catalogue-measures       city 5.5
desktop 08-dipteracast-ground-truth city 11.5
gif     09-demo-gate-and-verify     reviewer 6.7 16.6 1
gif     10-demo-brief-and-ground-truth city 0.4 14.2 1.5

for f in "$out"/*; do printf '%-48s %5s KB\n' "$(basename "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
