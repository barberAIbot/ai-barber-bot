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

          .hint {
            color: #666;
            font-size: 14px;
          }

        </style>

      </head>

      <body>

        <h1>
          + Dodaj barbera
        </h1>

        <form
          method="POST"
          action="/admin/barbers"
        >

          <label>
            Nazwa barbera / salonu
          </label>

          <input
            name="name"
            required
          >


          <label>
            Instagram User ID
          </label>

          <input
            name="instagram_user_id"
            required
          >

          <p class="hint">
            ID konta Instagram, które będzie odbierało wiadomości.
          </p>


          <label>
            Adres
          </label>

          <input
            name="address"
          >


          <label>
            Link do rezerwacji
          </label>

          <input
            name="booking_url"
          >


          <label>
            Instagram Access Token
          </label>

          <input
            name="access_token"
            type="password"
          >

          <p class="hint">
            Token tego konkretnego konta Instagram.
          </p>


          <label>
            Usługi
          </label>

          <textarea
            name="services"
            rows="10"
            placeholder="Strzyżenie|70
Broda|50
Strzyżenie + broda|110"
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
            rows="8"
            placeholder="Poniedziałek|9:00–19:00
Wtorek|9:00–19:00
Środa|9:00–19:00
Czwartek|9:00–19:00
Piątek|9:00–19:00
Sobota|9:00–15:00
Niedziela|zamknięte"
          ></textarea>

          <p class="hint">
            Jedna linia:
            Dzień|Godziny
          </p>


          <button type="submit">
            Dodaj barbera
          </button>

        </form>

        <br>

        <a href="/admin">
          ← Wróć
        </a>

      </body>

      </html>
    `);
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

      await client.query("BEGIN");


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


      await client.query("COMMIT");


      res.redirect("/admin");


    } catch (error) {

      await client.query("ROLLBACK");

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

      await client.query("BEGIN");


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


      await client.query("COMMIT");


      res.redirect(
        `/admin/barbers/${barberId}`
      );


    } catch (error) {

      await client.query("ROLLBACK");

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
        "Nieprawidłowe ID."
      );
    }


    try {

      await pool.query(
        `
          DELETE FROM barbers
          WHERE id = $1
        `,
        [barberId]
      );


      res.redirect("/admin");


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
// POMOCNICZE - ESCAPE HTML
// ==================================================

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==================================================
// POMOCNICZE - USŁUGI
// ==================================================

async function saveServicesFromText(
  db,
  barberId,
  text
) {

  if (!text) {
    return;
  }


  const lines =
    String(text)
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);


  for (const line of lines) {

    const separator =
      line.lastIndexOf("|");

    if (separator === -1) {
      continue;
    }


    const name =
      line
        .substring(0, separator)
        .trim();

    const priceText =
      line
        .substring(separator + 1)
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


    await db.query(
      `
        INSERT INTO services
        (
          barber_id,
          name,
          price
        )

        VALUES
        ($1, $2, $3)
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
// POMOCNICZE - GODZINY
// ==================================================

async function saveOpeningHoursFromText(
  db,
  barberId,
  text
) {

  if (!text) {
    return;
  }


  const lines =
    String(text)
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);


  for (const line of lines) {

    const separator =
      line.indexOf("|");

    if (separator === -1) {
      continue;
    }


    const day =
      line
        .substring(0, separator)
        .trim();

    const hours =
      line
        .substring(separator + 1)
        .trim();


    if (
      !day ||
      !hours
    ) {
      continue;
    }


    await db.query(
      `
        INSERT INTO opening_hours
        (
          barber_id,
          day,
          hours
        )

        VALUES
        ($1, $2, $3)
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
  // ROZMOWY
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
  // ==================================================
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
  // TESTOWY BARBER
  //
  // Jeżeli baza nie ma jeszcze barberów,
  // tworzymy obecnego testowego barbera.
  // ==================================================

  const barberCount =
    await pool.query(`
      SELECT COUNT(*)::integer AS count
      FROM barbers
    `);


  let testBarber;


  if (
    barberCount.rows[0].count === 0
  ) {

    const result =
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
          ($1, $2, $3, $4, $5)

          RETURNING id
        `,
        [
          INSTAGRAM_USER_ID,
          "Barber Whisky Shop Dębica",
          "ul. Kolejowa 18, 39-200 Dębica",
          "https://booksy.com/pl-pl/316593_barber-whisky-shop-debica_barber-shop_11501_debica#ba_s=sh_1",
          INSTAGRAM_ACCESS_TOKEN || null
        ]
      );


    testBarber =
      result.rows[0].id;


    const services = [
      ["Strzyżenie", 70],
      ["Broda", 50],
      ["Strzyżenie + broda", 110],
      ["Strzyżenie maszynką", 50],
      ["Skin fade", 80],
      ["Trymowanie brody", 50],
      ["Golenie królewskie", 60],
      ["Cover siwizny", 50],
      ["Depilacja nosa i uszu", 20],
      ["Mycie + stylizacja", 20]
    ];


    for (
      const [name, price]
      of services
    ) {

      await pool.query(
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
          (barber_id, name)
          DO NOTHING
        `,
        [
          testBarber,
          name,
          price
        ]
      );
    }


    const openingHours = [
      ["Poniedziałek", "9:00–19:00"],
      ["Wtorek", "9:00–19:00"],
      ["Środa", "9:00–19:00"],
      ["Czwartek", "9:00–19:00"],
      ["Piątek", "9:00–19:00"],
      ["Sobota", "9:00–15:00"],
      ["Niedziela", "zamknięte"]
    ];


    for (
      const [day, hours]
      of openingHours
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
          (barber_id, day)
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
      [instagramUserId]
    );


  if (
    barberResult.rows.length === 0
  ) {

    return null;
  }


  const barber =
    barberResult.rows[0];


  const servicesResult =
    await pool.query(
      `
        SELECT
          id,
          name,
          price

        FROM services

        WHERE barber_id = $1

        ORDER BY id ASC
      `,
      [barber.id]
    );


  const openingHoursResult =
    await pool.query(
      `
        SELECT
          id,
          day,
          hours

        FROM opening_hours

        WHERE barber_id = $1

        ORDER BY id ASC
      `,
      [barber.id]
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
      openingHoursResult.rows
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
// POBIERANIE / TWORZENIE ROZMOWY
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
          instagram_user_id
        )

        VALUES
        ($1, $2)

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
// WŁĄCZ / WYŁĄCZ AI
// ==================================================

async function setConversationAI(
  barberId,
  instagramUserId,
  aiActive
) {

  await pool.query(
    `
      INSERT INTO conversations
      (
        barber_id,
        instagram_user_id,
        ai_active
      )

      VALUES
      ($1, $2, $3)

      ON CONFLICT
      (
        barber_id,
        instagram_user_id
      )

      DO UPDATE SET
        ai_active = EXCLUDED.ai_active,
        updated_at = NOW()
    `,
    [
      barberId,
      instagramUserId,
      aiActive
    ]
  );
}


// ==================================================
// AI
// ==================================================

async function askAI(
  barberInstagramId,
  clientInstagramId,
  userMessage
) {

  try {

    const barber =
      await getBarberByInstagramId(
        barberInstagramId
      );


    if (!barber) {

      console.log(
        "Nie znaleziono barbera dla AI."
      );

      return null;
    }


    const history =
      await getConversationHistory(
        barber.id,
        clientInstagramId
      );


    // ==================================================
    // ZAPISUJEMY WIADOMOŚĆ KLIENTA
    // ==================================================

    await saveMessage(
      barber.id,
      clientInstagramId,
      "user",
      userMessage
    );


    // ==================================================
    // INFORMACJE O BARBERZE
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


    const openingHoursText =
      barber.openingHours.length > 0

        ? barber.openingHours
            .map(
              row =>
                `- ${row.day}: ${row.hours}`
            )
            .join("\n")

        : "Brak podanych godzin.";


    // ==================================================
    // HISTORIA
    // ==================================================

    const historyText =
      history.length > 0

        ? history
            .map(
              item =>
                `${item.role === "user"
                  ? "Klient"
                  : "AI"
                }: ${item.message}`
            )
            .join("\n")

        : "Brak wcześniejszej historii.";


    // ==================================================
    // PROMPT
    // ==================================================

    const systemPrompt = `
Jesteś wirtualną recepcjonistką barbera.

Odpowiadasz klientom po polsku.

Twoim zadaniem jest pomagać klientom w sprawach związanych
z konkretnym barberem.

NAJWAŻNIEJSZA ZASADA:

Korzystaj WYŁĄCZNIE z informacji przekazanych poniżej.

NIE WYMYŚLAJ:
- cen,
- usług,
- godzin otwarcia,
- adresu,
- linków,
- promocji,
- terminów,
- dostępności,
- informacji o barberze.

Jeżeli klient pyta o coś, czego nie ma w przekazanych
informacjach, powiedz krótko, że barber może podać
dokładną informację.

Nie udawaj, że możesz sprawdzić kalendarz,
jeżeli nie masz dostępu do kalendarza.

Jeżeli klient chce umówić wizytę,
podaj link do rezerwacji, jeżeli jest dostępny.

Odpowiedzi powinny być krótkie, naturalne
i przyjazne.

Nie pisz długich wyjaśnień.

INFORMACJE O BARBERZE:

Nazwa:
${barber.name}

Adres:
${barber.address || "Brak informacji"}

Link do rezerwacji:
${barber.bookingUrl || "Brak linku"}

USŁUGI I CENY:

${servicesText}

GODZINY OTWARCIA:

${openingHoursText}

HISTORIA ROZMOWY:

${historyText}
`;


    // ==================================================
    // OPENAI
    // ==================================================

    if (!OPENAI_API_KEY) {

      console.error(
        "Brak OPENAI_API_KEY."
      );

      return null;
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
              model: "gpt-5.6-luna",

              input: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: userMessage
                }
              ]
            })
        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "Błąd OpenAI:",
        response.status,
        errorText
      );

      return null;
    }


    const data =
      await response.json();


    let aiResponse = "";


    if (
      typeof data.output_text === "string"
    ) {

      aiResponse =
        data.output_text.trim();

    } else if (
      Array.isArray(data.output)
    ) {

      for (
        const outputItem
        of data.output
      ) {

        if (
          !Array.isArray(
            outputItem.content
          )
        ) {
          continue;
        }


        for (
          const contentItem
          of outputItem.content
        ) {

          if (
            contentItem.type ===
            "output_text"
            &&
            typeof contentItem.text ===
            "string"
          ) {

            aiResponse +=
              contentItem.text;
          }
        }
      }


      aiResponse =
        aiResponse.trim();
    }


    if (!aiResponse) {

      console.log(
        "OpenAI nie zwróciło tekstu."
      );

      return null;
    }


    // ==================================================
    // ZAPIS ODPOWIEDZI AI
    // ==================================================

    await saveMessage(
      barber.id,
      clientInstagramId,
      "assistant",
      aiResponse
    );


    return aiResponse;


  } catch (error) {

    console.error(
      "Błąd askAI:",
      error
    );

    return null;
  }
}


// ==================================================
// INSTAGRAM - WYSYŁANIE WIADOMOŚCI
// ==================================================

async function sendInstagramMessage(
  barberInstagramId,
  recipientId,
  message
) {

  try {

    const barber =
      await getBarberByInstagramId(
        barberInstagramId
      );


    if (!barber) {

      console.error(
        "Nie znaleziono barbera przy wysyłaniu."
      );

      return false;
    }


    const accessToken =
  barber.accessToken;

if (!accessToken) {
  console.error(
    `Brak Instagram Access Token dla barbera ${barber.id}.`
  );

  return false;
}


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
                id: recipientId
              },

              message: {
                text: message
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
        "Błąd Instagram Send API:",
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


  } catch (error) {

    console.error(
      "Błąd sendInstagramMessage:",
      error
    );

    return false;
  }
}


// ==================================================
// META WEBHOOK - WERYFIKACJA
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
        "Webhook zweryfikowany."
      );

      return res.status(200).send(
        challenge
      );
    }


    return res.sendStatus(403);
  }
);


// ==================================================
// META WEBHOOK - ODBIERANIE WIADOMOŚCI
// ==================================================

app.post(
  "/webhook",
  async (req, res) => {

    try {

      console.log(
        "==============================="
      );

      console.log(
        "NOWY WEBHOOK"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );


      // ==================================================
      // SPRAWDZAMY EVENT
      // ==================================================

      if (
        req.body.object !==
        "instagram"
      ) {

        return res.sendStatus(200);
      }


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

          const senderId =
            event.sender &&
            event.sender.id;


          const recipientId =
            event.recipient &&
            event.recipient.id;


          const message =
            event.message;


          const messageText =
            message &&
            typeof message.text ===
              "string"
              ? message.text.trim()
              : "";


          const isEcho =
            message &&
            message.is_echo === true;


          // ==================================================
          // IGNORUJEMY ECHO
          // ==================================================

          if (isEcho) {

            console.log(
              "Ignorujemy echo wiadomości."
            );

            continue;
          }


          // ==================================================
          // IGNORUJEMY INNE EVENTY
          // ==================================================

          if (
            !senderId ||
            !recipientId ||
            !messageText
          ) {

            console.log(
              "Webhook nie zawiera wiadomości tekstowej."
            );

            continue;
          }


          console.log(
            `Wiadomość od ${senderId}: ${messageText}`
          );


          // ==================================================
          // SPRAWDZAMY BARBERA
          // ==================================================

          const barber =
            await getBarberByInstagramId(
              recipientId
            );


          if (!barber) {

            console.log(
              `Brak barbera dla Instagram ID: ${recipientId}`
            );

            continue;
          }


          console.log(
            `Wiadomość należy do barbera: ${barber.name}`
          );


          // ==================================================
          // POBIERAMY / TWORZYMY ROZMOWĘ
          // ==================================================

          const conversation =
            await getOrCreateConversation(
              barber.id,
              senderId
            );


          console.log(
            `AI dla rozmowy ${senderId}: ${
              conversation.ai_active
                ? "WŁĄCZONE"
                : "WYŁĄCZONE"
            }`
          );


          // ==================================================
          // AI WYŁĄCZONE
          // ==================================================

          if (
            !conversation.ai_active
          ) {

            await saveMessage(
              barber.id,
              senderId,
              "user",
              messageText
            );


            console.log(
              `AI wyłączone - brak odpowiedzi dla ${senderId}`
            );

            continue;
          }


          // ==================================================
          // AI
          // ==================================================

          const aiResponse =
            await askAI(
              recipientId,
              senderId,
              messageText
            );


          if (
            !aiResponse ||
            !aiResponse.trim()
          ) {

            console.log(
              "AI nie zwróciło tekstu."
            );

            continue;
          }


          // ==================================================
          // ODPOWIEDŹ NA INSTAGRAMIE
          // ==================================================

          await sendInstagramMessage(
            recipientId,
            senderId,
            aiResponse
          );


          console.log(
            "Cały proces zakończony poprawnie."
          );
        }
      }


      res.sendStatus(200);


    } catch (error) {

      console.error(
        "==============================="
      );

      console.error(
        "BŁĄD:"
      );

      console.error(
        error
      );

      res.sendStatus(200);
    }
  }
);


// ==================================================
// START SERWERA
// ==================================================

async function startServer() {

  try {

    await initializeDatabase();


    app.listen(
      PORT,
      () => {

        console.log(
          "================================"
        );

        console.log(
          `AI Barber Bot działa na porcie ${PORT}`
        );

        console.log(
          "================================"
        );
      }
    );


  } catch (error) {

    console.error(
      "Błąd podczas uruchamiania serwera:"
    );

    console.error(
      error
    );

    process.exit(1);
  }
}


startServer();
