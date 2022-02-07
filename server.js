const express = require("express");
const cors = require("cors");
const axios = require("axios");
const qs = require("qs");
const auth_request_config = require("./authorization");

/**
 * Performs a post request at https://accounts.spotify.com/api/token.
 * @returns - A Spotify API access token.
 */
const get_access_token = async () => {
  try {
    const access_token = await axios(auth_request_config);
    return access_token.data.access_token;
  } catch (error) {
    console.log(error);
    res.json(error);
  }
};

/**
 * Performs a get request at https://api.spotify.com/v1/search using the provided query string and search type.
 * @param {string} q - The search query.
 * @param {string} type - Either "artist" or "track".
 * @returns - The result of the search.
 */

/**
 *
 * @param {[{}]} artists - The array of artists that is received from Spotify upon conducting a search of type artist.
 * @returns - An array of artists where each artist object contains only name, popularity, and uri.
 */
const artists_simplify = (artists) => {
  return artists.map((artist) => ({
    name: artist.name,
    popularity: artist.popularity,
    uri: artist.uri,
    genres: artist.genres,
  }));
};

/**
 * Logs information to console about the most recent request. This function is intended to help with troubleshooting when doing multiple requests sequentially in a loop.
 * @param {number} count - The  request number (what request this was in the sequence). Starts at 1 for the first request.
 * @param {number} received - The number of items received in the request.
 * @param {number} received_total - The number of items received total.
 * @param {number} total - The number of items in the result set (Spotify API should return this on the first request, but we need to investigate further to find out why it changes).
 * @param {number} to_request - The number of items left to request.
 * @param {boolean} filtered - If the results have been filtered.
 */
const log_received_items = (
  count,
  received,
  received_total,
  num_filtered,
  total_collected,
  total
) => {
  console.log(`${received} artists received on request ${count}`);
  console.log(`${received_total} artists received in total`);
  console.log(`${num_filtered} artists filtered out`);
  console.log(`${received - num_filtered} artists to keep after filtering`);
  console.log(`${total} items in result set`);
  console.log(`${total_collected} items collected`);
  console.log(`${total - received_total} items left to request`);
  console.log("\n");
};

const search = async (q, t, offset, access_token) => {
  let query_str = "";
  if (t === "genre") {
    query_str = qs.stringify({
      query: `genre:\"${q}\"`,
      type: "artist",
      limit: 50,
      offset: offset,
    });
  } else {
    query_str = qs.stringify({
      query: q,
      type: t,
      limit: 50,
      offset: offset,
    });
  }

  console.log(`Initializing search with query_str: ${query_str}`);

  const search_config = {
    method: "get",
    url: `https://api.spotify.com/v1/search?${query_str}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + access_token,
    },
  };
  const results = await axios(search_config);
  return results;
};

// Set up CORS policy.
const allowed_origins = ["http://localhost:3000"];
/*const cors_options = {
  origin: function (origin, callback) {
    if (allowed_origins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
//};
*/
// Create server.
const app = express();
app.use(cors());

//////////////////////////////////////////* ROUTES */////////////////////////////////////////////////////

// Index route just sends a test JSON object. Just to test if server is running. Okay to have this on the live server.
app.get("/", (req, res) => {
  res.send("Hello to Genre Detector API");
});

//A route that gets a new access token. Just for testing get_access_token function, should be commented out when server is live.
app.get("/auth", async (req, res) => {
  try {
    const access_token = await get_access_token();
    console.log(access_token);
    res.send(access_token);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.json({ status: 500, msg: `Error: ${error.message}` });
  }
});

// Route that sends requests to Spotify API search endpoint.
app.get("/artists", async (req, res) => {
  try {
    const access_token = await get_access_token();
    const { name } = req.query;
    console.log(`Beginning search for artist: ${name} ...`);

    let count = 1;
    let offset = 0;
    let results = await search(name, "artist", offset, access_token);
    let items = artists_simplify(results.data.artists.items);
    let total = results.data.artists.total;

    // Spotify only sends 50 items per request, so now that we know the total number of items, we continue to request more items using the offset until we have requested all the remaining items that match our query.

    /**
     * @todo Update this using Promise.all() to request the rest of the items concurrently, but we should wait to do that until we have figured out what is going on with the dissapearing items in the total.
     * EXAMPLE OF MISSING ITEMS: On first request, total will be 210, on second request total will be 208, after the final request total will be 205, and we will have received 205 items. So the 'total' is innacurate and this
     * makes doing concurrent requests slightly innacurate. We will have to do one extra request and make sure the result is empty in order to ensure we really get all the items if we do requests concurrently. I suppose Spotify the database
     * is not 100% up to date at all times and Spotify sometimes thinks some artists are in the results that are no longer there.
     *
     * @note Offset is limited to 1000, so that is the most items we can possibly get. If we receive 1000 items, tell the user to be more specific, and just display the first 1000 (which should already be getting
     * sent over based on popularity and relevance ).
     */

    while (items.length < total && offset < 1000) {
      // Increment count and offset
      count += 1;
      offset += 50;

      // Request items at new offset and store in newItems.
      results = await search(name, "artist", offset, access_token);
      let newItems = artists_simplify(results.data.artists.items);

      // !!!!!!!!!!!!!!!!!!!!!!! Update the total. INVESTIGATE WHY THIS CHANGES UPON SUBSEQUENT REQUESTS? IS THE INITIAL TOTAL NOT ACCURATE ?!?!?!?!?! !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      total = results.data.artists.total;

      // Log what we received and our progress.
      log_received_items(
        count,
        newItems.length,
        newItems.length + items.length,
        total
      );

      // Concatenate the new items received into our items array.
      items = items.concat(newItems);
    }

    res.json({ status: 200, msg: items });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.json({ status: 500, msg: `Error: ${error.message}` });
  }
});

const filterOnGenres = (items, searchGenre) => {
  return items.filter((item) => {
    const index = item.genres.indexOf(searchGenre);
    if (index !== -1) {
      // swap first item and searched for item so that it appears first in list
      let temp = item.genres[0];
      item.genres[0] = item.genres[index];
      item.genres[index] = temp;
      return true;
    } else {
      return false;
    }
  });
};
app.get("/genres", async (req, res) => {
  try {
    const access_token = await get_access_token();
    const searchGenre = req.query.genre;
    console.log(`Beginning search for artists of genre: ${searchGenre} ...`);

    let count = 1;
    let offset = 0;
    let results = await search(searchGenre, "genre", offset, access_token);
    let total = results.data.artists.total;
    let received_total = results.data.artists.items.length;
    let items = filterOnGenres(
      artists_simplify(results.data.artists.items),
      searchGenre
    );

    // Spotify only sends 50 items per request, so now that we know the total number of items, we continue to request more items using the offset until we have requested all the remaining items that match our query.

    /**
     * @todo Update this using Promise.all() to request the rest of the items concurrently, but we should wait to do that until we have figured out what is going on with the dissapearing items in the total.
     * EXAMPLE OF MISSING ITEMS: On first request, total will be 210, on second request total will be 208, after the final request total will be 205, and we will have received 205 items. So the 'total' is innacurate and this
     * makes doing concurrent requests slightly innacurate. We will have to do one extra request and make sure the result is empty in order to ensure we really get all the items if we do requests concurrently. I suppose Spotify the database
     * is not 100% up to date at all times and Spotify sometimes thinks some artists are in the results that are no longer there.
     *
     * @note Offset is limited to 1000, so that is the most items we can possibly get. If we receive 1000 items, tell the user to be more specific, and just display the first 1000 (which should already be getting
     * sent over based on popularity and relevance ).
     */

    count += 1;
    offset += 50;
    while (offset < 1000 && total - received_total != 0) {
      // Increment count and offset

      // Request items at new offset and store in newItems.
      results = await search(searchGenre, "genre", offset, access_token);
      total = results.data.artists.total;
      received_total += results.data.artists.items.length;
      const newItems = artists_simplify(results.data.artists.items);
      const items_received = newItems.length;
      const filteredItems = filterOnGenres(newItems, searchGenre);
      const num_filtered = items_received - filteredItems.length;
      log_received_items(
        count,
        items_received,
        received_total,
        num_filtered,
        items.length + filteredItems.length,
        total
      );

      // Concatenate the new items received into our items array.
      items = items.concat(filteredItems);
      count += 1;
      offset += 50;
    }

    res.json({ status: 200, msg: items });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    res.json({ status: 500, msg: `Error: ${error.message}` });
  }
});
// Listen for requests on port 5000
app.listen(5000, () => console.log(`Listening for authorization on port 5000`));
