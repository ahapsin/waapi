const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// Create a flag to track client readiness
let isWhatsAppClientReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // You might need to add args for headless mode or other settings
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
  isWhatsAppClientReady = true; // Set flag to true when client is ready
});

client.on("authenticated", (session) => {
    console.log('WhatsApp client authenticated!');
});

client.on("auth_failure", msg => {
    console.error('Authentication failed!', msg);
});

client.on("disconnected", (reason) => {
    console.log('Client was disconnected', reason);
    isWhatsAppClientReady = false; // Reset flag if disconnected
    // Optionally re-initialize here if you want to automatically reconnect
    // client.initialize();
});


client.on("message", (msg) => {
  if (msg.body == "!ping") {
    msg.reply("pong");
  }
  if (msg.body === "!link") {
    const chatId = msg.from;
    const message = "Check out this link: https://www.example.com";
    client.sendMessage(chatId, message);
  }
});

// Initialize WhatsApp client
client.initialize();

// Express middleware for parsing request bodies
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Webhook endpoint
app.post("/webhook", async (req, res) => { // Mark as async because we use await
  console.log("Webhook Diterima!");
  console.log("Header:", req.headers);
  console.log("Body:", req.body);

  const targetNumber = req.body?.target; // Replace with the actual recipient's number
  const chatId = targetNumber + "@c.us";
  const messageToSend = req.body?.message; // Define the message

  if (isWhatsAppClientReady) {
    try {
      await client.sendMessage(chatId, messageToSend);
      console.log(`Message '${messageToSend}' sent to ${targetNumber} via webhook.`);
      res.status(200).send("Webhook Berhasil Diterima dan Pesan Dikirim");
    } catch (error) {
      console.error(`Failed to send message via webhook to ${targetNumber}:`, error);
      res.status(500).send("Webhook Diterima tapi Gagal Mengirim Pesan");
    }
  } else {
    console.warn("Webhook Diterima tapi WhatsApp client belum siap. Pesan tidak terkirim.");
    res.status(503).send("Webhook Diterima tapi WhatsApp client belum siap"); // Service Unavailable
  }
});

// Root endpoint for checking server status
app.get("/", (req, res) => {
  res.send("Server webhook sedang berjalan. Kirim POST ke /webhook");
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server webhook berjalan di http://localhost:${port}`);
  console.log(`Menunggu POST request di http://localhost:${port}/webhook`);
});