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
  return base((col) => col.findOne);
}
