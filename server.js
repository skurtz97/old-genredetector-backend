const express = require("express");
const cors = require("cors");
const axios = require("axios");
const qs = require("qs");
const auth_request_config = require("./authorization");

const get_access_token = async () => {
  try {
    const access_token = await axios(auth_request_config);
    return access_token.data.access_token;
  } catch (error) {
    console.log(error);
    res.json(error);
  }
};

const artist_simplify = (artist) => {
  return {
    name: artist.name,
    popularity: artist.popularity,
    followers: artist.followers.total,
    uri: artist.uri,
    url: artist.external_urls.spotify,
    genres: artist.genres,
  };
};

const track_simplify = (track) => {
  return {
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    popularity: track.popularity,
    uri: track.uri,
    url: track.external_urls.spotify,
  };
};

const artist_search = async (q, offset, access_token) => {
  const query_str = qs.stringify({
    query: q,
    type: "artist",
    limit: 50,
    offset: offset,
  });
  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/search?${query_str}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  console.log(search_config.url);
  const results = await axios(search_config);
  return results;
};

const artist_search_id = async (id, access_token) => {
  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/artists/${id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  console.log(search_config.url);
  const results = await axios(search_config);
  return results;
};

const genre_search = async (q, offset, access_token) => {
  const query_str = qs.stringify({
    query: `genre:\"${q}\"`,
    type: "artist",
    limit: 50,
    offset: offset,
  });
  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/search?${query_str}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  console.log(search_config.url);
  const results = await axios(search_config);
  return results;
};

const track_search = async (q, offset, access_token) => {
  const query_str = qs.stringify({
    query: `track:\"${q}\"`,
    type: "track",
    limit: 50,
    offset: offset,
  });
  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/search?${query_str}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  console.log(search_config.url);
  const results = await axios(search_config);
  return results;
};

const track_search_id = async (id, access_token) => {
  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/tracks/${id}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  console.log(search_config.url);
  const results = await axios(search_config);
  return results;
};
const app = express();
app.use(cors());

//////////////////////////////////////////* ROUTES */////////////////////////////////////////////////////

app.get("/auth", async (req, res) => {
  try {
    const access_token = await get_access_token();
    console.log(access_token);
    res.send(access_token);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send(`Error: ${error.message}`);
  }
});

app.get("/genre", async (req, res) => {
  console.log(`Beginning genre search for ${req.query.genre}`);
  try {
    const access_token = await get_access_token();

    let offset = 0;
    let response = await genre_search(req.query.genre, offset, access_token);
    let artists = [].concat(response.data.artists.items);
    const total = response.data.artists.total;
    offset += 50;

    while (offset < 1000 && offset < total) {
      response = await genre_search(req.query.genre, offset, access_token);
      artists = artists.concat(response.data.artists.items);
      offset += 50;
    }

    artists = artists.map(artist_simplify);
    artists = artists.filter((artist) => {
      const index = artist.genres.indexOf(req.query.genre);
      if (index != -1) {
        const temp = artist.genres[0];
        artist.genres[0] = artist.genres[index];
        artist.genres[index] = temp;
        return true;
      } else {
        return false;
      }
    });
    artists = artists.sort((a, b) => b.popularity - a.popularity);

    res.send(artists);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send(`Error: ${error.message}`);
  }
});

app.get("/artists", async (req, res) => {
  console.log(`Begining artist search for ${req.query.name}`);

  try {
    const access_token = await get_access_token();

    let offset = 0;
    let response = await artist_search(req.query.name, offset, access_token);
    let artists = [].concat(response.data.artists.items);
    const total = response.data.artists.total;
    offset += 50;

    while (offset < 1000 && offset < total) {
      response = await artist_search(req.query.name, offset, access_token);
      artists = artists.concat(response.data.artists.items);
      offset += 50;
    }

    artists = artists.map(artist_simplify);
    artists = artists.sort((a, b) => b.popularity - a.popularity);

    res.send(artists);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send([]);
  }
});

app.get("/artist/:id", async (req, res) => {
  console.log(`Beginning artist search for ${req.params.id}`);

  try {
    const access_token = await get_access_token();
    const response = await artist_search_id(req.params.id, access_token);
    let artist = response.data;
    artist = artist_simplify(artist);
    console.log(artist);
    res.send([].concat(artist));
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send([]);
  }
});

app.get("/tracks", async (req, res) => {
  console.log(`Begining track search for ${req.query.name}`);
  try {
    const access_token = await get_access_token();

    let offset = 0;
    let response = await track_search(req.query.name, 0, access_token);
    let tracks = [].concat(response.data.tracks.items);
    const total = response.data.tracks.total;

    offset += 50;
    while (offset < 1000 && offset < total) {
      response = await track_search(req.query.name, offset, access_token);
      tracks = tracks.concat(response.data.tracks.items);
      offset += 50;
    }

    tracks = tracks.map(track_simplify);
    tracks = tracks.sort((a, b) => b.popularity - a.popularity);

    res.send(tracks);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send(`Error: ${error.message}`);
  }
});

app.get("/track/:id", async (req, res) => {
  console.log(`Beginning track search for ${req.params.id}`);

  try {
    console.log(req.params.id);
    const access_token = await get_access_token();
    const response = await track_search_id(req.params.id, access_token);
    let track = response.data;
    track = track_simplify(track);
    res.send([].concat(track));
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.send([]);
  }
});

const PORT = process.env.PORT || 8080;
// Listen to the App Engine-specified port, or 8080 otherwise. If running locally, change this to whatever port is available.
app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
