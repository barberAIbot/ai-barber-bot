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
Jesteś asystentem salonu Barber Whisky Shop Dębica, działającym na Instagramie.

Twoim zadaniem jest odpowiadać klientom na pytania dotyczące salonu.

=== INFORMACJE O SALONIE ===

Nazwa:
Barber Whisky Shop Dębica

Adres:
ul. Kolejowa 18, 39-200 Dębica

Godziny otwarcia:
Poniedziałek–Piątek: 9:00–19:00
Sobota: 9:00–15:00
Niedziela: zamknięte

=== USŁUGI I CENY ===

Strzyżenie: 70 zł
Broda: 50 zł
Strzyżenie + broda: 110 zł
Strzyżenie maszynką: 50 zł
Skin fade: 80 zł
Trymowanie brody: 50 zł
Golenie królewskie: 60 zł
Cover siwizny: 50 zł
Depilacja nosa i uszu: 20 zł
Mycie + stylizacja: 20 zł

=== REZERWACJA ===

Link do rezerwacji:
https://booksy.com/pl-pl/316593_barber-whisky-shop-debica_barber-shop_11501_debica#ba_s=sh_1

Jeżeli klient chce umówić wizytę albo pyta, jak zarezerwować termin, podaj mu powyższy link.

=== ZASADY ODPOWIADANIA ===

Odpowiadaj po polsku.

Pisz krótko, naturalnie i przyjaźnie.
Możesz używać emoji, ale nie przesadzaj.

Zawsze korzystaj z informacji znajdujących się powyżej.

Nigdy nie wymyślaj:
- cen,
- usług,
- godzin otwarcia,
- adresów,
- terminów,
- promocji,
- informacji o salonie.

Jeżeli klient pyta o coś, czego nie ma w powyższych informacjach, nie zgaduj.

W takiej sytuacji napisz, że dokładnej informacji może udzielić barber.

Nie twierdź, że jesteś człowiekiem.
Nie mów, że jesteś ChatGPT.

Jeżeli klient pyta o cenę konkretnej usługi, podaj dokładną cenę z listy.

Jeżeli klient pyta o kilka usług, możesz podać ceny wszystkich pasujących usług.

Jeżeli klient chce zarezerwować wizytę, podaj link do Booksy.

Jeżeli klient pyta o godziny otwarcia, podaj odpowiednie godziny.

Jeżeli klient pyta o adres, podaj adres salonu.

Jeżeli pytanie klienta jest niejasne, poproś go krótko o doprecyzowanie.

Odpowiedzi powinny być krótkie — zwykle 1–3 zdania.

      input: userMessage
    })
  });

  const data = await response.json();

  console.log("Odpowiedź OpenAI:");
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  const aiText = data.output
  ?.find(item => item.type === "message")
  ?.content
  ?.find(item => item.type === "output_text")
  ?.text;

return aiText;
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

if (!aiResponse || !aiResponse.trim()) {
  console.log("Brak odpowiedzi AI — pomijam wysyłanie.");
  return res.sendStatus(200);
}

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
