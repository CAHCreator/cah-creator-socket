var express = require('express'),
    app = express(),
    api = require('./api')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    sessions = { };

// app.use(express.static(__dirname + "/public"));

var randId = function(){
  var id = "";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(var i=0; i < 10; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));

  return id;
};

io.on("connection", function(socket){
  socket.emit("hello");

  socket.on("authenticate", function(token){
    api.getUserWithToken(token, function(err, res){
      if(!err){
        socket.token = token;
        socket.authenticated = true;
        socket.emit("authenticated", res);
      }
    });
  });

  socket.on("authenticate:session", function(auth){
    if(sessions[auth.sessionId] && sessions[auth.sessionId].token === auth.sessionToken){
      var session = sessions[auth.sessionId];

      var complete = function(){
        socket.session = sessions[auth.sessionId];
        socket.sessionId = auth.sessionId;
        socket.session.editorCount++;
        socket.join(auth.sessionId);

        socket.emit("session", {
          sessionId: auth.sessionId,
          sessionToken: auth.sessionToken,
          deck: socket.session.deck
        });
      };

      if(session.editorCount >= 2){
        if(!session.premium){
          socket.emit("session:needpremium");
          socket.disconnect();
        }else{
          complete();
        }
      }else{
        complete();
      }
    }
  });

  socket.on("deck:load", function(id){
    api.verifyAccessToDeck(socket.token, id, function(err, res){
      // admin power!
      if(res.has_access || res.user.admin && res.deck){
        var sessionId = randId(),
            sessionToken = randId();

        sessions[sessionId] = {
          token: sessionToken,
          deck: res.deck,
          editorCount: 1,
          premium: res.user.premium
        };

        socket.session = sessions[sessionId];
        socket.sessionCreator = true;
        socket.sessionId = sessionId;
        socket.join(sessionId);

        socket.emit("session", {
          sessionId: sessionId,
          sessionToken: sessionToken,
          deck: socket.session.deck
        });
      }
    });
  });

  socket.on("deck:card:black", function(card){
    if(socket.session && parseInt(card.pick) !== NaN && parseInt(card.pick) > 0 && card.text.trim() !== "" && card.pick.trim() !== ""){
      socket.session.deck.black_cards.push({ text: card.text, pick: parseInt(card.pick) });
      socket.to(socket.sessionId).emit("deck:card:black", { text: card.text, pick: parseInt(card.pick) });
      socket.emit("deck:card:black", { text: card.text, pick: parseInt(card.pick) });
    }
  });

  socket.on("deck:card:white", function(card){
    if(socket.session && card.trim() !== ""){
      socket.session.deck.white_cards.push(card);
      socket.to(socket.sessionId).emit("deck:card:white", card);
      socket.emit("deck:card:white", card);
    }
  });

  socket.on("deck:card:black:edit", function(card){
    if(socket.session && socket.session.deck.black_cards[card.index] && parseInt(card.pick) !== NaN && parseInt(card.pick) > 0 && card.text.trim() !== "" && card.pick.trim() !== ""){
      socket.session.deck.black_cards[card.index] = { text: card.text, pick: parseInt(card.pick) };
      socket.to(socket.sessionId).emit("deck:card:black:edit", card);
      // we don't want to send it to the client because it already sees it as edited.
      // socket.emit("deck:card:black:edit", card);
    }
  });

  socket.on("deck:card:white:edit", function(card){
    if(socket.session && socket.session.deck.white_cards[card.index] && card.text.trim() !== ""){
      socket.session.deck.white_cards[card.index] = card.text;
      socket.to(socket.sessionId).emit("deck:card:white:edit", card);
      // we don't want to send it to the client because it already sees it as edited.
      // socket.emit("deck:card:white:edit", card);
    }
  });

  socket.on("deck:save", function(){
    if(socket.session && socket.sessionCreator){
      api.saveDeck(socket.session.deck.id, socket.session.deck, function(err, res){
        if(!err){
          socket.to(socket.sessionId).emit("session:end");
          socket.emit("session:end");
          sessions[socket.sessionId] = undefined;
        }
      });
    }
  });

  socket.on("deck:name", function(name){
    if(socket.session && socket.session.deck && name.trim() !== ""){
      socket.session.deck.name = name;
      socket.to(socket.sessionId).emit("deck:name", name);
    }
  });

  socket.on("disconnect", function(){
    if(socket.sessionCreator){
      socket.to(socket.sessionId).emit("session:end");
      sessions[socket.sessionId] = undefined;
    }else if(socket.session){
      socket.session.editorCount--;
    }
  });
});

app.get("/", function(req, res){
  res.redirect("https://cahcreator.com/");
});

http.listen(process.env.PORT || 8080);
