const express = require('express');
const router = express.Router();

const { adminSignup, adminLogin, createNetwork, updateNetwork, createPlatform, updatePlatform, createToken,
     updateToken, getTokens, getSettings, getPlatforms, getNetworks, getSingleAndAllUsers, updateUserById,
     deleteUserById, getLiveTokenData, addWallet, getWallets, getWalletReports, getTokenReports,
     adminLogout, getActiveNetworks, getActivePlatforms, tokenReportsTotal, walletReportsTotal, walletReportsSingle,
     getActiveTokens, updateUserProfile, createOrUpdateSettings, CreateAndUpdatePoolWalletData, getPoolWalletData,
     addCompanyWallet, updateCompanyWallet, getCompanyWallets, addCompoundWallet, updateCompoundWallet, getCompoundWallets } = require('../controllers/admin/adminController');

router.post('/adminSignup', adminSignup);
router.post('/adminLogin', adminLogin);
router.post('/adminLogout', adminLogout);

router.post('/updateUserProfile/:_id', updateUserProfile);

router.post('/createNetwork', createNetwork);
router.put('/updateNetwork/:_id', updateNetwork);
router.get('/getNetworks', getNetworks);

router.post('/createPlatform', createPlatform);
router.put('/updatePlatform/:_id', updatePlatform);
router.get('/getPlatforms', getPlatforms);

router.post('/createToken', createToken);
router.put('/updateToken/:_id', updateToken);
router.get('/getTokens', getTokens);

router.get('/getSingleAndAllUsers', getSingleAndAllUsers);
router.post('/updateUser/:_id', updateUserById);
router.delete('/deleteUserById/:_id', deleteUserById);

// router.get('/getLiveTokenData', getLiveTokenData);

router.post('/addWallet', addWallet);
router.get('/getWallets', getWallets);

router.post('/addCompoundWallet', addCompoundWallet);
// router.put('/updateCompoundWallet', updateCompoundWallet);
router.get('/getCompoundWallets', getCompoundWallets);

router.get('/getWalletReports', getWalletReports);
router.get('/getTokenReports', getTokenReports);

router.post('/createOrUpdateSettings', createOrUpdateSettings);
router.get("/getSettings", getSettings)

router.post('/CreateAndUpdatePoolWalletData', CreateAndUpdatePoolWalletData);
router.get('/getPoolWalletData', getPoolWalletData);

router.post('/addCompanyWallet', addCompanyWallet);
// router.put('/updateCompanyWallet', updateCompanyWallet);
router.get('/getCompanyWallets', getCompanyWallets);

module.exports = router;
