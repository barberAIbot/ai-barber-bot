const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

const VERIFY_TOKEN =
  process.env.VERIFY_TOKEN || "barber-test-token";

const INSTAGRAM_ACCESS_TOKEN =
  process.env.INSTAGRAM_ACCESS_TOKEN;

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;

const INSTAGRAM_USER_ID =
  "17841426513537979";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


// ==================================================
// STRONA GŁÓWNA
// ==================================================

app.get("/", (req, res) => {
  res.send("AI Barber Bot działa 🚀");
});


// ==================================================
// PRIVACY POLICY
// ==================================================

app.get("/privacy", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Privacy Policy</title>
      </head>

      <body>
        <h1>Privacy Policy</h1>

        <p>
          AI Barber Bot processes Instagram messages
          in order to provide automated customer support.
        </p>

        <p>
          Messages may be processed by third-party AI services
          to generate responses.
        </p>

        <p>
          Data is used only for providing the service.
        </p>
      </body>
    </html>
  `);
});


// ==================================================
// ADMIN AUTH
// ==================================================

function requireAdmin(req, res, next) {

  if (!ADMIN_PASSWORD) {
    return res.status(500).send(
      "Brak ADMIN_PASSWORD w zmiennych środowiskowych."
    );
  }

  const auth =
    req.headers.authorization || "";

  if (!auth.startsWith("Basic ")) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="AI Barber Bot Admin"'
    );

    return res.status(401).send(
      "Wymagane logowanie."
    );
  }

  const encoded =
    auth.split(" ")[1];

  let decoded;

  try {

    decoded =
      Buffer
        .from(encoded, "base64")
        .toString("utf8");

  } catch {

    return res.status(401).send(
      "Nieprawidłowe dane logowania."
    );
  }

  const separator =
    decoded.indexOf(":");

  if (separator === -1) {

    return res.status(401).send(
      "Nieprawidłowe dane logowania."
    );
  }

  const password =
    decoded.substring(separator + 1);

  if (password !== ADMIN_PASSWORD) {

    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="AI Barber Bot Admin"'
    );

    return res.status(401).send(
      "Nieprawidłowe hasło."
    );
  }

  next();
}


// ==================================================
// TESTOWE STEROWANIE AI DLA ROZMOWY
// ==================================================

app.get(
  "/admin/ai-off",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        barberId,
        instagramUserId
      } = req.query;

      if (!barberId || !instagramUserId) {
        return res.status(400).send(
          "Podaj barberId oraz instagramUserId."
        );
      }

      await setConversationAI(
        barberId,
        instagramUserId,
        false
      );

      res.send(
        `
          <h2>AI WYŁĄCZONE</h2>
          <p>Barber ID: ${barberId}</p>
          <p>Instagram User ID: ${instagramUserId}</p>
        `
      );

    } catch (error) {
      console.error(error);
      res.status(500).send(
        "Błąd podczas wyłączania AI."
      );
    }
  }
);


app.get(
  "/admin/ai-on",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        barberId,
        instagramUserId
      } = req.query;

      if (!barberId || !instagramUserId) {
        return res.status(400).send(
          "Podaj barberId oraz instagramUserId."
        );
      }

      await setConversationAI(
        barberId,
        instagramUserId,
        true
      );

      res.send(
        `
          <h2>AI WŁĄCZONE</h2>
          <p>Barber ID: ${barberId}</p>
          <p>Instagram User ID: ${instagramUserId}</p>
        `
      );

    } catch (error) {
      console.error(error);
      res.status(500).send(
        "Błąd podczas włączania AI."
      );
    }
  }
);


// ==================================================
// ADMIN - LISTA BARBERÓW
// ==================================================

app.get(
  "/admin",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            id,
            name,
            instagram_user_id,
            address,
            booking_url,
            created_at
          FROM barbers
          ORDER BY id ASC
        `);

      let html = `
        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8">

          <title>
            AI Barber Bot - Admin
          </title>

          <style>

            body {
              font-family: Arial, sans-serif;
              max-width: 1000px;
              margin: 40px auto;
              padding: 20px;
              background: #f5f5f5;
            }

            h1 {
              margin-bottom: 30px;
            }

            .barber {
              background: white;
              padding: 20px;
              margin-bottom: 15px;
              border-radius: 10px;
              border: 1px solid #ddd;
            }

            .button {
              display: inline-block;
              padding: 10px 15px;
              background: #111;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-right: 5px;
            }

            .danger {
              background: #b00020;
              border: none;
              color: white;
              padding: 10px 15px;
              border-radius: 6px;
              cursor: pointer;
            }

            .add {
              background: #087f23;
              margin-bottom: 25px;
            }

            .muted {
              color: #666;
            }

          </style>

        </head>

        <body>

          <h1>
            💈 AI Barber Bot
          </h1>

          <a
            class="button add"
            href="/admin/barbers/new"
          >
            + Dodaj barbera
          </a>
      `;


      if (result.rows.length === 0) {

        html += `
          <div class="barber">
            Brak barberów w bazie.
          </div>
        `;

      }


      for (const barber of result.rows) {

        html += `
          <div class="barber">

            <h2>
              ${escapeHtml(barber.name)}
            </h2>

            <p>
              <strong>Instagram ID:</strong>
              ${escapeHtml(
                barber.instagram_user_id
              )}
            </p>

            <p>
              <strong>Adres:</strong>
              ${escapeHtml(
                barber.address || "-"
              )}
            </p>

            <p>
              <strong>Booksy:</strong>
              ${escapeHtml(
                barber.booking_url || "-"
              )}
            </p>

            <a
              class="button"
              href="/admin/barbers/${barber.id}"
            >
              Edytuj
            </a>

            <a
              class="button"
              href="/admin/barbers/${barber.id}/conversations"
            >
              🤖 Rozmowy / AI
            </a>

            <form
              method="POST"
              action="/admin/barbers/${barber.id}/delete"
              style="display:inline"
              onsubmit="return confirm('Na pewno usunąć tego barbera?')"
            >

              <button
                class="danger"
                type="submit"
              >
                Usuń
              </button>

            </form>

          </div>
        `;
      }


      html += `
        </body>
        </html>
      `;

      res.send(html);

    } catch (error) {

      console.error(
        "Błąd panelu admin:",
        error
      );

      res.status(500).send(
        "Błąd serwera."
      );
    }
  }
);


// ==================================================
// ADMIN - NOWY BARBER
// ==================================================

app.get(
  "/admin/barbers/new",
  requireAdmin,
  async (req, res) => {

    res.send(`
      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <title>
          Dodaj barbera
        </title>

        <style>

          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
          }

          form {
            background: white;
            padding: 25px;
            border-radius: 10px;
            border: 1px solid #ddd;
          }

          label {
            display: block;
            margin-top: 15px;
            margin-bottom: 5px;
            font-weight: bold;
          }

          input,
          textarea {
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
          }

          textarea {
            min-height: 120px;
            resize: vertical;
          }

          button {
            margin-top: 20px;
            padding: 12px 18px;
            background: #111;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }

          .back {
            display: inline-block;
            margin-bottom: 20px;
            color: #111;
          }

          .hint {
            color: #666;
            font-size: 14px;
          }

        </style>

      </head>

      <body>

        <a
          class="back"
          href="/admin"
        >
          ← Wróć do panelu
        </a>

        <h1>
          Dodaj barbera
        </h1>

        <form
          method="POST"
          action="/admin/barbers"
        >

          <label>
            Nazwa barbera / salonu
          </label>

          <input
            type="text"
            name="name"
            required
          >

          <label>
            Instagram User ID
          </label>

          <input
            type="text"
            name="instagram_user_id"
            required
          >

          <p class="hint">
            ID profesjonalnego konta Instagram.
          </p>

          <label>
            Adres
          </label>

          <input
            type="text"
            name="address"
          >

          <label>
            Link do rezerwacji
          </label>

          <input
            type="text"
            name="booking_url"
          >

          <label>
            Instagram Access Token
          </label>

          <input
            type="password"
            name="access_token"
          >

          <label>
            Usługi
          </label>

          <textarea
            name="services"
            placeholder="Strzyżenie|70&#10;Broda|50&#10;Strzyżenie + broda|110"
          ></textarea>

          <p class="hint">
            Jedna usługa w jednej linii.
            Format: Nazwa|Cena
          </p>

          <label>
            Godziny otwarcia
          </label>

          <textarea
            name="opening_hours"
            placeholder="Poniedziałek|09:00-18:00&#10;Wtorek|09:00-18:00"
          ></textarea>

          <p class="hint">
            Jedna linia na każdy dzień.
            Format: Dzień|Godziny
          </p>

          <button
            type="submit"
          >
            Dodaj barbera
          </button>

        </form>

      </body>

      </html>
    `);
  }
);
// ==================================================
// ADMIN - ROZMOWY I STEROWANIE AI
// ==================================================

app.get(
  "/admin/barbers/:barberId/conversations",
  requireAdmin,
  async (req, res) => {

    try {

      const barberId =
        Number(req.params.barberId);

      if (!Number.isInteger(barberId)) {
        return res.status(400).send(
          "Nieprawidłowe ID barbera."
        );
      }

      const barberResult =
        await pool.query(
          `
            SELECT
              id,
              name,
              instagram_user_id
            FROM barbers
            WHERE id = $1
            LIMIT 1
          `,
          [barberId]
        );

      if (
        barberResult.rows.length === 0
      ) {
        return res.status(404).send(
          "Nie znaleziono barbera."
        );
      }

      const barber =
        barberResult.rows[0];

      const conversationsResult =
        await pool.query(
          `
            SELECT
              c.instagram_user_id,
              c.ai_active,
              c.updated_at,

              (
                SELECT cm.message
                FROM conversation_messages cm
                WHERE cm.barber_id = c.barber_id
                  AND cm.instagram_user_id =
                    c.instagram_user_id
                ORDER BY
                  cm.created_at DESC,
                  cm.id DESC
                LIMIT 1
              ) AS last_message,

              (
                SELECT cm.role
                FROM conversation_messages cm
                WHERE cm.barber_id = c.barber_id
                  AND cm.instagram_user_id =
                    c.instagram_user_id
                ORDER BY
                  cm.created_at DESC,
                  cm.id DESC
                LIMIT 1
              ) AS last_role

            FROM conversations c

            WHERE c.barber_id = $1

            ORDER BY
              c.updated_at DESC
          `,
          [barberId]
        );

      let html = `
        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8">

          <title>
            Rozmowy - ${escapeHtml(barber.name)}
          </title>

          <style>

            body {
              font-family: Arial, sans-serif;
              max-width: 1100px;
              margin: 40px auto;
              padding: 20px;
              background: #f5f5f5;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 15px;
              margin-bottom: 25px;
              flex-wrap: wrap;
            }

            .conversation {
              background: white;
              padding: 20px;
              margin-bottom: 15px;
              border-radius: 10px;
              border: 1px solid #ddd;
            }

            .button {
              display: inline-block;
              padding: 10px 15px;
              background: #111;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              border: none;
              cursor: pointer;
            }

            .on {
              color: #087f23;
              font-weight: bold;
            }

            .off {
              color: #b00020;
              font-weight: bold;
            }

            .muted {
              color: #666;
            }

            .last-message {
              margin: 12px 0;
              padding: 12px;
              background: #f7f7f7;
              border-radius: 7px;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .controls {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              align-items: center;
            }

            .green {
              background: #087f23;
            }

            .red {
              background: #b00020;
            }

          </style>

        </head>

        <body>

          <div class="top">

            <div>

              <h1>
                💬 Rozmowy
              </h1>

              <p>
                <strong>
                  ${escapeHtml(barber.name)}
                </strong>
              </p>

              <p class="muted">
                Instagram ID barbera:
                ${escapeHtml(
                  barber.instagram_user_id
                )}
              </p>

            </div>

            <a
              class="button"
              href="/admin"
            >
              ← Wróć do barberów
            </a>

          </div>
      `;


      if (
        conversationsResult.rows.length === 0
      ) {

        html += `
          <div class="conversation">
            Brak rozmów dla tego barbera.
          </div>
        `;

      }


      for (
        const conversation
        of conversationsResult.rows
      ) {

        const lastMessage =
          conversation.last_message ||
          "Brak wiadomości.";

        const lastMessageRole =
          conversation.last_role === "user"
            ? "Klient"
            : conversation.last_role === "assistant"
              ? "AI"
              : "-";

        const aiActive =
          conversation.ai_active === true;


        html += `
          <div class="conversation">

            <h2>
              Klient:
              ${escapeHtml(
                conversation.instagram_user_id
              )}
            </h2>

            <p>

              <strong>
                AI:
              </strong>

              <span
                class="${aiActive ? "on" : "off"}"
              >
                ${
                  aiActive
                    ? "🟢 WŁĄCZONE"
                    : "🔴 WYŁĄCZONE"
                }
              </span>

            </p>

            <div class="last-message">

              <strong>
                ${lastMessageRole}:
              </strong>

              <br>

              ${escapeHtml(lastMessage)}

            </div>

            <div class="controls">

              <a
                class="button"
                href="/admin/barbers/${barber.id}/conversations/${encodeURIComponent(
                  conversation.instagram_user_id
                )}"
              >
                Otwórz rozmowę
              </a>

              <form
                method="POST"
                action="/admin/barbers/${barber.id}/conversations/${encodeURIComponent(
                  conversation.instagram_user_id
                )}/ai-on"
                style="display:inline"
              >

                <button
                  class="button green"
                  type="submit"
                >
                  Włącz AI
                </button>

              </form>

              <form
                method="POST"
                action="/admin/barbers/${barber.id}/conversations/${encodeURIComponent(
                  conversation.instagram_user_id
                )}/ai-off"
                style="display:inline"
              >

                <button
                  class="button red"
                  type="submit"
                >
                  Wyłącz AI
                </button>

              </form>

            </div>

          </div>
        `;
      }


      html += `
        </body>
        </html>
      `;

      res.send(html);

    } catch (error) {

      console.error(
        "Błąd panelu rozmów:",
        error
      );

      res.status(500).send(
        "Błąd serwera."
      );
    }
  }
);


// ==================================================
// ADMIN - POJEDYNCZA ROZMOWA
// ==================================================

app.get(
  "/admin/barbers/:barberId/conversations/:instagramUserId",
  requireAdmin,
  async (req, res) => {

    try {

      const barberId =
        Number(req.params.barberId);

      const instagramUserId =
        req.params.instagramUserId;


      if (
        !Number.isInteger(barberId) ||
        !instagramUserId
      ) {

        return res.status(400).send(
          "Nieprawidłowe dane rozmowy."
        );
      }


      const barberResult =
        await pool.query(
          `
            SELECT
              id,
              name
            FROM barbers
            WHERE id = $1
            LIMIT 1
          `,
          [barberId]
        );


      if (
        barberResult.rows.length === 0
      ) {

        return res.status(404).send(
          "Nie znaleziono barbera."
        );
      }


      const conversationResult =
        await pool.query(
          `
            SELECT
              ai_active
            FROM conversations
            WHERE barber_id = $1
              AND instagram_user_id = $2
            LIMIT 1
          `,
          [
            barberId,
            instagramUserId
          ]
        );


      const aiActive =
        conversationResult.rows.length > 0 &&
        conversationResult.rows[0].ai_active === true;


      const messagesResult =
        await pool.query(
          `
            SELECT
              role,
              message,
              created_at
            FROM conversation_messages
            WHERE barber_id = $1
              AND instagram_user_id = $2
            ORDER BY
              created_at ASC,
              id ASC
          `,
          [
            barberId,
            instagramUserId
          ]
        );


      const barber =
        barberResult.rows[0];


      let html = `
        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8">

          <title>
            Rozmowa -
            ${escapeHtml(instagramUserId)}
          </title>

          <style>

            body {
              font-family: Arial, sans-serif;
              max-width: 900px;
              margin: 40px auto;
              padding: 20px;
              background: #f5f5f5;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 15px;
              flex-wrap: wrap;
              margin-bottom: 20px;
            }

            .message {
              padding: 12px 15px;
              border-radius: 10px;
              margin-bottom: 10px;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .user {
              background: #e9f2ff;
            }

            .assistant {
              background: #e9f8ed;
            }

            .meta {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }

            .button {
              display: inline-block;
              padding: 10px 15px;
              background: #111;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              border: none;
              cursor: pointer;
            }

            .green {
              background: #087f23;
            }

            .red {
              background: #b00020;
            }

            .status {
              background: white;
              padding: 15px;
              border-radius: 10px;
              border: 1px solid #ddd;
              margin-bottom: 20px;
            }

            .on {
              color: #087f23;
              font-weight: bold;
            }

            .off {
              color: #b00020;
              font-weight: bold;
            }

            .empty {
              background: white;
              padding: 20px;
              border-radius: 10px;
            }

          </style>

        </head>

        <body>

          <div class="top">

            <div>

              <h1>
                💬 Rozmowa
              </h1>

              <p>
                <strong>
                  Barber:
                </strong>

                ${escapeHtml(barber.name)}
              </p>

              <p>
                <strong>
                  Klient Instagram ID:
                </strong>

                ${escapeHtml(
                  instagramUserId
                )}
              </p>

            </div>

            <a
              class="button"
              href="/admin/barbers/${barberId}/conversations"
            >
              ← Wróć do rozmów
            </a>

          </div>


          <div class="status">

            <strong>
              Status AI:
            </strong>

            <span
              class="${aiActive ? "on" : "off"}"
            >
              ${
                aiActive
                  ? "🟢 WŁĄCZONE"
                  : "🔴 WYŁĄCZONE"
              }
            </span>


            <div style="margin-top: 12px;">

              ${
                aiActive

                  ? `
                    <form
                      method="POST"
                      action="/admin/barbers/${barberId}/conversations/${encodeURIComponent(
                        instagramUserId
                      )}/ai-off"
                      style="display:inline"
                    >

                      <button
                        class="button red"
                        type="submit"
                      >
                        Wyłącz AI i przejmij rozmowę
                      </button>

                    </form>
                  `

                  : `
                    <form
                      method="POST"
                      action="/admin/barbers/${barberId}/conversations/${encodeURIComponent(
                        instagramUserId
                      )}/ai-on"
                      style="display:inline"
                    >

                      <button
                        class="button green"
                        type="submit"
                      >
                        Włącz AI
                      </button>

                    </form>
                  `
              }

            </div>

          </div>
      `;


      if (
        messagesResult.rows.length === 0
      ) {

        html += `
          <div class="empty">
            Brak wiadomości w tej rozmowie.
          </div>
        `;

      }


      for (
        const message
        of messagesResult.rows
      ) {

        const roleName =
          message.role === "user"
            ? "Klient"
            : message.role === "assistant"
              ? "AI"
              : message.role;


        const timestamp =
          message.created_at
            ? new Date(
                message.created_at
              ).toLocaleString("pl-PL")
            : "";


        html += `
          <div
            class="message ${
              message.role === "user"
                ? "user"
                : "assistant"
            }"
          >

            <div class="meta">

              <strong>
                ${escapeHtml(roleName)}
              </strong>

              ${escapeHtml(timestamp)}

            </div>

            ${escapeHtml(
              message.message
            )}

          </div>
        `;
      }


      html += `
        </body>
        </html>
      `;


      res.send(html);

    } catch (error) {

      console.error(
        "Błąd widoku rozmowy:",
        error
      );

      res.status(500).send(
        "Błąd serwera."
      );
    }
  }
);


// ==================================================
// ADMIN - WŁĄCZANIE AI Z PANELU
// ==================================================

app.post(
  "/admin/barbers/:barberId/conversations/:instagramUserId/ai-on",
  requireAdmin,
  async (req, res) => {

    try {

      const barberId =
        Number(req.params.barberId);

      const instagramUserId =
        req.params.instagramUserId;


      if (
        !Number.isInteger(barberId) ||
        !instagramUserId
      ) {

        return res.status(400).send(
          "Nieprawidłowe dane rozmowy."
        );
      }


      await setConversationAI(
        barberId,
        instagramUserId,
        true
      );


      res.redirect(
        `/admin/barbers/${barberId}/conversations`
      );

    } catch (error) {

      console.error(
        "Błąd włączania AI z panelu:",
        error
      );

      res.status(500).send(
        "Błąd podczas włączania AI."
      );
    }
  }
);


// ==================================================
// ADMIN - WYŁĄCZANIE AI Z PANELU
// ==================================================

app.post(
  "/admin/barbers/:barberId/conversations/:instagramUserId/ai-off",
  requireAdmin,
  async (req, res) => {

    try {

      const barberId =
        Number(req.params.barberId);

      const instagramUserId =
        req.params.instagramUserId;


      if (
        !Number.isInteger(barberId) ||
        !instagramUserId
      ) {

        return res.status(400).send(
          "Nieprawidłowe dane rozmowy."
        );
      }


      await setConversationAI(
        barberId,
        instagramUserId,
        false
      );


      res.redirect(
        `/admin/barbers/${barberId}/conversations`
      );

    } catch (error) {

      console.error(
        "Błąd wyłączania AI z panelu:",
        error
      );

      res.status(500).send(
        "Błąd podczas wyłączania AI."
      );
    }
  }
);


// ==================================================
// ADMIN - DODAWANIE BARBERA
// ==================================================

app.post(
  "/admin/barbers",
  requireAdmin,
  async (req, res) => {

    const {
      name,
      instagram_user_id,
      address,
      booking_url,
      access_token,
      services,
      opening_hours
    } = req.body;

console.log("DANE Z FORMULARZA:", req.body);
    if (
      !name ||
      !instagram_user_id
    ) {

      return res.status(400).send(
        "Nazwa i Instagram User ID są wymagane."
      );
    }


    const client =
      await pool.connect();


    try {

      await client.query(
        "BEGIN"
      );


      const barberResult =
        await client.query(
          `
            INSERT INTO barbers
            (
              instagram_user_id,
              name,
              address,
              booking_url,
              access_token
            )

            VALUES
            ($1, $2, $3, $4, $5)

            RETURNING id
          `,
          [
            instagram_user_id.trim(),
            name.trim(),
            address?.trim() || null,
            booking_url?.trim() || null,
            access_token?.trim() || null
          ]
        );


      const barberId =
        barberResult.rows[0].id;


      await saveServicesFromText(
        client,
        barberId,
        services
      );


      await saveOpeningHoursFromText(
        client,
        barberId,
        opening_hours
      );


      await client.query(
        "COMMIT"
      );


      res.redirect(
        "/admin"
      );


    } catch (error) {

      await client.query(
        "ROLLBACK"
      );


      console.error(
        "Błąd dodawania barbera:",
        error
      );


      if (
        error.code === "23505"
      ) {

        return res.status(400).send(
          "Ten Instagram User ID już istnieje w bazie."
        );
      }


      res.status(500).send(
        "Nie udało się dodać barbera."
      );


    } finally {

      client.release();

    }
  }
);
// ==================================================
// ADMIN - USUWANIE BARBERA
// ==================================================

app.post(
  "/admin/barbers/:id/delete",
  requireAdmin,
  async (req, res) => {

    const barberId =
      Number(req.params.id);


    if (!Number.isInteger(barberId)) {

      return res.status(400).send(
        "Nieprawidłowe ID barbera."
      );
    }


    try {

      const result =
        await pool.query(
          `
            DELETE FROM barbers
            WHERE id = $1
            RETURNING id
          `,
          [barberId]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).send(
          "Nie znaleziono barbera."
        );
      }


      res.redirect(
        "/admin"
      );


    } catch (error) {

      console.error(
        "Błąd usuwania barbera:",
        error
      );

      res.status(500).send(
        "Nie udało się usunąć barbera."
      );
    }
  }
);


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==================================================
// ZAPIS USŁUG Z TEKSTU
// ==================================================

async function saveServicesFromText(
  client,
  barberId,
  servicesText
) {

  if (!servicesText) {
    return;
  }


  const lines =
    String(servicesText)
      .split("\n")
      .map(
        line => line.trim()
      )
      .filter(Boolean);


  for (
    const line
    of lines
  ) {

    const separatorIndex =
      line.lastIndexOf("|");


    if (
      separatorIndex === -1
    ) {
      continue;
    }


    const name =
      line
        .substring(
          0,
          separatorIndex
        )
        .trim();


    const priceText =
      line
        .substring(
          separatorIndex + 1
        )
        .trim()
        .replace(",", ".");


    const price =
      Number(priceText);


    if (
      !name ||
      !Number.isFinite(price)
    ) {
      continue;
    }


    await client.query(
      `
        INSERT INTO services
        (
          barber_id,
          name,
          price
        )

        VALUES
        ($1, $2, $3)

        ON CONFLICT
        (
          barber_id,
          name
        )

        DO UPDATE SET
          price = EXCLUDED.price
      `,
      [
        barberId,
        name,
        price
      ]
    );
  }
}


// ==================================================
// ZAPIS GODZIN Z TEKSTU
// ==================================================

async function saveOpeningHoursFromText(
  client,
  barberId,
  hoursText
) {

  if (!hoursText) {
    return;
  }


  const lines =
    String(hoursText)
      .split("\n")
      .map(
        line => line.trim()
      )
      .filter(Boolean);


  for (
    const line
    of lines
  ) {

    const separatorIndex =
      line.indexOf("|");


    if (
      separatorIndex === -1
    ) {
      continue;
    }


    const day =
      line
        .substring(
          0,
          separatorIndex
        )
        .trim();


    const hours =
      line
        .substring(
          separatorIndex + 1
        )
        .trim();


    if (
      !day ||
      !hours
    ) {
      continue;
    }


    await client.query(
      `
        INSERT INTO opening_hours
        (
          barber_id,
          day,
          hours
        )

        VALUES
        ($1, $2, $3)

        ON CONFLICT
        (
          barber_id,
          day
        )

        DO UPDATE SET
          hours = EXCLUDED.hours
      `,
      [
        barberId,
        day,
        hours
      ]
    );
  }
}


// ==================================================
// INICJALIZACJA BAZY
// ==================================================

async function initializeDatabase() {

  // ==================================================
  // BARBERZY
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbers (
      id SERIAL PRIMARY KEY,
      instagram_user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      booking_url TEXT,
      access_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);


  // ==================================================
  // JEŚLI STARA TABELA BARBERS JUŻ ISTNIAŁA
  // DODAJEMY ACCESS_TOKEN
  // ==================================================

  await pool.query(`
    ALTER TABLE barbers
    ADD COLUMN IF NOT EXISTS access_token TEXT
  `);


  // ==================================================
  // USŁUGI
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER NOT NULL
        REFERENCES barbers(id)
        ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(barber_id, name)
    )
  `);


  // ==================================================
  // GODZINY
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER NOT NULL
        REFERENCES barbers(id)
        ON DELETE CASCADE,
      day TEXT NOT NULL,
      hours TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(barber_id, day)
    )
  `);


  // ==================================================
  // ROZMOWY - STARA TABELA WIADOMOŚCI
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id SERIAL PRIMARY KEY,
      instagram_user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);


  // ==================================================
  // DODAJEMY BARBER_ID DO STAREJ TABELI
  // ==================================================

  await pool.query(`
    ALTER TABLE conversation_messages
    ADD COLUMN IF NOT EXISTS barber_id INTEGER
  `);


  // ==================================================
  // NOWA TABELA - ROZMOWY
  //
  // Każdy klient ma osobny status AI
  // dla konkretnego barbera.
  //
  // TRUE  = AI odpowiada
  // FALSE = AI nie odpowiada
  //
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,

      barber_id INTEGER NOT NULL
        REFERENCES barbers(id)
        ON DELETE CASCADE,

      instagram_user_id TEXT NOT NULL,

      ai_active BOOLEAN NOT NULL DEFAULT TRUE,

      created_at TIMESTAMPTZ DEFAULT NOW(),

      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(barber_id, instagram_user_id)
    )
  `);


  // ==================================================
  // JEŚLI TABELA CONVERSATIONS JUŻ ISTNIAŁA
  // UPEWNIAMY SIĘ, ŻE MA AI_ACTIVE
  // ==================================================

  await pool.query(`
    ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS ai_active
    BOOLEAN NOT NULL DEFAULT TRUE
  `);


  // ==================================================
  // UPEWNIAMY SIĘ, ŻE JEST UPDATED_AT
  // ==================================================

  await pool.query(`
    ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS updated_at
    TIMESTAMPTZ DEFAULT NOW()
  `);


  // ==================================================
  // MIGRACJA STARYCH WIADOMOŚCI
  // ==================================================

  const oldMessages =
    await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS count
      FROM conversation_messages
      WHERE barber_id IS NULL
    `);


  console.log(
    "Wiadomości bez barber_id:",
    oldMessages.rows[0].count
  );


  // ==================================================
  // SPRAWDZAMY CZY ISTNIEJE TESTOWY BARBER
  // ==================================================

  let testBarber = null;


  const existingTestBarber =
    await pool.query(
      `
        SELECT id
        FROM barbers
        WHERE instagram_user_id = $1
        LIMIT 1
      `,
      [INSTAGRAM_USER_ID]
    );


  if (
    existingTestBarber.rows.length > 0
  ) {

    testBarber =
      existingTestBarber.rows[0].id;
  }


  // ==================================================
  // JEŚLI NIE MA TESTOWEGO BARBERA
  // I BAZA JEST PUSTA
  // TWORZYMY GO
  // ==================================================

  if (!testBarber) {

    const countResult =
      await pool.query(
        `
          SELECT COUNT(*)::INTEGER AS count
          FROM barbers
        `
      );


    if (
      countResult.rows[0].count === 0
    ) {

      const insertResult =
        await pool.query(
          `
            INSERT INTO barbers
            (
              instagram_user_id,
              name,
              address,
              booking_url,
              access_token
            )

            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5
            )

            RETURNING id
          `,
          [
            INSTAGRAM_USER_ID,
            "Barber Whisky Shop Dębica",
            "ul. Kolejowa 18, 39-200 Dębica",
            "https://booksy.com/",
            INSTAGRAM_ACCESS_TOKEN || null
          ]
        );


      testBarber =
        insertResult.rows[0].id;


      // ==================================================
      // TESTOWE USŁUGI
      // ==================================================

      await pool.query(
        `
          INSERT INTO services
          (
            barber_id,
            name,
            price
          )

          VALUES
          ($1, $2, $3),
          ($1, $4, $5),
          ($1, $6, $7)

          ON CONFLICT
          (
            barber_id,
            name
          )

          DO NOTHING
        `,
        [
          testBarber,
          "Strzyżenie",
          70,

          "Broda",
          50,

          "Strzyżenie + broda",
          110
        ]
      );


      // ==================================================
      // TESTOWE GODZINY
      // ==================================================

      const testHours = [
        ["Poniedziałek", "09:00–18:00"],
        ["Wtorek", "09:00–18:00"],
        ["Środa", "09:00–18:00"],
        ["Czwartek", "09:00–18:00"],
        ["Piątek", "09:00–18:00"],
        ["Sobota", "09:00–15:00"],
        ["Niedziela", "zamknięte"]
      ];


      for (
        const [
          day,
          hours
        ]
        of testHours
      ) {

        await pool.query(
          `
            INSERT INTO opening_hours
            (
              barber_id,
              day,
              hours
            )

            VALUES
            ($1, $2, $3)

            ON CONFLICT
            (
              barber_id,
              day
            )

            DO NOTHING
          `,
          [
            testBarber,
            day,
            hours
          ]
        );
      }
    }
  }


  // ==================================================
  // JEŚLI BARBER JUŻ ISTNIAŁ
  // POBIERAMY JEGO ID
  // ==================================================

  if (!testBarber) {

    const existing =
      await pool.query(
        `
          SELECT id
          FROM barbers
          WHERE instagram_user_id = $1
          LIMIT 1
        `,
        [INSTAGRAM_USER_ID]
      );


    if (
      existing.rows.length > 0
    ) {

      testBarber =
        existing.rows[0].id;
    }
  }


  // ==================================================
  // UZUPEŁNIENIE ACCESS TOKENU TESTOWEGO BARBERA
  // ==================================================

  if (
    testBarber &&
    INSTAGRAM_ACCESS_TOKEN
  ) {

    await pool.query(
      `
        UPDATE barbers

        SET access_token = $1

        WHERE id = $2
          AND (
            access_token IS NULL
            OR access_token = ''
          )
      `,
      [
        INSTAGRAM_ACCESS_TOKEN,
        testBarber
      ]
    );
  }


  // ==================================================
  // STARE WIADOMOŚCI
  //
  // Jeżeli istnieją wiadomości bez barber_id,
  // przypisujemy je do testowego barbera.
  // ==================================================

  if (testBarber) {

    await pool.query(
      `
        UPDATE conversation_messages

        SET barber_id = $1

        WHERE barber_id IS NULL
      `,
      [testBarber]
    );
  }


  // ==================================================
  // INDEX
  // ==================================================

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    conversation_messages_lookup_idx

    ON conversation_messages
    (
      barber_id,
      instagram_user_id,
      created_at
    )
  `);


  // ==================================================
  // FOREIGN KEY
  // ==================================================

  await pool.query(`
    DO $$
    BEGIN

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
          'conversation_messages_barber_id_fkey'
      ) THEN

        ALTER TABLE conversation_messages

        ADD CONSTRAINT
          conversation_messages_barber_id_fkey

        FOREIGN KEY (barber_id)

        REFERENCES barbers(id)

        ON DELETE CASCADE;

      END IF;

    END
    $$;
  `);


  // ==================================================
  // BARBER_ID NIE MOŻE BYĆ NULL
  // ==================================================

  await pool.query(`
    ALTER TABLE conversation_messages
    ALTER COLUMN barber_id SET NOT NULL
  `);
}
// ==================================================
// POBIERANIE BARBERA PO INSTAGRAM USER ID
// ==================================================

async function getBarberByInstagramId(
  instagramUserId
) {

  const barberResult =
    await pool.query(
      `
        SELECT
          id,
          instagram_user_id,
          name,
          address,
          booking_url,
          access_token

        FROM barbers

        WHERE instagram_user_id = $1

        LIMIT 1
      `,
      [
        instagramUserId
      ]
    );


  if (
    barberResult.rows.length === 0
  ) {

    return null;
  }


  const barber =
    barberResult.rows[0];


  // ==================================================
  // USŁUGI BARBERA
  // ==================================================

  const servicesResult =
    await pool.query(
      `
        SELECT
          name,
          price

        FROM services

        WHERE barber_id = $1

        ORDER BY id ASC
      `,
      [
        barber.id
      ]
    );


  // ==================================================
  // GODZINY BARBERA
  // ==================================================

  const hoursResult =
    await pool.query(
      `
        SELECT
          day,
          hours

        FROM opening_hours

        WHERE barber_id = $1

        ORDER BY id ASC
      `,
      [
        barber.id
      ]
    );


  return {

    id:
      barber.id,

    instagramUserId:
      barber.instagram_user_id,

    name:
      barber.name,

    address:
      barber.address,

    bookingUrl:
      barber.booking_url,

    accessToken:
      barber.access_token,

    services:
      servicesResult.rows,

    openingHours:
      hoursResult.rows
  };
}


// ==================================================
// HISTORIA ROZMOWY
// ==================================================

async function getConversationHistory(
  barberId,
  instagramUserId
) {

  const result =
    await pool.query(
      `
        SELECT
          role,
          message

        FROM conversation_messages

        WHERE
          barber_id = $1
          AND instagram_user_id = $2

        ORDER BY created_at DESC

        LIMIT 10
      `,
      [
        barberId,
        instagramUserId
      ]
    );


  return result.rows.reverse();
}


// ==================================================
// ZAPIS WIADOMOŚCI
// ==================================================

async function saveMessage(
  barberId,
  instagramUserId,
  role,
  message
) {

  await pool.query(
    `
      INSERT INTO conversation_messages
      (
        barber_id,
        instagram_user_id,
        role,
        message
      )

      VALUES
      ($1, $2, $3, $4)
    `,
    [
      barberId,
      instagramUserId,
      role,
      message
    ]
  );
}


// ==================================================
// POBRANIE / UTWORZENIE ROZMOWY
// ==================================================

async function getOrCreateConversation(
  barberId,
  instagramUserId
) {

  const result =
    await pool.query(
      `
        INSERT INTO conversations
        (
          barber_id,
          instagram_user_id,
          ai_active,
          updated_at
        )

        VALUES
        ($1, $2, TRUE, NOW())

        ON CONFLICT
        (
          barber_id,
          instagram_user_id
        )

        DO UPDATE SET
          updated_at = NOW()

        RETURNING
          id,
          barber_id,
          instagram_user_id,
          ai_active
      `,
      [
        barberId,
        instagramUserId
      ]
    );


  return result.rows[0];
}


// ==================================================
// WŁĄCZANIE / WYŁĄCZANIE AI
// ==================================================

async function setConversationAI(
  barberId,
  instagramUserId,
  active
) {

  const result =
    await pool.query(
      `
        INSERT INTO conversations
        (
          barber_id,
          instagram_user_id,
          ai_active,
          updated_at
        )

        VALUES
        ($1, $2, $3, NOW())

        ON CONFLICT
        (
          barber_id,
          instagram_user_id
        )

        DO UPDATE SET
          ai_active = EXCLUDED.ai_active,
          updated_at = NOW()

        RETURNING
          id,
          barber_id,
          instagram_user_id,
          ai_active
      `,
      [
        barberId,
        instagramUserId,
        active
      ]
    );


  return result.rows[0];
}


// ==================================================
// WYKRYWANIE CHĘCI ROZMOWY Z CZŁOWIEKIEM
// ==================================================
//
// Ta funkcja NIE korzysta z AI.
//
// Najpierw sprawdzamy proste, jednoznaczne
// komunikaty klienta.
//
// Dzięki temu nie wysyłamy wiadomości do OpenAI,
// jeśli klient od razu chce człowieka.
//

function wantsHumanAgent(message) {

  if (
    !message ||
    typeof message !== "string"
  ) {

    return false;
  }


  const normalized =
    message
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:()[\]{}"'„”]/g, " ")
      .replace(/\s+/g, " ");


  const patterns = [

    "chce rozmawiac z czlowiekiem",

    "chce rozmawiac z barberem",

    "chce rozmawiac z barber",

    "chce porozmawiac z czlowiekiem",

    "chce porozmawiac z barberem",

    "chce porozmawiac z barber",

    "polacz mnie z czlowiekiem",

    "polacz mnie z barberem",

    "polacz mnie z barber",

    "przekaz mnie do czlowieka",

    "przekaz mnie do barbera",

    "przekaz mnie do barber",

    "przekieruj mnie do czlowieka",

    "przekieruj mnie do barbera",

    "przekieruj mnie do barber",

    "nie chce rozmawiac z ai",

    "nie chce rozmawiac z botem",

    "nie chce rozmawiac z chatbotem",

    "chce czlowieka",

    "chce barbera",

    "chce z barberem",

    "czlowiek prosze",

    "barber prosze"
  ];


  return patterns.some(
    pattern =>
      normalized.includes(pattern)
  );
}


// ==================================================
// ODPOWIEDŹ PRZY PRZEKAZANIU DO CZŁOWIEKA
// ==================================================

function getHumanHandoffMessage() {

  return (
    "Jasne 👍 Przekazuję rozmowę barberowi. " +
    "Od tej chwili nie będę już automatycznie odpowiadać. " +
    "Barber odezwie się do Ciebie, gdy będzie mógł."
  );
}


// ==================================================
// AI - GŁÓWNA FUNKCJA
// ==================================================

async function askAI(
  barber,
  clientInstagramId,
  userMessage
) {

  


  // ==================================================
  // HISTORIA PRZED DODANIEM AKTUALNEJ WIADOMOŚCI
  // ==================================================

  const history =
  await getConversationHistory(
    barber.id,
    clientInstagramId
  );


  // ==================================================
  // ZAPIS WIADOMOŚCI KLIENTA
  // ==================================================

  await saveMessage(
  barber.id,
  clientInstagramId,
  "user",
  userMessage
);


  // ==================================================
  // USŁUGI
  // ==================================================

  const servicesText =
    barber.services.length > 0

      ? barber.services
          .map(
            service =>
              `- ${service.name}: ${service.price} zł`
          )
          .join("\n")

      : "Brak podanych usług.";


  // ==================================================
  // GODZINY
  // ==================================================

  const openingHoursText =
    barber.openingHours.length > 0

      ? barber.openingHours
          .map(
            row =>
              `- ${row.day}: ${row.hours}`
          )
          .join("\n")

      : "Brak podanych godzin otwarcia.";


  // ==================================================
  // HISTORIA
  // ==================================================

  const historyText =
    history.length > 0

      ? history
          .map(
            item =>
              `${item.role === "user" ? "Klient" : "AI"}: ${item.message}`
          )
          .join("\n")

      : "Brak wcześniejszej historii rozmowy.";


  // ==================================================
  // SYSTEM PROMPT
  // ==================================================

  const systemPrompt = `
Jesteś wirtualnym recepcjonistą barbera.

Nazwa barbera:
${barber.name}

Adres:
${barber.address || "Brak informacji."}

Link do rezerwacji:
${barber.bookingUrl || "Brak informacji."}

USŁUGI:
${servicesText}

GODZINY OTWARCIA:
${openingHoursText}

HISTORIA ROZMOWY:
${historyText}

ZASADY:

1. Odpowiadaj krótko, naturalnie i przyjaźnie.

2. Korzystaj WYŁĄCZNIE z informacji przekazanych
   w danych barbera oraz historii rozmowy.

3. Nigdy nie wymyślaj:
   - cen,
   - usług,
   - godzin,
   - adresów,
   - linków,
   - promocji,
   - terminów,
   - dostępności terminów.

4. Nie udawaj, że masz dostęp do kalendarza
   ani systemu rezerwacji.

5. Jeżeli klient pyta o coś, czego nie ma
   w przekazanych danych, powiedz krótko,
   że dokładną informację może podać barber.

6. Jeżeli klient chce się umówić,
   podaj link do rezerwacji, jeżeli jest dostępny.

7. Jeżeli nie ma linku do rezerwacji,
   powiedz, że barber może podać szczegóły.

8. Nie twierdź, że konkretna godzina jest wolna,
   jeżeli nie masz takiej informacji.

9. Nie przedstawiaj się jako człowiek.

10. Jeżeli klient wyraźnie chce rozmawiać
    z prawdziwym barberem, nie próbuj go przekonywać
    do rozmowy z AI.

Twoim zadaniem jest pomagać klientom uzyskać
informacje dotyczące konkretnego barbera.
`;


  // ==================================================
  // OPENAI RESPONSES API
  // ==================================================

  if (!OPENAI_API_KEY) {

    throw new Error(
      "Brak OPENAI_API_KEY."
    );
  }


  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${OPENAI_API_KEY}`
        },

        body:
          JSON.stringify({

            model:
              "gpt-5.6-luna",

            instructions:
              systemPrompt,

            input:
              userMessage
          })
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();


    console.error(
      "OpenAI API error:",
      errorText
    );


    throw new Error(
      "OpenAI API zwróciło błąd."
    );
  }


  const data =
    await response.json();


  const aiMessage =
    data.output_text?.trim();


  if (!aiMessage) {

    throw new Error(
      "OpenAI nie zwróciło tekstowej odpowiedzi."
    );
  }


  // ==================================================
  // ZAPIS ODPOWIEDZI AI
  // ==================================================

  await saveMessage(
  barber.id,
  clientInstagramId,
  "assistant",
  aiMessage
);


  return aiMessage;
}
// ==================================================
// INSTAGRAM - WYSYŁANIE WIADOMOŚCI
// ==================================================

async function sendInstagramMessage(
  barberInstagramId,
  recipientInstagramId,
  message
) {

  const barber =
    await getBarberByInstagramId(
      barberInstagramId
    );


  if (!barber) {

    console.error(
      "Nie znaleziono barbera:",
      barberInstagramId
    );

    return false;
  }


  // ==================================================
  // TOKEN NALEŻY DO KONKRETNEGO BARBERA
  // ==================================================

  const accessToken =
    barber.accessToken;


  if (!accessToken) {

    console.error(
      `Brak Instagram Access Token dla barbera ${barber.id}.`
    );

    return false;
  }


  if (!recipientInstagramId) {

    console.error(
      "Brak recipientInstagramId."
    );

    return false;
  }


  if (!message) {

    console.error(
      "Brak wiadomości do wysłania."
    );

    return false;
  }


  // ==================================================
  // INSTAGRAM GRAPH API
  // ==================================================

  const response =
    await fetch(
      `https://graph.instagram.com/v23.0/${barberInstagramId}/messages`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            recipient: {
              id:
                recipientInstagramId
            },

            message: {
              text:
                message
            },

            access_token:
              accessToken
          })
      }
    );


  const responseText =
    await response.text();


  if (!response.ok) {

    console.error(
      "Instagram API error:",
      response.status,
      responseText
    );

    return false;
  }


  console.log(
    "Wiadomość wysłana na Instagram:",
    responseText
  );


  return true;
}


// ==================================================
// WEBHOOK - WERYFIKACJA META
// ==================================================

app.get(
  "/webhook",
  (req, res) => {

    const mode =
      req.query["hub.mode"];

    const token =
      req.query["hub.verify_token"];

    const challenge =
      req.query["hub.challenge"];


    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN
    ) {

      console.log(
        "Webhook Instagram zweryfikowany."
      );

      return res
        .status(200)
        .send(challenge);
    }


    return res
      .sendStatus(403);
  }
);


// ==================================================
// WEBHOOK - ODBIERANIE WIADOMOŚCI INSTAGRAM
// ==================================================

app.post(
  "/webhook",
  async (req, res) => {

    console.log(
      "=============================="
    );

    console.log(
      "INSTAGRAM WEBHOOK:"
    );

    console.log(
      JSON.stringify(
        req.body,
        null,
        2
      )
    );


    // ==================================================
    // META OCZEKUJE SZYBKIEGO 200
    // ==================================================

    if (
      req.body?.object !== "instagram"
    ) {

      return res
        .sendStatus(200);
    }


    try {

      const entries =
        req.body.entry || [];


      for (
        const entry
        of entries
      ) {

        const messaging =
          entry.messaging || [];


        for (
          const event
          of messaging
        ) {

          // ==================================================
          // NADAWCA
          // ==================================================

          const senderId =
            event.sender?.id;


          // ==================================================
          // ODBIORCA
          // Czyli konto barbera
          // ==================================================

          const recipientId =
            event.recipient?.id;


          // ==================================================
          // TREŚĆ WIADOMOŚCI
          // ==================================================

          const messageText =
            event.message?.text;


          // ==================================================
          // ECHO
          //
          // Instagram może wysłać do webhooka również
          // wiadomość wysłaną przez samo konto barbera.
          //
          // Nie chcemy wtedy uruchamiać AI.
          // ==================================================

          const isEcho =
            event.message?.is_echo === true;


          if (isEcho) {

            console.log(
              "Pomijam echo wiadomości."
            );

            continue;
          }


          // ==================================================
          // TYLKO WIADOMOŚCI TEKSTOWE
          // ==================================================

          if (
            !senderId ||
            !recipientId ||
            !messageText
          ) {

            console.log(
              "Pomijam event bez tekstu / nadawcy / odbiorcy."
            );

            continue;
          }


          // ==================================================
          // ZNAJDŹ BARBERA
          // ==================================================

          const barber =
            await getBarberByInstagramId(
              recipientId
            );


          if (!barber) {

            console.log(
              "Nie znaleziono barbera dla recipientId:",
              recipientId
            );

            continue;
          }


          // ==================================================
          // UTWÓRZ / POBIERZ ROZMOWĘ
          // ==================================================

          const conversation =
            await getOrCreateConversation(
              barber.id,
              senderId
            );


          console.log(
            `Rozmowa barber=${barber.id}, klient=${senderId}, AI=${conversation.ai_active}`
          );


          // ==================================================
          // JEŻELI AI JEST WYŁĄCZONE
          //
          // Zapisujemy wiadomość klienta,
          // ale NIE ODPOWIADAMY.
          // ==================================================

          if (
            conversation.ai_active === false
          ) {

            await saveMessage(
              barber.id,
              senderId,
              "user",
              messageText
            );


            console.log(
              "AI WYŁĄCZONE - brak automatycznej odpowiedzi."
            );

            continue;
          }


          // ==================================================
          // AUTOMATYCZNE PRZEKAZANIE DO CZŁOWIEKA
          // ==================================================
          //
          // Sprawdzamy to PRZED wysłaniem wiadomości
          // do OpenAI.
          //
          // Jeśli klient jasno chce człowieka:
          //
          // 1. zapisujemy jego wiadomość,
          // 2. wyłączamy AI,
          // 3. wysyłamy jednorazowe potwierdzenie,
          // 4. nie uruchamiamy askAI().
          //
          // Kolejne wiadomości klienta będą już trafiały
          // do barbera bez odpowiedzi AI.
          // ==================================================

          if (
            wantsHumanAgent(
              messageText
            )
          ) {

            console.log(
              "KLIENT CHCE ROZMAWIAĆ Z CZŁOWIEKIEM."
            );


            await saveMessage(
              barber.id,
              senderId,
              "user",
              messageText
            );


            await setConversationAI(
              barber.id,
              senderId,
              false
            );


            const handoffMessage =
              getHumanHandoffMessage();


            await saveMessage(
              barber.id,
              senderId,
              "assistant",
              handoffMessage
            );


            await sendInstagramMessage(
              recipientId,
              senderId,
              handoffMessage
            );


            console.log(
              "AI WYŁĄCZONE - rozmowa przekazana barberowi."
            );


            continue;
          }


          // ==================================================
          // NORMALNA ODPOWIEDŹ AI
          // ==================================================

          try {

            const aiResponse =
  await askAI(
    barber,
    senderId,
    messageText
  );


            if (
              aiResponse
            ) {

              await sendInstagramMessage(
                recipientId,
                senderId,
                aiResponse
              );
            }


          } catch (aiError) {

            console.error(
              "Błąd AI:",
              aiError
            );


            // ==================================================
            // NIE WYSYŁAMY KLIENTOWI TECHNICZNEGO BŁĘDU.
            // ==================================================

            const fallbackMessage =
              "Przepraszam, mam teraz chwilowy problem z odpowiedzią. Barber będzie mógł pomóc Ci bezpośrednio.";


            try {

              await sendInstagramMessage(
                recipientId,
                senderId,
                fallbackMessage
              );

            } catch (
              fallbackError
            ) {

              console.error(
                "Błąd wysyłania fallback:",
                fallbackError
              );
            }
          }
        }
      }


      // ==================================================
      // META MUSI OTRZYMAĆ 200
      // ==================================================

      return res
        .sendStatus(200);


    } catch (error) {

      console.error(
        "Błąd webhooka Instagram:",
        error
      );


      // ==================================================
      // NAWET PRZY BŁĘDZIE ZWRACAMY 200,
      // ABY META NIE WYSYŁAŁA TEGO SAMEGO EVENTU
      // W KÓŁKO.
      // ==================================================

      return res
        .sendStatus(200);
    }
  }
);
// ==================================================
// ADMIN - EDYCJA BARBERA
// ==================================================

app.get(
  "/admin/barbers/:id",
  requireAdmin,
  async (req, res) => {

    const barberId =
      Number(req.params.id);


    if (!Number.isInteger(barberId)) {

      return res.status(400).send(
        "Nieprawidłowe ID barbera."
      );
    }


    try {

      const barberResult =
        await pool.query(
          `
            SELECT
              id,
              name,
              instagram_user_id,
              address,
              booking_url,
              access_token

            FROM barbers

            WHERE id = $1
          `,
          [barberId]
        );


      if (
        barberResult.rows.length === 0
      ) {

        return res.status(404).send(
          "Nie znaleziono barbera."
        );
      }


      const barber =
        barberResult.rows[0];


      const servicesResult =
        await pool.query(
          `
            SELECT
              name,
              price

            FROM services

            WHERE barber_id = $1

            ORDER BY id ASC
          `,
          [barberId]
        );


      const hoursResult =
        await pool.query(
          `
            SELECT
              day,
              hours

            FROM opening_hours

            WHERE barber_id = $1

            ORDER BY id ASC
          `,
          [barberId]
        );


      const servicesText =
        servicesResult.rows
          .map(
            service =>
              `${service.name}|${service.price}`
          )
          .join("\n");


      const hoursText =
        hoursResult.rows
          .map(
            row =>
              `${row.day}|${row.hours}`
          )
          .join("\n");


      res.send(`
        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="UTF-8">

          <title>
            Edytuj barbera
          </title>

          <style>

            body {
              font-family: Arial, sans-serif;
              max-width: 900px;
              margin: 40px auto;
              padding: 20px;
            }

            input,
            textarea {
              width: 100%;
              padding: 10px;
              margin-top: 5px;
              margin-bottom: 15px;
              box-sizing: border-box;
            }

            label {
              font-weight: bold;
            }

            button {
              padding: 12px 20px;
              background: #111;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            }

            .danger {
              background: #b00020;
            }

            .hint {
              color: #666;
              font-size: 14px;
            }

          </style>

        </head>

        <body>

          <h1>
            Edytuj: ${escapeHtml(barber.name)}
          </h1>


          <form
            method="POST"
            action="/admin/barbers/${barber.id}"
          >

            <label>
              Nazwa
            </label>

            <input
              name="name"
              value="${escapeHtml(barber.name)}"
              required
            >


            <label>
              Instagram User ID
            </label>

            <input
              name="instagram_user_id"
              value="${escapeHtml(
                barber.instagram_user_id
              )}"
              required
            >


            <label>
              Adres
            </label>

            <input
              name="address"
              value="${escapeHtml(
                barber.address || ""
              )}"
            >


            <label>
              Link do rezerwacji
            </label>

            <input
              name="booking_url"
              value="${escapeHtml(
                barber.booking_url || ""
              )}"
            >


            <label>
              Instagram Access Token
            </label>

            <input
              name="access_token"
              type="password"
              value="${escapeHtml(
                barber.access_token || ""
              )}"
            >

            <p class="hint">
              Token jest przechowywany dla tego barbera.
            </p>


            <label>
              Usługi
            </label>

            <textarea
              name="services"
              rows="12"
            >${escapeHtml(servicesText)}</textarea>

            <p class="hint">
              Format:
              Nazwa|Cena
            </p>


            <label>
              Godziny otwarcia
            </label>

            <textarea
              name="opening_hours"
              rows="10"
            >${escapeHtml(hoursText)}</textarea>

            <p class="hint">
              Format:
              Dzień|Godziny
            </p>


            <button type="submit">
              Zapisz zmiany
            </button>

          </form>


          <br>


          <form
            method="POST"
            action="/admin/barbers/${barber.id}/delete"
            onsubmit="return confirm('Na pewno usunąć tego barbera?')"
          >

            <button
              class="danger"
              type="submit"
            >
              Usuń barbera
            </button>

          </form>


          <br>


          <a href="/admin">
            ← Wróć do listy
          </a>

        </body>

        </html>
      `);


    } catch (error) {

      console.error(
        "Błąd edycji barbera:",
        error
      );

      res.status(500).send(
        "Błąd serwera."
      );
    }
  }
);


// ==================================================
// ADMIN - AKTUALIZACJA BARBERA
// ==================================================

app.post(
  "/admin/barbers/:id",
  requireAdmin,
  async (req, res) => {

    const barberId =
      Number(req.params.id);


    if (!Number.isInteger(barberId)) {

      return res.status(400).send(
        "Nieprawidłowe ID barbera."
      );
    }


    const {
      name,
      instagram_user_id,
      address,
      booking_url,
      access_token,
      services,
      opening_hours
    } = req.body;


    const client =
      await pool.connect();


    try {

      await client.query(
        "BEGIN"
      );


      await client.query(
        `
          UPDATE barbers

          SET
            name = $1,
            instagram_user_id = $2,
            address = $3,
            booking_url = $4,
            access_token = $5

          WHERE id = $6
        `,
        [
          name.trim(),
          instagram_user_id.trim(),
          address?.trim() || null,
          booking_url?.trim() || null,
          access_token?.trim() || null,
          barberId
        ]
      );


      await client.query(
        `
          DELETE FROM services

          WHERE barber_id = $1
        `,
        [barberId]
      );


      await client.query(
        `
          DELETE FROM opening_hours

          WHERE barber_id = $1
        `,
        [barberId]
      );


      await saveServicesFromText(
        client,
        barberId,
        services
      );


      await saveOpeningHoursFromText(
        client,
        barberId,
        opening_hours
      );


      await client.query(
        "COMMIT"
      );


      res.redirect(
        `/admin/barbers/${barberId}`
      );


    } catch (error) {

      await client.query(
        "ROLLBACK"
      );


      console.error(
        "Błąd aktualizacji barbera:",
        error
      );


      if (
        error.code === "23505"
      ) {

        return res.status(400).send(
          "Ten Instagram User ID już istnieje."
        );
      }


      res.status(500).send(
        "Nie udało się zapisać zmian."
      );


    } finally {

      client.release();

    }
  }
);
// ==================================================
// START SERWERA
// ==================================================

async function startServer() {

  try {

    // ==================================================
    // INICJALIZACJA BAZY DANYCH
    // ==================================================

    await initializeDatabase();


    // ==================================================
    // URUCHOMIENIE EXPRESS
    // ==================================================

    app.listen(
      PORT,
      () => {

        console.log(
          `Server działa na porcie ${PORT}`
        );

        console.log(
          `Admin: /admin`
        );

        console.log(
          `Webhook: /webhook`
        );
      }
    );


  } catch (error) {

    console.error(
      "Błąd podczas uruchamiania serwera:",
      error
    );


    process.exit(1);
  }
}


// ==================================================
// START
// ==================================================

startServer();
