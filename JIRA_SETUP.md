# JIRA Integration Setup Guide

## Phase 1: API Token-Based Authentication

This guide helps you set up and test the JIRA ticket search feature using API token authentication.

### Prerequisites

1. **Atlassian Account**: You need an Atlassian Cloud account with access to a JIRA instance
2. **API Token**: Generate one at https://id.atlassian.com/manage-profile/security/api-tokens
3. **JIRA Domain**: Your JIRA Cloud domain (e.g., `your-domain.atlassian.net`)

### Step 1: Get Your JIRA API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API Token**
3. Enter a label (e.g., "Poker Pointing App")
4. Click **Create**
5. **Copy** the token (you'll only see it once!)

### Step 2: Start the Server

Install dependencies and start the server:

```bash
cd server
npm install
npm start
```

You should see output like:
```
HTTP server listening on port 4000
WebSocket server running on ws://localhost:4000
JIRA search endpoint available at POST /api/jira/search
```

### Step 3: Start the Frontend

In a new terminal:

```bash
npm start
```

The app should open at http://localhost:3000

### Step 4: Test JIRA Integration

1. **Create a room** as the host (just click "Create Room")
2. **Click "Search JIRA"** button in the room header
3. **Fill in the form**:
   - **Domain**: Your JIRA domain (e.g., `your-domain.atlassian.net` — without `https://`)
   - **Email Address**: Your Atlassian account email (the one you logged in with)
   - **API Token**: The token you copied from step 1
   - **Search Query**: Search text or issue key (e.g., `"Login"`, `"PROJ-123"`, `"feature request"`)
4. **Click Search** and wait for results
5. **Click a ticket** to select it for this planning session

### Expected Results

✅ **Success**: Tickets appear with their:
- Key (e.g., `PROJ-123`)
- Summary (e.g., "Implement login feature")
- Story Points (if set in your JIRA)

❌ **If you see an error**:

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| "No tickets found" | Query doesn't match any issues | Try a broader search term |
| "401 Unauthorized" | Wrong email or token | Check your email and re-copy API token from https://id.atlassian.com |
| "404 Not Found" | Wrong domain | Verify domain format (e.g., `your-domain.atlassian.net`) |
| "Cannot read property 'customfield_10016'" | Story Points field doesn't exist in your JIRA | This is normal; tickets will show without points |

### Troubleshooting: Check Server Logs

If you get a generic error, check your server console:

```bash
# Look for lines like:
JIRA search error response: 401 {errorMessages: [...]}
# or success:
Searching JIRA (JQL API) at https://your-domain.atlassian.net/rest/api/3/search/jql (base: https://...) with query: PET-2
```

**Common Issues**:
1. **Email + Token format**: The server combines `email:token` and base64-encodes it. The email field is **required**.
2. **JIRA Cloud only**: This API token method only works with JIRA Cloud (atlassian.net domains), not JIRA Server.
3. **Permissions**: Your JIRA user needs permission to view issues you're searching for.

### Phase 2: OAuth 2.0 (Coming Soon)

For production deployments and better UX (users won't need to manage API tokens), we'll add OAuth 2.0 support.

---

## Technical Details

### Server Endpoint: `POST /api/jira/search`

**Request body**:
```json
{
  "domain": "your-domain.atlassian.net",
  "email": "you@example.com",
  "token": "api_token_here",
  "query": "search term"
}
```

**Response (success)**:
```json
{
  "tickets": [
    {
      "key": "PROJ-123",
      "summary": "Implement login feature",
      "storyPoints": 8,
      "url": "https://your-domain.atlassian.net/browse/PROJ-123"
    }
  ]
}
```

**Response (error)**:
```json
{
  "error": "401 Unauthorized" 
}
```

### How It Works

1. **Browser** → **Server**: POST `/api/jira/search` with domain, email, token, query
2. **Server** → **JIRA Cloud**: POST `/rest/api/3/search/jql` with:
   - Basic Auth header: `Authorization: Basic base64(email:token)`
   - Request body: `{ jql: "text ~ \"query\" OR key ~ \"query\"", fields: ["key", "summary", "customfield_10016"], maxResults: 10 }`
3. **JIRA Cloud** → **Server**: Returns matching issues
4. **Server** → **Browser**: Returns simplified ticket data

The server acts as a **proxy** to avoid CORS issues (browsers can't make direct requests to JIRA's domain).

---

## Security Notes

⚠️ **API tokens are secrets** — don't commit them to version control. In the app UI, they're:
- Sent only to your local server
- Proxied through to JIRA Cloud via HTTPS
- **Not stored** anywhere in this app

For production, consider:
- Using environment variables or a secure vault for tokens
- Implementing OAuth 2.0 (Phase 2)
- Rate-limiting the `/api/jira/search` endpoint
