'use strict';

class SNode {
  //  Data here is a reference to a DNode.
  //  While it doesn't have to be... it should
  constructor(data) {
    this.data = data;
    this.next = null;
  }

  set next(node) {
    this.nextNode = node;
  }
  set data(data) {
    this.ref = data;
  }
  get next() {
    return this.nextNode;
  }
  get data() {
    return this.ref;
  }
}

class SLinked {
  constructor() {
    this.head = null;
  }

  insertHead(data) {
    var newNode = new SNode(data);
    if(this.head == null) {
      this.head = newNode;
    }
    else {
      newNode.next = this.head;
      this.head = newNode;
    }
    return newNode;
  }

  remove(data, eq) {
    var curr = this.head;
    if(eq(curr.data, data)) {
      this.head = curr.next;
      curr.next = null;
      return curr;
    }

    while(curr.next != null) {
      if(eq(curr.next.data, data)) {
        var temp = curr.next;
        curr.next = curr.next.next;
        temp.next = null;
        return temp;
      }
      curr = curr.next;
    }
    return null;
  }

  printHead() {
    console.log(this.head);
  }
}

class DNode {
  constructor(data) {
    this.data = data;
    this.next = null;
    this.prev = null;
  }
  set next(node) {
    this.nextNode = node;
  }
  set prev(node) {
    this.prevNode = node;
  }
  set data(data) {
    this.mangaData = data;
  }
  get next() {
    return this.nextNode;
  }
  get prev() {
    return this.prevNode;
  }
  get data() {
    return this.mangaData;
  }
}

class DLinked {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  /*
    Adds a new node given data to the beginning of the list.
    returns a reference to that object
  */
  insertHead(data) {
    var newNode = new DNode(data);
    if(this.head == null) {
      this.head = newNode;
      this.tail = newNode;
    }
    else {
      newNode.next = this.head;
      this.head = newNode;
      newNode.next.prev = newNode;
    }
    return newNode;
  }

  /*
    Adds a new node given data to the end of the list. returns a reference
    to that object
  */
    insertTail(data) {
    var newNode = new DNode(data);
    if(this.tail == null) {
      this.head = newNode;
      this.tail = newNode;
    }
    else {
      newNode.prev = this.tail;
      this.tail = newNode;
      newNode.prev.next = newNode;
    }
    return newNode;
  }

  /* * * * * * * * * * * * * * * * * * * * * * * * *
  * This method takes a DNode and will delete it from
  * the list. It does not take a data or a pk just a
  * reference to the node we want deleted
  */
  removeNode(node) {
    var left = node.prev;
    var right = node.next;
    //  both are null so the list is now empty
    if ( !right && !left ) {
      this.tail = null;
      this.head = null;
    }
    //  This node is the tail
    else if(right == null) {
      this.tail = left;
      left.next = null;
    }
    //  this node was the head
    else if(left == null) {
      this.head = right;
      right.prev = null;
    }
    else {
      //  its in the middle simply dereference it.
      left.next = right;
      right.prev = left;
    }
  }


  /*
    Returns the front most node from the list removing it in the process
  */
  popFront() {
    var temp = this.head;
    if(temp === this.tail) {
      this.head = null;
      this.tail = null;
      return temp;
    }
    this.head = temp.next;
    this.head.prev = null;
    temp.next = null;
    return temp;
  }
  /*
    Returns the last most node from the list removing it in the process
  */
  popBack() {
    var temp = this.tail;
    if(temp === this.head) {
      this.head = null;
      this.tail = null;
      return temp;
    }
    this.tail = temp.prev;
    this.tail.next = null;
    temp.prev = null;
    return temp;
  }

  /*
    Prints the entire contents of the list
  */
  printList() {
    var curr = this.head;
    while(curr != null) {
      console.log(curr.data);
      curr = curr.next;
    }
  }
  printListRev() {
    var curr = this.tail;
    while(curr != null) {
      console.log(curr.data);
      curr = curr.prev;
    }
  }

}

var list = new DLinked();
var node1 = list.insertHead("Fish");
var node2 = list.insertTail("Swims");
var node3 = list.insertHead("A");
var node4 = list.insertHead("Many");
var node5 = list.insertTail("Good Sir");

list.removeNode(node3);
console.log(list.popBack());
//list.printList();
//list.printListRev();
list.printList();
list.printListRev();

console.log("SLinked");

var a = new SLinked();
a.insertHead("foo");
a.insertHead("Bar");
a.insertHead("Leedle");
a.remove("Bar", (a,b) => a === b );
a.printHead();
