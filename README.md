# cah-creator-socket

The WebSocket part of CAH Creator. Allows for live updates and collaboration.

## Sessions

Everything here works based on *sessions*. Here's how it works:

1. User connects
2. User either sends auth token or session ID/token pair.
  - If auth token:
    1. Session server contacts cahcreator.com to verify auth token
  - If session ID/token:
    1. Session server verifies locally if session with ID exists and that it has the matching token.
3. Once authenticated:
  - If auth token:
    1. Session server contacts cahcreator.com again, this time verifying if the user has access to the deck.
    2. If `has_access` is true (or user is admin), create a session and send the deck information to the user.
  - If session ID/token:
    1. Send deck information over to user (authentication is implied).
    2. Add them to session.
