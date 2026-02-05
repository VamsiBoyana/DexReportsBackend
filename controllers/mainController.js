const axios = require("axios");
const dotEnv = require("dotenv");
const { getUnixTimestamp } = require("../utils/mainUtils");
const PlatformSchema = require("../models/PlatformSchema");
const TokenSchema = require("../models/TokenSchema");
const WalletSchema = require("../models/WalletSchema");
const Report = require("../models/TokenReportsModel");
const WalletData = require("../models/walletBalanceModel");
const moment = require("moment");
const SettingsSchema = require("../models/SettingsSchema");
// const WalletData=require('../models/walletBalanceModel')
// const fetch = require('node-fetch'); // Ensure you have node-fetch installed

const WalletReport = require("../models/WalletReportsModel");
const TokenReport = require("../models/TokenReportsModel");
const PoolReport = require("../models/PoolReportsModel");
const Network = require("../models/NetworkSchema");
const Platform = require("../models/PlatformSchema");
const Token = require("../models/TokenSchema");
const Settings = require("../models/SettingsSchema");
const RWASchema = require("../models/rwaPools");
const DailyPoolTypeAggregate = require("../models/DailyPoolTypeAggregatesModel");
const rwaPoolsReport = require("../models/rwaPoolsReport");
const cron = require("node-cron");
const Holders = require("../models/holderSchema");
const { log } = require("node:console");
const { default: pLimit } = require("p-limit");
const { Types } = require("mongoose");
const {
  getAllWalletsData,
  savePoolsByWallet,
  getAllCompoundWalletsData,
  saveCompoundPoolsByWallet,
} = require("../controllers/walletsRevenue");
const CompanyPoolRevenue = require("../models/CompanyPoolRevenue");
const CompoundRevenue = require("../models/CompoundRevenue");
const LiquidityPool = require("../models/rwaPools");
const reportPool = require("../models/reportpool")

const { stat } = require("node:fs");
const { settings } = require("../server");

dotEnv.config();

// Get live token data from DexScreener
exports.getLiveTokenData = async (req, res, next) => {
  console.log("enters");

  // const chainId = req.query.chainId;
  // const tokenAddress = req.query.tokenAddress;
  const { chainId, tokenAddress } = req.query;
  console.log("req.query", req.query);

  if (!chainId || !tokenAddress) {
    return res.status(400).json({
      status: "error",
      message: "Missing chainId or tokenAddress",
    });
  }
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );

    if (response) {
      console.log("\nToken data from DexScreener Retrieved:", response.data);
    }
    const setting = await Settings.findOne({ status: true });
    console.log("setting", setting);

    return res.status(200).json({
      status: "success",
      message: "Token data fetched successfully",
      data: response.data,
      lpAdd: setting.lpRewardPercentage,
    });
  } catch (error) {
    console.error("Error fetching token data:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch token data",
      error: error.message,
    });
  }
};

exports.getLivePairsData = async (req, res, next) => {
  console.log("enters getLivePairsData");

  const { chainId, pairId } = req.query;
  console.log("req.query", req.query);

  if (!chainId || !pairId) {
    return res.status(400).json({
      status: "error",
      message: "Missing chainId or pairId",
    });
  }

  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairId}`
    );

    if (response?.data) {
      console.log(
        "\nPair data from DexScreener Retrieved:",
        response.data
      );
    }

    const setting = await Settings.findOne({ status: true });
    console.log("setting", setting);

    return res.status(200).json({
      status: "success",
      message: "Pair data fetched successfully",
      data: response.data,
      lpAdd: setting?.lpRewardPercentage || 0,
    });
  } catch (error) {
    console.error("Error fetching pair data:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch pair data",
      error: error.message,
    });
  }
};
// const rwaPoolsReport = require("../models/rwaPoolsReport");

/**
 * GET /api/reports/missing-dates
 */
exports.getMissingReportDates = async (req, res) => {
  try {
    const START = 20251101;
    const END = 20260121;

    // 1️⃣ Fetch existing startTime values
    const reports = await rwaPoolsReport.find(
      { startTime: { $gte: START, $lte: END } },
      { startTime: 1, _id: 0 }
    ).lean();

    const existingDates = new Set(reports.map(r => r.startTime));

    // 2️⃣ Generate full date range
    const missingDates = [];
    let current = new Date(2025, 10, 1); // 2025-11-01
    const endDate = new Date(2026, 0, 21); // 2026-01-21

    while (current <= endDate) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      const dateInt = Number(`${y}${m}${d}`);

      if (!existingDates.has(dateInt)) {
        missingDates.push(dateInt);
      }

      current.setDate(current.getDate() + 1);
    }

    return res.status(200).json({
      success: true,
      totalMissing: missingDates.length,
      missingDates
    });
  } catch (error) {
    console.error("Missing dates API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch missing dates"
    });
  }
};



// exports.getLiveTokenData = async (req, res, next) => {

//   const { timeframe } = req.query; // example: 'h24', 'h6', 'h1', 'm5'

//   try {
//         const tokens = await TokenSchema.find({ status: true });
//     if (!tokens || tokens.length === 0) {
//       return res.status(404).json({
//         status: "error",
//         message: "No active tokens found in the database",
//       });
//     }
//     const responses = await Promise.all(
//       tokens.map(t =>
//         axios.get(`https://api.dexscreener.com/tokens/v1/${t.chainId}/${t.tokenAddress}`)
//       )
//     );

//     const setting = await Settings.findOne({ status: true });
//     const lpAdd = Number(setting.lpRewardPercentage) || 0;

//     const tokenData = responses.map((res, i) => {
//       const d = res.data[0];  // Take first pair result

//       // volume object and apply multiplier if timeframe is provided
//       const volume = { ...d.volume };
//       let lpAddedVolume = null;
//       // If timeframe exists, calculate the LP added volume
//       if (timeframe && volume[timeframe] !== undefined) {
//         lpAddedVolume = parseFloat(((volume[timeframe] * lpAdd) / 100)
//         // .toFixed(4)
//       );
//       }

//       return {
//         chainId: d.chainId,
//         pairAddress: d.pairAddress,
//         baseToken: d.baseToken,
//         quoteToken: d.quoteToken,
//         priceUsd: d.priceUsd,
//         txns: d.txns,
//         volume, // updated
//         lpAddedVolume,
//         marketCap: d.marketCap,
//         priceChange: d.priceChange,
//         liquidity: d.liquidity,
//         imageUrl: d?.info?.imageUrl || null,
//       };
//     });

//     return res.status(200).json({
//       status: "success",
//       message: `Filtered token data fetched successfully${timeframe ? ` with ${timeframe} volume adjusted` : ""}`,
//       tokens: tokenData,
//     });
//   } catch (error) {
//     console.error("Error fetching filtered token data:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Failed to fetch token data",
//       error: error.message,
//     });
//   }
// };


//commented 16-12-25
// exports.getAllActivities = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   req,
//   res
// ) => {
//   try {
//     console.log(
//       "tokenAddress",
//       tokenAddress,
//       "chainId",
//       chainId,
//       "walletAddress",
//       walletAddress,
//       "innerWalletAddress",
//       innerWalletAddress,
//       "solAddress",
//       solAddress,
//       "usd_min",
//       usd_min,
//       "symbol",
//       symbol
//     );

//     // 🧠 Fallback if missing
//     // if (!from_time || !to_time) {
//     //   const today = moment.utc().startOf("day");
//     //   from_time = today.clone().subtract(1, "day").unix();
//     //   to_time = today.clone().subtract(1, "day").endOf("day").unix();
//     // }

//     // if (!startTime ) {
//     //   startTime = parseInt(moment.unix(from_time).utc().format("YYYYMMDD"));
//     //   endTime = parseInt(moment.unix(to_time).utc().add(1, "day").format("YYYYMMDD"));
//     // }

//     // console.log(`🕒 Processing Day: ${moment.unix(from_time).utc().format("YYYY-MM-DD")} | startTime=${startTime}, endTime=${endTime}`);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // const startTime = 20251020;
//     // const endTime=20251021

//     console.log("startTime", startTime, "endTime", endTime);

//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     console.log("Dexscreener Pair Details:", data);

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);
//     console.log("todayStart", todayStart, "tomorrowStart", tomorrowStart);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,
//     });
//     console.log("lastReportWalletBalance", lastReportWalletBalance);

//     // Count buys and sells using flow
//     let buys = 0;
//     let sells = 0;

//     allData.forEach((tx) => {
//       if (tx.flow === "in") buys++;
//       else if (tx.flow === "out") sells++;
//     });

//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs", // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();
//     console.log("Wallet Data:", walletEndBalances);
//     console.log("Wallet native_balance:", walletEndBalances.data.total_value);
//     console.log(
//       "Wallet balance:",
//       walletEndBalances.data.native_balance.balance
//     );
//     console.log(
//       "token_price:",
//       walletEndBalances.data.native_balance.token_price
//     );

//     const settings = await SettingsSchema.findOne({ status: "true" });
//     console.log("settings", settings);

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = symbol;
//     const filtered = allData.filter((tx) => tx.value >= usd_min);
//     console.log("filtered", filtered.length);
//     const filteredresets = allData.filter(
//       (tx) => tx.value < settings.usdMin || tx.value > settings.usdMax
//     );
//     console.log("filteredresets", filteredresets.length);
//     const filteredAgents = allData.filter(
//       (tx) => tx.value >= settings.usdMin && tx.value <= settings.usdMax
//     );
//     console.log("filteredAgents", filteredAgents.length);
//     const resetBuys = filteredresets.filter(
//       (tx) => tx.to_address === walletAddress
//     );
//     console.log("resetBuys", resetBuys.length);
//     const resetSells = filteredresets.filter(
//       (tx) => tx.from_address === walletAddress
//     );
//     console.log("resetSells", resetSells.length);
//     const resets = resetBuys.length + resetSells.length;
//     console.log("resets", resets);
//     const resetBuyVolume = resetBuys.reduce((s, t) => s + (t.value || 0), 0);
//     console.log("resetBuyVolumeUSD", resetBuyVolume);
//     const resetSellVolume = resetSells.reduce((s, t) => s + (t.value || 0), 0);
//     console.log("resetSellVolume", resetSellVolume);
//     const agentBuys = buys - resetBuys.length;
//     console.log("agentBuys", agentBuys);
//     const agentSells = sells - resetSells.length;
//     console.log("agentSells", agentSells);
//     const bundles = (agentBuys + agentSells) / 10;
//     console.log(bundles, "bundles");
//     const agentsVolume =
//       agentBuys * settings.amount + agentSells * settings.amount; //add feild from admin for 15
//     console.log("agentsVolume", agentsVolume);
//     // const averageVolume = (resetBuyVolume + resetSellVolume) / 2;   //no need
//     // console.log("averageVolume", averageVolume);
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     console.log("resetsVolume", resetsVolume);
//     const totalVolume = agentsVolume + resetsVolume;
//     console.log("totalVolume", totalVolume);
//     // const gasFee = allData.length * 0.000059; //bundles+resets*gasFee
//     let gasFee = 0;
//     if (bundles == 0) {
//       gasFee = resets * settings.gasFeePercentage;
//     } else {
//       gasFee = bundles * settings.gasFeePercentage + resets * 0.000005;
//     }
//     console.log("Gas Fee", gasFee);
//     const solAverage = solPriceData.data[0].price;
//     const tokenAverage = priceData.data[0].price;
//     console.log("solAverage", solAverage);
//     const gasFeeInDollars = gasFee * solAverage;
//     console.log("Gas Fee In Dollars", gasFeeInDollars);
//     const rayFee = (totalVolume * settings.tierFeePercentage); //tier fee 0.25%
//     console.log("rayFee", rayFee);
//     const lpAdd = (totalVolume * settings.lpRewardPercentage); //lp rewards %
//     console.log("lpAdd", lpAdd);
//     const priceImpact =
//       totalVolume * (settings.amount / solAverage / pooledSolAverage); //this is price Impact
//     const tip = bundles * settings.tipAmount; //tipAmount(dynamic from admin)
//     console.log("tip", tip);
//     console.log("priceImpact", priceImpact);
//     const walletStartBalance =
//       lastReportWalletBalance.walletEndBalance + innerTrasaction;
//     console.log("walletStartBalance", walletStartBalance);
//     const ExpectedCost = rayFee + gasFee + tip; //no need
//     console.log("ExpectedCost", ExpectedCost);
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     const walletEndBalance =
//       walletEndBalances.data.total_value /
//       walletEndBalances.data.native_balance.token_price;
//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     console.log("netCost", netCost);
//     const slipageAndloss = gasFee + rayFee + tip - walletLoss;

//     console.log("cost:", cost);
//     console.log("walletEndBalance:", walletEndBalance);
//     console.log("Profit/Loss in $:", walletLoss);
//     console.log("Slippage + Loss:", slipageAndloss);
//     console.log("walletEndBalance", walletEndBalance);
//     console.log("walletLoss : ", walletLoss);

//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys,
//       agentSells,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime,
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//     // return res.json({
//     //  message:"Success",
//     // //  data:newReport,
//     //   data: dataa,
//     // });
//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };


// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   req,
//   res) => {

//   try {



// // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
// // const solAddress = "So11111111111111111111111111111111111111112"
// // const chainId = "solana"
// // const usd_min = 15.2
// // const symbol = "TLOOP"
// // const name = "Time Loop"
// // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
// // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
// // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"




//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);



//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//        const from_time = yesterday2.unix();
//        const to_time = yesterdayEnd.unix();
//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date


//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // console.log("Dexscreener Pair Details:", data);

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     // console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,

//     })




//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);



//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;


//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });



//     const walletEndBalances = await response.json();


//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = symbol;

//     const solAverage = solPriceData.data[0].price;
//     const tokenAverage = priceData.data[0].price;


//     const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * solAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     const totalVolume = agentsVolume + resetsVolume;
//     let gasFee = 0
//     if (bundles == 0) {
//       gasFee = resets * settings.gasFeePercentage
//     } else {
//       gasFee = (bundles * settings.gasFeePercentage) + (resets * 0.000005);

//     }

//     const gasFeeInDollars = gasFee * solAverage;
//     const rayFee = (totalVolume * settings.tierFeePercentage);//tier fee 0.25%
//     const lpAdd = (totalVolume * settings.lpRewardPercentage); //lp rewards %
//     const priceImpact = totalVolume * ((settings.amount / solAverage) / pooledSolAverage);//this is price Impact
//     const tip = bundles * settings.tipAmount //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     const ExpectedCost = rayFee + gasFee + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     const walletEndBalance = walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price;
//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);



//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys:agentBuys.length,
//       agentSells:agentSells.length,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//     // return res.json({
//     //  message:"Success",
//     //  data:newReport,
//     //   // data: dataa,
//     // });
//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };


// exports.getTokenData = async (req, res) => {
//   try {
//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // console.log("Platforms Data:", platforms);  // Log platforms to check

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue; // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           tokenAddress,
//           solAddress,
//           chainId,
//           usd_min,
//           symbol,
//           name,
//           token_logo_url,
//         } = token;

//         const wallets = await WalletSchema.find({ tokenId: token._id });
//         if (!wallets || wallets.length === 0) {
//           console.log(`No wallets found for token ${symbol}. Skipping.`);
//           continue; // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < wallets.length; j++) {
//           const wallet = wallets[j];
//           if (!wallet) continue;

//           console.log(
//             `\n=== Processing wallet ${j + 1}/${
//               wallets.length
//             } for token ${symbol} ===`
//           );
//           const { innerWalletAddress, walletAddress } = wallet;

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getAllActivitiesDEFI(
//             tokenAddress,
//             solAddress,
//             chainId,
//             usd_min,
//             symbol,
//             name,
//             token_logo_url,
//             innerWalletAddress,
//             walletAddress
//           );

//           console.log(
//             `✅ Completed wallet ${walletAddress} for token ${symbol}\n`
//           );
//         }

//         console.log(`🔥 Completed all wallets for token ${symbol}`);
//       }
//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getTokenData:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };




//mine 16-12-25 added new dex reports 


exports.getAllActivities = async (
  tokenAddress,
  solAddress,
  chainId,
  usd_min,
  symbol,
  name,
  token_logo_url,
  innerWalletAddress,
  walletAddress,
  req,
  res
) => {
  try {
    console.log(
      "tokenAddress",
      tokenAddress,
      "chainId",
      chainId,
      "walletAddress",
      walletAddress,
      "innerWalletAddress",
      innerWalletAddress,
      "solAddress",
      solAddress,
      "usd_min",
      usd_min,
      "symbol",
      symbol
    );

    // 🧠 Fallback if missing
    // if (!from_time || !to_time) {
    //   const today = moment.utc().startOf("day");
    //   from_time = today.clone().subtract(1, "day").unix();
    //   to_time = today.clone().subtract(1, "day").endOf("day").unix();
    // }

    // if (!startTime ) {
    //   startTime = parseInt(moment.unix(from_time).utc().format("YYYYMMDD"));
    //   endTime = parseInt(moment.unix(to_time).utc().add(1, "day").format("YYYYMMDD"));
    // }

    // console.log(`🕒 Processing Day: ${moment.unix(from_time).utc().format("YYYY-MM-DD")} | startTime=${startTime}, endTime=${endTime}`);

    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const pageSize = 100;

    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // const startTime = 20251020;
    // const endTime=20251021

    console.log("startTime", startTime, "endTime", endTime);

    let allData = [];
    let page = 1;
    let hasMoreData = true;

    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };

    const currentDate = new Date();
    const today = currentDate.toLocaleDateString();

    currentDate.setDate(currentDate.getDate() - 1);
    const yesterday = currentDate.toLocaleDateString();

    console.log("tokenAddress", tokenAddress, "chainId", chainId);

    const responsetoday = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );
    if (!responsetoday.ok) {
      throw new Error("Failed to fetch data from Dexscreener");
    }
    const data = await responsetoday.json();

    console.log("Dexscreener Pair Details:", data);

    // Extract the liquidity details
    const liquidityData = data[0].liquidity;

    const pooledTokenToday = liquidityData.base;
    const pooledSOLToday = liquidityData.quote;

    const pooledTokenAverage = pooledTokenToday;

    const pooledSolAverage = pooledSOLToday;

    const responseSolPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseSolPrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const solPriceData = await responseSolPrice.json();
    console.log("Average Token Price:", solPriceData.data[0].price);

    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const priceData = await responsePrice.json();
    console.log("Average Token Price:", priceData.data[0].price);
    let filteredData = [];

    const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
    const responsee = await fetch(urll, requestOptions);
    const dataa = await responsee.json();

    const filteredTransactions = dataa.data.filter((tx) => {
      return (
        tx.flow === "out" &&
        tx.from_address === innerWalletAddress &&
        tx.to_address === tokenAddress
      );
    });

    console.log("Filtered Transactions:", filteredTransactions);

    //   // Concatenate the filtered transactions to our result array

    let innerTrasaction = 0;
    filteredData = filteredData.concat(filteredTransactions);

    console.log("filteredData", filteredData);

    if (filteredData.length == 0) {
      innerTrasaction = 0;
    } else {
      innerTrasaction =
        filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

      console.log(innerTrasaction, "innerTrasaction");
    }

    while (hasMoreData) {
      const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        page++;
        console.log("Fetched page", page);
      } else {
        hasMoreData = false;
      }
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);
    console.log("todayStart", todayStart, "tomorrowStart", tomorrowStart);

    const lastReportWalletBalance = await WalletReport.findOne({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startT,
      walletAddress: walletAddress,
    });
    console.log("lastReportWalletBalance", lastReportWalletBalance);

    // Count buys and sells using flow
    let buys = 0;
    let sells = 0;

    allData.forEach((tx) => {
      if (tx.flow === "in") buys++;
      else if (tx.flow === "out") sells++;
    });

    const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs", // Replace with your Solscan Pro API key
      },
    });

    const walletEndBalances = await response.json();
    console.log("Wallet Data:", walletEndBalances);
    console.log("Wallet native_balance:", walletEndBalances.data.total_value);
    console.log(
      "Wallet balance:",
      walletEndBalances.data.native_balance.balance
    );
    console.log(
      "token_price:",
      walletEndBalances.data.native_balance.token_price
    );

    const settings = await SettingsSchema.findOne({ status: "true" });
    console.log("settings", settings);

    const tokenName = name;
    const tokenIcon = token_logo_url;
    const tokenSymbol = symbol;
    const filtered = allData.filter((tx) => tx.value >= usd_min);
    console.log("filtered", filtered.length);
    const filteredresets = allData.filter(
      (tx) => tx.value < settings.usdMin || tx.value > settings.usdMax
    );
    console.log("filteredresets", filteredresets.length);
    const filteredAgents = allData.filter(
      (tx) => tx.value >= settings.usdMin && tx.value <= settings.usdMax
    );
    console.log("filteredAgents", filteredAgents.length);
    const resetBuys = filteredresets.filter(
      (tx) => tx.to_address === walletAddress
    );
    console.log("resetBuys", resetBuys.length);
    const resetSells = filteredresets.filter(
      (tx) => tx.from_address === walletAddress
    );
    console.log("resetSells", resetSells.length);
    const resets = resetBuys.length + resetSells.length;
    console.log("resets", resets);
    const resetBuyVolume = resetBuys.reduce((s, t) => s + (t.value || 0), 0);
    console.log("resetBuyVolumeUSD", resetBuyVolume);
    const resetSellVolume = resetSells.reduce((s, t) => s + (t.value || 0), 0);
    console.log("resetSellVolume", resetSellVolume);
    const agentBuys = buys - resetBuys.length;
    console.log("agentBuys", agentBuys);
    const agentSells = sells - resetSells.length;
    console.log("agentSells", agentSells);
    const bundles = (agentBuys + agentSells) / 10;
    console.log(bundles, "bundles");
    const agentsVolume =
      agentBuys * settings.amount + agentSells * settings.amount; //add feild from admin for 15
    console.log("agentsVolume", agentsVolume);
    // const averageVolume = (resetBuyVolume + resetSellVolume) / 2;   //no need
    // console.log("averageVolume", averageVolume);
    const resetsVolume = resetBuyVolume + resetSellVolume;
    console.log("resetsVolume", resetsVolume);
    const totalVolume = agentsVolume + resetsVolume;
    console.log("totalVolume", totalVolume);
    // const gasFee = allData.length * 0.000059; //bundles+resets*gasFee
    let gasFee = 0;
    if (bundles == 0) {
      gasFee = resets * settings.gasFeePercentage;
    } else {
      gasFee = bundles * settings.gasFeePercentage + resets * 0.000005;
    }
    console.log("Gas Fee", gasFee);
    const solAverage = solPriceData.data[0].price;
    const tokenAverage = priceData.data[0].price;
    console.log("solAverage", solAverage);
    const gasFeeInDollars = gasFee * solAverage;
    console.log("Gas Fee In Dollars", gasFeeInDollars);
    const rayFee = (totalVolume * settings.tierFeePercentage); //tier fee 0.25%
    console.log("rayFee", rayFee);
    const lpAdd = (totalVolume * settings.lpRewardPercentage); //lp rewards %
    console.log("lpAdd", lpAdd);
    const priceImpact =
      totalVolume * (settings.amount / solAverage / pooledSolAverage); //this is price Impact
    const tip = bundles * settings.tipAmount; //tipAmount(dynamic from admin)
    console.log("tip", tip);
    console.log("priceImpact", priceImpact);
    const walletStartBalance =
      (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
    console.log("walletStartBalance", walletStartBalance);
    const ExpectedCost = rayFee + gasFee + tip; //no need
    console.log("ExpectedCost", ExpectedCost);
    const cost = rayFee + gasFeeInDollars; //need to add Tip
    let walletEndBalance =
      walletEndBalances.data.total_value /
      walletEndBalances.data.native_balance.token_price;

    // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
    // const newWalletsWithZeroBalance = [
    //   "AYLPJRYEZUYwUoTNS7bNqvrb5RHCXZrNFYVTU6S6Y8xT",
    //   "C7ySm1AiZuFxFM9DZGuX62ebdyxzTXm1RnoKsdufos9i",
    //   "FTWXBVPvmdmbrQe7DXp5W9qHJKxDnpvnduHgxt9r9w99",
    //   "B9Zb4xWXNTgF6mhy59ezGeWrvNArTvFPkNsLEPP426T2",
    //   "3Djd84gQmKmbPa3UHJC8yFVjbHSCQ6hEp1NdtD18uGA8"
    // ];

    // if (newWalletsWithZeroBalance.includes(walletAddress)) {
    //   walletEndBalance = 0;
    //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
    // }

    const pP = walletEndBalance;
    const walletLoss = ((walletStartBalance - walletEndBalance) * solAverage);
    const totalCost = walletLoss;
    const netCost = totalCost - lpAdd;
    console.log("netCost", netCost);
    const slipageAndloss = gasFee + rayFee + tip - walletLoss;

    console.log("cost:", cost);
    console.log("walletEndBalance:", walletEndBalance);
    console.log("Profit/Loss in $:", walletLoss);
    console.log("Slippage + Loss:", slipageAndloss);
    console.log("walletEndBalance", walletEndBalance);
    console.log("walletLoss : ", walletLoss);

    const newReport = new WalletReport({
      tokenName,
      tokenIcon,
      tokenSymbol,
      walletAddress,
      token: tokenAddress,
      tokenAverage,
      totalTransactions: allData.length,
      totalVolume,
      buys,
      sells,
      resetBuys: resetBuys.length,
      resetSells: resetSells.length,
      resetsVolume,
      solAverage,
      tokenAverage,
      resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
      resetSellVolumeUSD: resetSellVolume.toFixed(2),
      agentBuys,
      agentSells,
      bundles,
      pooledTokenAverage,
      pooledSolAverage,
      lpAdd,
      // averageVolume,
      agentsVolume,
      gasFee,
      gasFeeInDollars,
      rayFee,
      walletStartBalance,
      walletLoss,
      walletEndBalance,
      ExpectedCost,
      priceImpact,
      slipageAndloss,
      cost,
      totalCost,
      netCost,
      tip,
      pP,
      from_time,
      to_time,
      startTime,
      endTime: startTime,
    });

    await newReport.save();

    // const walletLoss = rayFee + gasFee -
    console.log("Success ");

    // return res.json({
    //  message:"Success",
    // //  data:newReport,
    //   data: dataa,
    // });
  } catch (err) {
    console.error("Error fetching data:", err);

    // if (!res.headersSent) return res.status(500).send("Internal Server Error");
  }
};

//commented on 20-12-25
// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   req,
//   res) => {

//   try {

// // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
// // const solAddress = "So11111111111111111111111111111111111111112"
// // const chainId = "solana"
// // const usd_min = 15.2
// // const symbol = "TLOOP"
// // const name = "Time Loop"
// // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
// // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
// // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);



//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//        const from_time = yesterday2.unix();
//        const to_time = yesterdayEnd.unix();
//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date


//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     // console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,

//     })

//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);



//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;


//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();


//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = symbol;

//     const solAverage = solPriceData.data[0].price;
//     const tokenAverage = priceData.data[0].price;


//     const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * solAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1/(10**t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     const totalVolume = agentsVolume + resetsVolume;
//     let gasFee = 0
//     if (bundles == 0) {
//       gasFee = resets * settings.gasFeePercentage
//     } else {
//       gasFee = (bundles * settings.gasFeePercentage) + (resets * 0.000005);

//     }

//     const gasFeeInDollars = gasFee * solAverage;
//     const rayFee = (totalVolume * settings.tierFeePercentage);//tier fee 0.25%
//     const lpAdd = (totalVolume * settings.lpRewardPercentage); //lp rewards %
//     const priceImpact = totalVolume * ((settings.amount / solAverage) / pooledSolAverage);//this is price Impact
//     const tip = bundles * settings.tipAmount //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     const ExpectedCost = rayFee + gasFee + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     let walletEndBalance = walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price;

//     // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
//     // const newWalletsWithZeroBalance = [
//     //   "AYLPJRYEZUYwUoTNS7bNqvrb5RHCXZrNFYVTU6S6Y8xT",
//     //   "C7ySm1AiZuFxFM9DZGuX62ebdyxzTXm1RnoKsdufos9i",
//     //   "FTWXBVPvmdmbrQe7DXp5W9qHJKxDnpvnduHgxt9r9w99",
//     //   "B9Zb4xWXNTgF6mhy59ezGeWrvNArTvFPkNsLEPP426T2",
//     //   "3Djd84gQmKmbPa3UHJC8yFVjbHSCQ6hEp1NdtD18uGA8"
//     // ];

//     // if (newWalletsWithZeroBalance.includes(walletAddress)) {
//     //   walletEndBalance = 0;
//     //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
//     // }

//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys:agentBuys.length,
//       agentSells:agentSells.length,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };

//commented on 22-12-25
// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   pairAddress,
//   req,
//   res) => {

//   try {

//     // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
//     // const solAddress = "So11111111111111111111111111111111111111112"
//     // const chainId = "solana"
//     // const usd_min = 15.2
//     // const symbol = "TLOOP"
//     // const name = "Time Loop"
//     // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
//     // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
//     // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);



//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date


//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     // console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,

//     })

//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);



//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;


//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();


//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = symbol;

//     const solAverage = solPriceData.data[0].price;
//     const tokenAverage = priceData.data[0].price;


//     const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * solAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     const totalVolume = agentsVolume + resetsVolume;
//     let gasFee = 0
//     if (bundles == 0) {
//       gasFee = resets * settings.gasFeePercentage
//     } else {
//       gasFee = (bundles * settings.gasFeePercentage) + (resets * 0.000005);

//     }

//     const gasFeeInDollars = gasFee * solAverage;
//     const rayFee = (totalVolume * settings.tierFeePercentage);//tier fee 0.25%
//     const lpAdd = (totalVolume * settings.lpRewardPercentage); //lp rewards %
//     const priceImpact = totalVolume * ((settings.amount / solAverage) / pooledSolAverage);//this is price Impact
//     const tip = bundles * settings.tipAmount //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     const ExpectedCost = rayFee + gasFee + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     let walletEndBalance = walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price;

//     // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
//     // const newWalletsWithZeroBalance = [
//     //   "AYLPJRYEZUYwUoTNS7bNqvrb5RHCXZrNFYVTU6S6Y8xT",
//     //   "C7ySm1AiZuFxFM9DZGuX62ebdyxzTXm1RnoKsdufos9i",
//     //   "FTWXBVPvmdmbrQe7DXp5W9qHJKxDnpvnduHgxt9r9w99",
//     //   "B9Zb4xWXNTgF6mhy59ezGeWrvNArTvFPkNsLEPP426T2",
//     //   "3Djd84gQmKmbPa3UHJC8yFVjbHSCQ6hEp1NdtD18uGA8"
//     // ];

//     // if (newWalletsWithZeroBalance.includes(walletAddress)) {
//     //   walletEndBalance = 0;
//     //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
//     // }

//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys: agentBuys.length,
//       agentSells: agentSells.length,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       pairAddress,
//       symbol,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };

//added on 22-12-25
// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   pairAddress,
//   req,
//   res) => {

//   try {

//     // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
//     // const solAddress = "So11111111111111111111111111111111111111112"
//     // const chainId = "solana"
//     // const usd_min = 15.2
//     // const symbol = "TLOOP"
//     // const name = "Time Loop"
//     // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
//     // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
//     // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Fetch wallet from WalletSchema to get the symbol
//     const walletQuery = { walletAddress: walletAddress };
//     // if (innerWalletAddress) {
//     //   walletQuery.innerWalletAddress = innerWalletAddress;
//     // }
//     // if (pairAddress) {
//     //   walletQuery.pairAddress = pairAddress;
//     // }
//     const wallet = await WalletSchema.findOne(walletQuery);

//     // Use symbol from wallet schema if available, otherwise fallback to parameter
//     const walletSymbol = wallet?.symbol || symbol;

//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     // console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,

//     })

//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;


//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();


//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = walletSymbol;

//     // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     const solAverage = solPriceData?.data?.[0]?.price || 0;
//     const tokenAverage = priceData?.data?.[0]?.price || 0;


//     const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * solAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     const totalVolume = agentsVolume + resetsVolume;
//     let gasFee = 0
//     // Add null check for settings to prevent errors when no transactions
//     if (settings) {
//       if (bundles == 0) {
//         gasFee = resets * (settings.gasFeePercentage || 0)
//       } else {
//         gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
//       }
//     }

//     const gasFeeInDollars = gasFee * solAverage;
//     const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
//     const lpAdd = settings ? (totalVolume * (settings.lpRewardPercentage || 0)) : 0; //lp rewards %
//     const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0 
//       ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage) 
//       : 0; //this is price Impact
//     const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     const ExpectedCost = rayFee + gasFee + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price) 
//       ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price 
//       : 0;

//     // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
//     // const newWalletsWithZeroBalance = [
//     //   "AYLPJRYEZUYwUoTNS7bNqvrb5RHCXZrNFYVTU6S6Y8xT",
//     //   "C7ySm1AiZuFxFM9DZGuX62ebdyxzTXm1RnoKsdufos9i",
//     //   "FTWXBVPvmdmbrQe7DXp5W9qHJKxDnpvnduHgxt9r9w99",
//     //   "B9Zb4xWXNTgF6mhy59ezGeWrvNArTvFPkNsLEPP426T2",
//     //   "3Djd84gQmKmbPa3UHJC8yFVjbHSCQ6hEp1NdtD18uGA8"
//     // ];

//     // if (newWalletsWithZeroBalance.includes(walletAddress)) {
//     //   walletEndBalance = 0;
//     //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
//     // }

//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys: agentBuys.length,
//       agentSells: agentSells.length,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       pairAddress,
//       symbol: walletSymbol,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };


//commented on 20-12-25
// exports.getTokenData = async (req, res) => {
//   try {
//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // console.log("Platforms Data:", platforms);  // Log platforms to check

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue; // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           tokenAddress,
//           solAddress,
//           chainId,
//           usd_min,
//           symbol,
//           name,
//           token_logo_url,
//         } = token;

//         const wallets = await WalletSchema.find({ tokenId: token._id });
//         if (!wallets || wallets.length === 0) {
//           console.log(`No wallets found for token ${symbol}. Skipping.`);
//           continue; // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < wallets.length; j++) {
//           const wallet = wallets[j];
//           if (!wallet) continue;

//           console.log(
//             `\n=== Processing wallet ${j + 1}/${
//               wallets.length
//             } for token ${symbol} ===`
//           );
//           const { innerWalletAddress, walletAddress } = wallet;

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getAllActivitiesDEFI(
//             tokenAddress,
//             solAddress,
//             chainId,
//             usd_min,
//             symbol,
//             name,
//             token_logo_url,
//             innerWalletAddress,
//             walletAddress
//           );

//           console.log(
//             `✅ Completed wallet ${walletAddress} for token ${symbol}\n`
//           );
//         }

//         console.log(`🔥 Completed all wallets for token ${symbol}`);
//       }
//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getTokenData:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };



// exports.getTokenData = async (req, res) => {
//   try {
//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // console.log("Platforms Data:", platforms);  // Log platforms to check

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue; // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           tokenAddress,
//           solAddress,
//           chainId,
//           usd_min,
//           symbol,
//           name,
//           token_logo_url,
//         } = token;

//         const wallets = await WalletSchema.find({ tokenId: token._id });
//         if (!wallets || wallets.length === 0) {
//           console.log(`No wallets found for token ${symbol}. Skipping.`);
//           continue; // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < wallets.length; j++) {
//           const wallet = wallets[j];
//           if (!wallet) continue;

//           console.log(
//             `\n=== Processing wallet ${j + 1}/${wallets.length
//             } for token ${symbol} ===`
//           );
//           const { innerWalletAddress, walletAddress, pairAddress } = wallet;

//           // Get pairAddress from wallet, or fallback to token's pairAddress
//           // const pairAddress = walletPairAddress || token.pairAddress || null;

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getAllActivitiesDEFI(
//             tokenAddress,
//             solAddress,
//             chainId,
//             usd_min,
//             symbol,
//             name,
//             token_logo_url,
//             innerWalletAddress,
//             walletAddress,
//             pairAddress
//           );

//           console.log(
//             `✅ Completed wallet ${walletAddress} for token ${symbol}\n`
//           );
//         }

//         console.log(`🔥 Completed all wallets for token ${symbol}`);
//       }
//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getTokenData:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };


//added on 26-12-25
// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   pairAddress,
//   poolType,
//   req,
//   res) => {

//   try {
//     // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
//     // const solAddress = "So11111111111111111111111111111111111111112"
//     // const chainId = "solana"
//     // const usd_min = 15.2
//     // const symbol = "TLOOP"
//     // const name = "Time Loop"
//     // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
//     // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
//     // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log(from_time, to_time, "from_time, to_time");

//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Fetch wallet from WalletSchema to get the symbol
//     const walletQuery = { walletAddress: walletAddress };
//     // if (innerWalletAddress) {
//     //   walletQuery.innerWalletAddress = innerWalletAddress;
//     // }
//     // if (pairAddress) {
//     //   walletQuery.pairAddress = pairAddress;
//     // }
//     const wallet = await WalletSchema.findOne(walletQuery);

//     // Use symbol from wallet schema if available, otherwise fallback to parameter
//     const walletSymbol = wallet?.symbol || symbol;

//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responseSolPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseSolPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const solPriceData = await responseSolPrice.json();
//     // console.log("Average Token Price:", solPriceData.data[0].price);

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,

//     })

//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;


//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();

//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = walletSymbol;

//     // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     const solAverage = solPriceData?.data?.[0]?.price || 0;
//     const tokenAverage = priceData?.data?.[0]?.price || 0;

//     const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * solAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     const resetsVolume = resetBuyVolume + resetSellVolume;
//     const totalVolume = agentsVolume + resetsVolume;

//     let gasFee = 0
//     // Add null check for settings to prevent errors when no transactions
//     if (settings) {
//       if (bundles == 0) {
//         gasFee = resets * (settings.gasFeePercentage || 0)
//       } else {
//         gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
//       }
//     }

//     const gasFeeInDollars = - (gasFee * solAverage);
//     const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });
//     // const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
//     const rayFee = - (totalVolume * (liquidityPool.lpPercentage || 0)); //tier fee %
//     const lpAdd = (totalVolume * (liquidityPool.lpPercentage || 0)) * settings.lpRewardPool; //lp rewards %
//     const rayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
//     const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0
//     ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage)
//     : 0; //this is price Impact
//     const yeild = ((totalVolume * liquidityPool.lpPercentage)*settings.lpRewardPool);
//     const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     const ExpectedCost = rayFee + gasFee + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price)
//       ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price
//       : 0;

//     // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
//     // const newWalletsWithZeroBalance = [
//     //   "8eWQ1vRtbTVP9Ah29jKRj1HfMNX8CDvhrMYs8QD16yH8",
//     //   "5ndh4EmCZZu7PSV4u6adE3q6dnNK86ShAiSpWG1j74H3",
//     //   "7TgVg4Atx42ti4hEXtMa5gGu3S7L89xDmVPenByKQcxt",
//     // ];

//     // if (newWalletsWithZeroBalance.includes(walletAddress)) {
//     //   walletEndBalance = 0;
//     //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
//     // }

//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       resetsVolume,
//       solAverage,
//       tokenAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys: agentBuys.length,
//       agentSells: agentSells.length,
//       bundles,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       rayCost,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       tip,
//       pP,
//       yeild,
//       pairAddress,
//       symbol: walletSymbol,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime,
//       poolType: poolType
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");

//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };



exports.getAllActivitiesDEFI = async (
  tokenAddress,
  solAddress,
  chainId,
  usd_min,
  symbol,
  name,
  token_logo_url,
  innerWalletAddress,
  walletAddress,
  pairAddress,
  poolType,
  req,
  res) => {

  try {
    // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
    // const solAddress = "So11111111111111111111111111111111111111112"
    // const chainId = "solana"
    // const usd_min = 15.2
    // const symbol = "TLOOP"
    // const name = "Time Loop"
    // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
    // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
    // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

    console.log(
      "tokenAddress", tokenAddress,
      "chainId", chainId,
      "walletAddress", walletAddress,
      "innerWalletAddress", innerWalletAddress,
      "solAddress", solAddress,
      "usd_min", usd_min,
      "symbol", symbol);

    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log(from_time, to_time, "from_time, to_time");

    // console.log({
    //   from_time,
    //   to_time,
    //   from_time_readable: moment
    //     .unix(from_time)
    //     .utc()
    //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    //   to_time_readable: moment
    //     .unix(to_time)
    //     .utc()
    //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    // });
    // console.log("from_time", from_time, "to_time", to_time);

    const pageSize = 100;

    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Fetch wallet from WalletSchema to get the symbol
    const walletQuery = { walletAddress: walletAddress };
    // if (innerWalletAddress) {
    //   walletQuery.innerWalletAddress = innerWalletAddress;
    // }
    // if (pairAddress) {
    //   walletQuery.pairAddress = pairAddress;
    // }
    const wallet = await WalletSchema.findOne(walletQuery);

    // Use symbol from wallet schema if available, otherwise fallback to parameter
    const walletSymbol = wallet?.symbol || symbol;

    let allData = [];
    let page = 1;
    let hasMoreData = true;


    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };

    const currentDate = new Date();
    const today = currentDate.toLocaleDateString();

    currentDate.setDate(currentDate.getDate() - 1);
    const yesterday = currentDate.toLocaleDateString();

    // console.log("tokenAddress", tokenAddress, "chainId", chainId);

    const responsetoday = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );
    if (!responsetoday.ok) {
      throw new Error("Failed to fetch data from Dexscreener");
    }
    const data = await responsetoday.json();

    // Extract the liquidity details
    const liquidityData = data[0].liquidity;

    const pooledTokenToday = liquidityData.base;
    const pooledSOLToday = liquidityData.quote;

    const pooledTokenAverage = pooledTokenToday;

    const pooledSolAverage = pooledSOLToday;


    // console.log("Average Token Price:", solPriceData.data[0].price);


    // console.log("Average Token Price:", priceData.data[0].price);
    let filteredData = [];

    const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
    const responsee = await fetch(urll, requestOptions);
    const dataa = await responsee.json();

    const filteredTransactions = dataa.data.filter((tx) => {
      return (
        tx.flow === "out" &&
        tx.from_address === innerWalletAddress &&
        tx.to_address === tokenAddress
      );
    });

    // console.log("Filtered Transactions:", filteredTransactions);

    //   // Concatenate the filtered transactions to our result array

    let innerTrasaction = 0;
    filteredData = filteredData.concat(filteredTransactions);

    // console.log("filteredData", filteredData);

    if (filteredData.length == 0) {
      innerTrasaction = 0;
    } else {
      innerTrasaction =
        filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

      // console.log(innerTrasaction, "innerTrasaction");
    }

    while (hasMoreData) {
      // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        page++;
        console.log("Fetched page", page);
      } else {
        hasMoreData = false;
      }
    }

    // Filter transactions by trans_id: common (duplicates) vs unique
    const transIdCount = {};
    allData.forEach((tx) => {
      const transId = tx.trans_id;
      transIdCount[transId] = (transIdCount[transId] || 0) + 1;
    });

    const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
    const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

    const lastReportWalletBalance = await WalletReport.findOne({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startT,
      walletAddress: walletAddress,

    })

    const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
    const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

    // Count buys and sells using flow
    const buys = buytxns.length;
    const sells = selltxns.length;


    const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
      },
    });

    const walletEndBalances = await response.json();

    const settings = await SettingsSchema.findOne({ status: "true" });

    const tokenName = name;
    const tokenIcon = token_logo_url;
    const tokenSymbol = walletSymbol;

    // Get token1 and token2 from first transaction if available, otherwise use known addresses
    // token1 is typically the tracked token, token2 is typically SOL
    const firstTx = allData.length > 0 ? allData[0] : null;
    const token1 = firstTx?.routers?.token1 || tokenAddress;
    const token2 = firstTx?.routers?.token2 || solAddress;

    console.log("token1", token1, "token2", token2);

    const token =
      tokenAddress === token1 ? token1 :
        tokenAddress === token2 ? token2 :
          null;

    const address =
      tokenAddress === token1 ? token2 :
        tokenAddress === token2 ? token1 :
          null;

    console.log("token", token, "address", address);

    // Fetch token (tracked token) price for this day
    const responseTokenPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${token}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseTokenPrice.ok) {
      throw new Error("Network response was not ok for token price");
    }
    const tokenPriceData = await responseTokenPrice.json();

    // Fetch SOL price explicitly using solAddress param
    const responseSolPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseSolPrice.ok) {
      throw new Error("Network response was not ok for SOL price");
    }
    const solPriceData = await responseSolPrice.json();

    // Optionally fetch the counter-asset (pair) price if we could detect it
    let addressAverage = 0;
    if (address) {
      const responseAddressPrice = await fetch(
        `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
        requestOptions
      );
      if (!responseAddressPrice.ok) {
        console.warn("Failed to fetch counter-asset price, defaulting to 0");
      } else {
        const addressPriceData = await responseAddressPrice.json();
        addressAverage = addressPriceData?.data?.[0]?.price || 0;
      }
    }

    // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
    const solAverage = solPriceData?.data?.[0]?.price || 0;
    const tokenAverage = tokenPriceData?.data?.[0]?.price || 0;

    const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

    const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

    const resets = resetBuys.length + resetSells.length;

    // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    const resetBuyVolume = resetBuyVolumeInSol * solAverage;
    // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    const resetSellVolume = resetSellVolumeInSol * tokenAverage;
    // const agentBuys = buys - resetBuys.length;
    const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
    const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
    const bundles = (agentBuys.length + agentSells.length) / 10;
    // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
    const agentBuyVolume = agentBuyVolumeInSol * solAverage;
    // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
    const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    const agentSellVolume = agentSellVolumeInToken * tokenAverage;
    const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
    const resetsVolume = resetBuyVolume + resetSellVolume;
    const totalVolume = agentsVolume + resetsVolume;

    let gasFee = 0
    // Add null check for settings to prevent errors when no transactions
    if (settings) {
      if (bundles == 0) {
        gasFee = resets * (settings.gasFeePercentage || 0)
      } else {
        gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
      }
    }

    const gasFeeInDollars = - (gasFee * solAverage);
    const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });
    // const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
    const rayFee = - (totalVolume * (liquidityPool.lpPercentage || 0)); //tier fee %
    const lpAdd = (totalVolume * (liquidityPool.lpPercentage || 0)) * settings.lpRewardPool; //lp rewards %
    const rayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
    const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0
      ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage)
      : 0; //this is price Impact
    const yeild = ((totalVolume * liquidityPool.lpPercentage) * settings.lpRewardPool);
    const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
    const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
    const ExpectedCost = rayFee + gasFee + tip;//no need
    const cost = rayFee + gasFeeInDollars; //need to add Tip
    // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
    let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price)
      ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price
      : 0;

    // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
    // const newWalletsWithZeroBalance = [
    //   "8eWQ1vRtbTVP9Ah29jKRj1HfMNX8CDvhrMYs8QD16yH8",
    //   "5ndh4EmCZZu7PSV4u6adE3q6dnNK86ShAiSpWG1j74H3",
    //   "7TgVg4Atx42ti4hEXtMa5gGu3S7L89xDmVPenByKQcxt",
    // ];

    // if (newWalletsWithZeroBalance.includes(walletAddress)) {
    //   walletEndBalance = 0;
    //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
    // }

    const pP = walletEndBalance;
    const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
    const totalCost = walletLoss;
    const netCost = totalCost - lpAdd;
    const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

    const newReport = new WalletReport({
      tokenName,
      tokenIcon,
      tokenSymbol,
      walletAddress,
      token: tokenAddress,
      tokenAverage,
      totalTransactions: allData.length,
      totalVolume,
      buys,
      sells,
      resetBuys: resetBuys.length,
      resetSells: resetSells.length,
      resetsVolume,
      solAverage,
      addressAverage,
      tokenAverage,
      resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
      resetSellVolumeUSD: resetSellVolume.toFixed(2),
      agentBuys: agentBuys.length,
      agentSells: agentSells.length,
      bundles,
      pooledTokenAverage,
      pooledSolAverage,
      lpAdd,
      // averageVolume,
      agentsVolume,
      gasFee,
      gasFeeInDollars,
      rayFee,
      rayCost,
      walletStartBalance,
      walletLoss,
      walletEndBalance,
      ExpectedCost,
      priceImpact,
      slipageAndloss,
      cost,
      totalCost,
      netCost,
      tip,
      pP,
      yeild,
      pairAddress,
      symbol: walletSymbol,
      from_time,
      to_time,
      startTime,
      endTime: startTime,
      poolType: poolType
    });

    await newReport.save();

    // const walletLoss = rayFee + gasFee -
    console.log("Success ");

  } catch (err) {
    console.error("Error fetching data:", err);

    // if (!res.headersSent) return res.status(500).send("Internal Server Error");
  }
};



//added on 29-01-2026
// exports.getAllActivitiesDEFI = async (
//   tokenAddress,
//   solAddress,
//   chainId,
//   usd_min,
//   symbol,
//   name,
//   token_logo_url,
//   innerWalletAddress,
//   walletAddress,
//   pairAddress,
//   poolType,
//   req,
//   res) => {

//   try {
//     // const tokenAddress = "8XBLvrhz2mnFSq7koFdkgRSeATb3cJ38GofTQmhf2QRi"
//     // const solAddress = "So11111111111111111111111111111111111111112"
//     // const chainId = "solana"
//     // const usd_min = 15.2
//     // const symbol = "TLOOP"
//     // const name = "Time Loop"
//     // const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
//     // const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
//     // const walletAddress = "2Bm7D9pzHBeC9FEoaZMQsRaXjvCuVv8bqXzeqv9RyDo1"

//     console.log(
//       "tokenAddress", tokenAddress,
//       "chainId", chainId,
//       "walletAddress", walletAddress,
//       "innerWalletAddress", innerWalletAddress,
//       "solAddress", solAddress,
//       "usd_min", usd_min,
//       "symbol", symbol);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log(from_time, to_time, "from_time, to_time");

//     // console.log({
//     //   from_time,
//     //   to_time,
//     //   from_time_readable: moment
//     //     .unix(from_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     //   to_time_readable: moment
//     //     .unix(to_time)
//     //     .utc()
//     //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     // });
//     // console.log("from_time", from_time, "to_time", to_time);

//     const pageSize = 100;

//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Fetch wallet from WalletSchema to get the symbol
//     const walletQuery = { walletAddress: walletAddress };
//     // if (innerWalletAddress) {
//     //   walletQuery.innerWalletAddress = innerWalletAddress;
//     // }
//     // if (pairAddress) {
//     //   walletQuery.pairAddress = pairAddress;
//     // }
//     const wallet = await WalletSchema.findOne(walletQuery);

//     // Use symbol from wallet schema if available, otherwise fallback to parameter
//     const walletSymbol = wallet?.symbol || symbol;

//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;


//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN,
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();

//     // console.log("tokenAddress", tokenAddress, "chainId", chainId);
//  const solanaAddress = "So11111111111111111111111111111111111111112"


//     /* =====================================================
//        4️⃣ DEXSCREENER LIQUIDITY
//        ===================================================== */

//     const responsetoday = await fetch(
//       `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
//     );
//     if (!responsetoday.ok) {
//       throw new Error("Failed to fetch data from Dexscreener");
//     }
//     const data = await responsetoday.json();

//     // Extract the liquidity details
//     const liquidityData = data[0].liquidity;

//     const pooledTokenToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTokenAverage = pooledTokenToday;

//     const pooledSolAverage = pooledSOLToday;


//     // console.log("Average Token Price:", solPriceData.data[0].price);


//     // console.log("Average Token Price:", priceData.data[0].price);
//     let filteredData = [];

//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return (
//         tx.flow === "out" &&
//         tx.from_address === innerWalletAddress &&
//         tx.to_address === tokenAddress
//       );
//     });

//     // console.log("Filtered Transactions:", filteredTransactions);

//     //   // Concatenate the filtered transactions to our result array

//     let innerTrasaction = 0;
//     filteredData = filteredData.concat(filteredTransactions);

//     // console.log("filteredData", filteredData);

//     if (filteredData.length == 0) {
//       innerTrasaction = 0;
//     } else {
//       innerTrasaction =
//         filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

//       // console.log(innerTrasaction, "innerTrasaction");
//     }

//     while (hasMoreData) {
//       // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//       const response = await fetch(url, requestOptions);
//       const data = await response.json();

//       if (data.data && data.data.length > 0) {
//         allData = allData.concat(data.data);
//         page++;
//         console.log("Fetched page", page);
//       } else {
//         hasMoreData = false;
//       }
//     }

//     // Filter transactions by trans_id: common (duplicates) vs unique
//     const transIdCount = {};
//     allData.forEach((tx) => {
//       const transId = tx.trans_id;
//       transIdCount[transId] = (transIdCount[transId] || 0) + 1;
//     });

//     const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
//     // const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


//     const todayStart = new Date();
//     todayStart.setUTCHours(0, 0, 0, 0);

//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

//     const lastReportWalletBalance = await WalletReport.findOne({
//       // createdAt: { $gte: tomorrowStart, $lt: todayStart },
//       startTime: startT,
//       walletAddress: walletAddress,
//     })

//     const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       headers: {
//         'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
//       },
//     });

//     const walletEndBalances = await response.json();
//     const settings = await SettingsSchema.findOne({ status: "true" });

//     const tokenName = name;
//     const tokenIcon = token_logo_url;
//     const tokenSymbol = walletSymbol;

//     // Get token1 and token2 from first transaction if available, otherwise use known addresses
//     // token1 is typically the tracked token, token2 is typically SOL
//     const firstTx = allData.length > 0 ? allData[0] : null;
//     const token1 = firstTx?.routers?.token1 || tokenAddress;
//     const token2 = firstTx?.routers?.token2 || solAddress;


// console.log("token1",token1,"token2",token2);

// const token =
//   tokenAddress === token1 ? token1 :
//   tokenAddress === token2 ? token2 :
//   null;

// const address =
//   tokenAddress === token1 ? token2 :
//   tokenAddress === token2 ? token1 :
//   null;

//   console.log("token",token,"address",address);


//   const responseSolPrice = await fetch(
//     `https://pro-api.solscan.io/v2.0/token/price?address=${solanaAddress}&from_time=${startTime}&to_time=${startTime}`,
//     requestOptions
//   );
//   if (!responseSolPrice.ok) {
//     throw new Error("Network response was not ok for Binance");
//   }
//   const solPriceData = await responseSolPrice.json();

//   // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${token}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();

//     const responseAddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseAddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseAddressPrice.json();

//     // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     const solAverage = solPriceData?.data?.[0]?.price || 0;
//     const addressAverage = addressPriceData?.data?.[0]?.price || 0;
//     const tokenAverage = priceData?.data?.[0]?.price || 0;

// console.log("totsltransactions",allData.length);

//     const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
//     const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

//      const BuyVolumeInSol = buytxns.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
//     const BuyVolume = BuyVolumeInSol * addressAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const SellVolumeInToken = selltxns.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const SellVolume = SellVolumeInToken * tokenAverage;
//     const totalVolume = BuyVolume + SellVolume; //add feild from admin for 15

//     // Count buys and sells using flow
//     const buys = buytxns.length;
//     const sells = selltxns.length;
//     const trxns = buys+sells;
//     // const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

//     // const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

//     // const resets = resetBuys.length + resetSells.length;

//     // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     // const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     // const resetBuyVolume = resetBuyVolumeInSol * solAverage;
//     // // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     // const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     // const resetSellVolume = resetSellVolumeInSol * tokenAverage;
//     // const agentBuys = buys - resetBuys.length;
//     const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
//     const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
//     const bundles = (agentBuys.length + agentSells.length) / 10;
//         const resets = trxns-Bundles.length;

//         console.log("Bundles.length",Bundles.length);
//             console.log("resets",resets);
//     console.log("trxns",trxns);






//     // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
//     const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
//     const agentBuyVolume = agentBuyVolumeInSol * addressAverage;
//     // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
//     const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
//     const agentSellVolume = agentSellVolumeInToken * tokenAverage;
//     const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
//     // const resetsVolume = resetBuyVolume + resetSellVolume;
//     // const totalVolume = agentsVolume + resetsVolume;
//     // const totalVolume = agentsVolume;

//     console.log("Bundles",Bundles,"buys",buys,"sells",sells);


//     console.log("bundles",bundles,"agentBuyVolumeInSol",agentBuyVolumeInSol,"agentBuyVolume",agentBuyVolume,"agentSellVolumeInToken",agentSellVolumeInToken,"agentSellVolume",agentSellVolume);

//     console.log("agentsVolume",agentsVolume);

//     let gasFee = 0
//     // Add null check for settings to prevent errors when no transactions
//     // if (settings) {
//     //   if (bundles == 0) {
//     //     gasFee = resets * (settings.gasFeePercentage || 0)
//     //   } else {
//     //     gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
//     //   }
//     // }


//         if (settings) {
//       if (bundles == 0) {
//         gasFee = trxns * 0.000005 ;
//       } else {
//         gasFee = (bundles * (settings.gasFeePercentage || 0) + (resets*0.000005));
//       }
//     }
//     console.log("settings.gasFeePercentage",settings.gasFeePercentage);





//     const gasFeeInDollars = - (gasFee * solAverage);

//     console.log("gasFee",gasFee,"gasFeeInDollars",gasFeeInDollars);



//     const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });
//     // const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
//     const rayFee = - (totalVolume * (liquidityPool.lpPercentage || 0)); //tier fee %
//     const lpAdd = (totalVolume * (liquidityPool.lpPercentage || 0)) * settings.lpRewardPool; //lp rewards %
//     const rayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
//     const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0
//     ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage)
//     : 0; //this is price Impact
//     const yeild = ((totalVolume * liquidityPool.lpPercentage)*settings.lpRewardPool);
//     // const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
//     const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
//     // const ExpectedCost = rayFee + gasFee+tip;
//     const ExpectedCost = rayFee + gasFee;
//     // + tip;//no need
//     const cost = rayFee + gasFeeInDollars; //need to add Tip
//     // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
//     let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price)
//       ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price
//       : 0;

//     // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
//     // const newWalletsWithZeroBalance = [
//     //   "8eWQ1vRtbTVP9Ah29jKRj1HfMNX8CDvhrMYs8QD16yH8",
//     //   "5ndh4EmCZZu7PSV4u6adE3q6dnNK86ShAiSpWG1j74H3",
//     //   "7TgVg4Atx42ti4hEXtMa5gGu3S7L89xDmVPenByKQcxt",
//     // ];

//     // if (newWalletsWithZeroBalance.includes(walletAddress)) {
//     //   walletEndBalance = 0;
//     //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
//     // }

//     const pP = walletEndBalance;
//     const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
//     const totalCost = walletLoss;
//     const netCost = totalCost - lpAdd;
//     // const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);
//     const slipageAndloss = (gasFee + rayFee ) - (walletLoss);

//     // console.log("slipageAndloss",slipageAndloss,"netCost",netCost,"totalCost",totalCost,"walletLoss",walletLoss,"pP",pP,"walletEndBalance",walletEndBalance,"cost",cost,"ExpectedCost",ExpectedCost);

//     // console.log("walletStartBalance",walletStartBalance,"cost",cost,"yeild",yeild,"priceImpact",priceImpact,"rayCost",rayCost,"lpAdd",lpAdd,"rayFee",rayFee);

//     // console.log("liquidityPool",liquidityPool,"gasFeeInDollars",gasFeeInDollars,"gasFee",gasFee,"liquidityPool.lpPercentage",liquidityPool.lpPercentage);






//     const newReport = new WalletReport({
//       tokenName,
//       tokenIcon,
//       tokenSymbol,
//       walletAddress,
//       token: tokenAddress,
//       tokenAverage,
//       totalTransactions: allData.length,
//       totalVolume,
//       buys,
//       sells,
//       BuyVolume,
//       SellVolume,
//       // resetBuys: resetBuys.length,
//       // resetSells: resetSells.length,
//       // resetsVolume,
//       solAverage,
//       addressAverage,
//       tokenAverage,
//       // resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       // resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys: agentBuys.length,
//       agentSells: agentSells.length,
//       bundles,
//       resets,
//       pooledTokenAverage,
//       pooledSolAverage,
//       lpAdd,
//       // averageVolume,
//       agentsVolume,
//       gasFee,
//       gasFeeInDollars,
//       rayFee,
//       rayCost,
//       walletStartBalance,
//       walletLoss,
//       walletEndBalance,
//       ExpectedCost,
//       priceImpact,
//       slipageAndloss,
//       cost,
//       totalCost,
//       netCost,
//       // tip,
//       pP,
//       yeild,
//       pairAddress,
//       symbol: walletSymbol,
//       from_time,
//       to_time,
//       startTime,
//       endTime: startTime,
//       poolType: poolType
//     });

//     await newReport.save();

//     // const walletLoss = rayFee + gasFee -
//     console.log("Success ");
//     // return res.status(200).json({
//     //   message:"success",
//     //   data:newReport
//     // })

//   } catch (err) {
//     console.error("Error fetching data:", err);

//     // if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };



exports.getAllActivitiesDEFIStatic = async (
  // tokenAddress,
  // solAddress,
  // chainId,
  // usd_min,
  // symbol,
  // name,
  // token_logo_url,
  // innerWalletAddress,
  // walletAddress,
  // pairAddress,
  // poolType,
  req,
  res) => {

  try {
    const tokenAddress = "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT"
    const solAddress = "So11111111111111111111111111111111111111112"
    const chainId = "solana"
    const usd_min = 15.2
    const symbol = "IDLE"
    const name = "IDLE"
    const token_logo_url = "https://assets.coingecko.com/coins/images/25369/large/IDLE.png?1701066618"
    const innerWalletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW"
    const walletAddress = "CKajSSpTKhwCULMxyjuMb8JTVZf8ofw6H9ryN7sJbgwy"
    const pairAddress = "F1EgQMrKDdRCJfsGwmcv7dY7ncxxGzduDwkEWDsdBLwU"
    const from_time = 1769644800
    const to_time = 1769731199
    const poolType = "rwa"


    console.log(
      "tokenAddress", tokenAddress,
      "chainId", chainId,
      "walletAddress", walletAddress,
      "innerWalletAddress", innerWalletAddress,
      "solAddress", solAddress,
      "usd_min", usd_min,
      "symbol", symbol);

    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

    // Convert to Unix timestamps
    // const from_time = yesterday2.unix();
    // const to_time = yesterdayEnd.unix();
    console.log(from_time, to_time, "from_time, to_time");

    // console.log({
    //   from_time,
    //   to_time,
    //   from_time_readable: moment
    //     .unix(from_time)
    //     .utc()
    //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    //   to_time_readable: moment
    //     .unix(to_time)
    //     .utc()
    //     .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    // });
    // console.log("from_time", from_time, "to_time", to_time);

    const pageSize = 100;

    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const startT = moment.utc().subtract(2, "days").format("YYYYMMDD"); // Day before Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Fetch wallet from WalletSchema to get the symbol
    const walletQuery = { walletAddress: walletAddress };
    // if (innerWalletAddress) {
    //   walletQuery.innerWalletAddress = innerWalletAddress;
    // }
    // if (pairAddress) {
    //   walletQuery.pairAddress = pairAddress;
    // }
    const wallet = await WalletSchema.findOne(walletQuery);

    // Use symbol from wallet schema if available, otherwise fallback to parameter
    const walletSymbol = wallet?.symbol || symbol;

    let allData = [];
    let page = 1;
    let hasMoreData = true;


    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };

    const currentDate = new Date();
    const today = currentDate.toLocaleDateString();

    currentDate.setDate(currentDate.getDate() - 1);
    const yesterday = currentDate.toLocaleDateString();

    // console.log("tokenAddress", tokenAddress, "chainId", chainId);

    const responsetoday = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );
    if (!responsetoday.ok) {
      throw new Error("Failed to fetch data from Dexscreener");
    }
    const data = await responsetoday.json();

    // Extract the liquidity details
    const liquidityData = data[0].liquidity;

    const pooledTokenToday = liquidityData.base;
    const pooledSOLToday = liquidityData.quote;

    const pooledTokenAverage = pooledTokenToday;

    const pooledSolAverage = pooledSOLToday;


    // console.log("Average Token Price:", solPriceData.data[0].price);


    // console.log("Average Token Price:", priceData.data[0].price);
    let filteredData = [];

    const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
    const responsee = await fetch(urll, requestOptions);
    const dataa = await responsee.json();

    const filteredTransactions = dataa.data.filter((tx) => {
      return (
        tx.flow === "out" &&
        tx.from_address === innerWalletAddress &&
        tx.to_address === tokenAddress
      );
    });

    // console.log("Filtered Transactions:", filteredTransactions);

    //   // Concatenate the filtered transactions to our result array

    let innerTrasaction = 0;
    filteredData = filteredData.concat(filteredTransactions);

    // console.log("filteredData", filteredData);

    if (filteredData.length == 0) {
      innerTrasaction = 0;
    } else {
      innerTrasaction =
        filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

      // console.log(innerTrasaction, "innerTrasaction");
    }

    while (hasMoreData) {
      // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        page++;
        console.log("Fetched page", page);
      } else {
        hasMoreData = false;
      }
    }

    // Filter transactions by trans_id: common (duplicates) vs unique
    const transIdCount = {};
    allData.forEach((tx) => {
      const transId = tx.trans_id;
      transIdCount[transId] = (transIdCount[transId] || 0) + 1;
    });

    const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
    const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

    const lastReportWalletBalance = await WalletReport.findOne({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startT,
      walletAddress: walletAddress,

    })

    const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
    const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

    // Count buys and sells using flow
    const buys = buytxns.length;
    const sells = selltxns.length;


    const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
      },
    });

    const walletEndBalances = await response.json();

    const settings = await SettingsSchema.findOne({ status: "true" });

    const tokenName = name;
    const tokenIcon = token_logo_url;
    const tokenSymbol = walletSymbol;

    // Get token1 and token2 from first transaction if available, otherwise use known addresses
    // token1 is typically the tracked token, token2 is typically SOL
    const firstTx = allData.length > 0 ? allData[0] : null;
    const token1 = firstTx?.routers?.token1
    const token2 = firstTx?.routers?.token2
    console.log("token1", token1, "token2", token2);

    const token =
      tokenAddress === token1 ? token1 :
        tokenAddress === token2 ? token2 :
          null;

    const address =
      tokenAddress === token1 ? token2 :
        tokenAddress === token2 ? token1 :
          null;

    console.log("token", token, "address", address);


    console.log("token1", "token2", token1, token2);


    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${token}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const priceData = await responsePrice.json();

    console.log("priceData", priceData);


    const responseSolPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseSolPrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const solPriceData = await responseSolPrice.json();

    console.log("solPriceData", solPriceData);


    // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
    const solAverage = solPriceData?.data?.[0]?.price || 0;
    const tokenAverage = priceData?.data?.[0]?.price || 0;

    console.log("solAverage", "tokenAverage", solAverage, tokenAverage);


    const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

    const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

    const resets = resetBuys.length + resetSells.length;

    // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    console.log("resetBuyVolumeInSol", resetBuyVolumeInSol);

    const resetBuyVolume = resetBuyVolumeInSol * solAverage;
    console.log("resetBuyVolume", resetBuyVolume);

    // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    console.log("resetSellVolumeInSol", resetSellVolumeInSol);

    const resetSellVolume = resetSellVolumeInSol * tokenAverage;
    console.log("resetSellVolume", resetSellVolume);

    // const agentBuys = buys - resetBuys.length;
    const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
    const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
    const bundles = (agentBuys.length + agentSells.length) / 10;
    // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
    console.log("agentBuyVolumeInSol", agentBuyVolumeInSol);

    const agentBuyVolume = agentBuyVolumeInSol * solAverage;
    console.log("agentBuyVolume", agentBuyVolume);

    // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
    const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    console.log("agentSellVolumeInToken", agentSellVolumeInToken);

    const agentSellVolume = agentSellVolumeInToken * tokenAverage;
    console.log("agentSellVolume", agentSellVolume);

    const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
    const resetsVolume = resetBuyVolume + resetSellVolume;
    const totalVolume = agentsVolume + resetsVolume;

    let gasFee = 0
    // Add null check for settings to prevent errors when no transactions
    if (settings) {
      if (bundles == 0) {
        gasFee = resets * (settings.gasFeePercentage || 0)
      } else {
        gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
      }
    }

    const gasFeeInDollars = - (gasFee * solAverage);
    const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });
    // const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
    const rayFee = - (totalVolume * (liquidityPool.lpPercentage || 0)); //tier fee %
    const lpAdd = (totalVolume * (liquidityPool.lpPercentage || 0)) * settings.lpRewardPool; //lp rewards %
    const rayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
    const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0
      ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage)
      : 0; //this is price Impact
    const yeild = ((totalVolume * liquidityPool.lpPercentage) * settings.lpRewardPool);
    const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
    const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
    const ExpectedCost = rayFee + gasFee + tip;//no need
    const cost = rayFee + gasFeeInDollars; //need to add Tip
    // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
    let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price)
      ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price
      : 0;

    // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
    // const newWalletsWithZeroBalance = [
    //   "8eWQ1vRtbTVP9Ah29jKRj1HfMNX8CDvhrMYs8QD16yH8",
    //   "5ndh4EmCZZu7PSV4u6adE3q6dnNK86ShAiSpWG1j74H3",
    //   "7TgVg4Atx42ti4hEXtMa5gGu3S7L89xDmVPenByKQcxt",
    // ];

    // if (newWalletsWithZeroBalance.includes(walletAddress)) {
    //   walletEndBalance = 0;
    //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
    // }

    const pP = walletEndBalance;
    const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
    const totalCost = walletLoss;
    const netCost = totalCost - lpAdd;
    const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);

    const newReport = new WalletReport({
      tokenName,
      tokenIcon,
      tokenSymbol,
      walletAddress,
      token: tokenAddress,
      tokenAverage,
      totalTransactions: allData.length,
      totalVolume,
      buys,
      sells,
      resetBuys: resetBuys.length,
      resetSells: resetSells.length,
      resetsVolume,
      solAverage,
      tokenAverage,
      resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
      resetSellVolumeUSD: resetSellVolume.toFixed(2),
      agentBuys: agentBuys.length,
      agentSells: agentSells.length,
      bundles,
      pooledTokenAverage,
      pooledSolAverage,
      lpAdd,
      // averageVolume,
      agentsVolume,
      gasFee,
      gasFeeInDollars,
      rayFee,
      rayCost,
      walletStartBalance,
      walletLoss,
      walletEndBalance,
      ExpectedCost,
      priceImpact,
      slipageAndloss,
      cost,
      totalCost,
      netCost,
      tip,
      pP,
      yeild,
      pairAddress,
      symbol: walletSymbol,
      from_time,
      to_time,
      startTime,
      endTime: startTime,
      poolType: poolType
    });



    await newReport.save();

    console.log("newReport", newReport);


    // const walletLoss = rayFee + gasFee -
    console.log("Success ");

  } catch (err) {
    console.error("Error fetching data:", err);

    // if (!res.headersSent) return res.status(500).send("Internal Server Error");
  }
};


exports.getAllActivitiesDEFIDateRange = async (
  tokenAddress,
  solAddress,
  chainId,
  usd_min,
  symbol,
  name,
  token_logo_url,
  innerWalletAddress,
  walletAddress,
  pairAddress,
  poolType,
  datePayload = {}
) => {
  try {

    /* =====================================
       1️⃣ DATE RANGE HANDLING
       ===================================== */
    const { fromDate, toDate } = datePayload;

    const fromMoment = fromDate
      ? moment.utc(fromDate, "YYYYMMDD").startOf("day")
      : moment.utc().subtract(1, "days").startOf("day");

    const toMoment = toDate
      ? moment.utc(toDate, "YYYYMMDD").endOf("day")
      : moment.utc().subtract(1, "days").endOf("day");

    const from_time = fromMoment.unix();
    const to_time = toMoment.unix();

    const startTime = fromMoment.format("YYYYMMDD");
    const endTime = toMoment.format("YYYYMMDD");

    const startT = fromMoment.clone().subtract(1, "days").format("YYYYMMDD");

    console.log(
      `📊 Report Range ${walletAddress}:`,
      startTime,
      "→",
      endTime
    );

    /* =====================================================
       2️⃣ BASIC LOGS
       ===================================================== */
    console.log(
      "tokenAddress", tokenAddress,
      "chainId", chainId,
      "walletAddress", walletAddress,
      "innerWalletAddress", innerWalletAddress,
      "solAddress", solAddress,
      "symbol", symbol
    );

    const pageSize = 100;

    /* =====================================================
       3️⃣ WALLET SYMBOL
       ===================================================== */
    const wallet = await WalletSchema.findOne({ walletAddress });
    const walletSymbol = wallet?.symbol || symbol;


    let allData = [];
    let page = 1;
    let hasMoreData = true;

    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };

    /* =====================================================
       4️⃣ DEXSCREENER LIQUIDITY
       ===================================================== */

    const responsetoday = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );
    if (!responsetoday.ok) {
      throw new Error("Failed to fetch data from Dexscreener");
    }
    const data = await responsetoday.json();

    // Extract the liquidity details
    const liquidityData = data[0].liquidity;

    const pooledTokenToday = liquidityData.base;
    const pooledSOLToday = liquidityData.quote;

    const pooledTokenAverage = pooledTokenToday;

    const pooledSolAverage = pooledSOLToday;


    // console.log("Average Token Price:", solPriceData.data[0].price);


    // console.log("Average Token Price:", priceData.data[0].price);
    let filteredData = [];

    const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${innerWalletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
    const responsee = await fetch(urll, requestOptions);
    const dataa = await responsee.json();

    const filteredTransactions = dataa.data.filter((tx) => {
      return (
        tx.flow === "out" &&
        tx.from_address === innerWalletAddress &&
        tx.to_address === tokenAddress
      );
    });

    // console.log("Filtered Transactions:", filteredTransactions);

    //   // Concatenate the filtered transactions to our result array

    let innerTrasaction = 0;
    filteredData = filteredData.concat(filteredTransactions);

    // console.log("filteredData", filteredData);

    if (filteredData.length == 0) {
      innerTrasaction = 0;
    } else {
      innerTrasaction =
        filteredData[0].amount / 10 ** filteredData[0].token_decimals || 0;

      // console.log(innerTrasaction, "innerTrasaction");
    }

    while (hasMoreData) {
      // const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const url = `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&token=${tokenAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        page++;
        console.log("Fetched page", page);
      } else {
        hasMoreData = false;
      }
    }

    // Filter transactions by trans_id: common (duplicates) vs unique
    const transIdCount = {};
    allData.forEach((tx) => {
      const transId = tx.trans_id;
      transIdCount[transId] = (transIdCount[transId] || 0) + 1;
    });

    const Bundles = allData.filter((tx) => transIdCount[tx.trans_id] > 1);
    // const Resets = allData.filter((tx) => transIdCount[tx.trans_id] === 1);


    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(todayStart.getUTCDate() - 1);

    const lastReportWalletBalance = await WalletReport.findOne({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startT,
      walletAddress: walletAddress,

    })



    const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs', // Replace with your Solscan Pro API key
      },
    });

    const walletEndBalances = await response.json();

    const settings = await SettingsSchema.findOne({ status: "true" });

    const tokenName = name;
    const tokenIcon = token_logo_url;
    const tokenSymbol = walletSymbol;

    // Get token1 and token2 from first transaction if available, otherwise use known addresses
    // token1 is typically the tracked token, token2 is typically SOL
    const firstTx = allData.length > 0 ? allData[0] : null;
    const token1 = firstTx?.routers?.token1 || tokenAddress;
    const token2 = firstTx?.routers?.token2 || solAddress;


    console.log("token1", token1, "token2", token2);

    const token =
      tokenAddress === token1 ? token1 :
        tokenAddress === token2 ? token2 :
          null;

    const address =
      tokenAddress === token1 ? token2 :
        tokenAddress === token2 ? token1 :
          null;

    console.log("token", token, "address", address);



    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${token}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const priceData = await responsePrice.json();

    const responseSolPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseSolPrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const solPriceData = await responseSolPrice.json();

    // Add null checks to prevent errors when API returns empty data (allows saving even with no buys/sells)
    const solAverage = solPriceData?.data?.[0]?.price || 0;
    const tokenAverage = priceData?.data?.[0]?.price || 0;



    const buytxns = allData.filter((tx) => tx.routers.token2 === tokenAddress);
    const selltxns = allData.filter((tx) => tx.routers.token1 === tokenAddress);

    const BuyVolumeInSol = buytxns.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
    const BuyVolume = BuyVolumeInSol * solAverage;
    // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
    const SellVolumeInToken = selltxns.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    const SellVolume = SellVolumeInToken * tokenAverage;
    const totalVolume = BuyVolume + SellVolume; //add feild from admin for 15

    // Count buys and sells using flow
    const buys = buytxns.length;
    const sells = selltxns.length;
    const trxns = buys + sells;
    // const resetBuys = Resets.filter((tx) => tx.routers.token2 === tokenAddress);

    // const resetSells = Resets.filter((tx) => tx.routers.token1 === tokenAddress);

    // const resets = resetBuys.length + resetSells.length;

    // const resetBuyVolumeInSollllll = resetBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    // const resetBuyVolumeInSol = resetBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    // const resetBuyVolume = resetBuyVolumeInSol * solAverage;
    // // const resetSellVolumeInSolllllll = resetSells.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    // const resetSellVolumeInSol = resetSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    // const resetSellVolume = resetSellVolumeInSol * tokenAverage;
    // const agentBuys = buys - resetBuys.length;
    const agentBuys = Bundles.filter((tx) => tx.routers.token2 === tokenAddress);
    const agentSells = Bundles.filter((tx) => tx.routers.token1 === tokenAddress);
    const bundles = (agentBuys.length + agentSells.length) / 10;
    const resets = trxns - Bundles.length;

    console.log("Bundles.length", Bundles.length);
    console.log("resets", resets);
    console.log("trxns", trxns);






    // const agentBuyVolumeInSollllll = agentBuys.reduce((s, t) => s + (t.routers.amount1|| 0), 0);
    const agentBuyVolumeInSol = agentBuys.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0)
    const agentBuyVolume = agentBuyVolumeInSol * solAverage;
    // const agentSellVolumeInTokennnnnn = agentSells.reduce((s, t) => s + (t.routers.amount1 || 0), 0);
    const agentSellVolumeInToken = agentSells.reduce((s, t) => s + (t.routers.amount1 / (10 ** t.routers.token1_decimals) || 0), 0);
    const agentSellVolume = agentSellVolumeInToken * tokenAverage;
    const agentsVolume = agentBuyVolume + agentSellVolume; //add feild from admin for 15
    // const resetsVolume = resetBuyVolume + resetSellVolume;
    // const totalVolume = agentsVolume + resetsVolume;
    // const totalVolume = agentsVolume;

    console.log("Bundles", Bundles, "buys", buys, "sells", sells);


    console.log("bundles", bundles, "agentBuyVolumeInSol", agentBuyVolumeInSol, "agentBuyVolume", agentBuyVolume, "agentSellVolumeInToken", agentSellVolumeInToken, "agentSellVolume", agentSellVolume);

    console.log("agentsVolume", agentsVolume);

    let gasFee = 0
    // Add null check for settings to prevent errors when no transactions
    // if (settings) {
    //   if (bundles == 0) {
    //     gasFee = resets * (settings.gasFeePercentage || 0)
    //   } else {
    //     gasFee = (bundles * (settings.gasFeePercentage || 0)) + (resets * 0.000005);
    //   }
    // }


    if (settings) {
      if (bundles == 0) {
        gasFee = trxns * 0.000005;
      } else {
        gasFee = (bundles * (settings.gasFeePercentage || 0) + (resets * 0.000005));
      }
    }
    console.log("settings.gasFeePercentage", settings.gasFeePercentage);





    const gasFeeInDollars = - (gasFee * solAverage);

    console.log("gasFee", gasFee, "gasFeeInDollars", gasFeeInDollars);



    const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });
    // const rayFee = settings ? (totalVolume * (settings.tierFeePercentage || 0)) : 0; //tier fee 0.25%
    const rayFee = - (totalVolume * (liquidityPool.lpPercentage || 0)); //tier fee %
    const lpAdd = (totalVolume * (liquidityPool.lpPercentage || 0)) * settings.lpRewardPool; //lp rewards %
    const rayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
    const priceImpact = settings && solAverage > 0 && pooledSolAverage > 0
      ? (totalVolume * ((settings.amount || 0) / solAverage) / pooledSolAverage)
      : 0; //this is price Impact
    const yeild = ((totalVolume * liquidityPool.lpPercentage) * settings.lpRewardPool);
    // const tip = settings ? (bundles * (settings.tipAmount || 0)) : 0; //tipAmount(dynamic from admin)
    const walletStartBalance = (lastReportWalletBalance && lastReportWalletBalance.walletEndBalance ? lastReportWalletBalance.walletEndBalance : 0) + innerTrasaction;
    // const ExpectedCost = rayFee + gasFee+tip;
    const ExpectedCost = rayFee + gasFee;
    // + tip;//no need
    const cost = rayFee + gasFeeInDollars; //need to add Tip
    // Add null check to prevent errors when API returns empty data (allows saving even with no buys/sells)
    let walletEndBalance = (walletEndBalances?.data?.total_value && walletEndBalances?.data?.native_balance?.token_price)
      ? walletEndBalances.data.total_value / walletEndBalances.data.native_balance.token_price
      : 0;

    // Set walletEndBalance to 0 for specific new wallet addresses (first time setup)
    // const newWalletsWithZeroBalance = [
    //   "8eWQ1vRtbTVP9Ah29jKRj1HfMNX8CDvhrMYs8QD16yH8",
    //   "5ndh4EmCZZu7PSV4u6adE3q6dnNK86ShAiSpWG1j74H3",
    //   "7TgVg4Atx42ti4hEXtMa5gGu3S7L89xDmVPenByKQcxt",
    // ];

    // if (newWalletsWithZeroBalance.includes(walletAddress)) {
    //   walletEndBalance = 0;
    //   console.log("Setting walletEndBalance to 0 for new wallet:", walletAddress);
    // }

    const pP = walletEndBalance;
    const walletLoss = -((walletStartBalance - walletEndBalance) * solAverage);
    const totalCost = walletLoss;
    const netCost = totalCost - lpAdd;
    // const slipageAndloss = (gasFee + rayFee + tip) - (walletLoss);
    const slipageAndloss = (gasFee + rayFee) - (walletLoss);

    // console.log("slipageAndloss",slipageAndloss,"netCost",netCost,"totalCost",totalCost,"walletLoss",walletLoss,"pP",pP,"walletEndBalance",walletEndBalance,"cost",cost,"ExpectedCost",ExpectedCost);

    // console.log("walletStartBalance",walletStartBalance,"cost",cost,"yeild",yeild,"priceImpact",priceImpact,"rayCost",rayCost,"lpAdd",lpAdd,"rayFee",rayFee);

    // console.log("liquidityPool",liquidityPool,"gasFeeInDollars",gasFeeInDollars,"gasFee",gasFee,"liquidityPool.lpPercentage",liquidityPool.lpPercentage);






    const newReport = new WalletReport({
      tokenName,
      tokenIcon,
      tokenSymbol,
      walletAddress,
      token: tokenAddress,
      tokenAverage,
      totalTransactions: allData.length,
      totalVolume,
      buys,
      sells,
      BuyVolume,
      SellVolume,
      // resetBuys: resetBuys.length,
      // resetSells: resetSells.length,
      // resetsVolume,
      solAverage,
      tokenAverage,
      // resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
      // resetSellVolumeUSD: resetSellVolume.toFixed(2),
      agentBuys: agentBuys.length,
      agentSells: agentSells.length,
      bundles,
      resets,
      pooledTokenAverage,
      pooledSolAverage,
      lpAdd,
      // averageVolume,
      agentsVolume,
      gasFee,
      gasFeeInDollars,
      rayFee,
      rayCost,
      walletStartBalance,
      walletLoss,
      walletEndBalance,
      ExpectedCost,
      priceImpact,
      slipageAndloss,
      cost,
      totalCost,
      netCost,
      // tip,
      pP,
      yeild,
      pairAddress,
      symbol: walletSymbol,
      from_time,
      to_time,
      startTime,
      endTime: startTime,
      poolType: poolType
    });

    await newReport.save();

    // const walletLoss = rayFee + gasFee -
    console.log("Success ");

  } catch (err) {
    console.error("Error fetching data:", err);

    // if (!res.headersSent) return res.status(500).send("Internal Server Error");
  }
};
// added on 26-12-25
exports.getTokenDataDatetoDateLive = async (req, res) => {
  try {
    console.log("🚀 entered in getTokenData");

    /* =====================================
       1️⃣ READ DATE RANGE FROM API
       ===================================== */
    const { fromDate, toDate } = req.query;

    console.log("📅 Requested Range:", fromDate, "→", toDate);

    /* =====================================
       2️⃣ FETCH PLATFORMS
       ===================================== */
    const platforms = await PlatformSchema.find({});
    if (!platforms || platforms.length === 0) {
      console.log("❌ No platforms found");
      return;
    }

    /* =====================================
       3️⃣ LOOP PLATFORMS → TOKENS → WALLETS
       ===================================== */
    for (let p = 0; p < platforms.length; p++) {
      const platform = platforms[p];
      if (!platform) continue;

      const tokens = await TokenSchema.find({ platformId: platform._id });
      // console.log("tokens",tokens);

      if (!tokens.length) continue;

      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];
        if (!token) continue;

        const {
          tokenAddress,
          solAddress,
          chainId,
          usd_min,
          symbol,
          name,
          token_logo_url,
        } = token;

        const wallets = await WalletSchema.find({ tokenId: token._id });
        // console.log("wallets",wallets);

        if (!wallets.length) {
          console.log(`⚠️ No wallets for token ${symbol}`);
          continue;
        }

        for (let w = 0; w < wallets.length; w++) {
          const wallet = wallets[w];
          if (!wallet) continue;

          const {
            innerWalletAddress,
            walletAddress,
            pairAddress,
            poolType,
          } = wallet;

          console.log(
            `\n🔄 Processing ${symbol} | Wallet ${w + 1}/${wallets.length}`
          );

          /* =====================================
             4️⃣ CALL DATE-AWARE REPORT API
             ===================================== */
          await exports.getAllActivitiesDEFIDateRange(
            tokenAddress,
            solAddress,
            chainId,
            usd_min,
            symbol,
            name,
            token_logo_url,
            innerWalletAddress,
            walletAddress,
            pairAddress,
            poolType,
            {
              fromDate,
              toDate,
            } // 👈 pass dates
          );

          console.log(`✅ Wallet done: ${walletAddress}`);
        }

        console.log(`🔥 All wallets completed for token ${symbol}`);
      }
    }

    console.log("🎉 getTokenData completed successfully");

  } catch (error) {
    console.error("❌ Error in getTokenData:", error);
  }
};

//added on 26-12-25
// exports.getTokenData = async (req, res) => {
//   try {
//     console.log('entered in getTokenData')
//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue; // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           tokenAddress,
//           solAddress,
//           chainId,
//           usd_min,
//           symbol,
//           name,
//           token_logo_url,
//         } = token;

//         const wallets = await WalletSchema.find({ tokenId: token._id });
//         console.log(wallets, "wallets");

//         if (!wallets || wallets.length === 0) {
//           console.log(`No wallets found for token ${symbol}. Skipping.`);
//           continue; // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < wallets.length; j++) {
//           const wallet = wallets[j];
//           if (!wallet) continue;

//           console.log(
//             `\n=== Processing wallet ${j + 1}/${wallets.length
//             } for token ${symbol} ===`
//           );
//           const { innerWalletAddress, walletAddress, pairAddress, poolType } = wallet;

//           // Get pairAddress from wallet, or fallback to token's pairAddress
//           // const pairAddress = walletPairAddress 

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getAllActivitiesDEFI(
//             tokenAddress,
//             solAddress,
//             chainId,
//             usd_min,
//             symbol,
//             name,
//             token_logo_url,
//             innerWalletAddress,
//             walletAddress,
//             pairAddress,
//             poolType
//           );

//           console.log(
//             `✅ Completed wallet ${walletAddress} for token ${symbol}\n`
//           );
//         }

//         console.log(`🔥 Completed all wallets for token ${symbol}`);
//       }
//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getTokenData:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };


//added on 02-02-2026 now
exports.getTokenData = async (req, res) => {
  try {
    console.log('entered in getTokenData')
    //fetch platforms
    const platforms = await PlatformSchema.find({});
    // Verify tokenData and ensure it's valid
    if (!platforms || platforms.length === 0) {
      console.log("No platforms found in the database.");
      // return res.status(404).json({ error: "No platforms found." });
    }

    // Loop through each platform and call getAllActivities for each
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];

      // Ensure platform is defined before passing it to getAllActivities
      if (!platform) {
        console.error(`Platform at index ${i} is undefined`);
        continue; // Skip this iteration if platform is undefined
      }
      const tokens = await TokenSchema.find({ platformId: platform._id });

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token) continue;

        const {
          tokenAddress,
          solAddress,
          chainId,
          usd_min,
          symbol,
          name,
          token_logo_url,
        } = token;

        const wallets = await WalletSchema.find({ tokenId: token._id });
        console.log(wallets, "wallets");

        if (!wallets || wallets.length === 0) {
          console.log(`No wallets found for token ${symbol}. Skipping.`);
          continue; // Skip this iteration if no wallets are found
        }
        for (let j = 0; j < wallets.length; j++) {
          const wallet = wallets[j];
          if (!wallet) continue;

          console.log(
            `\n=== Processing wallet ${j + 1}/${wallets.length
            } for token ${symbol} ===`
          );
          const { innerWalletAddress, walletAddress, pairAddress, poolType } = wallet;

          // Get pairAddress from wallet, or fallback to token's pairAddress
          // const pairAddress = walletPairAddress 

          // 👇 await everything sequentially — prevents overlap
          await exports.getAllActivitiesDEFI(
            tokenAddress,
            solAddress,
            chainId,
            usd_min,
            symbol,
            name,
            token_logo_url,
            innerWalletAddress,
            walletAddress,
            pairAddress,
            poolType
          );

          console.log(
            `✅ Completed wallet ${walletAddress} for token ${symbol}\n`
          );
        }

        console.log(`🔥 Completed all wallets for token ${symbol}`);
      }
    }

    // return res.status(200).json(tokenData); // Send response after all activities have been processed
  } catch (error) {
    console.error("Error in getTokenData:", error);
    // res.status(500).json({ error: "An error occurred." });
  }
};



exports.gettokenDataDay = async (token, req, res) => {
  try {
    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    console.log("startTime", startTime, "endTime", endTime);
    console.log("token data", token);

    const mintAddress = token.tokenAddress;
    const tokenName = token.name;
    const tokenIcon = token.token_logo_url;
    const tokenSymbol = token.symbol;
    const solAddress = token.solAddress;

    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };

    // ====== FETCH TOKEN TRANSFERS ======
    let allData = [];
    let hasMoreData = true;
    let page = 1;
    let pageSize = 100;

    while (hasMoreData) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${mintAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data?.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        console.log(`Fetched page ${page} (${data.data.length} transfers)`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMoreData = false;
      }
    }

    console.log(`✅ Total transfers fetched: ${allData.length}`);

    const settings = await SettingsSchema.findOne({ status: true });

    // ====== BUY/SELL LOGIC ======
    const buyTxs = allData.filter(
      (tx) =>
        tx.routers.token1 === solAddress && tx.routers.token2 === mintAddress
    );
    const sellTxs = allData.filter(
      (tx) =>
        tx.routers.token1 === mintAddress && tx.routers.token2 === solAddress
    );

    const buys = buyTxs.length;
    const sells = sellTxs.length;

    const buysVolume = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const sellVolume = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );

    const filtered = allData.filter((tx) => tx.value >= settings.usdMax);
    const resetBuys = filtered.filter(
      (tx) => tx.routers.token2 === mintAddress
    );
    const resetSells = filtered.filter(
      (tx) => tx.routers.token1 === mintAddress
    );

    const resetBuysVolume = resetBuys.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const resetSellsVolume = resetSells.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const resetsVolume = resetBuysVolume + resetSellsVolume;
    const agentsVolume = buysVolume + sellVolume - resetsVolume;
    const totalVolume = agentsVolume + resetsVolume;

    const lpAdd = (totalVolume * settings.lpRewardPercentage);

    const todayWalletTotalCost = await WalletReport.find({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startTime,
      token: mintAddress,
    });

    console.log("todayWalletTotalCost", todayWalletTotalCost);

    const totalCostSum = todayWalletTotalCost.reduce(
      (s, t) => s + (t.totalCost || 0),
      0
    );
    console.log("totalCostSum", totalCostSum);

    const newReport = new TokenReport({
      tokenName,
      tokenAddress: mintAddress,
      tokenIcon,
      tokenSymbol,
      totalTransactions: allData.length,
      buys,
      sells,
      token: mintAddress,
      totalTransactions: allData.length,
      totalVolume,
      LPadded: lpAdd,
      totalCost: totalCostSum,
      from_time: startTime,
    });

    await newReport.save();
    console.log(`✅ Report saved successfully for ${tokenName}`);

    // ====== RESPONSE ======
    // return res.json({
    //   buys,
    //   sells,

    // });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.gettokenDataDayDefi = async (token, req, res) => {
  try {
    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    console.log("startTime", startTime, "endTime", endTime);
    // console.log("token data", token);

    const mintAddress = token.tokenAddress;
    const tokenName = token.name;
    const tokenIcon = token.token_logo_url;
    const tokenSymbol = token.symbol;
    const solAddress = token.solAddress;


    const requestOptions = {
      method: "GET",
      headers: {
        token: process.env.SOL_API_TOKEN,
      },
    };



    const responseSolPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${solAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseSolPrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const solPriceData = await responseSolPrice.json();
    const solAverage = solPriceData.data[0].price;

    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${mintAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const priceData = await responsePrice.json();
    const tokenAverage = priceData.data[0].price;


    // ====== FETCH TOKEN TRANSFERS ======
    let allData = [];
    let hasMoreData = true;
    let page = 1;
    let pageSize = 100;

    while (hasMoreData) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${mintAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
      const response = await fetch(url, requestOptions);
      const data = await response.json();

      if (data?.data && data.data.length > 0) {
        allData = allData.concat(data.data);
        console.log(`Fetched page ${page} (${data.data.length} transfers)`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMoreData = false;
      }
    }

    console.log(`✅ Total transfers fetched: ${allData.length}`);

    const settings = await SettingsSchema.findOne({ status: true });

    // ====== BUY/SELL LOGIC ======
    const buyTxs = allData.filter(
      (tx) =>
        tx.routers.token1 === solAddress && tx.routers.token2 === mintAddress
    );
    const sellTxs = allData.filter(
      (tx) =>
        tx.routers.token1 === mintAddress && tx.routers.token2 === solAddress
    );

    const buys = buyTxs.length;
    const sells = sellTxs.length;

    const buysVolumeInSol = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    const buysVolume = buysVolumeInSol * solAverage;
    const sellVolumeInToken = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    const sellVolume = sellVolumeInToken * tokenAverage;
    const totalVolume = buysVolume + sellVolume;
    const lpAdd = (totalVolume * settings.lpRewardPercentage);
    const todayWalletTotalCost = await WalletReport.find({
      // createdAt: { $gte: tomorrowStart, $lt: todayStart },
      startTime: startTime,
      token: mintAddress,
    });


    const totalCostSum = todayWalletTotalCost.reduce(
      (s, t) => s + (t.totalCost || 0),
      0
    );

    const newReport = new TokenReport({
      tokenName,
      tokenAddress: mintAddress,
      tokenIcon,
      tokenSymbol,
      totalTransactions: allData.length,
      buys,
      sells,
      buysVolume,
      sellVolume,
      solAverage,
      tokenAverage,
      token: mintAddress,
      totalVolume,
      LPadded: lpAdd,
      totalCost: totalCostSum,
      from_time: startTime,
    });

    await newReport.save();
    console.log(`✅ Report saved successfully for ${tokenName}`);

    // ====== RESPONSE ======
    // return res.json({
    //   data: newReport,

    // });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
};



// exports.getTokenDataFrom date to date = async (req, res) => {
//   try {
//     const { from_date, to_date } = req.query; // e.g. 2025-10-16, 2025-10-21
//     if (!from_date || !to_date) {
//       return res.status(400).json({ error: "Please provide from_date and to_date in YYYY-MM-DD format." });
//     }

//     // ✅ Generate all days between from_date and to_date
//     const start = moment.utc(from_date, "YYYY-MM-DD");
//     const end = moment.utc(to_date, "YYYY-MM-DD");
//     const days = [];

//     for (let m = start.clone(); m.isSameOrBefore(end, "day"); m.add(1, "day")) {
//       const from_time = m.clone().startOf("day").unix();
//       const to_time = m.clone().endOf("day").unix();
//        const startTime = parseInt(m.format("YYYYMMDD"));       // e.g. 20251016

//       days.push({
//         date: m.format("YYYY-MM-DD"),
//         from_time,
//         to_time,
//         startTime,
//         from_time_readable: m.clone().startOf("day").format("YYYY-MM-DD HH:mm:ss [UTC]"),
//         to_time_readable: m.clone().endOf("day").format("YYYY-MM-DD HH:mm:ss [UTC]")
//       });
//     }

//     console.log("📅 Generated daily ranges:", days);

//     // 🔥 Fetch all platforms
//     const platforms = await PlatformSchema.find({});
//     if (!platforms || platforms.length === 0) {
//       return res.status(404).json({ error: "No platforms found." });
//     }

//     // 🧠 Loop through platforms, tokens, wallets, and each day
//     for (const platform of platforms) {
//       const tokens = await TokenSchema.find({ platformId: platform._id });
//       for (const token of tokens) {
//         const { tokenAddress, solAddress, chainId, usd_min, symbol ,name,token_logo_url} = token;
//         const wallets = await WalletSchema.find({ tokenId: token._id });

//         for (const wallet of wallets) {
//           const { innerWalletAddress, walletAddress } = wallet;

//           // Loop each day in the range
//           for (const day of days) {
//             console.log(`\n🧾 Generating report for ${symbol} (${walletAddress}) on ${day.date}`);

//             await exports.getAllActivities(
//               tokenAddress,
//               solAddress,
//               chainId,
//               usd_min,
//               symbol,
//               name,token_logo_url,
//               innerWalletAddress,
//               walletAddress,
//               day.from_time,
//               day.to_time,
//               day.startTime,
//             );

//             console.log(`✅ Report saved for ${symbol} (${walletAddress}) — ${day.date}`);
//           }
//         }
//       }
//     }

//     return res.status(200).json({ message: "Reports generated successfully for given range." });

//   } catch (error) {
//     console.error("Error in getTokenData:", error);
//     res.status(500).json({ error: "An error occurred." });
//   }
// };

exports.getWalletBalance = async (req, res) => {
  const walletAddress = "BLpJfdLBeVutUHX5CqdDyVEbt7i8uAU9shL3v1V1CvK6"; // Assume wallet address is passed as a parameter
  const apiUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs", // Replace with your Solscan Pro API key
      },
    });

    const data = await response.json();
    console.log("Wallet Data:", data);
    console.log("Wallet native_balance:", data.data.total_value);
    console.log("Wallet balance:", data.data.native_balance.balance);
    console.log("token_price:", data.data.native_balance.token_price);

    if (data.success) {
      const walletData = data.data;
      // Directly access walletData.tokens without stringifying it
      const tokens = walletData.tokens.map((token) => ({
        token_address: token.token_address,
        amount: token.amount,
        balance: token.balance,
        token_price: token.token_price,
        token_decimals: token.token_decimals,
        token_name: token.token_name,
        token_symbol: token.token_symbol,
        token_icon: token.token_icon,
        value: token.value,
      }));

      const Tokens = JSON.stringify(tokens, null, 2);

      // Parse the stringified JSON to convert it to an array of objects
      const tokenss = JSON.parse(Tokens);
      console.log("tokenss", tokenss);

      // Now you can access the token_name of the second token

      const array = tokenss?.[1] || tokenss[0];
      console.log("Token token_symbol:", array);

      // Log the tokens data in a readable format
      // console.log('Tokens:', JSON.stringify(tokens, null, 2));
      // console.log('Tokens:', JSON.stringify(tokens, null, 2));

      // Create a new document to save in MongoDB based on the schema
      const newWalletData = new WalletData({
        tokenName: array.token_name,
        walletAddress: walletAddress,
        walletBalance:
          data.data.total_value / data.data.native_balance.token_price,
        tokenAddress: array.token_address,
        tokenDecimals: array.token_decimals,
        token_icon: array.token_icon,
        tokenPrice: array.token_price,
        token_symbol: array.token_symbol,
      });

      // Save the data to MongoDB
      await newWalletData.save();
      console.log("Wallet Data saved to MongoDB.");

      // Send a success response with the saved data
      return res.json({
        success: true,
        message: "Wallet data saved successfully.",
        walletData: newWalletData,
      });
    } else {
      console.error("Error fetching balance:", data.message);
      return res.status(400).json({
        success: false,
        message: data.message,
      });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching data.",
    });
  }
};

exports.getWalletSum = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    console.log("Wallet Address:", walletAddress);

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress is required",
      });
    }

    const walletReports = await Report.aggregate([
      { $match: { walletAddress } },
      {
        $group: {
          _id: "$walletAddress",
          tokenName: { $first: "$tokenName" },
          tokenSymbol: { $first: "$tokenSymbol" },
          tokenIcon: { $first: "$tokenIcon" },

          // SUM fields
          totalTransactions: { $sum: "$totalTransactions" },
          totalVolume: { $sum: "$totalVolume" },
          buys: { $sum: "$buys" },
          sells: { $sum: "$sells" },
          resetBuys: { $sum: "$resetBuys" },
          resetSells: { $sum: "$resetSells" },
          resetsVolume: { $sum: "$resetsVolume" },
          resetBuyVolumeUSD: { $sum: "$resetBuyVolumeUSD" },
          resetSellVolumeUSD: { $sum: "$resetSellVolumeUSD" },
          agentBuys: { $sum: "$agentBuys" },
          agentSells: { $sum: "$agentSells" },
          agentsVolume: { $sum: "$agentsVolume" },
          bundles: { $sum: "$bundles" },
          lpAdd: {
            $sum: {
              $convert: {
                input: "$lpAdd",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
          gasFee: { $sum: "$gasFee" },
          gasFeeInDollars: { $sum: "$gasFeeInDollars" },
          rayFee: { $sum: "$rayFee" },
          walletStartBalance: { $sum: "$walletStartBalance" },
          walletLoss: { $sum: "$walletLoss" },
          walletEndBalance: { $sum: "$walletEndBalance" },
          walletCost: { $sum: "$walletCost" },
          slipageAndloss: { $sum: "$slipageAndloss" },
          cost: { $sum: "$cost" },
          pP: { $sum: "$pP" },

          // AVERAGE fields
          solAverage: { $avg: "$solAverage" },
          tokenAverage: { $avg: "$tokenAverage" },
          pooledTokenAverage: { $avg: "$pooledTokenAverage" },
          pooledSolAverage: { $avg: "$pooledSolAverage" },
          slippageAvginDollars: { $avg: "$slippageAvginDollars" },
          averageVolume: { $avg: "$averageVolume" },
        },
      },
      {
        $project: {
          _id: 0,
          walletAddress: "$_id",
          tokenName: 1,
          tokenSymbol: 1,
          tokenIcon: 1,
          totalTransactions: 1,
          totalVolume: 1,
          buys: 1,
          sells: 1,
          resetBuys: 1,
          resetSells: 1,
          resetsVolume: 1,
          solAverage: 1,
          tokenAverage: 1,
          resetBuyVolumeUSD: 1,
          resetSellVolumeUSD: 1,
          agentBuys: 1,
          agentSells: 1,
          agentsVolume: 1,
          bundles: 1,
          pooledTokenAverage: 1,
          pooledSolAverage: 1,
          slippageAvginDollars: 1,
          lpAdd: 1,
          averageVolume: 1,
          gasFee: 1,
          gasFeeInDollars: 1,
          rayFee: 1,
          walletStartBalance: 1,
          walletLoss: 1,
          walletEndBalance: 1,
          walletCost: 1,
          slipageAndloss: 1,
          cost: 1,
          pP: 1,
        },
      },
    ]);

    if (!walletReports.length) {
      return res.status(404).json({
        success: false,
        message: `No reports found for wallet: ${walletAddress}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Summary for wallet ${walletAddress} fetched successfully.`,
      data: walletReports[0],
    });
  } catch (error) {
    console.error("Error fetching wallet summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching wallet summary.",
      error: error.message,
    });
  }
};

// exports.gettokenDatahistory = async (token, req, res) => {
//   try {
//     console.log("token data", token);

//     // ===== CONFIG =====
//     const mintAddress = token.tokenAddress;
//     const tokenName = token.name;
//     const tokenIcon = token.token_logo_url;
//     const tokenSymbol = token.symbol;

//     // const mintAddress = "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT";
//     // const tokenName = "IdleMine";
//     // const tokenIcon = "";
//     // const tokenSymbol = "IDLE";

//     const solAddress = "So11111111111111111111111111111111111111112";

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };

//     // ===== DATE RANGE: from 20 Sep 2025 → yesterday =====
//     const startDate = moment.utc("2025-10-22T00:00:00Z");
//     const endDate = moment.utc().subtract(1, "day").startOf("day");

//     console.log(
//       `⏱ Fetching token data from ${startDate.format()} → ${endDate.format()}`
//     );

//     let current = startDate.clone();
//     const dailyReports = [];

//     // ===== LOOP DAY-BY-DAY =====
//     while (current.isBefore(endDate)) {
//       const from_unix = current.unix();
//       const to_unix = current
//         .clone()
//         .add(1, "day")
//         .subtract(1, "second")
//         .unix();
//       const from_time = Number(current.format("YYYYMMDD"));

//       console.log(
//         `📅 Fetching ${current.format(
//           "YYYY-MM-DD"
//         )} (Unix ${from_unix} → ${to_unix})`
//       );

//       // --- Check if this day's record already exists ---
//       const existing = await TokenReport.findOne({
//         tokenAddress: mintAddress,
//         from_time,
//       });

//       if (existing) {
//         console.log(
//           `⏩ Skipping ${current.format("YYYY-MM-DD")} — already saved`
//         );
//         current.add(1, "day");
//         continue;
//       }

//       // --- Fetch from Solscan ---
//       let page = 1;
//       let hasMore = true;
//       let dayData = [];

//       while (hasMore) {
//         const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${mintAddress}&from_time=${from_unix}&to_time=${to_unix}&page=${page}&page_size=100`;
//         const response = await fetch(url, requestOptions);
//         const data = await response.json();

//         if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//           dayData = dayData.concat(data.data);
//           console.log(`✅ Page ${page}: ${data.data.length} txs`);
//           page++;
//           await new Promise((r) => setTimeout(r, 400)); // API delay
//         } else {
//           hasMore = false;
//         }
//       }

//       console.log(
//         `📦 ${current.format("YYYY-MM-DD")} — ${dayData.length} transactions`
//       );

//       // ✅ SAFETY: Skip empty or invalid responses
//       if (!dayData || dayData.length === 0) {
//         console.log(
//           `🚫 No transactions found for ${current.format(
//             "YYYY-MM-DD"
//           )} — skipping`
//         );
//         current.add(1, "day");
//         continue;
//       }

//       // ====== ANALYSIS (Buy / Sell / Transfer) ======
//       // const buyTxs = dayData.filter(
//       //   (tx) =>
//       //     tx.activity_type === "ACTIVITY_TOKEN_SWAP" &&
//       //     tx.routers?.token1 === solAddress &&
//       //     tx.routers?.token2 === mintAddress
//       // );

//       // const sellTxs = dayData.filter(
//       //   (tx) =>
//       //     tx.activity_type === "ACTIVITY_TOKEN_SWAP" &&
//       //     tx.routers?.token1 === mintAddress &&
//       //     tx.routers?.token2 === solAddress
//       // );

//       // const transferTxs = dayData.filter(
//       //   (tx) => tx.activity_type === "ACTIVITY_SPL_TRANSFER"
//       // );

//       //     // ====== BUY/SELL LOGIC ======
//     const buyTxs = dayData.filter(
//       (tx) => tx.routers?.token1 === solAddress && tx.routers?.token2 === mintAddress
//     );
//     const sellTxs = dayData.filter(
//       (tx) => tx.routers?.token1 === mintAddress && tx.routers?.token2 === solAddress
//     );
//     const transferTxs = dayData.filter(
//       (tx) => tx.routers?.token1 !== mintAddress && tx.routers?.token2 !== mintAddress
//     );

//       const buys = buyTxs.length;
//       const sells = sellTxs.length;
//       const transfers = transferTxs.length;

//       const buysVolume = buyTxs.reduce(
//         (sum, tx) => sum + Number(tx.value ?? 0),
//         0
//       );
//       const sellsVolume = sellTxs.reduce(
//         (sum, tx) => sum + Number(tx.value ?? 0),
//         0
//       );
//       const totalVolume = buysVolume + sellsVolume;
//       const LPadded = (totalVolume * 0.22) / 100;

//       // ====== SAVE DAILY ENTRY ======
//       const newReport = new TokenReport({
//         tokenName,
//         tokenSymbol,
//         tokenIcon,
//         tokenAddress: mintAddress,
//         totalTransactions: dayData.length,
//         buys,
//         sells,
//         transfers,
//         totalVolume,
//         LPadded,
//         totalHolders: 0, // fixed — you had undefined totalHolders
//         from_time, // e.g. 20250920
//       });

//       await newReport.save();
//       console.log(
//         `✅ Saved ${tokenName} data for ${current.format("YYYY-MM-DD")}`
//       );

//       dailyReports.push({
//         date: current.format("YYYY-MM-DD"),
//         buys,
//         sells,
//         transfers,
//         totalVolume,
//         LPadded,
//       });

//       // move to next day
//       current.add(1, "day");
//     }

//     console.log(
//       `🎯 Completed fetching ${dailyReports.length} daily reports for ${tokenName}`
//     );

//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };

exports.getDailyTokenReport = async (req, res) => {
  try {
    const tokenData = await Token.find();

    if (!tokenData || tokenData.length === 0) {
      console.log("No tokens found in the database.");
      // return res.status(404).json({ error: "No tokens found." });
    }

    console.log("Token Data:", tokenData);

    for (let i = 0; i < tokenData.length; i++) {
      const token = tokenData[i];
      console.log("Calling getAllActivities for Token:", token);

      if (!token) {
        console.error(`Token at index ${i} is undefined`);
        continue;
      }
      // const data = token.name
      console.log("data", token);

      await exports.gettokenDataDayDefi(token, req, res);
    }

    // return res.status(200).json(tokenData);
  } catch (error) {
    console.error("Error in getTokenData:", error);
    // res.status(500).json({ error: "An error occurred." });
  }
};

exports.tokenReportsTotal = async (req, res) => {
  try {
    const { tokenAddress } = req.query;

    // If tokenAddress is provided — calculate for that single token
    if (tokenAddress) {
      const reports = await rwaPoolsReport.find({ tokenAddress });

      if (!reports.length) {
        return res.status(404).json({
          message: `No reports found for token ${tokenAddress}`,
        });
      }

      const totals = reports.reduce(
        (acc, report) => {
          acc.totalTransactions += report.totalTransactions || 0;
          acc.totalBuys += report.buys || 0;
          acc.totalSells += report.sells || 0;
          acc.totalPoolRevenue += report.poolRevenue || 0;
          acc.totalVolume += report.totalVolume || 0;
          return acc;
        },
        {
          totalTransactions: 0,
          totalBuys: 0,
          totalSells: 0,
          totalPoolRevenue: 0,
          totalVolume: 0,
        }
      );

      return res.status(200).json({
        message: `Total reports for token ${tokenAddress}`,
        totals: { tokenAddress, ...totals },
      });
    }

    // If no tokenAddress provided — get all tokens
    // console.log("entered in all tokens mode");

    const tokens = await Token.find();
    if (!tokens.length) {
      return res.status(404).json({ message: "No tokens found in database" });
    }

    let allTokensTotals = [];
    let grandTotals = {
      totalTransactions: 0,
      totalBuys: 0,
      totalSells: 0,
      totalPoolRevenue: 0,
      totalVolume: 0,
    };

    // Loop through each token and calculate totals
    for (const token of tokens) {
      const reports = await rwaPoolsReport.find({
        tokenAddress: token.tokenAddress,
      });
      if (!reports.length) continue;

      const totals = reports.reduce(
        (acc, report) => {
          acc.totalTransactions += report.totalTransactions || 0;
          acc.totalBuys += report.buys || 0;
          acc.totalSells += report.sells || 0;
          acc.totalPoolRevenue += report.poolRevenue || 0;
          acc.totalVolume += report.totalVolume || 0;
          return acc;
        },
        {
          totalTransactions: 0,
          totalBuys: 0,
          totalSells: 0,
          totalPoolRevenue: 0,
          totalVolume: 0,
        }
      );

      // Add to token list
      allTokensTotals.push({
        tokenAddress: token.tokenAddress,
        tokenName: token.name,
        ...totals,
      });

      // Add to grand total
      grandTotals.totalTransactions += totals.totalTransactions;
      grandTotals.totalBuys += totals.totalBuys;
      grandTotals.totalSells += totals.totalSells;
      grandTotals.totalPoolRevenue += totals.totalPoolRevenue;
      grandTotals.totalVolume += totals.totalVolume;
    }

    // Final response
    return res.status(200).json({
      message: "Total reports for all tokens",
      tokenCount: allTokensTotals.length,
      data: allTokensTotals,
      grandTotals,
    });
  } catch (error) {
    console.error("Error fetching token details:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// exports.walletReportsSingle = async (req, res) => {
//   const { walletAddress } = req.params

//   try {
//     if (!walletAddress) {
//       return res.status(401).json({ message: "wallet address is not provided" })
//     }

//     const walletData = await WalletReport.find({ walletAddress })

//     if (!walletData.length) {
//       return res.status(404).json({ message: `there is no wallet data available for this ${walletAddress}` })
//     }

//     let totals = {
//       totalTransactions: 0,
//       totalVolume: 0,
//       buys: 0,
//       sells: 0,
//       resetBuys: 0,
//       resetSells: 0,
//       resetsVolume: 0,
//       solAverage: 0,
//       tokenAverage: 0,
//       resetBuyVolumeUSD: 0,
//       resetSellVolumeUSD: 0,
//       agentBuys: 0,
//       agentSells: 0,
//       agentsVolume: 0,
//       bundles: 0,
//       pooledTokenAverage: 0,
//       pooledSolAverage: 0,
//       slippageAvginDollars: 0,
//       lpAdd: 0,
//       averageVolume: 0,
//       gasFee: 0,
//       gasFeeInDollars: 0,
//       rayFee: 0,
//       walletEndBalance: 0,
//       walletStartBalance: 0,
//       walletCost: 0,
//       walletLoss: 0,
//       slipageAndloss: 0,
//       pP: 0,
//       cost: 0,
//     };

//     // Loop through all documents and sum fields
//     walletData.forEach((data) => {
//       Object.keys(totals).forEach((key) => {
//         totals[key] += Number(data[key]) || 0;
//       });
//     });

//     // Take token info from first record
//     const info = walletData[0];

//     return res.status(200).json({
//       message: `Wallet totals for ${walletAddress}`,
//       walletAddress,
//       tokenName: info.tokenName,
//       tokenSymbol: info.tokenSymbol,
//       token: info.token,
//       totalRecords: walletData.length,
//       totals,
//     });
//   } catch (error) {
//     console.error("Error fetching wallet totals:", error);
//     return res.status(500).json({ error: error.message });

//   }
// };

// exports.walletReportsTotal = async (req, res) => {
//   try {
//     const walletData = await WalletReport.find()

//     if (!walletData.length) {
//       return res.status(404).json({ message: `there is no wallet data available` })
//     }

//     let totals = {
//       totalTransactions: 0,
//       totalVolume: 0,
//       buys: 0,
//       sells: 0,
//       resetBuys: 0,
//       resetSells: 0,
//       resetsVolume: 0,
//       solAverage: 0,
//       tokenAverage: 0,
//       resetBuyVolumeUSD: 0,
//       resetSellVolumeUSD: 0,
//       agentBuys: 0,
//       agentSells: 0,
//       agentsVolume: 0,
//       bundles: 0,
//       pooledTokenAverage: 0,
//       pooledSolAverage: 0,
//       slippageAvginDollars: 0,
//       lpAdd: 0,
//       averageVolume: 0,
//       gasFee: 0,
//       gasFeeInDollars: 0,
//       rayFee: 0,
//       walletEndBalance: 0,
//       walletStartBalance: 0,
//       walletCost: 0,
//       walletLoss: 0,
//       slipageAndloss: 0,
//       pP: 0,
//       cost: 0,
//     };

//     // Loop through all documents and sum fields
//     walletData.forEach((data) => {
//       Object.keys(totals).forEach((key) => {
//         totals[key] += Number(data[key]) || 0;
//       });
//     });

//     return res.status(200).json({
//       message: `Total wallet data`,
//       totalRecords: walletData.length,
//       totals,
//     });
//   } catch (error) {
//     console.error("Error fetching wallet totals:", error);
//     return res.status(500).json({ error: error.message });

//   }
// };

exports.walletReportsTotal = async (req, res) => {
  try {
    const { walletAddress } = req.query;

    // 🧠 If specific walletAddress is passed → calculate totals for that wallet
    if (walletAddress) {
      const reports = await WalletReport.find({ walletAddress });

      if (!reports.length) {
        return res.status(404).json({
          message: `No reports found for wallet ${walletAddress}`,
        });
      }

      const totals = reports.reduce(
        (acc, report) => {
          for (const key in acc) {
            acc[key] += Number(report[key]) || 0;
          }
          return acc;
        },
        {
          totalTransactions: 0,
          totalVolume: 0,
          buys: 0,
          sells: 0,
          resetBuys: 0,
          resetSells: 0,
          resetsVolume: 0,
          solAverage: 0,
          tokenAverage: 0,
          resetBuyVolumeUSD: 0,
          resetSellVolumeUSD: 0,
          agentBuys: 0,
          agentSells: 0,
          agentsVolume: 0,
          bundles: 0,
          pooledTokenAverage: 0,
          pooledSolAverage: 0,
          lpAdd: 0,
          gasFee: 0,
          gasFeeInDollars: 0,
          rayFee: 0,
          walletEndBalance: 0,
          walletStartBalance: 0,
          ExpectedCost: 0,
          walletLoss: 0,
          slipageAndloss: 0,
          pP: 0,
          cost: 0,
          totalCost: 0,
          netCost: 0,
          priceImpact: 0,
          tip: 0,
          from_time: 0,
          to_time: 0,
          startTime: 0,
          endTime: 0,
        }
      );

      return res.status(200).json({
        message: `Total reports for wallet ${walletAddress}`,
        walletAddress,
        totals,
      });
    }

    // 🧠 If no walletAddress → calculate for all wallets
    console.log("Entered in all wallets mode");

    const wallets = await WalletReport.distinct("walletAddress");

    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found in database" });
    }

    let allWalletsTotals = [];
    let grandTotals = {
      totalTransactions: 0,
      totalVolume: 0,
      buys: 0,
      sells: 0,
      resetBuys: 0,
      resetSells: 0,
      resetsVolume: 0,
      solAverage: 0,
      tokenAverage: 0,
      resetBuyVolumeUSD: 0,
      resetSellVolumeUSD: 0,
      agentBuys: 0,
      agentSells: 0,
      agentsVolume: 0,
      bundles: 0,
      pooledTokenAverage: 0,
      pooledSolAverage: 0,
      lpAdd: 0,
      gasFee: 0,
      gasFeeInDollars: 0,
      rayFee: 0,
      walletEndBalance: 0,
      walletStartBalance: 0,
      ExpectedCost: 0,
      walletLoss: 0,
      slipageAndloss: 0,
      pP: 0,
      cost: 0,
      totalCost: 0,
      netCost: 0,
      priceImpact: 0,
      tip: 0,
      from_time: 0,
      to_time: 0,
      startTime: 0,
      endTime: 0,
    };

    // ⚙️ Loop through each wallet
    for (const address of wallets) {
      const reports = await WalletReport.find({ walletAddress: address });
      if (!reports.length) continue;

      const totals = reports.reduce(
        (acc, report) => {
          for (const key in acc) {
            acc[key] += Number(report[key]) || 0;
          }
          return acc;
        },
        { ...grandTotals } // clone structure
      );

      allWalletsTotals.push({
        walletAddress: address,
        ...totals,
      });

      // ➕ Add to global grandTotals
      for (const key in grandTotals) {
        grandTotals[key] += totals[key] || 0;
      }
    }

    // ✅ Final response
    return res.status(200).json({
      message: "Total reports for all wallets",
      walletCount: allWalletsTotals.length,
      data: allWalletsTotals,
      grandTotals,
    });
  } catch (error) {
    console.error("Error fetching wallet totals:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// exports.getActiveNetworks = async (req, res) => {
//   try {
//     const { networkId } = req.query;

//     if (networkId) {
//       const network = await Network.findById(networkId);
//       if (!network) {
//         return res.status(404).json({
//           message: `No Active Network Found With Id: ${networkId}`,
//         });
//       }

//       return res.status(200).json({
//         message: `Active Network with Id: ${networkId} fetched successfully!`,
//         data: network,
//       });
//     }

//     // fetch all active networks
//     const networks = await Network.find({ status: true });
//     return res.status(200).json({
//       message: "Active Networks Fetched Successfully!",
//       length: networks.length,
//       data: networks,
//     });

//   } catch (err) {
//     console.error("Error getting active networks:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };

exports.getActiveNetworks = async (req, res) => {
  try {
    const { networkId, page = 1, limit = 10 } = req.query;

    // Parse pagination params
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Fetch single active network by ID
    if (networkId) {
      const network = await Network.findById(networkId);

      if (!network) {
        return res.status(404).json({
          message: `No active network found with ID: ${networkId}`,
        });
      }

      return res.status(200).json({
        message: `Active network with ID: ${networkId} fetched successfully!`,
        data: network,
      });
    }

    // Count total active networks
    const count = await Network.countDocuments({ status: true });
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated active networks
    const networks = await Network.find({ status: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!networks.length) {
      return res.status(404).json({
        message: "No active networks found.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Final response
    return res.status(200).json({
      message: "Active networks fetched successfully!",
      count,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      data: networks,
    });
  } catch (err) {
    console.error("Error getting active networks:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};

// exports.getActivePlatforms = async (req, res) => {
//   try {
//     const { platformId, networkId } = req.query;

//     // Fetch specific platform by platformId
//     if (platformId) {
//       const platform = await Platform.findById(platformId);
//       if (!platform) {
//         return res.status(404).json({
//           message: `No Active Platform Found With Id: ${platformId}`,
//         });
//       }

//       return res.status(200).json({
//         message: `Active Platform with Id: ${platformId} fetched successfully!`,
//         data: platform,
//       });
//     }

//     // Fetch all active platforms under a specific network
//     if (networkId) {
//       const platforms = await Platform.find({ networkId, status: true });
//       if (!platforms.length) {
//         return res.status(404).json({
//           message: `No active platforms found for Network Id: ${networkId}`,
//           data: [],
//         });
//       }

//       return res.status(200).json({
//         message: `Active platforms for Network Id: ${networkId} fetched successfully!`,
//         length: platforms.length,
//         data: platforms,
//       });
//     }

//     // Fetch all active platforms
//     const platforms = await Platform.find({ status: true });
//     return res.status(200).json({
//       message: "All Active Platforms Fetched Successfully!",
//       length: platforms.length,
//       data: platforms,
//     });

//   } catch (err) {
//     console.error("Error getting active platforms:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };

exports.getActivePlatforms = async (req, res) => {
  try {
    const { platformId, networkId, page = 1, limit = 10 } = req.query;

    // Parse pagination params
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Fetch single platform by ID
    if (platformId) {
      const platform = await Platform.findById(platformId);
      if (!platform || !platform.status) {
        return res.status(404).json({
          message: `No active platform found with ID: ${platformId}`,
        });
      }

      return res.status(200).json({
        message: `Active platform with ID: ${platformId} fetched successfully!`,
        data: platform,
      });
    }

    // Build filter for active platforms
    const filter = { status: true };
    if (networkId) filter.networkId = networkId;

    // Count total active platforms
    const count = await Platform.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated active platforms
    const platforms = await Platform.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!platforms.length) {
      return res.status(404).json({
        message: networkId
          ? `No active platforms found for Network ID: ${networkId}`
          : "No active platforms found.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    const message = networkId
      ? `Active platforms for Network ID: ${networkId} fetched successfully!`
      : "All active platforms fetched successfully!";

    // Final response
    return res.status(200).json({
      message,
      count,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      data: platforms,
    });
  } catch (err) {
    console.error("Error getting active platforms:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};

// exports.getActiveTokens = async (req, res) => {
//   try {
//     const { tokenId, platformId, networkId } = req.query;

//     // Fetch specific token by tokenId
//     if (tokenId) {
//       const token = await Token.findOne({ _id: tokenId, status: true });
//       if (!token) {
//         return res.status(404).json({
//           message: `No active token found with Id: ${tokenId}`,
//         });
//       }

//       return res.status(200).json({
//         message: `Active token with Id: ${tokenId} fetched successfully!`,
//         data: token,
//       });
//     }

//     // Fetch all active tokens under a specific platform
//     if (platformId) {
//       const tokens = await Token.find({ platformId, status: true });
//       if (!tokens.length) {
//         return res.status(404).json({
//           message: `No active tokens found for Platform Id: ${platformId}`,
//           data: [],
//         });
//       }

//       return res.status(200).json({
//         message: `Active tokens for Platform Id: ${platformId} fetched successfully!`,
//         length: tokens.length,
//         data: tokens,
//       });
//     }

//     // CASE 3: Fetch all active tokens under a specific network
//     if (networkId) {
//       const tokens = await Token.find({ networkId, status: true });
//       if (!tokens.length) {
//         return res.status(404).json({
//           message: `No active tokens found for Network Id: ${networkId}`,
//           data: [],
//         });
//       }

//       return res.status(200).json({
//         message: `Active tokens for Network Id: ${networkId} fetched successfully!`,
//         length: tokens.length,
//         data: tokens,
//       });
//     }

//     // Fetch all active tokens (default)
//     const tokens = await Token.find({ status: true });
//     return res.status(200).json({
//       message: "All Active Tokens Fetched Successfully!",
//       length: tokens.length,
//       data: tokens,
//     });

//   } catch (err) {
//     console.error("Error getting active tokens:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };

exports.getActiveTokens = async (req, res) => {
  try {
    const { tokenId, platformId, networkId, page = 1, limit = 10 } = req.query;

    // Parse pagination params
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // CASE 1: Fetch a single active token
    if (tokenId) {
      const token = await Token.findOne({ _id: tokenId, status: true });
      if (!token) {
        return res.status(404).json({
          message: `No active token found with ID: ${tokenId}`,
        });
      }

      return res.status(200).json({
        message: `Active token with ID: ${tokenId} fetched successfully!`,
        data: token,
      });
    }

    // Build base filter for active tokens
    const filter = { status: true };
    if (platformId) filter.platformId = platformId;
    if (networkId) filter.networkId = networkId;

    // Count total active tokens
    const count = await Token.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated tokens
    const tokens = await Token.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!tokens.length) {
      let notFoundMsg = "No active tokens found.";
      if (platformId)
        notFoundMsg = `No active tokens found for Platform ID: ${platformId}`;
      if (networkId)
        notFoundMsg = `No active tokens found for Network ID: ${networkId}`;
      return res.status(404).json({
        message: notFoundMsg,
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    let message = "All active tokens fetched successfully!";
    if (platformId)
      message = `Active tokens for Platform ID: ${platformId} fetched successfully!`;
    else if (networkId)
      message = `Active tokens for Network ID: ${networkId} fetched successfully!`;

    // Final Response
    return res.status(200).json({
      message,
      count,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      data: tokens,
    });
  } catch (err) {
    console.error("Error getting active tokens:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};

exports.gettokenDatahistory = async (token, req, res) => {
  try {
    console.log("token data", token);

    // ===== CONFIG =====
    const mintAddress = token.tokenAddress;
    const tokenName = token.name;
    const tokenIcon = token.token_logo_url;
    const tokenSymbol = token.symbol;

    // const mintAddress = "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT";
    // const tokenName = "IdleMine";
    // const tokenIcon = "";
    // const tokenSymbol = "IDLE";

    const solAddress = "So11111111111111111111111111111111111111112";

    const requestOptions = {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
      },
    };

    // ===== DATE RANGE: from 20 Sep 2025 → yesterday =====
    const startDate = moment.utc("2025-10-22T00:00:00Z");
    const endDate = moment.utc().subtract(1, "day").startOf("day");

    console.log(
      `⏱ Fetching token data from ${startDate.format()} → ${endDate.format()}`
    );

    let current = startDate.clone();
    const dailyReports = [];

    // ===== LOOP DAY-BY-DAY =====
    while (current.isBefore(endDate)) {
      const from_unix = current.unix();
      const to_unix = current
        .clone()
        .add(1, "day")
        .subtract(1, "second")
        .unix();
      const from_time = Number(current.format("YYYYMMDD"));

      console.log(
        `📅 Fetching ${current.format(
          "YYYY-MM-DD"
        )} (Unix ${from_unix} → ${to_unix})`
      );

      // --- Check if this day's record already exists ---
      const existing = await TokenReport.findOne({
        tokenAddress: mintAddress,
        from_time,
      });

      if (existing) {
        console.log(
          `⏩ Skipping ${current.format("YYYY-MM-DD")} — already saved`
        );
        current.add(1, "day");
        continue;
      }

      // --- Fetch from Solscan ---
      let page = 1;
      let hasMore = true;
      let dayData = [];

      while (hasMore) {
        const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${mintAddress}&from_time=${from_unix}&to_time=${to_unix}&page=${page}&page_size=100`;
        const response = await fetch(url, requestOptions);
        const data = await response.json();

        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          dayData = dayData.concat(data.data);
          console.log(`✅ Page ${page}: ${data.data.length} txs`);
          page++;
          await new Promise((r) => setTimeout(r, 400)); // API delay
        } else {
          hasMore = false;
        }
      }

      console.log(
        `📦 ${current.format("YYYY-MM-DD")} — ${dayData.length} transactions`
      );

      // ✅ SAFETY: Skip empty or invalid responses
      if (!dayData || dayData.length === 0) {
        console.log(
          `🚫 No transactions found for ${current.format(
            "YYYY-MM-DD"
          )} — skipping`
        );
        current.add(1, "day");
        continue;
      }

      const settings = await Settings.findOne({ status: true });

      //     // ====== BUY/SELL LOGIC ======
      const buyTxs = dayData.filter(
        (tx) =>
          tx.routers?.token1 === solAddress &&
          tx.routers?.token2 === mintAddress
      );
      const sellTxs = dayData.filter(
        (tx) =>
          tx.routers?.token1 === mintAddress &&
          tx.routers?.token2 === solAddress
      );
      const transferTxs = dayData.filter(
        (tx) =>
          tx.routers?.token1 !== mintAddress &&
          tx.routers?.token2 !== mintAddress
      );

      const buys = buyTxs.length;
      const sells = sellTxs.length;
      const transfers = transferTxs.length;

      const buysVolume = buyTxs.reduce(
        (sum, tx) => sum + Number(tx.value ?? 0),
        0
      );
      const sellsVolume = sellTxs.reduce(
        (sum, tx) => sum + Number(tx.value ?? 0),
        0
      );
      const totalVolume = buysVolume + sellsVolume;
      const LPadded = (totalVolume * settings.lpRewardPercentage);

      // ====== SAVE DAILY ENTRY ======
      const newReport = new TokenReport({
        tokenName,
        tokenSymbol,
        tokenIcon,
        tokenAddress: mintAddress,
        totalTransactions: dayData.length,
        buys,
        sells,
        transfers,
        totalVolume,
        LPadded,
        totalHolders: 0, // fixed — you had undefined totalHolders
        from_time, // e.g. 20250920
      });

      await newReport.save();
      console.log(
        `✅ Saved ${tokenName} data for ${current.format("YYYY-MM-DD")}`
      );

      dailyReports.push({
        date: current.format("YYYY-MM-DD"),
        buys,
        sells,
        transfers,
        totalVolume,
        LPadded,
      });

      // move to next day
      current.add(1, "day");
    }

    console.log(
      `🎯 Completed fetching ${dailyReports.length} daily reports for ${tokenName}`
    );
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getFilteredReports = async (req, res) => {
  try {
    const { tokenAddress, filterType } = req.query; // filterType = 'day' | 'month' | 'year'

    if (!tokenAddress || !filterType) {
      return res
        .status(400)
        .json({ message: "tokenAddress and filterType are required" });
    }

    // Convert current date to YYYYMMDD
    const currentDate = new Date();
    const currentYYYYMMDD = parseInt(
      currentDate.toISOString().slice(0, 10).replace(/-/g, "")
    );

    let matchStage = { tokenAddress };

    // === DAY WISE: last 30 days ===
    if (filterType === "day") {
      const last30Days = parseInt(
        new Date(currentDate.setDate(currentDate.getDate() - 30))
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, "")
      );
      matchStage.startTime = { $gte: last30Days };
    }

    // === MONTHLY: group by month ===
    const projectStage = {
      $project: {
        tokenAddress: 1,
        totalVolume: 1,
        poolRevenue: 1,
        startTime: 1,
        year: { $substr: [{ $toString: "$startTime" }, 0, 4] },
        month: { $substr: [{ $toString: "$startTime" }, 4, 2] },
      },
    };

    let groupStage;

    if (filterType === "day") {
      groupStage = {
        $group: {
          _id: "$startTime",
          totalVolume: { $sum: "$totalVolume" },
          poolRevenue: { $sum: "$poolRevenue" },
        },
      };
    } else if (filterType === "month") {
      groupStage = {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalVolume: { $sum: "$totalVolume" },
          poolRevenue: { $sum: "$poolRevenue" },
        },
      };
    } else if (filterType === "year") {
      groupStage = {
        $group: {
          _id: "$year",
          totalVolume: { $sum: "$totalVolume" },
          poolRevenue: { $sum: "$poolRevenue" },
        },
      };
    } else {
      return res.status(400).json({ message: "Invalid filterType" });
    }

    const pipeline = [
      { $match: matchStage },
      projectStage,
      groupStage,
      { $sort: { _id: 1 } },
    ];

    const result = await rwaPoolsReport.aggregate(pipeline);

    return res.status(200).json({
      message: "Filtered reports fetched successfully",
      filterType,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching filtered reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// exports.getFilteredReports = async (req, res) => {
//   try {
//     const { tokenAddress, filterType } = req.query; // filterType = 'day' | 'month' | 'year'

//     if (!tokenAddress || !filterType) {
//       return res
//         .status(400)
//         .json({ message: "tokenAddress and filterType are required" });
//     }

//     // Convert current date to YYYYMMDD
//     const currentDate = new Date();
//     const currentYYYYMMDD = parseInt(
//       currentDate.toISOString().slice(0, 10).replace(/-/g, "")
//     );

//     let matchStage = { tokenAddress };

//     // === DAY WISE: last 30 days ===
//     if (filterType === "day") {
//       const last30Days = parseInt(
//         new Date(currentDate.setDate(currentDate.getDate() - 30))
//           .toISOString()
//           .slice(0, 10)
//           .replace(/-/g, "")
//       );
//       matchStage.from_time = { $gte: last30Days };
//     }

//     // === MONTHLY: group by month ===
//     const projectStage = {
//       $project: {
//         tokenAddress: 1,
//         totalVolume: 1,
//         LPadded: 1,
//         from_time: 1,
//         year: { $substr: [{ $toString: "$from_time" }, 0, 4] },
//         month: { $substr: [{ $toString: "$from_time" }, 4, 2] },
//       },
//     };

//     let groupStage;

//     if (filterType === "day") {
//       groupStage = {
//         $group: {
//           _id: "$from_time",
//           totalVolume: { $sum: "$totalVolume" },
//           LPadded: { $sum: "$LPadded" },
//         },
//       };
//     } else if (filterType === "month") {
//       groupStage = {
//         $group: {
//           _id: { year: "$year", month: "$month" },
//           totalVolume: { $sum: "$totalVolume" },
//           LPadded: { $sum: "$LPadded" },
//         },
//       };
//     } else if (filterType === "year") {
//       groupStage = {
//         $group: {
//           _id: "$year",
//           totalVolume: { $sum: "$totalVolume" },
//           LPadded: { $sum: "$LPadded" },
//         },
//       };
//     } else {
//       return res.status(400).json({ message: "Invalid filterType" });
//     }

//     const pipeline = [
//       { $match: matchStage },
//       projectStage,
//       groupStage,
//       { $sort: { _id: 1 } },
//     ];

//     const result = await TokenReport.aggregate(pipeline);

//     return res.status(200).json({
//       message: "Filtered reports fetched successfully",
//       filterType,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Error fetching filtered reports:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

exports.tokenHolders = async (token, req, res) => {
  const tokenName = token.name;
  const tokenAddress = token.tokenAddress;
  const tokensymbol = token.symbol;

  try {
    let allHolders = [];
    let holderPage = 1;
    const holderPageSize = 40;
    let hasMoreHolders = true;

    const requestOptions = {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
      },
    };

    // ===== FETCH HOLDERS PAGE BY PAGE =====
    while (hasMoreHolders) {
      const link = `https://pro-api.solscan.io/v2.0/token/holders?address=${tokenAddress}&page=${holderPage}&page_size=${holderPageSize}`;
      const response = await fetch(link, requestOptions);
      const data = await response.json();

      console.log(
        `📄 Holder page ${holderPage} fetched`,
        data?.data?.items?.length || 0
      );

      if (data?.data?.items && data.data.items.length > 0) {
        allHolders = allHolders.concat(data.data.items);
        holderPage++;
        await new Promise((r) => setTimeout(r, 400)); // avoid rate limit
      } else {
        hasMoreHolders = false;
      }
    }

    console.log(`✅ Total holders fetched: ${allHolders.length}`);

    // const today = Number(moment.utc().format("YYYYMMDD"));
    const today = Number(moment.utc().subtract(1, "day").format("YYYYMMDD"));

    // ===== FORMAT HOLDERS =====
    const holderDetails = allHolders.map((h) => ({
      tokenAddress,
      tokenName,
      tokensymbol,
      rank: h.rank,
      owner: h.owner,
      address: h.address,
      percentage: h.percentage.toFixed(2),
      value: h.value.toFixed(2),
      date: today,
    }));

    // ===== INSERT HISTORICAL SNAPSHOT =====
    await Holders.insertMany(holderDetails);

    console.log(
      `💾 ${holderDetails.length} holders saved for ${tokenAddress} (${today})`
    );

    // return res.status(200).json({
    //   message: "✅ Successfully fetched & stored daily holders snapshot",
    //   date: today,
    //   holderCount: holderDetails.length,
    // });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// exports.tokenHoldersList = async (req, res) => {
//   const { tokenAddress, date } = req.query;

//   try {
//     const filter = { tokenAddress: tokenAddress };
//     if (date) filter.date = date;
//     const holders = await Holders.find(filter).sort({
//       rank: 1,
//     });

//     if (!holders || holders.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No holders found for this token" });
//     }

//     return res.status(200).json({
//       message: "✅ Token holders fetched successfully",
//       holderCount: holders.length,
//       date: date,
//       holders,
//     });
//   } catch (error) {
//     console.error(" Error fetching holders:", error);
//     return res
//       .status(500)
//       .json({ message: "Failed to fetch holders", error: error.message });
//   }
// };

// exports.tokenHoldersList = async (req, res) => {
//   try {
//     const { tokenAddress, date, page = 1, pageSize = 10 } = req.query;

//     if (!tokenAddress) {
//       return res.status(400).json({ message: "Token address is required" });
//     }

//     const filter = { tokenAddress };
//     if (date) filter.date = date;

//     const skip = (page - 1) * pageSize;

//     const [holders, totalCount] = await Promise.all([
//       Holders.find(filter)
//         .sort({ rank: 1 })
//         .skip(skip)
//         .limit(Number(pageSize)),
//       Holders.countDocuments(filter)
//     ]);

//     if (!holders || holders.length === 0) {
//       return res.status(404).json({ message: "No holders found for this token" });
//     }

//     return res.status(200).json({
//       message: "✅ Token holders fetched successfullyyy",
//       totalHolders: totalCount,
//       page: Number(page),
//       pageSize: Number(pageSize),
//       totalPages: Math.ceil(totalCount / pageSize),
//       date: date || null,
//       holders,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching holders:", error);
//     return res.status(500).json({
//       message: "Failed to fetch holders",
//       error: error.message,
//     });
//   }
// };

exports.getLiquidityPools = async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    // console.log("req.query:", req.query);

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Set default values if they are not valid numbers
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ success: false, message: "Invalid limit" });
    }

    // Apply filters (dynamic filters based on query params)
    const filterConditions = {};
    for (let key in filters) {
      if (filters[key]) {
        // Handle != (not equal) operator
        if (filters[key].startsWith("!")) {
          const filterValue = filters[key].slice(1); // Remove the '!' to get the actual value
          filterConditions[key] = { $ne: filterValue }; // Use $ne (not equal) operator
        } else {
          filterConditions[key] = { $regex: filters[key], $options: "i" }; // Case-insensitive regex search
        }
      }
    }

    console.log(filterConditions, "filterConditions");

    const pools = await RWASchema.find({ ...filterConditions })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);
    const totalPools = await RWASchema.countDocuments({ ...filterConditions });

    return res.status(200).json({
      message: "pools successfully fetched",
      page: pageNumber,
      limit: limitNumber,
      total: totalPools,
      data: pools,
    });
  } catch (error) {
    console.error("Error fetching pools:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.tokenHoldersList = async (req, res) => {
  try {
    const { tokenAddress, date, page = 1, pageSize = 10 } = req.query;

    const filter = {};

    if (tokenAddress) {
      filter.tokenAddress = tokenAddress;
    }

    if (date) {
      filter.date = date;
    }

    const Holdercount = await Holders.countDocuments();

    const skip = (page - 1) * pageSize;

    const [holders, totalCount] = await Promise.all([
      Holders.find(filter)
        // .sort({ rank: 1 })
        .sort({ date: -1, rank: 1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Holders.countDocuments(filter),
    ]);

    if (!holders || holders.length === 0) {
      return res
        .status(404)
        .json({ message: "No holders found for this token" });
    }

    return res.status(200).json({
      message: "Token holders fetched successfullyyy",
      Holdercount,
      totalHolders: totalCount,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(totalCount / pageSize),
      date: date || null,
      holders,
    });
  } catch (error) {
    console.error("Error fetching holders:", error);
    return res.status(500).json({
      message: "Failed to fetch holders",
      error: error.message,
    });
  }
};

exports.getholderDailydata = async (req, res) => {
  try {
    const tokenData = await Token.find();

    if (!tokenData || tokenData.length === 0) {
      console.log("No tokens found in the database.");
      return res.status(404).json({ error: "No tokens found." });
    }

    console.log("Token Data:", tokenData);

    for (let i = 0; i < tokenData.length; i++) {
      const token = tokenData[i];
      console.log("Calling getAllActivities for Token:", token);

      if (!token) {
        console.error(`Token at index ${i} is undefined`);
        continue;
      }
      // const data = token.name
      console.log("data", token);

      // await gettokenData(token, req, res)
      await exports.tokenHolders(token, req, res);
    }

    // return res.status(200).json({ tokenData })
  } catch (error) {
    console.error("Error in getTokenData:", error);
    // res.status(500).json({ error: "An error occurred." });
  }
};

exports.getPooledSolAndTokens = async (req, res) => {
  try {
    const { chainId, tokenAddress } = req.query;

    if (!tokenAddress) {
      return res.status(400).json({ message: "tokenAddress is required" });
    }

    const tokenInDb = await Token.findOne({
      tokenAddress: tokenAddress.trim(),
    });

    if (!tokenInDb) {
      return res.status(404).json({
        message: "Token address not found.",
        tokenAddress,
      });
    }

    // Fetch from Dexscreener API
    const response = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error(`Dexscreener API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      return res.status(404).json({ message: "No liquidity data found" });
    }

    // Extract liquidity info
    const liquidityData = data[0].liquidity || {};
    const pooledTokenToday = liquidityData.base || 0;
    const pooledSOLToday = liquidityData.quote || 0;

    return res.status(200).json({
      message: "Successfully retrieved live pooled SOL and tokens.",
      chainId,
      tokenAddress,
      pooledTokenToday,
      pooledSOLToday,
    });
  } catch (error) {
    console.error("Error fetching pooled data:", error.message);
    return res.status(500).json({
      message: "Failed to fetch pooled SOL and tokens.",
      error: error.message,
    });
  }
};

// exports.saveLiquidityPools = async (req, res) => {
//   try {
//     const chainId = "solana";
//     const tokens = await TokenSchema.find();

//     if (!tokens.length) {
//       return res.status(404).json({ message: "No tokens found in database" });
//     }

//     let totalSaved = 0;
//     let allPools = [];

//     // 🔹 Loop through every token
//     for (const token of tokens) {
//       const tokenAddress = token.tokenAddress;
//       const url = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100&mintFilter=RWA`;
//       const response = await fetch(url, {
//       method: "GET",
//       headers: { token: process.env.SOL_API_TOKEN },
//     });

//     if (!response.ok) throw new Error(`API error: ${response.status}`);
//       try {
//         const data = await response.json();
//         const pools = data?.data?.data || [];
//         const pairs = Array.isArray(pools) ? pools : [pools];

//         if (!Array.isArray(pairs) || pairs.length === 0) {
//           console.log(`⚠️ No pairs found for ${token.symbol}`);
//           continue;
//         }

//         // 🔹 Construct data for DB
//         const poolsToSave = pairs.map((pair) => {

//           return {
//             tokenAddress: tokenAddress,
//             pairAddress: pair.id,
//             rwaName: pair.mintA?.name || "Unknown RWA",
//             rwaAddress: pair.mintA?.address || "Unknown RWA Address",
//             logoURI: pair.mintA?.logoURI || "",
//             symbol: pair.mintA?.symbol || "",
//           };
//         });

//         // 🔹 Upsert all pools
//         for (const pool of poolsToSave) {
//           await RWASchema.findOneAndUpdate(
//             { pairAddress: pool.pairAddress },
//             pool,
//             { upsert: true, new: true }
//           );
//         }

//         totalSaved += poolsToSave.length;
//         allPools.push(...poolsToSave);
//         console.log(`✅ ${token.symbol}: ${poolsToSave.length} pools saved`);
//       } catch (innerErr) {
//         console.error(`❌ Error fetching ${token.symbol}:`, innerErr.message);
//       }
//     }
//          console.log("RWA liquidity pools created or updated successfully");

//     // return res.status(200).json({
//     //   message: "RWA liquidity pools created or updated successfully",
//     //   totalSaved,
//     //   data: allPools,
//     // });
//   } catch (error) {
//     console.error("Error saving RWA liquidity pools:", error.message);
//     return res.status(500).json({
//       message: "Failed to save RWA liquidity pools",
//       error: error.message,
//     });
//   }
// };

exports.saveLiquidityPools = async (req, res) => {
  try {
    const chainId = "solana";
    const tokens = await TokenSchema.find();

    if (!tokens.length) {
      return res.status(404).json({ message: "No tokens found in database" });
    }

    let totalSaved = 0;
    let allPools = [];

    // 🔹 Loop through every token
    for (const token of tokens) {
      const tokenAddress = token.tokenAddress;
      const url = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      try {
        const data = await response.json();
        const pools = data?.data?.data || [];
        const pairs = Array.isArray(pools) ? pools : [pools];
        // console.log("pools", pools);

        if (!Array.isArray(pairs) || pairs.length === 0) {
          console.log(`⚠️ No pairs found for ${token.symbol}`);
          continue;
        }

        // 🔹 Construct data for DB
        const poolsToSave = pairs.map((pair) => {
          // console.log("pair.pooltype",pair.pooltype);

          return {
            tokenAddress: tokenAddress,
            pairAddress: pair.id,
            name: pair.mintA?.name || "Unknown RWA",
            address: pair.mintA?.address || "Unknown RWA Address",
            logoURI: pair.mintA?.logoURI || "",
            symbol: pair.mintA?.symbol || "",
            poolType: pair.pooltype[0] || "Unknown",
            lpPercentage: pair.feeRate || 0,
          };
        });
        console.log("poolsToSave", poolsToSave);
        console.log("poolsToSave.length", poolsToSave.length);

        // 🔹 Upsert all pools
        for (const pool of poolsToSave) {
          await RWASchema.findOneAndUpdate(
            { pairAddress: pool.pairAddress },
            pool,
            { upsert: true, new: true }
          );
        }

        totalSaved += poolsToSave.length;
        allPools.push(...poolsToSave);
        console.log(`✅ ${token.symbol}: ${poolsToSave.length} pools saved`);
      } catch (innerErr) {
        console.error(`❌ Error fetching ${token.symbol}:`, innerErr.message);
      }
    }
    console.log("RWA liquidity pools created or updated successfully");

    // return res.status(200).json({
    //   message: "RWA liquidity pools created or updated successfully",
    //   totalSaved,
    //   data: allPools,
    // });
  } catch (error) {
    console.error("Error saving RWA liquidity pools:", error.message);
    return res.status(500).json({
      message: "Failed to save RWA liquidity pools",
      error: error.message,
    });
  }
};

// exports.saveLiquidityPools = async (req, res) => {
//   try {
//     const chainId = "solana";
//     const tokens = await TokenSchema.find();

//     if (!tokens.length) {
//       return res.status(404).json({ message: "No tokens found in database" });
//     }

//     let totalSaved = 0;
//     let allPools = [];

//     // 🔹 Loop through every token
//     for (const token of tokens) {
//       const tokenAddress = token.tokenAddress;
//       const url = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100`;
//       const response = await fetch(url, {
//       method: "GET",
//       headers: { token: process.env.SOL_API_TOKEN },
//     });

//     if (!response.ok) throw new Error(`API error: ${response.status}`);
//       try {
//         const data = await response.json();
//         const pools = data?.data?.data || [];
//         const pairs = Array.isArray(pools) ? pools : [pools];
//         // console.log("pools", pools);

//         if (!Array.isArray(pairs) || pairs.length === 0) {
//           console.log(`⚠️ No pairs found for ${token.symbol}`);
//           continue;
//         }

//         // 🔹 Construct data for DB
//         const poolsToSave = pairs.map((pair) => {
//     // console.log("pair.pooltype",pair.pooltype);

//           return {
//             tokenAddress: tokenAddress,
//             pairAddress: pair.id,
//             rwaName: pair.mintA?.name || "Unknown RWA",
//             rwaAddress: pair.mintA?.address || "Unknown RWA Address",
//             logoURI: pair.mintA?.logoURI || "",
//             symbol: pair.mintA?.symbol || "",
//             pooltype: pair.pooltype[0] || "Unknown",
//             lpPercentage:pair.feeRate || 0
//           };
//         });
//         console.log("poolsToSave",poolsToSave);
//         console.log("poolsToSave.length",poolsToSave.length);

//         // 🔹 Upsert all pools
//         for (const pool of poolsToSave) {
//           await RWASchema.findOneAndUpdate(
//             { pairAddress: pool.pairAddress },
//             pool,
//             { upsert: true, new: true }
//           );
//         }

//         totalSaved += poolsToSave.length;
//         allPools.push(...poolsToSave);
//         console.log(`✅ ${token.symbol}: ${poolsToSave.length} pools saved`);
//       } catch (innerErr) {
//         console.error(`❌ Error fetching ${token.symbol}:`, innerErr.message);
//       }
//     }
//          console.log("RWA liquidity pools created or updated successfully");

//     // return res.status(200).json({
//     //   message: "RWA liquidity pools created or updated successfully",
//     //   totalSaved,
//     //   data: allPools,
//     // });
//   } catch (error) {
//     console.error("Error saving RWA liquidity pools:", error.message);
//     return res.status(500).json({
//       message: "Failed to save RWA liquidity pools",
//       error: error.message,
//     });
//   }
// };

// exports.getLiquidityPools = async (req, res) => {
//   try {
//     const { pairAddress, rwaAddress, tokenAddress, _id, page = 1, limit = 10 } = req.query;

//     // Parse pagination params
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     // CASE 1: Fetch a single pool by _id
//     if (_id) {
//       if (!mongoose.Types.ObjectId.isValid(_id)) {
//         return res.status(400).json({ message: "Invalid document ID format" });
//       }

//       const pool = await RWASchema.findById(_id);
//       if (!pool) {
//         return res.status(404).json({
//           message: `No liquidity pool found with ID: ${_id}`,
//         });
//       }

//       return res.status(200).json({
//         message: `Liquidity pool with ID: ${_id} fetched successfully!`,
//         data: pool,
//       });
//     }

//     // CASE 2: Build base filter
//     const filter = {};
//     if (pairAddress) filter.pairAddress = pairAddress.trim();
//     if (rwaAddress) filter.rwaAddress = rwaAddress.trim();
//     if (tokenAddress) filter.tokenAddress = tokenAddress.trim();

//     // Count total pools
//     const count = await RWASchema.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(count / limitNumber));

//     // Fetch paginated results
//     const pools = await RWASchema.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     if (!pools.length) {
//       let notFoundMsg = "No liquidity pools found.";
//       if (pairAddress) notFoundMsg = `No pools found for Pair Address: ${pairAddress}`;
//       else if (rwaAddress) notFoundMsg = `No pools found for RWA Address: ${rwaAddress}`;
//       else if (tokenAddress) notFoundMsg = `No pools found for Token Address: ${tokenAddress}`;

//       return res.status(404).json({
//         message: notFoundMsg,
//         count: 0,
//         totalPages: 0,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Dynamic success message
//     let message = "All liquidity pools fetched successfully!";
//     if (pairAddress) message = `Pools for Pair Address: ${pairAddress} fetched successfully!`;
//     else if (rwaAddress) message = `Pools for RWA Address: ${rwaAddress} fetched successfully!`;
//     else if (tokenAddress) message = `Pools for Token Address: ${tokenAddress} fetched successfully!`;

//     // Final Response
//     return res.status(200).json({
//       message,
//       count,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: pools,
//     });
//   } catch (err) {
//     console.error("Error fetching liquidity pools:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };
exports.saveRWAPoolsReports = async (
  pairAddress,
  tokenAddress,
  rwaAddress,
  rwaName,
  chainId,
  req,
  res
) => {
  try {
    console.log(
      "pairAddress :",
      pairAddress,
      "tokenAddress",
      tokenAddress,
      "rwaAddress",
      rwaAddress,
      "rwaName",
      rwaName,
      "chainId",
      chainId
    );

    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const lastReportDate = moment.utc().subtract(2, "days").format("YYYYMMDD");
    console.log("lastReportDate", lastReportDate);

    const yesterdayBalance = await rwaPoolsReport.findOne({
      startTime: lastReportDate,
      pairAddress: pairAddress,
    });

    console.log("yesterdayBalance", yesterdayBalance.poolEndBalance);
    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      return res.status(200).json({ message: "No transactions for this date" });
    }
    const settings = await Settings.findOne({ status: true });

    // Filter Buys and Sells
    const buyTxs = dayData.filter((tx) => tx.routers?.token2 === rwaAddress);
    const sellTxs = dayData.filter((tx) => tx.routers?.token1 === rwaAddress);

    const buys = buyTxs.length;
    const sells = sellTxs.length;

    const buysVolume = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const sellsVolume = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const totalVolume = buysVolume + sellsVolume;
    const LPadded = (totalVolume * settings.lpRewardPercentage);

    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();

    const poolStartBalance = yesterdayBalance.poolEndBalance;
    const poolEndBalance = data1.pairs[0].liquidity.usd;

    console.log("data1", data1.pairs[0].liquidity.usd);
    console.log("data2", data1);

    // Save report
    const newReport = new rwaPoolsReport({
      pairAddress,
      tokenAddress,
      rwaAddress,
      rwaName,
      chainId,
      totalTransactions: dayData.length,
      buys,
      sells,
      totalVolume,
      LPadded,
      poolStartBalance,
      poolEndBalance,
      cost: poolStartBalance - poolEndBalance,
      startTime,
      endTime,
    });

    await newReport.save();
    console.log(`✅ Saved ${rwaName} data for ${startTime}`);

    // res.status(200).json({
    //   message: `Data saved for ${rwaName}`,
    //    pairAddress,
    //   tokenAddress,
    //   rwaAddress,
    //   rwaName,
    //   chainId,
    //   totalTransactions:dayData.length,
    //   buys,
    //   sells,
    //   totalVolume,
    //   LPadded,
    //   dayData
    // });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};

// exports.getPoolTransactions = async (pairAddress, tokenAddress, rwaAddress, rwaName, chainId, req, res) => {
//   try {

//     console.log("pairAddress :", pairAddress,
//       "tokenAddress", tokenAddress,
//       "rwaAddress", rwaAddress,
//       "rwaName", rwaName,
//       "chainId", chainId);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day");  // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment.unix(from_time).utc().format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment.unix(to_time).utc().format("YYYY-MM-DD HH:mm:ss [UTC]")
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter(
//       (tx) => tx.routers?.token2 === rwaAddress
//     );
//     const sellTxs = dayData.filter(
//       (tx) => tx.routers?.token1 === rwaAddress
//     );

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const buysVolume = buyTxs.reduce((sum, tx) => sum + Number(tx.value ?? 0), 0);
//     const sellsVolume = sellTxs.reduce((sum, tx) => sum + Number(tx.value ?? 0), 0);
//     const totalVolume = buysVolume + sellsVolume;
//     const LPadded = (totalVolume * 0.22) / 100;

//     const urll=`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`

//       const response = await fetch(urll, {
//         method: "GET",
//         // headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data1 = await response.json();
//       const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
//      console.log("lastReportDate",lastReportDate);

//       const yesterdayBalance= await rwaPoolsReport.findOne({ startTime:lastReportDate , pairAddress:pairAddress })
//       let poolStartBalance=0
//       if(yesterdayBalance){
//         poolStartBalance = yesterdayBalance.poolEndBalance;
//               console.log("yesterdayBalance",yesterdayBalance.poolEndBalance);

//       }else{
//                 poolStartBalance = data1.pairs[0].liquidity.usd;

//       }

//       const poolEndBalance = data1.pairs[0].liquidity.usd;

//       // console.log("data1",data1.pairs[0].liquidity.usd);
//       // console.log("data2",data1);

//     // Save report
//     const newReport = new rwaPoolsReport({
//       pairAddress,
//       tokenAddress,
//       rwaAddress,
//       rwaName,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       totalVolume,
//       LPadded,
//        poolStartBalance,
//        poolEndBalance ,
//        cost :poolStartBalance-poolEndBalance,
//       startTime,
//       endTime,
//     });

//     await newReport.save();
//     console.log(`✅ Saved ${rwaName} data for ${startTime}`);

//     // res.status(200).json({
//     //   message: `Data saved for ${rwaName}`,
//     //    pairAddress,
//     //   tokenAddress,
//     //   rwaAddress,
//     //   rwaName,
//     //   chainId,
//     //   totalTransactions:dayData.length,
//     //   buys,
//     //   sells,
//     //   totalVolume,
//     //   LPadded,
//     //   dayData
//     // });
//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };

// exports.getPoolTransactions = async (pairAddress, tokenAddress, rwaAddress, rwaName, chainId,lpPercentage, req, res) => {
//   try {

//     console.log("pairAddress :", pairAddress,
//       "tokenAddress", tokenAddress,
//       "rwaAddress", rwaAddress,
//       "rwaName", rwaName,
//       "chainId", chainId,
//     "lpPercentage",lpPercentage);

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day");  // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment.unix(from_time).utc().format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment.unix(to_time).utc().format("YYYY-MM-DD HH:mm:ss [UTC]")
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter(
//       (tx) => tx.routers?.token2 === rwaAddress
//     );
//     const sellTxs = dayData.filter(
//       (tx) => tx.routers?.token1 === rwaAddress
//     );

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward=await Settings.findOne({status:true})

//     console.log("lpReward",lpReward);

//     const buysVolume = buyTxs.reduce((sum, tx) => sum + Number(tx.value ?? 0), 0);
//     const sellsVolume = sellTxs.reduce((sum, tx) => sum + Number(tx.value ?? 0), 0);
//     const totalVolume = buysVolume + sellsVolume;
//     const LPadded = (totalVolume * lpPercentage*lpReward.lpRewardPool);

//     const urll=`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`

//       const response = await fetch(urll, {
//         method: "GET",
//         // headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data1 = await response.json();
//       const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
//      console.log("lastReportDate",lastReportDate);

//       const yesterdayBalance= await rwaPoolsReport.findOne({ startTime:lastReportDate , pairAddress:pairAddress })
//       let poolStartBalance=0
//       if(yesterdayBalance){
//         poolStartBalance = yesterdayBalance.poolEndBalance;
//               console.log("yesterdayBalance",yesterdayBalance.poolEndBalance);

//       }else{
//                 poolStartBalance = data1.pairs[0].liquidity.usd;

//       }

//       const poolEndBalance = data1.pairs[0].liquidity.usd;

//       // console.log("data1",data1.pairs[0].liquidity.usd);
//       // console.log("data2",data1);

//     // Save report
//     const newReport = new rwaPoolsReport({
//       pairAddress,
//       tokenAddress,
//       rwaAddress,
//       rwaName,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       totalVolume,
//       LPadded,
//        poolStartBalance,
//        poolEndBalance ,
//        cost :poolStartBalance-poolEndBalance,
//       startTime,
//       endTime,
//     });

//     await newReport.save();
//     console.log(`✅ Saved ${rwaName} data for ${startTime}`);

//     // res.status(200).json({
//     //   message: `Data saved for ${rwaName}`,
//     //    pairAddress,
//     //   tokenAddress,
//     //   rwaAddress,
//     //   rwaName,
//     //   chainId,
//     //   totalTransactions:dayData.length,
//     //   buys,
//     //   sells,
//     //   totalVolume,
//     //   LPadded,
//     //   dayData
//     // });
//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };

exports.getPoolTransactions = async (
  pairAddress,
  tokenAddress,
  address,
  name,
  poolType,
  chainId,
  lpPercentage,
  req,
  res
) => {
  try {
    console.log(
      "pairAddress :",
      pairAddress,
      "tokenAddress",
      tokenAddress,
      "address",
      address,
      "name",
      name,
      "poolType",
      poolType,
      "chainId",
      chainId,
      "lpPercentage",
      lpPercentage
    );
    //  const companyWallet = await CompanyPoolRevenue.find({
    //     pairAddress:pairAddress,
    //     //  startTime
    //      });
    //   console.log("companyWallet", companyWallet);

    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      // return res.status(200).json({ message: "No transactions for this date" });
    }

    // Filter Buys and Sells
    const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
    const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

    const buys = buyTxs.length;
    const sells = sellTxs.length;

    const lpReward = await Settings.findOne({ status: true });

    console.log("lpReward", lpReward);

    // const totalVolume = dayData.reduce(
    //   (sum, tx) => sum + Number(tx.value ?? 0),
    //   0
    // );
    // console.log("totalVolume", totalVolume);
    const buysVolume = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    const sellsVolume = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.value ?? 0),
      0
    );
    buysVolume = buysVolume * (1 - lpPercentage);
    sellsVolume = sellsVolume * (1 - lpPercentage);
    const totalVolume = buysVolume + sellsVolume;

    // const totalVolume = buysVolume + sellsVolume;
    console.log("buysVolume + sellsVolume", buysVolume + sellsVolume);

    const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();
    //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
    //  console.log("lastReportDate",lastReportDate);

    const poolLiquidity = data1.pairs[0].liquidity.usd;

    // console.log("data1",data1.pairs[0].liquidity.usd);
    // console.log("data2",data1);
    console.log("startTime for company Wallet", startTime);

    const companyWallet = await CompanyPoolRevenue.find({
      pairAddress,
      startTime,
    });
    // console.log("companyWallettttttttt", companyWallet);

    let totalPendingRewards = 0;
    let totalValue = 0;
    let usersRevenue = 0;
    let companysRevenue = 0;
    let companysLiquidity = 0;
    let usersLiquidity = 0;
    let poolRevenue =
      totalVolume * lpPercentage * (lpReward.lpRewardPool);

    if (companyWallet) {
      companyWallet.forEach((doc) => {
        totalPendingRewards += doc.pending_rewards;
        totalValue += doc.value;

        usersRevenue = poolRevenue - totalPendingRewards;
        companysRevenue = totalPendingRewards;
        usersLiquidity = poolLiquidity - totalValue;
        companysLiquidity = totalValue;
      });
    }

    // Save report
    // const newReport = new rwaPoolsReport({
    //   pairAddress,
    //   tokenAddress,
    //   poolType,
    //   address,
    //   name,
    //   chainId,
    //   // totalTransactions: dayData.length,
    //   // buys,
    //   // sells,
    //   totalVolume,
    //   // LPadded,
    //   poolLiquidity,
    //   companysLiquidity,
    //   usersLiquidity,
    //   poolRevenue,
    //   usersRevenue,
    //   companysRevenue,
    //   startTime,
    //   endTime,
    // });

    // await newReport.save();

    // Build base report data
    let reportData = {
      pairAddress,
      tokenAddress,
      poolType,
      address,
      name,
      chainId,
      totalTransactions: dayData.length,
      buys,
      sells,
      buysVolume,
      sellsVolume,
      totalVolume,
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      poolRevenue,
      usersRevenue,
      companysRevenue,
      startTime,
      endTime,
    };

    // Add CPMM-only fields
    // if (poolType?.toLowerCase() === "cpmm") {
    //   reportData.totalTransactions = dayData.length;
    //   reportData.buys = buys;
    //   reportData.sells = sells;
    // }

    // Save report
    const newReport = new rwaPoolsReport(reportData);
    await newReport.save();

    console.log(`✅ Saved ${name} data for ${startTime}`);

    // res.status(200).json({
    //   message: `Data saved for ${rwaName}`,
    //    pairAddress,
    //   tokenAddress,
    //   rwaAddress,
    //   rwaName,
    //   chainId,
    //   totalTransactions:dayData.length,
    //   buys,
    //   sells,
    //   totalVolume,
    //   LPadded,
    //   dayData
    // });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};


//commented on 20-12-25
// exports.getPoolTransactionsDefi = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage
//     );




//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };


//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;




//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);


//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1/(10**tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1/(10**tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     const totalVolume = buysVolume + sellsVolume;

//     // const totalVolume = buysVolume + sellsVolume;
//     // console.log("buysVolume + sellsVolume", buysVolume + sellsVolume);

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();
//     //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
//     //  console.log("lastReportDate",lastReportDate);

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     // console.log("data1",data1.pairs[0].liquidity.usd);
//     // console.log("data2",data1);
//     console.log("startTime for company Wallet", startTime);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime,
//     });
//     // console.log("companyWallettttttttt", companyWallet);

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let poolRevenue = totalVolume *  lpPercentage * (lpReward.lpRewardPool);

//     if (companyWallet) {
//       companyWallet.forEach((doc) => {
//         totalPendingRewards += doc.pending_rewards;
//         totalValue += doc.value;
//         usersRevenue = poolRevenue - totalPendingRewards;
//         companysRevenue = totalPendingRewards;
//         usersLiquidity = poolLiquidity - totalValue;
//         companysLiquidity = totalValue;
//       });
//     }

//     // Save report
//     // const newReport = new rwaPoolsReport({
//     //   pairAddress,
//     //   tokenAddress,
//     //   poolType,
//     //   address,
//     //   name,
//     //   chainId,
//     //   // totalTransactions: dayData.length,
//     //   // buys,
//     //   // sells,
//     //   totalVolume,
//     //   // LPadded,
//     //   poolLiquidity,
//     //   companysLiquidity,
//     //   usersLiquidity,
//     //   poolRevenue,
//     //   usersRevenue,
//     //   companysRevenue,
//     //   startTime,
//     //   endTime,
//     // });

//     // await newReport.save();

//     // Build base report data
//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       startTime,
//       endTime,
//     };

//     // Add CPMM-only fields
//     // if (poolType?.toLowerCase() === "cpmm") {
//     //   reportData.totalTransactions = dayData.length;
//     //   reportData.buys = buys;
//     //   reportData.sells = sells;
//     // }

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//     // res.status(200).json({
//     //   message: `Data saved for ${rwaName}`,
//     //    pairAddress,
//     //   tokenAddress,
//     //   rwaAddress,
//     //   rwaName,
//     //   chainId,
//     //   totalTransactions:dayData.length,
//     //   buys,
//     //   sells,
//     //   totalVolume,
//     //   LPadded,
//     //   dayData
//     // });
//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };


//added on 20-12-25  //commented on 03012025
// exports.getPoolTransactionsDefi = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res
// ) => {
//   try {
//     // CLMM pool logic
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage
//     );


//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };

//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     const totalVolume = buysVolume + sellsVolume;

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//  });
//     const data1 = await response.json();
//     //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
//     //  console.log("lastReportDate",lastReportDate);

//     if (!data1 || !data1.pairs || !data1.pairs[0] || !data1.pairs[0].liquidity) {
//       console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
//       throw new Error("Failed to fetch pool liquidity data from DexScreener");
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     // console.log("data1",data1.pairs[0].liquidity.usd);
//     // console.log("data2",data1);
//     console.log("startTime for company Wallet", startTime);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime,
//     });
//     // console.log("companyWallettttttttt", companyWallet);

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime,
//     });

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // CLMM companyWallet logic
//     if (companyWallet) {
//       companyWallet.forEach((doc) => {
//         totalPendingRewards += doc.pending_rewards;
//         totalValue += doc.value;
//         usersRevenue = poolRevenue - totalPendingRewards;
//         companysRevenue = totalPendingRewards;
//         usersLiquidity = poolLiquidity - totalValue;
//         companysLiquidity = totalValue;
//       });
//     }

//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Save report
//     // const newReport = new rwaPoolsReport({
//     //   pairAddress,
//     //   tokenAddress,
//     //   poolType,
//     //   address,
//     //   name,
//     //   chainId,
//     //   // totalTransactions: dayData.length,
//     //   // buys,
//     //   // sells,
//     //   totalVolume,
//     //   // LPadded,
//     //   poolLiquidity,
//     //   companysLiquidity,
//     //   usersLiquidity,
//     //   poolRevenue,
//     //   usersRevenue,
//     //   companysRevenue,
//     //   startTime,
//     //   endTime,
//     // });

//     // await newReport.save();

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime,
//       endTime,
//     };

//     // Add CPMM-only fields
//     // if (poolType?.toLowerCase() === "cpmm") {
//     //   reportData.totalTransactions = dayData.length;
//     //   reportData.buys = buys;
//     //   reportData.sells = sells;
//     // }

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//     // res.status(200).json({
//     //   message: `Data saved for ${rwaName}`,
//     //    pairAddress,
//     //   tokenAddress,
//     //   rwaAddress,
//     //   rwaName,
//     //   chainId,
//     //   totalTransactions:dayData.length,
//     //   buys,
//     //   sells,
//     //   totalVolume,
//     //   LPadded,
//     //   dayData
//     // });
//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };


//added on 030126
exports.getPoolTransactionsDefi = async (
  pairAddress,
  tokenAddress,
  address,
  name,
  poolType,
  chainId,
  lpPercentage,
  req,
  res
) => {
  try {
    // CLMM pool logic
    console.log(
      "pairAddress :",
      pairAddress,
      "tokenAddress",
      tokenAddress,
      "address",
      address,
      "name",
      name,
      "poolType",
      poolType,
      "chainId",
      chainId,
      "lpPercentage",
      lpPercentage
    );


    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Convert to Unix timestamps
    const from_time = yesterday2.unix();
    const to_time = yesterdayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const requestOptions = {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
      },
    };

    const responseaddressPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseaddressPrice.ok) {
      const errorMsg = `Failed to fetch price for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const addressPriceData = await responseaddressPrice.json();
    if (!addressPriceData?.data || !Array.isArray(addressPriceData.data) || addressPriceData.data.length === 0 || !addressPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, addressPriceData);
      throw new Error(errorMsg);
    }
    const addressAverage = addressPriceData.data[0].price;
    console.log(startTime, "startTime");

    console.log("addressAverage", addressAverage);


    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      const errorMsg = `Failed to fetch price for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const tokenPriceData = await responsePrice.json();
    if (!tokenPriceData?.data || !Array.isArray(tokenPriceData.data) || tokenPriceData.data.length === 0 || !tokenPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, tokenPriceData);
      throw new Error(errorMsg);
    }
    const tokenAverage = tokenPriceData.data[0].price;

    console.log("addressAverage", addressAverage);
    console.log("tokenAverage", tokenAverage);
    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages (Fetch pool swap activities)
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      // return res.status(200).json({ message: "No transactions for this date" });
    }

    const swapsTxs = dayData.filter(tx => tx.activity_type === "ACTIVITY_TOKEN_SWAP");

    console.log("swapsTxs", swapsTxs.length);

    // Filter Buys and Sells
    const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress);
    console.log("buyTxs", buyTxs.length);
    const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress);
    console.log("sellTxs", sellTxs.length);


    const lpReward = await Settings.findOne({ status: true });

    console.log("lpReward", lpReward);

    const buysVolumeInMintA = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintA", buysVolumeInMintA);
    const sellsVolumeMintB = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintB", sellsVolumeMintB);
    const buysVolumee = buysVolumeInMintA * addressAverage;
    const sellsVolumee = sellsVolumeMintB * tokenAverage;
    const totalVolumeSwap = buysVolumee + sellsVolumee;

    const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx) => tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
    console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



    const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
      (tx.routers?.child_routers || []).filter((cr) =>
        (cr.token1 === address || cr.token1 === tokenAddress) && (cr.token2 === address || cr.token2 === tokenAddress)

      )
    );
    console.log("clmmChildRouters", clmmChildRouters.length);

    // Filter Buys and Sells
    const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress);
    const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress);

    console.log("buyTxsAGG", buyTxsAGG.length);
    console.log("sellTxsAGG", sellTxsAGG.length);

    const buysVolumeInMintAAGG = buyTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
    const sellsVolumeMintBAGG = sellTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
    const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
    console.log("buysVolumeAGG", buysVolumeAGG);
    const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
    console.log("sellsVolumeAGG", sellsVolumeAGG);
    const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

    const totalVolume = totalVolumeSwap + totalVolumeAGG;
    console.log("totalVolume", totalVolume);

    const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

    // Fetch pool liquidity from DexScreener API
    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();
    //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
    //  console.log("lastReportDate",lastReportDate);

    if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
      const errorMsg = `Invalid liquidity data from DexScreener for pairAddress ${pairAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, data1);
      throw new Error(errorMsg);
    }

    const poolLiquidity = data1.pairs[0].liquidity.usd;

    // console.log("data1",data1.pairs[0].liquidity.usd);
    // console.log("data2",data1);
    console.log("startTime for company Wallet", startTime);
    // Convert startTime string to number for database query (model expects Number type)
    const startTimeNumber = parseInt(startTime, 10);
    console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

    const companyWallet = await CompanyPoolRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
    if (companyWallet && companyWallet.length > 0) {
      console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
    }

    const compoundWallet = await CompoundRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
    if (compoundWallet && compoundWallet.length > 0) {
      console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
    }

    let totalPendingRewards = 0;
    let totalValue = 0;
    let usersRevenue = 0;
    let companysRevenue = 0;
    let companysLiquidity = 0;
    let usersLiquidity = 0;
    let compoundRevenue = 0;
    let compoundLiquidity = 0;
    let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

    // CLMM companyWallet logic
    if (companyWallet && Array.isArray(companyWallet) && companyWallet.length > 0) {
      console.log(`Found ${companyWallet.length} companyWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      companyWallet.forEach((doc) => {
        totalPendingRewards += doc.pending_rewards || 0;
        totalValue += doc.value || 0;
      });
      // Calculate derived values after summing all documents
      companysRevenue = totalPendingRewards;
      usersRevenue = poolRevenue - totalPendingRewards;
      companysLiquidity = totalValue;
      usersLiquidity = poolLiquidity - totalValue;
      console.log(`Company Wallet - totalPendingRewards: ${totalPendingRewards}, totalValue: ${totalValue}, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
    } else {
      console.log(`No companyWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      // If no company wallet, all revenue and liquidity goes to users
      usersRevenue = poolRevenue;
      usersLiquidity = poolLiquidity;
    }

    if (compoundWallet && Array.isArray(compoundWallet) && compoundWallet.length > 0) {
      console.log(`Found ${compoundWallet.length} compoundWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      let compoundTotalPendingRewards = 0;
      let compoundTotalValue = 0;
      compoundWallet.forEach((doc) => {
        compoundTotalPendingRewards += doc.pending_rewards || 0;
        compoundTotalValue += doc.value || 0;
      });
      compoundRevenue = compoundTotalPendingRewards;
      compoundLiquidity = compoundTotalValue;
      console.log(`Compound Wallet - compoundRevenue: ${compoundRevenue}, compoundLiquidity: ${compoundLiquidity}`);
    } else {
      console.log(`No compoundWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
    }


    let reportData = {
      pairAddress,
      tokenAddress,
      poolType,
      address,
      name,
      chainId,
      totalTransactions: dayData.length,
      buys: buyTxs.length + buyTxsAGG.length,
      sells: sellTxs.length + sellTxsAGG.length,
      buysVolume: buysVolumeAGG + buysVolumee,
      sellsVolume: sellsVolumeAGG + sellsVolumee,
      totalVolume,
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      poolFee: totalVolume * lpPercentage,
      poolRevenue,
      usersRevenue,
      companysRevenue,
      compoundRevenue,
      compoundLiquidity,
      startTime: startTimeNumber,
      endTime: parseInt(endTime, 10),
      addressAverage,
      tokenAverage,
    };


    // Save report
    const newReport = new rwaPoolsReport(reportData);
    await newReport.save();

    console.log(`✅ Saved ${name} data for ${startTime}`);

    // res.status(200).json({
    //   message: `Data saved for ${rwaName}`,
    //    pairAddress,
    //   tokenAddress,
    //   rwaAddress,
    //   rwaName,
    //   chainId,
    //   totalTransactions:dayData.length,
    //   buys,
    //   sells,
    //   totalVolume,
    //   LPadded,
    //   dayData
    // });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};


//added on 20-12-25
// exports.getPoolTransactionsDefiCpmm = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage
//     );

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };

//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     // console.log();


//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     const totalVolume = buysVolume + sellsVolume;

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     console.log("startTime for company Wallet", startTime);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime,
//     });

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime,
//     });

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
//     if (poolRevenue > 0) {
//       try {
//         // Get lpMint from Token collection (already saved in tokenSchema)
//         const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
//         const lpMintAddress = tokenDoc?.lpMint;

//         if (lpMintAddress) {
//           // Fetch token holders from Solscan API
//           const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
//           const holdersResponse = await fetch(holdersUrl, requestOptions);
//           const holdersData = await holdersResponse.json();

//           if (holdersData.success && holdersData.data?.items?.length > 0) {
//             // Get the first holder (rank 1) percentage
//             const percentage = holdersData.data.items[0].percentage;

//             // Calculate companysRevenue = poolRevenue * (percentage / 100)
//             companysRevenue = poolRevenue * (percentage / 100);
//             companysLiquidity = poolLiquidity * (percentage / 100);
//             // Calculate usersRevenue = poolRevenue - companysRevenue
//             usersRevenue = poolRevenue - companysRevenue;
//             usersLiquidity = poolLiquidity - companysLiquidity;

//             console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching token holders for CPMM pool:", error);
//       }
//     }

//     // Update liquidity values from companyWallet if exists
//     // if (companyWallet) {
//     //   companyWallet.forEach((doc) => {
//     //     totalValue += doc.value;
//     //     usersLiquidity = poolLiquidity - totalValue;
//     //     companysLiquidity = totalValue;

//     //   });
//     // }

//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime,
//       endTime,
//     };

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// }


//bharath api check 03022026
exports.getPoolTransactionsDefiCpmmBharathApi = async (
  // pairAddress,
  // tokenAddress,
  // address,
  // name,
  // poolType,
  // chainId,
  // lpPercentage,
  req,
  res
) => {
  try {
    // console.log(
    //   "pairAddress :",
    //   pairAddress,
    //   "tokenAddress",
    //   tokenAddress,
    //   "address",
    //   address,
    //   "name",
    //   name,
    //   "poolType",
    //   poolType,
    //   "chainId",
    //   chainId,
    //   "lpPercentage",
    //   lpPercentage
    // );

    console.log("entered into the function");

    const pairAddress = "AEZjoUACNSpmYHHRNbfknjL8oiBDw6GhtrMm7tZgBfca"
    const tokenAddress = "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT"
    const address = "So11111111111111111111111111111111111111112"
    const name = "NVDAx-IDLE"
    const poolType = "rwa"
    const chainId = "solana"
    const lpPercentage = 0.01



    const now = moment.utc(); // Current UTC time
    const today1 = moment
      .utc()
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
    const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
    const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
    const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const endTime = moment.utc().format("YYYYMMDD"); // Today's date

    // Convert to Unix timestamps
    // const from_time = yesterday2.unix();
    const from_time = 1769990400;
    // const to_time = yesterdayEnd.unix();
    const to_time = 1770076799;
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);
    const requestOptions = {
      method: "GET",
      headers: {
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
      },
    };

    const responseaddressPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseaddressPrice.ok) {
      const errorMsg = `Failed to fetch price for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const addressPriceData = await responseaddressPrice.json();
    if (!addressPriceData?.data || !Array.isArray(addressPriceData.data) || addressPriceData.data.length === 0 || !addressPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, addressPriceData);
      throw new Error(errorMsg);
    }
    const addressAverage = addressPriceData.data[0].price;
    console.log(startTime, "startTime");

    console.log("addressAverage", addressAverage);


    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      const errorMsg = `Failed to fetch price for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const tokenPriceData = await responsePrice.json();
    if (!tokenPriceData?.data || !Array.isArray(tokenPriceData.data) || tokenPriceData.data.length === 0 || !tokenPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, tokenPriceData);
      throw new Error(errorMsg);
    }
    const tokenAverage = tokenPriceData.data[0].price;

    console.log("addressAverage", addressAverage);
    console.log("tokenAverage", tokenAverage);
    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages (Fetch pool swap activities)
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      // return res.status(200).json({ message: "No transactions for this date" });
    }

    const swapsTxs = dayData.filter(tx => tx.activity_type === "ACTIVITY_TOKEN_SWAP");

    console.log("swapsTxs", swapsTxs.length);

    const buyTxs = swapsTxs.filter(
      tx => tx.routers?.token2 === tokenAddress &&
        tx.routers?.token1 === address
    );

    const sellTxs = swapsTxs.filter(
      tx => tx.routers?.token1 === tokenAddress &&
        tx.routers?.token2 === address
    );


    // Filter Buys and Sells
    // const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress && tx.routers?.token1 === address);
    console.log("buyTxs", buyTxs.length);
    // const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress && tx.routers?.token2 === address);
    console.log("sellTxs", sellTxs.length);


    const otherTxs = swapsTxs.filter(tx => {
      const isBuy =
        tx.routers?.token2 === tokenAddress &&
        tx.routers?.token1 === address;

      const isSell =
        tx.routers?.token1 === tokenAddress &&
        tx.routers?.token2 === address;

      return !isBuy && !isSell;
    });

    console.log("otherTxs", otherTxs.length);


    const clmmChildRoutersotherTxs = otherTxs.flatMap((tx) =>
      (tx.routers?.child_routers || []).filter((cr) =>
        (cr.token1 === address || cr.token1 === tokenAddress) && (cr.token2 === address || cr.token2 === tokenAddress)

      )
    );
    console.log("clmmChildRoutersotherTxs", clmmChildRoutersotherTxs.length);

    // Filter Buys and Sells
    const buyTxsotherTxs = clmmChildRoutersotherTxs.filter((tx) => tx.token2 === tokenAddress && tx.token1 === address);
    const sellTxsotherTxs = clmmChildRoutersotherTxs.filter((tx) => tx.token1 === tokenAddress && tx.token2 === address);

    console.log("buyTxsotherTxs", buyTxsotherTxs.length);
    console.log("sellTxsotherTxs", sellTxsotherTxs.length);

    const buysVolumeInMintAotherTxs = buyTxsotherTxs.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintAotherTxs", buysVolumeInMintAotherTxs);
    const sellsVolumeMintBotherTxs = sellTxsotherTxs.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintBotherTxs", sellsVolumeMintBotherTxs);
    const buysVolumeotherTxs = buysVolumeInMintAotherTxs * addressAverage;
    console.log("buysVolumeotherTxs", buysVolumeotherTxs);
    const sellsVolumeotherTxs = sellsVolumeMintBotherTxs * tokenAverage;
    console.log("sellsVolumeotherTxs", sellsVolumeotherTxs);
    const totalVolumeotherTxs = buysVolumeotherTxs + sellsVolumeotherTxs;
    console.log("totalVolumeotherTxs", totalVolumeotherTxs);

    //  // Filter Buys and Sells
    //  const buyTxssss = swapsTxs.filter((tx) => tx.routers?.token2 !== tokenAddress && tx.routers?.token1 !== address);
    //  console.log("buyTxssss", buyTxssss.length);
    //  const sellTxssss = swapsTxs.filter((tx) => tx.routers?.token1 !== tokenAddress && tx.routers?.token2 !== address);
    //  console.log("sellTxssss", sellTxssss.length);


    const lpReward = await Settings.findOne({ status: true });

    console.log("lpReward", lpReward);

    const buysVolumeInMintA = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintA", buysVolumeInMintA);
    const sellsVolumeMintB = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintB", sellsVolumeMintB);
    const buysVolumee = buysVolumeInMintA * addressAverage;
    const sellsVolumee = sellsVolumeMintB * tokenAverage;
    const totalVolumeSwap = buysVolumee + sellsVolumee;

    const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx) => tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
    console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



    const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
      (tx.routers?.child_routers || []).filter((cr) =>
        (cr.token1 === address || cr.token1 === tokenAddress) && (cr.token2 === address || cr.token2 === tokenAddress)

      )
    );
    console.log("clmmChildRouters", clmmChildRouters.length);

    // Filter Buys and Sells
    const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress && tx.token1 === address);
    const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress && tx.token2 === address);

    console.log("buyTxsAGG", buyTxsAGG.length);
    console.log("sellTxsAGG", sellTxsAGG.length);

    const buysVolumeInMintAAGG = buyTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
    const sellsVolumeMintBAGG = sellTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
    const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
    console.log("buysVolumeAGG", buysVolumeAGG);
    const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
    console.log("sellsVolumeAGG", sellsVolumeAGG);
    const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

    const totalVolume = totalVolumeSwap + totalVolumeAGG + totalVolumeotherTxs;
    console.log("totalVolume", totalVolume);

    const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

    // Fetch pool liquidity from DexScreener API
    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();
    //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
    //  console.log("lastReportDate",lastReportDate);

    if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
      const errorMsg = `Invalid liquidity data from DexScreener for pairAddress ${pairAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, data1);
      throw new Error(errorMsg);
    }

    const poolLiquidity = data1.pairs[0].liquidity.usd;

    // console.log("data1",data1.pairs[0].liquidity.usd);
    // console.log("data2",data1);
    console.log("startTime for company Wallet", startTime);
    // Convert startTime string to number for database query (model expects Number type)
    const startTimeNumber = parseInt(startTime, 10);
    console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

    const companyWallet = await CompanyPoolRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
    if (companyWallet && companyWallet.length > 0) {
      console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
    }

    const compoundWallet = await CompoundRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
    if (compoundWallet && compoundWallet.length > 0) {
      console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
    }

    let totalPendingRewards = 0;
    let totalValue = 0;
    let usersRevenue = 0;
    let companysRevenue = 0;
    let companysLiquidity = 0;
    let usersLiquidity = 0;
    let compoundRevenue = 0;
    let compoundLiquidity = 0;
    let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

    // CLMM companyWallet logic
    if (companyWallet && Array.isArray(companyWallet) && companyWallet.length > 0) {
      console.log(`Found ${companyWallet.length} companyWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      companyWallet.forEach((doc) => {
        totalPendingRewards += doc.pending_rewards || 0;
        totalValue += doc.value || 0;
      });
      // Calculate derived values after summing all documents
      companysRevenue = totalPendingRewards;
      usersRevenue = poolRevenue - totalPendingRewards;
      companysLiquidity = totalValue;
      usersLiquidity = poolLiquidity - totalValue;
      console.log(`Company Wallet - totalPendingRewards: ${totalPendingRewards}, totalValue: ${totalValue}, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
    } else {
      console.log(`No companyWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      // If no company wallet, all revenue and liquidity goes to users
      usersRevenue = poolRevenue;
      usersLiquidity = poolLiquidity;
    }

    if (compoundWallet && Array.isArray(compoundWallet) && compoundWallet.length > 0) {
      console.log(`Found ${compoundWallet.length} compoundWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      let compoundTotalPendingRewards = 0;
      let compoundTotalValue = 0;
      compoundWallet.forEach((doc) => {
        compoundTotalPendingRewards += doc.pending_rewards || 0;
        compoundTotalValue += doc.value || 0;
      });
      compoundRevenue = compoundTotalPendingRewards;
      compoundLiquidity = compoundTotalValue;
      console.log(`Compound Wallet - compoundRevenue: ${compoundRevenue}, compoundLiquidity: ${compoundLiquidity}`);
    } else {
      console.log(`No compoundWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
    }


    let reportData = {
      pairAddress,
      tokenAddress,
      poolType,
      address,
      name,
      chainId,
      totalTransactions: dayData.length,
      swapsTxs: swapsTxs.length,
      buyTxs: buyTxs.length,
      sellTxs: sellTxs.length,
      otherTxs: otherTxs.length,
      buyTxsotherTxs: buyTxsotherTxs.length,
      sellTxsotherTxs: sellTxsotherTxs.length,
      buysVolumeInMintAotherTxs,
      sellsVolumeMintBotherTxs,
      buysVolumeotherTxs,
      sellsVolumeotherTxs,
      totalVolumeotherTxs,
      buys: buyTxs.length + buyTxsAGG.length,
      sells: sellTxs.length + sellTxsAGG.length,
      buysVolume: buysVolumeAGG + buysVolumee,
      sellsVolume: sellsVolumeAGG + sellsVolumee,
      totalVolume,
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      poolFee: totalVolume * lpPercentage,
      poolRevenue,
      usersRevenue,
      companysRevenue,
      compoundRevenue,
      compoundLiquidity,
      startTime: startTimeNumber,
      endTime: parseInt(endTime, 10),
      addressAverage,
      tokenAverage,
    };


    // Save report
    const newReport = new rwaPoolsReport(reportData);
    await newReport.save();

    console.log(`✅ Saved ${name} data for ${startTime}`);

    res.status(200).json({
      message: "Data saved successfully",
      otherTxs: otherTxs,
      length3: otherTxs.length,
      // length1:buyTxssss.length,
      // length2:sellTxssss.length,
      // buyTxssss :buyTxssss,
      // sellTxssss :sellTxssss,
    });
    //   message: `Data saved for ${rwaName}`,
    //    pairAddress,
    //   tokenAddress,
    //   rwaAddress,
    //   rwaName,
    //   chainId,
    //   totalTransactions:dayData.length,
    //   buys,
    //   sells,
    //   totalVolume,
    //   LPadded,
    //   dayData
    // });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};



// // added on 30-01-2026  (commented on 02-02-2026 to check)
// exports.getPoolTransactionsDefiCpmm = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage
//     );

//     const now = moment.utc(); // Current UTC time
//     const today1 = moment
//       .utc()
//       .set({ hour: 0, minute: 0, second: 0, millisecond: 0 }); // Today at 12:00 AM UTC
//     const yesterday1 = today1.clone().subtract(0, "days"); // Yesterday at 12:00 AM UTC
//     const yesterday2 = today1.clone().subtract(1, "days"); // Yesterday at 12:00 AM UTC
//     const yesterdayEnd = yesterday2.clone().endOf("day"); // Yesterday 23:59:59 UTC
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const endTime = moment.utc().format("YYYYMMDD"); // Today's date

//     // Convert to Unix timestamps
//     const from_time = yesterday2.unix();
//     const to_time = yesterdayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };


//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     // console.log();


//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//    const swapsTxs = dayData.filter(tx =>tx.activity_type === "ACTIVITY_TOKEN_SWAP");

//     console.log("swapsTxs", swapsTxs.length);

//      // Filter Buys and Sells
//     const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress);
//     console.log("buyTxs", buyTxs.length);
//     const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress);
//     console.log("sellTxs", sellTxs.length);


//     const buyss = buyTxs.length;
//     const sellss = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     console.log("buysVolumeInMintA", buysVolumeInMintA);
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     console.log("sellsVolumeMintB", sellsVolumeMintB);
//     const buysVolumee = buysVolumeInMintA * addressAverage;
//     const sellsVolumee = sellsVolumeMintB * tokenAverage;
//     const totalVolumeSwap = buysVolumee + sellsVolumee;

//     const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx)=>tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
//     console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



//     const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
//       (tx.routers?.child_routers || []).filter((cr) =>
//        ( cr.token1 === address || cr.token1 === tokenAddress) && ( cr.token2 === address || cr.token2 === tokenAddress)

//       )
//     );
//     console.log("clmmChildRouters", clmmChildRouters.length);

//      // Filter Buys and Sells
//      const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress);
//      const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress);

//  console.log("buyTxsAGG", buyTxsAGG.length);
//  console.log("sellTxsAGG", sellTxsAGG.length);

//  const buysVolumeInMintAAGG = buyTxsAGG.reduce(
//   (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
//   0
// );
// console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
// const sellsVolumeMintBAGG = sellTxsAGG.reduce(
//   (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
//   0
// );
// console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
// const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
// console.log("buysVolumeAGG", buysVolumeAGG);
// const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
// console.log("sellsVolumeAGG", sellsVolumeAGG);
// const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

// const totalVolume = totalVolumeSwap + totalVolumeAGG;
// console.log("totalVolume", totalVolume);

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();

//     if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
//       console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
//       console.log("⚠️ Skipping pool due to missing liquidity data from DexScreener");
//       return; // Skip this pool if liquidity data is not available
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     console.log("startTime for company Wallet", startTime);
//     // Convert startTime string to number for database query (model expects Number type)
//     const startTimeNumber = parseInt(startTime, 10);
//     console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
//     if (companyWallet && companyWallet.length > 0) {
//       console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
//     }

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
//     if (compoundWallet && compoundWallet.length > 0) {
//       console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
//     }

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
//     if (poolRevenue > 0) {
//       try {
//         // Get lpMint from Token collection (already saved in tokenSchema)
//         const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
//         const lpMintAddress = tokenDoc?.lpMint;

//         if (lpMintAddress) {
//           // Fetch token holders from Solscan API
//           const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
//           const holdersResponse = await fetch(holdersUrl, requestOptions);
//           const holdersData = await holdersResponse.json();

//           if (holdersData.success && holdersData.data?.items?.length > 0) {
//             // Get the first holder (rank 1) percentage
//             const percentage = holdersData.data.items[0].percentage;

//             // Calculate companysRevenue = poolRevenue * (percentage / 100)
//             companysRevenue = poolRevenue * (percentage / 100);
//             companysLiquidity = poolLiquidity * (percentage / 100);
//             // Calculate usersRevenue = poolRevenue - companysRevenue
//             usersRevenue = poolRevenue - companysRevenue;
//             usersLiquidity = poolLiquidity - companysLiquidity;

//             console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching token holders for CPMM pool:", error);
//       }
//     }



//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions:dayData.length,
//       buys:buyTxs.length+buyTxsAGG.length,
//       sells:sellTxs.length+sellTxsAGG.length,
//       buysVolume:buysVolumeAGG + buysVolumee,
//       sellsVolume:sellsVolumeAGG+sellsVolumee,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolFee:totalVolume * lpPercentage,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime: startTimeNumber,
//       endTime: parseInt(endTime, 10),
//     };

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };






// exports.getRwaReports = async (req, res) => {
//   try {
//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // console.log("Platforms Data:", platforms);  // Log platforms to check

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue;  // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           //  tokenAddress, solAddress, usd_min ,name,token_logo_url,
//           chainId, symbol
//         } = token;

//         const LiquidityPools = await RWASchema.find({ tokenAddress: token.tokenAddress });
//         if (!LiquidityPools || LiquidityPools.length === 0) {
//           console.log(`No LiquidityPools found for token ${symbol}. Skipping.`);
//           continue;  // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < LiquidityPools.length; j++) {
//           const LiquidityPool = LiquidityPools[j];
//           if (!LiquidityPool) continue;

//           console.log(`\n=== Processing LiquidityPool ${j + 1}/${LiquidityPools.length} for token ${symbol} ===`);
//           const { pairAddress, tokenAddress, rwaAddress, rwaName ,lpPercentage } = LiquidityPool;

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getPoolTransactions(
//             pairAddress, tokenAddress, rwaAddress, rwaName, chainId,lpPercentage);

//           console.log(`✅ Completed LiquidityPool ${pairAddress} for token ${symbol}\n`);
//         }

//         console.log(`🔥 Completed all LiquidityPools for token ${symbol}`);
//       }

//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getRwaReports:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };



//commented on 20-12-25
// exports.getRwaReports = async (req, res) => {
//   try {
//     // const pairAddress="5kbYmsSDhSaUfuGSKUbQ1p75fEY6iihDEJLaFea91fn3";
//     // const startTime=20251116;
//     //     const companyWallet = await CompanyPoolRevenue.find({
//     //        pairAddress,
//     //         startTime
//     //        });
//     //   console.log("companyWallettttttttt", companyWallet);

//     //fetch platforms
//     const platforms = await PlatformSchema.find({});
//     // Verify tokenData and ensure it's valid
//     if (!platforms || platforms.length === 0) {
//       console.log("No platforms found in the database.");
//       // return res.status(404).json({ error: "No platforms found." });
//     }

//     // console.log("Platforms Data:", platforms);  // Log platforms to check

//     // Loop through each platform and call getAllActivities for each
//     for (let i = 0; i < platforms.length; i++) {
//       const platform = platforms[i];

//       // Ensure platform is defined before passing it to getAllActivities
//       if (!platform) {
//         console.error(`Platform at index ${i} is undefined`);
//         continue; // Skip this iteration if platform is undefined
//       }
//       const tokens = await TokenSchema.find({ platformId: platform._id });

//       for (let i = 0; i < tokens.length; i++) {
//         const token = tokens[i];
//         if (!token) continue;

//         const {
//           //  tokenAddress, solAddress, usd_min ,name,token_logo_url,
//           chainId,
//           symbol,
//         } = token;

//         const LiquidityPools = await RWASchema.find({
//           tokenAddress: token.tokenAddress,
//         });
//         if (!LiquidityPools || LiquidityPools.length === 0) {
//           console.log(`No LiquidityPools found for token ${symbol}. Skipping.`);
//           continue; // Skip this iteration if no wallets are found
//         }
//         for (let j = 0; j < LiquidityPools.length; j++) {
//           const LiquidityPool = LiquidityPools[j];
//           if (!LiquidityPool) continue;

//           console.log(
//             `\n=== Processing LiquidityPool ${j + 1}/${
//               LiquidityPools.length
//             } for token ${symbol} ===`
//           );
//           const {
//             pairAddress,
//             tokenAddress,
//             address,
//             name,
//             lpPercentage,
//             poolType,
//           } = LiquidityPool;

//           // 👇 await everything sequentially — prevents overlap
//           await exports.getPoolTransactionsDefi(
//             pairAddress,
//             tokenAddress,
//             address,
//             name,
//             poolType,
//             chainId,
//             lpPercentage
//           );
//           console.log(
//             `✅ Completed LiquidityPool ${pairAddress} for token ${symbol}\n`
//           );
//         }

//         console.log(`🔥 Completed all LiquidityPools for token ${symbol}`);
//       }
//     }

//     // return res.status(200).json(tokenData); // Send response after all activities have been processed
//   } catch (error) {
//     console.error("Error in getRwaReports:", error);
//     // res.status(500).json({ error: "An error occurred." });
//   }
// };



exports.getRwaReports = async (req, res) => {
  try {
    // const pairAddress="5kbYmsSDhSaUfuGSKUbQ1p75fEY6iihDEJLaFea91fn3";
    // const startTime=20251116;
    //     const companyWallet = await CompanyPoolRevenue.find({
    //        pairAddress,
    //         startTime
    //        });
    //   console.log("companyWallettttttttt", companyWallet);

    //fetch platforms
    const platforms = await PlatformSchema.find({});
    // Verify tokenData and ensure it's valid
    if (!platforms || platforms.length === 0) {
      console.log("No platforms found in the database.");
      // return res.status(404).json({ error: "No platforms found." });
    }

    // console.log("Platforms Data:", platforms);  // Log platforms to check

    // Loop through each platform and call getAllActivities for each
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];

      // Ensure platform is defined before passing it to getAllActivities
      if (!platform) {
        console.error(`Platform at index ${i} is undefined`);
        continue; // Skip this iteration if platform is undefined
      }
      const tokens = await TokenSchema.find({ platformId: platform._id });

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token) continue;

        const {
          //  tokenAddress, solAddress, usd_min ,name,token_logo_url,
          chainId,
          symbol,
        } = token;

        const LiquidityPools = await RWASchema.find({
          tokenAddress: token.tokenAddress,
        });
        if (!LiquidityPools || LiquidityPools.length === 0) {
          console.log(`No LiquidityPools found for token ${symbol}. Skipping.`);
          continue; // Skip this iteration if no wallets are found
        }
        for (let j = 0; j < LiquidityPools.length; j++) {
          const LiquidityPool = LiquidityPools[j];
          if (!LiquidityPool) continue;
          console.log(
            `\n=== Processing LiquidityPool ${j + 1}/${LiquidityPools.length
            } for token ${symbol} ===`
          );
          const {
            pairAddress,
            tokenAddress,
            address,
            name,
            lpPercentage,
            poolType,
          } = LiquidityPool;
          if (poolType && poolType.toLowerCase() === "cpmm") {
            // Route to CPMM function
            await exports.getPoolTransactionsDefiCpmm(
              pairAddress,
              tokenAddress,
              address,
              name,
              poolType,
              chainId,
              lpPercentage
            );
          } else {
            // 👇 await everything sequentially — prevents overlap
            await exports.getPoolTransactionsDefi(
              pairAddress,
              tokenAddress,
              address,
              name,
              poolType,
              chainId,
              lpPercentage

            );
          }

          console.log(
            `✅ Completed LiquidityPool ${pairAddress} for token ${symbol}\n`
          );

        }

        console.log(`🔥 Completed all LiquidityPools for token ${symbol}`);
      }
    }

    // return res.status(200).json(tokenData); // Send response after all activities have been processed
  } catch (error) {
    console.error("Error in getRwaReports:", error);
    // res.status(500).json({ error: "An error occurred." });
  }
};



// exports.getDailyRWAPoolsReports = async (req, res) => {
//   try {
//     const {
//       _id,
//       pairAddress,
//       rwaAddress,
//       tokenAddress,
//       startTime,
//       endTime,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Parse pagination
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     // Build filters
//     const filter = {};
//     if (_id && mongoose.Types.ObjectId.isValid(_id)) filter._id = _id;
//     if (pairAddress) filter.pairAddress = pairAddress.trim();
//     if (rwaAddress) filter.rwaAddress = rwaAddress.trim();
//     if (tokenAddress) filter.tokenAddress = tokenAddress.trim();
//     if (startTime) filter.startTime = startTime;
//     if (endTime) filter.endTime = endTime;

//     // Count total reports
//     const totalCount = await rwaPoolsReport.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

//     // Fetch paginated results
//     const reports = await rwaPoolsReport
//       .find(filter)
//       .sort({ startTime: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     // Handle empty response
//     if (!reports.length) {
//       return res.status(404).json({
//         message: "No RWA pool reports found.",
//         count: 0,
//         totalPages,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Success response
//     return res.status(200).json({
//       message: "RWA pool reports fetched successfully!",
//       count: totalCount,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: reports,
//     });
//   } catch (err) {
//     console.error("Error fetching RWA pool reports:", err);
//     return res.status(500).json({
//       message: "An error occurred while fetching RWA pool reports.",
//       error: err.message,
//     });
//   }
// };


//Backup on Live 31-01-2026 //

// exports.getDailyRWAPoolsReports = async (req, res) => {
//   try {
//     const {
//       _id,
//       pairAddress,
//       rwaAddress,
//       tokenAddress,
//       poolType,
//       startTime,
//       endTime,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Parse pagination
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     // Build filters
//     const filter = {};
//     if (_id && mongoose.Types.ObjectId.isValid(_id)) filter._id = _id;
//     if (pairAddress) filter.pairAddress = pairAddress.trim();
//     if (rwaAddress) filter.rwaAddress = rwaAddress.trim();
//     if (tokenAddress) filter.tokenAddress = tokenAddress.trim();
//     if (poolType) filter.poolType = poolType.toLowerCase().trim();
//     if (startTime) filter.startTime = startTime;
//     if (endTime) filter.endTime = endTime;

//     // Count total reports
//     const totalCount = await rwaPoolsReport.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

//     // Fetch paginated results
//     const reports = await rwaPoolsReport
//       .find(filter)
//       .sort({ startTime: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     // Handle empty response
//     if (!reports.length) {
//       return res.status(404).json({
//         message: "No RWA pool reports found.",
//         count: 0,
//         totalPages,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Success response
//     return res.status(200).json({
//       message: "RWA pool reports fetched successfully!",
//       count: totalCount,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: reports,
//     });
//   } catch (err) {
//     console.error("Error fetching RWA pool reports:", err);
//     return res.status(500).json({
//       message: "An error occurred while fetching RWA pool reports.",
//       error: err.message,
//     });
//   }
// };


// // Aggregated RWA pool reports by date range, grouped by pairAddress
// // exports.getRWAPoolDateRangeReport = async (req, res) => {
// //   try {
// //     const { startTime, endTime, pairAddress } = req.query;

// //     // Validate date range
// //     if (!startTime || !endTime) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "startTime and endTime are required (format: YYYYMMDD)",
// //       });
// //     }

// //     const startTimeNum = Number(startTime);
// //     const endTimeNum = Number(endTime);

// //     if (isNaN(startTimeNum) || isNaN(endTimeNum)) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "startTime and endTime must be valid numbers (format: YYYYMMDD)",
// //       });
// //     }

// //     // Build match filter
// //     const matchFilter = {
// //       startTime: { $gte: startTimeNum, $lte: endTimeNum },
// //     };

// //     if (pairAddress) {
// //       matchFilter.pairAddress = pairAddress.trim();
// //     }

// //     // Aggregation pipeline to group by pairAddress and sum fields
// //     const aggregationPipeline = [
// //       { $match: matchFilter },

// //       {
// //         $facet: {
// //           // 1️⃣ Aggregated summary (what you already had)
// //           summary: [
// //             {
// //               $group: {
// //                 _id: "$pairAddress",
// //                 pairAddress: { $first: "$pairAddress" },
// //                 tokenAddress: { $first: "$tokenAddress" },
// //                 name: { $first: "$name" },
// //                 address: { $first: "$address" },
// //                 poolType: { $first: "$poolType" },
// //                 totalTransactions: { $sum: "$totalTransactions" },
// //                 buys: { $sum: "$buys" },
// //                 sells: { $sum: "$sells" },
// //                 totalVolume: { $sum: "$totalVolume" },
// //                 poolLiquidity: { $sum: "$poolLiquidity" },
// //                 daysCount: { $sum: 1 },
// //               },
// //             },
// //             { $project: { _id: 0 } },
// //           ],

// //           // 2️⃣ Day-wise reports between start & end
// //           dailyReports: [
// //             {
// //               $project: {
// //                 _id: 0,
// //                 pairAddress: 1,
// //                 tokenAddress: 1,
// //                 name: 1,
// //                 address: 1,
// //                 poolType: 1,
// //                 startTime: 1,
// //                 endTime: 1,
// //                 totalTransactions: 1,
// //                 buys: 1,
// //                 sells: 1,
// //                 totalVolume: 1,
// //                 poolLiquidity: 1,
// //               },
// //             },
// //             { $sort: { startTime: 1 } },
// //           ],
// //         },
// //       },
// //     ];
// //     const aggregatedResults = await rwaPoolsReport.aggregate(aggregationPipeline);

// //     if (!aggregatedResults || aggregatedResults.length === 0) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "No RWA pool reports found for the specified date range.",
// //         dateRange: {
// //           startTime: startTimeNum,
// //           endTime: endTimeNum,
// //         },
// //         data: [],
// //       });
// //     }

// //     return res.status(200).json({
// //       success: true,
// //       message: "Aggregated RWA pool reports fetched successfully!",
// //       dateRange: {
// //         startTime: startTimeNum,
// //         endTime: endTimeNum,
// //       },
// //       totalPairs: aggregatedResults.length,
// //       data: aggregatedResults,
// //     });
// //   } catch (err) {
// //     console.error("Error fetching aggregated RWA pool reports:", err);
// //     return res.status(500).json({
// //       success: false,
// //       message: "An error occurred while fetching aggregated RWA pool reports.",
// //       error: err.message,
// //     });
// //   }
// // };


// //added on 24-01-26
// exports.getRWAPoolDateRangeReport = async (req, res) => {
//   try {
//     const {
//       startTime,
//       endTime,
//       pairAddress,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // 1. Validation
//     if (!startTime || !endTime) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime are required (format: YYYYMMDD)",
//       });
//     }

//     const startTimeNum = Number(startTime);
//     const endTimeNum = Number(endTime);

//     if (isNaN(startTimeNum) || isNaN(endTimeNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime must be valid numbers (format: YYYYMMDD)",
//       });
//     }

//     // 2. Shared filter
//     const baseFilter = {
//       startTime: { $gte: startTimeNum, $lte: endTimeNum },
//     };

//     if (pairAddress) {
//       baseFilter.pairAddress = pairAddress.trim();
//     }

//     // 3. Aggregation pipeline
//     const aggregationPipeline = [
//       { $match: baseFilter },

//       {
//         $facet: {
//           // ---- SUMMARY ----
//           summary: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 pairAddress: { $first: "$pairAddress" },
//                 tokenAddress: { $first: "$tokenAddress" },
//                 name: { $first: "$name" },
//                 address: { $first: "$address" },
//                 poolType: { $first: "$poolType" },
//                 totalTransactions: { $sum: "$totalTransactions" },
//                 buys: { $sum: "$buys" },
//                 sells: { $sum: "$sells" },
//                 totalVolume: { $sum: "$totalVolume" },
//                 poolLiquidity: { $sum: "$poolLiquidity" },
//                 daysCount: { $sum: 1 },
//               },
//             },
//             { $project: { _id: 0 } },
//           ],

//           // ---- GROUPED DAILY REPORTS ----
//           groupedDailyReports: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 dailyReports: {
//                   $push: {
//                     startTime: "$startTime",
//                     endTime: "$endTime",
//                     totalTransactions: "$totalTransactions",
//                     buys: "$buys",
//                     sells: "$sells",
//                     totalVolume: "$totalVolume",
//                     poolLiquidity: "$poolLiquidity",
//                   },
//                 },
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 pairAddress: "$_id",
//                 dailyReports: 1,
//               },
//             },
//           ],
//         },
//       },
//     ];

//     const aggregatedResults = await rwaPoolsReport.aggregate(aggregationPipeline);

//     if (!aggregatedResults.length || !aggregatedResults[0].summary.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No RWA pool reports found for the specified date range.",
//         dateRange: {
//           startTime: startTimeNum,
//           endTime: endTimeNum,
//         },
//         data: [],
//       });
//     }

//     const { summary, groupedDailyReports } = aggregatedResults[0];

//     // 4. Pagination (old API logic)
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     const totalDailyCount = await rwaPoolsReport.countDocuments(baseFilter);
//     const totalPages = Math.max(1, Math.ceil(totalDailyCount / limitNumber));

//     const dailyRows = await rwaPoolsReport
//       .find(baseFilter)
//       .sort({ startTime: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     // 5. Unified response
//     return res.status(200).json({
//       success: true,
//       message: "Aggregated RWA pool reports fetched successfully!",
//       dateRange: {
//         startTime: startTimeNum,
//         endTime: endTimeNum,
//       },

//       totalPairs: summary.length,

//       summary,
//       groupedDailyReports,

//       daily: {
//         count: totalDailyCount,
//         totalPages,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: dailyRows,
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching RWA pool date range report:", err);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching RWA pool reports.",
//       error: err.message,
//     });
//   }
// };

// //Backup on 31-01-2026 //

// exports.getDailyRWAPoolsReports = async (req, res) => {
//   try {
//     const {
//       _id,
//       pairAddress,
//       rwaAddress,
//       tokenAddress,
//       poolType,
//       startTime,
//       endTime,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Parse pagination
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     // Build filters
//     const filter = {};
//     if (_id && mongoose.Types.ObjectId.isValid(_id)) filter._id = _id;
//     if (pairAddress) filter.pairAddress = pairAddress.trim();
//     if (rwaAddress) filter.rwaAddress = rwaAddress.trim();
//     if (tokenAddress) filter.tokenAddress = tokenAddress.trim();
//     if (poolType) filter.poolType = poolType.toLowerCase().trim();
//     if (startTime) filter.startTime = startTime;
//     if (endTime) filter.endTime = endTime;

//     // Count total reports
//     const totalCount = await rwaPoolsReport.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

//     // Fetch paginated results
//     const reports = await rwaPoolsReport
//       .find(filter)
//       .sort({ startTime: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     // Handle empty response
//     if (!reports.length) {
//       return res.status(404).json({
//         message: "No RWA pool reports found.",
//         count: 0,
//         totalPages,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Success response
//     return res.status(200).json({
//       message: "RWA pool reports fetched successfully!",
//       count: totalCount,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: reports,
//     });
//   } catch (err) {
//     console.error("Error fetching RWA pool reports:", err);
//     return res.status(500).json({
//       message: "An error occurred while fetching RWA pool reports.",
//       error: err.message,
//     });
//   }
// };

exports.getDailyRWAPoolsReports = async (req, res) => {
  try {
    const {
      _id,
      pairAddress,
      rwaAddress,
      tokenAddress,
      poolType,
      startTime,
      endTime,
      page = 1,
      limit = 10,
    } = req.query;

    // Parse pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filters
    const filter = {};
    if (_id && mongoose.Types.ObjectId.isValid(_id)) filter._id = _id;
    if (pairAddress) filter.pairAddress = pairAddress.trim();
    if (rwaAddress) filter.rwaAddress = rwaAddress.trim();
    if (tokenAddress) filter.tokenAddress = tokenAddress.trim();
    if (poolType) filter.poolType = poolType.toLowerCase().trim();
    if (startTime) filter.startTime = startTime;
    if (endTime) filter.endTime = endTime;

    // Count total reports
    const totalCount = await rwaPoolsReport.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

    // Fetch paginated results
    const reports = await rwaPoolsReport
      .find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Handle empty response
    if (!reports.length) {
      return res.status(404).json({
        message: "No RWA pool reports found.",
        count: 0,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Get lpPercentage from LiquidityPool by pairAddress for each report
    const pairAddresses = [...new Set(reports.map((r) => r.pairAddress).filter(Boolean))];
    const liquidityPools = await LiquidityPool.find({ pairAddress: { $in: pairAddresses } })
      .select("pairAddress lpPercentage")
      .lean();
    const pairToLpPercentage = Object.fromEntries(
      liquidityPools.map((lp) => [lp.pairAddress, lp.lpPercentage ?? 0])
    );

    // Add computed field poolFee = totalVolume * lpPercentage for every record
    const reportsWithPoolFee = reports.map((report) => {
      const lpPercentage = pairToLpPercentage[report.pairAddress] ?? 0;
      return {
        ...report,
        lpPercentage,
        poolFee: (report.totalVolume ?? 0) * lpPercentage,
      };
    });

    // Success response
    return res.status(200).json({
      message: "RWA pool reports fetched successfully!",
      count: totalCount,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      data: reportsWithPoolFee,
    });
  } catch (err) {
    console.error("Error fetching RWA pool reports:", err);
    return res.status(500).json({
      message: "An error occurred while fetching RWA pool reports.",
      error: err.message,
    });
  }
};


exports.getRWAPoolDateRangeReport = async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      pairAddress,
      page = 1,
      limit = 10,
    } = req.query;

    // 1. Validation
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime are required (format: YYYYMMDD)",
      });
    }

    const startTimeNum = Number(startTime);
    const endTimeNum = Number(endTime);

    if (isNaN(startTimeNum) || isNaN(endTimeNum)) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime must be valid numbers (format: YYYYMMDD)",
      });
    }

    // 2. Shared filter
    const baseFilter = {
      startTime: { $gte: startTimeNum, $lte: endTimeNum },
    };

    if (pairAddress) {
      baseFilter.pairAddress = pairAddress.trim();
    }

    // 3. Aggregation pipeline
    const aggregationPipeline = [
      { $match: baseFilter },

      {
        $facet: {
          // ---- SUMMARY ----
          summary: [
            {
              $group: {
                _id: "$pairAddress",
                pairAddress: { $first: "$pairAddress" },
                tokenAddress: { $first: "$tokenAddress" },
                name: { $first: "$name" },
                address: { $first: "$address" },
                poolType: { $first: "$poolType" },
                totalTransactions: { $sum: "$totalTransactions" },
                buys: { $sum: "$buys" },
                sells: { $sum: "$sells" },
                totalVolume: { $sum: "$totalVolume" },
                poolLiquidity: { $sum: "$poolLiquidity" },
                daysCount: { $sum: 1 },
              },
            },
            { $project: { _id: 0 } },
          ],

          // ---- GROUPED DAILY REPORTS ----
          groupedDailyReports: [
            {
              $group: {
                _id: "$pairAddress",
                dailyReports: {
                  $push: {
                    startTime: "$startTime",
                    endTime: "$endTime",
                    totalTransactions: "$totalTransactions",
                    buys: "$buys",
                    sells: "$sells",
                    totalVolume: "$totalVolume",
                    poolLiquidity: "$poolLiquidity",
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                pairAddress: "$_id",
                dailyReports: 1,
              },
            },
          ],
        },
      },
    ];

    const aggregatedResults = await rwaPoolsReport.aggregate(aggregationPipeline);

    if (!aggregatedResults.length || !aggregatedResults[0].summary.length) {
      return res.status(404).json({
        success: false,
        message: "No RWA pool reports found for the specified date range.",
        dateRange: {
          startTime: startTimeNum,
          endTime: endTimeNum,
        },
        data: [],
      });
    }

    const { summary, groupedDailyReports } = aggregatedResults[0];

    // 4. Pagination (old API logic)
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalDailyCount = await rwaPoolsReport.countDocuments(baseFilter);
    const totalPages = Math.max(1, Math.ceil(totalDailyCount / limitNumber));

    const dailyRows = await rwaPoolsReport
      .find(baseFilter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // 5. Get lpPercentage from LiquidityPool by pairAddress (same as getDailyRWAPoolsReports)
    const pairAddresses = [
      ...new Set([
        ...summary.map((s) => s.pairAddress),
        ...groupedDailyReports.map((g) => g.pairAddress),
        ...dailyRows.map((r) => r.pairAddress),
      ].filter(Boolean)),
    ];
    const liquidityPools = await LiquidityPool.find({ pairAddress: { $in: pairAddresses } })
      .select("pairAddress lpPercentage")
      .lean();
    const pairToLpPercentage = Object.fromEntries(
      liquidityPools.map((lp) => [lp.pairAddress, lp.lpPercentage ?? 0])
    );

    // Enrich summary: add lpPercentage and poolFee = totalVolume * lpPercentage
    const summaryWithPoolFee = summary.map((s) => {
      const lpPercentage = pairToLpPercentage[s.pairAddress] ?? 0;
      return {
        ...s,
        lpPercentage,
        poolFee: (s.totalVolume ?? 0) * lpPercentage,
      };
    });

    // Enrich groupedDailyReports: add lpPercentage and poolFee to each dailyReport
    const groupedDailyReportsWithPoolFee = groupedDailyReports.map((g) => {
      const lpPercentage = pairToLpPercentage[g.pairAddress] ?? 0;
      return {
        ...g,
        lpPercentage,
        dailyReports: (g.dailyReports || []).map((d) => ({
          ...d,
          lpPercentage,
          poolFee: (d.totalVolume ?? 0) * lpPercentage,
        })),
      };
    });

    // Enrich daily rows: add lpPercentage and poolFee to each record
    const dailyRowsWithPoolFee = dailyRows.map((r) => {
      const lpPercentage = pairToLpPercentage[r.pairAddress] ?? 0;
      return {
        ...r,
        lpPercentage,
        poolFee: (r.totalVolume ?? 0) * lpPercentage,
      };
    });

    // 6. Unified response
    return res.status(200).json({
      success: true,
      message: "Aggregated RWA pool reports fetched successfully!",
      dateRange: {
        startTime: startTimeNum,
        endTime: endTimeNum,
      },

      totalPairs: summaryWithPoolFee.length,

      summary: summaryWithPoolFee,
      groupedDailyReports: groupedDailyReportsWithPoolFee,

      daily: {
        count: totalDailyCount,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        data: dailyRowsWithPoolFee,
      },
    });
  } catch (err) {
    console.error("Error fetching RWA pool date range report:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching RWA pool reports.",
      error: err.message,
    });
  }
};

// exports.getRWAPoolDateRangeReport = async (req, res) => {
//   try {
//     const {
//       startTime,
//       endTime,
//       pairAddress,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // 1. Validation
//     if (!startTime || !endTime) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime are required (format: YYYYMMDD)",
//       });
//     }

//     const startTimeNum = Number(startTime);
//     const endTimeNum = Number(endTime);

//     if (isNaN(startTimeNum) || isNaN(endTimeNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime must be valid numbers (format: YYYYMMDD)",
//       });
//     }

//     // 2. Shared filter
//     const baseFilter = {
//       startTime: { $gte: startTimeNum, $lte: endTimeNum },
//     };

//     if (pairAddress) {
//       baseFilter.pairAddress = pairAddress.trim();
//     }

//     // 3. Aggregation pipeline
//     const aggregationPipeline = [
//       { $match: baseFilter },

//       {
//         $facet: {
//           // ---- SUMMARY ----
//           summary: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 pairAddress: { $first: "$pairAddress" },
//                 tokenAddress: { $first: "$tokenAddress" },
//                 name: { $first: "$name" },
//                 address: { $first: "$address" },
//                 poolType: { $first: "$poolType" },
//                 totalTransactions: { $sum: "$totalTransactions" },
//                 buys: { $sum: "$buys" },
//                 sells: { $sum: "$sells" },
//                 totalVolume: { $sum: "$totalVolume" },
//                 poolLiquidity: { $sum: "$poolLiquidity" },
//                 daysCount: { $sum: 1 },
//               },
//             },
//             { $project: { _id: 0 } },
//           ],

//           // ---- GROUPED DAILY REPORTS ----
//           groupedDailyReports: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 dailyReports: {
//                   $push: {
//                     startTime: "$startTime",
//                     endTime: "$endTime",
//                     totalTransactions: "$totalTransactions",
//                     buys: "$buys",
//                     sells: "$sells",
//                     totalVolume: "$totalVolume",
//                     poolLiquidity: "$poolLiquidity",
//                   },
//                 },
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 pairAddress: "$_id",
//                 dailyReports: 1,
//               },
//             },
//           ],
//         },
//       },
//     ];

//     const aggregatedResults = await rwaPoolsReport.aggregate(aggregationPipeline);

//     if (!aggregatedResults.length || !aggregatedResults[0].summary.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No RWA pool reports found for the specified date range.",
//         dateRange: {
//           startTime: startTimeNum,
//           endTime: endTimeNum,
//         },
//         data: [],
//       });
//     }

//     const { summary, groupedDailyReports } = aggregatedResults[0];

//     // 4. Pagination (old API logic)
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     const totalDailyCount = await rwaPoolsReport.countDocuments(baseFilter);
//     const totalPages = Math.max(1, Math.ceil(totalDailyCount / limitNumber));

//     const dailyRows = await rwaPoolsReport
//       .find(baseFilter)
//       .sort({ startTime: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     // 5. Unified response
//     return res.status(200).json({
//       success: true,
//       message: "Aggregated RWA pool reports fetched successfully!",
//       dateRange: {
//         startTime: startTimeNum,
//         endTime: endTimeNum,
//       },

//       totalPairs: summary.length,

//       summary,
//       groupedDailyReports,

//       daily: {
//         count: totalDailyCount,
//         totalPages,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: dailyRows,
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching RWA pool date range report:", err);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching RWA pool reports.",
//       error: err.message,
//     });
//   }
// };

// //Backup on 31-01-2026 //

//Backup on Live 31-01-2026 //

//commented on 24-01-26
// exports.getRWAPoolDateRangeReport = async (req, res) => {
//   try {
//     const { startTime, endTime, pairAddress } = req.query;

//     if (!startTime || !endTime) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime are required (format: YYYYMMDD)",
//       });
//     }

//     const startTimeNum = Number(startTime);
//     const endTimeNum = Number(endTime);

//     if (isNaN(startTimeNum) || isNaN(endTimeNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "startTime and endTime must be valid numbers (format: YYYYMMDD)",
//       });
//     }

//     const matchFilter = {
//       startTime: { $gte: startTimeNum, $lte: endTimeNum },
//     };

//     if (pairAddress) {
//       matchFilter.pairAddress = pairAddress.trim();
//     }

//     const aggregationPipeline = [
//       { $match: matchFilter },
//       {
//         $facet: {
//           summary: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 pairAddress: { $first: "$pairAddress" },
//                 tokenAddress: { $first: "$tokenAddress" },
//                 name: { $first: "$name" },
//                 address: { $first: "$address" },
//                 poolType: { $first: "$poolType" },
//                 totalTransactions: { $sum: "$totalTransactions" },
//                 buys: { $sum: "$buys" },
//                 sells: { $sum: "$sells" },
//                 totalVolume: { $sum: "$totalVolume" },
//                 poolLiquidity: { $sum: "$poolLiquidity" },
//                 daysCount: { $sum: 1 },
//               },
//             },
//             { $project: { _id: 0 } },
//           ],

//           dailyReports: [
//             {
//               $group: {
//                 _id: "$pairAddress",
//                 dailyReports: {
//                   $push: {
//                     startTime: "$startTime",
//                     endTime: "$endTime",
//                     totalTransactions: "$totalTransactions",
//                     buys: "$buys",
//                     sells: "$sells",
//                     totalVolume: "$totalVolume",
//                     poolLiquidity: "$poolLiquidity",
//                   },
//                 },
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 pairAddress: "$_id",
//                 dailyReports: 1,
//               },
//             },
//           ],
//         },
//       },
//     ];

//     const aggregatedResults = await rwaPoolsReport.aggregate(aggregationPipeline);

//     if (!aggregatedResults.length || !aggregatedResults[0].summary.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No RWA pool reports found for the specified date range.",
//         dateRange: {
//           startTime: startTimeNum,
//           endTime: endTimeNum,
//         },
//         data: [],
//       });
//     }

//     const { summary, dailyReports } = aggregatedResults[0];

//     return res.status(200).json({
//       success: true,
//       message: "Aggregated RWA pool reports fetched successfully!",
//       dateRange: {
//         startTime: startTimeNum,
//         endTime: endTimeNum,
//       },
//       totalPairs: summary.length,
//       data: {
//         summary,
//         dailyReports,
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching aggregated RWA pool reports:", err);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching aggregated RWA pool reports.",
//       error: err.message,
//     });
//   }
// };


exports.livePoolsData = async (req, res) => {
  const { tokenAddress, pairAddress } = req.query;

  if (!tokenAddress) {
    return res.status(400).json({ message: "Missing tokenAddress" });
  }

  try {
    // 🔹 Fetch Raydium pool data
    const url = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100&mintFilter=RWA`;
    const response = await fetch(url, {
      method: "GET",
      headers: { token: process.env.SOL_API_TOKEN },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const apiData = await response.json();
    const pools = apiData?.data?.data || [];

    // 🔹 Filter by token first
    let relatedPools = pools.filter(
      (pool) =>
        pool.mintA?.address === tokenAddress ||
        (pool.mintB?.address === tokenAddress && pool.day.volume !== 0)
    );

    // 🔹 If pairAddress is given, filter further
    if (pairAddress) {
      relatedPools = relatedPools.filter((pool) => pool.id === pairAddress);
    }

    // 🔹 Map and format output (with original pool object)
    const formattedPools = relatedPools.map((pool) => {
      const isMintA = pool.mintA.address === tokenAddress;
      const ourToken = isMintA ? pool.mintA : pool.mintB;
      const oppositeMint = isMintA ? pool.mintB : pool.mintA;

      return {
        pairAddress: pool.id,
        // poolType: pool.type,
        // feeRate: pool.feeRate,
        // tvl: pool.tvl,
        // apr: pool.day?.apr,
        // price: pool.price,
        // volume: pool.day?.volume ?? 0,
        // fee24H: Math.floor(pool?.day?.volumeFee ?? 0),

        // ourToken: {
        //   address: ourToken.address,
        //   logoURI: ourToken.logoURI,
        //   name: ourToken.name,
        //   symbol: ourToken.symbol,
        // },
        // oppositeToken: {
        //   address: oppositeMint.address,
        //   logoURI: oppositeMint.logoURI,
        //   name: oppositeMint.name,
        //   symbol: oppositeMint.symbol,
        // },

        // 🔹 Include full original data for detailed access
        fullPoolData: pool,
      };
    });

    // 🔹 Handle case: no match for given pairAddress
    if (pairAddress && formattedPools.length === 0) {
      return res
        .status(404)
        .json({ message: "No pool found for the provided pairAddress" });
    }

    return res.status(200).json({
      success: true,
      totalPools: formattedPools.length,
      pools: formattedPools,
    });
  } catch (error) {
    console.error("❌ Failed to fetch live pool data:", error);
    return res.status(500).json({
      message: "Failed to fetch live pool data",
      error: error.message,
    });
  }
};


exports.livePoolsNotRWA = async (req, res) => {
  const { tokenAddress, pairAddress } = req.query;

  if (!tokenAddress) {
    return res.status(400).json({ message: "Missing tokenAddress" });
  }

  try {
    // Fetch Raydium pool data
    const url = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100`;
    const response = await fetch(url, {
      method: "GET",
      headers: { token: process.env.SOL_API_TOKEN },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const apiData = await response.json();
    const pools = apiData?.data?.data || [];

    // Filter by token first
    let relatedPools = pools.filter(
      (pool) =>
        pool.mintA?.address === tokenAddress ||
        pool.mintB?.address === tokenAddress
    );

    // Filter out pools that have "RWA" in their pooltype
    relatedPools = relatedPools.filter(
      (pool) => !pool.pooltype.includes("RWA")
    );

    // If pairAddress is given, filter further
    if (pairAddress) {
      relatedPools = relatedPools.filter((pool) => pool.id === pairAddress);
    }

    // Map and format output (with original pool object)
    const formattedPools = relatedPools.map((pool) => {
      const isMintA = pool.mintA.address === tokenAddress;
      const ourToken = isMintA ? pool.mintA : pool.mintB;
      const oppositeMint = isMintA ? pool.mintB : pool.mintA;

      return {
        pairAddress: pool.id,
        fullPoolData: pool,
      };
    });

    // Handle case: no match for given pairAddress
    if (pairAddress && formattedPools.length === 0) {
      return res
        .status(404)
        .json({ message: "No pool found for the provided pairAddress" });
    }

    return res.status(200).json({
      success: true,
      totalPools: formattedPools.length,
      pools: formattedPools,
    });
  } catch (error) {
    console.error("Failed to fetch live pool data:", error);
    return res.status(500).json({
      message: "Failed to fetch live pool data",
      error: error.message,
    });
  }
};


//commented on 200126
// exports.getPaginatedTokens = async (req, res) => {
//   const { page = 1, limit = 10, tokenAddress, chainId, platformId } = req.query;

//   try {
//     // 🔒 Rule: platformId requires chainId
//     if (platformId && !chainId) {
//       return res.status(400).json({
//         success: false,
//         message: "chainId is required when platformId is provided",
//       });
//     }

//     // Fetch reward percentage
//     const setting = await Settings.findOne({ status: true }).lean();
//     const lpPct = (setting?.lpRewardPercentage || 0);

//     // ============ SINGLE TOKEN MODE ============
//     if (tokenAddress) {
//       if (!chainId && !platformId) {
//         return res.status(400).json({
//           success: false,
//           message: "Provide chainId or platformId along with tokenAddress",
//         });
//       }

//       const filter = { tokenAddress, status: true };
//       if (chainId) filter.chainId = chainId;
//       if (platformId) {
//         if (!Types.ObjectId.isValid(platformId)) {
//           return res
//             .status(400)
//             .json({ success: false, message: "Invalid platformId" });
//         }
//         filter.platformId = new Types.ObjectId(platformId);
//       }

//       // ✅ Populate platform & network always
//       const t = await Token.findOne(filter)
//         .populate("platformId", "name")
//         .populate("networkId", "name")
//         .lean();

//       if (!t)
//         return res.status(404).json({
//           success: false,
//           message: "Token not found for given filters",
//         });

//       try {
//         const { data } = await axios.get(
//           `https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`,
//           { timeout: 6000 }
//         );
//         const d = data?.pairs?.[0];
//         if (!d)
//           return res
//             .status(404)
//             .json({ success: false, message: "Dex data not found" });

//         const v = d.volume || {};
//         const lpReward = {
//           h24: (v.h24 || 0) * lpPct,
//           h6: (v.h6 || 0) * lpPct,
//           h1: (v.h1 || 0) * lpPct,
//           m5: (v.m5 || 0) * lpPct,
//         };

//         const dbInfo = {
//           tokenId: t._id || null,
//           platformId: t.platformId?._id || null,
//           platformName: t.platformId?.name || null,
//           networkId: t.networkId?._id || null,
//           networkName: t.networkId?.name || null,
//         };

//         return res.status(200).json({
//           success: true,
//           mode: "single",
//           scope: {
//             tokenAddress,
//             ...(chainId && { chainId }),
//             ...(platformId && { platformId }),
//           },
//           tokens: [{ ...d, volume: v, lpReward, dbInfo }],
//           page: 1,
//           totalPages: 1,
//           totalTokens: 1,
//           tokensInPage: 1,
//         });
//       } catch {
//         return res
//           .status(500)
//           .json({ success: false, message: "Error fetching Dex data" });
//       }
//     }

//     // ============ LIST MODES ============
//     const numericLimit = Math.max(1, Number(limit));
//     const numericPage = Math.max(1, Number(page));

//     const filter = {status: true};
//     let mode = "all";
//     const scope = {};

//     if (chainId) {
//       filter.chainId = chainId;
//       scope.chainId = chainId;
//       mode = "chain";
//       if (platformId) {
//         filter.platformId = Types.ObjectId.isValid(platformId)
//           ? new Types.ObjectId(platformId)
//           : platformId;
//         scope.platformId = platformId;
//         mode = "chain+platform";
//       }
//     }

//     const totalTokens = await Token.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(totalTokens / numericLimit));

//     const rows = await Token.find(filter)
//       .populate("platformId", "name")
//       .populate("networkId", "name")
//       .skip((numericPage - 1) * numericLimit)
//       .limit(numericLimit)
//       .lean();

//     const limiter = pLimit(5);
//     const results = await Promise.all(
//       rows.map((t) =>
//         limiter(async () => {
//           try {
//             const { data } = await axios.get(
//               `https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`,
//               { timeout: 6000 }
//             );
//             const d = data?.pairs?.[0];
//             if (!d) return null;

//             const v = d.volume || {};
//             const lpReward = {
//               h24: (v.h24 || 0) * lpPct,
//               h6: (v.h6 || 0) * lpPct,
//               h1: (v.h1 || 0) * lpPct,
//               m5: (v.m5 || 0) * lpPct,
//             };

//             const dbInfo = {
//               tokenId: t._id || null,
//               platformId: t.platformId?._id || null,
//               platformName: t.platformId?.name || null,
//               networkId: t.networkId?._id || null,
//               networkName: t.networkId?.name || null,
//             };

//             return { ...d, volume: v, lpReward, dbInfo };
//           } catch {
//             return null;
//           }
//         })
//       )
//     );

//     const tokens = results.filter(Boolean);

//     return res.status(200).json({
//       success: true,
//       mode,
//       scope,
//       page: numericPage,
//       totalPages,
//       totalTokens,
//       tokensInPage: tokens.length,
//       tokens,
//     });
//   } catch (err) {
//     console.error("❌ Backend error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };


exports.getPaginatedTokens = async (req, res) => {
  const { page = 1, limit = 10, tokenAddress, chainId, platformId } = req.query;

  try {
    // 🔒 Rule: platformId requires chainId
    if (platformId && !chainId) {
      return res.status(400).json({
        success: false,
        message: "chainId is required when platformId is provided",
      });
    }

    // Fetch reward percentage
    const setting = await Settings.findOne({ status: true }).lean();
    const lpPct = (setting?.lpRewardPercentage || 0);

    // ============ SINGLE TOKEN MODE ============
    if (tokenAddress) {
      if (!chainId && !platformId) {
        return res.status(400).json({
          success: false,
          message: "Provide chainId or platformId along with tokenAddress",
        });
      }

      const filter = { tokenAddress: tokenAddress, status: true };
      if (chainId) filter.chainId = chainId;
      if (platformId) {
        if (!Types.ObjectId.isValid(platformId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid platformId" });
        }
        filter.platformId = new Types.ObjectId(platformId);
      }

      // ✅ Populate platform & network always
      const t = await Token.findOne(filter)
        .populate("platformId")
        .populate("networkId", "name")
        .lean();

      if (!t)
        return res.status(404).json({
          success: false,
          message: "Token not found for given filters",
        });

      // Check if platform status is false - don't show anything
      if (t.platformId && t.platformId.status === false) {
        return res.status(404).json({
          success: false,
          message: "Token not found for given filters",
        });
      }

      try {
        const { data } = await axios.get(
          `https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`,
          { timeout: 6000 }
        );
        const d = data?.pairs?.[0];
        if (!d)
          return res
            .status(404)
            .json({ success: false, message: "Dex data not found" });

        const v = d.volume || {};
        const lpReward = {
          h24: (v.h24 || 0) * lpPct,
          h6: (v.h6 || 0) * lpPct,
          h1: (v.h1 || 0) * lpPct,
          m5: (v.m5 || 0) * lpPct,
        };

        const dbInfo = {
          tokenId: t._id || null,
          platformId: t.platformId?._id || null,
          platformName: t.platformId?.name || null,
          networkId: t.networkId?._id || null,
          networkName: t.networkId?.name || null,
        };

        return res.status(200).json({
          success: true,
          mode: "single",
          scope: {
            tokenAddress,
            ...(chainId && { chainId }),
            ...(platformId && { platformId }),
          },
          tokens: [{ ...d, volume: v, lpReward, dbInfo }],
          page: 1,
          totalPages: 1,
          totalTokens: 1,
          tokensInPage: 1,
        });
      } catch {
        return res
          .status(500)
          .json({ success: false, message: "Error fetching Dex data" });
      }
    }

    // ============ LIST MODES ============
    const numericLimit = Math.max(1, Number(limit));
    const numericPage = Math.max(1, Number(page));

    const filter = { status: true };
    let mode = "all";
    const scope = {};

    if (chainId) {
      filter.chainId = chainId;
      scope.chainId = chainId;
      mode = "chain";
      if (platformId) {
        filter.platformId = Types.ObjectId.isValid(platformId)
          ? new Types.ObjectId(platformId)
          : platformId;
        scope.platformId = platformId;
        mode = "chain+platform";
      }
    }

    const totalTokens = await Token.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalTokens / numericLimit));

    const rows = await Token.find(filter)
      .populate("platformId")
      .populate("networkId", "name")
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    // Filter out tokens where platform status is false
    const activeRows = rows.filter(t => !t.platformId || t.platformId.status !== false);

    const limiter = pLimit(5);
    const results = await Promise.all(
      activeRows.map((t) =>
        limiter(async () => {
          try {
            const { data } = await axios.get(
              `https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`,
              { timeout: 6000 }
            );
            const d = data?.pairs?.[0];
            if (!d) return null;

            const v = d.volume || {};
            const lpReward = {
              h24: (v.h24 || 0) * lpPct,
              h6: (v.h6 || 0) * lpPct,
              h1: (v.h1 || 0) * lpPct,
              m5: (v.m5 || 0) * lpPct,
            };

            const dbInfo = {
              tokenId: t._id || null,
              platformId: t.platformId?._id || null,
              platformName: t.platformId?.name || null,
              networkId: t.networkId?._id || null,
              networkName: t.networkId?.name || null,
            };

            return { ...d, volume: v, lpReward, dbInfo };
          } catch {
            return null;
          }
        })
      )
    );

    const tokens = results.filter(Boolean);

    return res.status(200).json({
      success: true,
      mode,
      scope,
      page: numericPage,
      totalPages,
      totalTokens,
      tokensInPage: tokens.length,
      tokens,
    });
  } catch (err) {
    console.error("❌ Backend error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPaginatedPairs = async (req, res) => {
  const { page = 1, limit = 10, pairAddress, chainId, platformId } = req.query;

  try {
    // 🔒 Rule: platformId requires chainId
    if (platformId && !chainId) {
      return res.status(400).json({
        success: false,
        message: "chainId is required when platformId is provided",
      });
    }

    // Fetch reward percentage
    const setting = await Settings.findOne({ status: true }).lean();
    const lpPct = (setting?.lpRewardPercentage || 0);

    // ============ SINGLE TOKEN MODE ============
    if (pairAddress) {
      if (!chainId && !platformId) {
        return res.status(400).json({
          success: false,
          message: "Provide chainId or platformId along with pairAddress",
        });
      }

      const filter = { pairAddress: pairAddress, status: true };
      if (chainId) filter.chainId = chainId;
      if (platformId) {
        if (!Types.ObjectId.isValid(platformId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid platformId" });
        }
        filter.platformId = new Types.ObjectId(platformId);
      }

      // ✅ Populate platform & network always
      const t = await Token.findOne(filter)
        .populate("platformId")
        .populate("networkId", "name")
        .lean();

      if (!t)
        return res.status(404).json({
          success: false,
          message: "Token not found for given filters",
        });

      // Check if platform status is false - don't show anything
      if (t.platformId && t.platformId.status === false) {
        return res.status(404).json({
          success: false,
          message: "Token not found for given filters",
        });
      }

      try {
        const { data } = await axios.get(
          // `https://api.dexscreener.com/latest/dex/tokens/${t.pairAddress}`
          `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${t.pairAddress}`,
          { timeout: 6000 }
        );
        console.log("data", data);

        const d = data?.pairs?.[0];
        console.log("d", d);

        if (!d)
          return res
            .status(404)
            .json({ success: false, message: "Dex data not found" });

        const v = d.volume || {};
        const lpReward = {
          h24: (v.h24 || 0) * lpPct,
          h6: (v.h6 || 0) * lpPct,
          h1: (v.h1 || 0) * lpPct,
          m5: (v.m5 || 0) * lpPct,
        };

        const dbInfo = {
          tokenId: t._id || null,
          platformId: t.platformId?._id || null,
          platformName: t.platformId?.name || null,
          networkId: t.networkId?._id || null,
          networkName: t.networkId?.name || null,
        };

        return res.status(200).json({
          success: true,
          mode: "single",
          scope: {
            pairAddress,
            ...(chainId && { chainId }),
            ...(platformId && { platformId }),
          },
          tokens: [{ ...d, volume: v, lpReward, dbInfo }],
          page: 1,
          totalPages: 1,
          totalTokens: 1,
          tokensInPage: 1,
        });
      } catch {
        return res
          .status(500)
          .json({ success: false, message: "Error fetching Dex data" });
      }
    }

    // ============ LIST MODES ============
    const numericLimit = Math.max(1, Number(limit));
    const numericPage = Math.max(1, Number(page));

    const filter = { status: true };
    let mode = "all";
    const scope = {};

    if (chainId) {
      filter.chainId = chainId;
      scope.chainId = chainId;
      mode = "chain";
      if (platformId) {
        filter.platformId = Types.ObjectId.isValid(platformId)
          ? new Types.ObjectId(platformId)
          : platformId;
        scope.platformId = platformId;
        mode = "chain+platform";
      }
    }

    const totalTokens = await Token.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalTokens / numericLimit));

    const rows = await Token.find(filter)
      .populate("platformId")
      .populate("networkId", "name")
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    // Filter out tokens where platform status is false
    const activeRows = rows.filter(t => !t.platformId || t.platformId.status !== false);

    const limiter = pLimit(5);
    const results = await Promise.all(
      activeRows.map((t) =>
        limiter(async () => {
          try {
            const { data } = await axios.get(
              `https://api.dexscreener.com/latest/dex/tokens/${t.pairAddress}`,
              { timeout: 6000 }
            );
            const d = data?.pairs?.[0];
            if (!d) return null;

            const v = d.volume || {};
            const lpReward = {
              h24: (v.h24 || 0) * lpPct,
              h6: (v.h6 || 0) * lpPct,
              h1: (v.h1 || 0) * lpPct,
              m5: (v.m5 || 0) * lpPct,
            };

            const dbInfo = {
              tokenId: t._id || null,
              platformId: t.platformId?._id || null,
              platformName: t.platformId?.name || null,
              networkId: t.networkId?._id || null,
              networkName: t.networkId?.name || null,
            };

            return { ...d, volume: v, lpReward, dbInfo };
          } catch {
            return null;
          }
        })
      )
    );

    const tokens = results.filter(Boolean);

    return res.status(200).json({
      success: true,
      mode,
      scope,
      page: numericPage,
      totalPages,
      totalTokens,
      tokensInPage: tokens.length,
      tokens,
    });
  } catch (err) {
    console.error("❌ Backend error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getWalletsData = async (req, res) => {
  try {
    const {
      status = 2,
      page,
      limit = 10
    } = req.query;

    const response = await axios.get(
      "https://dexmmapi.stringonchain.io/api/main/getWalletInfo",
      {
        params: {
          status,
          page,
          limit
        },
        headers: {
          "x-api-key": process.env.WALLET_GEN_API_KEY
        }
      }
    );

    const wallets = response.data?.data || [];
    const pagination = response.data?.pagination || {};

    const formattedData = wallets.map(wallet => ({
      id: wallet._id,
      address: wallet.address,
      tokenAddress: wallet.tokenAddress,
      pairAddress: wallet.pairAddress,
      poolMintAAddress: wallet.poolMintAAddress,
      pairSymbol: `${wallet.poolMintASymbol}/${wallet.tokenSymbol}`
    }));

    return res.status(200).json({
      success: true,
      pagination: {
        total: pagination.totalWallets,
        totalPages: pagination.totalPages,
        currentPage: pagination.currentPage,
        limit: pagination.pageLimit
      },
      count: formattedData.length,
      data: formattedData
    });

  } catch (err) {
    console.error("❌ Backend error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


//new function added on 20-12-25
// const calculateWalletReportForPair = async (pairAddress, startTime) => {
//   try {
//     console.log(`🔎 Finding wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

//     // Build query to find wallet reports directly by pairAddress and startTime
//     const query = {
//       pairAddress: pairAddress,
//       startTime: Number(startTime)
//       // startTime: 20251218
//     };

//     console.log(`  🔍 Query:`, JSON.stringify(query, null, 2));

//     // Get all wallet reports for this pairAddress and startTime
//     const walletReports = await WalletReport.find(query);
//     console.log(`  📊 Found ${walletReports.length} wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

//     if (!walletReports || walletReports.length === 0) {
//       console.log(`  ⚠️ No wallet reports found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//       return null;
//     }

//     // Aggregate all wallet reports
//     const aggregatedReport = walletReports.reduce(
//       (acc, report) => {
//         // Sum fields
//         acc.totalTransactions += Number(report.totalTransactions) || 0;
//         acc.totalVolume += Number(report.totalVolume) || 0;
//         acc.buys += Number(report.buys) || 0;
//         acc.sells += Number(report.sells) || 0;
//         acc.resetBuys += Number(report.resetBuys) || 0;
//         acc.resetSells += Number(report.resetSells) || 0;
//         acc.resetsVolume += Number(report.resetsVolume) || 0;
//         acc.resetBuyVolumeUSD += Number(report.resetBuyVolumeUSD) || 0;
//         acc.resetSellVolumeUSD += Number(report.resetSellVolumeUSD) || 0;
//         acc.agentBuys += Number(report.agentBuys) || 0;
//         acc.agentSells += Number(report.agentSells) || 0;
//         acc.agentsVolume += Number(report.agentsVolume) || 0;
//         acc.bundles += Number(report.bundles) || 0;
//         acc.lpAdd += Number(report.lpAdd) || 0;
//         acc.gasFee += Number(report.gasFee) || 0;
//         acc.gasFeeInDollars += Number(report.gasFeeInDollars) || 0;
//         acc.rayFee += Number(report.rayFee) || 0;
//         acc.walletEndBalance += Number(report.walletEndBalance) || 0;
//         acc.walletStartBalance += Number(report.walletStartBalance) || 0;
//         acc.ExpectedCost += Number(report.ExpectedCost) || 0;
//         acc.walletLoss += Number(report.walletLoss) || 0;
//         acc.slipageAndloss += Number(report.slipageAndloss) || 0;
//         acc.pP += Number(report.pP) || 0;
//         acc.cost += Number(report.cost) || 0;
//         acc.totalCost += Number(report.totalCost) || 0;
//         acc.netCost += Number(report.netCost) || 0;
//         acc.priceImpact += Number(report.priceImpact) || 0;
//         acc.tip += Number(report.tip) || 0;

//         // For averages, we'll calculate weighted average or simple average
//         // For now, using simple average (can be improved later)
//         acc.solAverageSum += Number(report.solAverage) || 0;
//         acc.tokenAverageSum += Number(report.tokenAverage) || 0;
//         acc.pooledTokenAverageSum += Number(report.pooledTokenAverage) || 0;
//         acc.pooledSolAverageSum += Number(report.pooledSolAverage) || 0;
//         acc.count++;

//         // Get token info from first report
//         if (!acc.tokenName) {
//           acc.tokenName = report.tokenName;
//           acc.tokenSymbol = report.tokenSymbol;
//           acc.tokenIcon = report.tokenIcon;
//           acc.tokenAddress = report.token;
//         }

//         return acc;
//       },
//       {
//         totalTransactions: 0,
//         totalVolume: 0,
//         buys: 0,
//         sells: 0,
//         resetBuys: 0,
//         resetSells: 0,
//         resetsVolume: 0,
//         resetBuyVolumeUSD: 0,
//         resetSellVolumeUSD: 0,
//         agentBuys: 0,
//         agentSells: 0,
//         agentsVolume: 0,
//         bundles: 0,
//         lpAdd: 0,
//         gasFee: 0,
//         gasFeeInDollars: 0,
//         rayFee: 0,
//         walletEndBalance: 0,
//         walletStartBalance: 0,
//         ExpectedCost: 0,
//         walletLoss: 0,
//         slipageAndloss: 0,
//         pP: 0,
//         cost: 0,
//         totalCost: 0,
//         netCost: 0,
//         priceImpact: 0,
//         tip: 0,
//         solAverageSum: 0,
//         tokenAverageSum: 0,
//         pooledTokenAverageSum: 0,
//         pooledSolAverageSum: 0,
//         count: 0,
//         tokenName: null,
//         tokenSymbol: null,
//         tokenIcon: null,
//         tokenAddress: null
//       }
//     );

//     // Calculate averages
//     const solAverage = aggregatedReport.count > 0 ? aggregatedReport.solAverageSum / aggregatedReport.count : 0;
//     const tokenAverage = aggregatedReport.count > 0 ? aggregatedReport.tokenAverageSum / aggregatedReport.count : 0;
//     const pooledTokenAverage = aggregatedReport.count > 0 ? aggregatedReport.pooledTokenAverageSum / aggregatedReport.count : 0;
//     const pooledSolAverage = aggregatedReport.count > 0 ? aggregatedReport.pooledSolAverageSum / aggregatedReport.count : 0;

//     // Build final pool report
//     const poolReport = {
//       pairAddress: pairAddress,
//       tokenAddress: aggregatedReport.tokenAddress,
//       tokenName: aggregatedReport.tokenName,
//       tokenSymbol: aggregatedReport.tokenSymbol,
//       tokenIcon: aggregatedReport.tokenIcon,
//       walletCount: walletReports.length, // Number of wallet reports (which equals number of wallets for this pairAddress)
//       totalTransactions: aggregatedReport.totalTransactions,
//       totalVolume: aggregatedReport.totalVolume,
//       buys: aggregatedReport.buys,
//       sells: aggregatedReport.sells,
//       resetBuys: aggregatedReport.resetBuys,
//       resetSells: aggregatedReport.resetSells,
//       resetsVolume: aggregatedReport.resetsVolume,
//       resetBuyVolumeUSD: aggregatedReport.resetBuyVolumeUSD,
//       resetSellVolumeUSD: aggregatedReport.resetSellVolumeUSD,
//       agentBuys: aggregatedReport.agentBuys,
//       agentSells: aggregatedReport.agentSells,
//       agentsVolume: aggregatedReport.agentsVolume,
//       bundles: aggregatedReport.bundles,
//       pooledTokenAverage: pooledTokenAverage,
//       pooledSolAverage: pooledSolAverage,
//       lpAdd: aggregatedReport.lpAdd,
//       gasFee: aggregatedReport.gasFee,
//       gasFeeInDollars: aggregatedReport.gasFeeInDollars,
//       rayFee: aggregatedReport.rayFee,
//       walletEndBalance: aggregatedReport.walletEndBalance,
//       walletStartBalance: aggregatedReport.walletStartBalance,
//       ExpectedCost: aggregatedReport.ExpectedCost,
//       walletLoss: aggregatedReport.walletLoss,
//       slipageAndloss: aggregatedReport.slipageAndloss,
//       pP: aggregatedReport.pP,
//       cost: aggregatedReport.cost,
//       totalCost: aggregatedReport.totalCost,
//       netCost: aggregatedReport.netCost,
//       priceImpact: aggregatedReport.priceImpact,
//       tip: aggregatedReport.tip,
//       solAverage: solAverage,
//       tokenAverage: tokenAverage,
//       from_time: walletReports[0]?.from_time || 0,
//       to_time: walletReports[0]?.to_time || 0,
//       startTime: startTime || walletReports[0]?.startTime || 0,
//       endTime: startTime || walletReports[0]?.endTime || 0
//     };

//     return poolReport;
//   } catch (error) {
//     console.error(`Error calculating pool report for ${pairAddress}:`, error);
//     return null;
//   }
// };

// //new function added on 20-12-25
// exports.calculateAndSavePoolReports = async (req, res) => {
//   try {
//     // Get yesterday's date in YYYYMMDD format (same as wallet reports)
//     // Note: startTime is stored as Number in WalletReport (e.g., 20251219)
//     const startTime = Number(moment.utc().subtract(1, "days").format("YYYYMMDD"));
//     // const startTime =moment.utc().subtract(1, "days").format("YYYYMMDD");;
//     const endTime = startTime;

//     console.log(`📅 Calculating pool reports for date: ${startTime} (${moment.utc().subtract(1, "days").format("YYYY-MM-DD")})`);

//     console.log(`🔄 Starting pool reports calculation for date: ${startTime}`);

//     // Get all unique pairAddresses from WalletSchema
//     const uniquePairAddresses = await WalletSchema.distinct("pairAddress", { pairAddress: { $ne: "" } });

//     if (!uniquePairAddresses || uniquePairAddresses.length === 0) {
//       console.log("No pairAddresses found in wallets");
//       if (res) {
//         return res.status(404).json({
//           success: false,
//           message: "No pairAddresses found in wallets",
//         });
//       }
//       return;
//     }

//     console.log(`📊 Found ${uniquePairAddresses.length} unique pairAddresses to process`);

//     let successCount = 0;
//     let errorCount = 0;
//     const results = [];

//     // Process each pairAddress
//     for (const pairAddress of uniquePairAddresses) {
//       try {
//         console.log(`\n🔍 Processing pairAddress: ${pairAddress}`);

//         // Check if pool report already exists for this pairAddress and startTime
//         const existingReport = await PoolReport.findOne({
//           pairAddress: pairAddress,
//           startTime: startTime
//         });

//         if (existingReport) {
//           console.log(`⏩ Skipping ${pairAddress} - report already exists for ${startTime}`);
//           successCount++; // Count as success since it already exists
//           results.push({ pairAddress, status: "skipped", reason: "already exists" });
//           continue;
//         }

//         // Calculate pool report
//         console.log(`📊 Calculating pool report for ${pairAddress}...`);
//         const poolReport = await calculateWalletReportForPair(pairAddress, startTime);

//         if (!poolReport) {
//           console.log(`⚠️ No data to save for pairAddress: ${pairAddress} - no wallet reports found`);
//           errorCount++;
//           results.push({ pairAddress, status: "error", error: "No wallet reports found for this pairAddress and startTime" });
//           continue;
//         }

//         // Set startTime and endTime
//         poolReport.startTime = startTime;
//         poolReport.endTime = endTime;

//         // Save to database
//         console.log(`💾 Saving pool report for ${pairAddress}...`);
//         const newPoolReport = new PoolReport(poolReport);
//         await newPoolReport.save();

//         console.log(`✅ Saved pool report for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//         successCount++;
//         results.push({ pairAddress, status: "success" });
//       } catch (error) {
//         console.error(`❌ Error processing pairAddress ${pairAddress}:`, error);
//         console.error(`Error stack:`, error.stack);
//         errorCount++;
//         results.push({ pairAddress, status: "error", error: error.message });
//       }
//     }

//     const summary = {
//       totalPairAddresses: uniquePairAddresses.length,
//       successCount,
//       errorCount,
//       startTime,
//       results
//     };

//     console.log(`✅ Pool reports calculation completed:`, summary);

//     if (res) {
//       return res.status(200).json({
//         success: true,
//         message: `Pool reports calculated and saved for ${successCount} pairAddresses`,
//         data: summary,
//       });
//     }
//   } catch (error) {
//     console.error("Error in calculateAndSavePoolReports:", error);
//     if (res) {
//       return res.status(500).json({
//         success: false,
//         message: "Internal server error while calculating pool reports.",
//         error: error.message,
//       });
//     }
//   }
// };


//added on 26-12-25   (commented on 02-02-2026 to ckeck)
// const calculateWalletReportForPair = async (pairAddress, startTime) => {
//   try {
//     console.log(`🔎 Finding wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

//     // Build query to find wallet reports directly by pairAddress and startTime
//     const query = {
//       pairAddress: pairAddress,
//       startTime: Number(startTime)
//     };

//     console.log(`🔍 Query:`, JSON.stringify(query, null, 2));

//     // Get all wallet reports for this pairAddress and startTime
//     const walletReports = await WalletReport.find(query);
//     console.log(`  📊 Found ${walletReports.length} wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

//     if (!walletReports || walletReports.length === 0) {
//       console.log(` ⚠️ No wallet reports found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//       return null;
//     }

//     // Aggregate all wallet reports
//     const aggregatedReport = walletReports.reduce( //mmreport
//       (acc, report) => {
//         // Sum fields
//         acc.totalTransactions += Number(report.totalTransactions) || 0;
//         acc.totalVolume += Number(report.totalVolume) || 0;
//         acc.yeild += Number(report.yeild) || 0;
//         acc.buys += Number(report.buys) || 0;
//         acc.sells += Number(report.sells) || 0;
//         acc.resetBuys += Number(report.resetBuys) || 0;
//         acc.resetSells += Number(report.resetSells) || 0;
//         acc.resetsVolume += Number(report.resetsVolume) || 0;
//         acc.resetBuyVolumeUSD += Number(report.resetBuyVolumeUSD) || 0;
//         acc.resetSellVolumeUSD += Number(report.resetSellVolumeUSD) || 0;
//         acc.agentBuys += Number(report.agentBuys) || 0;
//         acc.agentSells += Number(report.agentSells) || 0;
//         acc.agentsVolume += Number(report.agentsVolume) || 0;
//         acc.bundles += Number(report.bundles) || 0;
//         acc.lpAdd += Number(report.lpAdd) || 0;
//         acc.gasFee += Number(report.gasFee) || 0;
//         acc.gasFeeInDollars += Number(report.gasFeeInDollars) || 0;
//         acc.rayFee += Number(report.rayFee) || 0;
//         acc.rayCost += Number(report.rayCost) || 0;
//         acc.walletEndBalance += Number(report.walletEndBalance) || 0;
//         acc.walletStartBalance += Number(report.walletStartBalance) || 0;
//         acc.ExpectedCost += Number(report.ExpectedCost) || 0;
//         acc.walletLoss += Number(report.walletLoss) || 0;
//         acc.slipageAndloss += Number(report.slipageAndloss) || 0;
//         acc.pP += Number(report.pP) || 0;
//         acc.cost += Number(report.cost) || 0;
//         acc.totalCost += Number(report.totalCost) || 0;
//         acc.netCost += Number(report.netCost) || 0;
//         acc.priceImpact += Number(report.priceImpact) || 0;
//         acc.tip += Number(report.tip) || 0;

//         // For averages, we'll calculate weighted average or simple average
//         // For now, using simple average (can be improved later)
//         acc.solAverageSum += Number(report.solAverage) || 0;
//         acc.tokenAverageSum += Number(report.tokenAverage) || 0;
//         acc.pooledTokenAverageSum += Number(report.pooledTokenAverage) || 0;
//         acc.pooledSolAverageSum += Number(report.pooledSolAverage) || 0;
//         acc.count++;

//         // Get token info and poolType from first report
//         if (!acc.tokenName) {
//           acc.tokenName = report.tokenName;
//           acc.tokenSymbol = report.tokenSymbol;
//           acc.tokenIcon = report.tokenIcon;
//           acc.tokenAddress = report.token;
//           acc.poolType = report.poolType || null;
//         }

//         return acc;
//       },
//       {
//         totalTransactions: 0,
//         totalVolume: 0,
//         mmTotalVolume: 0,
//         mmYeild: 0,
//         yeild: 0,
//         mmRayCost: 0,
//         rayCost: 0,
//         poolYeild: 0,
//         companysYeild: 0,
//         usersYeild: 0,
//         buys: 0,
//         sells: 0,
//         resetBuys: 0,
//         resetSells: 0,
//         resetsVolume: 0,
//         resetBuyVolumeUSD: 0,
//         resetSellVolumeUSD: 0,
//         agentBuys: 0,
//         agentSells: 0,
//         agentsVolume: 0,
//         bundles: 0,
//         lpAdd: 0,
//         gasFee: 0,
//         gasFeeInDollars: 0,
//         rayFee: 0,
//         walletEndBalance: 0,
//         walletStartBalance: 0,
//         ExpectedCost: 0,
//         walletLoss: 0,
//         slipageAndloss: 0,
//         pP: 0,
//         cost: 0,
//         totalCost: 0,
//         netCost: 0,
//         priceImpact: 0,
//         tip: 0,
//         solAverageSum: 0,
//         tokenAverageSum: 0,
//         pooledTokenAverageSum: 0,
//         pooledSolAverageSum: 0,
//         count: 0,
//         tokenName: null,
//         tokenSymbol: null,
//         tokenIcon: null,
//         tokenAddress: null,
//         poolType: null
//       }
//     );

//     // Calculate averages
//     const solAverage = aggregatedReport.count > 0 ? aggregatedReport.solAverageSum / aggregatedReport.count : 0;
//     const tokenAverage = aggregatedReport.count > 0 ? aggregatedReport.tokenAverageSum / aggregatedReport.count : 0;
//     const pooledTokenAverage = aggregatedReport.count > 0 ? aggregatedReport.pooledTokenAverageSum / aggregatedReport.count : 0;
//     const pooledSolAverage = aggregatedReport.count > 0 ? aggregatedReport.pooledSolAverageSum / aggregatedReport.count : 0;

//     // Get poolType from wallet reports, or fetch from RWASchema if not available
//     let poolType = aggregatedReport.poolType;
//     if (!poolType || poolType === '') {
//       console.log(`⚠️ poolType not found in wallet reports for ${pairAddress}, fetching from RWASchema...`);
//       const liquidityPool = await RWASchema.findOne({ pairAddress: pairAddress });
//       if (liquidityPool && liquidityPool.poolType) {
//         poolType = liquidityPool.poolType.toLowerCase();
//         console.log(`✅ Found poolType from RWASchema: ${poolType}`);
//       } else {
//         poolType = "";
//         console.log(`⚠️ No poolType found in RWASchema for ${pairAddress}`);
//       }
//     }
// const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });

//     const poolReportt = await rwaPoolsReport.findOne({ pairAddress: pairAddress, startTime: startTime });
//     const totalVolume = poolReportt.totalVolume;
//     const companysYeild = poolReportt.companysRevenue;
//     const poolLiquidity = poolReportt.poolLiquidity;
//     const companysLiquidity = poolReportt.companysLiquidity;
//     const usersLiquidity = poolReportt.usersLiquidity;

//     const settings = await SettingsSchema.findOne({ status: "true" });

//   console.log("(liquidityPool.lpPercentage", liquidityPool.lpPercentage);
//   console.log("SettingsSchema.lpRewardPool", settings.lpRewardPool);

//     const poolYeild = ((totalVolume * (liquidityPool.lpPercentage || 0)) * (settings.lpRewardPool || 0)); 
//     console.log("poolYeild", poolYeild);
//     const poolRayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
//     console.log("poolRayCost", poolRayCost);
//     const poolRayFee = (totalVolume * (liquidityPool.lpPercentage || 0));
//     const ARBuserYeild = poolYeild - aggregatedReport.yeild;


//     // Build final pool report
//     const poolReport = {
//       pairAddress: pairAddress,
//       tokenAddress: aggregatedReport.tokenAddress,
//       tokenName: aggregatedReport.tokenName,
//       tokenSymbol: aggregatedReport.tokenSymbol,
//       tokenIcon: aggregatedReport.tokenIcon,
//       walletCount: walletReports.length, // Number of wallet reports (which equals number of wallets for this pairAddress)
//       totalTransactions: aggregatedReport.totalTransactions,
//       poolYeild,
//       totalVolume,//poolreportvolume
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       mmTotalVolume: aggregatedReport.totalVolume,
//       usersTotalVolume: totalVolume - aggregatedReport.totalVolume,
//       mmYeild: aggregatedReport.yeild,
//       ARBuserYeild,
//       companysYeild,
//       usersYeild: poolYeild - companysYeild,
//       buys: aggregatedReport.buys,
//       sells: aggregatedReport.sells,
//       resetBuys: aggregatedReport.resetBuys,
//       resetSells: aggregatedReport.resetSells,
//       resetsVolume: aggregatedReport.resetsVolume,
//       resetBuyVolumeUSD: aggregatedReport.resetBuyVolumeUSD,
//       resetSellVolumeUSD: aggregatedReport.resetSellVolumeUSD,
//       agentBuys: aggregatedReport.agentBuys,
//       agentSells: aggregatedReport.agentSells,
//       agentsVolume: aggregatedReport.agentsVolume,
//       bundles: aggregatedReport.bundles,
//       pooledTokenAverage: pooledTokenAverage,
//       pooledSolAverage: pooledSolAverage,
//       lpAdd: aggregatedReport.lpAdd,
//       gasFee: aggregatedReport.gasFee,
//       gasFeeInDollars: aggregatedReport.gasFeeInDollars,
//       mmRayFee: aggregatedReport.rayFee,
//       mmRayCost: aggregatedReport.rayCost,
//       poolRayFee,
//       poolRayCost,
//       clientRevenueCost:-(poolYeild - companysYeild)+ARBuserYeild,
//       netCompanyCost : aggregatedReport.slipageAndloss + poolRayCost + aggregatedReport.gasFeeInDollars+(-(poolYeild - companysYeild)+ARBuserYeild),
//       walletEndBalance: aggregatedReport.walletEndBalance,
//       walletStartBalance: aggregatedReport.walletStartBalance,
//       ExpectedCost: aggregatedReport.ExpectedCost,
//       walletLoss: aggregatedReport.walletLoss,
//       slipageAndloss: aggregatedReport.slipageAndloss,
//       pP: aggregatedReport.pP,
//       cost: aggregatedReport.cost,
//       totalCost: aggregatedReport.totalCost,
//       netCost: aggregatedReport.netCost,
//       priceImpact: aggregatedReport.priceImpact,
//       tip: aggregatedReport.tip,
//       solAverage: solAverage,
//       tokenAverage: tokenAverage,
//       poolType: poolType,
//       from_time: walletReports[0]?.from_time || 0,
//       to_time: walletReports[0]?.to_time || 0,
//       startTime: startTime || walletReports[0]?.startTime || 0,
//       endTime: startTime || walletReports[0]?.endTime || 0
//     };

//     return poolReport;
//   } catch (error) {
//     console.error(`Error calculating pool report for ${pairAddress}:`, error);
//     return null;
//   }
// };


// added on 02-02-2026
const calculateWalletReportForPair = async (pairAddress, startTime) => {
  try {
    console.log(`🔎 Finding wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

    // Build query to find wallet reports directly by pairAddress and startTime
    const query = {
      pairAddress: pairAddress,
      startTime: Number(startTime)
    };

    console.log(`🔍 Query:`, JSON.stringify(query, null, 2));

    // Get all wallet reports for this pairAddress and startTime
    const walletReports = await WalletReport.find(query);
    console.log(`  📊 Found ${walletReports.length} wallet reports for pairAddress: ${pairAddress}, startTime: ${startTime}`);

    if (!walletReports || walletReports.length === 0) {
      console.log(` ⚠️ No wallet reports found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      return null;
    }

    // Aggregate all wallet reports
    const aggregatedReport = walletReports.reduce( //mmreport
      (acc, report) => {
        // Sum fields
        acc.totalTransactions += Number(report.totalTransactions) || 0;
        acc.totalVolume += Number(report.totalVolume) || 0;
        acc.yeild += Number(report.yeild) || 0;
        acc.buys += Number(report.buys) || 0;
        acc.sells += Number(report.sells) || 0;
        acc.resetBuys += Number(report.resetBuys) || 0;
        acc.resetSells += Number(report.resetSells) || 0;
        acc.resetsVolume += Number(report.resetsVolume) || 0;
        acc.resetBuyVolumeUSD += Number(report.resetBuyVolumeUSD) || 0;
        acc.resetSellVolumeUSD += Number(report.resetSellVolumeUSD) || 0;
        acc.agentBuys += Number(report.agentBuys) || 0;
        acc.agentSells += Number(report.agentSells) || 0;
        acc.agentsVolume += Number(report.agentsVolume) || 0;
        acc.bundles += Number(report.bundles) || 0;
        acc.lpAdd += Number(report.lpAdd) || 0;
        acc.gasFee += Number(report.gasFee) || 0;
        acc.gasFeeInDollars += Number(report.gasFeeInDollars) || 0;
        acc.rayFee += Number(report.rayFee) || 0;
        acc.rayCost += Number(report.rayCost) || 0;
        acc.walletEndBalance += Number(report.walletEndBalance) || 0;
        acc.walletStartBalance += Number(report.walletStartBalance) || 0;
        acc.ExpectedCost += Number(report.ExpectedCost) || 0;
        acc.walletLoss += Number(report.walletLoss) || 0;
        acc.slipageAndloss += Number(report.slipageAndloss) || 0;
        acc.pP += Number(report.pP) || 0;
        acc.cost += Number(report.cost) || 0;
        acc.totalCost += Number(report.totalCost) || 0;
        acc.netCost += Number(report.netCost) || 0;
        acc.priceImpact += Number(report.priceImpact) || 0;
        acc.tip += Number(report.tip) || 0;

        // NOTE: we intentionally do NOT aggregate averages here.
        // We will copy `solAverage`, `tokenAverage`, `addressAverage` from a representative wallet report later.
        acc.count++;

        // Get token info and poolType from first report
        if (!acc.tokenName) {
          acc.tokenName = report.tokenName;
          acc.tokenSymbol = report.tokenSymbol;
          acc.tokenIcon = report.tokenIcon;
          acc.tokenAddress = report.token;
          acc.poolType = report.poolType || null;
        }

        return acc;
      },
      {
        totalTransactions: 0,
        totalVolume: 0,
        mmTotalVolume: 0,
        mmYeild: 0,
        yeild: 0,
        mmRayCost: 0,
        rayCost: 0,
        poolYeild: 0,
        companysYeild: 0,
        usersYeild: 0,
        buys: 0,
        sells: 0,
        resetBuys: 0,
        resetSells: 0,
        resetsVolume: 0,
        resetBuyVolumeUSD: 0,
        resetSellVolumeUSD: 0,
        agentBuys: 0,
        agentSells: 0,
        agentsVolume: 0,
        bundles: 0,
        lpAdd: 0,
        gasFee: 0,
        gasFeeInDollars: 0,
        rayFee: 0,
        walletEndBalance: 0,
        walletStartBalance: 0,
        ExpectedCost: 0,
        walletLoss: 0,
        slipageAndloss: 0,
        pP: 0,
        cost: 0,
        totalCost: 0,
        netCost: 0,
        priceImpact: 0,
        tip: 0,
        count: 0,
        tokenName: null,
        tokenSymbol: null,
        tokenIcon: null,
        tokenAddress: null,
        poolType: null
      }
    );

    // We do NOT average these — take from underlying wallet report (same source as getTokenData)

    // Get poolType from wallet reports, or fetch from RWASchema if not available
    let poolType = aggregatedReport.poolType;
    if (!poolType || poolType === '') {
      console.log(`⚠️ poolType not found in wallet reports for ${pairAddress}, fetching from RWASchema...`);
      const liquidityPool = await RWASchema.findOne({ pairAddress: pairAddress });
      if (liquidityPool && liquidityPool.poolType) {
        poolType = liquidityPool.poolType.toLowerCase();
        console.log(`✅ Found poolType from RWASchema: ${poolType}`);
      } else {
        poolType = "";
        console.log(`⚠️ No poolType found in RWASchema for ${pairAddress}`);
      }
    }
    const liquidityPool = await LiquidityPool.findOne({ pairAddress: pairAddress });

    const poolReportt = await rwaPoolsReport.findOne({ pairAddress: pairAddress, startTime: startTime });
    const totalVolume = poolReportt.totalVolume;
    const companysYeild = poolReportt.companysRevenue;
    const poolLiquidity = poolReportt.poolLiquidity;
    const companysLiquidity = poolReportt.companysLiquidity;
    const usersLiquidity = poolReportt.usersLiquidity;

    const settings = await SettingsSchema.findOne({ status: "true" });

    console.log("(liquidityPool.lpPercentage", liquidityPool.lpPercentage);
    console.log("SettingsSchema.lpRewardPool", settings.lpRewardPool);

    const poolYeild = ((totalVolume * (liquidityPool.lpPercentage || 0)) * (settings.lpRewardPool || 0));
    console.log("poolYeild", poolYeild);
    const poolRayCost = (totalVolume * (liquidityPool.lpPercentage || 0)) * 0.16;
    console.log("poolRayCost", poolRayCost);
    const poolRayFee = (totalVolume * (liquidityPool.lpPercentage || 0));
    const ARBuserYeild = poolYeild - aggregatedReport.yeild;


    //  // solAverage: take directly from walletReports (generated by getTokenData)
    //  let solAverage = 0;
    //  if (walletReports && walletReports.length > 0) {
    //    solAverage = Number(walletReports[0].solAverage) || 0;
    //  }

    // Copy averages from one related wallet report (all wallets for a pair/day should match)
    // Pick the most recent wallet report for this pair (in case multiple runs exist for same day)
    const relatedWalletReport =
      walletReports && walletReports.length > 0
        ? walletReports.reduce((latest, report) => {
          if (!latest) return report;
          return (report.createdAt || 0) > (latest.createdAt || 0) ? report : latest;
        }, null)
        : null;

    const solAverage = Number(relatedWalletReport?.solAverage) || 0;
    const tokenAverage = Number(relatedWalletReport?.tokenAverage) || 0;
    const addressAverage = Number(relatedWalletReport?.addressAverage) || 0;

    // Build final pool report
    const poolReport = {
      pairAddress: pairAddress,
      tokenAddress: aggregatedReport.tokenAddress,
      tokenName: aggregatedReport.tokenName,
      tokenSymbol: aggregatedReport.tokenSymbol,
      tokenIcon: aggregatedReport.tokenIcon,
      walletCount: walletReports.length, // Number of wallet reports (which equals number of wallets for this pairAddress)
      totalTransactions: aggregatedReport.totalTransactions,
      poolYeild,
      totalVolume,//poolreportvolume
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      mmTotalVolume: aggregatedReport.totalVolume,
      usersTotalVolume: totalVolume - aggregatedReport.totalVolume,
      mmYeild: aggregatedReport.yeild,
      ARBuserYeild,
      companysYeild,
      usersYeild: poolYeild - companysYeild,
      buys: aggregatedReport.buys,
      sells: aggregatedReport.sells,
      resetBuys: aggregatedReport.resetBuys,
      resetSells: aggregatedReport.resetSells,
      resetsVolume: aggregatedReport.resetsVolume,
      resetBuyVolumeUSD: aggregatedReport.resetBuyVolumeUSD,
      resetSellVolumeUSD: aggregatedReport.resetSellVolumeUSD,
      agentBuys: aggregatedReport.agentBuys,
      agentSells: aggregatedReport.agentSells,
      agentsVolume: aggregatedReport.agentsVolume,
      bundles: aggregatedReport.bundles,
      // pooledTokenAverage: pooledTokenAverage,
      // pooledSolAverage: pooledSolAverage,
      lpAdd: aggregatedReport.lpAdd,
      gasFee: aggregatedReport.gasFee,
      gasFeeInDollars: aggregatedReport.gasFeeInDollars,
      mmRayFee: aggregatedReport.rayFee,
      mmRayCost: aggregatedReport.rayCost,
      poolRayFee,
      poolRayCost,
      clientRevenueCost: -(poolYeild - companysYeild) + ARBuserYeild,
      netCompanyCost: aggregatedReport.slipageAndloss + poolRayCost + aggregatedReport.gasFeeInDollars + (-(poolYeild - companysYeild) + ARBuserYeild),
      walletEndBalance: aggregatedReport.walletEndBalance,
      walletStartBalance: aggregatedReport.walletStartBalance,
      ExpectedCost: aggregatedReport.ExpectedCost,
      walletLoss: aggregatedReport.walletLoss,
      slipageAndloss: aggregatedReport.slipageAndloss,
      pP: aggregatedReport.pP,
      cost: aggregatedReport.cost,
      totalCost: aggregatedReport.totalCost,
      netCost: aggregatedReport.netCost,
      priceImpact: aggregatedReport.priceImpact,
      tip: aggregatedReport.tip,
      solAverage,
      // Copy averages from underlying wallet reports
      tokenAverage,
      addressAverage,
      poolType: poolType,
      from_time: walletReports[0]?.from_time || 0,
      to_time: walletReports[0]?.to_time || 0,
      startTime: startTime || walletReports[0]?.startTime || 0,
      endTime: startTime || walletReports[0]?.endTime || 0
    };

    return poolReport;
  } catch (error) {
    console.error(`Error calculating pool report for ${pairAddress}:`, error);
    return null;
  }
};


//added 26-12-25
exports.calculateAndSavePoolReportsByAllWallets = async (req, res) => {
  try {
    // Get yesterday's date in YYYYMMDD format (same as wallet reports)
    // Note: startTime is stored as Number in WalletReport (e.g., 20251219)
    // const startTime =moment.utc().subtract(1, "days").format("YYYYMMDD");
    const startTime = Number(moment.utc().subtract(1, "days").format("YYYYMMDD"));
    const endTime = startTime;

    console.log(`📅 Calculating pool reports for date: ${startTime} (${moment.utc().subtract(1, "days").format("YYYY-MM-DD")})`);

    console.log(`🔄 Starting pool reports calculation for date: ${startTime}`);

    // Get all unique pairAddresses from WalletReport collection for this specific startTime
    // This ensures we only process pairAddresses that actually have wallet reports for this date
    const uniquePairAddresses = await WalletReport.distinct("pairAddress", {
      pairAddress: { $ne: "", $exists: true },
      startTime: startTime // Only get pairAddresses that have reports for this date
    });

    if (!uniquePairAddresses || uniquePairAddresses.length === 0) {
      console.log(`⚠️ No pairAddresses found in wallet reports for startTime: ${startTime}`);

      // Check if there are any wallet reports at all
      const anyReports = await WalletReport.countDocuments({ pairAddress: { $ne: "", $exists: true } });
      if (anyReports > 0) {
        const availableDates = await WalletReport.distinct("startTime");
        console.log(`📅 Available startTimes in wallet reports: ${availableDates.sort((a, b) => b - a).slice(0, 10).join(", ")}`);
      }

      if (res) {
        return res.status(404).json({
          success: false,
          message: `No pairAddresses found in wallet reports for startTime: ${startTime}`,
          startTime: startTime,
        });
      }
      return;
    }

    console.log(`📊 Found ${uniquePairAddresses.length} unique pairAddresses with wallet reports for date ${startTime}`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each pairAddress
    for (const pairAddress of uniquePairAddresses) {
      try {
        console.log(`\n🔍 Processing pairAddress: ${pairAddress}`);

        // Check if pool report already exists for this pairAddress and startTime
        const existingReport = await PoolReport.findOne({
          pairAddress: pairAddress,
          startTime: startTime
        });

        if (existingReport) {
          console.log(`⏩ Skipping ${pairAddress} - report already exists for ${startTime}`);
          successCount++; // Count as success since it already exists
          results.push({ pairAddress, status: "skipped", reason: "already exists" });
          continue;
        }

        // Calculate pool report
        console.log(`📊 Calculating pool report for ${pairAddress}...`);
        const poolReport = await calculateWalletReportForPair(pairAddress, startTime);

        if (!poolReport) {
          console.log(`⚠️ No data to save for pairAddress: ${pairAddress} - no wallet reports found`);
          errorCount++;
          results.push({ pairAddress, status: "error", error: "No wallet reports found for this pairAddress and startTime" });
          continue;
        }

        // Set startTime and endTime
        poolReport.startTime = startTime;
        poolReport.endTime = endTime;

        // Save to database
        console.log(`💾 Saving pool report for ${pairAddress}...`);
        const newPoolReport = new PoolReport(poolReport);
        await newPoolReport.save();

        console.log(`✅ Saved pool report for pairAddress: ${pairAddress}, startTime: ${startTime}`);
        successCount++;
        results.push({ pairAddress, status: "success" });
      } catch (error) {
        console.error(`❌ Error processing pairAddress ${pairAddress}:`, error);
        console.error(`Error stack:`, error.stack);
        errorCount++;
        results.push({ pairAddress, status: "error", error: error.message });
      }
    }

    const summary = {
      totalPairAddresses: uniquePairAddresses.length,
      successCount,
      errorCount,
      startTime,
      results
    };

    console.log(`✅ Pool reports calculation completed:`, summary);

    if (res) {
      return res.status(200).json({
        success: true,
        message: `Pool reports calculated and saved for ${successCount} pairAddresses`,
        data: summary,
      });
    }
  } catch (error) {
    console.error("Error in calculateAndSavePoolReportsByAllWallets:", error);
    if (res) {
      return res.status(500).json({
        success: false,
        message: "Internal server error while calculating pool reports.",
        error: error.message,
      });
    }
  }
};


//commented on 01022026
// const calculateDailyPoolReportAggregates = async (startTime) => {
//   try {
//     console.log(`📅 Calculating daily pool type aggregates for date: ${startTime}`);

//     // Get all pool reports for this date
//     const poolReports = await PoolReport.find({ startTime: startTime });

//     if (!poolReports || poolReports.length === 0) {
//       console.log(`⚠️ No pool reports found for startTime: ${startTime}`);
//       return null;
//     }

//     console.log(`📊 Found ${poolReports.length} pool reports for date ${startTime}`);

//     // Get unique pairAddresses from pool reports
//     const uniquePairAddresses = [...new Set(poolReports.map(pr => pr.pairAddress))];
//     console.log(`🔍 Found ${uniquePairAddresses.length} unique pairAddresses in pool reports`);

//     // Get pool types only for the pairAddresses that exist in pool reports (as fallback)
//     const liquidityPools = await RWASchema.find({
//       pairAddress: { $in: uniquePairAddresses }
//     });
//     const poolTypeMap = {};
//     liquidityPools.forEach(pool => {
//       poolTypeMap[pool.pairAddress] = pool.poolType?.toLowerCase() || 'unknown';
//     });

//     console.log(`📋 Mapped ${Object.keys(poolTypeMap).length} pairAddresses to pool types (fallback)`);

//     // Count pool reports by tokenAddress and poolType for debugging
//     const reportCounts = {};
//     poolReports.forEach(pr => {
//       const tokenAddr = pr.tokenAddress || 'unknown';
//       const poolType = pr.poolType?.toLowerCase() || poolTypeMap[pr.pairAddress] || 'unknown';
//       const key = `${tokenAddr}_${poolType}`;
//       reportCounts[key] = (reportCounts[key] || 0) + 1;
//     });
//     console.log(`📊 Pool reports breakdown:`, Object.entries(reportCounts).slice(0, 10));

//     // Group pool reports by tokenAddress and poolType
//     // Structure: { tokenAddress: { poolType: aggregateData } }
//     const aggregatesByTokenAndType = {};

//     // Process each pool report
//     for (const poolReport of poolReports) {
//       // Get poolType - prioritize poolReport.poolType (already saved) over poolTypeMap
//       let poolType = poolReport.poolType?.toLowerCase() || poolTypeMap[poolReport.pairAddress];

//       if (!poolType || poolType === 'unknown' || poolType === '') {
//         console.log(`⚠️ No pool type found for pairAddress: ${poolReport.pairAddress}, tokenAddress: ${poolReport.tokenAddress}, skipping...`);
//         continue;
//       }

//       // Normalize poolType
//       poolType = poolType.toLowerCase().trim();

//       // Skip clmm+rwa as it's a combined type, we only want individual types
//       if (poolType === 'clmm+rwa') {
//         continue;
//       }

//       const tokenAddress = poolReport.tokenAddress;
//       if (!tokenAddress) {
//         console.log(`⚠️ No tokenAddress found for pairAddress: ${poolReport.pairAddress}, skipping...`);
//         continue;
//       }

//       // Initialize structure for this tokenAddress if it doesn't exist
//       if (!aggregatesByTokenAndType[tokenAddress]) {
//         aggregatesByTokenAndType[tokenAddress] = {};
//       }

//       // Initialize aggregate for this tokenAddress + poolType combination if it doesn't exist
//       if (!aggregatesByTokenAndType[tokenAddress][poolType]) {
//         aggregatesByTokenAndType[tokenAddress][poolType] = {
//           tokenAddress: tokenAddress,
//           poolType: poolType,
//           totalTransactions: 0,
//           totalVolume: 0,
//           mmTotalVolume: 0,
//           usersTotalVolume: 0,
//           mmYeild: 0,
//           poolYeild: 0,
//           ARBuserYeild: 0,
//           companysYeild: 0,
//           usersYeild: 0,
//           poolLiquidity: 0,
//           companysLiquidity: 0,
//           usersLiquidity: 0,
//           buys: 0,
//           sells: 0,
//           resetBuys: 0,
//           resetSells: 0,
//           resetsVolume: 0,
//           resetBuyVolumeUSD: 0,
//           resetSellVolumeUSD: 0,
//           agentBuys: 0,
//           agentSells: 0,
//           agentsVolume: 0,
//           bundles: 0,
//           pooledTokenAverage: 0,
//           pooledSolAverage: 0,
//           lpAdd: 0,
//           gasFee: 0,
//           gasFeeInDollars: 0,
//           mmRayFee: 0,
//           poolRayFee: 0,
//           poolRayCost: 0,
//           mmRayCost: 0,
//           walletEndBalance: 0,
//           walletStartBalance: 0,
//           ExpectedCost: 0,
//           walletLoss: 0,
//           slipageAndloss: 0,
//           pP: 0,
//           cost: 0,
//           totalCost: 0,
//           netCost: 0,
//           priceImpact: 0,
//           tip: 0,
//           solAverage: 0,
//           tokenAverage: 0,
//           poolCount: 0,
//           walletCount: 0,
//           solAverageSum: 0,
//           tokenAverageSum: 0,
//           pooledTokenAverageSum: 0,
//           pooledSolAverageSum: 0,
//           netCompanyCost: 0,
//           clientRevenueCost: 0,
//           count: 0,
//           from_time: 0,
//           to_time: 0
//         };
//       }

//       // Get the aggregate for this tokenAddress + poolType combination
//       const targetAggregate = aggregatesByTokenAndType[tokenAddress][poolType];

//       // Sum all numeric fields - ensure we're using the actual values from pool report
//       const reportTransactions = Number(poolReport.totalTransactions) || 0;
//       const reportVolume = Number(poolReport.totalVolume) || 0;
//       console.log("poolReport.netCompanyCost",poolReport.netCompanyCost);
//       console.log("targetAggregate.netCompanyCost",targetAggregate.netCompanyCost);


//       targetAggregate.totalTransactions += reportTransactions;
//       targetAggregate.totalVolume += Number(poolReport.totalVolume) || 0;
//       targetAggregate.mmTotalVolume += Number(poolReport.mmTotalVolume) || 0;
//       targetAggregate.usersTotalVolume += Number(poolReport.usersTotalVolume) || 0;
//       targetAggregate.mmRayFee += Number(poolReport.mmRayFee) || 0;
//       targetAggregate.poolRayFee += Number(poolReport.poolRayFee) || 0;
//       targetAggregate.ARBuserYeild += Number(poolReport.ARBuserYeild) || 0;
//       targetAggregate.mmYeild += Number(poolReport.mmYeild) || 0;
//       targetAggregate.poolYeild += Number(poolReport.poolYeild) || 0;
//       targetAggregate.companysYeild += Number(poolReport.companysYeild) || 0;
//       targetAggregate.usersYeild += Number(poolReport.usersYeild) || 0;
//       targetAggregate.poolLiquidity += Number(poolReport.poolLiquidity) || 0;
//       targetAggregate.companysLiquidity += Number(poolReport.companysLiquidity) || 0;
//       targetAggregate.usersLiquidity += Number(poolReport.usersLiquidity) || 0;
//       targetAggregate.buys += Number(poolReport.buys) || 0;
//       targetAggregate.sells += Number(poolReport.sells) || 0;
//       targetAggregate.resetBuys += Number(poolReport.resetBuys) || 0;
//       targetAggregate.resetSells += Number(poolReport.resetSells) || 0;
//       targetAggregate.resetsVolume += Number(poolReport.resetsVolume) || 0;
//       targetAggregate.resetBuyVolumeUSD += Number(poolReport.resetBuyVolumeUSD) || 0;
//       targetAggregate.resetSellVolumeUSD += Number(poolReport.resetSellVolumeUSD) || 0;
//       targetAggregate.agentBuys += Number(poolReport.agentBuys) || 0;
//       targetAggregate.agentSells += Number(poolReport.agentSells) || 0;
//       targetAggregate.agentsVolume += Number(poolReport.agentsVolume) || 0;
//       targetAggregate.bundles += Number(poolReport.bundles) || 0;
//       targetAggregate.lpAdd += Number(poolReport.lpAdd) || 0;
//       targetAggregate.gasFee += Number(poolReport.gasFee) || 0;
//       targetAggregate.gasFeeInDollars += Number(poolReport.gasFeeInDollars) || 0;
//       targetAggregate.poolRayCost += Number(poolReport.poolRayCost) || 0;
//       targetAggregate.mmRayCost += Number(poolReport.mmRayCost) || 0;
//       targetAggregate.walletEndBalance += Number(poolReport.walletEndBalance) || 0;
//       targetAggregate.walletStartBalance += Number(poolReport.walletStartBalance) || 0;
//       targetAggregate.ExpectedCost += Number(poolReport.ExpectedCost) || 0;
//       targetAggregate.walletLoss += Number(poolReport.walletLoss) || 0;
//       targetAggregate.slipageAndloss += Number(poolReport.slipageAndloss) || 0;
//       targetAggregate.pP += Number(poolReport.pP) || 0;
//       targetAggregate.cost += Number(poolReport.cost) || 0;
//       targetAggregate.totalCost += Number(poolReport.totalCost) || 0;
//       targetAggregate.netCost += Number(poolReport.netCost) || 0;
//       targetAggregate.priceImpact += Number(poolReport.priceImpact) || 0;
//       targetAggregate.tip += Number(poolReport.tip) || 0;
//       targetAggregate.clientRevenueCost += Number(poolReport.clientRevenueCost) || 0;
//       targetAggregate.netCompanyCost += Number(poolReport.netCompanyCost) || 0;


//       // For averages, accumulate sums
//       targetAggregate.solAverageSum += Number(poolReport.solAverage) || 0;
//       targetAggregate.tokenAverageSum += Number(poolReport.tokenAverage) || 0;
//       targetAggregate.pooledTokenAverageSum += Number(poolReport.pooledTokenAverage) || 0;
//       targetAggregate.pooledSolAverageSum += Number(poolReport.pooledSolAverage) || 0;
//       targetAggregate.count++;

//       // Sum wallet counts
//       targetAggregate.walletCount += Number(poolReport.walletCount) || 0;
//       targetAggregate.poolCount++;

//       // Set time fields from first report
//       if (targetAggregate.from_time === 0) {
//         targetAggregate.from_time = Number(poolReport.from_time) || 0;
//         targetAggregate.to_time = Number(poolReport.to_time) || 0;
//       }
//     }

//     // Calculate averages for each tokenAddress + poolType combination
//     const allAggregates = [];

//     for (const tokenAddress in aggregatesByTokenAndType) {
//       const tokenAggregates = aggregatesByTokenAndType[tokenAddress];
//       const clmmAgg = tokenAggregates['clmm'];
//       const rwaAgg = tokenAggregates['rwa'];

//       // First, create clmm+rwa aggregate BEFORE we delete the sum fields
//       // Only create clmm+rwa if both clmm and rwa exist
//       if (clmmAgg && rwaAgg) {
//         // Calculate weighted averages based on poolCount
//         const totalClmmRwaPools = (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0);
//         const clmmWeight = totalClmmRwaPools > 0 ? (clmmAgg.poolCount || 0) / totalClmmRwaPools : 0.5;
//         const rwaWeight = totalClmmRwaPools > 0 ? (rwaAgg.poolCount || 0) / totalClmmRwaPools : 0.5;

//         // Calculate averages for clmm and rwa before combining
//         const clmmSolAvg = clmmAgg.count > 0 ? clmmAgg.solAverageSum / clmmAgg.count : 0;
//         const clmmTokenAvg = clmmAgg.count > 0 ? clmmAgg.tokenAverageSum / clmmAgg.count : 0;
//         const clmmPooledTokenAvg = clmmAgg.count > 0 ? clmmAgg.pooledTokenAverageSum / clmmAgg.count : 0;
//         const clmmPooledSolAvg = clmmAgg.count > 0 ? clmmAgg.pooledSolAverageSum / clmmAgg.count : 0;

//         const rwaSolAvg = rwaAgg.count > 0 ? rwaAgg.solAverageSum / rwaAgg.count : 0;
//         const rwaTokenAvg = rwaAgg.count > 0 ? rwaAgg.tokenAverageSum / rwaAgg.count : 0;
//         const rwaPooledTokenAvg = rwaAgg.count > 0 ? rwaAgg.pooledTokenAverageSum / rwaAgg.count : 0;
//         const rwaPooledSolAvg = rwaAgg.count > 0 ? rwaAgg.pooledSolAverageSum / rwaAgg.count : 0;

//         const clmmRwaAggregate = {
//           tokenAddress: tokenAddress,
//           poolType: 'clmm+rwa',
//           totalTransactions: (clmmAgg.totalTransactions || 0) + (rwaAgg.totalTransactions || 0),
//           totalVolume: (clmmAgg.totalVolume || 0) + (rwaAgg.totalVolume || 0),
//           mmTotalVolume: (clmmAgg.mmTotalVolume || 0) + (rwaAgg.mmTotalVolume || 0),
//           usersTotalVolume: ((clmmAgg.usersTotalVolume || 0) + (rwaAgg.usersTotalVolume || 0)),
//           mmYeild: (clmmAgg.mmYeild || 0) + (rwaAgg.mmYeild || 0),
//           poolYeild: (clmmAgg.poolYeild || 0) + (rwaAgg.poolYeild || 0),
//           ARBuserYeild: (clmmAgg.ARBuserYeild || 0) + (rwaAgg.ARBuserYeild || 0),
//           companysYeild: (clmmAgg.companysYeild || 0) + (rwaAgg.companysYeild || 0),
//           usersYeild: ((clmmAgg.usersYeild || 0) + (rwaAgg.usersYeild || 0)),
//           poolLiquidity: (clmmAgg.poolLiquidity || 0) + (rwaAgg.poolLiquidity || 0),
//           companysLiquidity: (clmmAgg.companysLiquidity || 0) + (rwaAgg.companysLiquidity || 0),
//           usersLiquidity: (clmmAgg.usersLiquidity || 0) + (rwaAgg.usersLiquidity || 0),
//           buys: (clmmAgg.buys || 0) + (rwaAgg.buys || 0),
//           sells: (clmmAgg.sells || 0) + (rwaAgg.sells || 0),
//           resetBuys: (clmmAgg.resetBuys || 0) + (rwaAgg.resetBuys || 0),
//           resetSells: (clmmAgg.resetSells || 0) + (rwaAgg.resetSells || 0),
//           resetsVolume: (clmmAgg.resetsVolume || 0) + (rwaAgg.resetsVolume || 0),
//           resetBuyVolumeUSD: (clmmAgg.resetBuyVolumeUSD || 0) + (rwaAgg.resetBuyVolumeUSD || 0),
//           resetSellVolumeUSD: (clmmAgg.resetSellVolumeUSD || 0) + (rwaAgg.resetSellVolumeUSD || 0),
//           agentBuys: (clmmAgg.agentBuys || 0) + (rwaAgg.agentBuys || 0),
//           agentSells: (clmmAgg.agentSells || 0) + (rwaAgg.agentSells || 0),
//           agentsVolume: (clmmAgg.agentsVolume || 0) + (rwaAgg.agentsVolume || 0),
//           bundles: (clmmAgg.bundles || 0) + (rwaAgg.bundles || 0),
//           pooledTokenAverage: clmmPooledTokenAvg * clmmWeight + rwaPooledTokenAvg * rwaWeight,
//           pooledSolAverage: clmmPooledSolAvg * clmmWeight + rwaPooledSolAvg * rwaWeight,
//           lpAdd: (clmmAgg.lpAdd || 0) + (rwaAgg.lpAdd || 0),
//           gasFee: (clmmAgg.gasFee || 0) + (rwaAgg.gasFee || 0),
//           gasFeeInDollars: (clmmAgg.gasFeeInDollars || 0) + (rwaAgg.gasFeeInDollars || 0),
//           mmRayFee: (clmmAgg.mmRayFee || 0) + (rwaAgg.mmRayFee || 0),
//           poolRayFee: (clmmAgg.poolRayFee || 0) + (rwaAgg.poolRayFee || 0),
//           poolRayCost: (clmmAgg.poolRayCost || 0) + (rwaAgg.poolRayCost || 0),
//           mmRayCost: (clmmAgg.mmRayCost || 0) + (rwaAgg.mmRayCost || 0),
//           walletEndBalance: (clmmAgg.walletEndBalance || 0) + (rwaAgg.walletEndBalance || 0),
//           walletStartBalance: (clmmAgg.walletStartBalance || 0) + (rwaAgg.walletStartBalance || 0),
//           ExpectedCost: (clmmAgg.ExpectedCost || 0) + (rwaAgg.ExpectedCost || 0),
//           walletLoss: (clmmAgg.walletLoss || 0) + (rwaAgg.walletLoss || 0),
//           slipageAndloss: (clmmAgg.slipageAndloss || 0) + (rwaAgg.slipageAndloss || 0),
//           pP: (clmmAgg.pP || 0) + (rwaAgg.pP || 0),
//           cost: (clmmAgg.cost || 0) + (rwaAgg.cost || 0),
//           totalCost: (clmmAgg.totalCost || 0) + (rwaAgg.totalCost || 0),
//           netCost: (clmmAgg.netCost || 0) + (rwaAgg.netCost || 0),
//           netCompanyCost:(clmmAgg.netCompanyCost || 0) + (rwaAgg.netCompanyCost || 0),
//           clientRevenueCost: (clmmAgg.clientRevenueCost || 0) + (rwaAgg.clientRevenueCost || 0),
//           priceImpact: (clmmAgg.priceImpact || 0) + (rwaAgg.priceImpact || 0),
//           tip: (clmmAgg.tip || 0) + (rwaAgg.tip || 0),
//           solAverage: clmmSolAvg * clmmWeight + rwaSolAvg * rwaWeight,
//           tokenAverage: clmmTokenAvg * clmmWeight + rwaTokenAvg * rwaWeight,
//           poolCount: (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0),
//           walletCount: (clmmAgg.walletCount || 0) + (rwaAgg.walletCount || 0),
//           from_time: clmmAgg.from_time || rwaAgg.from_time || 0,
//           to_time: clmmAgg.to_time || rwaAgg.to_time || 0
//         };

//         // Add clmm+rwa aggregate to the array
//         allAggregates.push(clmmRwaAggregate);
//         console.log(`✅ Created clmm+rwa aggregate for tokenAddress: ${tokenAddress}`);
//       }

//       // Now process individual pool types (cpmm, clmm, rwa) and calculate their averages
//       for (const poolType in tokenAggregates) {
//         const agg = tokenAggregates[poolType];

//         // Calculate averages
//         if (agg.count > 0) {
//           agg.solAverage = agg.solAverageSum / agg.count;
//           agg.tokenAverage = agg.tokenAverageSum / agg.count;
//           agg.pooledTokenAverage = agg.pooledTokenAverageSum / agg.count;
//           agg.pooledSolAverage = agg.pooledSolAverageSum / agg.count;
//         } else {
//           // If count is 0, set averages to 0
//           agg.solAverage = 0;
//           agg.tokenAverage = 0;
//           agg.pooledTokenAverage = 0;
//           agg.pooledSolAverage = 0;
//         }

//         // Remove temporary fields
//         delete agg.solAverageSum;
//         delete agg.tokenAverageSum;
//         delete agg.pooledTokenAverageSum;
//         delete agg.pooledSolAverageSum;
//         delete agg.count;

//         // Add to flat array for easier processing
//         allAggregates.push(agg);
//       }
//     }

//     // Log summary for each tokenAddress with detailed breakdown
//     for (const tokenAddress in aggregatesByTokenAndType) {
//       const poolTypes = Object.keys(aggregatesByTokenAndType[tokenAddress]);
//       const hasClmmRwa = poolTypes.includes('clmm') && poolTypes.includes('rwa');
//       console.log(`\n📋 TokenAddress: ${tokenAddress}`);
//       console.log(`   PoolTypes found: ${poolTypes.join(', ')}${hasClmmRwa ? ' + clmm+rwa' : ''}`);

//       // Log details for each poolType
//       for (const poolType of poolTypes) {
//         const agg = aggregatesByTokenAndType[tokenAddress][poolType];
//         console.log(`   ${poolType.toUpperCase()}: totalTransactions=${agg.totalTransactions}, totalVolume=${agg.totalVolume.toFixed(2)}, poolCount=${agg.poolCount}, walletCount=${agg.walletCount}`);
//       }
//     }

//     console.log(`\n📊 Created ${allAggregates.length} aggregates for ${Object.keys(aggregatesByTokenAndType).length} unique tokenAddresses`);

//     // Return all aggregates as a flat array
//     return {
//       allAggregates,
//       totalPoolReports: poolReports.length
//     };
//   } catch (error) {
//     console.error(`Error calculating daily pool type aggregate for ${startTime}:`, error);
//     return null;
//   }
// };


//added on 02-02-2026 now
const calculateDailyPoolReportAggregates = async (startTime) => {
  try {
    console.log(`📅 Calculating daily pool type aggregates for date: ${startTime}`);

    // Get all pool reports for this date
    const poolReports = await PoolReport.find({ startTime: startTime });

    if (!poolReports || poolReports.length === 0) {
      console.log(`⚠️ No pool reports found for startTime: ${startTime}`);
      return null;
    }

    console.log(`📊 Found ${poolReports.length} pool reports for date ${startTime}`);

    // Get unique pairAddresses from pool reports
    const uniquePairAddresses = [...new Set(poolReports.map(pr => pr.pairAddress))];
    console.log(`🔍 Found ${uniquePairAddresses.length} unique pairAddresses in pool reports`);

    // Get pool types only for the pairAddresses that exist in pool reports (as fallback)
    const liquidityPools = await RWASchema.find({
      pairAddress: { $in: uniquePairAddresses }
    });
    const poolTypeMap = {};
    liquidityPools.forEach(pool => {
      poolTypeMap[pool.pairAddress] = pool.poolType?.toLowerCase() || 'unknown';
    });

    console.log(`📋 Mapped ${Object.keys(poolTypeMap).length} pairAddresses to pool types (fallback)`);

    // solAverage: take from WalletReport documents (walletReportsPairWise) for this date
    const walletReportsForDay = await WalletReport.find({
      startTime: Number(startTime),
      pairAddress: { $in: uniquePairAddresses }
    });
    const solAverageFromResponse =
      walletReportsForDay.find(wr => Number(wr.solAverage) > 0)?.solAverage || 0;

    // Count pool reports by tokenAddress and poolType for debugging
    const reportCounts = {};
    poolReports.forEach(pr => {
      const tokenAddr = pr.tokenAddress || 'unknown';
      const poolType = pr.poolType?.toLowerCase() || poolTypeMap[pr.pairAddress] || 'unknown';
      const key = `${tokenAddr}_${poolType}`;
      reportCounts[key] = (reportCounts[key] || 0) + 1;
    });
    console.log(`📊 Pool reports breakdown:`, Object.entries(reportCounts).slice(0, 10));

    // Group pool reports by tokenAddress and poolType
    // Structure: { tokenAddress: { poolType: aggregateData } }
    const aggregatesByTokenAndType = {};

    // Process each pool report
    for (const poolReport of poolReports) {
      // Get poolType - prioritize poolReport.poolType (already saved) over poolTypeMap
      let poolType = poolReport.poolType?.toLowerCase() || poolTypeMap[poolReport.pairAddress];

      if (!poolType || poolType === 'unknown' || poolType === '') {
        console.log(`⚠️ No pool type found for pairAddress: ${poolReport.pairAddress}, tokenAddress: ${poolReport.tokenAddress}, skipping...`);
        continue;
      }

      // Normalize poolType
      poolType = poolType.toLowerCase().trim();

      // Skip clmm+rwa as it's a combined type, we only want individual types
      if (poolType === 'clmm+rwa') {
        continue;
      }

      const tokenAddress = poolReport.tokenAddress;
      if (!tokenAddress) {
        console.log(`⚠️ No tokenAddress found for pairAddress: ${poolReport.pairAddress}, skipping...`);
        continue;
      }

      // Initialize structure for this tokenAddress if it doesn't exist
      if (!aggregatesByTokenAndType[tokenAddress]) {
        aggregatesByTokenAndType[tokenAddress] = {};
      }

      // Initialize aggregate for this tokenAddress + poolType combination if it doesn't exist
      if (!aggregatesByTokenAndType[tokenAddress][poolType]) {
        aggregatesByTokenAndType[tokenAddress][poolType] = {
          tokenAddress: tokenAddress,
          poolType: poolType,
          totalTransactions: 0,
          totalVolume: 0,
          mmTotalVolume: 0,
          usersTotalVolume: 0,
          mmYeild: 0,
          poolYeild: 0,
          ARBuserYeild: 0,
          companysYeild: 0,
          usersYeild: 0,
          poolLiquidity: 0,
          companysLiquidity: 0,
          usersLiquidity: 0,
          buys: 0,
          sells: 0,
          resetBuys: 0,
          resetSells: 0,
          resetsVolume: 0,
          resetBuyVolumeUSD: 0,
          resetSellVolumeUSD: 0,
          agentBuys: 0,
          agentSells: 0,
          agentsVolume: 0,
          bundles: 0,
          // pooledTokenAverage: 0,
          // pooledSolAverage: 0,
          lpAdd: 0,
          gasFee: 0,
          gasFeeInDollars: 0,
          mmRayFee: 0,
          poolRayFee: 0,
          poolRayCost: 0,
          mmRayCost: 0,
          walletEndBalance: 0,
          walletStartBalance: 0,
          ExpectedCost: 0,
          walletLoss: 0,
          slipageAndloss: 0,
          pP: 0,
          cost: 0,
          totalCost: 0,
          netCost: 0,
          priceImpact: 0,
          tip: 0,
          // solAverage: 0,
          tokenAverage: 0,
          poolCount: 0,
          walletCount: 0,
          // solAverageSum: 0,
          // tokenAverageSum: 0,
          // pooledTokenAverageSum: 0,
          // pooledSolAverageSum: 0,
          netCompanyCost: 0,
          clientRevenueCost: 0,
          count: 0,
          from_time: 0,
          to_time: 0
        };
      }

      // Get the aggregate for this tokenAddress + poolType combination
      const targetAggregate = aggregatesByTokenAndType[tokenAddress][poolType];

      // Add solAverage from SOL price API response only (address + API token) — not aggregated
      targetAggregate.solAverage = solAverageFromResponse;

      // tokenAverage: copy from pool reports (already calculated per pair/day)
      // Keep the first non-zero value we see.
      if (!targetAggregate.tokenAverage || Number(targetAggregate.tokenAverage) === 0) {
        const ta = Number(poolReport.tokenAverage) || 0;
        if (ta > 0) targetAggregate.tokenAverage = ta;
      }

      // Sum all numeric fields - ensure we're using the actual values from pool report
      const reportTransactions = Number(poolReport.totalTransactions) || 0;
      const reportVolume = Number(poolReport.totalVolume) || 0;
      console.log("poolReport.netCompanyCost", poolReport.netCompanyCost);
      console.log("targetAggregate.netCompanyCost", targetAggregate.netCompanyCost);


      targetAggregate.totalTransactions += reportTransactions;
      targetAggregate.totalVolume += Number(poolReport.totalVolume) || 0;
      targetAggregate.mmTotalVolume += Number(poolReport.mmTotalVolume) || 0;
      targetAggregate.usersTotalVolume += Number(poolReport.usersTotalVolume) || 0;
      targetAggregate.mmRayFee += Number(poolReport.mmRayFee) || 0;
      targetAggregate.poolRayFee += Number(poolReport.poolRayFee) || 0;
      targetAggregate.ARBuserYeild += Number(poolReport.ARBuserYeild) || 0;
      targetAggregate.mmYeild += Number(poolReport.mmYeild) || 0;
      targetAggregate.poolYeild += Number(poolReport.poolYeild) || 0;
      targetAggregate.companysYeild += Number(poolReport.companysYeild) || 0;
      targetAggregate.usersYeild += Number(poolReport.usersYeild) || 0;
      targetAggregate.poolLiquidity += Number(poolReport.poolLiquidity) || 0;
      targetAggregate.companysLiquidity += Number(poolReport.companysLiquidity) || 0;
      targetAggregate.usersLiquidity += Number(poolReport.usersLiquidity) || 0;
      targetAggregate.buys += Number(poolReport.buys) || 0;
      targetAggregate.sells += Number(poolReport.sells) || 0;
      targetAggregate.resetBuys += Number(poolReport.resetBuys) || 0;
      targetAggregate.resetSells += Number(poolReport.resetSells) || 0;
      targetAggregate.resetsVolume += Number(poolReport.resetsVolume) || 0;
      targetAggregate.resetBuyVolumeUSD += Number(poolReport.resetBuyVolumeUSD) || 0;
      targetAggregate.resetSellVolumeUSD += Number(poolReport.resetSellVolumeUSD) || 0;
      targetAggregate.agentBuys += Number(poolReport.agentBuys) || 0;
      targetAggregate.agentSells += Number(poolReport.agentSells) || 0;
      targetAggregate.agentsVolume += Number(poolReport.agentsVolume) || 0;
      targetAggregate.bundles += Number(poolReport.bundles) || 0;
      targetAggregate.lpAdd += Number(poolReport.lpAdd) || 0;
      targetAggregate.gasFee += Number(poolReport.gasFee) || 0;
      targetAggregate.gasFeeInDollars += Number(poolReport.gasFeeInDollars) || 0;
      targetAggregate.poolRayCost += Number(poolReport.poolRayCost) || 0;
      targetAggregate.mmRayCost += Number(poolReport.mmRayCost) || 0;
      targetAggregate.walletEndBalance += Number(poolReport.walletEndBalance) || 0;
      targetAggregate.walletStartBalance += Number(poolReport.walletStartBalance) || 0;
      targetAggregate.ExpectedCost += Number(poolReport.ExpectedCost) || 0;
      targetAggregate.walletLoss += Number(poolReport.walletLoss) || 0;
      targetAggregate.slipageAndloss += Number(poolReport.slipageAndloss) || 0;
      targetAggregate.pP += Number(poolReport.pP) || 0;
      targetAggregate.cost += Number(poolReport.cost) || 0;
      targetAggregate.totalCost += Number(poolReport.totalCost) || 0;
      targetAggregate.netCost += Number(poolReport.netCost) || 0;
      targetAggregate.priceImpact += Number(poolReport.priceImpact) || 0;
      targetAggregate.tip += Number(poolReport.tip) || 0;
      targetAggregate.clientRevenueCost += Number(poolReport.clientRevenueCost) || 0;
      targetAggregate.netCompanyCost += Number(poolReport.netCompanyCost) || 0;


      // For averages, accumulate sums
      // targetAggregate.solAverageSum += Number(poolReport.solAverage) || 0;
      // targetAggregate.tokenAverageSum += Number(poolReport.tokenAverage) || 0;
      // targetAggregate.pooledTokenAverageSum += Number(poolReport.pooledTokenAverage) || 0;
      // targetAggregate.pooledSolAverageSum += Number(poolReport.pooledSolAverage) || 0;
      targetAggregate.count++;

      // Sum wallet counts
      targetAggregate.walletCount += Number(poolReport.walletCount) || 0;
      targetAggregate.poolCount++;

      // Set time fields from first report
      if (targetAggregate.from_time === 0) {
        targetAggregate.from_time = Number(poolReport.from_time) || 0;
        targetAggregate.to_time = Number(poolReport.to_time) || 0;
      }
    }

    // Calculate averages for each tokenAddress + poolType combination
    const allAggregates = [];

    for (const tokenAddress in aggregatesByTokenAndType) {
      const tokenAggregates = aggregatesByTokenAndType[tokenAddress];
      const clmmAgg = tokenAggregates['clmm'];
      const rwaAgg = tokenAggregates['rwa'];

      // First, create clmm+rwa aggregate BEFORE we delete the sum fields
      // Only create clmm+rwa if both clmm and rwa exist
      if (clmmAgg && rwaAgg) {
        // Calculate weighted averages based on poolCount
        const totalClmmRwaPools = (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0);
        // const clmmWeight = totalClmmRwaPools > 0 ? (clmmAgg.poolCount || 0) / totalClmmRwaPools : 0.5;
        // const rwaWeight = totalClmmRwaPools > 0 ? (rwaAgg.poolCount || 0) / totalClmmRwaPools : 0.5;

        // // Calculate averages for clmm and rwa before combining
        // const clmmSolAvg = clmmAgg.count > 0 ? clmmAgg.solAverageSum / clmmAgg.count : 0;
        // const clmmTokenAvg = clmmAgg.count > 0 ? clmmAgg.tokenAverageSum / clmmAgg.count : 0;
        // const clmmPooledTokenAvg = clmmAgg.count > 0 ? clmmAgg.pooledTokenAverageSum / clmmAgg.count : 0;
        // const clmmPooledSolAvg = clmmAgg.count > 0 ? clmmAgg.pooledSolAverageSum / clmmAgg.count : 0;

        // const rwaSolAvg = rwaAgg.count > 0 ? rwaAgg.solAverageSum / rwaAgg.count : 0;
        // const rwaTokenAvg = rwaAgg.count > 0 ? rwaAgg.tokenAverageSum / rwaAgg.count : 0;
        // const rwaPooledTokenAvg = rwaAgg.count > 0 ? rwaAgg.pooledTokenAverageSum / rwaAgg.count : 0;
        // const rwaPooledSolAvg = rwaAgg.count > 0 ? rwaAgg.pooledSolAverageSum / rwaAgg.count : 0;

        const clmmRwaAggregate = {
          tokenAddress: tokenAddress,
          poolType: 'clmm+rwa',
          totalTransactions: (clmmAgg.totalTransactions || 0) + (rwaAgg.totalTransactions || 0),
          totalVolume: (clmmAgg.totalVolume || 0) + (rwaAgg.totalVolume || 0),
          mmTotalVolume: (clmmAgg.mmTotalVolume || 0) + (rwaAgg.mmTotalVolume || 0),
          usersTotalVolume: ((clmmAgg.usersTotalVolume || 0) + (rwaAgg.usersTotalVolume || 0)),
          mmYeild: (clmmAgg.mmYeild || 0) + (rwaAgg.mmYeild || 0),
          poolYeild: (clmmAgg.poolYeild || 0) + (rwaAgg.poolYeild || 0),
          ARBuserYeild: (clmmAgg.ARBuserYeild || 0) + (rwaAgg.ARBuserYeild || 0),
          companysYeild: (clmmAgg.companysYeild || 0) + (rwaAgg.companysYeild || 0),
          usersYeild: ((clmmAgg.usersYeild || 0) + (rwaAgg.usersYeild || 0)),
          poolLiquidity: (clmmAgg.poolLiquidity || 0) + (rwaAgg.poolLiquidity || 0),
          companysLiquidity: (clmmAgg.companysLiquidity || 0) + (rwaAgg.companysLiquidity || 0),
          usersLiquidity: (clmmAgg.usersLiquidity || 0) + (rwaAgg.usersLiquidity || 0),
          buys: (clmmAgg.buys || 0) + (rwaAgg.buys || 0),
          sells: (clmmAgg.sells || 0) + (rwaAgg.sells || 0),
          resetBuys: (clmmAgg.resetBuys || 0) + (rwaAgg.resetBuys || 0),
          resetSells: (clmmAgg.resetSells || 0) + (rwaAgg.resetSells || 0),
          resetsVolume: (clmmAgg.resetsVolume || 0) + (rwaAgg.resetsVolume || 0),
          resetBuyVolumeUSD: (clmmAgg.resetBuyVolumeUSD || 0) + (rwaAgg.resetBuyVolumeUSD || 0),
          resetSellVolumeUSD: (clmmAgg.resetSellVolumeUSD || 0) + (rwaAgg.resetSellVolumeUSD || 0),
          agentBuys: (clmmAgg.agentBuys || 0) + (rwaAgg.agentBuys || 0),
          agentSells: (clmmAgg.agentSells || 0) + (rwaAgg.agentSells || 0),
          agentsVolume: (clmmAgg.agentsVolume || 0) + (rwaAgg.agentsVolume || 0),
          bundles: (clmmAgg.bundles || 0) + (rwaAgg.bundles || 0),
          // pooledTokenAverage: clmmPooledTokenAvg * clmmWeight + rwaPooledTokenAvg * rwaWeight,
          // pooledSolAverage: clmmPooledSolAvg * clmmWeight + rwaPooledSolAvg * rwaWeight,
          lpAdd: (clmmAgg.lpAdd || 0) + (rwaAgg.lpAdd || 0),
          gasFee: (clmmAgg.gasFee || 0) + (rwaAgg.gasFee || 0),
          gasFeeInDollars: (clmmAgg.gasFeeInDollars || 0) + (rwaAgg.gasFeeInDollars || 0),
          mmRayFee: (clmmAgg.mmRayFee || 0) + (rwaAgg.mmRayFee || 0),
          poolRayFee: (clmmAgg.poolRayFee || 0) + (rwaAgg.poolRayFee || 0),
          poolRayCost: (clmmAgg.poolRayCost || 0) + (rwaAgg.poolRayCost || 0),
          mmRayCost: (clmmAgg.mmRayCost || 0) + (rwaAgg.mmRayCost || 0),
          walletEndBalance: (clmmAgg.walletEndBalance || 0) + (rwaAgg.walletEndBalance || 0),
          walletStartBalance: (clmmAgg.walletStartBalance || 0) + (rwaAgg.walletStartBalance || 0),
          ExpectedCost: (clmmAgg.ExpectedCost || 0) + (rwaAgg.ExpectedCost || 0),
          walletLoss: (clmmAgg.walletLoss || 0) + (rwaAgg.walletLoss || 0),
          slipageAndloss: (clmmAgg.slipageAndloss || 0) + (rwaAgg.slipageAndloss || 0),
          pP: (clmmAgg.pP || 0) + (rwaAgg.pP || 0),
          cost: (clmmAgg.cost || 0) + (rwaAgg.cost || 0),
          totalCost: (clmmAgg.totalCost || 0) + (rwaAgg.totalCost || 0),
          netCost: (clmmAgg.netCost || 0) + (rwaAgg.netCost || 0),
          netCompanyCost: (clmmAgg.netCompanyCost || 0) + (rwaAgg.netCompanyCost || 0),
          clientRevenueCost: (clmmAgg.clientRevenueCost || 0) + (rwaAgg.clientRevenueCost || 0),
          priceImpact: (clmmAgg.priceImpact || 0) + (rwaAgg.priceImpact || 0),
          tip: (clmmAgg.tip || 0) + (rwaAgg.tip || 0),
          solAverage: clmmAgg.solAverage ?? rwaAgg.solAverage ?? solAverageFromResponse,
          tokenAverage: clmmAgg.tokenAverage || rwaAgg.tokenAverage || 0,
          poolCount: (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0),
          walletCount: (clmmAgg.walletCount || 0) + (rwaAgg.walletCount || 0),
          from_time: clmmAgg.from_time || rwaAgg.from_time || 0,
          to_time: clmmAgg.to_time || rwaAgg.to_time || 0
        };

        // Add clmm+rwa aggregate to the array
        allAggregates.push(clmmRwaAggregate);
        console.log(`✅ Created clmm+rwa aggregate for tokenAddress: ${tokenAddress}`);
      }

      // Now process individual pool types (cpmm, clmm, rwa) and calculate their averages
      for (const poolType in tokenAggregates) {
        const agg = tokenAggregates[poolType];

        // Calculate averages
        // if (agg.count > 0) {
        //   agg.solAverage = agg.solAverageSum / agg.count;
        //   agg.tokenAverage = agg.tokenAverageSum / agg.count;
        //   agg.pooledTokenAverage = agg.pooledTokenAverageSum / agg.count;
        //   agg.pooledSolAverage = agg.pooledSolAverageSum / agg.count;
        // } else {
        //   // If count is 0, set averages to 0
        //   agg.solAverage = 0;
        //   agg.tokenAverage = 0;
        //   agg.pooledTokenAverage = 0;
        //   agg.pooledSolAverage = 0;
        // }

        // // Remove temporary fields
        // delete agg.solAverageSum;
        // delete agg.tokenAverageSum;
        // delete agg.pooledTokenAverageSum;
        // delete agg.pooledSolAverageSum;
        delete agg.count;

        // Add to flat array for easier processing
        allAggregates.push(agg);
      }
    }

    // Log summary for each tokenAddress with detailed breakdown
    for (const tokenAddress in aggregatesByTokenAndType) {
      const poolTypes = Object.keys(aggregatesByTokenAndType[tokenAddress]);
      const hasClmmRwa = poolTypes.includes('clmm') && poolTypes.includes('rwa');
      console.log(`\n📋 TokenAddress: ${tokenAddress}`);
      console.log(`   PoolTypes found: ${poolTypes.join(', ')}${hasClmmRwa ? ' + clmm+rwa' : ''}`);

      // Log details for each poolType
      for (const poolType of poolTypes) {
        const agg = aggregatesByTokenAndType[tokenAddress][poolType];
        console.log(`   ${poolType.toUpperCase()}: totalTransactions=${agg.totalTransactions}, totalVolume=${agg.totalVolume.toFixed(2)}, poolCount=${agg.poolCount}, walletCount=${agg.walletCount}`);
      }
    }

    console.log(`\n📊 Created ${allAggregates.length} aggregates for ${Object.keys(aggregatesByTokenAndType).length} unique tokenAddresses`);

    // Return all aggregates as a flat array
    return {
      allAggregates,
      totalPoolReports: poolReports.length
    };
  } catch (error) {
    console.error(`Error calculating daily pool type aggregate for ${startTime}:`, error);
    return null;
  }
};


//added on 02012026   (commented on 02022026)
// const calculateDailyPoolReportAggregates = async (startTime) => {
//   try {
//     console.log(`📅 Calculating daily pool type aggregates for date: ${startTime}`);

//     // Get all pool reports for this date
//     const poolReports = await PoolReport.find({ startTime: startTime });

//     if (!poolReports || poolReports.length === 0) {
//       console.log(`⚠️ No pool reports found for startTime: ${startTime}`);
//       return null;
//     }

//     console.log(`📊 Found ${poolReports.length} pool reports for date ${startTime}`);

//     // Get unique pairAddresses from pool reports
//     const uniquePairAddresses = [...new Set(poolReports.map(pr => pr.pairAddress))];
//     console.log(`🔍 Found ${uniquePairAddresses.length} unique pairAddresses in pool reports`);

//     // Get pool types only for the pairAddresses that exist in pool reports (as fallback)
//     const liquidityPools = await RWASchema.find({
//       pairAddress: { $in: uniquePairAddresses }
//     });
//     const poolTypeMap = {};
//     liquidityPools.forEach(pool => {
//       poolTypeMap[pool.pairAddress] = pool.poolType?.toLowerCase() || 'unknown';
//     });

//     console.log(`📋 Mapped ${Object.keys(poolTypeMap).length} pairAddresses to pool types (fallback)`);

//     // Fetch SOL price once for this date (address + API token) — used only for solAverage, not aggregated
//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token: process.env.SOL_API_TOKEN || "",
//       },
//     };
//     const SOL_ADDRESS = "So11111111111111111111111111111111111111112";
//     let solAverageFromResponse = 0;
//     try {
//       const responseSolPrice = await fetch(
//         `https://pro-api.solscan.io/v2.0/token/price?address=${SOL_ADDRESS}&from_time=${startTime}&to_time=${startTime}`,
//         requestOptions
//       );
//       if (responseSolPrice.ok) {
//         const solPriceData = await responseSolPrice.json();
//         solAverageFromResponse = solPriceData?.data?.[0]?.price || 0;
//       }
//     } catch (err) {
//       console.warn("Could not fetch SOL price for solAverage:", err?.message);
//     }

//     // Count pool reports by tokenAddress and poolType for debugging
//     const reportCounts = {};
//     poolReports.forEach(pr => {
//       const tokenAddr = pr.tokenAddress || 'unknown';
//       const poolType = pr.poolType?.toLowerCase() || poolTypeMap[pr.pairAddress] || 'unknown';
//       const key = `${tokenAddr}_${poolType}`;
//       reportCounts[key] = (reportCounts[key] || 0) + 1;
//     });
//     console.log(`📊 Pool reports breakdown:`, Object.entries(reportCounts).slice(0, 10));

//     // Group pool reports by tokenAddress and poolType
//     // Structure: { tokenAddress: { poolType: aggregateData } }
//     const aggregatesByTokenAndType = {};

//     // Process each pool report
//     for (const poolReport of poolReports) {
//       // Get poolType - prioritize poolReport.poolType (already saved) over poolTypeMap
//       let poolType = poolReport.poolType?.toLowerCase() || poolTypeMap[poolReport.pairAddress];

//       if (!poolType || poolType === 'unknown' || poolType === '') {
//         console.log(`⚠️ No pool type found for pairAddress: ${poolReport.pairAddress}, tokenAddress: ${poolReport.tokenAddress}, skipping...`);
//         continue;
//       }

//       // Normalize poolType
//       poolType = poolType.toLowerCase().trim();

//       // Skip clmm+rwa as it's a combined type, we only want individual types
//       if (poolType === 'clmm+rwa') {
//         continue;
//       }

//       const tokenAddress = poolReport.tokenAddress;
//       if (!tokenAddress) {
//         console.log(`⚠️ No tokenAddress found for pairAddress: ${poolReport.pairAddress}, skipping...`);
//         continue;
//       }

//       // Initialize structure for this tokenAddress if it doesn't exist
//       if (!aggregatesByTokenAndType[tokenAddress]) {
//         aggregatesByTokenAndType[tokenAddress] = {};
//       }

//       // Initialize aggregate for this tokenAddress + poolType combination if it doesn't exist
//       if (!aggregatesByTokenAndType[tokenAddress][poolType]) {
//         aggregatesByTokenAndType[tokenAddress][poolType] = {
//           tokenAddress: tokenAddress,
//           poolType: poolType,
//           totalTransactions: 0,
//           totalVolume: 0,
//           mmTotalVolume: 0,
//           usersTotalVolume: 0,
//           mmYeild: 0,
//           poolYeild: 0,
//           ARBuserYeild: 0,
//           companysYeild: 0,
//           usersYeild: 0,
//           poolLiquidity: 0,
//           companysLiquidity: 0,
//           usersLiquidity: 0,
//           buys: 0,
//           sells: 0,
//           resetBuys: 0,
//           resetSells: 0,
//           resetsVolume: 0,
//           resetBuyVolumeUSD: 0,
//           resetSellVolumeUSD: 0,
//           agentBuys: 0,
//           agentSells: 0,
//           agentsVolume: 0,
//           bundles: 0,
//           // pooledTokenAverage: 0,
//           // pooledSolAverage: 0,
//           lpAdd: 0,
//           gasFee: 0,
//           gasFeeInDollars: 0,
//           mmRayFee: 0,
//           poolRayFee: 0,
//           poolRayCost: 0,
//           mmRayCost: 0,
//           walletEndBalance: 0,
//           walletStartBalance: 0,
//           ExpectedCost: 0,
//           walletLoss: 0,
//           slipageAndloss: 0,
//           pP: 0,
//           cost: 0,
//           totalCost: 0,
//           netCost: 0,
//           priceImpact: 0,
//           tip: 0,
//           solAverage: 0,
//           // tokenAverage: 0,
//           poolCount: 0,
//           walletCount: 0,
//           // solAverageSum: 0,
//           // tokenAverageSum: 0,
//           // pooledTokenAverageSum: 0,
//           // pooledSolAverageSum: 0,
//           netCompanyCost: 0,
//           clientRevenueCost: 0,
//           count: 0,
//           from_time: 0,
//           to_time: 0
//         };
//       }

//       // Get the aggregate for this tokenAddress + poolType combination
//       const targetAggregate = aggregatesByTokenAndType[tokenAddress][poolType];

//       // Add solAverage from SOL price API response only (address + API token) — not aggregated
//       targetAggregate.solAverage = solAverageFromResponse;

//       // Sum all numeric fields - ensure we're using the actual values from pool report
//       const reportTransactions = Number(poolReport.totalTransactions) || 0;
//       const reportVolume = Number(poolReport.totalVolume) || 0;
//       console.log("poolReport.netCompanyCost",poolReport.netCompanyCost);
//       console.log("targetAggregate.netCompanyCost",targetAggregate.netCompanyCost);


//       targetAggregate.totalTransactions += reportTransactions;
//       targetAggregate.totalVolume += Number(poolReport.totalVolume) || 0;
//       targetAggregate.mmTotalVolume += Number(poolReport.mmTotalVolume) || 0;
//       targetAggregate.usersTotalVolume += Number(poolReport.usersTotalVolume) || 0;
//       targetAggregate.mmRayFee += Number(poolReport.mmRayFee) || 0;
//       targetAggregate.poolRayFee += Number(poolReport.poolRayFee) || 0;
//       targetAggregate.ARBuserYeild += Number(poolReport.ARBuserYeild) || 0;
//       targetAggregate.mmYeild += Number(poolReport.mmYeild) || 0;
//       targetAggregate.poolYeild += Number(poolReport.poolYeild) || 0;
//       targetAggregate.companysYeild += Number(poolReport.companysYeild) || 0;
//       targetAggregate.usersYeild += Number(poolReport.usersYeild) || 0;
//       targetAggregate.poolLiquidity += Number(poolReport.poolLiquidity) || 0;
//       targetAggregate.companysLiquidity += Number(poolReport.companysLiquidity) || 0;
//       targetAggregate.usersLiquidity += Number(poolReport.usersLiquidity) || 0;
//       targetAggregate.buys += Number(poolReport.buys) || 0;
//       targetAggregate.sells += Number(poolReport.sells) || 0;
//       targetAggregate.resetBuys += Number(poolReport.resetBuys) || 0;
//       targetAggregate.resetSells += Number(poolReport.resetSells) || 0;
//       targetAggregate.resetsVolume += Number(poolReport.resetsVolume) || 0;
//       targetAggregate.resetBuyVolumeUSD += Number(poolReport.resetBuyVolumeUSD) || 0;
//       targetAggregate.resetSellVolumeUSD += Number(poolReport.resetSellVolumeUSD) || 0;
//       targetAggregate.agentBuys += Number(poolReport.agentBuys) || 0;
//       targetAggregate.agentSells += Number(poolReport.agentSells) || 0;
//       targetAggregate.agentsVolume += Number(poolReport.agentsVolume) || 0;
//       targetAggregate.bundles += Number(poolReport.bundles) || 0;
//       targetAggregate.lpAdd += Number(poolReport.lpAdd) || 0;
//       targetAggregate.gasFee += Number(poolReport.gasFee) || 0;
//       targetAggregate.gasFeeInDollars += Number(poolReport.gasFeeInDollars) || 0;
//       targetAggregate.poolRayCost += Number(poolReport.poolRayCost) || 0;
//       targetAggregate.mmRayCost += Number(poolReport.mmRayCost) || 0;
//       targetAggregate.walletEndBalance += Number(poolReport.walletEndBalance) || 0;
//       targetAggregate.walletStartBalance += Number(poolReport.walletStartBalance) || 0;
//       targetAggregate.ExpectedCost += Number(poolReport.ExpectedCost) || 0;
//       targetAggregate.walletLoss += Number(poolReport.walletLoss) || 0;
//       targetAggregate.slipageAndloss += Number(poolReport.slipageAndloss) || 0;
//       targetAggregate.pP += Number(poolReport.pP) || 0;
//       targetAggregate.cost += Number(poolReport.cost) || 0;
//       targetAggregate.totalCost += Number(poolReport.totalCost) || 0;
//       targetAggregate.netCost += Number(poolReport.netCost) || 0;
//       targetAggregate.priceImpact += Number(poolReport.priceImpact) || 0;
//       targetAggregate.tip += Number(poolReport.tip) || 0;
//       targetAggregate.clientRevenueCost += Number(poolReport.clientRevenueCost) || 0;
//       targetAggregate.netCompanyCost += Number(poolReport.netCompanyCost) || 0;


//       // For averages, accumulate sums
//       // targetAggregate.solAverageSum += Number(poolReport.solAverage) || 0;
//       // targetAggregate.tokenAverageSum += Number(poolReport.tokenAverage) || 0;
//       // targetAggregate.pooledTokenAverageSum += Number(poolReport.pooledTokenAverage) || 0;
//       // targetAggregate.pooledSolAverageSum += Number(poolReport.pooledSolAverage) || 0;
//       targetAggregate.count++;

//       // Sum wallet counts
//       targetAggregate.walletCount += Number(poolReport.walletCount) || 0;
//       targetAggregate.poolCount++;

//       // Set time fields from first report
//       if (targetAggregate.from_time === 0) {
//         targetAggregate.from_time = Number(poolReport.from_time) || 0;
//         targetAggregate.to_time = Number(poolReport.to_time) || 0;
//       }
//     }

//     // Calculate averages for each tokenAddress + poolType combination
//     const allAggregates = [];

//     for (const tokenAddress in aggregatesByTokenAndType) {
//       const tokenAggregates = aggregatesByTokenAndType[tokenAddress];
//       const clmmAgg = tokenAggregates['clmm'];
//       const rwaAgg = tokenAggregates['rwa'];

//       // First, create clmm+rwa aggregate BEFORE we delete the sum fields
//       // Only create clmm+rwa if both clmm and rwa exist
//       if (clmmAgg && rwaAgg) {
//         // Calculate weighted averages based on poolCount
//         const totalClmmRwaPools = (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0);
//         // const clmmWeight = totalClmmRwaPools > 0 ? (clmmAgg.poolCount || 0) / totalClmmRwaPools : 0.5;
//         // const rwaWeight = totalClmmRwaPools > 0 ? (rwaAgg.poolCount || 0) / totalClmmRwaPools : 0.5;

//         // // Calculate averages for clmm and rwa before combining
//         // const clmmSolAvg = clmmAgg.count > 0 ? clmmAgg.solAverageSum / clmmAgg.count : 0;
//         // const clmmTokenAvg = clmmAgg.count > 0 ? clmmAgg.tokenAverageSum / clmmAgg.count : 0;
//         // const clmmPooledTokenAvg = clmmAgg.count > 0 ? clmmAgg.pooledTokenAverageSum / clmmAgg.count : 0;
//         // const clmmPooledSolAvg = clmmAgg.count > 0 ? clmmAgg.pooledSolAverageSum / clmmAgg.count : 0;

//         // const rwaSolAvg = rwaAgg.count > 0 ? rwaAgg.solAverageSum / rwaAgg.count : 0;
//         // const rwaTokenAvg = rwaAgg.count > 0 ? rwaAgg.tokenAverageSum / rwaAgg.count : 0;
//         // const rwaPooledTokenAvg = rwaAgg.count > 0 ? rwaAgg.pooledTokenAverageSum / rwaAgg.count : 0;
//         // const rwaPooledSolAvg = rwaAgg.count > 0 ? rwaAgg.pooledSolAverageSum / rwaAgg.count : 0;

//         const clmmRwaAggregate = {
//           tokenAddress: tokenAddress,
//           poolType: 'clmm+rwa',
//           totalTransactions: (clmmAgg.totalTransactions || 0) + (rwaAgg.totalTransactions || 0),
//           totalVolume: (clmmAgg.totalVolume || 0) + (rwaAgg.totalVolume || 0),
//           mmTotalVolume: (clmmAgg.mmTotalVolume || 0) + (rwaAgg.mmTotalVolume || 0),
//           usersTotalVolume: ((clmmAgg.usersTotalVolume || 0) + (rwaAgg.usersTotalVolume || 0)),
//           mmYeild: (clmmAgg.mmYeild || 0) + (rwaAgg.mmYeild || 0),
//           poolYeild: (clmmAgg.poolYeild || 0) + (rwaAgg.poolYeild || 0),
//           ARBuserYeild: (clmmAgg.ARBuserYeild || 0) + (rwaAgg.ARBuserYeild || 0),
//           companysYeild: (clmmAgg.companysYeild || 0) + (rwaAgg.companysYeild || 0),
//           usersYeild: ((clmmAgg.usersYeild || 0) + (rwaAgg.usersYeild || 0)),
//           poolLiquidity: (clmmAgg.poolLiquidity || 0) + (rwaAgg.poolLiquidity || 0),
//           companysLiquidity: (clmmAgg.companysLiquidity || 0) + (rwaAgg.companysLiquidity || 0),
//           usersLiquidity: (clmmAgg.usersLiquidity || 0) + (rwaAgg.usersLiquidity || 0),
//           buys: (clmmAgg.buys || 0) + (rwaAgg.buys || 0),
//           sells: (clmmAgg.sells || 0) + (rwaAgg.sells || 0),
//           resetBuys: (clmmAgg.resetBuys || 0) + (rwaAgg.resetBuys || 0),
//           resetSells: (clmmAgg.resetSells || 0) + (rwaAgg.resetSells || 0),
//           resetsVolume: (clmmAgg.resetsVolume || 0) + (rwaAgg.resetsVolume || 0),
//           resetBuyVolumeUSD: (clmmAgg.resetBuyVolumeUSD || 0) + (rwaAgg.resetBuyVolumeUSD || 0),
//           resetSellVolumeUSD: (clmmAgg.resetSellVolumeUSD || 0) + (rwaAgg.resetSellVolumeUSD || 0),
//           agentBuys: (clmmAgg.agentBuys || 0) + (rwaAgg.agentBuys || 0),
//           agentSells: (clmmAgg.agentSells || 0) + (rwaAgg.agentSells || 0),
//           agentsVolume: (clmmAgg.agentsVolume || 0) + (rwaAgg.agentsVolume || 0),
//           bundles: (clmmAgg.bundles || 0) + (rwaAgg.bundles || 0),
//           // pooledTokenAverage: clmmPooledTokenAvg * clmmWeight + rwaPooledTokenAvg * rwaWeight,
//           // pooledSolAverage: clmmPooledSolAvg * clmmWeight + rwaPooledSolAvg * rwaWeight,
//           lpAdd: (clmmAgg.lpAdd || 0) + (rwaAgg.lpAdd || 0),
//           gasFee: (clmmAgg.gasFee || 0) + (rwaAgg.gasFee || 0),
//           gasFeeInDollars: (clmmAgg.gasFeeInDollars || 0) + (rwaAgg.gasFeeInDollars || 0),
//           mmRayFee: (clmmAgg.mmRayFee || 0) + (rwaAgg.mmRayFee || 0),
//           poolRayFee: (clmmAgg.poolRayFee || 0) + (rwaAgg.poolRayFee || 0),
//           poolRayCost: (clmmAgg.poolRayCost || 0) + (rwaAgg.poolRayCost || 0),
//           mmRayCost: (clmmAgg.mmRayCost || 0) + (rwaAgg.mmRayCost || 0),
//           walletEndBalance: (clmmAgg.walletEndBalance || 0) + (rwaAgg.walletEndBalance || 0),
//           walletStartBalance: (clmmAgg.walletStartBalance || 0) + (rwaAgg.walletStartBalance || 0),
//           ExpectedCost: (clmmAgg.ExpectedCost || 0) + (rwaAgg.ExpectedCost || 0),
//           walletLoss: (clmmAgg.walletLoss || 0) + (rwaAgg.walletLoss || 0),
//           slipageAndloss: (clmmAgg.slipageAndloss || 0) + (rwaAgg.slipageAndloss || 0),
//           pP: (clmmAgg.pP || 0) + (rwaAgg.pP || 0),
//           cost: (clmmAgg.cost || 0) + (rwaAgg.cost || 0),
//           totalCost: (clmmAgg.totalCost || 0) + (rwaAgg.totalCost || 0),
//           netCost: (clmmAgg.netCost || 0) + (rwaAgg.netCost || 0),
//           netCompanyCost:(clmmAgg.netCompanyCost || 0) + (rwaAgg.netCompanyCost || 0),
//           clientRevenueCost: (clmmAgg.clientRevenueCost || 0) + (rwaAgg.clientRevenueCost || 0),
//           priceImpact: (clmmAgg.priceImpact || 0) + (rwaAgg.priceImpact || 0),
//           tip: (clmmAgg.tip || 0) + (rwaAgg.tip || 0),
//           // solAverage: clmmSolAvg * clmmWeight + rwaSolAvg * rwaWeight,
//           // tokenAverage: clmmTokenAvg * clmmWeight + rwaTokenAvg * rwaWeight,
//           poolCount: (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0),
//           walletCount: (clmmAgg.walletCount || 0) + (rwaAgg.walletCount || 0),
//           from_time: clmmAgg.from_time || rwaAgg.from_time || 0,
//           to_time: clmmAgg.to_time || rwaAgg.to_time || 0
//         };

//         // Add clmm+rwa aggregate to the array
//         allAggregates.push(clmmRwaAggregate);
//         console.log(`✅ Created clmm+rwa aggregate for tokenAddress: ${tokenAddress}`);
//       }

//       // Now process individual pool types (cpmm, clmm, rwa) and calculate their averages
//       for (const poolType in tokenAggregates) {
//         const agg = tokenAggregates[poolType];

//         // Calculate averages
//         // if (agg.count > 0) {
//         //   agg.solAverage = agg.solAverageSum / agg.count;
//         //   agg.tokenAverage = agg.tokenAverageSum / agg.count;
//         //   agg.pooledTokenAverage = agg.pooledTokenAverageSum / agg.count;
//         //   agg.pooledSolAverage = agg.pooledSolAverageSum / agg.count;
//         // } else {
//         //   // If count is 0, set averages to 0
//         //   agg.solAverage = 0;
//         //   agg.tokenAverage = 0;
//         //   agg.pooledTokenAverage = 0;
//         //   agg.pooledSolAverage = 0;
//         // }

//         // // Remove temporary fields
//         // delete agg.solAverageSum;
//         // delete agg.tokenAverageSum;
//         // delete agg.pooledTokenAverageSum;
//         // delete agg.pooledSolAverageSum;
//         delete agg.count;

//         // Add to flat array for easier processing
//         allAggregates.push(agg);
//       }
//     }

//     // Log summary for each tokenAddress with detailed breakdown
//     for (const tokenAddress in aggregatesByTokenAndType) {
//       const poolTypes = Object.keys(aggregatesByTokenAndType[tokenAddress]);
//       const hasClmmRwa = poolTypes.includes('clmm') && poolTypes.includes('rwa');
//       console.log(`\n📋 TokenAddress: ${tokenAddress}`);
//       console.log(`   PoolTypes found: ${poolTypes.join(', ')}${hasClmmRwa ? ' + clmm+rwa' : ''}`);

//       // Log details for each poolType
//       for (const poolType of poolTypes) {
//         const agg = aggregatesByTokenAndType[tokenAddress][poolType];
//         console.log(`   ${poolType.toUpperCase()}: totalTransactions=${agg.totalTransactions}, totalVolume=${agg.totalVolume.toFixed(2)}, poolCount=${agg.poolCount}, walletCount=${agg.walletCount}`);
//       }
//     }

//     console.log(`\n📊 Created ${allAggregates.length} aggregates for ${Object.keys(aggregatesByTokenAndType).length} unique tokenAddresses`);

//     // Return all aggregates as a flat array
//     return {
//       allAggregates,
//       totalPoolReports: poolReports.length
//     };
//   } catch (error) {
//     console.error(`Error calculating daily pool type aggregate for ${startTime}:`, error);
//     return null;
//   }
// };



exports.SaveDailyWalletReportsAggregates = async (req, res) => {
  try {
    // Get yesterday's date in YYYYMMDD format (same as pool reports)
    const startTime = Number(moment.utc().subtract(1, "days").format("YYYYMMDD"));
    const endTime = startTime;

    console.log(`📅 Starting daily pool type aggregates calculation for date: ${startTime} (${moment.utc().subtract(1, "days").format("YYYY-MM-DD")})`);

    // Calculate aggregates using helper function
    const aggregateResult = await calculateDailyPoolReportAggregates(startTime);
    console.log(aggregateResult, "aggregateResult");


    if (!aggregateResult) {
      console.log(`⚠️ No aggregate data calculated for startTime: ${startTime}`);
      if (res) {
        return res.status(404).json({
          success: false,
          message: `No pool reports found for startTime: ${startTime}`,
          startTime: startTime,
        });
      }
      return;
    }

    const { allAggregates, totalPoolReports } = aggregateResult;

    // Save all aggregates (one per tokenAddress + poolType combination)
    const savedAggregates = [];

    console.log(`📊 Processing ${allAggregates.length} aggregates to save`);

    for (const aggregateData of allAggregates) {
      const { tokenAddress, poolType } = aggregateData;

      // Check if aggregate already exists
      const existingAggregate = await DailyPoolTypeAggregate.findOne({
        startTime: startTime,
        tokenAddress: tokenAddress,
        poolType: poolType
      });

      if (existingAggregate) {
        console.log(`⏩ Skipping tokenAddress: ${tokenAddress}, poolType: ${poolType} - already exists for ${startTime}`);
        savedAggregates.push({ tokenAddress, poolType, status: "skipped", reason: "already exists" });
        continue;
      }

      // Add startTime and endTime
      aggregateData.startTime = startTime;
      aggregateData.endTime = endTime;

      // Save to database
      console.log(`💾 Saving aggregate - tokenAddress: ${tokenAddress}, poolType: ${poolType}`);
      const newAggregate = new DailyPoolTypeAggregate(aggregateData);
      await newAggregate.save();

      console.log(`✅ Saved aggregate - tokenAddress: ${tokenAddress}, poolType: ${poolType}, startTime: ${startTime}`);
      savedAggregates.push({ tokenAddress, poolType, status: "success" });
    }

    const summary = {
      startTime,
      endTime,
      totalPoolReports,
      savedAggregates
    };

    console.log(`✅ Daily pool type aggregates calculation completed:`, summary);

    if (res) {
      return res.status(200).json({
        success: true,
        message: `Daily pool type aggregates calculated and saved for ${savedAggregates.filter(a => a.status === 'success').length} tokenAddress + poolType combinations`,
        data: summary,
      });
    }
  } catch (error) {
    console.error("Error in SaveDailyWalletReportsAggregates:", error);
    if (res) {
      return res.status(500).json({
        success: false,
        message: "Internal server error while calculating daily pool type aggregates.",
        error: error.message,
      });
    }
  }
};



exports.getDailyWalletReportsAggregates = async (req, res) => {
  try {
    const {
      tokenAddress,
      poolType,
      startTime,
      endTime,
      page = 1,
      limit = 10,
    } = req.query;

    // Parse pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filters
    const filter = {};
    if (tokenAddress) filter.tokenAddress = tokenAddress.trim();
    const normalizedPoolType = poolType ? poolType.trim().replace(/\s+/g, '+').toLowerCase() : null;
    if (normalizedPoolType) {
      filter.poolType = normalizedPoolType;
    }
    if (startTime) filter.startTime = Number(startTime);
    if (endTime) filter.endTime = Number(endTime);

    // If startTime is provided but endTime is not, set endTime to startTime (single day)
    if (filter.startTime && !filter.endTime) {
      filter.endTime = filter.startTime;
    }

    let aggregates = [];
    let totalCount = 0;

    // Special handling for clmm+rwa queries
    if (normalizedPoolType === 'clmm+rwa') {
      // First, try to find existing clmm+rwa aggregates
      const clmmRwaFilter = { ...filter };
      clmmRwaFilter.poolType = 'clmm+rwa';

      const existingClmmRwa = await DailyPoolTypeAggregate
        .find(clmmRwaFilter)
        .sort({ startTime: -1 })
        .lean();

      // Build filter for individual rwa and clmm aggregates
      const individualFilter = { ...filter };
      delete individualFilter.poolType;
      individualFilter.poolType = { $in: ['rwa', 'clmm'] };

      // Get all individual rwa and clmm aggregates
      const individualAggregates = await DailyPoolTypeAggregate
        .find(individualFilter)
        .sort({ startTime: -1, tokenAddress: 1 })
        .lean();

      // Group by tokenAddress and startTime
      const groupedByToken = {};
      individualAggregates.forEach(agg => {
        const key = `${agg.tokenAddress}_${agg.startTime}`;
        if (!groupedByToken[key]) {
          groupedByToken[key] = { tokenAddress: agg.tokenAddress, startTime: agg.startTime, rwa: null, clmm: null };
        }
        if (agg.poolType === 'rwa') {
          groupedByToken[key].rwa = agg;
        } else if (agg.poolType === 'clmm') {
          groupedByToken[key].clmm = agg;
        }
      });

      // Combine individual aggregates where clmm+rwa doesn't exist
      const combinedAggregates = [];
      Object.values(groupedByToken).forEach(group => {
        const hasClmmRwa = existingClmmRwa.some(agg =>
          agg.tokenAddress === group.tokenAddress && agg.startTime === group.startTime
        );

        // If clmm+rwa doesn't exist but we have rwa or clmm, create combined aggregate
        if (!hasClmmRwa && (group.rwa || group.clmm)) {
          const rwaAgg = group.rwa;
          const clmmAgg = group.clmm;

          if (rwaAgg && clmmAgg) {
            // Both exist - combine them with weighted averages
            const totalClmmRwaPools = (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0);
            const clmmWeight = totalClmmRwaPools > 0 ? (clmmAgg.poolCount || 0) / totalClmmRwaPools : 0.5;
            const rwaWeight = totalClmmRwaPools > 0 ? (rwaAgg.poolCount || 0) / totalClmmRwaPools : 0.5;

            const combined = {
              ...rwaAgg,
              _id: rwaAgg._id, // Keep one ID for reference
              poolType: 'clmm+rwa',
              totalTransactions: (clmmAgg.totalTransactions || 0) + (rwaAgg.totalTransactions || 0),
              totalVolume: (clmmAgg.totalVolume || 0) + (rwaAgg.totalVolume || 0),
              buys: (clmmAgg.buys || 0) + (rwaAgg.buys || 0),
              sells: (clmmAgg.sells || 0) + (rwaAgg.sells || 0),
              resetBuys: (clmmAgg.resetBuys || 0) + (rwaAgg.resetBuys || 0),
              resetSells: (clmmAgg.resetSells || 0) + (rwaAgg.resetSells || 0),
              resetsVolume: (clmmAgg.resetsVolume || 0) + (rwaAgg.resetsVolume || 0),
              resetBuyVolumeUSD: (clmmAgg.resetBuyVolumeUSD || 0) + (rwaAgg.resetBuyVolumeUSD || 0),
              resetSellVolumeUSD: (clmmAgg.resetSellVolumeUSD || 0) + (rwaAgg.resetSellVolumeUSD || 0),
              agentBuys: (clmmAgg.agentBuys || 0) + (rwaAgg.agentBuys || 0),
              agentSells: (clmmAgg.agentSells || 0) + (rwaAgg.agentSells || 0),
              agentsVolume: (clmmAgg.agentsVolume || 0) + (rwaAgg.agentsVolume || 0),
              bundles: (clmmAgg.bundles || 0) + (rwaAgg.bundles || 0),
              pooledTokenAverage: (clmmAgg.pooledTokenAverage || 0) * clmmWeight + (rwaAgg.pooledTokenAverage || 0) * rwaWeight,
              pooledSolAverage: (clmmAgg.pooledSolAverage || 0) * clmmWeight + (rwaAgg.pooledSolAverage || 0) * rwaWeight,
              lpAdd: (clmmAgg.lpAdd || 0) + (rwaAgg.lpAdd || 0),
              gasFee: (clmmAgg.gasFee || 0) + (rwaAgg.gasFee || 0),
              gasFeeInDollars: (clmmAgg.gasFeeInDollars || 0) + (rwaAgg.gasFeeInDollars || 0),
              rayFee: (clmmAgg.rayFee || 0) + (rwaAgg.rayFee || 0),
              walletEndBalance: (clmmAgg.walletEndBalance || 0) + (rwaAgg.walletEndBalance || 0),
              walletStartBalance: (clmmAgg.walletStartBalance || 0) + (rwaAgg.walletStartBalance || 0),
              ExpectedCost: (clmmAgg.ExpectedCost || 0) + (rwaAgg.ExpectedCost || 0),
              walletLoss: (clmmAgg.walletLoss || 0) + (rwaAgg.walletLoss || 0),
              slipageAndloss: (clmmAgg.slipageAndloss || 0) + (rwaAgg.slipageAndloss || 0),
              pP: (clmmAgg.pP || 0) + (rwaAgg.pP || 0),
              cost: (clmmAgg.cost || 0) + (rwaAgg.cost || 0),
              totalCost: (clmmAgg.totalCost || 0) + (rwaAgg.totalCost || 0),
              netCost: (clmmAgg.netCost || 0) + (rwaAgg.netCost || 0),
              priceImpact: (clmmAgg.priceImpact || 0) + (rwaAgg.priceImpact || 0),
              tip: (clmmAgg.tip || 0) + (rwaAgg.tip || 0),
              solAverage: (clmmAgg.solAverage || 0) * clmmWeight + (rwaAgg.solAverage || 0) * rwaWeight,
              tokenAverage: (clmmAgg.tokenAverage || 0) * clmmWeight + (rwaAgg.tokenAverage || 0) * rwaWeight,
              poolCount: (clmmAgg.poolCount || 0) + (rwaAgg.poolCount || 0),
              walletCount: (clmmAgg.walletCount || 0) + (rwaAgg.walletCount || 0),
            };
            combinedAggregates.push(combined);
          } else if (rwaAgg && !clmmAgg) {
            // Only RWA exists - use RWA data as clmm+rwa
            const combined = {
              ...rwaAgg,
              poolType: 'clmm+rwa',
            };
            combinedAggregates.push(combined);
          } else if (clmmAgg && !rwaAgg) {
            // Only CLMM exists - use CLMM data as clmm+rwa
            const combined = {
              ...clmmAgg,
              poolType: 'clmm+rwa',
            };
            combinedAggregates.push(combined);
          }
        }
      });

      // Combine existing clmm+rwa with newly combined ones
      aggregates = [...existingClmmRwa, ...combinedAggregates];

      // Sort by startTime descending
      aggregates.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));

      // Apply pagination
      totalCount = aggregates.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));
      aggregates = aggregates.slice(skip, skip + limitNumber);

      if (aggregates.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No daily pool reports aggregates found.",
          filter: filter,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Daily pool reports aggregates fetched successfully!",
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limitNumber,
        data: aggregates,
      });
    } else {
      // Normal query for other pool types
      // Count total reports
      totalCount = await DailyPoolTypeAggregate.countDocuments(filter);
      const totalPages = Math.max(1, Math.ceil(totalCount / limitNumber));

      // Fetch paginated results
      aggregates = await DailyPoolTypeAggregate
        .find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      if (!aggregates || aggregates.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No daily pool reports aggregates found.",
          filter: filter,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Daily pool reports aggregates fetched successfully!",
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limitNumber,
        data: aggregates,
      });
    }
  } catch (error) {
    console.error("Error fetching daily pool reports aggregates:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching daily pool reports aggregates.",
      error: error.message,
    });
  }
};



//new function added on 20-12-25
// API endpoint to get pool reports (with optional pairAddress and startTime)
exports.getPoolReports = async (req, res) => {
  try {
    const { pairAddress, startTime } = req.query;

    // If pairAddress is provided, calculate for that specific pair
    if (pairAddress) {
      const startTimeToUse = startTime || Number(moment.utc().subtract(1, "days").format("YYYYMMDD"));
      const poolReport = await calculateWalletReportForPair(pairAddress, startTimeToUse);

      if (!poolReport) {
        return res.status(404).json({
          success: false,
          message: `No pool report found for pairAddress: ${pairAddress}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Pool report for pairAddress: ${pairAddress}`,
        data: poolReport,
      });
    }

    // If no pairAddress, return error (or could return all - but that might be too much data)
    return res.status(400).json({
      success: false,
      message: "pairAddress is required",
    });
  } catch (error) {
    console.error("Error in getPoolReports API:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while calculating pool reports.",
      error: error.message,
    });
  }
};


exports.getSwapsData = async (req, res) => {
  try {
    console.log('entered');
    const {
      page = 1,
      limit = 10
    } = req.query;

    console.log("process.env.WALLET_GEN_API_KEY", process.env.WALLET_GEN_API_KEY);

    // const response = await axios.get(
    //   "https://dexmmapi.stringonchain.io/api/bot/getSwapBots",
    //   {
    //     params: {
    //       botStatus: "active",
    //       page,
    //       limit
    //     },
    //     headers: {
    //       "x-api-key": process.env.WALLET_GEN_API_KEY
    //     }
    //   }
    // );

    const response = await axios.get(
      "https://dexmmapi.stringonchain.io/api/bot/getSwapBots",
      {
        params: {
          botStatus: "active",
          page,
          limit
        },
        headers: {
          "x-api-key": process.env.WALLET_GEN_API_KEY,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://dexmmapi.stringonchain.io/",
          "Origin": "https://dexmmapi.stringonchain.io"
        },
        timeout: 10000
      }
    );

    console.log("response", response);

    const bots = response.data?.bots || [];
    const pagination = response.data?.pagination || {};

    const formattedData = bots.map(bot => ({
      mintA: bot.mintA,
      mintB: bot.mintB,
      poolId: bot.poolId,
      tradeMode: bot.tradeMode,
      symbol: bot.symbol,
      walletAddress: bot.walletAddress,
      pairSymbol: `${bot.mintASymbol}-${bot.mintBSymbol}`
    }));

    return res.status(200).json({
      success: true,
      pagination: {
        currentPage: pagination.page,
        limit: pagination.limit,
        total: pagination.totalBots,
        totalPages: pagination.totalPages
      },
      count: formattedData.length,
      data: formattedData
    });

  } catch (err) {
    console.error("❌ Backend error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


function normalizePoolType(poolType) {
  if (!poolType) return null;

  // If it's an array, take the first element
  const type = Array.isArray(poolType) ? poolType[0] : poolType;

  // Convert to string and lowercase
  const normalized = String(type).toLowerCase().trim();

  // Map to valid pool types
  if (normalized === 'cpmm' || normalized === 'clmm' || normalized === 'rwa') {
    return normalized;
  }

  // Default to null if not recognized
  return null;
}


// exports.walletAddDynamically = async (req, res) => {
//   try {
//     console.log("🚀 Starting walletAddDynamically...");

//     const allWallets = [];
//     let currentPage = 1;
//     let totalPages = 1;
//     const limit = 100; 

//     // Fetch all pages of wallets from external API
//     do {
//       try {
//         const response = await axios.get(
//           "https://dexmmapi.stringonchain.io/api/main/getWalletInfo",
//           {
//             params: {
//               status: 2, // Active wallets
//               page: currentPage,
//               limit: limit
//             },
//             headers: {
//               "x-api-key": process.env.WALLET_GEN_API_KEY
//             }
//           }
//         );

//         console.log(response, "response");

//         const wallets = response.data?.data || [];
//         const pagination = response.data?.pagination || {};

//         allWallets.push(...wallets);
//         totalPages = pagination.totalPages || 1;

//         console.log(`📄 Fetched page ${currentPage}/${totalPages}: ${wallets.length} wallets`);
//         currentPage++;

//         // Small delay to avoid rate limiting
//         if (currentPage <= totalPages) {
//           await new Promise(resolve => setTimeout(resolve, 200));
//         }
//       } catch (err) {
//         console.error(`❌ Error fetching page ${currentPage}:`, err.message);
//         break;
//       }
//     } while (currentPage <= totalPages);

//     console.log(`✅ Total wallets fetched: ${allWallets.length}`);

//     if (allWallets.length === 0) {
//       const result = {
//         success: true,
//         message: "No wallets found to add",
//         added: 0,
//         skipped: 0,
//         errors: 0
//       };
//       if (res) {
//         return res.status(200).json(result);
//       }
//       console.log("📊 Result:", result);
//       return result;
//     }

//     let addedCount = 0;
//     let skippedCount = 0;
//     let errorCount = 0;
//     const errors = [];

//     // Process each wallet
//     for (const wallet of allWallets) {
//       try {
//         // Check if wallet already exists
//         const existingWallet = await WalletSchema.findOne({ 
//           walletAddress: wallet.address 
//         });

//         if (existingWallet) {
//           skippedCount++;
//           continue;
//         }

//         // Find token by tokenAddress
//         const token = await Token.findOne({ 
//           tokenAddress: wallet.tokenAddress 
//         });

//         if (!token) {
//           errorCount++;
//           errors.push({
//             walletAddress: wallet.address,
//             error: `Token not found for tokenAddress: ${wallet.tokenAddress}`
//           });
//           console.warn(`⚠️ Token not found for wallet ${wallet.address}, tokenAddress: ${wallet.tokenAddress}`);
//           continue;
//         }

//         // Extract and normalize poolType
//         const rawPoolType = wallet.pooltype || wallet.poolType;
//         const normalizedPoolType = normalizePoolType(rawPoolType);

//         if (!normalizedPoolType) {
//           errorCount++;
//           errors.push({
//             walletAddress: wallet.address,
//             error: `Invalid or missing poolType: ${rawPoolType}`
//           });
//           console.warn(`⚠️ Invalid poolType for wallet ${wallet.address}: ${rawPoolType}`);
//           continue;
//         }

//         // Create new wallet
//         // Construct pairSymbol from available fields (same as in getWalletsData)
//         const pairSymbol = wallet.poolMintASymbol && wallet.tokenSymbol 
//           ? `${wallet.poolMintASymbol}/${wallet.tokenSymbol}` 
//           : wallet.tokenSymbol || "";

//         const newWallet = await WalletSchema.create({
//           walletAddress: wallet.address,
//           innerWalletAddress: wallet.MWalletAddress, 
//           tokenId: token._id,
//           pairAddress: wallet.pairAddress || "",
//           poolType: normalizedPoolType,
//           symbol: pairSymbol,
//         });

//         addedCount++;
//         console.log(`✅ Added wallet: ${wallet.address} (poolType: ${normalizedPoolType})`);
//       } catch (err) {
//         errorCount++;
//         errors.push({
//           walletAddress: wallet.address,
//           error: err.message
//         });
//         console.error(`❌ Error processing wallet ${wallet.address}:`, err.message);
//       }
//     }
//     console.log('added wallets Count', addedCount);

//     const result = {
//       success: true,
//       message: "Wallet addition process completed",
//       summary: {
//         totalFetched: allWallets.length,
//         added: addedCount,
//         skipped: skippedCount,
//         errors: errorCount
//       },
//       errors: errors.length > 0 ? errors : undefined
//     };

//     if (res) {
//       return res.status(200).json(result);
//     }
//     // If called from cron (no res), just log the result
//     console.log("📊 Result:", JSON.stringify(result, null, 2));
//     return result;

//   } catch (err) {
//     console.error("❌ Error in walletAddDynamically:", err);
//     const errorResult = {
//       success: false,
//       message: "Server error",
//       error: err.message
//     };
//     if (res) {
//       return res.status(500).json(errorResult);
//     }
//     // If called from cron, throw the error so it can be caught by the cron handler
//     throw err;
//   }
// };

//////////////////////////////////

//added on 19012026



// exports.walletAddDynamically = async (req, res) => {
//   try {
//     console.log("🚀 Starting walletAddDynamically...");

//     // Check if API key is configured
//     if (!process.env.WALLET_GEN_API_KEY) {
//       const errorMsg = "❌ WALLET_GEN_API_KEY environment variable is not set";
//       console.error(errorMsg);
//       const errorResult = {
//         success: false,
//         message: "API key not configured",
//         error: errorMsg,
//         added: 0,
//         skipped: 0,
//         errors: 0
//       };
//       if (res) {
//         return res.status(500).json(errorResult);
//       }
//       throw new Error(errorMsg);
//     }

//     console.log(`🔑 API Key present: ${process.env.WALLET_GEN_API_KEY ? 'Yes' : 'No'} (length: ${process.env.WALLET_GEN_API_KEY?.length || 0})`);

//     const allWallets = [];
//     let currentPage = 1;
//     let totalPages = 1;
//     const limit = 100; // Fetch more per page for efficiency

//     // Fetch all pages of wallets from external API
//     do {
//       try {
//         console.log(`📡 Fetching page ${currentPage} from API...`);
//         const response = await axios.get(
//           "https://dexmmapi.stringonchain.io/api/main/getWalletInfo",
//           {
//             params: {
//               status: 2, // Active wallets
//               page: currentPage,
//               limit: limit
//             },
//             headers: {
//               "x-api-key": process.env.WALLET_GEN_API_KEY,
//               "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
//               "Accept": "application/json",
//               "Accept-Language": "en-US,en;q=0.9",
//               "Referer": "https://dexmmapi.stringonchain.io/",
//               "Origin": "https://dexmmapi.stringonchain.io"
//             }
//           }
//         );

//         // Enhanced logging for debugging
//         console.log(`📥 API Response Status: ${response.status}`);
//         console.log(`📥 API Response Headers:`, JSON.stringify(response.headers, null, 2));
//         console.log(`📥 API Response Data Structure:`, {
//           hasData: !!response.data,
//           dataKeys: response.data ? Object.keys(response.data) : [],
//           hasDataArray: !!response.data?.data,
//           dataArrayLength: response.data?.data?.length || 0,
//           hasPagination: !!response.data?.pagination,
//           paginationKeys: response.data?.pagination ? Object.keys(response.data.pagination) : [],
//           fullResponse: JSON.stringify(response.data, null, 2)
//         });

//         // Check for error in response
//         if (response.data?.error || response.data?.message) {
//           console.error(`❌ API returned error:`, response.data.error || response.data.message);
//           console.error(`❌ Full error response:`, JSON.stringify(response.data, null, 2));
//         }

//         const wallets = response.data?.data || [];
//         const pagination = response.data?.pagination || {};

//         console.log(`📊 Extracted wallets: ${wallets.length}, Pagination:`, pagination);

//         allWallets.push(...wallets);
//         totalPages = pagination.totalPages || 1;

//         console.log(`📄 Fetched page ${currentPage}/${totalPages}: ${wallets.length} wallets`);
//         currentPage++;

//         // Small delay to avoid rate limiting
//         if (currentPage <= totalPages) {
//           await new Promise(resolve => setTimeout(resolve, 200));
//         }
//       } catch (err) {
//         console.error(`❌ Error fetching page ${currentPage}:`, {
//           message: err.message,
//           status: err.response?.status,
//           statusText: err.response?.statusText,
//           data: err.response?.data,
//           headers: err.response?.headers,
//           config: {
//             url: err.config?.url,
//             method: err.config?.method,
//             headers: err.config?.headers ? Object.keys(err.config.headers) : []
//           }
//         });
//         // If it's the first page and we get an error, we should return an error
//         if (currentPage === 1) {
//           const errorResult = {
//             success: false,
//             message: "Failed to fetch wallets from API",
//             error: err.message,
//             apiError: err.response?.data || err.response?.statusText,
//             statusCode: err.response?.status,
//             added: 0,
//             skipped: 0,
//             errors: 0
//           };
//           if (res) {
//             return res.status(err.response?.status || 500).json(errorResult);
//           }
//           throw err;
//         }
//         break;
//       }
//     } while (currentPage <= totalPages);

//     console.log(`✅ Total wallets fetched: ${allWallets.length}`);

//     if (allWallets.length === 0) {
//       const result = {
//         success: true,
//         message: "No wallets found to add",
//         added: 0,
//         skipped: 0,
//         errors: 0
//       };
//       if (res) {
//         return res.status(200).json(result);
//       }
//       console.log("📊 Result:", result);
//       return result;
//     }

//     let addedCount = 0;
//     let skippedCount = 0;
//     let errorCount = 0;
//     const errors = [];

//     // Process each wallet
//     for (const wallet of allWallets) {
//       try {
//         // Check if wallet already exists
//         const existingWallet = await WalletSchema.findOne({ 
//           walletAddress: wallet.address 
//         });

//         if (existingWallet) {
//           skippedCount++;
//           continue;
//         }

//         // Find token by tokenAddress
//         const token = await Token.findOne({ 
//           tokenAddress: wallet.tokenAddress 
//         });

//         if (!token) {
//           errorCount++;
//           errors.push({
//             walletAddress: wallet.address,
//             error: `Token not found for tokenAddress: ${wallet.tokenAddress}`
//           });
//           console.warn(`⚠️ Token not found for wallet ${wallet.address}, tokenAddress: ${wallet.tokenAddress}`);
//           continue;
//         }

//         // Extract and normalize poolType
//         const rawPoolType = wallet.pooltype || wallet.poolType;
//         const normalizedPoolType = normalizePoolType(rawPoolType);

//         if (!normalizedPoolType) {
//           errorCount++;
//           errors.push({
//             walletAddress: wallet.address,
//             error: `Invalid or missing poolType: ${rawPoolType}`
//           });
//           console.warn(`⚠️ Invalid poolType for wallet ${wallet.address}: ${rawPoolType}`);
//           continue;
//         }

//         // Create new wallet
//         // Construct pairSymbol from available fields (same as in getWalletsData)
//         const pairSymbol = wallet.poolMintASymbol && wallet.tokenSymbol 
//           ? `${wallet.poolMintASymbol}/${wallet.tokenSymbol}` 
//           : wallet.tokenSymbol || "";

//         const newWallet = await WalletSchema.create({
//           walletAddress: wallet.address,
//           innerWalletAddress: wallet.MWalletAddress, 
//           tokenId: token._id,
//           pairAddress: wallet.pairAddress || "",
//           poolType: normalizedPoolType,
//           symbol: pairSymbol,
//         });

//         addedCount++;
//         console.log(`✅ Added wallet: ${wallet.address} (poolType: ${normalizedPoolType})`);
//       } catch (err) {
//         errorCount++;
//         errors.push({
//           walletAddress: wallet.address,
//           error: err.message
//         });
//         console.error(`❌ Error processing wallet ${wallet.address}:`, err.message);
//       }
//     }
//     console.log('added wallets Count', addedCount);

//     const result = {
//       success: true,
//       message: "Wallet addition process completed",
//       summary: {
//         totalFetched: allWallets.length,
//         added: addedCount,
//         skipped: skippedCount,
//         errors: errorCount
//       },
//       errors: errors.length > 0 ? errors : undefined
//     };

//     if (res) {
//       return res.status(200).json(result);
//     }
//     // If called from cron (no res), just log the result
//     console.log("📊 Result:", JSON.stringify(result, null, 2));
//     return result;

//   } catch (err) {
//     console.error("❌ Error in walletAddDynamically:", err);
//     const errorResult = {
//       success: false,
//       message: "Server error",
//       error: err.message
//     };
//     if (res) {
//       return res.status(500).json(errorResult);
//     }
//     // If called from cron, throw the error so it can be caught by the cron handler
//     throw err;
//   }
// };


exports.walletAddDynamically = async (req, res) => {
  try {
    console.log("🚀 Starting walletAddDynamicallyyyyyyyyyyyyy...");

    const allWallets = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100; // Fetch more per page for efficiency

    // Fetch all pages of wallets from external API
    do {
      try {
        const response = await axios.get(
          // "https://walletgenerationback.strtesting.com/api/main/getWalletInfo",   //testing
          "https://dexmmapi.stringonchain.io/api/main/getWalletInfo",   //live
          {
            params: {
              status: 2, // Active wallets
              page: currentPage,
              limit: limit
            },
            headers: {
              "x-api-key": process.env.WALLET_GEN_API_KEY,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              "Accept": "application/json",
              "Accept-Language": "en-US,en;q=0.9",
              "Referer": "https://dexmmapi.stringonchain.io/",
              "Origin": "https://dexmmapi.stringonchain.io"
            }
          }
        );

        console.log(response, "response in walletAddDynamically..")

        const wallets = response.data?.data || [];
        const pagination = response.data?.pagination || {};

        console.log(`📄 Fetched page ${currentPage}/${totalPages}: ${wallets.length} wallets`, {
          totalWallets: pagination.totalWallets,
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages
        });

        allWallets.push(...wallets);
        totalPages = pagination.totalPages || 1;
        currentPage++;

        // Small delay to avoid rate limiting
        if (currentPage <= totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (err) {
        console.error(`❌ Error fetching page ${currentPage}:`, err.message);
        break;
      }
    } while (currentPage <= totalPages);

    console.log(`✅ Total wallets fetched: ${allWallets.length}`);

    if (allWallets.length === 0) {
      const result = {
        success: true,
        message: "No wallets found to add",
        added: 0,
        skipped: 0,
        errors: 0
      };
      if (res) {
        return res.status(200).json(result);
      }
      console.log("📊 Result:", result);
      return result;
    }

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log(`🔄 Starting to process ${allWallets.length} wallets...`);

    // Process each wallet
    for (const wallet of allWallets) {
      try {
        // Check if wallet already exists
        const existingWallet = await WalletSchema.findOne({
          walletAddress: wallet.address
        });

        if (existingWallet) {
          skippedCount++;
          console.log(`⏭️ Skipped (already exists): ${wallet.address}`);
          continue;
        }

        // Find token by tokenAddress
        const token = await Token.findOne({
          tokenAddress: wallet.tokenAddress
        });

        if (!token) {
          errorCount++;
          errors.push({
            walletAddress: wallet.address,
            error: `Token not found for tokenAddress: ${wallet.tokenAddress}`
          });
          console.warn(`⚠️ Token not found for wallet ${wallet.address}, tokenAddress: ${wallet.tokenAddress}`);
          continue;
        }

        // Extract and normalize poolType
        const rawPoolType = wallet.pooltype || wallet.poolType;
        const normalizedPoolType = normalizePoolType(rawPoolType);

        if (!normalizedPoolType) {
          errorCount++;
          errors.push({
            walletAddress: wallet.address,
            error: `Invalid or missing poolType: ${rawPoolType}`
          });
          console.warn(`⚠️ Invalid poolType for wallet ${wallet.address}: ${rawPoolType}`);
          continue;
        }

        // Create new wallet
        // Construct pairSymbol from available fields (same as in getWalletsData)
        const pairSymbol = wallet.poolMintASymbol && wallet.tokenSymbol
          ? `${wallet.poolMintASymbol}/${wallet.tokenSymbol}`
          : wallet.tokenSymbol || "";

        const newWallet = await WalletSchema.create({
          walletAddress: wallet.address,
          innerWalletAddress: wallet.MWalletAddress, // Using address as innerWalletAddress if not provided
          tokenId: token._id,
          pairAddress: wallet.pairAddress || "",
          poolType: normalizedPoolType,
          symbol: pairSymbol,
        });

        addedCount++;
        console.log(`✅ Added wallet: ${wallet.address} (poolType: ${normalizedPoolType})`);
      } catch (err) {
        errorCount++;
        errors.push({
          walletAddress: wallet.address,
          error: err.message
        });
        console.error(`❌ Error processing wallet ${wallet.address}:`, err.message);
      }
    }
    console.log('📊 Processing Summary:');
    console.log(`   Total fetched: ${allWallets.length}`);
    console.log(`   ✅ Added: ${addedCount}`);
    console.log(`   ⏭️ Skipped (already exist): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    const result = {
      success: true,
      message: "Wallet addition process completed",
      summary: {
        totalFetched: allWallets.length,
        added: addedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    };

    if (res) {
      return res.status(200).json(result);
    }
    // If called from cron (no res), just log the result
    console.log("📊 Result:", JSON.stringify(result, null, 2));
    return result;

  } catch (err) {
    console.error("❌ Error in walletAddDynamically:", err);
    const errorResult = {
      success: false,
      message: "Server error",
      error: err.message
    };
    if (res) {
      return res.status(500).json(errorResult);
    }
    // If called from cron, throw the error so it can be caught by the cron handler
    throw err;
  }
};


//added on 20-12-25
// exports.getPoolTransactionsDefiCpmmDateWise = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res,
//   targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage,
//       "targetDate",
//       targetDate
//     );

//     // Calculate date range - use targetDate if provided, otherwise use yesterday
//     let targetMoment;
//     if (targetDate) {
//       // If targetDate is a string in YYYYMMDD format, parse it
//       if (typeof targetDate === 'string' && targetDate.length === 8) {
//         targetMoment = moment.utc(targetDate, "YYYYMMDD");
//       } else if (moment.isMoment(targetDate)) {
//         targetMoment = targetDate.clone().utc();
//       } else {
//         targetMoment = moment.utc(targetDate);
//       }
//     } else {
//       // Default to yesterday
//       targetMoment = moment.utc().subtract(1, "days");
//     }

//     // Set to start of day (00:00:00)
//     const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
//     // Set to end of day (23:59:59)
//     const dayEnd = dayStart.clone().endOf("day");

//     const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
//     const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

//     // Convert to Unix timestamps
//     const from_time = dayStart.unix();
//     const to_time = dayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//  process.env.SOL_API_TOKEN,
//       },
//     };

//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     // console.log();


//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     const totalVolume = buysVolume + sellsVolume;

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();

//     if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
//       console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
//       console.log("⚠️ Skipping pool due to missing liquidity data from DexScreener");
//       return; // Skip this pool if liquidity data is not available
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     console.log("startTime for company Wallet", startTime);
//     // Convert startTime string to number for database query (model expects Number type)
//     const startTimeNumber = parseInt(startTime, 10);
//     console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
//     if (companyWallet && companyWallet.length > 0) {
//       console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
//     }

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
//     if (compoundWallet && compoundWallet.length > 0) {
//       console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
//     }

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
//     if (poolRevenue > 0) {
//       try {
//         // Get lpMint from Token collection (already saved in tokenSchema)
//         const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
//         const lpMintAddress = tokenDoc?.lpMint;

//         if (lpMintAddress) {
//           // Fetch token holders from Solscan API
//           const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
//           const holdersResponse = await fetch(holdersUrl, requestOptions);
//           const holdersData = await holdersResponse.json();

//           if (holdersData.success && holdersData.data?.items?.length > 0) {
//             // Get the first holder (rank 1) percentage
//             const percentage = holdersData.data.items[0].percentage;

//             // Calculate companysRevenue = poolRevenue * (percentage / 100)
//             companysRevenue = poolRevenue * (percentage / 100);
//             companysLiquidity = poolLiquidity * (percentage / 100);
//             // Calculate usersRevenue = poolRevenue - companysRevenue
//             usersRevenue = poolRevenue - companysRevenue;
//             usersLiquidity = poolLiquidity - companysLiquidity;

//             console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching token holders for CPMM pool:", error);
//       }
//     }

//     // Update liquidity values from companyWallet if exists
//     // if (companyWallet) {
//     //   companyWallet.forEach((doc) => {
//     //     totalValue += doc.value;
//     //     usersLiquidity = poolLiquidity - totalValue;
//     //     companysLiquidity = totalValue;

//     //   });
//     // }

//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime: startTimeNumber,
//       endTime: parseInt(endTime, 10),
//     };

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };

// //added on 20-12-25
// exports.getPoolTransactionsDefiCpmmDateWise = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res,
//   targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage,
//       "targetDate",
//       targetDate
//     );

//     // Calculate date range - use targetDate if provided, otherwise use yesterday
//     let targetMoment;
//     if (targetDate) {
//       // If targetDate is a string in YYYYMMDD format, parse it
//       if (typeof targetDate === 'string' && targetDate.length === 8) {
//         targetMoment = moment.utc(targetDate, "YYYYMMDD");
//       } else if (moment.isMoment(targetDate)) {
//         targetMoment = targetDate.clone().utc();
//       } else {
//         targetMoment = moment.utc(targetDate);
//       }
//     } else {
//       // Default to yesterday
//       targetMoment = moment.utc().subtract(1, "days");
//     }

//     // Set to start of day (00:00:00)
//     const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
//     // Set to end of day (23:59:59)
//     const dayEnd = dayStart.clone().endOf("day");

//     const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
//     const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

//     // Convert to Unix timestamps
//     const from_time = dayStart.unix();
//     const to_time = dayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//  process.env.SOL_API_TOKEN,
//       },
//     };

//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     // console.log();


//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     const totalVolume = buysVolume + sellsVolume;

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();

//     if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
//       console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
//       console.log("⚠️ Skipping pool due to missing liquidity data from DexScreener");
//       return; // Skip this pool if liquidity data is not available
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     console.log("startTime for company Wallet", startTime);
//     // Convert startTime string to number for database query (model expects Number type)
//     const startTimeNumber = parseInt(startTime, 10);
//     console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
//     if (companyWallet && companyWallet.length > 0) {
//       console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
//     }

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
//     if (compoundWallet && compoundWallet.length > 0) {
//       console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
//     }

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
//     if (poolRevenue > 0) {
//       try {
//         // Get lpMint from Token collection (already saved in tokenSchema)
//         const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
//         const lpMintAddress = tokenDoc?.lpMint;

//         if (lpMintAddress) {
//           // Fetch token holders from Solscan API
//           const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
//           const holdersResponse = await fetch(holdersUrl, requestOptions);
//           const holdersData = await holdersResponse.json();

//           if (holdersData.success && holdersData.data?.items?.length > 0) {
//             // Get the first holder (rank 1) percentage
//             const percentage = holdersData.data.items[0].percentage;

//             // Calculate companysRevenue = poolRevenue * (percentage / 100)
//             companysRevenue = poolRevenue * (percentage / 100);
//             companysLiquidity = poolLiquidity * (percentage / 100);
//             // Calculate usersRevenue = poolRevenue - companysRevenue
//             usersRevenue = poolRevenue - companysRevenue;
//             usersLiquidity = poolLiquidity - companysLiquidity;

//             console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching token holders for CPMM pool:", error);
//       }
//     }

//     // Update liquidity values from companyWallet if exists
//     // if (companyWallet) {
//     //   companyWallet.forEach((doc) => {
//     //     totalValue += doc.value;
//     //     usersLiquidity = poolLiquidity - totalValue;
//     //     companysLiquidity = totalValue;

//     //   });
//     // }

//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime: startTimeNumber,
//       endTime: parseInt(endTime, 10),
//     };

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };


// exports.getRwaReportsDateWise = async (req, res) => {
//   try {
//     // Get date range from query parameters
//     // Format: fromDate=20250101&toDate=20250131 (YYYYMMDD format)
//     // If not provided, defaults to yesterday only
//     let fromDate = req?.query?.fromDate || null;
//     let toDate = req?.query?.toDate || null;

//     // Parse dates if provided
//     let fromMoment, toMoment;
//     if (fromDate && toDate) {
//       // Validate date format (YYYYMMDD)
//       if (!/^\d{8}$/.test(fromDate) || !/^\d{8}$/.test(toDate)) {
//         if (res) {
//           return res.status(400).json({ 
//             error: "Invalid date format. Use YYYYMMDD format (e.g., 20250101)" 
//           });
//         }
//         throw new Error("Invalid date format. Use YYYYMMDD format");
//       }

//       fromMoment = moment.utc(fromDate, "YYYYMMDD");
//       toMoment = moment.utc(toDate, "YYYYMMDD");

//       if (!fromMoment.isValid() || !toMoment.isValid()) {
//         if (res) {
//           return res.status(400).json({ error: "Invalid dates provided" });
//         }
//         throw new Error("Invalid dates provided");
//       }

//       if (fromMoment.isAfter(toMoment)) {
//         if (res) {
//           return res.status(400).json({ error: "fromDate must be before or equal to toDate" });
//         }
//         throw new Error("fromDate must be before or equal to toDate");
//       }

//       console.log(`📅 Processing date range: ${fromDate} to ${toDate}`);
//     } else {
//       // Default to yesterday if no dates provided
//       fromMoment = moment.utc().subtract(1, "days");
//       toMoment = fromMoment.clone();
//       console.log(`📅 No date range provided, processing yesterday only: ${fromMoment.format("YYYYMMDD")}`);
//     }

//     // Generate array of dates to process (day by day)
//     const datesToProcess = [];
//     let currentDate = fromMoment.clone();
//     while (currentDate.isSameOrBefore(toMoment, 'day')) {
//       datesToProcess.push(currentDate.clone());
//       currentDate.add(1, 'day');
//     }

//     console.log(`📊 Will process ${datesToProcess.length} day(s) of reports`);

//     // Process each date
//     for (let dateIndex = 0; dateIndex < datesToProcess.length; dateIndex++) {
//       const targetDate = datesToProcess[dateIndex];
//       const dateStr = targetDate.format("YYYYMMDD");

//       console.log(`\n${'='.repeat(60)}`);
//       console.log(`📅 Processing date ${dateIndex + 1}/${datesToProcess.length}: ${dateStr}`);
//       console.log(`${'='.repeat(60)}\n`);

//       //fetch platforms
//       const platforms = await PlatformSchema.find({});
//       // Verify tokenData and ensure it's valid
//       if (!platforms || platforms.length === 0) {
//         console.log("No platforms found in the database.");
//         continue; // Skip this date if no platforms
//       }

//       // Loop through each platform and call getAllActivities for each
//       for (let i = 0; i < platforms.length; i++) {
//         const platform = platforms[i];

//         // Ensure platform is defined before passing it to getAllActivities
//         if (!platform) {
//           console.error(`Platform at index ${i} is undefined`);
//           continue; // Skip this iteration if platform is undefined
//         }
//         const tokens = await TokenSchema.find({ platformId: platform._id });

//         for (let i = 0; i < tokens.length; i++) {
//           const token = tokens[i];
//           if (!token) continue;

//           const {
//             //  tokenAddress, solAddress, usd_min ,name,token_logo_url,
//             chainId,
//             symbol,
//           } = token;

//           const LiquidityPools = await RWASchema.find({
//             tokenAddress: token.tokenAddress,
//           });
//           if (!LiquidityPools || LiquidityPools.length === 0) {
//             console.log(`No LiquidityPools found for token ${symbol}. Skipping.`);
//             continue; // Skip this iteration if no wallets are found
//           }
//           for (let j = 0; j < LiquidityPools.length; j++) {
//             const LiquidityPool = LiquidityPools[j];
//             if (!LiquidityPool) continue;
//             console.log(
//               `\n=== Processing LiquidityPool ${j + 1}/${LiquidityPools.length
//               } for token ${symbol} (Date: ${dateStr}) ===`
//             );
//             const {
//               pairAddress,
//               tokenAddress,
//               address,
//               name,
//               lpPercentage,
//               poolType,
//             } = LiquidityPool;
//             if (poolType && poolType.toLowerCase() === "cpmm") {
//               // Route to CPMM function with targetDate
//               await exports.getPoolTransactionsDefiCpmmDateWise(
//                 pairAddress,
//                 tokenAddress,
//                 address,
//                 name,
//                 poolType,
//                 chainId,
//                 lpPercentage,
//                 req,
//                 res,
//                 targetDate
//               );
//               console.log("skipping cpmm pool");

//             } else {
//                 // 👇 await everything sequentially — prevents overlap
//                 // await exports.getPoolTransactionsDefiCpmmDateWise(
//                 //   pairAddress,
//                 //   tokenAddress,
//                 //   address,
//                 //   name,
//                 //   poolType,
//                 //   chainId,
//                 //   lpPercentage,
//                 //   req,
//                 //   res,
//                 //   targetDate
//                 // );
//             }

//             console.log(
//               `✅ Completed LiquidityPool ${pairAddress} for token ${symbol} (Date: ${dateStr})\n`
//             );

//           }

//           console.log(`🔥 Completed all LiquidityPools for token ${symbol} (Date: ${dateStr})`);
//         }
//       }

//       console.log(`\n✅ Completed processing for date: ${dateStr}\n`);
//     }

//     console.log(`\n🎉 Completed processing all dates from ${fromMoment.format("YYYYMMDD")} to ${toMoment.format("YYYYMMDD")}`);

//     if (res) {
//       return res.status(200).json({ 
//         message: `Successfully processed reports from ${fromMoment.format("YYYYMMDD")} to ${toMoment.format("YYYYMMDD")}`,
//         datesProcessed: datesToProcess.length,
//         fromDate: fromMoment.format("YYYYMMDD"),
//         toDate: toMoment.format("YYYYMMDD")
//       });
//     }
//   } catch (error) {
//     console.error("Error in getRwaReports:", error);
//     if (res) {
//       return res.status(500).json({ error: error.message });
//     }
//     throw error;
//   }
// };


exports.getPoolTransactionsDefiDateWiseTest = async (
  pairAddress,
  tokenAddress,
  address,
  name,
  poolType,
  chainId,
  lpPercentage,
  req,
  res,
  targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
) => {
  try {
    // CLMM pool logic
    console.log(
      "pairAddress :",
      pairAddress,
      "tokenAddress",
      tokenAddress,
      "address",
      address,
      "name",
      name,
      "poolType",
      poolType,
      "chainId",
      chainId,
      "lpPercentage",
      lpPercentage,
      "targetDate",
      targetDate
    );

    // Calculate date range - use targetDate if provided, otherwise use yesterday
    let targetMoment;
    if (targetDate) {
      // If targetDate is a string in YYYYMMDD format, parse it
      if (typeof targetDate === 'string' && targetDate.length === 8) {
        targetMoment = moment.utc(targetDate, "YYYYMMDD");
      } else if (moment.isMoment(targetDate)) {
        targetMoment = targetDate.clone().utc();
      } else {
        targetMoment = moment.utc(targetDate);
      }
    } else {
      // Default to yesterday
      targetMoment = moment.utc().subtract(1, "days");
    }

    // Set to start of day (00:00:00)
    const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    // Set to end of day (23:59:59)
    const dayEnd = dayStart.clone().endOf("day");

    const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
    const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

    // Convert to Unix timestamps
    const from_time = dayStart.unix();
    const to_time = dayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const requestOptions = {
      method: "GET",
      headers: {
        token:
          process.env.SOL_API_TOKEN,
      },
    };

    const responseaddressPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseaddressPrice.ok) {
      const errorMsg = `Failed to fetch price for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const addressPriceData = await responseaddressPrice.json();
    if (!addressPriceData?.data || !Array.isArray(addressPriceData.data) || addressPriceData.data.length === 0 || !addressPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for address ${address} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, addressPriceData);
      throw new Error(errorMsg);
    }
    const addressAverage = addressPriceData.data[0].price;
    console.log(startTime, "startTime");

    console.log("addressAverage", addressAverage);


    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      const errorMsg = `Failed to fetch price for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const tokenPriceData = await responsePrice.json();
    if (!tokenPriceData?.data || !Array.isArray(tokenPriceData.data) || tokenPriceData.data.length === 0 || !tokenPriceData.data[0]?.price) {
      const errorMsg = `Invalid price data for tokenAddress ${tokenAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, tokenPriceData);
      throw new Error(errorMsg);
    }
    const tokenAverage = tokenPriceData.data[0].price;

    console.log("addressAverage", addressAverage);
    console.log("tokenAverage", tokenAverage);
    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages (Fetch pool swap activities)
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      return;
      // return res.status(200).json({ message: "No transactions for this date" });
    }

    const swapsTxs = dayData.filter(tx => tx.activity_type === "ACTIVITY_TOKEN_SWAP");

    console.log("swapsTxs", swapsTxs.length);

    // Filter Buys and Sells
    const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress);
    console.log("buyTxs", buyTxs.length);
    const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress);
    console.log("sellTxs", sellTxs.length);


    const lpReward = await Settings.findOne({ status: true });

    console.log("lpReward", lpReward);

    const buysVolumeInMintA = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintA", buysVolumeInMintA);
    const sellsVolumeMintB = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintB", sellsVolumeMintB);
    const buysVolumee = buysVolumeInMintA * addressAverage;
    const sellsVolumee = sellsVolumeMintB * tokenAverage;
    const totalVolumeSwap = buysVolumee + sellsVolumee;

    const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx) => tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
    console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



    const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
      (tx.routers?.child_routers || []).filter((cr) =>
        (cr.token1 === address || cr.token1 === tokenAddress) && (cr.token2 === address || cr.token2 === tokenAddress)

      )
    );
    console.log("clmmChildRouters", clmmChildRouters.length);

    // Filter Buys and Sells
    const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress);
    const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress);

    console.log("buyTxsAGG", buyTxsAGG.length);
    console.log("sellTxsAGG", sellTxsAGG.length);

    const buysVolumeInMintAAGG = buyTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
    const sellsVolumeMintBAGG = sellTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
    const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
    console.log("buysVolumeAGG", buysVolumeAGG);
    const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
    console.log("sellsVolumeAGG", sellsVolumeAGG);
    const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

    const totalVolume = totalVolumeSwap + totalVolumeAGG;
    console.log("totalVolume", totalVolume);

    const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

    // Fetch pool liquidity from DexScreener API
    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();
    //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
    //  console.log("lastReportDate",lastReportDate);

    if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
      const errorMsg = `Invalid liquidity data from DexScreener for pairAddress ${pairAddress} on ${startTime}`;
      console.error(`❌ ${errorMsg}`, data1);
      throw new Error(errorMsg);
    }

    const poolLiquidity = data1.pairs[0].liquidity.usd;

    // console.log("data1",data1.pairs[0].liquidity.usd);
    // console.log("data2",data1);
    console.log("startTime for company Wallet", startTime);
    // Convert startTime string to number for database query (model expects Number type)
    const startTimeNumber = parseInt(startTime, 10);
    console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

    const companyWallet = await CompanyPoolRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
    if (companyWallet && companyWallet.length > 0) {
      console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
    }

    const compoundWallet = await CompoundRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
    if (compoundWallet && compoundWallet.length > 0) {
      console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
    }

    let totalPendingRewards = 0;
    let totalValue = 0;
    let usersRevenue = 0;
    let companysRevenue = 0;
    let companysLiquidity = 0;
    let usersLiquidity = 0;
    let compoundRevenue = 0;
    let compoundLiquidity = 0;
    let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

    // CLMM companyWallet logic
    if (companyWallet && Array.isArray(companyWallet) && companyWallet.length > 0) {
      console.log(`Found ${companyWallet.length} companyWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      companyWallet.forEach((doc) => {
        totalPendingRewards += doc.pending_rewards || 0;
        totalValue += doc.value || 0;
      });
      // Calculate derived values after summing all documents
      companysRevenue = totalPendingRewards;
      usersRevenue = poolRevenue - totalPendingRewards;
      companysLiquidity = totalValue;
      usersLiquidity = poolLiquidity - totalValue;
      console.log(`Company Wallet - totalPendingRewards: ${totalPendingRewards}, totalValue: ${totalValue}, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
    } else {
      console.log(`No companyWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      // If no company wallet, all revenue and liquidity goes to users
      usersRevenue = poolRevenue;
      usersLiquidity = poolLiquidity;
    }

    if (compoundWallet && Array.isArray(compoundWallet) && compoundWallet.length > 0) {
      console.log(`Found ${compoundWallet.length} compoundWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
      let compoundTotalPendingRewards = 0;
      let compoundTotalValue = 0;
      compoundWallet.forEach((doc) => {
        compoundTotalPendingRewards += doc.pending_rewards || 0;
        compoundTotalValue += doc.value || 0;
      });
      compoundRevenue = compoundTotalPendingRewards;
      compoundLiquidity = compoundTotalValue;
      console.log(`Compound Wallet - compoundRevenue: ${compoundRevenue}, compoundLiquidity: ${compoundLiquidity}`);
    } else {
      console.log(`No compoundWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
    }


    let reportData = {
      pairAddress,
      tokenAddress,
      poolType,
      address,
      name,
      chainId,
      totalTransactions: dayData.length,
      buys: buyTxs.length + buyTxsAGG.length,
      sells: sellTxs.length + sellTxsAGG.length,
      buysVolume: buysVolumeAGG + buysVolumee,
      sellsVolume: sellsVolumeAGG + sellsVolumee,
      totalVolume,
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      poolFee: totalVolume * lpPercentage,
      poolRevenue,
      usersRevenue,
      companysRevenue,
      compoundRevenue,
      compoundLiquidity,
      startTime: startTimeNumber,
      endTime: parseInt(endTime, 10),
      addressAverage,
      tokenAverage,
    };


    // Save report
    const newReport = new reportPool(reportData);
    await newReport.save();

    console.log(`✅ Saved ${name} data for ${startTime}`);

    // res.status(200).json({
    //   message: `Data saved for ${rwaName}`,
    //    pairAddress,
    //   tokenAddress,
    //   rwaAddress,
    //   rwaName,
    //   chainId,
    //   totalTransactions:dayData.length,
    //   buys,
    //   sells,
    //   totalVolume,
    //   LPadded,
    //   dayData
    // });
  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};


//added on 20-12-25
exports.getPoolTransactionsDefiCpmmDateWiseTest = async (
  pairAddress,
  tokenAddress,
  address,
  name,
  poolType,
  chainId,
  lpPercentage,
  req,
  res,
  targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
) => {
  try {
    console.log(
      "pairAddress :",
      pairAddress,
      "tokenAddress",
      tokenAddress,
      "address",
      address,
      "name",
      name,
      "poolType",
      poolType,
      "chainId",
      chainId,
      "lpPercentage",
      lpPercentage,
      "targetDate",
      targetDate
    );

    // Calculate date range - use targetDate if provided, otherwise use yesterday
    let targetMoment;
    if (targetDate) {
      // If targetDate is a string in YYYYMMDD format, parse it
      if (typeof targetDate === 'string' && targetDate.length === 8) {
        targetMoment = moment.utc(targetDate, "YYYYMMDD");
      } else if (moment.isMoment(targetDate)) {
        targetMoment = targetDate.clone().utc();
      } else {
        targetMoment = moment.utc(targetDate);
      }
    } else {
      // Default to yesterday
      targetMoment = moment.utc().subtract(1, "days");
    }

    // Set to start of day (00:00:00)
    const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    // Set to end of day (23:59:59)
    const dayEnd = dayStart.clone().endOf("day");

    const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
    const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

    // Convert to Unix timestamps
    const from_time = dayStart.unix();
    const to_time = dayEnd.unix();
    console.log({
      from_time,
      to_time,
      from_time_readable: moment
        .unix(from_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
      to_time_readable: moment
        .unix(to_time)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss [UTC]"),
    });
    console.log("from_time", from_time, "to_time", to_time);

    const requestOptions = {
      method: "GET",
      headers: {
        token:
          process.env.SOL_API_TOKEN,
      },
    };

    const responseaddressPrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responseaddressPrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const addressPriceData = await responseaddressPrice.json();
    const addressAverage = addressPriceData.data[0].price;

    const responsePrice = await fetch(
      `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
      requestOptions
    );
    if (!responsePrice.ok) {
      throw new Error("Network response was not ok for Binance");
    }
    const tokenPriceData = await responsePrice.json();
    const tokenAverage = tokenPriceData.data[0].price;

    // console.log();


    let page = 1;
    let hasMore = true;
    let dayData = [];

    // Fetch Solscan pages
    while (hasMore) {
      const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: { token: process.env.SOL_API_TOKEN },
      });
      const data = await response.json();
      // console.log("data",data);


      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        dayData = dayData.concat(data.data);
        console.log(`✅ Page ${page}: ${data.data.length} txs`);
        page++;
        await new Promise((r) => setTimeout(r, 400));
      } else {
        hasMore = false;
      }
    }
    // console.log("dayData.length",dayData.length);

    if (dayData.length === 0) {
      console.log("🚫 No transactions found, skipping...");
      return;
      // return res.status(200).json({ message: "No transactions for this date" });
    }



    const swapsTxs = dayData.filter(tx => tx.activity_type === "ACTIVITY_TOKEN_SWAP");

    console.log("swapsTxs", swapsTxs.length);

    // Filter Buys and Sells
    const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress);
    console.log("buyTxs", buyTxs.length);
    const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress);
    console.log("sellTxs", sellTxs.length);


    const buyss = buyTxs.length;
    const sellss = sellTxs.length;

    const lpReward = await Settings.findOne({ status: true });

    console.log("lpReward", lpReward);

    const buysVolumeInMintA = buyTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintA", buysVolumeInMintA);
    const sellsVolumeMintB = sellTxs.reduce(
      (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintB", sellsVolumeMintB);
    const buysVolumee = buysVolumeInMintA * addressAverage;
    const sellsVolumee = sellsVolumeMintB * tokenAverage;
    const totalVolumeSwap = buysVolumee + sellsVolumee;

    const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx) => tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
    console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



    const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
      (tx.routers?.child_routers || []).filter((cr) =>
        (cr.token1 === address || cr.token1 === tokenAddress) && (cr.token2 === address || cr.token2 === tokenAddress)

      )
    );
    console.log("clmmChildRouters", clmmChildRouters.length);

    // Filter Buys and Sells
    const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress);
    const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress);

    console.log("buyTxsAGG", buyTxsAGG.length);
    console.log("sellTxsAGG", sellTxsAGG.length);

    const buysVolumeInMintAAGG = buyTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
    const sellsVolumeMintBAGG = sellTxsAGG.reduce(
      (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
      0
    );
    console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
    const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
    console.log("buysVolumeAGG", buysVolumeAGG);
    const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
    console.log("sellsVolumeAGG", sellsVolumeAGG);
    const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

    const totalVolume = totalVolumeSwap + totalVolumeAGG;
    console.log("totalVolume", totalVolume);

    const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

    const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

    const response = await fetch(urll, {
      method: "GET",
      // headers: { token: process.env.SOL_API_TOKEN },
    });
    const data1 = await response.json();

    if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
      console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
      console.log("⚠️ Skipping pool due to missing liquidity data from DexScreener");
      return; // Skip this pool if liquidity data is not available
    }

    const poolLiquidity = data1.pairs[0].liquidity.usd;

    console.log("startTime for company Wallet", startTime);
    // Convert startTime string to number for database query (model expects Number type)
    const startTimeNumber = parseInt(startTime, 10);
    console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

    const companyWallet = await CompanyPoolRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
    if (companyWallet && companyWallet.length > 0) {
      console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
    }

    const compoundWallet = await CompoundRevenue.find({
      pairAddress,
      startTime: startTimeNumber,
    });
    console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
    if (compoundWallet && compoundWallet.length > 0) {
      console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
    }

    let totalPendingRewards = 0;
    let totalValue = 0;
    let usersRevenue = 0;
    let companysRevenue = 0;
    let companysLiquidity = 0;
    let usersLiquidity = 0;
    let compoundRevenue = 0;
    let compoundLiquidity = 0;
    let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

    // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
    if (poolRevenue > 0) {
      try {
        // Get lpMint from Token collection (already saved in tokenSchema)
        const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
        const lpMintAddress = tokenDoc?.lpMint;

        if (lpMintAddress) {
          // Fetch token holders from Solscan API
          const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
          const holdersResponse = await fetch(holdersUrl, requestOptions);
          const holdersData = await holdersResponse.json();

          if (holdersData.success && holdersData.data?.items?.length > 0) {
            // Get the first holder (rank 1) percentage
            const percentage = holdersData.data.items[0].percentage;

            // Calculate companysRevenue = poolRevenue * (percentage / 100)
            companysRevenue = poolRevenue * (percentage / 100);
            companysLiquidity = poolLiquidity * (percentage / 100);
            // Calculate usersRevenue = poolRevenue - companysRevenue
            usersRevenue = poolRevenue - companysRevenue;
            usersLiquidity = poolLiquidity - companysLiquidity;

            console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
          }
        }
      } catch (error) {
        console.error("Error fetching token holders for CPMM pool:", error);
      }
    }



    if (compoundWallet) {
      let compoundTotalPendingRewards = 0;
      let compoundTotalValue = 0;
      compoundWallet.forEach((doc) => {
        compoundTotalPendingRewards += doc.pending_rewards;
        compoundTotalValue += doc.value;
      });
      compoundRevenue = compoundTotalPendingRewards;
      compoundLiquidity = compoundTotalValue;
    }

    // Build base report data

    let reportData = {
      pairAddress,
      tokenAddress,
      poolType,
      address,
      name,
      chainId,
      totalTransactions: dayData.length,
      buys: buyTxs.length + buyTxsAGG.length,
      sells: sellTxs.length + sellTxsAGG.length,
      buysVolume: buysVolumeAGG + buysVolumee,
      sellsVolume: sellsVolumeAGG + sellsVolumee,
      totalVolume,
      poolLiquidity,
      companysLiquidity,
      usersLiquidity,
      poolFee: totalVolume * lpPercentage,
      poolRevenue,
      usersRevenue,
      companysRevenue,
      compoundRevenue,
      compoundLiquidity,
      addressAverage,
      tokenAverage,
      startTime: startTimeNumber,
      endTime: parseInt(endTime, 10),
    };

    // Save report
    const newReport = new reportPool(reportData);
    await newReport.save();

    console.log(`✅ Saved ${name} data for ${startTime}`);

  } catch (error) {
    console.error("Error:", error);
    // res.status(500).json({ error: error.message });
  }
};





exports.getRwaReportsDateWiseLive = async (req, res) => {
  try {
    let { fromDate, toDate } = req.query;

    let fromMoment, toMoment;

    // 👉 Date handling
    if (fromDate && toDate) {
      if (!/^\d{8}$/.test(fromDate) || !/^\d{8}$/.test(toDate)) {
        return res.status(400).json({
          error: "Invalid date format. Use YYYYMMDD",
        });
      }

      fromMoment = moment.utc(fromDate, "YYYYMMDD");
      toMoment = moment.utc(toDate, "YYYYMMDD");

      if (!fromMoment.isValid() || !toMoment.isValid()) {
        return res.status(400).json({ error: "Invalid dates provided" });
      }

      if (fromMoment.isAfter(toMoment)) {
        return res
          .status(400)
          .json({ error: "fromDate must be before or equal to toDate" });
      }
    } else {
      fromMoment = moment.utc().subtract(1, "day");
      toMoment = fromMoment.clone();
    }

    // 👉 Generate date range
    const dates = [];
    let cur = fromMoment.clone();
    while (cur.isSameOrBefore(toMoment, "day")) {
      dates.push(cur.clone());
      cur.add(1, "day");
    }

    // 👉 Fetch platforms once
    const platforms = await PlatformSchema.find({});
    if (!platforms.length) {
      return res.status(200).json({ message: "No platforms found" });
    }

    // 👉 Core processing
    for (const date of dates) {
      const startTime = Number(date.format("YYYYMMDD"));

      for (const platform of platforms) {
        const tokens = await TokenSchema.find({ platformId: platform._id, status: true });

        for (const token of tokens) {
          const pools = await RWASchema.find({
            tokenAddress: token.tokenAddress,
          });
          console.log("pools", pools);


          for (const pool of pools) {
            const exists = await reportPool.findOne({
              pairAddress: pool.pairAddress,
              startTime,
            });

            if (exists) continue;

            if (pool.poolType?.toLowerCase() === "cpmm") {
              // console.log("Calling cpmm");

              await exports.getPoolTransactionsDefiCpmmDateWiseTest(
                pool.pairAddress,
                pool.tokenAddress,
                pool.address,
                pool.name,
                pool.poolType,
                token.chainId,
                pool.lpPercentage,
                req,
                res,
                date
              );
            } else {
              // console.log("Calling clmm");

              await exports.getPoolTransactionsDefiDateWiseTest(
                pool.pairAddress,
                pool.tokenAddress,
                pool.address,
                pool.name,
                pool.poolType,
                token.chainId,
                pool.lpPercentage,
                req,
                res,
                date
              );
            }
          }
        }
      }
    }

    // 👉 Single response only
    return res.status(200).json({
      message: "RWA reports API executed successfully",
      fromDate: fromMoment.format("YYYYMMDD"),
      toDate: toMoment.format("YYYYMMDD"),
    });
  } catch (err) {
    console.error("RWA Datewise API Error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};


// exports.getPoolTransactionsDefiDateWiseTest = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res,
//   targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
// ) => {
//   try {
//     // CLMM pool logic
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage,
//       "targetDate",
//       targetDate
//     );

//     // Calculate date range - use targetDate if provided, otherwise use yesterday
//     let targetMoment;
//     if (targetDate) {
//       // If targetDate is a string in YYYYMMDD format, parse it
//       if (typeof targetDate === 'string' && targetDate.length === 8) {
//         targetMoment = moment.utc(targetDate, "YYYYMMDD");
//       } else if (moment.isMoment(targetDate)) {
//         targetMoment = targetDate.clone().utc();
//       } else {
//         targetMoment = moment.utc(targetDate);
//       }
//     } else {
//       // Default to yesterday
//       targetMoment = moment.utc().subtract(1, "days");
//     }

//     // Set to start of day (00:00:00)
//     const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
//     // Set to end of day (23:59:59)
//     const dayEnd = dayStart.clone().endOf("day");

//     const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
//     const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

//     // Convert to Unix timestamps
//     const from_time = dayStart.unix();
//     const to_time = dayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//  process.env.SOL_API_TOKEN,
//       },
//     };

//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       const errorMsg = `Failed to fetch price for address ${address} on ${startTime}`;
//       console.error(`❌ ${errorMsg}`);
//       throw new Error(errorMsg);
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     if (!addressPriceData?.data || !Array.isArray(addressPriceData.data) || addressPriceData.data.length === 0 || !addressPriceData.data[0]?.price) {
//       const errorMsg = `Invalid price data for address ${address} on ${startTime}`;
//       console.error(`❌ ${errorMsg}`, addressPriceData);
//       throw new Error(errorMsg);
//     }
//     const addressAverage = addressPriceData.data[0].price;
//     console.log(startTime, "startTime");

//     console.log("addressAverage", addressAverage);


//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       const errorMsg = `Failed to fetch price for tokenAddress ${tokenAddress} on ${startTime}`;
//       console.error(`❌ ${errorMsg}`);
//       throw new Error(errorMsg);
//     }
//     const tokenPriceData = await responsePrice.json();
//     if (!tokenPriceData?.data || !Array.isArray(tokenPriceData.data) || tokenPriceData.data.length === 0 || !tokenPriceData.data[0]?.price) {
//       const errorMsg = `Invalid price data for tokenAddress ${tokenAddress} on ${startTime}`;
//       console.error(`❌ ${errorMsg}`, tokenPriceData);
//       throw new Error(errorMsg);
//     }
//     const tokenAverage = tokenPriceData.data[0].price;

//     console.log("addressAverage", addressAverage);
//     console.log("tokenAverage", tokenAverage);
//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages (Fetch pool swap activities)
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     const swapsTxs = dayData.filter(tx =>tx.activity_type === "ACTIVITY_TOKEN_SWAP");

//     console.log("swapsTxs", swapsTxs.length);

//      // Filter Buys and Sells
//     const buyTxs = swapsTxs.filter((tx) => tx.routers?.token2 === tokenAddress);
//     console.log("buyTxs", buyTxs.length);
//     const sellTxs = swapsTxs.filter((tx) => tx.routers?.token1 === tokenAddress);
//     console.log("sellTxs", sellTxs.length);


//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     console.log("buysVolumeInMintA", buysVolumeInMintA);
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     console.log("sellsVolumeMintB", sellsVolumeMintB);
//     const buysVolumee = buysVolumeInMintA * addressAverage;
//     const sellsVolumee = sellsVolumeMintB * tokenAverage;
//     const totalVolumeSwap = buysVolumee + sellsVolumee;

//     const ACTIVITY_AGG_TOKEN_SWAP = dayData.filter((tx)=>tx.activity_type == "ACTIVITY_AGG_TOKEN_SWAP")
//     console.log("ACTIVITY_AGG_TOKEN_SWAP", ACTIVITY_AGG_TOKEN_SWAP.length);



//     const clmmChildRouters = ACTIVITY_AGG_TOKEN_SWAP.flatMap((tx) =>
//       (tx.routers?.child_routers || []).filter((cr) =>
//        ( cr.token1 === address || cr.token1 === tokenAddress) && ( cr.token2 === address || cr.token2 === tokenAddress)

//       )
//     );
//     console.log("clmmChildRouters", clmmChildRouters.length);

//      // Filter Buys and Sells
//      const buyTxsAGG = clmmChildRouters.filter((tx) => tx.token2 === tokenAddress);
//      const sellTxsAGG = clmmChildRouters.filter((tx) => tx.token1 === tokenAddress);

//  console.log("buyTxsAGG", buyTxsAGG.length);
//  console.log("sellTxsAGG", sellTxsAGG.length);

//  const buysVolumeInMintAAGG = buyTxsAGG.reduce(
//   (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
//   0
// );
// console.log("buysVolumeInMintAAGG", buysVolumeInMintAAGG);
// const sellsVolumeMintBAGG = sellTxsAGG.reduce(
//   (sum, tx) => sum + Number(tx.amount1 / (10 ** tx.token1_decimals) ?? 0),
//   0
// );
// console.log("sellsVolumeMintBAGG", sellsVolumeMintBAGG);
// const buysVolumeAGG = buysVolumeInMintAAGG * addressAverage;
// console.log("buysVolumeAGG", buysVolumeAGG);
// const sellsVolumeAGG = sellsVolumeMintBAGG * tokenAverage;
// console.log("sellsVolumeAGG", sellsVolumeAGG);
// const totalVolumeAGG = buysVolumeAGG + sellsVolumeAGG;

// const totalVolume = totalVolumeSwap + totalVolumeAGG;
// console.log("totalVolume", totalVolume);

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     // Fetch pool liquidity from DexScreener API
//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//  });
//     const data1 = await response.json();
//     //   const lastReportDate= moment.utc().subtract(2, "days").format("YYYYMMDD")
//     //  console.log("lastReportDate",lastReportDate);

//     if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
//       const errorMsg = `Invalid liquidity data from DexScreener for pairAddress ${pairAddress} on ${startTime}`;
//       console.error(`❌ ${errorMsg}`, data1);
//       throw new Error(errorMsg);
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     // console.log("data1",data1.pairs[0].liquidity.usd);
//     // console.log("data2",data1);
//     console.log("startTime for company Wallet", startTime);
//     // Convert startTime string to number for database query (model expects Number type)
//     const startTimeNumber = parseInt(startTime, 10);
//     console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
//     if (companyWallet && companyWallet.length > 0) {
//       console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
//     }

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
//     if (compoundWallet && compoundWallet.length > 0) {
//       console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
//     }

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // CLMM companyWallet logic
//     if (companyWallet && Array.isArray(companyWallet) && companyWallet.length > 0) {
//       console.log(`Found ${companyWallet.length} companyWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//       companyWallet.forEach((doc) => {
//         totalPendingRewards += doc.pending_rewards || 0;
//         totalValue += doc.value || 0;
//       });
//       // Calculate derived values after summing all documents
//       companysRevenue = totalPendingRewards;
//       usersRevenue = poolRevenue - totalPendingRewards;
//       companysLiquidity = totalValue;
//       usersLiquidity = poolLiquidity - totalValue;
//       console.log(`Company Wallet - totalPendingRewards: ${totalPendingRewards}, totalValue: ${totalValue}, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//     } else {
//       console.log(`No companyWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//       // If no company wallet, all revenue and liquidity goes to users
//       usersRevenue = poolRevenue;
//       usersLiquidity = poolLiquidity;
//     }

//     if (compoundWallet && Array.isArray(compoundWallet) && compoundWallet.length > 0) {
//       console.log(`Found ${compoundWallet.length} compoundWallet documents for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards || 0;
//         compoundTotalValue += doc.value || 0;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//       console.log(`Compound Wallet - compoundRevenue: ${compoundRevenue}, compoundLiquidity: ${compoundLiquidity}`);
//     } else {
//       console.log(`No compoundWallet found for pairAddress: ${pairAddress}, startTime: ${startTime}`);
//     }


//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions:swapsTxs.length + clmmChildRouters.length,
//       buys,
//       sells,
//       buysVolume:buysVolumeAGG + buysVolumee,
//       sellsVolume:sellsVolumeAGG+sellsVolumee,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       startTime: startTimeNumber,
//       endTime: parseInt(endTime, 10),
//       addressAverage,
//       tokenAverage,
//     };


//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//     // res.status(200).json({
//     //   message: `Data saved for ${rwaName}`,
//     //    pairAddress,
//     //   tokenAddress,
//     //   rwaAddress,
//     //   rwaName,
//     //   chainId,
//     //   totalTransactions:dayData.length,
//     //   buys,
//     //   sells,
//     //   totalVolume,
//     //   LPadded,
//     //   dayData
//     // });
//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };


// //added on 20-12-25
// exports.getPoolTransactionsDefiCpmmDateWiseTest = async (
//   pairAddress,
//   tokenAddress,
//   address,
//   name,
//   poolType,
//   chainId,
//   lpPercentage,
//   req,
//   res,
//   targetDate = null // Optional: YYYYMMDD format or moment object, defaults to yesterday
// ) => {
//   try {
//     console.log(
//       "pairAddress :",
//       pairAddress,
//       "tokenAddress",
//       tokenAddress,
//       "address",
//       address,
//       "name",
//       name,
//       "poolType",
//       poolType,
//       "chainId",
//       chainId,
//       "lpPercentage",
//       lpPercentage,
//       "targetDate",
//       targetDate
//     );

//     // Calculate date range - use targetDate if provided, otherwise use yesterday
//     let targetMoment;
//     if (targetDate) {
//       // If targetDate is a string in YYYYMMDD format, parse it
//       if (typeof targetDate === 'string' && targetDate.length === 8) {
//         targetMoment = moment.utc(targetDate, "YYYYMMDD");
//       } else if (moment.isMoment(targetDate)) {
//         targetMoment = targetDate.clone().utc();
//       } else {
//         targetMoment = moment.utc(targetDate);
//       }
//     } else {
//       // Default to yesterday
//       targetMoment = moment.utc().subtract(1, "days");
//     }

//     // Set to start of day (00:00:00)
//     const dayStart = targetMoment.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
//     // Set to end of day (23:59:59)
//     const dayEnd = dayStart.clone().endOf("day");

//     const startTime = dayStart.format("YYYYMMDD"); // Target date in YYYYMMDD format
//     const endTime = dayStart.clone().add(1, "days").format("YYYYMMDD"); // Next day

//     // Convert to Unix timestamps
//     const from_time = dayStart.unix();
//     const to_time = dayEnd.unix();
//     console.log({
//       from_time,
//       to_time,
//       from_time_readable: moment
//         .unix(from_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//       to_time_readable: moment
//         .unix(to_time)
//         .utc()
//         .format("YYYY-MM-DD HH:mm:ss [UTC]"),
//     });
//     console.log("from_time", from_time, "to_time", to_time);

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//  process.env.SOL_API_TOKEN,
//       },
//     };

//      let birdeyeVolume = null;

// try {
//   const birdeyeUrl = `https://public-api.birdeye.so/defi/v3/ohlcv/pair?address=${pairAddress}&type=1D&time_from=${from_time}&time_to=${to_time}`;

//   const birdeyeResponse = await fetch(birdeyeUrl, {
//     method: "GET",
//     headers: {
//       accept: "application/json",
//       "x-chain": "solana",
//       "X-API-KEY": process.env.BIRDEYE_API_KEY, 
//     },
//   });

//   if (!birdeyeResponse.ok) {
//     const text = await birdeyeResponse.text();
//     console.error("❌ Birdeye HTTP Error:", birdeyeResponse.status, text);
//   } else {
//     const birdeyeData = await birdeyeResponse.json();

//     if (
//       birdeyeData?.success &&
//       Array.isArray(birdeyeData?.data?.items) &&
//       birdeyeData.data.items.length > 0
//     ) {
//       // 1D candle → single item
//       birdeyeVolume = birdeyeData.data.items[0].v_usd;
//       console.log("✅ Birdeye volume:", birdeyeVolume);
//     } else {
//       console.warn("⚠️ Birdeye returned no usable data", birdeyeData);
//     }
//   }
// } catch (err) {
//   console.error("❌ Birdeye fetch crashed:", err.message);
// }


//     const responseaddressPrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${address}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responseaddressPrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const addressPriceData = await responseaddressPrice.json();
//     const addressAverage = addressPriceData.data[0].price;

//     const responsePrice = await fetch(
//       `https://pro-api.solscan.io/v2.0/token/price?address=${tokenAddress}&from_time=${startTime}&to_time=${startTime}`,
//       requestOptions
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const tokenPriceData = await responsePrice.json();
//     const tokenAverage = tokenPriceData.data[0].price;

//     // console.log();


//     let page = 1;
//     let hasMore = true;
//     let dayData = [];

//     // Fetch Solscan pages
//     while (hasMore) {
//       const url = `https://pro-api.solscan.io/v2.0/token/defi/activities?address=${pairAddress}&page=${page}&from_time=${from_time}&to_time=${to_time}&page_size=100`;
//       const response = await fetch(url, {
//         method: "GET",
//         headers: { token: process.env.SOL_API_TOKEN },
//       });
//       const data = await response.json();

//       if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
//         dayData = dayData.concat(data.data);
//         console.log(`✅ Page ${page}: ${data.data.length} txs`);
//         page++;
//         await new Promise((r) => setTimeout(r, 400));
//       } else {
//         hasMore = false;
//       }
//     }

//     if (dayData.length === 0) {
//       console.log("🚫 No transactions found, skipping...");
//       // return res.status(200).json({ message: "No transactions for this date" });
//     }

//     // Filter Buys and Sells
//     const buyTxs = dayData.filter((tx) => tx.routers?.token2 === address);
//     const sellTxs = dayData.filter((tx) => tx.routers?.token1 === address);

//     const buys = buyTxs.length;
//     const sells = sellTxs.length;

//     const lpReward = await Settings.findOne({ status: true });

//     console.log("lpReward", lpReward);

//     const buysVolumeInMintA = buyTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const sellsVolumeMintB = sellTxs.reduce(
//       (sum, tx) => sum + Number(tx.routers.amount1 / (10 ** tx.routers.token1_decimals) ?? 0),
//       0
//     );
//     const buysVolume = buysVolumeInMintA * tokenAverage;
//     const sellsVolume = sellsVolumeMintB * addressAverage;
//     // const totalVolume = buysVolume + sellsVolume;
//     const totalVolume = birdeyeVolume;

//     const LPadded = totalVolume * lpPercentage * lpReward.lpRewardPool;

//     const urll = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`;

//     const response = await fetch(urll, {
//       method: "GET",
//       // headers: { token: process.env.SOL_API_TOKEN },
//     });
//     const data1 = await response.json();

//     if (!data1 || !data1.pairs || !Array.isArray(data1.pairs) || data1.pairs.length === 0 || !data1.pairs[0] || !data1.pairs[0].liquidity || !data1.pairs[0].liquidity.usd) {
//       console.error("Error: Invalid data from DexScreener API for pairAddress:", pairAddress, data1);
//       console.log("⚠️ Skipping pool due to missing liquidity data from DexScreener");
//       return; // Skip this pool if liquidity data is not available
//     }

//     const poolLiquidity = data1.pairs[0].liquidity.usd;

//     console.log("startTime for company Wallet", startTime);
//     // Convert startTime string to number for database query (model expects Number type)
//     const startTimeNumber = parseInt(startTime, 10);
//     console.log("Querying CompanyPoolRevenue with pairAddress:", pairAddress, "startTime (string):", startTime, "startTime (number):", startTimeNumber);

//     const companyWallet = await CompanyPoolRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("companyWallet query result:", companyWallet ? `Found ${companyWallet.length} documents` : "null/undefined");
//     if (companyWallet && companyWallet.length > 0) {
//       console.log("companyWallet documents:", JSON.stringify(companyWallet, null, 2));
//     }

//     const compoundWallet = await CompoundRevenue.find({
//       pairAddress,
//       startTime: startTimeNumber,
//     });
//     console.log("compoundWallet query result:", compoundWallet ? `Found ${compoundWallet.length} documents` : "null/undefined");
//     if (compoundWallet && compoundWallet.length > 0) {
//       console.log("compoundWallet documents:", JSON.stringify(compoundWallet, null, 2));
//     }

//     let totalPendingRewards = 0;
//     let totalValue = 0;
//     let usersRevenue = 0;
//     let companysRevenue = 0;
//     let companysLiquidity = 0;
//     let usersLiquidity = 0;
//     let compoundRevenue = 0;
//     let compoundLiquidity = 0;
//     let poolRevenue = totalVolume * lpPercentage * (lpReward.lpRewardPool);

//     // Calculate companysRevenue and usersRevenue for CPMM pools using lpMint from Token collection
//     if (poolRevenue > 0) {
//       try {
//         // Get lpMint from Token collection (already saved in tokenSchema)
//         const tokenDoc = await Token.findOne({ tokenAddress: tokenAddress });
//         const lpMintAddress = tokenDoc?.lpMint;

//         if (lpMintAddress) {
//           // Fetch token holders from Solscan API
//           const holdersUrl = `https://pro-api.solscan.io/v2.0/token/holders?address=${lpMintAddress}&page=1&page_size=10`;
//           const holdersResponse = await fetch(holdersUrl, requestOptions);
//           const holdersData = await holdersResponse.json();

//           if (holdersData.success && holdersData.data?.items?.length > 0) {
//             // Get the first holder (rank 1) percentage
//             const percentage = holdersData.data.items[0].percentage;

//             // Calculate companysRevenue = poolRevenue * (percentage / 100)
//             companysRevenue = poolRevenue * (percentage / 100);
//             companysLiquidity = poolLiquidity * (percentage / 100);
//             // Calculate usersRevenue = poolRevenue - companysRevenue
//             usersRevenue = poolRevenue - companysRevenue;
//             usersLiquidity = poolLiquidity - companysLiquidity;

//             console.log(`CPMM Pool - poolRevenue: ${poolRevenue}, percentage: ${percentage}%, companysRevenue: ${companysRevenue}, usersRevenue: ${usersRevenue}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching token holders for CPMM pool:", error);
//       }
//     }

//     // Update liquidity values from companyWallet if exists
//     // if (companyWallet) {
//     //   companyWallet.forEach((doc) => {
//     //     totalValue += doc.value;
//     //     usersLiquidity = poolLiquidity - totalValue;
//     //     companysLiquidity = totalValue;

//     //   });
//     // }

//     if (compoundWallet) {
//       let compoundTotalPendingRewards = 0;
//       let compoundTotalValue = 0;
//       compoundWallet.forEach((doc) => {
//         compoundTotalPendingRewards += doc.pending_rewards;
//         compoundTotalValue += doc.value;
//       });
//       compoundRevenue = compoundTotalPendingRewards;
//       compoundLiquidity = compoundTotalValue;
//     }

//     // Build base report data

//     let reportData = {
//       pairAddress,
//       tokenAddress,
//       poolType,
//       address,
//       name,
//       chainId,
//       totalTransactions: dayData.length,
//       buys,
//       sells,
//       buysVolume,
//       sellsVolume,
//       totalVolume,
//       poolLiquidity,
//       companysLiquidity,
//       usersLiquidity,
//       poolRevenue,
//       usersRevenue,
//       companysRevenue,
//       compoundRevenue,
//       compoundLiquidity,
//       addressAverage,
//       tokenAverage,
//       startTime: startTimeNumber,
//       endTime: parseInt(endTime, 10),
//     };

//     // Save report
//     const newReport = new rwaPoolsReport(reportData);
//     await newReport.save();

//     console.log(`✅ Saved ${name} data for ${startTime}`);

//   } catch (error) {
//     console.error("Error:", error);
//     // res.status(500).json({ error: error.message });
//   }
// };





// exports.getRwaReportsDateWiseTest = async (req, res) => {
//   try {
//     // Get date range from query parameters
//     // Format: fromDate=20250101&toDate=20250131 (YYYYMMDD format)
//     // If not provided, defaults to yesterday only
//     let fromDate = req?.query?.fromDate || null;
//     let toDate = req?.query?.toDate || null;

//     // Parse dates if provided
//     let fromMoment, toMoment;
//     if (fromDate && toDate) {
//       // Validate date format (YYYYMMDD)
//       if (!/^\d{8}$/.test(fromDate) || !/^\d{8}$/.test(toDate)) {
//         if (res) {
//           return res.status(400).json({ 
//             error: "Invalid date format. Use YYYYMMDD format (e.g., 20250101)" 
//           });
//         }
//         throw new Error("Invalid date format. Use YYYYMMDD format");
//       }

//       fromMoment = moment.utc(fromDate, "YYYYMMDD");
//       toMoment = moment.utc(toDate, "YYYYMMDD");

//       if (!fromMoment.isValid() || !toMoment.isValid()) {
//         if (res) {
//           return res.status(400).json({ error: "Invalid dates provided" });
//         }
//         throw new Error("Invalid dates provided");
//       }

//       if (fromMoment.isAfter(toMoment)) {
//         if (res) {
//           return res.status(400).json({ error: "fromDate must be before or equal to toDate" });
//         }
//         throw new Error("fromDate must be before or equal to toDate");
//       }

//       console.log(`📅 Processing date range: ${fromDate} to ${toDate}`);
//     } else {
//       // Default to yesterday if no dates provided
//       fromMoment = moment.utc().subtract(1, "days");
//       toMoment = fromMoment.clone();
//       console.log(`📅 No date range provided, processing yesterday only: ${fromMoment.format("YYYYMMDD")}`);
//     }

//     // Generate array of dates to process (day by day)
//     const datesToProcess = [];
//     let currentDate = fromMoment.clone();
//     while (currentDate.isSameOrBefore(toMoment, 'day')) {
//       datesToProcess.push(currentDate.clone());
//       currentDate.add(1, 'day');
//     }

//     console.log(`📊 Will process ${datesToProcess.length} day(s) of reports`);

//     // Initialize global progress tracker
//     rwaReportsProgress.isRunning = true;
//     rwaReportsProgress.startTime = new Date();
//     rwaReportsProgress.fromDate = fromMoment.format("YYYYMMDD");
//     rwaReportsProgress.toDate = toMoment.format("YYYYMMDD");
//     rwaReportsProgress.totalDates = datesToProcess.length;
//     rwaReportsProgress.processedDates = 0;
//     rwaReportsProgress.currentDate = null;
//     rwaReportsProgress.processedDatesList = [];
//     rwaReportsProgress.skippedDates = [];
//     rwaReportsProgress.totalPools = 0;
//     rwaReportsProgress.processedPools = 0;
//     rwaReportsProgress.failedPools = [];
//     rwaReportsProgress.lastUpdate = new Date();
//     rwaReportsProgress.errors = [];

//     // Track processing statistics
//     const processingStats = {
//       totalDates: datesToProcess.length,
//       processedDates: 0,
//       skippedDates: [],
//       totalPools: 0,
//       processedPools: 0,
//       failedPools: [],
//       errors: []
//     };

//     // Process each date
//     for (let dateIndex = 0; dateIndex < datesToProcess.length; dateIndex++) {
//       const targetDate = datesToProcess[dateIndex];
//       const dateStr = targetDate.format("YYYYMMDD");

//       // Update progress tracker
//       rwaReportsProgress.currentDate = dateStr;
//       rwaReportsProgress.lastUpdate = new Date();

//       console.log(`\n${'='.repeat(60)}`);
//       console.log(`📅 Processing date ${dateIndex + 1}/${datesToProcess.length}: ${dateStr}`);
//       console.log(`📊 Progress: ${dateIndex}/${datesToProcess.length} dates (${((dateIndex / datesToProcess.length) * 100).toFixed(2)}%)`);
//       console.log(`${'='.repeat(60)}\n`);

//       let dateProcessed = false;
//       let poolsForDate = 0;
//       let poolsProcessedForDate = 0;

//       try {
//         //fetch platforms
//         const platforms = await PlatformSchema.find({});
//         // Verify tokenData and ensure it's valid
//         if (!platforms || platforms.length === 0) {
//           console.log("⚠️ No platforms found in the database for this date.");
//           processingStats.skippedDates.push({ date: dateStr, reason: "No platforms found" });
//           continue; // Skip this date if no platforms
//         }

//       // Loop through each platform and call getAllActivities for each
//       for (let i = 0; i < platforms.length; i++) {
//         const platform = platforms[i];

//         // Ensure platform is defined before passing it to getAllActivities
//         if (!platform) {
//           console.error(`Platform at index ${i} is undefined`);
//           continue; // Skip this iteration if platform is undefined
//         }
//         const tokens = await TokenSchema.find({ platformId: platform._id });

//         for (let i = 0; i < tokens.length; i++) {
//           const token = tokens[i];
//           if (!token) continue;

//           const {
//             //  tokenAddress, solAddress, usd_min ,name,token_logo_url,
//             chainId,
//             symbol,
//           } = token;

//           const LiquidityPools = await RWASchema.find({
//             tokenAddress: token.tokenAddress,
//           });
//           if (!LiquidityPools || LiquidityPools.length === 0) {
//             console.log(`No LiquidityPools found for token ${symbol}. Skipping.`);
//             continue; // Skip this iteration if no wallets are found
//           }
//           for (let j = 0; j < LiquidityPools.length; j++) {
//             const LiquidityPool = LiquidityPools[j];
//             if (!LiquidityPool) continue;
//             console.log(
//               `\n=== Processing LiquidityPool ${j + 1}/${LiquidityPools.length
//               } for token ${symbol} (Date: ${dateStr}) ===`
//             );
//             const {
//               pairAddress,
//               tokenAddress,
//               address,
//               name,
//               lpPercentage,
//               poolType,
//             } = LiquidityPool;

//             poolsForDate++;
//             processingStats.totalPools++;
//             rwaReportsProgress.totalPools++;

//             try {
//               // Check if report already exists for this date and pool
//               const startTimeNumber = parseInt(targetDate.format("YYYYMMDD"), 10);
//               const existingReport = await rwaPoolsReport.findOne({
//                 pairAddress,
//                 startTime: startTimeNumber,
//               });

//               if (existingReport) {
//                 console.log(`⏩ Skipping ${pairAddress} - report already exists for ${dateStr}`);
//                 poolsProcessedForDate++;
//                 processingStats.processedPools++;
//                 rwaReportsProgress.processedPools++;
//                 rwaReportsProgress.lastUpdate = new Date();
//                 continue;
//               }

//               if (poolType && poolType.toLowerCase() === "cpmm") {
//                 // Route to CPMM function with targetDate
//                 await exports.getPoolTransactionsDefiCpmmDateWiseTest(
//                   pairAddress,
//                   tokenAddress,
//                   address,
//                   name,
//                   poolType,
//                   chainId,
//                   lpPercentage,
//                   req,
//                   res,
//                   targetDate
//                 );
//                 poolsProcessedForDate++;
//                 processingStats.processedPools++;
//                 rwaReportsProgress.processedPools++;
//                 rwaReportsProgress.lastUpdate = new Date();
//                 console.log(`✅ Completed CPMM pool ${pairAddress} for token ${symbol} (Date: ${dateStr})`);
//               } else {
//                 // 👇 await everything sequentially — prevents overlap
//                 await exports.getPoolTransactionsDefiDateWiseTest(
//                   pairAddress,
//                   tokenAddress,
//                   address,
//                   name,
//                   poolType,
//                   chainId,
//                   lpPercentage,
//                   req,
//                   res,
//                   targetDate
//                 );
//                 poolsProcessedForDate++;
//                 processingStats.processedPools++;
//                 rwaReportsProgress.processedPools++;
//                 rwaReportsProgress.lastUpdate = new Date();
//                 console.log(`✅ Completed pool ${pairAddress} for token ${symbol} (Date: ${dateStr})`);
//               }
//             } catch (poolError) {
//               console.error(`❌ Error processing pool ${pairAddress} for date ${dateStr}:`, poolError.message);
//               const failedPool = {
//                 pairAddress,
//                 tokenAddress,
//                 name,
//                 date: dateStr,
//                 error: poolError.message
//               };
//               processingStats.failedPools.push(failedPool);
//               rwaReportsProgress.failedPools.push(failedPool);
//               processingStats.errors.push({
//                 date: dateStr,
//                 pool: pairAddress,
//                 error: poolError.message
//               });
//               rwaReportsProgress.errors.push({
//                 date: dateStr,
//                 pool: pairAddress,
//                 error: poolError.message
//               });
//               rwaReportsProgress.lastUpdate = new Date();
//               // Continue processing other pools even if one fails
//             }

//             console.log(
//               `✅ Completed LiquidityPool ${pairAddress} for token ${symbol} (Date: ${dateStr})\n`
//             );

//           }

//           console.log(`🔥 Completed all LiquidityPools for token ${symbol} (Date: ${dateStr})`);
//         }
//       }

//         dateProcessed = true;
//         processingStats.processedDates++;
//         rwaReportsProgress.processedDates++;
//         rwaReportsProgress.processedDatesList.push(dateStr);
//         rwaReportsProgress.lastUpdate = new Date();

//         // Calculate estimated completion time
//         if (rwaReportsProgress.processedDates > 0) {
//           const elapsed = (new Date() - rwaReportsProgress.startTime) / 1000; // seconds
//           const avgTimePerDate = elapsed / rwaReportsProgress.processedDates;
//           const remainingDates = rwaReportsProgress.totalDates - rwaReportsProgress.processedDates;
//           const estimatedSeconds = avgTimePerDate * remainingDates;
//           rwaReportsProgress.estimatedCompletion = new Date(Date.now() + estimatedSeconds * 1000);
//         }

//         console.log(`\n✅ Completed processing for date: ${dateStr} (${poolsProcessedForDate}/${poolsForDate} pools processed)\n`);
//       } catch (dateError) {
//         console.error(`❌ Error processing date ${dateStr}:`, dateError.message);
//         processingStats.skippedDates.push({ date: dateStr, reason: dateError.message });
//         rwaReportsProgress.skippedDates.push({ date: dateStr, reason: dateError.message });
//         processingStats.errors.push({
//           date: dateStr,
//           error: dateError.message
//         });
//         rwaReportsProgress.errors.push({
//           date: dateStr,
//           error: dateError.message
//         });
//         rwaReportsProgress.lastUpdate = new Date();
//       }
//     }

//     // Mark as completed
//     rwaReportsProgress.isRunning = false;
//     rwaReportsProgress.currentDate = null;

//     // Print summary
//     console.log(`\n${'='.repeat(60)}`);
//     console.log(`📊 PROCESSING SUMMARY`);
//     console.log(`${'='.repeat(60)}`);
//     console.log(`Total Dates: ${processingStats.totalDates}`);
//     console.log(`Processed Dates: ${processingStats.processedDates}`);
//     console.log(`Skipped Dates: ${processingStats.skippedDates.length}`);
//     if (processingStats.skippedDates.length > 0) {
//       console.log(`Skipped Dates List:`, processingStats.skippedDates);
//     }
//     console.log(`Total Pools: ${processingStats.totalPools}`);
//     console.log(`Processed Pools: ${processingStats.processedPools}`);
//     console.log(`Failed Pools: ${processingStats.failedPools.length}`);
//     if (processingStats.failedPools.length > 0) {
//       console.log(`Failed Pools List:`, processingStats.failedPools);
//     }
//     console.log(`${'='.repeat(60)}\n`);

//     console.log(`\n🎉 Completed processing all dates from ${fromMoment.format("YYYYMMDD")} to ${toMoment.format("YYYYMMDD")}`);

//     if (res) {
//       return res.status(200).json({ 
//         message: `Processed reports from ${fromMoment.format("YYYYMMDD")} to ${toMoment.format("YYYYMMDD")}`,
//         summary: {
//           totalDates: processingStats.totalDates,
//           processedDates: processingStats.processedDates,
//           skippedDates: processingStats.skippedDates,
//           totalPools: processingStats.totalPools,
//           processedPools: processingStats.processedPools,
//           failedPools: processingStats.failedPools
//         },
//         fromDate: fromMoment.format("YYYYMMDD"),
//         toDate: toMoment.format("YYYYMMDD")
//       });
//     }
//   } catch (error) {
//     console.error("Error in getRwaReports:", error);
//     rwaReportsProgress.isRunning = false;
//     rwaReportsProgress.errors.push({
//       type: "fatal",
//       error: error.message,
//       timestamp: new Date()
//     });
//     if (res) {
//       return res.status(500).json({ error: error.message });
//     }
//     throw error;
//   }
// };




// 🕛 Runs every day at 00:01 UTC
cron.schedule("01 00 * * *", async () => {
  // const timestamp = moment.utc().format("YYYY-MM-DD HH:mm:ss [UTC]");
  // console.log(`🕛 [${timestamp}] Nord cron duty running at 12:02 UTC`);

  const timestamp = moment.utc().format("YYYY-MM-DD HH:mm:ss [UTC]");
  console.log(`🕛 [${timestamp}] Daily cron running at 00:01 UTC`);

  try {

    console.log("🚀 Starting walletAddDynamically...");
    await exports.walletAddDynamically(null, null);

    console.log("🚀 Starting getTokenData...");
    await exports.getTokenData(null, null, null);

    console.log("🚀 Starting getDailyTokenReport...");
    await exports.getDailyTokenReport(null, null, null);

    console.log("🚀 Starting getholderDailydata...");
    await exports.getholderDailydata(null, null, null);

    console.log("🚀 Starting savePoolsByWallet...");
    await getAllWalletsData();
    // await savePoolsByWallet(allWalletsData);

    console.log("🚀 Starting saveCompoundPoolsByWallet...");
    await getAllCompoundWalletsData();
    // await saveCompoundPoolsByWallet(allCompoundWalletsData);

    console.log("🚀 Starting saveLiquidityPools...");
    await exports.saveLiquidityPools(null, null, null);

    console.log("🚀 Starting getRwaReports...");
    await exports.getRwaReports(null, null, null);

    console.log("🚀 Starting calculateAndSavePoolReportsByAllWallets...");
    await exports.calculateAndSavePoolReportsByAllWallets(null, null);

    console.log("🚀 Starting SaveDailyWalletReportsAggregates...");
    await exports.SaveDailyWalletReportsAggregates(null, null);

    console.log("✅ All cron tasks finished successfully.");
  } catch (err) {
    console.error("❌ Error in daily cron:", err);
  }
});
