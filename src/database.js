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
          resolve(doc.mangaList);
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

export function insertInto(usr, name, id, ch) {
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
        { "$push": { mangaList: { "name": name, "id": id, "ch": ch }}},
        { "upsert": true }
      );
    });
  });
}

export function updateCh(usr, id) {
  return base((col) => {
    return col.findOneAndUpdate.bind(col,
      { "_id": usr, "mangaList.id": { $eq: id }},
      {"$inc": {"mangaList.$.ch" : 1}}
      );
  });
}

export function setCh(usr, id, ch) {
  return base((col) => {
    return col.findOneAndUpdate.bind(col,
      { "_id": usr, "mangaList.id": { $eq: id }},
      { "$set": { "mangaList.$.ch": ch }}
    )
  })
}
