const secret = require('./secret.js')
const MongoClient = require('mongodb').MongoClient;

const url=secret.db;

function base(queryFunc) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      const col = db.collection('mangaList');
      const abst = queryFunc(col);
      abst((err,doc) => {
        if(err === null) {
          const retval = (doc != null) ? doc.mangaList : [];
          resolve(retval);
        }
        else {
          reject(err);
        }
        db.close();
      });
    });
  });
}

export function getList(usr) {
  return base((col) => col.findOne.bind(col, {"_id": usr}));
}

//export function get

export function insertInto(usr, manga) {
	console.log(manga);
    return insert( usr, manga.name, manga.id, manga.currCh.ch,
         manga.currCh.chId, manga.currCh.chName, manga.nextCh.ch,
         manga.nextCh.chId, manga.nextCh.chName );
}

//  just a thousand parameters nothing to see here...
function insert(usr, name, id, ch, chId, chName, nextCh, nextChId, nextChName) {
  return base((col) => {
    return col.findOneAndUpdate.bind(col,
      { "_id": usr },
      { "$pull": { "mangaList": { "id": id }}}
    );
  })
  .then(() => {
    return base((col) => {
      return col.findOneAndUpdate.bind(col,
        { "_id": usr },
        { "$push": { mangaList: {
          "name": name,
          "id": id,
          "currCh": {
              "ch": ch, "chId": chId,
              "chName": chName
          },
          "nextCh": {
              "ch": nextCh, "chId": nextChId,
              "chName": nextChName
          }
        }}},
        { "upsert": true }
      );
    });
  });
}

export function setChapter(usr, manga) {
    console.log("database(): Set chapter");
    console.log(manga);
    return setCh( usr, manga.id, manga.currCh.ch, manga.currCh.chId,
        manga.currCh.chName, manga.nextCh.ch, manga.nextCh.chId,
        manga.nextCh.chName
     );
}

function setCh(usr, id, ch, chId, chName, nextCh, nextChId, nextChName) {
  return base((col) => {
    return col.findOneAndUpdate.bind(col,
      { "_id": usr, "mangaList.id": { $eq: id }},
      { "$set": { "mangaList.$.currCh.ch": ch,
                  "mangaList.$.currCh.chId": chId,
                  "mangaList.$.currCh.chName": chName,
                  "mangaList.$.nextCh.ch": nextCh,
                  "mangaList.$.nextCh.chId": nextChId,
                  "mangaList.$.nextCh.chName": nextChName }}
    )
  })
}
