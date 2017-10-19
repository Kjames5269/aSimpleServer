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

function findChapter(chapters, ch, next=0) {
  var i;
  for (i = 0; i < chapters.length; i++) {
    if(chapters[i][0] == ch) {
      return chapters[i-next];
    }
  }
  return null;
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

function getLatestChapter(manga) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((response) => {
      var latestChapter = response.chapters[0][0];

      if ( latestChapter == manga.ch ) {
        var charr = response.chapters[0];
        var chName=splitChName(charr[2]);
        console.log("Found " + manga.name + " chapter " + chName);
        resolve({name: manga.name, chName: chName, ch: charr[0], chId: charr[3]})
      }
      else {
        reject();
      }
    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
}

function splitChName(name) {
  return name.split(/[^A-Za-z ]/)[0];
}

//  manga {name ch id}
function getChapter(manga, next = 0) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((response) => {
      var charr = findChapter(response.chapters, manga.ch, next);
      if(charr == null) {
        resolve(null);
      }
      var chName=splitChName(charr[2]);
      resolve({name: manga.name, chName: chName, ch: charr[0], chId: charr[3]})
    });
  });
}

function getFirstChapter(manga) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((data) => {
      resolve(data.chapters[data.chapters_len-1]);
    }).catch((err) => {
      console.log(err);
    });
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

    let data = [];
    var promises = [];
    doc.forEach((e) => {
      if(e.chId == null)
        promises.push(getLatestChapter(e));
      else
        data.push(e);
    });
//    promises.push(getFirstChapter(doc[1]));

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
  var ch = req.body.ch;

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
        console.log(ch);
        if(ch == "first") {
          getFirstChapter({"id": manga[0].i}).then((foundManga) => {
            console.log(foundManga);
            //DB.insertInto(usr, name, manga[0].i, foundManga);
            res.send("Added " + name + "!");
          });
        }
        else {
          getChapter(manga).then((foundManga) => {
            const chId = foundManga[0] || null;
            const chName = foundManga[2] || null;

            DB.insertInto(usr, name, manga[0].i, chId, chName);
            res.send("Added " + name + "!");
          })
        }
      }
    });
  }));
});

app.post('/getNext/:userId/:mangaName', (req, res) => {
  const usr = req.params.userId;
  const mName = namePrep(req.params.mangaName);
  DB.getManga(usr,mName).then(doc) => {
    console.log(doc);
    res.send(doc);

    //  prefetch the next chapter.



  }
});

app.post('/stop/:userId/:mangaName' (req, res) => {
  const usr = req.params.userId;
  const mName = namePrep(req.params.mangaName);



});

function namePrep(name) {
  name = name.toLowerCase();
  name = name.replace(/ /g, '-');
  return name;
}
