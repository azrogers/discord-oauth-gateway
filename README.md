# discord-oauth

This is a generic oauth gateway for Discord. The idea is that you set this up once on your server and then you can write many different applications that all use this server for authentication, so you don't have to implement the entire Discord OAuth flow for each app you write.

## Flow

First, you assign your app ID and redirect in config.json. Then you make a GET request to /auth with the url parameter `appid=<the app id you set in config.json>`. This will send the user through the regular Discord auth flow.

Once the user has completed the flow, they will be send back to the redirect URL you specified in config.json, with the URL parameter `userkey=<random data>`. You should then make a GET request back to `/auth/verify` with the same URL parameter, which will give you the result of the auth flow and the data of the user. This user key should only be used once.

The response to `/auth/verify` should look like this:
```
{
    "valid": false,
    "error": "Error message."
}
```
Or if you did it right, like this:
```
{
    "valid": true,
    "data": {
        // the exact response from the Discord API will be here
    }
}
```


## Config
It's pretty simple:
```
{
    "discord": {
        "id": "", // your discord API key goes here
        "secret": "", // your discord API secret goes here
        "scopes": ["identify", "guilds"] // the scopes you want from the discord API go here
    },
    "port": 3001, // the port to listen on
    "session_secret": "", // the secret used for session storage
    "url": "http://localhost:3001", // the URL of the app
    "apps": { 
        "app ID": "redirect URL" // each app should be filled out like this
    }
}
```