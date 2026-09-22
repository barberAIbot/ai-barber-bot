const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "barber-test-token";

// Test, czy serwer działa
app.get("/", (req, res) => {
  res.send("AI Barber Bot działa 🚀");
});

// Weryfikacja webhooka Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook zweryfikowany!");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Odbieranie wiadomości z Instagrama
app.post("/webhook", (req, res) => {
  console.log("Otrzymano webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
