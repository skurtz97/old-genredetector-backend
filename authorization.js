require("dotenv").config();

const auth_str = `Basic   ${Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64")}`;

const auth_request_config = {
  method: "post",
  url: "https://accounts.spotify.com/api/token",
  headers: {
    Authorization: auth_str,
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  data: "grant_type=client_credentials",
};

module.exports = auth_request_config;
