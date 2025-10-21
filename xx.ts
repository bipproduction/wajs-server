import fetch from "node-fetch";
import fs from "fs";

const token = "EAALP22EWyC4BPrjshjjYBbPVKWp4Gp2ljkb7hCmgpZArLigB8XNmRoXBomDJm6aWnjpKpqehdVatbfFAHeGaQftGkNBp4Oyds9apr4lOQjG2YWYEzZC05ZAo7MARnfXn7FVua0iaeNMh2gunMZBd6pO58wjAUP3gqLiUrwASeOnJu5pW3tKg6fHubALBlQZDZD"; // dari Meta Developer > App > Access Token
const mediaId = "838467435201133"; // dari webhook

// 1. Dapatkan URL file asli
const mediaInfo = await fetch(
  `https://graph.facebook.com/v19.0/${mediaId}?access_token=${token}`
).then(res => res.json()) as any;

// mediaInfo.url berisi link unduhan sementara
const fileUrl = mediaInfo.url;

const fileResponse = await fetch(fileUrl, {
  headers: {
    Authorization: `Bearer ${token}`, // wajib!
  },
});

const buffer = await fileResponse.arrayBuffer();
fs.writeFileSync("sticker.webp", Buffer.from(buffer));

console.log("Sticker berhasil diunduh!");
