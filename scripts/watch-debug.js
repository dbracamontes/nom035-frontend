// Simple watch debug script
// Usage: node scripts/watch-debug.js
// Logs file change events to console and to ./watch-log.txt

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const logPath = path.join(repoRoot, 'watch-log.txt');

function appendLog(line) {
  const ts = new Date().toISOString();
  const text = `${ts} ${line}\n`;
  fs.appendFileSync(logPath, text);
  console.log(text.trim());
}

// Try to use chokidar if available for reliable cross-platform watching
let chokidar;
try {
  chokidar = require('chokidar');
} catch (e) {
  chokidar = null;
}

if (chokidar) {
  appendLog('Using chokidar for watching');
  const watcher = chokidar.watch(path.join(repoRoot, 'src'), {
    ignored: /(^|[\\\\])node_modules|(^|[\\\\])\.git|(^|[\\\\])dist|(^|[\\\\])watch-log.txt/,
    ignoreInitial: true,
    persistent: true
  });

  watcher
    .on('add', p => appendLog(`FILE_CHANGED add ${path.relative(repoRoot, p)}`))
    .on('change', p => appendLog(`FILE_CHANGED change ${path.relative(repoRoot, p)}`))
    .on('unlink', p => appendLog(`FILE_CHANGED unlink ${path.relative(repoRoot, p)}`))
    .on('error', error => appendLog(`WATCHER_ERROR ${error}`));

} else {
  // Fallback: use fs.watch (Windows supports recursive watch for directories)
  appendLog('Chokidar not installed; falling back to fs.watch (may be less reliable)');
  try {
    const watcher = fs.watch(path.join(repoRoot, 'src'), { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      appendLog(`FILE_CHANGED ${eventType} ${filename}`);
    });
    watcher.on('error', err => appendLog(`WATCHER_ERROR ${err}`));
  } catch (err) {
    appendLog(`FATAL_WATCH_ERROR ${err}`);
    process.exit(1);
  }
}

appendLog('watch-debug started. Logging to ' + logPath);
appendLog('PID ' + process.pid);
appendLog('Press Ctrl+C to stop.');
