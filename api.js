var request = require('request');

try{
  var config = require('./config');
}catch(e){
  var config = JSON.parse(process.env.SOCKET_CONFIG);
}

module.exports = function(){
  var CAH_CREATOR_BASE = "http://localhost:3000/socket_api/";

  var _get = function(endpoint, qs, callback){
    qs = qs || {};
    qs.token = config.token;
    qs.secret = config.secret;

    request(CAH_CREATOR_BASE + endpoint, {
      qs: qs
    }, function(err, res, body){
      if(err){
        callback(err);
      }else{
        callback(null, (typeof(body) === "string" ? JSON.parse(body) : body));
      }
    });
  };

  var _post = function(endpoint, data, callback){
    var qs = {};
    qs.token = config.token;
    qs.secret = config.secret;

    request.post(CAH_CREATOR_BASE + endpoint, {
      qs: qs,
      json: true,
      body: data
    }, function(err, res, body){
      if(err){
        callback(err);
      }else{
        callback(null, (typeof(body) === "string" ? JSON.parse(body) : body));
      }
    });
  };

  var getUserWithToken = function(token, callback){
    _get("user_with_token/" + token, { }, callback);
  };

  var verifyAccessToDeck = function(token, deckId, callback){
    _get("has_access_to_deck/" + token + "/" + deckId, { }, callback);
  };

  var saveDeck = function(deckId, newDeck, callback){
    _post("save_deck", {
      deck_id: deckId,
      new_deck: newDeck
    }, callback);
  };

  return {
    getUserWithToken: getUserWithToken,
    verifyAccessToDeck: verifyAccessToDeck,
    saveDeck: saveDeck
  };
};
