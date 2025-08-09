const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');


const hostname = 'localhost';
const port = process.env.PORT || 3445;

const server = http.createServer();
const io = socketIO(server);
var crashPosition = 1;
var finalcrash = 0;
var fly;
var betamount =0;
var clients = [];

// Establish MySQL database connection
var db_config = {
  host: 'localhost',
  user: 'red',
  password: 'red',
  database: 'red',
  keepAlive: true,
};

let connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config);

  connection.connect(function (err) {
      if (err) {
          console.log('Error when connecting to db:', err);
          setTimeout(handleDisconnect, 2000);
      }
  });

  connection.on('error', function (err) {
      //console.log('DB error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          handleDisconnect();
      } else {
          throw err;
      }
  });
}
function deleteAndAddId() {
  // Delete all records from the 'bet' table
  const deleteQuery = `DELETE FROM bet`;
  connection.query(deleteQuery, (err, result) => {
    if (err) {
      console.error('Error deleting records:', err);
    } else {
      // Insert an ID of 1 into the 'bet' table
      const insertQuery = `INSERT INTO bet (id) VALUES (1)`;
      connection.query(insertQuery, (err, result) => {
        if (err) {
          console.error('Error adding ID:', err);
        } 
      });
    }
  });
}

// Call the function every 5 seconds
setInterval(deleteAndAddId, 5000);

handleDisconnect();


//Function to set crash point
function setcrash() {
  const query23 = `SELECT nxt FROM aviset WHERE id =1`;
  connection.query(query23, (err, result) => {
    if (err) {
        console.error('Error adding record to database:', err);
      }else{
          nxtcrash=result[0].nxt;
          if(nxtcrash==0){
            const query9 = `SELECT SUM(amount) AS total FROM crashbetrecord WHERE status ='pending'`;
  connection.query(query9, (err, result) => {
    if (err) {
      console.error('Error adding record to database:', err);
    }else{
      if(result[0].total==null){
        betamount =0;
      }else{
        betamount=result[0].total;
      }
     
     if(betamount==0){
      finalcrash =Math.floor(Math.random() * 6) + 2;
      //console.log('finalcrash0');
      //console.log(finalcrash,betamount);
      repeatupdate(200);
     }else if(betamount<=100){
      finalcrash =(Math.random() * 0.5 + 1).toFixed(2); 
      //console.log('finalcrash100');
      //console.log(finalcrash,betamount);
      repeatupdate(300);
     }else{
      finalcrash =(Math.random()* 0.5  + 1).toFixed(2); 
      //console.log('finalcrash12');
      //console.log(finalcrash,betamount);
      repeatupdate(200);
     }
    }
  });
          }else{
            finalcrash=parseFloat(nxtcrash);
            //console.log(finalcrash,"set");
            repeatupdate(200);
    const query36 = `UPDATE aviset SET nxt = 0 WHERE id = 1`;
    connection.query(query36, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      } 
    });
          }
      } });
  
  
}

// Function to reset plane
function restartplane() {
  clearInterval(fly);
  //console.log("reset............");
  //console.log('crashsite');
 // console.log(crashPosition);
  const query5 = `INSERT INTO crashgamerecord (crashpoint) VALUES ('${crashPosition}')`;

  connection.query(query5, (err, result) => {
    if (err) {
      console.error('Error adding record to database:', err);
    } 
  });
  io.emit('updatehistory', crashPosition);

  setTimeout(() => {
    const query4 = `UPDATE crashbetrecord SET status = 'fail',winpoint='${crashPosition}' WHERE status = 'pending'`;

    connection.query(query4, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      } 
    });
    io.volatile.emit('reset', 'resetting plane.....');

  }, 200);

  setTimeout(() => {
    io.emit('removecrash');
    setTimeout(() => {
      // check if there are clients connected    
      io.emit('prepareplane');
      crashPosition = 0.99;
      io.emit('flyplane');
     
      setTimeout(() => {
      setcrash();
    },1000)
    }, 4000)
  }, 3000)

}
// Function to update crash multiplier
function updateCrashInfo() {
  var fc=parseFloat(finalcrash) ;
  var cp=parseFloat(crashPosition);
  if ( fc > cp ) {
    var cPosition = parseFloat(crashPosition);
    crashPosition=(cPosition+0.01).toFixed(2);
    io.emit('crash-update', crashPosition);
  } else {
    restartplane();
  }
}


// Function to repeatedly update crash data
function repeatupdate(duration) {
  fly = setInterval(updateCrashInfo, duration);
}

io.on('connection', (socket) => {
  //console.log('A user connected');
  clients.push(socket.id);
  socket.emit('working', 'ACTIVE...!');

  socket.on('disconnect', () => {
    //console.log('A user disconnected');
  });

  socket.on('newBet', function (phone, amount) {
    
    const bal = `SELECT money FROM users WHERE phone = '${phone}'`;
    connection.query(bal, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }else{
        if(result[0].money>amount){
          const query1 = `UPDATE users SET money = money - ${amount} WHERE phone = '${phone}'`;

          connection.query(query1, (err, result) => {
            if (err) {
              console.error('Error adding record to database:', err);
            } 
          });
          const query = `INSERT INTO crashbetrecord (phone, amount) VALUES ('${phone}', ${amount})`;
      
          connection.query(query, (err, result) => {
            if (err) {
              console.error('Error adding record to database:', err);
            } 
          });
        }
      }
    });
  });
  socket.on('addWin', function (phone, amount, winpoint) {
    const bets = `SELECT SUM(amount) AS bets FROM crashbetrecord WHERE status ='pending' AND phone = '${phone}'`;
    connection.query(bets, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }else{
        if(result[0].bets>0){
          console.log("winner");
    var winamount=parseFloat((amount*98/100)*winpoint);
    winamount=winamount.toFixed(2);
    console.log(winamount);
    const query2 = `UPDATE users SET money = money + ${winamount} WHERE phone = '${phone}'`;

    connection.query(query2, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      }
    });
    const query3 = `UPDATE crashbetrecord SET status = 'success', winpoint='${winpoint}' WHERE phone = '${phone}'  AND status = 'pending'`;

    connection.query(query3, (err, result) => {
      if (err) {
        console.error('Error adding record to database:', err);
      } 
    });
        }
      }
    });
    

  });
});
setcrash();
server.listen(port,  () => {
  console.log(`Server running at :${port}/`);
});