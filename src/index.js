const http = require('http');
const DB = require('./database.js');
const Promise = require('bluebird');
const express = require('express');
const BP = require('body-parser');
const REQ = require('request');
import { BookMgr } from './MangaMgr.js';


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
function findChapter(chapters, ch) {
  var i;
  for (i = 0; i < chapters.length; i++) {
    if(chapters[i][0] == ch) {
      return { curr: chapters[i], next: chapters[i-1] };
    }
  }
  return null;
}

//  Returns the POJO from mangaeden
function mangaConnect(manga) {
  return BookMgr.getManga(manga.id);
}

//  Gets rid of [LQ]
function splitChName(name) {
  return name.split(/[^A-Za-z] |-/)[0];
}

//  Gets the chapter that was asked for and the next chapter.
//  Paramters:
//  a Manga object with the currCh feild the chapter you are looking for.
/*
manga =
    {
        id: "string",
        name: "string"
        currCh: {
            id: "string",
            name: "string",
            ch: integer
        }
    }
  If the currCh id field is null then it will look for the next chapter that is out
  following the currCh chapter feild.
*/

function getChapter(manga) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((response) => {
	  var chObj = findChapter(response.chapters, manga.currCh.ch);

      var charr = (chObj != null ) ? chObj.curr : null;
      var nextarr = (chObj != null ) ? chObj.next : null;
      var bool = false;

      if(!manga.currCh.chId && nextarr) {
          chObj = findChapter(response.chapters, nextarr[0]);
          charr = (chObj != null ) ? chObj.curr : null;
          nextarr = (chObj != null ) ? chObj.next : null;
          bool = true;
      }

      //  If there is no next and we were passed a null value as a id that means
      //  we are looking for the newest chapter. if this is the case return with an ID of null.
      const chName = (charr != null && (manga.currCh.chId != null || bool)) ? splitChName(charr[2]) : null;
      const chId = (charr != null && (manga.currCh.chId != null || bool)) ? (charr[3]) : null;
      const ch = (charr != null) ? charr[0] : manga.currCh.ch;

      const nextChName = (nextarr != null) ? splitChName(nextarr[2]) : null;
      const nextChId = (nextarr != null) ? (nextarr[3]) : null;
      const nextCh = (nextarr != null) ? nextarr[0] : null;

      resolve({name: manga.name, id: manga.id,
        currCh: { chName: chName, ch: ch, chId: chId },
        nextCh: { chName: nextChName, ch: nextCh, chId: nextChId}});
    });
  });
}

//  Gets the chapers array and picks the index based off function f.
function getFirstOrLastChapter(manga, f) {
  return new Promise((resolve, reject) => {
    mangaConnect(manga).then((data) => {
      var charr = data.chapters[f(data.chapters_len)];

      //  prefetch the chapter after this one.
      var nextarr = findChapter(data.chapters, charr[0]).next;

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
      if(e.currCh.chId == null)
        promises.push(getChapter(e));
      else
        data.push(e);
    });
//    promises.push(getFirstChapter(doc[1]));

    Promise.all(promises).then((manga) => {
      //console.log(manga);
      response.statusCode = 200;
      manga.forEach((e) => {
        if(e.currCh.chId != null) {
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
      const defaultId = 123123;
      var miniManga = {"name": manga[0].a, "id": manga[0].i, "currCh": {"ch": ch, "chId": defaultId, "chName": null }};

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

app.post('/remove/', (req, res) => {
    const name = namePrep(req.body.name);
    const { usr } = req.body;

    if(usr == "" || name == "") {
      res.send("error");
      return;
    }
    DB.removeManga(usr, name).then(() => {
        res.send(name + " has been removed!");
    });
})

app.get('/getChapter/:userId/:mangaName', (req, res) => {
  const usr = req.params.userId;
  const mName = namePrep(req.params.mangaName);
  DB.getList(usr).then((doc) => {
    //console.log(manga);
    var manga = doc.filter((e) => {
      return e.name == mName;
    })[0];

    if(manga.currCh.chId != null) {
      res.set("Content-Type", 'application/json');

      res.send(manga);

      //  prefetch the next chapter

      const nextCh = (manga.nextCh.ch == null) ? manga.currCh.ch : manga.nextCh.ch;

      const nextManga = { name: manga.name, id: manga.id, currCh: { ch: nextCh,
                          chId: manga.nextCh.chId, chName: manga.nextCh.chName }};

      getChapter(nextManga).then((update) => {
        //console.log(update);
        if(update.currCh.chId != manga.currCh.chId) {

            const updatedManga = {
                name: manga.name,
                id: manga.id,
                currCh: {
                    ch: update.currCh.ch,
                    chId: update.currCh.chId,
                    chName: update.currCh.chName,
                },
                nextCh: {
                    ch: update.nextCh.ch,
                    chId: update.nextCh.chId,
                    chName: update.nextCh.chName,
                }
            }
          DB.setChapter(usr, updatedManga);
        }
      });
    }
    else {
      res.set('Content-Type', 'text');
      res.send(manga.name + " chapter " + (manga.currCh.ch +1) + " is not out yet");
    }
  });
});


app.listen(8080, () => {
  console.log("Listening now on port 8080!");
});
