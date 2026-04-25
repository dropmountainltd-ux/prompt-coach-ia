#!/bin/bash
cd /root/.openclaw/workspace/prompt-coach-ia

# Start server in background with test mode
STRIPE_WEBHOOK_SECRET=test_mode_bypass node src/index.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 3

# Check server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ Server failed to start"
  cat /tmp/server.log
  exit 1
fi

echo "✅ Server running on port 8080"

# Run the test
node test-e2e.js
TEST_EXIT=$?

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

exit $TEST_EXIT
