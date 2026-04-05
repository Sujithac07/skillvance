const app = require('./server');

const port = Number(process.env.PORT || 5000);
const startupRetryDelayMs = 300;
const startupRetryAttempts = 5;

let server = null;

function shutdown(signal, onDone) {
  if (!server) {
    onDone();
    return;
  }

  server.close(() => {
    server = null;
    onDone();
  });
}

function registerSignalHandlers() {
  process.once('SIGINT', () => {
    shutdown('SIGINT', () => process.exit(0));
  });

  process.once('SIGTERM', () => {
    shutdown('SIGTERM', () => process.exit(0));
  });

  process.once('SIGUSR2', () => {
    shutdown('SIGUSR2', () => process.kill(process.pid, 'SIGUSR2'));
  });
}

function listenWithRetry(attemptsLeft) {
  server = app.listen(port, () => {
    console.log(`Skillvance backend running on port ${port}`);
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      setTimeout(() => {
        listenWithRetry(attemptsLeft - 1);
      }, startupRetryDelayMs);
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`Failed to start backend: port ${port} is already in use.`);
      process.exit(1);
    }

    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });
}

app
  .ensureInitialized()
  .then(() => {
    registerSignalHandlers();
    listenWithRetry(startupRetryAttempts);
  })
  .catch(error => {
    console.error('Failed to initialize backend:', error.message);
    process.exit(1);
  });