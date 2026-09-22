const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "barber-test-token";

// Test, czy serwer działa
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
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #222;
    }

    h1, h2 {
      color: #111;
    }

    h1 {
      margin-bottom: 10px;
    }
  </style>
</head>

<body>

<h1>Polityka prywatności</h1>

<p><strong>Ostatnia aktualizacja:</strong> 23 września 2026 r.</p>

<h2>1. Informacje ogólne</h2>

<p>
Barberbot jest aplikacją służącą do automatyzacji komunikacji
z klientami za pośrednictwem Instagram Direct.
</p>

<h2>2. Jakie dane mogą być przetwarzane</h2>

<p>
W związku z działaniem aplikacji mogą być przetwarzane informacje
przekazywane przez użytkowników za pośrednictwem Instagram Direct,
w szczególności treść wiadomości oraz identyfikatory użytkowników
niezbędne do obsługi komunikacji.
</p>

<h2>3. Cel przetwarzania danych</h2>

<p>
Dane są wykorzystywane w celu odbierania, przetwarzania i odpowiadania
na wiadomości użytkowników oraz obsługi komunikacji z profesjonalnym
kontem Instagram korzystającym z aplikacji.
</p>

<h2>4. Przetwarzanie wiadomości przez system AI</h2>

<p>
Wiadomości mogą być przetwarzane przez systemy automatyczne,
w tym technologie sztucznej inteligencji, wyłącznie w celu
udzielenia odpowiedzi na wiadomość użytkownika.
</p>

<h2>5. Udostępnianie danych</h2>

<p>
Dane nie są sprzedawane ani udostępniane podmiotom trzecim
w celach marketingowych.
Aplikacja może korzystać z usług zewnętrznych dostawców
technologicznych niezbędnych do jej działania, w tym usług
Meta, hostingu oraz usług związanych z przetwarzaniem AI.
</p>

<h2>6. Bezpieczeństwo</h2>

<p>
Podejmowane są odpowiednie środki techniczne i organizacyjne
mające na celu ochronę danych przed nieuprawnionym dostępem,
utratą lub niewłaściwym wykorzystaniem.
</p>

<h2>7. Okres przechowywania danych</h2>

<p>
Dane są przechowywane przez okres niezbędny do realizacji celów,
dla których zostały zebrane, lub przez okres wymagany przez
obowiązujące przepisy prawa.
</p>

<h2>8. Usunięcie danych</h2>

<p>
Użytkownik może skontaktować się z administratorem aplikacji
w celu uzyskania informacji dotyczących przetwarzania jego danych
lub żądania ich usunięcia, jeżeli jest to wymagane przez
obowiązujące przepisy prawa.
</p>

<h2>9. Kontakt</h2>

<p>
W sprawach dotyczących prywatności należy skontaktować się
z administratorem aplikacji za pośrednictwem adresu e-mail
podanego w ustawieniach aplikacji.
</p>

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

// Odbieranie wiadomości z Instagrama
app.post("/webhook", (req, res) => {
  console.log("Otrzymano webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
