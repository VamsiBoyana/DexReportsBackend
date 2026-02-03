const express = require("express");
const router = express.Router();
const {
  getLiveTokenData, getWalletSum, getWalletBalance, getTokenData, getAllActivities,
  tokenReportsTotal,
  walletReportsSingle,
  walletReportsTotal,
  getActiveNetworks,
  getActivePlatforms,
  getActiveTokens,
  getDailyTokenReport,
  getFilteredReports,
  tokenHoldersList,
  getholderDailydata,
  getPooledSolAndTokens,
  livePoolsData,
  getLiquidityPools,
  getDailyRWAPoolsReports,
  getRWAPoolDateRangeReport,
  livePoolsNotRWA,
  saveLiquidityPools,
  getPaginatedTokens,
  getPaginatedPairs,
  getWalletsData,
  getSwapsData,
  getRwaReports,
  getRwaReportsDateWiseLive,
  getPoolReports,
  calculateAndSavePoolReportsByAllWallets,
  SaveDailyWalletReportsAggregates,
  getDailyWalletReportsAggregates,
  walletAddDynamically,
  getMissingReportDates,
  getLivePairsData,
  getAllActivitiesDEFIStatic,
  getTokenDataDatetoDateLive,
  getPoolTransactionsDefiCpmmBharathApi
  // walletAddDynamically2



} = require("../controllers/mainController");


const {getAllWalletsData, processWallet, savePoolsByWallet, getAllCompoundWalletsData, saveCompoundPoolsByWallet } = require("../controllers/walletsRevenue");
router.get('/getAllWalletsData', getAllWalletsData);
router.post('/savePoolsByWallet', savePoolsByWallet);
router.get('/getAllCompoundWalletsData', getAllCompoundWalletsData);
router.post('/saveCompoundPoolsByWallet', saveCompoundPoolsByWallet);
router.post("/getMissingReportDates",getMissingReportDates)
router.get("/getAllActivitiesDEFIStatic",getAllActivitiesDEFIStatic)


router.get("/getLiveTokenData", getLiveTokenData);
router.get("/getLivePairsData",getLivePairsData)
router.get("/getAllActivities", getAllActivities);
router.get("/getTokenData", getTokenData);
router.get("/getWalletBalance", getWalletBalance);
router.get("/getWalletSum", getWalletSum);

router.get('/getPoolTransactionsDefiCpmmBharathApi', getPoolTransactionsDefiCpmmBharathApi);


router.get('/tokenReportsTotal', tokenReportsTotal);

// router.get('/walletReportsSingle/:walletAddress', walletReportsSingle);
router.get('/walletReportsTotal', walletReportsTotal);


router.get('/getActiveNetworks', getActiveNetworks);
router.get('/getActivePlatforms', getActivePlatforms);
router.get('/getActiveTokens', getActiveTokens);
router.get('/getDailyTokenReport', getDailyTokenReport);
router.get('/getFilteredReports', getFilteredReports);
router.get("/tokenHoldersList",tokenHoldersList);
router.get("/getholderDailydata",getholderDailydata);

router.get('/getPooledSolAndTokens', getPooledSolAndTokens);
router.post('/saveLiquidityPools', saveLiquidityPools);
router.get('/livePoolsNotRWA',livePoolsNotRWA)

router.get('/livePoolsData', livePoolsData);
router.get('/getLiquidityPools', getLiquidityPools);
router.get("/getPaginatedTokens", getPaginatedTokens);
router.get("/getPaginatedPairs",getPaginatedPairs)
router.get('/getDailyRWAPoolsReports', getDailyRWAPoolsReports);
router.get('/getRWAPoolDateRangeReport', getRWAPoolDateRangeReport);
router.get('/getWalletsData', getWalletsData);
router.get('/getSwapsData', getSwapsData);
router.post('/walletAddDynamically', walletAddDynamically);
// router.post('/walletAddDynamically2', walletAddDynamically2);


router.get('/getRwaReports', getRwaReports);
router.get('/getRwaReportsDateWiseLive', getRwaReportsDateWiseLive);
router.get('/getPoolReports', getPoolReports);
router.get('/calculateAndSavePoolReportsByAllWallets', calculateAndSavePoolReportsByAllWallets);
router.get('/SaveDailyWalletReportsAggregates', SaveDailyWalletReportsAggregates);
router.get('/getDailyWalletReportsAggregates', getDailyWalletReportsAggregates);
router.get('/getTokenDataDatetoDateLive', getTokenDataDatetoDateLive);








module.exports = router;
