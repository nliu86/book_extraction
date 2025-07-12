# SSE (Server-Sent Events) Debugging Guide

## Issue
The frontend is stuck when trying to extract book content - SSE connection not working properly.

## Fixes Applied

### 1. Server-Side SSE Configuration
- Added proper SSE headers including `X-Accel-Buffering: no` to disable Nginx buffering
- Removed Content-Encoding header to prevent compression issues
- Added initial `:ok\n\n` comment to establish connection
- Added heartbeat mechanism (every 30 seconds) to keep connection alive
- Added connection state tracking to handle client disconnects properly

### 2. Progress Emission
- Added initial progress message when extraction starts
- Added comprehensive logging with `[SSE]` prefix for debugging
- Added flush() calls after each write to force data transmission
- Improved error handling and logging

### 3. Frontend Debugging
- Added console.log statements to track SSE data flow
- Added logging for response headers and chunk data
- Improved error handling in the SSE reader

### 4. Test Endpoints
- Created `/test-sse` endpoint for basic SSE testing
- Created test pages: `/test-sse.html` for debugging SSE connections
- Created `debug-sse.js` script for command-line testing

## How to Debug

1. **Check Server Logs**
   Look for `[SSE]` prefixed messages:
   ```bash
   npm start
   # Then watch for:
   # [Server] Received request to /api/extract-book-progress
   # [SSE] Starting book extraction with progress
   # [SSE] Progress update: {...}
   ```

2. **Check Browser Console**
   Open browser DevTools and look for:
   - `Starting SSE request to /api/extract-book-progress`
   - `Response received:` with headers
   - `Received chunk:` with SSE data
   - `Parsed data:` with JSON objects

3. **Test Basic SSE**
   Navigate to http://localhost:3000/test-sse.html and click "Test Basic SSE"
   This should show counter updates every second.

4. **Check Network Tab**
   - The request to `/api/extract-book-progress` should show as "EventStream"
   - Response headers should include `Content-Type: text/event-stream`
   - The connection should stay open and show data chunks

5. **Common Issues**
   - **No data received**: Check if middleware is interfering
   - **Connection closes immediately**: Check for errors in server logs
   - **Data buffered**: Ensure flush() is called and compression is disabled
   - **CORS issues**: Verify Access-Control headers are set

## Testing Commands

```bash
# Test basic SSE from command line
node debug-sse.js

# Test with curl
curl -N http://localhost:3000/test-sse

# Test book extraction endpoint with curl
curl -X POST -F "image=@test-image.jpg" http://localhost:3000/api/extract-book-progress
```

## Next Steps

1. Start the server: `npm start`
2. Open http://localhost:3000 in your browser
3. Upload a book image and check the browser console
4. If issues persist, check:
   - Server logs for error messages
   - Network tab for request/response details
   - Test with the basic SSE endpoint first