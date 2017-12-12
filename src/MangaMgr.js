const DB = require('./database.js');
const Promise = require('bluebird');
const REQ = require('request');
const ll = require('./linkedList');
const cron = require('node-cron');

const defaultJob = '0 */4 * * *';
//  Run the update command every 4 hours

class MangaMgr {
  /* The MangaMgr takes 3 parameters:
        webUrl: a webUrl for the request (Where is the manga coming from),
        size: the max amount of cached manga, default 100
        cronJob: How often do you update all the manga?*/

  constructor(webUrl, size=100, cronJob=defaultJob) {

    this.URL = webUrl;
    this.MANGA = new ll.DLinked();
    this.SIZE = size;
    this.TABLE = new Array(size);
    for (var i = 0; i < size; i++) {
      this.TABLE[i] = new ll.SLinked();
    }

    if(!cron.validate(cronJob)) {
      console.error("Invalid cron job!");
      console.error(cronJob);
      process.exit(1);

    }

    cron.schedule(cronJob, () => {
      console.log("Starting cron...");
      this.MANGA.forEach(this.update.bind(this));
      console.log("Finsihing cron...\n")
    }, true);
  }

  //  Update nodes based off if the last chapter dates do not equal
  update(node) {

    this.getFromSite(node.data.id).then((manga) => {

      if(manga.last_chapter_date === node.data.last_chapter_date) {
        return;
      }
      node.data = manga;
    });
  }

//  Get the hash by runnign the following function
  getHash(name) {

    var value = name.charAt(0);
    value += (7 * name.charAt(3));
    value += (3 * name.length);
    return (value * 11) % this.SIZE;
  }
  //  Manga has an ID field

  addToTable(manga) {
    if(this.MANGA.getSize() == this.SIZE) {

      //  pop the last element and remove it from the
      //  hash table
      const removed = this.MANGA.popBack();
      const hash = this.getHash(removed.id);
      this.TABLE[hash].remove(removed.id, isNodeEq);
    }
    //  insert into the hash table
    const node = this.MANGA.insertHead(manga);
    const hash = this.getHash(manga.id);
    this.TABLE[hash].insertHead(node);
  }


  //  Get the manga object from a primary key
  //  returns a promise
  getManga(id) {

    var manga = this.getFromTable(id);
    if(manga) {
      return new Promise((resolve) => {
        resolve(manga);
        return;
      });
    }

    return this.getFromSite(id).then((manga) => {
      manga.id = id;
      this.addToTable(manga);
      return manga;
    });
  }


  getFromTable(id) {
    //  The value here should always be a single linked list
    const hash = this.getHash(id);
    const value = this.TABLE[hash];
    const mangaNode = value.getData(id, isNodeEq);
    if(mangaNode) {
      //  The node returned from the hash table
      this.MANGA.removeNode(mangaNode);
      //  Remove the node from the queue and add it to the front
      //  we LRU now bb!!!
      return this.MANGA.insertHead(mangaNode.data).data;
    }
    //  It was not found in the hash table. FeelsBad
    return null;
  }


  //  Connects to the website and returns the POJO
  getFromSite(id) {
    return new Promise((resolve, reject) => {

      const url = this.URL + id;
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
}

function isNodeEq(id, sNode) {
  //  manga id to compare to the single node
  return id === sNode.data  //  The sgl node data
                     .data  //  containing a dbl node
                     .id;   //  containing a manga obj with ID
}

export let BookMgr = new MangaMgr('http://www.mangaeden.com/api/manga/', 100);

/*console.log(BookMgr.getFromTable("42069"));
BookMgr.getManga("570076f4719a168120d7ea0a").then((manga) => {console.log(manga)});
BookMgr.getManga("570076f4719a168120d7ea0a").then((manga) => {console.log(manga)});
*/
