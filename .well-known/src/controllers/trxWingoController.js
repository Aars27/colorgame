import moment from "moment";
import connection from "../config/connectDB.js";
import GameRepresentationIds from "../constants/game_representation_id.js";
import { generatePeriod, generateHalfMinutePeriod } from "../helpers/games.js";

export const TRX_WINGO_GAME_STATUS_MAP = {
  PENDING: 0,
  COMPLETED: 1,
  RELEASED: 2
};

export const TRX_WINGO_GAME_TYPE_MAP = {
  MIN_1: "trx_wingo",
  MIN_3: "trx_wingo3",
  MIN_5: "trx_wingo5",
  MIN_10: "trx_wingo10",
};

// Helper functions
const isNumber = (params) => {
  return /^[0-9]*\d$/.test(params);
};

function formateT(params) {
  return params < 10 ? "0" + params : params;
}

function timerJoin(params = "", addHours = 0) {
  let date = params ? new Date(Number(params)) : new Date();
  date.setHours(date.getHours() + addHours);

  const years = formateT(date.getFullYear());
  const months = formateT(date.getMonth() + 1);
  const days = formateT(date.getDate());
  let hours = date.getHours() % 12;
  hours = hours === 0 ? 12 : hours;
  const ampm = date.getHours() < 12 ? "AM" : "PM";
  const minutes = formateT(date.getMinutes());
  const seconds = formateT(date.getSeconds());

  return `${years}-${months}-${days} ${hours}:${minutes}:${seconds} ${ampm}`;
}

const rosesPlus = async (auth, money) => {
  try {
    const [level] = await connection.query("SELECT * FROM level");
    const [user] = await connection.query(
      "SELECT `phone`, `code`, `invite`, `user_level`, `total_money` FROM users WHERE token = ? AND veri = 1 LIMIT 1",
      [auth]
    );
    
    if (!user[0]) return;

    let userInfo = user[0];
    let currentInvite = userInfo.invite;

    for (let levelIndex = 1; levelIndex <= 6 && currentInvite; levelIndex++) {
      const [referrer] = await connection.query(
        "SELECT `phone`, `code`, `invite`, `rank`, `user_level`, `total_money` FROM users WHERE code = ? AND veri = 1 LIMIT 1",
        [currentInvite]
      );

      if (!referrer[0]) break;

      const referrerInfo = referrer[0];
      if (referrerInfo.user_level >= levelIndex && referrerInfo.total_money >= 100) {
        const commission = (money / 100) * level[levelIndex - 1].f1;
        if (commission > 0) {
          await connection.query(
            "UPDATE users SET money = money + ?, roses_f = roses_f + ?, roses_today = roses_today + ? WHERE phone = ?",
            [commission, commission, commission, referrerInfo.phone]
          );

          await connection.query(
            "INSERT INTO roses SET phone = ?, code = ?, invite = ?, f1 = ?, time = ?",
            [referrerInfo.phone, referrerInfo.code, referrerInfo.invite, commission, Date.now()]
          );

          await connection.query(
            `INSERT INTO turn_over (phone, code, invite, daily_turn_over, total_turn_over)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             daily_turn_over = daily_turn_over + VALUES(daily_turn_over),
             total_turn_over = total_turn_over + VALUES(total_turn_over)`,
            [referrerInfo.phone, referrerInfo.code, referrerInfo.invite, money, money]
          );
        }
      }
      currentInvite = referrerInfo.invite;
    }
  } catch (error) {
    console.error("Error in rosesPlus:", error);
  }
};

// Controller functions
const trxWingoPage = async (req, res) => {
  return res.render("bet/trx_wingo/win.ejs");
};

const trxWingoPage3 = async (req, res) => {
  return res.render("bet/trx_wingo/win3.ejs");
};

const trxWingoPage5 = async (req, res) => {
  return res.render("bet/trx_wingo/win5.ejs");
};

const trxWingoPage10 = async (req, res) => {
  return res.render("bet/trx_wingo/win10.ejs");
};

const trxWingoBlockPage = async (req, res) => {
  return res.render("bet/trx_wingo/trx_block.ejs");
};

const betTrxWingo = async (req, res) => {
  try {
    const { typeid, join, x, money } = req.body;
    const auth = req.cookies.auth;

    if (![1, 3, 5, 10].includes(Number(typeid))) {
      return res.status(400).json({ message: "Invalid game type", status: false });
    }

    const gameJoin = TRX_WINGO_GAME_TYPE_MAP[`MIN_${typeid}`];
    const [trxWingoNow] = await connection.query(
      "SELECT period FROM trx_wingo_game WHERE status = 0 AND game = ? ORDER BY id DESC LIMIT 1",
      [gameJoin]
    );

    const [user] = await connection.query(
      "SELECT `phone`, `code`, `invite`, `level`, `money`, `bonus_money` FROM users WHERE token = ? AND veri = 1 LIMIT 1",
      [auth]
    );

    if (!trxWingoNow[0] || !user[0] || !isNumber(x) || !isNumber(money)) {
      return res.status(400).json({ message: "Invalid request", status: false });
    }

    const userInfo = user[0];
    const period = trxWingoNow[0].period;
    const fee = x * money * 0.02;
    const total = x * money - fee;
    const timeNow = Date.now();
    const check = userInfo.money - total;

    if (check < 0) {
      return res.status(200).json({
        message: "The amount is not enough",
        status: false,
      });
    }

    // Generate bet details
    const date = new Date();
    const id_product = `${formateT(date.getFullYear())}${formateT(date.getMonth() + 1)}${formateT(date.getDate())}${Math.floor(Math.random() * 1000000000000000)}`;
    
    const color = determineColor(join);
    const checkJoin = generateCheckJoin(join);
    const formatTime = timerJoin();

    const resultHTML = generateBetHTML(period, formatTime, color, checkJoin);

    // Process the bet
    const sql = `INSERT INTO trx_wingo_bets SET 
      id_product = ?,
      phone = ?,
      code = ?,
      invite = ?,
      stage = ?,
      level = ?,
      money = ?,
      amount = ?,
      fee = ?,
      game = ?,
      bet = ?,
      status = ?,
      today = ?,
      time = ?`;
    
    await connection.query(sql, [
      id_product,
      userInfo.phone,
      userInfo.code,
      userInfo.invite,
      period,
      userInfo.level,
      total,
      x,
      fee,
      gameJoin,
      join,
      0,
      timerJoin(date.getTime()),
      timeNow,
    ]);

    // Update user balance
    const isBonusWalletEnabled = process.env.ENABLE_BONUS_MONEY === "true";
    const totalBetMoney = money * x;
    let mainWalletBetMoney = isBonusWalletEnabled ? totalBetMoney * 0.97 : totalBetMoney;
    let bonusWalletBetMoney = isBonusWalletEnabled ? totalBetMoney * 0.03 : 0;

    if (userInfo.bonus_money < bonusWalletBetMoney) {
      mainWalletBetMoney = totalBetMoney;
      bonusWalletBetMoney = 0;
    }

    await connection.query(
      "UPDATE users SET money = money - ?, total_money = total_money + ?, bonus_money = bonus_money - ? WHERE token = ?",
      [mainWalletBetMoney, totalBetMoney, bonusWalletBetMoney, auth]
    );

    // Get updated user info
    const [updatedUser] = await connection.query(
      "SELECT `money`, `bonus_money`, `level` FROM users WHERE token = ? AND veri = 1 LIMIT 1",
      [auth]
    );

    // Calculate commission
    await rosesPlus(auth, money * x);

    return res.status(200).json({
      message: "Successful bet",
      status: true,
      data: resultHTML,
      change: updatedUser[0].level,
      money: updatedUser[0].money,
      bonus_money: updatedUser[0].bonus_money,
    });

  } catch (error) {
    console.error("Error in betTrxWingo:", error);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
};

// Helper functions for bet processing
function determineColor(join) {
  const colorMap = {
    l: "big",
    n: "small",
    t: "violet",
    d: "red",
    x: "green",
    0: "red-violet",
    5: "green-violet",
  };
  return colorMap[join] || (join % 2 === 0 ? "red" : "green");
}

function generateCheckJoin(join) {
  if (join === "l" || join === "n") {
    return `<div class="van-image" style="width: 30px; height: 30px;">
              <img src="/images/${join === "n" ? "small" : "big"}.png" class="van-image__img">
            </div>`;
  }
  return `<span>${isNumber(join) ? join : ""}</span>`;
}

function generateBetHTML(period, time, color, checkJoin) {
  return `<div issuenumber="${period}" addtime="${time}" rowid="1" class="hb">
    <div class="item c-row">
      <div class="result">
        <div class="select select-${color}">${checkJoin}</div>
      </div>
      <div class="c-row c-row-between info">
        <div>
          <div class="issueName">${period}</div>
          <div class="tiem">${time}</div>
        </div>
      </div>
    </div>
  </div>`;
}

const listOrderOld = async (req, res) => {
  try {
    const { typeid, pageno = 0, pageto = 10 } = req.body;

    if (![1, 3, 5, 10].includes(Number(typeid))) {
      return res.status(400).json({ message: "Invalid game type", status: false });
    }

    const auth = req.cookies.auth;
    const game = TRX_WINGO_GAME_TYPE_MAP[`MIN_${typeid}`];

    const [user] = await connection.query(
      "SELECT `phone` FROM users WHERE token = ? AND veri = 1 LIMIT 1",
      [auth]
    );

    if (!user[0]) {
      return res.status(401).json({ message: "Authentication failed", status: false });
    }

    const [games] = await connection.query(
      "SELECT * FROM trx_wingo_game WHERE status != 0 AND game = ? ORDER BY id DESC LIMIT ?, ?",
      [game, Number(pageno), Number(pageto)]
    );

    const [count] = await connection.query(
      "SELECT COUNT(*) as total FROM trx_wingo_game WHERE status != 0 AND game = ?",
      [game]
    );

    const [currentPeriod] = await connection.query(
      "SELECT period FROM trx_wingo_game WHERE status = 0 AND game = ? ORDER BY id DESC LIMIT 1",
      [game]
    );

    return res.status(200).json({
      code: 0,
      msg: "Success",
      data: { gameslist: games },
      period: currentPeriod[0]?.period || "",
      page: Math.ceil(count[0].total / pageto),
      status: true,
    });

  } catch (error) {
    console.error("Error in listOrderOld:", error);
    return res.status(500).json({
      code: 0,
      msg: "Internal server error",
      data: { gameslist: [] },
      page: 1,
      status: false,
    });
  }
};

const GetMyEmerdList = async (req, res) => {
  try {
    const { typeid, pageno = 0, pageto = 10 } = req.body;

    if (![1, 3, 5, 10].includes(Number(typeid))) {
      return res.status(400).json({ message: "Invalid game type", status: false });
    }

    const auth = req.cookies.auth;
    const game = TRX_WINGO_GAME_TYPE_MAP[`MIN_${typeid}`];

    const [user] = await connection.query(
      "SELECT `phone` FROM users WHERE token = ? AND veri = 1 LIMIT 1",
      [auth]
    );

    if (!user[0]) {
      return res.status(401).json({ message: "Authentication failed", status: false });
    }

    const [bets] = await connection.query(
      "SELECT * FROM trx_wingo_bets WHERE phone = ? AND game = ? ORDER BY id DESC LIMIT ?, ?",
      [user[0].phone, game, Number(pageno), Number(pageto)]
    );

    const [count] = await connection.query(
      "SELECT COUNT(*) as total FROM trx_wingo_bets WHERE phone = ? AND game = ?",
      [user[0].phone, game]
    );

    // Remove sensitive fields from response
    const sanitizedBets = bets.map(({ id, phone, code, invite, level, game, ...rest }) => rest);

    return res.status(200).json({
      code: 0,
      msg: "Success",
      data: { gameslist: sanitizedBets },
      page: Math.ceil(count[0].total / pageto),
      status: true,
    });

  } catch (error) {
    console.error("Error in GetMyEmerdList:", error);
    return res.status(500).json({
      code: 0,
      msg: "Internal server error",
      data: { gameslist: [] },
      page: 1,
      status: false,
    });
  }
};

const addTrxWingo = async (game) => {
  try {
    if (![1, 3, 5, 10].includes(game)) return;

    const gameType = TRX_WINGO_GAME_TYPE_MAP[`MIN_${game}`];
    const gameRepId = GameRepresentationIds.TRXWINGO[game];

    // Check for pending game
    const [pendingGame] = await connection.query(
      "SELECT period FROM trx_wingo_game WHERE status = 0 AND game = ? ORDER BY id DESC LIMIT 1",
      [gameType]
    );

    if (pendingGame.length > 0) {
      // Process pending game
      const [settings] = await connection.query("SELECT * FROM admin_ac");
      const settingKey = `wingo${game}`;
      const nextResult = settings[0][settingKey];

      let result;
      if (nextResult === "-1") {
        // Auto-generate result
        result = generateAutoResult(gameType);
        await connection.query(
          "UPDATE trx_wingo_game SET result = ?, status = 1, release_status = 1 WHERE period = ? AND game = ?",
          [result, pendingGame[0].period, gameType]
        );
      } else {
        // Admin-set result
        const results = nextResult.split("|");
        if (results.length > 1) {
          result = results[0];
          const newResults = results.slice(1).join("|");
          
          await connection.query(
            "UPDATE trx_wingo_game SET result = ?, status = 1, release_status = 1 WHERE period = ? AND game = ?",
            [result, pendingGame[0].period, gameType]
          );
          
          await connection.query(
            `UPDATE admin_ac SET ${settingKey} = ?`,
            [newResults || "-1"]
          );
        }
      }
    }

    // Create new game period
    const newPeriod = game === 10 
      ? generateHalfMinutePeriod(gameRepId) 
      : generatePeriod(gameRepId);

    await connection.query(
      "INSERT INTO trx_wingo_game SET period = ?, result = 0, game = ?, status = 0, block_id = 0, block_time = '', hash = '', time = ?",
      [newPeriod, gameType, Date.now()]
    );

  } catch (error) {
    console.error(`Error in addTrxWingo for game ${game}:`, error);
  }
};

function generateAutoResult(gameType) {
  // Simple random result generation - replace with your actual logic
  const possibleResults = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return possibleResults[Math.floor(Math.random() * possibleResults.length)];
}
const calculateWinAmount = (bet, result, total) => {
  let winAmount = 0;
  if (bet == "l" || bet == "n") {
    winAmount = total * 2;
  } else {
    if (result == 0 || result == 5) {
      if (bet == "d" || bet == "x") {
        winAmount = total * 1.5;
      } else if (bet == "t") {
        winAmount = total * 4.5;
      } else if (bet == "0" || bet == "5") {
        winAmount = total * 4.5;
      }
    } else {
      if (result == 1 && bet == "1") {
        winAmount = total * 9;
      } else {
        if (result == 1 && bet == "x") {
          winAmount = total * 2;
        }
      }
      if (result == 2 && bet == "2") {
        winAmount = total * 9;
      } else {
        if (result == 2 && bet == "d") {
          winAmount = total * 2;
        }
      }
      if (result == 3 && bet == "3") {
        winAmount = total * 9;
      } else {
        if (result == 3 && bet == "x") {
          winAmount = total * 2;
        }
      }
      if (result == 4 && bet == "4") {
        winAmount = total * 9;
      } else {
        if (result == 4 && bet == "d") {
          winAmount = total * 2;
        }
      }
      if (result == 6 && bet == "6") {
        winAmount = total * 9;
      } else {
        if (result == 6 && bet == "d") {
          winAmount = total * 2;
        }
      }
      if (result == 7 && bet == "7") {
        winAmount = total * 9;
      } else {
        if (result == 7 && bet == "x") {
          winAmount = total * 2;
        }
      }
      if (result == 8 && bet == "8") {
        winAmount = total * 9;
      } else {
        if (result == 8 && bet == "d") {
          winAmount = total * 2;
        }
      }
      if (result == 9 && bet == "9") {
        winAmount = total * 9;
      } else {
        if (result == 9 && bet == "x") {
          winAmount = total * 2;
        }
      }
    }
  }
  return winAmount;
};
function getValidBets(result) {
  // Adjust logic based on your game rules
  const map = {
    'x': ['x', 'big', 'odd'],
    'l': ['l', 'small', 'even'],
    // example for number: '0' -> [0, 'zero', 'even']
  };
  
  if (map[result]) {
    return map[result];
  }

  // fallback for numeric results
  return [parseInt(result)];
}

const handlingTrxWingo1P = async (typeid) => {
  try {
    if (![1, 3, 5, 10].includes(typeid)) return;

    const gameType = TRX_WINGO_GAME_TYPE_MAP[`MIN_${typeid}`];

    // Get completed but unreleased game
    const [completedGame] = await connection.query(
      "SELECT * FROM trx_wingo_game WHERE status = 1 AND release_status = 1 AND game = ? ORDER BY id DESC LIMIT 1",
      [gameType]
    );

    if (!completedGame[0]) return;

    const { period, amount: result } = completedGame[0];

    // Update all bets with the result
    await connection.query(
      "UPDATE trx_wingo_bets SET result = ? WHERE status = 0 AND game = ? AND stage = ?",
      [result, gameType, period]
    );

    // Process winning bets in batches
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    const validBets = getValidBets(result).filter(
      val => val !== undefined && val !== null && val !== '' && !Number.isNaN(val)
    );

    let betConditions = '';
    let betParams = [];

    if (validBets.length > 0) {
      const placeholders = validBets.map(() => '?').join(', ');
      betConditions = `AND (bet = ? OR bet IN (${placeholders}))`;
      betParams = [result, ...validBets];
    } else {
      betConditions = `AND bet = ?`;
      betParams = [result];
    }

    while (hasMore) {
      const [winningBets] = await connection.query(
        `SELECT * FROM trx_wingo_bets 
         WHERE status = 0 AND game = ? AND stage = ? 
         ${betConditions}
         LIMIT ? OFFSET ?`,
        [gameType, period, ...betParams, batchSize, offset]
      );

      if (!winningBets.length) {
        hasMore = false;
        break;
      }

      for (const bet of winningBets) {
        const winAmount = calculateWinAmount(bet.bet, result, bet.money);

        await connection.beginTransaction();
        try {
          await connection.query(
            "UPDATE trx_wingo_bets SET `get` = ?, status = 1 WHERE id = ?",
            [winAmount, bet.id]
          );

          await connection.query(
            "UPDATE users SET money = money + ? WHERE phone = ?",
            [winAmount, bet.phone]
          );

          await connection.commit();
        } catch (error) {
          await connection.rollback();
          console.error(`Error processing bet ${bet.id}:`, error);
        }
      }

      offset += batchSize;
    }

    // Mark losing bets
    await connection.query(
      "UPDATE trx_wingo_bets SET status = 2 WHERE status = 0 AND game = ? AND stage = ?",
      [gameType, period]
    );

    // Mark game as fully processed
    await connection.query(
      "UPDATE trx_wingo_game SET release_status = 2 WHERE period = ? AND game = ?",
      [period, gameType]
    );

  } catch (error) {
    console.error(`Error in handlingTrxWingo1P for type ${typeid}:`, error);
  }
};


const trxWingoController = {
  trxWingoPage,
  trxWingoPage3,
  trxWingoPage5,
  trxWingoPage10,
  trxWingoBlockPage,
  betTrxWingo,
  listOrderOld,
  GetMyEmerdList,
  addTrxWingo,
  handlingTrxWingo1P,
};

export default trxWingoController;