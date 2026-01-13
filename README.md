[![Count Von Countdown](https://voncountdown.herokuapp.com/badge)](https://voncountdown.herokuapp.com)
[![Semver](https://img.shields.io/badge/SemVer-2.0-blue.svg)](http://semver.org/spec/v2.0.0.html)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badge/)
[![LinkedIn](https://img.shields.io/badge/Linked-In-blue.svg)](https://www.linkedin.com/in/brianrandyfunk)

# voncountdown
### Count Von Countdown

A Twitter bot that counts down from a very large number, posting tweets with the current count in word form. Inspired by Count Von Count from Sesame Street!

![Count Von Countdown](/public/img/VonCountdown_1050white.png)

## Features

- Automatic countdown tweets with random phrases and tags
- Web interface showing current countdown state
- Badge endpoint for displaying countdown in README files
- Health check endpoint for monitoring
- Secure with rate limiting, helmet.js, and input validation
- Comprehensive error handling and retry logic

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- AWS Account with DynamoDB access
- Twitter Developer Account with API v2 access

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

# Optional: Logging
LOG_LEVEL=info
```

5. Create DynamoDB table:
   - Table name: `voncountdown` (or set `DYNAMODB_TABLE` env var)
   - Partition key: `number` (Number)
   - No sort key required

6. Start the application:
```bash
npm start
```

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
Health check endpoint returning JSON:
```json
{
  "status": "ok",
  "current_number": 1111373357578,
  "current_string": "One trillion one hundred eleven billion...",
  "current_comma": "1,111,373,357,578",
  "uptime": 1234.56,
  "timestamp": "2026-01-13T15:30:00.000Z"
}
```

## Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Code Formatting
```bash
npm run format
```

## Architecture

The application consists of:
- **Express.js** web server
- **DynamoDB** for persistent storage of countdown state
- **Twitter API v2** for posting tweets
- **Winston** for structured logging
- **Node-cache** for in-memory caching
- **Handlebars** for server-side templating

### Countdown Flow

1. On startup, loads the lowest number from DynamoDB (or initializes with start number)
2. Decrements the number
3. Formats number as words and comma-separated value
4. Randomly adds phrase and tag (1 in 5 chance)
5. Posts tweet via Twitter API
6. Updates DynamoDB with new state
7. Schedules next countdown with random delay (14-88 days)

### Error Handling

- **Twitter rate limits**: Automatically waits for rate limit reset
- **DynamoDB throttling**: Exponential backoff with up to 5 retries
- **Other errors**: Retries after 1 minute delay
- **Negative numbers**: Countdown stops gracefully

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
| `LOG_LEVEL` | Logging level | `info` |
| `TWITTER_API_KEY` | Twitter API key | Required |
| `TWITTER_API_SECRET` | Twitter API secret | Required |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | Required |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter access token secret | Required |

## Security

- Helmet.js for security headers
- Rate limiting (100 req/15min per IP, 60 req/min for health endpoint)
- Input validation and sanitization
- XSS protection in templates
- Environment variable validation
- Request timeout handling (30 seconds)

## Deployment

### Heroku

1. Create Heroku app
2. Set environment variables
3. Deploy:
```bash
git push heroku main
```

### Docker

```dockerfile
FROM node:18-alpine
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
4. Run tests and linting
5. Submit a pull request

## License

Code and documentation copyright 2016 Brian Funk. Code released under [the MIT license](https://opensource.org/licenses/MIT).

### Ah ha ha ha!
