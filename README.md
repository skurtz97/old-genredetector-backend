# genre-detector-backend

The old version of the backend to genre detector. Uses express js and doesn't  concurrently  query the Spotify API.

This implementation is much slower than I would like. The implementation using Express and Promise.all is faster, and the implementation
in Go using Wait groups is faster still.

For comparison:

When querying for a relatively large and general genre like rock, this implementation will return all 1000 results (the maximum offset Spotify API will allow),
the combination of 1000/50 = 20 requests, in ~7 seconds. This is very unresponsive, since the program waits for one request to complete before beginning the next request.

The Promise.all() method reduces this to about ~2 seconds since all the requests are sent concurrently. The Go implementation is even better and can 
complete all 20 requests in under a second, with less memory usage as well. I think this is because Go threads are much quicker to launch and Go has a relatively efficient scheduler, whereas NodeJS concurrency is more limited.
