[![Count Von Countdown](https://voncountdown.com/badge)](https://voncountdown.com)
[![Semver](https://img.shields.io/badge/SemVer-2.0-blue.svg)](http://semver.org/spec/v2.0.0.html)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badge/)
[![LinkedIn](https://img.shields.io/badge/Linked-In-blue.svg)](https://www.linkedin.com/in/brianrandyfunk)

# voncountdown
### Count Von Countdown

A Twitter bot that counts down from a very large number, posting tweets with the current count in word form. Inspired by Count Von Count from Sesame Street!

![Count Von Countdown](/public/img/VonCountdown_1050white.png)

## Features

- Automatic countdown posts on X a few times a day, with random phrases and tags
- Web interface showing the current count, a self-hosted feed of recent posts, and the Count's Ledger of silly statistics
- Badge endpoint for displaying countdown in README files
- Health check endpoint for monitoring
- Secure with rate limiting, helmet.js, and input validation
- Comprehensive error handling and retry logic

## Setup Instructions

### Prerequisites

- Node.js 20+ 
- AWS Account with DynamoDB access
- X (Twitter) developer account with API v2 access **and a prepaid credit balance**. X moved to pay-per-use pricing in 2026; a plain post costs about $0.015, so a few dollars covers months at the default cadence. With no credits every post fails with HTTP 402 `credits depleted`.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/brianfunk/voncountdown.git
cd voncountdown
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
DYNAMODB_TABLE=voncountdown

# Application Configuration
PORT=8080
NODE_ENV=development

# Twitter API Configuration
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

```

5. Create DynamoDB table:
   - Table name: `voncountdown` (or set `DYNAMODB_TABLE` env var)
   - Partition key: `number` (Number)
   - Sort key: `datetime` (String)

6. Check the X credentials and credit balance:
```bash
npm run check:x
```

7. Start the application:
```bash
npm start
```

Set `DRY_RUN=1` to run everything (DynamoDB scan, website, scheduler) without posting to X or writing to DynamoDB. `BOOT_DELAY_MS` overrides the 5 minute pause before the first post after startup.

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### `GET /`
Home page displaying the current countdown state.

### `GET /badge`
Returns a badge image showing the current countdown number.
- Returns 503 if service is initializing
- Returns 500 on error

### `GET /health`
Health check endpoint returning JSON. `status` is `degraded` whenever the last post attempt failed, and `bot` says why and when the next attempt is:
```json
{
  "status": "ok",
  "current_number": 1111373357578,
  "current_string": "One trillion one hundred eleven billion...",
  "current_comma": "1,111,373,357,578",
  "bot": {
    "last_post_at": "2026-10-02T01:00:00.000Z",
    "last_post_number": 1111373357578,
    "next_post_at": "2026-10-02T06:12:00.000Z",
    "last_error": null,
    "consecutive_failures": 0,
    "dry_run": false
  },
  "uptime": 1234.56,
  "timestamp": "2026-10-02T01:30:00.000Z"
}
```

## Bot stopped posting?

1. `curl https://voncountdown.com/health` and look at `bot.last_error`.
2. `code: 402` means the X account is out of API credits. Top up at https://developer.x.com, the bot retries on its own every 6 hours.
3. `code: 401` or `403` means the keys were rejected. Regenerate them in the X developer portal (app permissions must be Read and Write) and update the App Runner environment variables.
4. Anything else: check CloudWatch logs for the `COUNTDOWN TICK FAILED` entry. The bot backs off exponentially (1 minute up to 1 hour) and never skips a number on failure.
5. Run `npm run check:x` locally to confirm credentials and credits before redeploying.

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

See `tests/README.md` for testing guide.

### Logging

The application uses simple console logging (stdout/stderr) for compatibility with AWS App Runner and CloudWatch Logs.

**Log Levels:**
- `[INFO]` - General information and flow tracking
- `[DEBUG]` - Detailed debugging information
- `[WARN]` - Warnings and non-critical issues
- `[ERROR]` - Errors and exceptions

**Log Format:**
```
[INFO] [2026-01-13T16:30:00.000Z] Message {"key":"value"}
```

**Features:**
- Automatic sanitization of sensitive data (credentials, tokens, keys)
- Timestamped logs for easy debugging
- Structured JSON data for parsing
- Extensive logging throughout countdown flow, Twitter API calls, and DynamoDB operations

**Viewing Logs:**
- **Local:** Logs appear in console when running `npm start` or `npm run dev`
- **AWS App Runner:** View logs in CloudWatch Logs console

## Architecture

The application consists of:
- **Express.js** web server
- **DynamoDB** for persistent storage of countdown state
- **Twitter API v2** for posting tweets
- **Console logging** (stdout/stderr) for CloudWatch compatibility
- **Node-cache** for in-memory caching
- **Handlebars** for server-side templating

### Countdown Flow

1. On startup, scans DynamoDB (all pages) for the lowest number, which is the last post
2. Waits 5 minutes, then computes the next number (current minus one) as words and a comma string
3. Randomly adds a phrase and tag (1 in 5 chance)
4. Posts via the X API v2
5. Only after a successful post: updates in-memory state and writes the record to DynamoDB
6. Schedules the next post with a random delay of 2 to 8 hours (about 4 to 6 posts a day)

### Error Handling

- **No credits or bad credentials (402, 401, 403)**: logs an `ACTION NEEDED` line and retries in 6 hours
- **X rate limits (429)**: waits for the reset time X reports
- **DynamoDB throttling**: the SDK retries with adaptive backoff (up to 5 attempts)
- **Other errors**: exponential backoff from 1 minute, capped at 1 hour
- **Failures never decrement**: the number only moves after a post succeeds
- **Zero**: countdown stops gracefully

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `AWS_REGION` | AWS region | `us-east-1` |
| `DYNAMODB_TABLE` | DynamoDB table name | `voncountdown` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `DRY_RUN` | `1` to log instead of posting to X or writing DynamoDB | unset |
| `BOOT_DELAY_MS` | Pause before the first post after startup | `300000` |
| `TWITTER_API_KEY` | Twitter API key | Required |
| `TWITTER_API_SECRET` | Twitter API secret | Required |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | Required |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter access token secret | Required |

## Security

- **Helmet.js** for security headers with Content Security Policy (CSP)
- **CSP** limited to the page's own assets, Google Fonts, shields.io badge and the YouTube embed
- **Rate limiting** (100 req/15min per IP, 60 req/min for health endpoint)
- **Input validation and sanitization**
- **XSS protection** in templates
- **Environment variable validation**
- **Request timeout handling** (30 seconds)
- **Log sanitization** to prevent credential leakage

## Deployment

### AWS App Runner

1. Create App Runner service
2. Connect to GitHub repository
3. Set environment variables in App Runner console:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `DYNAMODB_TABLE`
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_TOKEN_SECRET`
   - `NODE_ENV=production`
   - `PORT=8080`
4. The live service builds from the `master` branch with auto-deploy **off** and runtime Node 22. To release: merge `dev` into `master`, then start a deployment from the App Runner console (or `aws apprunner start-deployment`).
5. App Runner streams logs to CloudWatch Logs and handles scaling and health checks.

**Logging:** All logs go to stdout/stderr and are automatically captured by CloudWatch Logs. Use AWS Console to view logs.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

Code and documentation copyright 2016 Brian Funk. Code released under [the MIT license](https://opensource.org/licenses/MIT).

### Ah ha ha ha!
