const http = require('http');
const DB = require('./database.js');
const Promise = require('bluebird');
const express = require('express');
const BP = require('body-parser');
const REQ = require('request');

var app = express();
app.use(BP.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})

// -=-=-=-=-=-=-=- FUNCTIONS -=-=-=-=-=-=-==-=-=

//  Gets the next or current chapter from a list of chapters.
//  These are in reverse order.
function findChapter(chapters, ch, next=0) {
  var i;
  for (i = 0; i < chapters.length; i++) {
    if(chapters[i][0] == ch) {
      return chapters[i-next];
    }
  }
  return null;
}

//  Returns the POJO from mangaeden
function mangaConnect(manga) {
  return new Promise((resolve, reject) => {
    const url = 'http://www.mangaeden.com/api/manga/' + manga.id;
    //console.log(url);
    REQ.get(url, ((err, res, body) => {
      if(err) {
        reject("Error with" + JSON.stringify(manga));
        //console.log(err);
        return;
      }
      resolve(JSON.parse(body));
    }));
  });
}

//  Gets rid of [LQ]
function splitChName(name) {
  return name.split(/[^A-Za-z] |-/)[0];
}

// Gets either the current chapter or the next chapter of the manga
function getChapter(manga, next = 0) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((response) => {
      var charr = findChapter(response.chapters, manga.currCh.ch, next);

      const chName = (charr != null) ? splitChName(charr[2]) : null;
      const chId = (charr != null) ? (charr[3]) : null;
      const ch = (charr != null) ? charr[0] : manga.ch;
      resolve({name: manga.name, id: manga.id, currCh: { chName: chName, ch: ch, chId: chId }});
    });
  });
}

//  Gets the chapers array and picks the index based off function f.
function getFirstOrLastChapter(manga, f) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((data) => {
      var charr = data.chapters[f(data.chapters_len)];

      //  prefetch the chapter after this one.
      var nextarr = findChapter(data.chapters, charr[0], 1);
      const nextChName = (nextarr != null) ? splitChName(nextarr[2]) : null;
      const nextChId = (nextarr != null) ? (nextarr[3]) : null;
      const nextCh = (nextarr != null) ? nextarr[0] : null;

      var chName=splitChName(charr[2]);
      resolve({
            name: manga.name,id: manga.id,
            currCh: {
                chName: chName,
                ch: charr[0],
                chId: charr[3]
            },
            nextCh: {
                chName: nextChName,
                ch: nextCh,
                chId: nextChId
            }
        });
    }).catch((err) => {
      //console.log(err);
      reject(err);
    });
  });
}

function insertAndReturn(res, usr, foundManga) {
  DB.insertInto(usr, foundManga);
  res.statusCode = 201;
  res.send("Added " + foundManga.name + "!");
}

function namePrep(name) {
  name = name.toLowerCase();
  name = name.replace(/ /g, '-');
  return name;
}

// =-=-=-=-=-=-=-=-= EXPRESS =-=-=-=-=-=-=-=-=-=-=-=-

/*app.get('/debug', (request, response) => {
  response.send("<form action=\"/\" method=\"post\">"
                  + "<input type=\"submit\" value=\"Submit\" />"
                  + "<input type=\"text\" name=\"usr\" value=\"kjames\" />"
                  + "<input type=\"text\" name=\"name\" value=\"\" />"
                  + "<input type=\"text\" name=\"ch\" value=\"42\" />"
                  + "</form>"
                );
}); */

app.get('/:userId', (request, response) => {
  const usr = request.params.userId;
  var list = DB.getList(usr).then((doc) => {

    let data = [];
    var promises = [];
    doc.forEach((e) => {
      if(e.chId == null)
        promises.push(getChapter(e, 1));
      else
        data.push(e);
    });
//    promises.push(getFirstChapter(doc[1]));

    Promise.all(promises).then((manga) => {
      //console.log(manga);
      response.statusCode = 200;
      manga.forEach((e) => {
        if(e.chId != null) {
          data.push(e);
          DB.setChapter(usr, e);
        }
      })
      response.send(data);
    });
  });
});

app.post('/', (req, res) => {
  //console.log(req.body);
  const name = namePrep(req.body.name);
  const { usr, ch } = req.body;

  if(usr == "" || ch == "") {
    res.send("error");
    return;
  }

  http.get('http://www.mangaeden.com/api/list/0/', ((stream) => {
    const { statusCode } = stream;
    if(statusCode != 200) {
      res.statusCode = 500;
      res.send("Internal error");
      return;
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
        res.statusCode = 404;
        res.send("Manga not found");
        return;
      }

      var miniManga = {"name": manga[0].a, "id": manga[0].i, "ch": ch, "chId": null, "chName": null };

      if(ch == "first") {
        getFirstOrLastChapter(miniManga, (d) => { return d -1 }).then((foundManga) => {

          insertAndReturn(res, usr, foundManga);
        });
      }
      else if(ch == "current") {
        getFirstOrLastChapter(miniManga, (d) => { return 0 }).then((foundManga) => {

          //  Current or caught up set the ID to null since we cant find it
          foundManga.currCh.chId = null;
          foundManga.currCh.chName = null;

          insertAndReturn(res, usr, foundManga);
        });
      }
      else if (!isNaN(ch)){
        getChapter(miniManga).then((foundManga) => {

          insertAndReturn(res, usr, foundManga);
        })
      }
      else {
        res.statusCode = 400;
        res.send("Error with ch " + ch);
      }
    });
  }));
});

//  This prefetches the data so read it or leave it

app.get('/getChapter/:userId/:mangaName', (req, res) => {
  const usr = req.params.userId;
  const mName = namePrep(req.params.mangaName);
  DB.getList(usr).then((doc) => {
    //console.log(manga);
    var manga = doc.filter((e) => {
      return e.name == mName;
    })[0];

    if(manga.chId != null) {
      res.send(manga);

      //  prefetch the next chapter.

      const nextManga = { name: manga.name, id: manga.id, currCh: { ch: manga.nextCh,
                          chId: manga.nextChId, chName: manga.nextChName }};

      getChapter(nextManga, 1).then((update) => {
        //console.log(update);
        if(update.chId != manga.chId) {
            const nextCh = (!manga.nextCh.ch) ? manga.currCh.ch : null

            const updatedManga = {
                name: manga.name,
                id: manga.id,
                currCh: {
                    ch: nextCh,
                    chId: manga.nextCh.chId,
                    chName: manga.nectCh.chName,
                },
                nextCh: {
                    ch: update.currCh.ch,
                    chId: update.currCh.chId,
                    chName: update.currCh.chName,
                }
            }
          DB.setChapter(usr, updatedManga);
        }
      });
    }
    else {
      res.send(manga.name + " chapter " + (manga.ch +1) + " is not out yet");
    }
  });
});


app.listen(8080, () => {
  console.log("Listening now on port 8080!");
});
