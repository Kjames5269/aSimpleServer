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
    return insert( usr, manga.name, manga.id, manga.ch, manga.chId, manga.chName );
}

function insert(usr, name, id, ch, chId, chName) {
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
          "name": name, "id": id, "ch": ch, "chId": chId,
          "chName": chName
        }}},
        { "upsert": true }
      );
    });
  });
}

export function setChapter(usr, manga) {
    return setCh( usr, manga.id, manga.ch, manga.chId, manga.chName );
}

function setCh(usr, id, ch, chId, chName) {
  return base((col) => {
    return col.findOneAndUpdate.bind(col,
      { "_id": usr, "mangaList.id": { $eq: id }},
      { "$set": { "mangaList.$.ch": ch,
                  "mangaList.$.chId": chId,
                  "mangaList.$.chName": chName }}
    )
  })
}
