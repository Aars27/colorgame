import axios from "axios";
import crypto from "crypto";
import connection from "../config/connectDB.js";
import aesUtil from "../helpers/AESEncrypt.js";

const dc = process.env.JDB_DC;
const key = process.env.JDB_KEY;
const iv = process.env.JDB_IV;
const agentId = process.env.JDB_AGENT_ID;
const API_URL = process.env.JDB_API_URL;

const tagList = [
  {
    id: 1,
    name: "popular",
    displayName: "Popular",
  },
  {
    id: 2,
    name: "casino",
    displayName: "Casino",
  },
  {
    id: 3,
    name: "slots",
    displayName: "Slots",
  },
  {
    id: 4,
    name: "fishing",
    displayName: "Fishing",
  },
  {
    id: 5,
    name: "rummy",
    displayName: "Rummy",
  },
  {
    id: 6,
    name: "original",
    displayName: "Original",
  },
  {
    id: 7,
    name: "popular_quick",
    displayName: "Popular Quick",
  },
];

const gameCategoriesPage = (GameTagId) => async (req, res) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${process.env.APP_BASE_URL}/jdb_game_list.json`,
    });

    const tagName = tagList.find((item) => item.id === GameTagId)?.name;
    const displayName = tagList.find(
      (item) => item.id === GameTagId,
    )?.displayName;

    const gameList = response?.data?.filter((item) =>
      item.tag.includes(tagName),
    );

    const currentPath = req._parsedOriginalUrl.pathname.split("/")[2];

    return res.render("jdb/index.ejs", {
      gameName: displayName,
      gameList: gameList.map((item) => ({
        g_type: item.g_type,
        m_type: item.m_type,
        name: item.name,
        image_src: item.image,
      })),
      headerDisplay:
        currentPath === "popular" || currentPath === "original" ? "hide" : "",
      tabAddressJili: currentPath,
      tabAddressJdb: currentPath,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

const gameSlotsPage = (GameTagId) => async (req, res) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${process.env.APP_BASE_URL}/jdb_game_list.json`,
    });

    const tagName = tagList.find((item) => item.id === GameTagId)?.name;
    // const displayName = tagList.find(item => item.id === GameTagId)?.displayName;

    const gameList = response?.data?.filter((item) =>
      item.tag.includes(tagName),
    );

    // const currentPath = req._parsedOriginalUrl.pathname.split("/")[2];

    return res.render("jdb/slots.ejs", {
      gameList: gameList.map((item) => ({
        g_type: item.g_type,
        m_type: item.m_type,
        name: item.name,
        image_src: item.image,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

const gameQuickPopularList = async (req, res) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${process.env.APP_BASE_URL}/jdb_game_list.json`,
    });

    const tagName = tagList.find((item) => item.id === 7)?.name;

    const gameList = response?.data?.filter((item) =>
      item.tag.includes(tagName),
    );

    return res.status(200).send({
      gameList: gameList.map((item) => ({
        g_type: item.g_type,
        m_type: item.m_type,
        name: item.name,
        image_src: item.image,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

const generateGameLink = async (req, res) => {
    const mType = req.query.m_type;
    const gType = req.query.g_type; 

    // Fetch the token from cookies
    const token = req.cookies.auth;

    // Fetch iv, key, and parent from environment variables
    const iv = process.env.JDB_IV;
    const key = process.env.JDB_KEY;
    const parent = process.env.PARENT;

    try {
        // Check for required parameters
        if (!token || !iv || !key || !parent) {
            return res.status(400).json({ error: 'Missing required parameters.' });
        }

        // Fetch uid from the database based on the token
        const [rows] = await connection.execute(
            "SELECT `phone` FROM `users` WHERE `token` = ? AND `veri` = 1",
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Extract the uid (phone number) from the query result
        const uid = rows[0].phone;

        // Prepare data for API request
        const data = {
            action: 21,
            parent: parent,
            ts: Date.now(), // Current timestamp in milliseconds
            uid: uid,
            mType: mType || '', // Machine Type (optional)
            gType: gType || '', // Game Type (optional)
            activityIds: ['1234', '5678'] // Assuming activityIds is needed
        };

        // Convert data to JSON
        const jsonData = JSON.stringify(data);

        // Encrypt the data
        const encryptedData = encryptData(jsonData, key, iv);

        // Encode encrypted data
        const encodedData = encodeURIComponent(encryptedData);

        // Define the API URL
        const apiUrl = `https://api.jdb711.com/apiRequest.do?dc=prox&x=${encodedData}`;

        // Make API request
        const response = await axios.get(apiUrl);

        // Check API response
        const responseData = response.data;
        console.log('API Response:', responseData); // Debugging line

        if (responseData.status === '0000') {
            const gameUrl = responseData.path; // URL to launch the game

            // Log the URL for debugging
            console.log('Generated Game URL:', gameUrl);

            // Validate and log the URL
            if (!gameUrl || typeof gameUrl !== 'string') {
                return res.status(500).json({ error: 'Invalid game URL.' });
            }

            // Ensure URL is properly encoded
            try {
                new URL(gameUrl); // This will throw an error if the URL is invalid
                res.redirect(gameUrl);
            } catch (e) {
                console.error('Invalid URL:', e);
                res.status(500).json({ error: 'Generated URL is invalid.' });
            }
        } else {
            res.status(400).json({ error: responseData.err_text });
        }

    } catch (error) {
        console.error('Error:', error); // Debugging line
        res.status(500).json({ error: error.message });
    }
}; 

//Helper function to encrypt data
const encryptData = (data, key, iv) => {
    const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key), Buffer.from(iv));
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const mainFunction = async (req, res) => {
  try {
    const x = req.body.x;

    if (!x) {
      return res.status(400).json({
        status: "9999",
        err_text: "x is required for jdb!",
      });
    }

    const response = aesUtil.AesDecrypt(x, key, iv);
    const data = JSON.parse(response);

    const user = await getUserDataByAuthPhoneNumber(data?.uid);

    console.log(data);

    switch (data?.action) {
      case 6:
        return getBalance({ data, user, res });
      case 8:
        return betNSettle({ data, user, res });
      case 4:
        return cancelBetNSettle({ data, user, res });
      case 9:
        return bet({ data, user, res });
      case 10:
        return settle({ data, user, res });
      case 11:
        return cancelBet({ data, user, res });
      case 12:
        return activityReward({ data, user, res });
      case 13:
        return withdraw({ data, user, res });
      case 14:
        return deposit({ data, user, res });
      case 15:
        return cancelWithdraw({ data, user, res });
      case 16:
        return freeSpinReward({ data, user, res });
      default:
        return res.status(200).json({
          status: "9999",
          err_text: "Invalid action!",
        });
    }
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      status: "9999",
      err_text: "Something went wrong! Internal server error!",
    });
  }
};

const getBalance = async ({ data, user, res }) => {
  return res.status(200).json({
    status: "0000",
    balance: user.money,
    err_text: "",
  });
};

const betNSettle = async ({ data, user, res }) => {
  const gType = data.gType;
  const bet = Number(data.bet);
  const win = Number(data.win);
  const denom = data.denom;

  const userMoney = Number(user.money);

  let passBet = null;

  if ([0, 7, 9, 12].includes(parseInt(gType))) {
    passBet = userMoney >= bet;
  } else {
    passBet = false;
  }

  if (passBet) {
    const finalAmount = Number(userMoney + bet + win).toFixed(2);
    await connection.query(
      "UPDATE users SET money = ?, total_money = ? WHERE `phone` = ?",
      [finalAmount, finalAmount, user.phone],
    );

    return res.status(200).json({
      status: "0000",
      balance: finalAmount,
      err_text: "",
    });
  } else {
    return res.status(200).json({
      status: "6006",
      balance: userMoney,
      err_text: "Insufficient balance!",
    });
  }
};

const cancelBetNSettle = async ({ data, user, res }) => {
  return res.status(200).json({
    status: "0000",
    balance: user.money,
    err_text: "",
  });
};

const bet = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  if (userMoney >= amount) {
    const finalAmount = Number(userMoney - amount).toFixed(2);
    await connection.query(
      "UPDATE users SET money = money - ?, total_money =  total_money - ? WHERE `phone` = ?",
      [amount, amount, user.phone],
    );

    const cUser = await getUserDataByAuthPhoneNumber(user.phone);

    return res.status(200).json({
      status: "0000",
      balance: cUser.money,
      err_text: "",
    });
  } else {
    return res.status(200).json({
      status: "6006",
      balance: userMoney,
      err_text: "Insufficient balance!",
    });
  }
};

const settle = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);
  await connection.query(
    "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?",
    [amount, amount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const cancelBet = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);
  await connection.query(
    "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?",
    [amount, amount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const activityReward = async ({ data, user, res }) => {
  // TODO: database to insert notification for user
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);

  await connection.query(
    "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?",
    [amount, amount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const withdraw = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  if (userMoney >= amount) {
    const finalAmount = Number(userMoney - amount).toFixed(2);
    await connection.query(
      "UPDATE users SET money = ?, total_money = ? WHERE `phone` = ?",
      [finalAmount, finalAmount, user.phone],
    );

    return res.status(200).json({
      status: "0000",
      err_text: "",
    });
  } else {
    return res.status(200).json({
      status: "6006",
      err_text: "Insufficient balance!",
    });
  }
};

const deposit = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);
  await connection.query(
    "UPDATE users SET money = ?, total_money = ? WHERE `phone` = ?",
    [finalAmount, finalAmount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const cancelWithdraw = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);
  await connection.query(
    "UPDATE users SET money = ?, total_money = ? WHERE `phone` = ?",
    [finalAmount, finalAmount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const freeSpinReward = async ({ data, user, res }) => {
  const amount = Number(data.amount);
  const userMoney = Number(user.money);

  const finalAmount = Number(userMoney + amount).toFixed(2);
  await connection.query(
    "UPDATE users SET money = ?, total_money = ? WHERE `phone` = ?",
    [finalAmount, finalAmount, user.phone],
  );

  return res.status(200).json({
    status: "0000",
    balance: finalAmount,
    err_text: "",
  });
};

const jdbController = {
  generateGameLink,
  mainFunction,
  gameCategoriesPage,
  gameQuickPopularList,
  gameSlotsPage,
};

const getUserDataByAuthPhoneNumber = async (phoneNumber) => {
  let [users] = await connection.query(
    "SELECT `phone`, `money`, `name_user` FROM users WHERE `phone` = ? ",
    [phoneNumber],
  );
  const user = users?.[0];

  if (user === undefined || user === null) {
    throw Error("Unable to get user data!");
  }

  return {
    phone: user.phone,
    money: Number(user.money),
    username: user.name_user,
  };
};

export default jdbController;
