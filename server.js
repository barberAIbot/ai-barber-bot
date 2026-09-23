const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "barber-test-token";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const INSTAGRAM_USER_ID = "17841426513537979";

app.get("/", (req, res) => {
  res.send("AI Barber Bot działa 🚀");
});

app.get("/privacy", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Privacy Policy</title>
      </head>
      <body>
        <h1>Privacy Policy</h1>
        <p>
          AI Barber Bot processes Instagram messages in order to provide
          automated customer support.
        </p>
        <p>
          Messages may be processed by third-party AI services to generate
          responses.
        </p>
        <p>
          Data is used only for providing and improving the service.
        </p>
      </body>
    </html>
  `);
});

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


async function askAI(userMessage) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",

    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      model: "gpt-5.6-luna",

      instructions: `
Jesteś asystentem barbera działającym na Instagramie.

Odpowiadasz po polsku.
Pisz krótko, naturalnie i przyjaźnie.
Nie używaj przesadnie formalnego języka.
Nie wymyślaj cen, usług, godzin otwarcia ani dostępnych terminów.

Na ten moment masz bardzo ograniczoną wiedzę o salonie.
Jeżeli klient pyta o konkretną cenę, usługę, termin lub inną informację,
której nie znasz, powiedz, że barber może udzielić dokładnej informacji.

Nie udawaj człowieka.
Nie mów, że jesteś ChatGPT.

Odpowiedź powinna być krótka — maksymalnie kilka zdań.
      `,

      input: userMessage
    })
  });

  const data = await response.json();

  console.log("Odpowiedź OpenAI:");
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.output_text;
}


async function sendInstagramMessage(recipientId, text) {
  const response = await fetch(
    `https://graph.instagram.com/v23.0/${INSTAGRAM_USER_ID}/messages`,
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        recipient: {
          id: recipientId
        },

        message: {
          text: text
        }
      })
    }
  );

  const data = await response.json();

  console.log("Odpowiedź Instagram API:");
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}


app.post("/webhook", async (req, res) => {
  console.log("Otrzymano webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    const senderId = messaging?.sender?.id;
    const messageText = messaging?.message?.text;

    if (senderId && messageText) {

      console.log(`Wiadomość od ${senderId}: ${messageText}`);

      const aiResponse = await askAI(messageText);

      console.log(`Odpowiedź AI: ${aiResponse}`);

      await sendInstagramMessage(
        senderId,
        aiResponse
      );
    }

    res.sendStatus(200);

  } catch (error) {

    console.error("BŁĄD:");
    console.error(error);

    res.sendStatus(200);
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
