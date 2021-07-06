# Rod of Discord

Rod 2.0 is released! You can check out https://rodbot.io/ for reference and guides.

Join the discord: https://discord.gg/MvdRurG

# For Developers
I'm going to sort of assume you know how to program and have used Rod before for the next bit, and just do a high-level overview. Rod2 uses an express.js type of structure to handle messages and is backed by a Mongo database, which we access with the Mongoose driver.

```css
Discord message received
   |
   |
   V
Create RodRequest and RodResponse objects
   |
   |
   V
Determine if bot should process message
via escape char etc.
   |
   |
   V
Run pre-processing middleware
   |
   |
   V
Run the handler
   |
   |
   V
Run post-processing middleware
   |
   |
   V
Send message response
```

Middleware and handlers are auto-detected by just dropping the files in the corresponding folders. You'll see a message on start-up about what's been detected.

## RodRequest and RodResponse
RodRequest holds all the information about the incoming message. The actual message object, the author, the server it was sent on, etc. The RodResponse object hold everything about the message we're going to send in response (if any).


## Handlers
Handlers in Rod2 are groups of commands with similar functionality, but if you so chose, each command could have their own handler. You'll also see a few of the handlers are subclasses of MultiCommandHandler, which just abstracts away some of the nitty gritty about processing the commands. 

## Middleware
Middleware is processing that happens to a message before the command (if there is one) is processed. This is where logic like "is this author supposed to be talking as an alias" sort of things are processed. Negative priority middleware is simply processed after the handler goes. For instance the "call" middleware runs after the handler because it wants to detect rolls after they've been processed.

## Questions
If you have any questions, hop in the Discord and ask.
