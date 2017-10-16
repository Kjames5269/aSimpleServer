const http = require('http');
const DB = require('./database.js');
const Promise = require('bluebird');
const express = require('express');
var app = express();

function getManga(manga) {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest();
    request.open('GET', 'http://www.mangaeden.com/api/manga/' + manga._id, true);
    request.onreadystatechange = function(){
    if (request.readyState === 4 && request.status === 200){
      var response = JSON.parse(request.response)
      var latestChapter = response.chapters[0][0];
      var charr = response.chapters[0];
      var chName=charr[2].split(/[^A-Za-z ]/)[0];
        if (latestChapter == manga.ch ) {
          resolve({name: manga.name, chName: chName, ch: charr[0], id: charr[3]})
        }
        else {
          reject("Not out yet");
        }
      }
    };
    request.send();
  });
}

app.listen(8080);

app.get('/', (request, response) => {
  response.send("Some text for now");
})
/*Ihttp.createServer((request, response) => {
  const { headers, method, url } = request;
  var body = [];

  if( method === 'GET' && url === '/mangaList') {
    request.on('error', (err) => {
      console.error(err);
    }).on('end', () => {

      var list = DB.getList().then((doc) => {
        var promises = [];
        doc.forEach((e) => {
          promises.push(getManga(e));
        });
        Promise.all(promises).then((manga) => {
          body = manga;
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json');

          const responseBody = { headers, method, url, body };

          response.end(JSON.stringify(responseBody));
        });
      });
    });
  }
  else if( method === 'GET' && url === '/next') {

  }
  else if ( method === 'POST' && url === '/mangaList') {

  }
  else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080); */
