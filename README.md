# genre-detector-backend

The old version of the backend to genre detector. Uses express js and doesn't  concurrently  query the Spotify API.

This implementation is much slower than I would like. The implementation using Express and Promise.all is faster, and the implementation
in Go using Wait groups is faster still.
