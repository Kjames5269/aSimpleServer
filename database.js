const secret = require('./secret.js')

const url=secret.db;

function base(queryFunc) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      const col = db.collection('mangaList');
      const abst = queryFunc(col);
      abst((err,doc) => {
        db.close();
        if(err === null) {
          resolve(doc);
        }
        else {
          reject(err);
        }
      });
    });
  });
}

export function getList() {
  return base((col) => col.find().toArray());
}

export function get

export function insertInto(name, id, ch) {
  return base((col) => {
    return col.insertOne({
      "name": name,
      "_id": id,
      "ch": ch,
    });
  });
}

export function updateCh(id) {
  return base((col) => {
    return col.findOneAndUpdate(
      { "_id": id },
      {"$inc": {"ch" : 1}}
      );
  });
}
