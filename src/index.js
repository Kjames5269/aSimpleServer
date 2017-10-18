const http = require('http');
const DB = require('./database.js');
const Promise = require('bluebird');
const express = require('express');
const BP = require('body-parser');
const REQ = require('request');

var app = express();
app.use(BP.urlencoded({ extended: true }));

//DB.insertInto("kjames", "Manga!", "123123", 1);
//DB.updateCh("kjames", "123123");
//DB.setCh("kjames", "541aabc045b9ef49009d69b6", 290);

function getChapter(chapters, ch) {
  return chapters.filter((e) => {
    return e[0] == ch;
  })[0];
  //  Return only the first element of the 2d array
}

function getManga(manga) {
  return new Promise((resolve, reject) => {
    const url = 'http://www.mangaeden.com/api/manga/' + manga.id;

    REQ.get(url, ((err, res, body) => {
      if(err) {
        console.log("Error with" + JSON.stringify(manga));
        console.log(err);
        return;
      }

      var response = JSON.parse(body);
      var latestChapter = response.chapters[0][0];

      if ( latestChapter >= manga.ch ) {
        var charr = getChapter(response.chapters, manga.ch);
        var chName=charr[2].split(/[^A-Za-z ]/)[0];
        console.log("Found " + manga.name + " chapter " + chName);
        resolve({name: manga.name, chName: chName, ch: charr[0], id: charr[3]})
      }
      else {
        reject();
      }
    }));
  });
}


app.listen(8080, () => {
  console.log("Listening now on port 8080!");
});

app.get('/', (request, response) => {
  response.send("<form action=\"/mangaList/kjames\" method=\"post\">"
                  + "<input type=\"submit\" value=\"Submit\" />"
                  + "<input type=\"text\" name=\"usr\" value=\"kjames\" />"
                  + "<input type=\"text\" name=\"name\" value=\"\" />"
                  + "<input type=\"text\" name=\"ch\" value=\"42\" />"
                  + "</form>"
                );
});

app.get('/mangaList/:userId', (request, response) => {
  const usr = request.params.userId;
  var list = DB.getList(usr).then((doc) => {

    var promises = [];
    doc.forEach((e) => {
      promises.push(getManga(e));
    });

    let data = [];

    Promise.all(promises.map((promise) => {
      return promise.reflect();
    })).each((inspection) => {
      if(inspection.isFulfilled()) {

        var manga = inspection.value();
        response.statusCode = 200;
        data.push(manga);
      }
    }).then((manga) => {
      console.log("all done");
      if(data.length == 0) {
        response.statusCode = 404;
      }
      response.send(data);
    });
  });
});

app.post('/mangaList/:userId', (req, res) => {
  console.log(req.body);
  const name = namePrep(req.body.name);
  const usr = req.body.usr;
  const ch = req.body.ch;

  http.get('http://www.mangaeden.com/api/list/0/', ((stream) => {
    const { statusCode } = stream;
    if(statusCode != 200) {

    }

    stream.setEncoding('utf8');
    let data = '';
    stream.on('data', (d) => { data += d });
    stream.on('end', () => {
      const list = JSON.parse(data);
      var manga = list.manga.filter(function(e) {
				return e.a == name;
			});
      if(manga.length == 0) {
        res.send("Manga not found");
      }
      else {
        DB.insertInto(usr, name, manga[0].i, ch);
        res.send("Added " + name + "!");
      }
    });
  }));
});

function namePrep(name) {
  name = name.toLowerCase();
  name = name.replace(/ /g, '-');
  return name;
}
