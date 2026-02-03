// const bs58 = require('bs58');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const moment = require('moment');
// // const connectDB = require('./config/database');
// const PoolRevenue = require('../models/CompanyPoolRevenue');
// const companysWallets = require('../models/companysWallets');
// const CompoundWallet = require('../models/CompoundWallet');
// const CompoundRevenue = require('../models/CompoundRevenue');

// // const env = process.env.NODE_ENV || 'development';
// // dotenv.config({ path: env === 'production' ? '.env.production' : '.env' });

// const HELIUS_RPC =
//   process.env.HELIUS_RPC_URL ||
//   'https://mainnet.helius-rpc.com/?api-key=a9badffe-f603-4d7c-b463-be0fcb709d89';

// const WALLET_ADDRESSES = process.env.WALLET_REVENUE_ADDRESSES
//   ? process.env.WALLET_REVENUE_ADDRESSES.split(',')
//       .map((address) => address.trim())
//       .filter(Boolean)
//   : [
//       'F5p8LPiTg3cbshsQzdUyoYCCVgCKJYiPussrL13xQzXW',
//       'DYmMJWR4fdMDZ12dtRtS58vUrqxpqyJRQScSUURB34Bu',
//       'EneZ4P3zzWtGAcHwVpiqHxc74vfhRQcCFnvDDkZe6dus',
//       'BYcNR16jbiFHArFPLGfmqRSU9AKrBV2JWmr6iBN9BGK8',
//       '3YH96WcqA7sAopcmDe8VdMbkGSnQHoUNL25xqW7c2CXH',
//       'CvtJtKpUaez9i6AW19muWxKtKyKMpSr9YMak3iNeEyWa',
//     ];
// const RAYDIUM_CLMM_PROGRAM =
//   process.env.RAYDIUM_CLMM_PROGRAM || 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';

// // async function httpsGet(url) {
// //     try {
// //         const response = await fetch(url);
// //         return await response.json();
// //     } catch {
// //         const response = await fetch(url);
// //         return await response.text();
// //     }
// // }

// // async function heliusRpc(method, params) {
// //     const data = {
// //         jsonrpc: '2.0',
// //         id: 1,
// //         method: method,
// //         params: params
// //     };
    
// //     const headers = {
// //         'Content-Type': 'application/json'
// //     };
    
// //     const response = await fetch(HELIUS_RPC, {
// //         method: 'POST',
// //         headers: headers,
// //         body: JSON.stringify(data)
// //     });
// //     return await response.json();
// // }

// // async function getAssetsByOwner(walletAddress) {
// //     const data = {
// //         jsonrpc: '2.0',
// //         id: 'test',
// //         method: 'getAssetsByOwner',
// //         params: {
// //             ownerAddress: walletAddress,
// //             page: 1,
// //             limit: 100
// //         }
// //     };
// //     const response = await fetch(HELIUS_RPC, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(data)
// //     });
// //     return await response.json();
// // }

// // async function fetchRaydiumPosition(positionId) {
// //     const url = `https://api-v3.raydium.io/clmm/position/info?id=${positionId}`;
// //     try {
// //         const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
// //         if (response.status === 200) {
// //             const data = await response.json();
// //             if (data.data && data.data) {
// //                 return data.data;
// //             }
// //         }
// //     } catch (e) {
// //     }
    
// //     const url2 = `https://dynamic-ipfs.raydium.io/clmm/position?id=${positionId}`;
// //     try {
// //         const response = await fetch(url2, { signal: AbortSignal.timeout(5000) });
// //         if (response.status === 200) {
// //             const data = await response.json();
// //             if (data.poolInfo) {
// //                 return data;
// //             }
// //         }
// //     } catch (e) {
// //     }
    
// //     return null;
// // }

// // async function processWallet(walletAddress) {
// //     const walletData = {
// //         wallet: walletAddress,
// //         pools: [],
// //         total_pending_rewards: 0,
// //         total_value: 0
// //     };
    
// //     console.log(`\n[DEBUG] Checking wallet balance first...`);
// //     const balanceResult = await heliusRpc('getBalance', [walletAddress]);
// //     console.log(`[DEBUG] Wallet balance: ${balanceResult.result?.value / 1000000000 || 0} SOL`);
    
// //     console.log(`\n[DEBUG] Trying Raydium portfolio API...`);
// //     try {
// //         const portfolioUrl = `https://api-v3.raydium.io/portfolio/wallet?address=${walletAddress}`;
// //         const portfolioResponse = await fetch(portfolioUrl);
// //         console.log(`[DEBUG] Portfolio API status: ${portfolioResponse.status}`);
        
// //         if (portfolioResponse.status === 200) {
// //             const portfolioData = await portfolioResponse.json();
// //             console.log(`[DEBUG] Portfolio data:`, JSON.stringify(portfolioData, null, 2));
            
// //             if (portfolioData.success && portfolioData.data?.clmm) {
// //                 const clmmPositions = portfolioData.data.clmm;
// //                 console.log(`[DEBUG] Found ${clmmPositions.length} CLMM positions`);
                
// //                 for (const position of clmmPositions) {
// //                     const positionAddress = position.nftMint || position.id;
// //                     const raydiumData = await fetchRaydiumPosition(positionAddress);
                    
// //                     if (raydiumData) {
// //                         let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr,pairAddress;
                        
// //                         if (raydiumData.poolInfo) {
// //                             const poolInfo = raydiumData.poolInfo;
// //                             const positionInfo = raydiumData.positionInfo;
                            
// //                             poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
// //                             pairAddress = poolInfo.id;
// //                             pendingRewards = positionInfo.unclaimedFee.usdValue;
// //                             value = positionInfo.usdValue;
// //                             currentPrice = poolInfo.price || 0;
// //                             priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                            
// //                             priceLower = raydiumData.positionRange?.priceLower || 0;
// //                             priceUpper = raydiumData.positionRange?.priceUpper || 0;
                            
// //                             const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                             const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
// //                             rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
// //                             apr = raydiumData.apr?.day?.apr || 0;
// //                         } else {
// //                             const poolInfo = raydiumData.poolInfo || {};
// //                             const mintA = poolInfo.mintA || {};
// //                             const mintB = poolInfo.mintB || {};
                            
// //                             poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
// //                              pairAddress = poolInfo.id;

                            
// //                             const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
// //                             const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
// //                             value = amountAUsd + amountBUsd;
                            
// //                             const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
// //                             const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
// //                             pendingRewards = feeAUsd + feeBUsd;
                            
// //                             currentPrice = poolInfo.price || 0;
// //                             priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                            
// //                             priceLower = parseFloat(raydiumData.priceLower || 0);
// //                             priceUpper = parseFloat(raydiumData.priceUpper || 0);
                            
// //                             const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                             const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
// //                             rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
// //                             apr = raydiumData.apr || 0;
// //                         }
                        
// //                         walletData.pools.push({
// //                             pool: poolPair,
// //                             pairAddress: pairAddress,
// //                             platform: 'Raydium',
// //                             range: rangStr,
// //                             current_price: priceStr,
// //                             apr: apr,
// //                             pending_rewards: pendingRewards,
// //                             value: value
// //                         });
// //                         walletData.total_pending_rewards += pendingRewards;
// //                         walletData.total_value += value;
// //                     }
// //                 }
                
// //                 if (walletData.pools.length > 0) {
// //                     return walletData;
// //                 }
// //             }
// //         } else {
// //             const errorText = await portfolioResponse.text();
// //             console.log(`[DEBUG] Portfolio API error: ${errorText}`);
// //         }
// //     } catch (e) {
// //         console.log(`[DEBUG] Portfolio API exception:`, e.message);
// //     }
    
// //     console.log(`[DEBUG] Trying on-chain query method...`);
// //     const positionResult = await heliusRpc('getProgramAccounts', [
// //         RAYDIUM_CLMM_PROGRAM,
// //         {
// //             encoding: 'base64',
// //             filters: [
// //                 {
// //                     memcmp: {
// //                         offset: 40,
// //                         bytes: walletAddress
// //                     }
// //                 },
// //                 {
// //                     dataSize: 216
// //                 }
// //             ]
// //         }
// //     ]);
    
// //     console.log(`[DEBUG] On-chain query found ${positionResult.result?.length || 0} positions`);
    
// //     if (positionResult.result && positionResult.result.length > 0) {
// //         for (const posAccount of positionResult.result) {
// //             const positionAddress = posAccount.pubkey;
            
// //             const dataBytes = Buffer.from(posAccount.account.data[0], 'base64');
            
// //             const poolIdBytes = dataBytes.slice(8, 40);
// //             // FIX: Use Buffer.from if poolIdBytes is not a Uint8Array, otherwise use as is
// //             const poolId = bs58.encode(Buffer.from(poolIdBytes));


            
// //             const tickLower = dataBytes.readInt32LE(73);
// //             const tickUpper = dataBytes.readInt32LE(77);
// //             const liquidity = dataBytes.readBigUInt64LE(81);
            
// //             if (liquidity === 0n) {
// //                 continue;
// //             }
            
// //             const raydiumData = await fetchRaydiumPosition(positionAddress);
            
// //             if (raydiumData) {
// //                 let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr, pairAddress;
                
// //                 if (raydiumData.poolInfo) {
// //                     const poolInfo = raydiumData.poolInfo;
// //                     const positionInfo = raydiumData.positionInfo;
                    
// //                     poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
// //                     pairAddress = poolInfo.id;
// //                     pendingRewards = positionInfo.unclaimedFee.usdValue;
// //                     value = positionInfo.usdValue;
// //                     currentPrice = poolInfo.price || 0;
// //                     priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                    
// //                     priceLower = raydiumData.positionRange?.priceLower || 0;
// //                     priceUpper = raydiumData.positionRange?.priceUpper || 0;
                    
// //                     const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                     const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
// //                     rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
// //                     apr = raydiumData.apr?.day?.apr || 0;
// //                 } else {
// //                     const poolInfo = raydiumData.poolInfo || {};
// //                     const mintA = poolInfo.mintA || {};
// //                     const mintB = poolInfo.mintB || {};
                    
// //                     poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
// //                         pairAddress = poolInfo.id;
                    
// //                     const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
// //                     const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
// //                     value = amountAUsd + amountBUsd;
                    
// //                     const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
// //                     const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
// //                     pendingRewards = feeAUsd + feeBUsd;
                    
// //                     currentPrice = poolInfo.price || 0;
// //                     priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                    
// //                     priceLower = parseFloat(raydiumData.priceLower || 0);
// //                     priceUpper = parseFloat(raydiumData.priceUpper || 0);
                    
// //                     const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                     const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
// //                     rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
// //                     apr = raydiumData.apr || 0;
// //                 }
                
// //                 walletData.pools.push({
// //                     pool: poolPair,
// //                     pairAddress: pairAddress,
// //                     platform: 'Raydium',
// //                     range: rangStr,
// //                     current_price: priceStr,
// //                     apr: apr,
// //                     pending_rewards: pendingRewards,
// //                     value: value
// //                 });
// //                 walletData.total_pending_rewards += pendingRewards;
// //                 walletData.total_value += value;
// //             }
// //         }
        
// //         return walletData;
// //     }
    
// //     console.log(`\n[DEBUG] Trying NFT detection method...`);
// //     const result = await getAssetsByOwner(walletAddress);
    
// //     console.log(`[DEBUG] getAssetsByOwner result:`, JSON.stringify(result, null, 2));
    
// //     if (!result.result || !result.result.items) {
// //         console.log(`[DEBUG] No assets found for wallet`);
// //         return walletData;
// //     }
    
// //     const nfts = result.result.items;
// //     console.log(`[DEBUG] Found ${nfts.length} total NFTs/assets`);
    
// //     const raydiumPositions = [];
    
// //     for (const nft of nfts) {
// //         const content = nft.content || {};
// //         const metadata = content.metadata || {};
// //         const name = metadata.name || '';
// //         const symbol = metadata.symbol || '';
        
// //         console.log(`[DEBUG] NFT: name="${name}", symbol="${symbol}"`);
        
// //         if (name.includes('Raydium') || symbol.includes('RCL') || name.includes('Concentrated')) {
// //             console.log(`[DEBUG] Found Raydium position NFT: ${nft.id}`);
// //             raydiumPositions.push(nft.id);
// //         }
// //     }
    
// //     console.log(`[DEBUG] Total Raydium position NFTs found: ${raydiumPositions.length}`);
    
// //     if (raydiumPositions.length === 0) {
// //         return walletData;
// //     }
    
// //     for (const posNft of raydiumPositions) {
// //         console.log(`\n[DEBUG] Processing position NFT: ${posNft}`);
        
// //         const assetData = {
// //             jsonrpc: '2.0',
// //             id: 'test',
// //             method: 'getAsset',
// //             params: { id: posNft }
// //         };
// //         const assetResponse = await fetch(HELIUS_RPC, {
// //             method: 'POST',
// //             headers: { 'Content-Type': 'application/json' },
// //             body: JSON.stringify(assetData)
// //         });
// //         const assetResult = await assetResponse.json();
        
// //         console.log(`[DEBUG] Asset result authorities:`, assetResult.result?.authorities);
        
// //         if (!assetResult.result || !assetResult.result.authorities) {
// //             console.log(`[DEBUG] No authorities found for asset`);
// //             continue;
// //         }
        
// //         const authorities = assetResult.result.authorities || [];
// //         if (authorities.length === 0) {
// //             console.log(`[DEBUG] Authorities array is empty`);
// //             continue;
// //         }
        
// //         const positionAddress = authorities[0].address;
// //         console.log(`[DEBUG] Position address: ${positionAddress}`);
        
// //         console.log(`[DEBUG] Fetching Raydium position data from API...`);
// //         const raydiumData = await fetchRaydiumPosition(positionAddress);
        
// //         console.log(`[DEBUG] Raydium data received: ${!!raydiumData}`);
// //         if (raydiumData) {
// //             console.log(`[DEBUG] Raydium data structure:`, JSON.stringify(raydiumData, null, 2));
// //             let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr, pairAddress;
            
// //             if (raydiumData.poolInfo) {
// //                 const poolInfo = raydiumData.poolInfo;
// //                 const positionInfo = raydiumData.positionInfo;
                
// //                 poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
// //                 pairAddress = poolInfo.id;
// //                 pendingRewards = positionInfo.unclaimedFee.usdValue;
// //                 value = positionInfo.usdValue;
// //                 currentPrice = poolInfo.price || 0;
// //                 priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                
// //                 priceLower = raydiumData.positionRange?.priceLower || 0;
// //                 priceUpper = raydiumData.positionRange?.priceUpper || 0;
                
// //                 const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                 const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                
// //                 rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                
// //                 apr = raydiumData.apr?.day?.apr || 0;
// //             } else {
// //                 const poolInfo = raydiumData.poolInfo || {};
// //                 const mintA = poolInfo.mintA || {};
// //                 const mintB = poolInfo.mintB || {};
                
// //                 poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
// //                     pairAddress = poolInfo.id;
                
// //                 const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
// //                 const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
// //                 value = amountAUsd + amountBUsd;
                
// //                 const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
// //                 const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
// //                 pendingRewards = feeAUsd + feeBUsd;
                
// //                 currentPrice = poolInfo.price || 0;
// //                 priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                
// //                 priceLower = parseFloat(raydiumData.priceLower || 0);
// //                 priceUpper = parseFloat(raydiumData.priceUpper || 0);
                
// //                 const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
// //                 const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                
// //                 rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                
// //                 apr = raydiumData.apr || 0;
// //             }
            
// //             walletData.pools.push({
// //                 pairAddress:pairAddress,
// //                 pool: poolPair,
// //                 platform: 'Raydium',
// //                 range: rangStr,
// //                 current_price: priceStr,
// //                 apr: apr,
// //                 pending_rewards: pendingRewards,
// //                 value: value
// //             });
// //             walletData.total_pending_rewards += pendingRewards;
// //             walletData.total_value += value;
// //         }
// //     }
    
// //     return walletData;
// // }
// // async function savePoolsByWallet(allWalletsData) {
// //     const fetchedAt = new Date();
// //     const batchId = new mongoose.Types.ObjectId().toHexString();
// //     const poolDocuments = [];
// //     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    

// //     for (const walletData of allWalletsData) {
// //         for (const poolInfo of walletData.pools) {
// //             poolDocuments.push({
// //                 batchId,
// //                 wallet: walletData.wallet,
// //                 pairAddress:poolInfo.pairAddress,
// //                 pool: poolInfo.pool,
// //                 platform: poolInfo.platform,
// //                 range: poolInfo.range,
// //                 current_price: poolInfo.current_price,
// //                 apr: Number.isFinite(poolInfo.apr) ? poolInfo.apr : 0,
// //                 pending_rewards: Number(poolInfo.pending_rewards) || 0,
// //                 value: Number(poolInfo.value) || 0,
// //                 fetchedAt,
// //                 startTime
// //             });
// //         }
// //     }

// //     if (!poolDocuments.length) {
// //         console.log('[INFO] No pool data available to persist.');
// //         return { batchId, count: 0 };
// //     }

// //     await PoolRevenue.insertMany(poolDocuments);
// //     console.log(
// //         `[INFO] Saved ${poolDocuments.length} pool-level rows to MongoDB (batch ${batchId}).`
// //     );

// //     return { batchId, count: poolDocuments.length };
// // }

// // async function main() {
// //     console.log('\n' + '='.repeat(160));
// //     console.log('PROCESSING MULTIPLE WALLETS - ALL POSITION DATA');
// //     console.log('='.repeat(160) + '\n');
    
// //     const allWalletsData = await getAllWalletsData();
    
// //     console.log('\n' + '='.repeat(160));
// //     console.log('ALL WALLETS SUMMARY TABLE');
// //     console.log('='.repeat(160) + '\n');
    
// //     console.log(`${'Pool'.padEnd(15)} ${'Platform'.padEnd(10)} ${'Wallet'.padEnd(25)} ${'Range Breakdown'.padEnd(20)} ${'Current Price'.padEnd(20)} ${'APR'.padEnd(10)} ${'Pending Rewards'.padEnd(17)} ${'Value'.padEnd(15)}`);
// //     console.log('-'.repeat(160));
    
// //     let grandTotalRewards = 0;
// //     let grandTotalValue = 0;
    
// //     for (const walletData of allWalletsData) {
// //         const walletShort = `${walletData.wallet.slice(0, 8)}...${walletData.wallet.slice(-8)}`;
        
// //         if (walletData.pools.length > 0) {
// //             for (const poolInfo of walletData.pools) {
// //                 const aprDisplay = poolInfo.apr ? `${poolInfo.apr.toFixed(2)}%` : 'N/A';
                
// //                 console.log(`${poolInfo.pool.padEnd(15)} ${poolInfo.platform.padEnd(10)} ${walletShort.padEnd(25)} ${poolInfo.range.padEnd(20)} ${poolInfo.current_price.padEnd(20)} ${aprDisplay.padEnd(10)} $${poolInfo.pending_rewards.toFixed(2).padEnd(16)} $${poolInfo.value.toFixed(2).padEnd(14)}`);
// //             }
            
// //             console.log(`${'WALLET TOTAL'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $${walletData.total_pending_rewards.toFixed(2).padEnd(16)} $${walletData.total_value.toFixed(2).padEnd(14)}`);
// //             console.log('-'.repeat(160));
// //         } else {
// //             console.log(`${'No pools'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $0.00              $0.00`);
// //             console.log('-'.repeat(160));
// //         }
        
// //         grandTotalRewards += walletData.total_pending_rewards;
// //         grandTotalValue += walletData.total_value;
// //     }
    
// //     console.log(`\n${'GRAND TOTAL'.padEnd(76)} $${grandTotalRewards.toFixed(2).padEnd(16)} $${grandTotalValue.toFixed(2).padEnd(14)}`);
// //     console.log('='.repeat(160) + '\n');

// //     try {
// //         await connectDB();
// //         await savePoolsByWallet(allWalletsData);
// //     } catch (error) {
// //         console.error('[ERROR] Failed to persist pool-wise data:', error.message);
// //         throw error;
// //     } finally {
// //         if (mongoose.connection.readyState !== 0) {
// //             await mongoose.connection.close();
// //         }
// //     }
// // }

// // // Add this function at the end of the file
// // async function getAllWalletsData() {
// //     const allWalletsData = [];
// //     for (const wallet of WALLET_ADDRESSES) {
// //         const walletData = await processWallet(wallet);
// //         allWalletsData.push(walletData);
// //     }
// //     return allWalletsData;
// // }


// async function httpsGet(url) {
//     try {
//         const response = await fetch(url);
//         return await response.json();
//     } catch {
//         const response = await fetch(url);
//         return await response.text();
//     }
// }

// async function heliusRpc(method, params) {
//     const data = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: params
//     };
    
//     const headers = {
//         'Content-Type': 'application/json'
//     };
    
//     const response = await fetch(HELIUS_RPC, {
//         method: 'POST',
//         headers: headers,
//         body: JSON.stringify(data)
//     });
//     return await response.json();
// }



// async function fetchRaydiumPosition(positionId) {
//     const url = `https://api-v3.raydium.io/clmm/position/info?id=${positionId}`;
//     try {
//         const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
//         if (response.status === 200) {
//             const data = await response.json();
//             if (data.data && data.data) {
//                 return data.data;
//             }
//         }
//     } catch (e) {
//     }
    
//     const url2 = `https://dynamic-ipfs.raydium.io/clmm/position?id=${positionId}`;
//     try {
//         const response = await fetch(url2, { signal: AbortSignal.timeout(5000) });
//         if (response.status === 200) {
//             const data = await response.json();
//             if (data.poolInfo) {
//                 return data;
//             }
//         }
//     } catch (e) {
//     }
    
//     return null;
// }

// async function processWallet(walletAddress) {
//     const walletData = {
//         wallet: walletAddress,
//         pools: [],
//         total_pending_rewards: 0,
//         total_value: 0
//     };
    
//     const seenPositions = new Set();
    
//     console.log(`\n[DEBUG] Checking wallet balance first...`);
//     const balanceResult = await heliusRpc('getBalance', [walletAddress]);
//     console.log(`[DEBUG] Wallet balance: ${balanceResult.result?.value / 1000000000 || 0} SOL`);
    
//     console.log(`\n[DEBUG] Trying Raydium portfolio API...`);
//     try {
//         const portfolioUrl = `https://api-v3.raydium.io/portfolio/wallet?address=${walletAddress}`;
//         const portfolioResponse = await fetch(portfolioUrl);
//         console.log(`[DEBUG] Portfolio API status: ${portfolioResponse.status}`);
        
//         if (portfolioResponse.status === 200) {
//             const portfolioData = await portfolioResponse.json();
//             console.log(`[DEBUG] Portfolio data:`, JSON.stringify(portfolioData, null, 2));
            
//             if (portfolioData.success && portfolioData.data?.clmm) {
//                 const clmmPositions = portfolioData.data.clmm;
//                 console.log(`[DEBUG] Found ${clmmPositions.length} CLMM positions`);
                
//                 for (const position of clmmPositions) {
//                     const positionAddress = position.nftMint || position.id;
                    
//                     if (seenPositions.has(positionAddress)) {
//                         continue;
//                     }
                    
//                     const raydiumData = await fetchRaydiumPosition(positionAddress);
                    
//                     if (raydiumData) {
//                         let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr,pairAddress;
                        
//                         if (raydiumData.poolInfo) {
//                             const poolInfo = raydiumData.poolInfo;
//                             const positionInfo = raydiumData.positionInfo;
                            
//                             poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
//                             pairAddress = poolInfo.id;
//                             pendingRewards = positionInfo.unclaimedFee.usdValue;
//                             value = positionInfo.usdValue;
//                             currentPrice = poolInfo.price || 0;
//                             priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                            
//                             priceLower = raydiumData.positionRange?.priceLower || 0;
//                             priceUpper = raydiumData.positionRange?.priceUpper || 0;
                            
//                             const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                             const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
//                             rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
//                             apr = raydiumData.apr?.day?.apr || 0;
//                         } else {
//                             const poolInfo = raydiumData.poolInfo || {};
//                             const mintA = poolInfo.mintA || {};
//                             const mintB = poolInfo.mintB || {};
                            
//                             poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
//                              pairAddress = poolInfo.id;

                            
//                             const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
//                             const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
//                             value = amountAUsd + amountBUsd;
                            
//                             const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
//                             const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
//                             pendingRewards = feeAUsd + feeBUsd;
                            
//                             currentPrice = poolInfo.price || 0;
//                             priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                            
//                             priceLower = parseFloat(raydiumData.priceLower || 0);
//                             priceUpper = parseFloat(raydiumData.priceUpper || 0);
                            
//                             const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                             const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
//                             rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
//                             apr = raydiumData.apr || 0;
//                         }
                        
//                         if (value > 0) {
//                             seenPositions.add(positionAddress);
//                             walletData.pools.push({
//                                 pool: poolPair,
//                                 pairAddress: pairAddress,
//                                 platform: 'Raydium',
//                                 range: rangStr,
//                                 current_price: priceStr,
//                                 apr: apr,
//                                 pending_rewards: pendingRewards,
//                                 value: value
//                             });
//                             walletData.total_pending_rewards += pendingRewards;
//                             walletData.total_value += value;
//                         }
//                     }
//                 }
//                                     console.log("walletData---------------------------",walletData);

//                 if (walletData.pools.length > 0) {
//                     console.log("walletData : ",walletData);
                    
//                     return walletData;
//                 }
//             }
//         } else {
//             const errorText = await portfolioResponse.text();
//             console.log(`[DEBUG] Portfolio API error: ${errorText}`);
//         }
//     } catch (e) {
//         console.log(`[DEBUG] Portfolio API exception:`, e.message);
//     }
    
//     console.log(`[DEBUG] Trying on-chain query method...`);
//     const positionResult = await heliusRpc('getProgramAccounts', [
//         RAYDIUM_CLMM_PROGRAM,
//         {
//             encoding: 'base64',
//             filters: [
//                 {
//                     memcmp: {
//                         offset: 40,
//                         bytes: walletAddress
//                     }
//                 },
//                 {
//                     dataSize: 216
//                 }
//             ]
//         }
//     ]);
    
//     console.log(`[DEBUG] On-chain query found ${positionResult.result?.length || 0} positions`);
    
//     if (positionResult.result && positionResult.result.length > 0) {
//         for (const posAccount of positionResult.result) {
//             const positionAddress = posAccount.pubkey;
            
//             if (seenPositions.has(positionAddress)) {
//                 continue;
//             }
            
//             const dataBytes = Buffer.from(posAccount.account.data[0], 'base64');
            
//             const poolIdBytes = dataBytes.slice(8, 40);
//             const poolId = bs58.encode(Buffer.from(poolIdBytes));
            
//             const tickLower = dataBytes.readInt32LE(73);
//             const tickUpper = dataBytes.readInt32LE(77);
//             const liquidity = dataBytes.readBigUInt64LE(81);
            
//             if (liquidity === 0n) {
//                 continue;
//             }
            
//             const raydiumData = await fetchRaydiumPosition(positionAddress);
            
//             if (raydiumData) {
//                 let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr, pairAddress;
                
//                 if (raydiumData.poolInfo) {
//                     const poolInfo = raydiumData.poolInfo;
//                     const positionInfo = raydiumData.positionInfo;
                    
//                     poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
//                     pairAddress = poolInfo.id;
//                     pendingRewards = positionInfo.unclaimedFee.usdValue;
//                     value = positionInfo.usdValue;
//                     currentPrice = poolInfo.price || 0;
//                     priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                    
//                     priceLower = raydiumData.positionRange?.priceLower || 0;
//                     priceUpper = raydiumData.positionRange?.priceUpper || 0;
                    
//                     const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                     const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
//                     rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
//                     apr = raydiumData.apr?.day?.apr || 0;
//                 } else {
//                     const poolInfo = raydiumData.poolInfo || {};
//                     const mintA = poolInfo.mintA || {};
//                     const mintB = poolInfo.mintB || {};
                    
//                     poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
//                         pairAddress = poolInfo.id;
                    
//                     const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
//                     const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
//                     value = amountAUsd + amountBUsd;
                    
//                     const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
//                     const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
//                     pendingRewards = feeAUsd + feeBUsd;
                    
//                     currentPrice = poolInfo.price || 0;
//                     priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                    
//                     priceLower = parseFloat(raydiumData.priceLower || 0);
//                     priceUpper = parseFloat(raydiumData.priceUpper || 0);
                    
//                     const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                     const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
//                     rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
//                     apr = raydiumData.apr || 0;
//                 }
                
//                 if (value > 0) {
//                     seenPositions.add(positionAddress);
//                     walletData.pools.push({
//                         pairAddress: pairAddress,
//                         pool: poolPair,
//                         platform: 'Raydium',
//                         range: rangStr,
//                         current_price: priceStr,
//                         apr: apr,
//                         pending_rewards: pendingRewards,
//                         value: value
//                     });
//                     walletData.total_pending_rewards += pendingRewards;
//                     walletData.total_value += value;
//                 }
//             }
//         }
//                                             console.log("walletData---------------------------",walletData);

//         return walletData;
//     }
    
//     console.log(`\n[DEBUG] Trying Solscan Pro API method...`);
//     try {
//         const solscanUrl = `https://pro-api.solscan.io/v2.0/account/token-accounts?address=${walletAddress}&type=nft&page=1&page_size=40`;
//         const solscanResponse = await fetch(solscanUrl, {
//             headers: {
//                 'Accept': 'application/json',
//                 'token': process.env.SOL_API_TOKEN
//             }
//         });
        
//         console.log(`[DEBUG] Solscan Pro API status: ${solscanResponse.status}`);
        
//         if (solscanResponse.status === 200) {
//             const responseData = await solscanResponse.json();
//             console.log(`[DEBUG] Solscan response:`, JSON.stringify(responseData, null, 2).substring(0, 500));
            
//             const tokenAccounts = responseData.data || [];
//             console.log(`[DEBUG] Token accounts found: ${tokenAccounts.length}`);
            
//             for (const account of tokenAccounts) {
//                 const nftMint = account.token_address || account.tokenAddress;
//                 const amount = parseFloat(account.amount || account.token_amount?.amount || 0);
                
//                 if (!nftMint || amount === 0) continue;
                
//                 console.log(`[DEBUG] Found NFT mint: ${nftMint}, amount: ${amount}`);
                
//                 const assetData = {
//                     jsonrpc: '2.0',
//                     id: 'test',
//                     method: 'getAsset',
//                     params: { id: nftMint }
//                 };
//                 const assetResponse = await fetch(HELIUS_RPC, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(assetData)
//                 });
//                 const assetResult = await assetResponse.json();
                
//                 if (!assetResult.result || !assetResult.result.authorities || assetResult.result.authorities.length === 0) {
//                     console.log(`[DEBUG] No authorities found for NFT ${nftMint}`);
//                     continue;
//                 }
                
//                 const positionAddress = assetResult.result.authorities[0].address;
//                 console.log(`[DEBUG] Position address from NFT: ${positionAddress}`);
                
//                 if (seenPositions.has(positionAddress)) {
//                     continue;
//                 }
                
//                 const raydiumData = await fetchRaydiumPosition(positionAddress);
                
//                 if (raydiumData) {
//                     let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr;
                    
//                     if (raydiumData.poolInfo) {
//                         const poolInfo = raydiumData.poolInfo;
//                         const positionInfo = raydiumData.positionInfo;
//                         pairAddress = poolInfo.id;
//                         poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
//                         pendingRewards = positionInfo.unclaimedFee.usdValue;
//                         value = positionInfo.usdValue;
//                         currentPrice = poolInfo.price || 0;
//                         priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                        
//                         priceLower = raydiumData.positionRange?.priceLower || 0;
//                         priceUpper = raydiumData.positionRange?.priceUpper || 0;
                        
//                         const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                         const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                        
//                         rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                        
//                         apr = raydiumData.apr?.day?.apr || 0;
//                     } else {
//                         const poolInfo = raydiumData.poolInfo || {};
//                         const mintA = poolInfo.mintA || {};
//                         const mintB = poolInfo.mintB || {};
//                         pairAddress = poolInfo.id;
//                         poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
                        
//                         const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
//                         const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
//                         value = amountAUsd + amountBUsd;
                        
//                         const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
//                         const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
//                         pendingRewards = feeAUsd + feeBUsd;
                        
//                         currentPrice = poolInfo.price || 0;
//                         priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                        
//                         priceLower = parseFloat(raydiumData.priceLower || 0);
//                         priceUpper = parseFloat(raydiumData.priceUpper || 0);
                        
//                         const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
//                         const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                        
//                         rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                        
//                         apr = raydiumData.apr || 0;
//                     }
                    
//                     if (value > 0) {
//                         seenPositions.add(positionAddress);
//                         walletData.pools.push({
//                             pairAddress: pairAddress,
//                             pool: poolPair,
//                             platform: 'Raydium',
//                             range: rangStr,
//                             current_price: priceStr,
//                             apr: apr,
//                             pending_rewards: pendingRewards,
//                             value: value
//                         });
//                         walletData.total_pending_rewards += pendingRewards;
//                         walletData.total_value += value;
//                     }
//                 }
//             }
//         } else {
//             const errorText = await solscanResponse.text();
//             console.log(`[DEBUG] Solscan Pro API error response (${solscanResponse.status}): ${errorText.substring(0, 200)}`);
//         }
//     } catch (e) {
//         console.log(`[DEBUG] Solscan Pro API exception:`, e.message);
//     }
//                                         console.log("walletData---------------------------",walletData);

//     return walletData;
// }



// async function savePoolsByWallet(allWalletsData) {
//     const fetchedAt = new Date();
//     const batchId = new mongoose.Types.ObjectId().toHexString();
//     const poolDocuments = [];
//     const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    

//     for (const walletData of allWalletsData) {
//         for (const poolInfo of walletData.pools) {
//             poolDocuments.push({
//                 batchId,
//                 wallet: walletData.wallet,
//                 pairAddress:poolInfo.pairAddress,
//                 pool: poolInfo.pool,
//                 platform: poolInfo.platform,
//                 range: poolInfo.range,
//                 current_price: poolInfo.current_price,
//                 apr: Number.isFinite(poolInfo.apr) ? poolInfo.apr : 0,
//                 pending_rewards: Number(poolInfo.pending_rewards) || 0,
//                 value: Number(poolInfo.value) || 0,
//                 fetchedAt,
//                 startTime
//             });
//         }
//     }

//     if (!poolDocuments.length) {
//         console.log('[INFO] No pool data available to persist.');
//         return { batchId, count: 0 };
//     }

//     await PoolRevenue.insertMany(poolDocuments);
//     console.log(
//         `[INFO] Saved ${poolDocuments.length} pool-level rows to MongoDB (batch ${batchId}).`
//     );

//     return { batchId, count: poolDocuments.length };
// }


// async function main() {
//     console.log('\n' + '='.repeat(160));
//     console.log('PROCESSING MULTIPLE WALLETS - ALL POSITION DATA');
//     console.log('='.repeat(160) + '\n');
    
//     const allWalletsData = [];
//     const Fetch = await companysWallets.find({status:"active"}).select("walletAddress"); 
//     console.log("Fetch", Fetch);
    

    
//     for (const wallet of Fetch) {
//         console.log(`Processing wallet: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`);
//         const walletData = await processWallet(wallet.walletAddress);
//         allWalletsData.push(walletData);
//     }
    
//     console.log('\n' + '='.repeat(160));
//     console.log('ALL WALLETS SUMMARY TABLE');
//     console.log('='.repeat(160) + '\n');
    
//     console.log(`${'Pool'.padEnd(15)} ${'Platform'.padEnd(10)} ${'Wallet'.padEnd(25)} ${'Range Breakdown'.padEnd(20)} ${'Current Price'.padEnd(20)} ${'APR'.padEnd(10)} ${'Pending Rewards'.padEnd(17)} ${'Value'.padEnd(15)}`);
//     console.log('-'.repeat(160));
    
//     let grandTotalRewards = 0;
//     let grandTotalValue = 0;
    
//     for (const walletData of allWalletsData) {
//         const walletShort = `${walletData.wallet.slice(0, 8)}...${walletData.wallet.slice(-8)}`;
        
//         if (walletData.pools.length > 0) {
//             for (const poolInfo of walletData.pools) {
//                 const aprDisplay = poolInfo.apr ? `${poolInfo.apr.toFixed(2)}%` : 'N/A';
                
//                 console.log(`${poolInfo.pool.padEnd(15)} ${poolInfo.platform.padEnd(10)} ${walletShort.padEnd(25)} ${poolInfo.range.padEnd(20)} ${poolInfo.current_price.padEnd(20)} ${aprDisplay.padEnd(10)} $${poolInfo.pending_rewards.toFixed(2).padEnd(16)} $${poolInfo.value.toFixed(2).padEnd(14)}`);
//             }
            
//             console.log(`${'WALLET TOTAL'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $${walletData.total_pending_rewards.toFixed(2).padEnd(16)} $${walletData.total_value.toFixed(2).padEnd(14)}`);
//             console.log('-'.repeat(160));
//         } else {
//             console.log(`${'No pools'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $0.00              $0.00`);
//             console.log('-'.repeat(160));
//         }
        
//         grandTotalRewards += walletData.total_pending_rewards;
//         grandTotalValue += walletData.total_value;
//     }
    
//     console.log(`\n${'GRAND TOTAL'.padEnd(76)} $${grandTotalRewards.toFixed(2).padEnd(16)} $${grandTotalValue.toFixed(2).padEnd(14)}`);
//     console.log('='.repeat(160) + '\n');


// try {
//         // await connectDB();
//         await savePoolsByWallet(allWalletsData);
//     } catch (error) {
//         console.error('[ERROR] Failed to persist pool-wise data:', error.message);
//         throw error;
//     } finally {
//         if (mongoose.connection.readyState !== 0) {
//             await mongoose.connection.close();
//         }
//     }



// }

// // Add this function at the end of the file
// async function getAllWalletsData() {
//     const allWalletsData = [];
    
//   const Fetch = await companysWallets.find({status:"active"})
//   .select("walletAddress"); 
//     console.log("Fetch", Fetch);

//     for (const wallet of Fetch) {
//         const walletData = await processWallet(wallet.walletAddress);
//         allWalletsData.push(walletData);
//     }
//     return allWalletsData;
// }

// async function saveCompoundPoolsByWallet(allWalletsData) {
//     const fetchedAt = new Date();
//     const batchId = new mongoose.Types.ObjectId().toHexString();
//     const poolDocuments = [];
//     // const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
//     const startTime = parseInt(moment.utc().subtract(1, "days").format("YYYYMMDD"), 10); 

//     for (const walletData of allWalletsData) {
//         for (const poolInfo of walletData.pools) {
//             poolDocuments.push({
//                 batchId,
//                 wallet: walletData.wallet,
//                 pairAddress: poolInfo.pairAddress,
//                 pool: poolInfo.pool,
//                 platform: poolInfo.platform,
//                 range: poolInfo.range,
//                 current_price: poolInfo.current_price,
//                 apr: Number.isFinite(poolInfo.apr) ? poolInfo.apr : 0,
//                 pending_rewards: Number(poolInfo.pending_rewards) || 0,
//                 value: Number(poolInfo.value) || 0,
//                 fetchedAt,
//                 startTime
//             });
//         }
//     }

//     if (!poolDocuments.length) {
//         console.log('[INFO] No compound pool data available to persist.');
//         return { batchId, count: 0 };
//     }

//     await CompoundRevenue.insertMany(poolDocuments);
//     console.log(
//         `[INFO] Saved ${poolDocuments.length} compound pool-level rows to MongoDB (batch ${batchId}).`
//     );

//     return { batchId, count: poolDocuments.length };
// }

// async function getAllCompoundWalletsData() {
//     const allWalletsData = [];

//     const Fetch = await CompoundWallet.find({ status: "active" })
//         .select("walletAddress");
//     console.log("Fetch Compound Wallets", Fetch);

//     for (const wallet of Fetch) {
//         const walletData = await processWallet(wallet.walletAddress);
//         allWalletsData.push(walletData);
//     }
//     // await saveCompoundPoolsByWallet(allWalletsData);
//     return allWalletsData;
// }


// module.exports = { getAllWalletsData, processWallet, savePoolsByWallet, main, getAllCompoundWalletsData, saveCompoundPoolsByWallet };


// if (require.main === module) {
//     main().catch((error) => {
//         console.error('Wallets revenue script failed:', error);
//         process.exit(1);
//     });
// }


const bs58 = require('bs58');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const moment = require('moment');
// const connectDB = require('./config/database');
const PoolRevenue = require('../models/CompanyPoolRevenue');
const companysWallets = require('../models/companysWallets');
const CompoundWallet = require('../models/CompoundWallet');
const CompoundRevenue = require('../models/CompoundRevenue');

// const env = process.env.NODE_ENV || 'development';
// dotenv.config({ path: env === 'production' ? '.env.production' : '.env' });

const HELIUS_RPC =
  process.env.HELIUS_RPC_URL ||
  'https://mainnet.helius-rpc.com/?api-key=a9badffe-f603-4d7c-b463-be0fcb709d89';

const WALLET_ADDRESSES = process.env.WALLET_REVENUE_ADDRESSES
  ? process.env.WALLET_REVENUE_ADDRESSES.split(',')
      .map((address) => address.trim())
      .filter(Boolean)
  : [
      'F5p8LPiTg3cbshsQzdUyoYCCVgCKJYiPussrL13xQzXW',
      'DYmMJWR4fdMDZ12dtRtS58vUrqxpqyJRQScSUURB34Bu',
      'EneZ4P3zzWtGAcHwVpiqHxc74vfhRQcCFnvDDkZe6dus',
      'BYcNR16jbiFHArFPLGfmqRSU9AKrBV2JWmr6iBN9BGK8',
      '3YH96WcqA7sAopcmDe8VdMbkGSnQHoUNL25xqW7c2CXH',
      'CvtJtKpUaez9i6AW19muWxKtKyKMpSr9YMak3iNeEyWa',
    ];
const RAYDIUM_CLMM_PROGRAM =
  process.env.RAYDIUM_CLMM_PROGRAM || 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';




async function httpsGet(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch {
        const response = await fetch(url);
        return await response.text();
    }
}

async function heliusRpc(method, params) {
    const data = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params
    };
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
    return await response.json();
}



async function fetchRaydiumPosition(positionId) {
    const url = `https://api-v3.raydium.io/clmm/position/info?id=${positionId}`;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (response.status === 200) {
            const data = await response.json();
            if (data.data && data.data) {
                return data.data;
            }
        }
    } catch (e) {
    }
    
    const url2 = `https://dynamic-ipfs.raydium.io/clmm/position?id=${positionId}`;
    try {
        const response = await fetch(url2, { signal: AbortSignal.timeout(5000) });
        if (response.status === 200) {
            const data = await response.json();
            if (data.poolInfo) {
                return data;
            }
        }
    } catch (e) {
    }
    
    return null;
}

async function processWallet(walletAddress) {
    const walletData = {
        wallet: walletAddress,
        pools: [],
        total_pending_rewards: 0,
        total_value: 0
    };
    
    const seenPositions = new Set();
    
    console.log(`\n[DEBUG] Checking wallet balance first...`);
    const balanceResult = await heliusRpc('getBalance', [walletAddress]);
    console.log(`[DEBUG] Wallet balance: ${balanceResult.result?.value / 1000000000 || 0} SOL`);
    
    console.log(`\n[DEBUG] Trying Raydium portfolio API...`);
    try {
        const portfolioUrl = `https://api-v3.raydium.io/portfolio/wallet?address=${walletAddress}`;
        const portfolioResponse = await fetch(portfolioUrl);
        console.log(`[DEBUG] Portfolio API status: ${portfolioResponse.status}`);
        
        if (portfolioResponse.status === 200) {
            const portfolioData = await portfolioResponse.json();
            console.log(`[DEBUG] Portfolio data:`, JSON.stringify(portfolioData, null, 2));
            
            if (portfolioData.success && portfolioData.data?.clmm) {
                const clmmPositions = portfolioData.data.clmm;
                console.log(`[DEBUG] Found ${clmmPositions.length} CLMM positions`);
                
                for (const position of clmmPositions) {
                    const positionAddress = position.nftMint || position.id;
                    
                    if (seenPositions.has(positionAddress)) {
                        continue;
                    }
                    
                    const raydiumData = await fetchRaydiumPosition(positionAddress);
                    
                    if (raydiumData) {
                        let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr,pairAddress;
                        
                        if (raydiumData.poolInfo) {
                            const poolInfo = raydiumData.poolInfo;
                            const positionInfo = raydiumData.positionInfo;
                            console.log("positionInfoooooooooooooooooooooo",positionInfo);
                            
                            
                            poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
                            pairAddress = poolInfo.id;
                            pendingRewards = positionInfo.unclaimedFee.usdValue;
                            value = positionInfo.usdValue;
                            currentPrice = poolInfo.price || 0;
                            priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                            
                            priceLower = raydiumData.positionRange?.priceLower || 0;
                            priceUpper = raydiumData.positionRange?.priceUpper || 0;
                            
                            const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                            const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
                            rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
                            apr = raydiumData.apr?.day?.apr || 0;
                        } else {
                            const poolInfo = raydiumData.poolInfo || {};
                            const mintA = poolInfo.mintA || {};
                            const mintB = poolInfo.mintB || {};
                            
                            poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
                             pairAddress = poolInfo.id;
                            
                            const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
                            const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
                            value = amountAUsd + amountBUsd;
                            
                            const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
                            console.log("feeAUsd",feeAUsd);
                            console.log("raydiumData.feeA",raydiumData.feeA);
                            const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
                            console.log("feeBUsd",feeBUsd);
                            console.log("raydiumData.feeB",raydiumData.feeB);
                            pendingRewards = feeAUsd + feeBUsd;
                            
                            currentPrice = poolInfo.price || 0;
                            priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                            
                            priceLower = parseFloat(raydiumData.priceLower || 0);
                            priceUpper = parseFloat(raydiumData.priceUpper || 0);
                            
                            const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                            const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                            
                            rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                            
                            apr = raydiumData.apr || 0;
                        }
                        
                        if (value > 0) {
                            seenPositions.add(positionAddress);
                            walletData.pools.push({
                                pool: poolPair,
                                pairAddress: pairAddress,
                                platform: 'Raydium',
                                range: rangStr,
                                current_price: priceStr,
                                apr: apr,
                                pending_rewards: pendingRewards,
                                value: value
                            });
                            walletData.total_pending_rewards += pendingRewards;
                            walletData.total_value += value;
                        }
                    }
                }
                                    console.log("walletData---------------------------",walletData);

                if (walletData.pools.length > 0) {
                    console.log("walletData : ",walletData);
                    
                    return walletData;
                }
            }
        } else {
            const errorText = await portfolioResponse.text();
            console.log(`[DEBUG] Portfolio API error: ${errorText}`);
        }
    } catch (e) {
        console.log(`[DEBUG] Portfolio API exception:`, e.message);
    }
    
    console.log(`[DEBUG] Trying on-chain query method...`);
    const positionResult = await heliusRpc('getProgramAccounts', [
        RAYDIUM_CLMM_PROGRAM,
        {
            encoding: 'base64',
            filters: [
                {
                    memcmp: {
                        offset: 40,
                        bytes: walletAddress
                    }
                },
                {
                    dataSize: 216
                }
            ]
        }
    ]);
    
    console.log(`[DEBUG] On-chain query found ${positionResult.result?.length || 0} positions`);
    
    if (positionResult.result && positionResult.result.length > 0) {
        for (const posAccount of positionResult.result) {
            const positionAddress = posAccount.pubkey;
            
            if (seenPositions.has(positionAddress)) {
                continue;
            }
            
            const dataBytes = Buffer.from(posAccount.account.data[0], 'base64');
            
            const poolIdBytes = dataBytes.slice(8, 40);
            const poolId = bs58.encode(Buffer.from(poolIdBytes));
            
            const tickLower = dataBytes.readInt32LE(73);
            const tickUpper = dataBytes.readInt32LE(77);
            const liquidity = dataBytes.readBigUInt64LE(81);
            
            if (liquidity === 0n) {
                continue;
            }
            
            const raydiumData = await fetchRaydiumPosition(positionAddress);
            
            if (raydiumData) {
                let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr, pairAddress;
                
                if (raydiumData.poolInfo) {
                    const poolInfo = raydiumData.poolInfo;
                    const positionInfo = raydiumData.positionInfo;
                    console.log("positionInfoooooooooooooooooooooo1",positionInfo);
                    
                    
                    poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
                    pairAddress = poolInfo.id;
                    pendingRewards = positionInfo.unclaimedFee.usdValue;
                    value = positionInfo.usdValue;
                    currentPrice = poolInfo.price || 0;
                    priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                    
                    priceLower = raydiumData.positionRange?.priceLower || 0;
                    priceUpper = raydiumData.positionRange?.priceUpper || 0;
                    
                    const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                    const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
                    rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
                    apr = raydiumData.apr?.day?.apr || 0;
                } else {
                    const poolInfo = raydiumData.poolInfo || {};
                    const mintA = poolInfo.mintA || {};
                    const mintB = poolInfo.mintB || {};
                    
                    poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
                        pairAddress = poolInfo.id;
                        console.log("raydiumData.amountA",raydiumData);
                        console.log("raydiumData.amountB",raydiumData);
                    
                    const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
                    const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
                    value = amountAUsd + amountBUsd;
                    
                    const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
                    const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
                    pendingRewards = feeAUsd + feeBUsd;
                    
                    currentPrice = poolInfo.price || 0;
                    priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                    
                    priceLower = parseFloat(raydiumData.priceLower || 0);
                    priceUpper = parseFloat(raydiumData.priceUpper || 0);
                    
                    const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                    const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                    
                    rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                    
                    apr = raydiumData.apr || 0;
                }
                
                if (value > 0) {
                    seenPositions.add(positionAddress);
                    walletData.pools.push({
                        pairAddress: pairAddress,
                        pool: poolPair,
                        platform: 'Raydium',
                        range: rangStr,
                        current_price: priceStr,
                        apr: apr,
                        pending_rewards: pendingRewards,
                        value: value
                    });
                    walletData.total_pending_rewards += pendingRewards;
                    walletData.total_value += value;
                }
            }
        }
                                            console.log("walletData---------------------------",walletData);

        return walletData;
    }
    
    console.log(`\n[DEBUG] Trying Solscan Pro API method...`);
    try {
        const solscanUrl = `https://pro-api.solscan.io/v2.0/account/token-accounts?address=${walletAddress}&type=nft&page=1&page_size=40`;
        const solscanResponse = await fetch(solscanUrl, {
            headers: {
                'Accept': 'application/json',
                'token': process.env.SOL_API_TOKEN
            }
        });
        
        console.log(`[DEBUG] Solscan Pro API status: ${solscanResponse.status}`);
        
        if (solscanResponse.status === 200) {
            const responseData = await solscanResponse.json();
            console.log(`[DEBUG] Solscan response:`, JSON.stringify(responseData, null, 2).substring(0, 500));
            
            const tokenAccounts = responseData.data || [];
            console.log(`[DEBUG] Token accounts found: ${tokenAccounts.length}`);
            
            for (const account of tokenAccounts) {
                const nftMint = account.token_address || account.tokenAddress;
                const amount = parseFloat(account.amount || account.token_amount?.amount || 0);
                
                if (!nftMint || amount === 0) continue;
                
                console.log(`[DEBUG] Found NFT mint: ${nftMint}, amount: ${amount}`);
                
                const assetData = {
                    jsonrpc: '2.0',
                    id: 'test',
                    method: 'getAsset',
                    params: { id: nftMint }
                };
                const assetResponse = await fetch(HELIUS_RPC, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assetData)
                });
                const assetResult = await assetResponse.json();
                
                if (!assetResult.result || !assetResult.result.authorities || assetResult.result.authorities.length === 0) {
                    console.log(`[DEBUG] No authorities found for NFT ${nftMint}`);
                    continue;
                }
                
                const positionAddress = assetResult.result.authorities[0].address;
                console.log(`[DEBUG] Position address from NFT: ${positionAddress}`);
                
                if (seenPositions.has(positionAddress)) {
                    continue;
                }
                
                const raydiumData = await fetchRaydiumPosition(positionAddress);
                // console.log("raydiumData",raydiumData);
                
                
                if (raydiumData) {
                    let poolPair, pendingRewards, value, currentPrice, priceStr, priceLower, priceUpper, rangStr, apr, tokenAFee, tokenBFee, tokenAFeeUsd, tokenBFeeUsd;
                    
                    if (raydiumData.poolInfo) {
                        const poolInfo = raydiumData.poolInfo;
                        // console.log("poolInfo",poolInfo);
                        const positionInfo = raydiumData.positionInfo;
                        console.log("positionInfoooooooooooooooooooooo2",positionInfo);
                        pairAddress = poolInfo.id;
                        poolPair = `${poolInfo.mintA.symbol}/${poolInfo.mintB.symbol}`;
                        const totalFeeUsd = positionInfo.unclaimedFee.usdFeeValue || positionInfo.unclaimedFee.usdValue || 0;
                        pendingRewards = totalFeeUsd;
                        tokenAFee = positionInfo.unclaimedFee.amountA || 0;
                        tokenBFee = positionInfo.unclaimedFee.amountB || 0;
                        console.log("tokenAFee",tokenAFee);
                        console.log("tokenBFee",tokenBFee);
                        console.log("pendingRewards",pendingRewards);
                        console.log("positionInfo.usdValue",positionInfo.usdValue);
 
                        const priceTokenBPerTokenA = poolInfo.price || 0;
                        const tokenAValueInB = tokenAFee * priceTokenBPerTokenA;
                        const totalValueInB = tokenAValueInB + tokenBFee;
 
                        if (totalValueInB > 0) {
                            tokenAFeeUsd = (tokenAValueInB / totalValueInB) * totalFeeUsd;
                            tokenBFeeUsd = (tokenBFee / totalValueInB) * totalFeeUsd;
                        } else {
                            tokenAFeeUsd = 0;
                            tokenBFeeUsd = 0;
                        }
 
                        const pendingRewardsBreakdown = {
                            total_usd: totalFeeUsd,
                            tokenA: {
                                symbol: poolInfo.mintA.symbol,
                                amount: tokenAFee,
                                usd: tokenAFeeUsd
                            },
                            tokenB: {
                                symbol: poolInfo.mintB.symbol,
                                amount: tokenBFee,
                                usd: tokenBFeeUsd
                            }
                        };
                        console.log("pendingRewards,", pendingRewardsBreakdown);
                        value = positionInfo.usdValue;
                        currentPrice = poolInfo.price || 0;
                        priceStr = `${currentPrice.toFixed(2)} ${poolInfo.mintB.symbol}/${poolInfo.mintA.symbol}`;
                        
                        priceLower = raydiumData.positionRange?.priceLower || 0;
                        priceUpper = raydiumData.positionRange?.priceUpper || 0;
                        
                        const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                        const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                        
                        rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                        
                        apr = raydiumData.apr?.day?.apr || 0;
                    } else {
                        const poolInfo = raydiumData.poolInfo || {};
                        const mintA = poolInfo.mintA || {};
                        const mintB = poolInfo.mintB || {};
                        pairAddress = poolInfo.id;
                        poolPair = `${mintA.symbol || '?'}/${mintB.symbol || '?'}`;
                        tokenAFee = 0;
                        tokenBFee = 0;
                        tokenAFeeUsd = 0;
                        tokenBFeeUsd = 0;
                        console.log("raydiumData.amountA",raydiumData);
                        // console.log("raydiumData.amountB",raydiumData);
                        const amountAUsd = parseFloat(raydiumData.amountA?.amountUSD || 0);
                        const amountBUsd = parseFloat(raydiumData.amountB?.amountUSD || 0);
                        value = amountAUsd + amountBUsd;
                        
                        const feeAUsd = parseFloat(raydiumData.feeA?.amountUSD || 0);
                        console.log("feeAUsd",feeAUsd);
                        console.log("raydiumData.feeA",raydiumData.feeA);
                        const feeBUsd = parseFloat(raydiumData.feeB?.amountUSD || 0);
                        pendingRewards = feeAUsd + feeBUsd;
                        
                        currentPrice = poolInfo.price || 0;
                        priceStr = `${parseFloat(currentPrice).toFixed(2)} ${mintB.symbol || ''}/${mintA.symbol || ''}`;
                        
                        priceLower = parseFloat(raydiumData.priceLower || 0);
                        priceUpper = parseFloat(raydiumData.priceUpper || 0);
                        
                        const priceLowerStr = priceLower >= 1000 ? `${(priceLower/1000).toFixed(2)}K` : priceLower.toFixed(2);
                        const priceUpperStr = priceUpper >= 1000 ? `${(priceUpper/1000).toFixed(2)}K` : priceUpper.toFixed(2);
                        
                        rangStr = `${priceLowerStr} to ${priceUpperStr}`;
                        
                        apr = raydiumData.apr || 0;
                    }
                    
                    if (value > 0) {
                        seenPositions.add(positionAddress);
                        console.log("tokenAFee",tokenAFee);
                        console.log("tokenAFeeUsd",tokenAFeeUsd);
                        console.log("tokenBFee",tokenBFee);
                        console.log("tokenBFeeUsd",tokenBFeeUsd);
                        walletData.pools.push({
                            pairAddress: pairAddress,
                            pool: poolPair,
                            platform: 'Raydium',
                            range: rangStr,
                            current_price: priceStr,
                            apr: apr,
                            pending_rewards: pendingRewards,
                            tokenATokens:Number(tokenAFee),
                            tokenAInUsd:Number(tokenAFeeUsd),
                            tokenBTokens:Number(tokenBFee),
                            tokenBInUsd:Number(tokenBFeeUsd),
                            value: value
                        });
                        walletData.total_pending_rewards += pendingRewards;
                        walletData.total_value += value;
                    }
                }
            }
        } else {
            const errorText = await solscanResponse.text();
            console.log(`[DEBUG] Solscan Pro API error response (${solscanResponse.status}): ${errorText.substring(0, 200)}`);
        }
    } catch (e) {
        console.log(`[DEBUG] Solscan Pro API exception:`, e.message);
    }
                                        console.log("walletData---------------------------",walletData);

    return walletData;
}



async function savePoolsByWallet(allWalletsData) {
    const fetchedAt = new Date();
    const batchId = new mongoose.Types.ObjectId().toHexString();
    const poolDocuments = [];
    const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    

    for (const walletData of allWalletsData) {
        for (const poolInfo of walletData.pools) {
            poolDocuments.push({
                batchId,
                wallet: walletData.wallet,
                pairAddress:poolInfo.pairAddress,
                pool: poolInfo.pool,
                platform: poolInfo.platform,
                range: poolInfo.range,
                current_price: poolInfo.current_price,
                apr: Number.isFinite(poolInfo.apr) ? poolInfo.apr : 0,
                pending_rewards: Number(poolInfo.pending_rewards) || 0,
                value: Number(poolInfo.value) || 0,
                fetchedAt,
                startTime,
                tokenATokens: Number.isFinite(Number(poolInfo.tokenATokens)) ? Number(poolInfo.tokenATokens) : 0,
                tokenAInUsd: Number.isFinite(Number(poolInfo.tokenAInUsd)) ? Number(poolInfo.tokenAInUsd) : 0,
                tokenBTokens: Number.isFinite(Number(poolInfo.tokenBTokens)) ? Number(poolInfo.tokenBTokens) : 0,
                tokenBInUsd: Number.isFinite(Number(poolInfo.tokenBInUsd)) ? Number(poolInfo.tokenBInUsd) : 0,
            });
        }
    }

    if (!poolDocuments.length) {
        console.log('[INFO] No pool data available to persist.');
        return { batchId, count: 0 };
    }

    await PoolRevenue.insertMany(poolDocuments);
    console.log(
        `[INFO] Saved ${poolDocuments.length} pool-level rows to MongoDB (batch ${batchId}).`
    );

    return { batchId, count: poolDocuments.length };
}


async function main() {
    console.log('\n' + '='.repeat(160));
    console.log('PROCESSING MULTIPLE WALLETS - ALL POSITION DATA');
    console.log('='.repeat(160) + '\n');
    
    const allWalletsData = [];
    const Fetch = await companysWallets.find({status:"active"}).select("walletAddress"); 
    console.log("Fetch", Fetch);
    

    
    for (const wallet of Fetch) {
        console.log(`Processing wallet: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`);
        const walletData = await processWallet(wallet.walletAddress);
        allWalletsData.push(walletData);
    }
    
    console.log('\n' + '='.repeat(160));
    console.log('ALL WALLETS SUMMARY TABLE');
    console.log('='.repeat(160) + '\n');
    
    console.log(`${'Pool'.padEnd(15)} ${'Platform'.padEnd(10)} ${'Wallet'.padEnd(25)} ${'Range Breakdown'.padEnd(20)} ${'Current Price'.padEnd(20)} ${'APR'.padEnd(10)} ${'Pending Rewards'.padEnd(17)} ${'Value'.padEnd(15)}`);
    console.log('-'.repeat(160));
    
    let grandTotalRewards = 0;
    let grandTotalValue = 0;
    
    for (const walletData of allWalletsData) {
        const walletShort = `${walletData.wallet.slice(0, 8)}...${walletData.wallet.slice(-8)}`;
        
        if (walletData.pools.length > 0) {
            for (const poolInfo of walletData.pools) {
                const aprDisplay = poolInfo.apr ? `${poolInfo.apr.toFixed(2)}%` : 'N/A';
                
                console.log(`${poolInfo.pool.padEnd(15)} ${poolInfo.platform.padEnd(10)} ${walletShort.padEnd(25)} ${poolInfo.range.padEnd(20)} ${poolInfo.current_price.padEnd(20)} ${aprDisplay.padEnd(10)} $${poolInfo.pending_rewards.toFixed(2).padEnd(16)} $${poolInfo.value.toFixed(2).padEnd(14)}`);
            }
            
            console.log(`${'WALLET TOTAL'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $${walletData.total_pending_rewards.toFixed(2).padEnd(16)} $${walletData.total_value.toFixed(2).padEnd(14)}`);
            console.log('-'.repeat(160));
        } else {
            console.log(`${'No pools'.padEnd(15)} ${''.padEnd(10)} ${walletShort.padEnd(25)} ${''.padEnd(20)} ${''.padEnd(20)} ${''.padEnd(10)} $0.00              $0.00`);
            console.log('-'.repeat(160));
        }
        
        grandTotalRewards += walletData.total_pending_rewards;
        grandTotalValue += walletData.total_value;
    }
    
    console.log(`\n${'GRAND TOTAL'.padEnd(76)} $${grandTotalRewards.toFixed(2).padEnd(16)} $${grandTotalValue.toFixed(2).padEnd(14)}`);
    console.log('='.repeat(160) + '\n');


try {
        // await connectDB();
        await savePoolsByWallet(allWalletsData);
    } catch (error) {
        console.error('[ERROR] Failed to persist pool-wise data:', error.message);
        throw error;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }



}

// Add this function at the end of the file
async function getAllWalletsData() {
    const allWalletsData = [];
    
  const Fetch = await companysWallets.find({status:"active"})
  .select("walletAddress"); 
    console.log("Fetch", Fetch);

    for (const wallet of Fetch) {
        const walletData = await processWallet(wallet.walletAddress);
        allWalletsData.push(walletData);
    }
    // return allWalletsData;
    await savePoolsByWallet(allWalletsData);
}

async function saveCompoundPoolsByWallet(allWalletsData) {
    const fetchedAt = new Date();
    const batchId = new mongoose.Types.ObjectId().toHexString();
    const poolDocuments = [];
    // const startTime = moment.utc().subtract(1, "days").format("YYYYMMDD"); // Yesterday's date
    const startTime = parseInt(moment.utc().subtract(1, "days").format("YYYYMMDD"), 10); 

    for (const walletData of allWalletsData) {
        for (const poolInfo of walletData.pools) {
            poolDocuments.push({
                batchId,
                wallet: walletData.wallet,
                pairAddress: poolInfo.pairAddress,
                pool: poolInfo.pool,
                platform: poolInfo.platform,
                range: poolInfo.range,
                current_price: poolInfo.current_price,
                apr: Number.isFinite(poolInfo.apr) ? poolInfo.apr : 0,
                pending_rewards: Number(poolInfo.pending_rewards) || 0,
                value: Number(poolInfo.value) || 0,
                fetchedAt,
                startTime,
                tokenATokens: Number.isFinite(Number(poolInfo.tokenATokens)) ? Number(poolInfo.tokenATokens) : 0,
                tokenAInUsd: Number.isFinite(Number(poolInfo.tokenAInUsd)) ? Number(poolInfo.tokenAInUsd) : 0,
                tokenBTokens: Number.isFinite(Number(poolInfo.tokenBTokens)) ? Number(poolInfo.tokenBTokens) : 0,
                tokenBInUsd: Number.isFinite(Number(poolInfo.tokenBInUsd)) ? Number(poolInfo.tokenBInUsd) : 0,
            });
        }
    }

    if (!poolDocuments.length) {
        console.log('[INFO] No compound pool data available to persist.');
        return { batchId, count: 0 };
    }

    await CompoundRevenue.insertMany(poolDocuments);
    console.log(
        `[INFO] Saved ${poolDocuments.length} compound pool-level rows to MongoDB (batch ${batchId}).`
    );

    return { batchId, count: poolDocuments.length };
}

async function getAllCompoundWalletsData() {
    const allWalletsData = [];

    const Fetch = await CompoundWallet.find({ status: "active" })
        .select("walletAddress");
    console.log("Fetch Compound Wallets", Fetch);

    for (const wallet of Fetch) {
        const walletData = await processWallet(wallet.walletAddress);
        allWalletsData.push(walletData);
    }
    await saveCompoundPoolsByWallet(allWalletsData);
    // return allWalletsData;
}


module.exports = { getAllWalletsData, processWallet, savePoolsByWallet, main, getAllCompoundWalletsData, saveCompoundPoolsByWallet };


if (require.main === module) {
    main().catch((error) => {
        console.error('Wallets revenue script failed:', error);
        process.exit(1);
    });
}