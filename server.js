const path = require("path");
const express = require("express");
const axios = require("axios");
const { Client } = require("pg");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL client setup
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Connect to PostgreSQL
client
  .connect()
  .then(() => console.log("Connected to PostgreSQL successfully"))
  .catch((err) => console.error("Failed to connect to PostgreSQL:", err));

// Define a query to create a table if it doesn't exist
const createTableQuery = `
CREATE TABLE IF NOT EXISTS Ticker (
  id SERIAL PRIMARY KEY,
  base_unit VARCHAR(255),
  quote_unit VARCHAR(255),
  low FLOAT,
  high FLOAT,
  last FLOAT,
  open FLOAT,
  volume FLOAT,
  sell FLOAT,
  buy FLOAT,
  at INTEGER,
  name VARCHAR(255)
)
`;

// Create table if not exists
client
  .query(createTableQuery)
  .then(() => console.log("Table created successfully"))
  .catch((err) => console.error("Failed to create table:", err));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Fetch and store data route
app.get("/fetch-data", async (req, res) => {
  try {
    console.log("Fetching data from API...");
    const response = await axios.get("https://api.wazirx.com/api/v2/tickers");
    const tickers = Object.values(response.data).slice(0, 10);

    console.log("Storing fetched data into database...");
    for (let ticker of tickers) {
      const {
        base_unit,
        quote_unit,
        low,
        high,
        last,
        open,
        volume,
        sell,
        buy,
        at,
        name,
      } = ticker;
      const query = `
        INSERT INTO Ticker (base_unit, quote_unit, low, high, last, open, volume, sell, buy, at, name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      const values = [
        base_unit,
        quote_unit,
        low,
        high,
        last,
        open,
        volume,
        sell,
        buy,
        at,
        name,
      ];
      await client.query(query, values);
    }

    console.log("Data fetched and stored successfully.");
    res.send("Data fetched and stored successfully.");
  } catch (error) {
    console.error("Error fetching or storing data:", error.message);
    res.status(500).send(error.message);
  }
});

// Retrieve stored data route
app.get("/tickers", async (req, res) => {
  try {
    console.log("Retrieving stored data from database...");
    const result = await client.query("SELECT * FROM Ticker");
    const tickerData = result.rows.map((ticker, index) => {
      return {
        sr_no: index + 1,
        ...ticker,
      };
    });

    console.log("Data retrieved successfully.");
    res.json(tickerData);
  } catch (error) {
    console.error("Error retrieving data:", error.message);
    res.status(500).send(error.message);
  }
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
