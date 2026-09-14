require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!WEATHER_API_KEY) {
  throw new Error("OPENWEATHER_API_KEY is missing in .env");
}

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

async function fetchWeather(order) {
  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: order.city,
          appid: WEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    const weather = response.data;

    return {
      ...order,
      weatherMain: weather.weather?.[0]?.main || "Unknown",
      temperature: weather.main?.temp,
      weatherDescription: weather.weather?.[0]?.description || "",
    };
  } catch (error) {
    console.error(
      `❌ Weather fetch failed for ${order.city}:`,
      error.response?.data?.message || error.message
    );

    // Don't crash the whole program
    return {
      ...order,
      weatherError: true,
      errorMessage:
        error.response?.data?.message || error.message,
    };
  }
}

async function generateApology(order) {
  const prompt = `
Write a short, friendly, personalized weather-aware delivery apology.

Customer: ${order.customer}
City: ${order.city}
Weather: ${order.weatherMain}
Weather description: ${order.weatherDescription}

The order is delayed because of the weather.

Return ONLY the apology message.
Do not use markdown.
Keep it to 1-2 sentences.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error(
      `❌ AI apology generation failed for ${order.customer}:`,
      error.message
    );

    return `Hi ${order.customer}, your order to ${order.city} is delayed due to ${order.weatherDescription || "severe weather"}. We appreciate your patience!`;
  }
}

async function main() {
  // Read orders.json
  const orders = JSON.parse(
    fs.readFileSync("./orders.json", "utf-8")
  );

  console.log(`Checking weather for ${orders.length} orders...\n`);

  // IMPORTANT:
  // Promise.all makes all weather API requests concurrently.
  const weatherResults = await Promise.all(
    orders.map((order) => fetchWeather(order))
  );

  const updatedOrders = [];

  for (const order of weatherResults) {
    // Invalid city / API failure
    if (order.weatherError) {
      updatedOrders.push(order);
      continue;
    }

    const shouldDelay = ["Rain", "Snow", "Extreme"].includes(
      order.weatherMain
    );

    if (shouldDelay) {
      order.status = "Delayed";

      console.log(
        `${order.customer}'s order to ${order.city} is delayed.`
      );

      order.apology = await generateApology(order);

      console.log(` ${order.apology}\n`);
    } else {
      console.log(
        `${order.customer}'s order to ${order.city} is not delayed.`
      );
    }

    updatedOrders.push(order);
  }

  // Remove internal fields before saving final output
  const finalOrders = updatedOrders.map((order) => {
    const {
      weatherError,
      errorMessage,
      weatherMain,
      temperature,
      weatherDescription,
      apology,
      ...cleanOrder
    } = order;

    return {
      ...cleanOrder,
      ...(apology && { apology }),
      ...(errorMessage && { error: errorMessage }),
    };
  });

  // Save updated orders
  fs.writeFileSync(
    "./UpdatedOrders.json",
    JSON.stringify(finalOrders, null, 2)
  );

  console.log("=================================");
  console.log("Processing completed!");
  console.log("Saved: updated-orders.json");
  console.log("=================================");
}

main().catch((error) => {
  console.error("Unexpected error:", error.message);
  process.exit(1);
});