import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const results = [];
for (const name of ['background-original.mp4', 'video-background-demo.mp4', 'startup-demo.mp4']) {
  const path = 'docs/demos/' + name;
  const p = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_streams',
      '-show_format',
      '-show_frames',
      '-select_streams',
      'v:0',
      '-of',
      'json',
      path,
    ],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(p.status, 0, p.stderr);
  const d = JSON.parse(p.stdout),
    v = d.streams[0],
    times = d.frames.map((f) => +f.best_effort_timestamp_time),
    steps = times.slice(1).map((t, i) => t - times[i]);
  assert(times.every((t, i) => i === 0 || t > times[i - 1]));
  const decode = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  assert.equal(decode.status, 0, decode.stderr);
  assert.equal(decode.stderr, '');
  const bytes = readFileSync(path),
    moov = bytes.indexOf(Buffer.from('moov')),
    mdat = bytes.indexOf(Buffer.from('mdat'));
  assert.equal(v.codec_name, 'h264');
  assert.equal(v.pix_fmt, 'yuv420p');
  if (name !== 'background-original.mp4') assert(moov >= 0 && moov < mdat, 'faststart');
  const hashes = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-vf', 'scale=320:-1', '-f', 'framemd5', '-'],
    { encoding: 'utf8' },
  )
    .stdout.split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(',').at(-1)?.trim());
  const duplicate = hashes.slice(1).filter((h, i) => h === hashes[i]).length;
  results.push({
    name,
    bytes: statSync(path).size,
    codec: v.codec_name,
    pixelFormat: v.pix_fmt,
    width: v.width,
    height: v.height,
    fps: v.avg_frame_rate,
    duration: +d.format.duration,
    frames: times.length,
    minStep: Math.min(...steps),
    maxStep: Math.max(...steps),
    consecutiveIdenticalFrames: duplicate,
    decoded: true,
    faststart: moov < mdat,
    githubPlayback:
      'Not inspected on a published GitHub page; README uses a static thumbnail and direct MP4 link.',
  });
}
writeFileSync(
  'work/demo-media-report.json',
  JSON.stringify({ version: '3.0.0', files: results }, null, 2),
);
console.log('Demo decoding, timestamps, dimensions, codecs and faststart verified.');
