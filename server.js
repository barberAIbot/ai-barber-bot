const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "barber-test-token";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

const INSTAGRAM_USER_ID = "17841426513537979";

// Strona główna
app.get("/", (req, res) => {
  res.send("AI Barber Bot działa 🚀");
});

// Polityka prywatności
app.get("/privacy", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Polityka prywatności - Barberbot</title>
</head>
<body style="font-family:Arial;max-width:900px;margin:40px auto;padding:20px;line-height:1.6">

<h1>Polityka prywatności</h1>
<p><strong>Ostatnia aktualizacja:</strong> 23 września 2026 r.</p>

<h2>1. Informacje ogólne</h2>
<p>Barberbot jest aplikacją służącą do automatyzacji komunikacji z klientami za pośrednictwem Instagram Direct.</p>

<h2>2. Jakie dane mogą być przetwarzane</h2>
<p>Aplikacja może przetwarzać treść wiadomości oraz identyfikatory użytkowników niezbędne do obsługi komunikacji.</p>

<h2>3. Cel przetwarzania</h2>
<p>Dane są wykorzystywane w celu odbierania, przetwarzania i odpowiadania na wiadomości użytkowników.</p>

<h2>4. Przetwarzanie przez system AI</h2>
<p>Wiadomości mogą być przetwarzane przez systemy automatyczne, w tym technologie sztucznej inteligencji, w celu przygotowania odpowiedzi.</p>

<h2>5. Udostępnianie danych</h2>
<p>Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych. Aplikacja może korzystać z usług technologicznych niezbędnych do jej działania.</p>

<h2>6. Bezpieczeństwo</h2>
<p>Stosowane są odpowiednie środki techniczne i organizacyjne mające na celu ochronę danych.</p>

<h2>7. Usunięcie danych</h2>
<p>Użytkownik może skontaktować się z administratorem aplikacji w sprawie usunięcia dotyczących go danych.</p>

<h2>8. Kontakt</h2>
<p>W sprawach dotyczących prywatności należy skontaktować się z administratorem aplikacji.</p>

</body>
</html>
  `);
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

// Wysyłanie odpowiedzi na Instagram
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

// Odbieranie wiadomości z Instagrama
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

      await sendInstagramMessage(
        senderId,
        "Cześć! 👋 W czym mogę Ci pomóc?"
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Błąd wysyłania wiadomości:");
    console.error(error);

    res.sendStatus(200);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
