# Weather-Aware Order Processing

This project checks the current weather for each order's city using the
OpenWeatherMap API and identifies orders that may be delayed because of bad
weather.

## Features

- Fetches weather for all orders concurrently using Promise.all().
- Marks an order as Delayed when the weather condition is:
  - Rain
  - Snow
  - Extreme
- Generates a personalized weather-aware apology using Gemini AI.
- Handles invalid cities without stopping the entire process.
- Keeps API keys secure using environment variables.

## Project Structure

assignment-2/
├── orders.json
├── updated-orders.json
├── index.js
├── AI-LOG.md
├── README.md
├── package.json
├── package-lock.json
├── .gitignore
└── .env

.env should never be uploaded to GitHub.

## Requirements

- Node.js
- OpenWeatherMap API key
- Gemini API key

## Setup

```bash
git clone https://github.com/youknowhim/Yellow.ai-Assignment.git
npm install
node script.js
