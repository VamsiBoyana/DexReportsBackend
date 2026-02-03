const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require("../../middleware/auth");
const User = require('../../models/User');
// const Network = require('../../models/Network');
const Network = require('../../models/NetworkSchema');
const Platform = require('../../models/PlatformSchema');
const Token = require('../../models/TokenSchema');
const { truncates } = require('bcryptjs');
const WalletData = require('../../models/walletBalanceModel');
const Wallet = require('../../models/WalletSchema');
const WalletReport = require('../../models/WalletReportsModel');
const TokenReport = require('../../models/TokenReportsModel');
const Settings = require('../../models/SettingsSchema');
const PoolWalletData = require('../../models/poolWalletDataSchema');
const rwaPools = require('../../models/rwaPools');
const CompoundWallet = require('../../models/CompoundWallet');

const transporter = require('../../models/EmailService');
const nodemailer = require("nodemailer");

const companysWallets = require('../../models/companysWallets');


const addCompanyWallet = async (req, res, next) => {
  try {
    const { walletId, walletAddress, status } = req.body;
    console.log(req.body);

    if (walletId) {
      const existingWallet = await companysWallets.findById(walletId);

      if (!existingWallet) {
        return res.status(404).json({ message: "Company wallet not found" });
      }

      existingWallet.walletAddress = walletAddress;
      existingWallet.status = status;
      await existingWallet.save();

      return res.status(200).json({
        message: "Company wallet updated successfully",
        data: existingWallet
      });

    } else {
      const alreadyExists = await companysWallets.findOne({ walletAddress });
      if (alreadyExists) {
        return res.status(400).json({
          message: "Company wallet already exists"
        });
      }

      const newCompanyWallet = new companysWallets({
        walletAddress,
        status
      });

      await newCompanyWallet.save();

      return res.status(201).json({
        message: "Company wallet added successfully",
        data: newCompanyWallet
      });
    }

  } catch (error) {
    console.error("Error adding company wallet:", error);
    return res.status(500).json({
      message: "Failed to add company wallet",
      error: error.message
    });
  }
};


// const updateCompanyWallet = async (req, res) => {
//   try {
//     const { walletId, walletAddress, status } = req.body;

//     if (!walletId) {
//       return res.status(400).json({ message: "walletId is required" });
//     }

//     const updatedWallet = await companysWallets.findByIdAndUpdate(
//       walletId,
//       { walletAddress, status },
//       { new: true }
//     );

//     if (!updatedWallet) {
//       return res.status(404).json({ message: "Company wallet not found" });
//     }

//     return res.status(200).json({
//       message: "Company wallet updated successfully",
//       data: updatedWallet
//     });

//   } catch (error) {
//     console.error("Error updating company wallet:", error);
//     return res.status(500).json({
//       message: "Failed to update company wallet",
//       error: error.message
//     });
//   }
// };


// const getCompanyWallets = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 10, ...filters } = req.query;
//     const filterConditions = {};
//     for (let key in filters) {
//       if (filters[key]) {
//         filterConditions[key] = { $regex: filters[key], $options: "i" }; 
//       }
//     }
//     const companyWallets = await companysWallets.find(filterConditions)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));
//     const totalCount = await companysWallets.countDocuments(filterConditions);

//     res.status(200).json({
//       totalCount,
//       currentPage: parseInt(page),
//       limit: parseInt(limit),
//       totalPages: Math.ceil(totalCount / limit),
//       data: companyWallets,
//     });
//   } catch (error) {
//     console.error("Error fetching company wallets:", error);
//     res.status(500).json({ message: "Failed to fetch company wallets", error: error.message });
//   }
// };


const getCompanyWallets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const filterConditions = {};
    for (let key in filters) {
      if (filters[key]) {
        filterConditions[key] = { $regex: filters[key], $options: "i" }; // Case-insensitive search
      }
    }
    const companyWallets = await companysWallets.find(filterConditions)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const totalCount = await companysWallets.countDocuments(filterConditions);

    res.status(200).json({
      totalCount,
      currentPage: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
      data: companyWallets,
    });
  } catch (error) {
    console.error("Error fetching company wallets:", error);
    res.status(500).json({ message: "Failed to fetch company wallets", error: error.message });
  }
};


const adminSignup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const exisitingUser = await User.findOne({ email });
    if (exisitingUser) {
      return res.status(409).json({
        message: 'Email already exists'
      })
    }

    const user = new User({
      username,
      email,
      password,
      role: role || "admin"
    });
    await user.save();

    // Send OTP email
    //   await transporter.sendMail({
    //     from: process.env.SMTP_EMAIL,
    //     to: user.email,
    //     subject: "Admin Signup OTP Verification",
    //     text: `Dear ${user.username},\n\nYour OTP code for verifying your admin signup is: ${otp}\n\nThis code is valid for 10 minutes. Please do not share it with anyone. If you did not request an admin signup, please ignore this email.\n\nThank you.\n\nBest regards,\ncreator.fun`,
    //     html: `
    //   <h2>Admin Signup OTP Verification</h2>
    //   <p>Dear ${user.username},</p>
    //   <p>Your OTP code for verifying your <strong>admin</strong> signup is: <strong>${otp}</strong></p>
    //   <p>This code is valid for 10 minutes. Please do not share it with anyone.</p>
    //   <p>If you did not request an admin signup, please ignore this email.</p>
    //   <p>Thank you for your cooperation!</p>
    //   <p>Best regards,<br/>
    //   <strong>creator.fun</strong></p>
    // `,
    //   });
    res.status(201).json({
      message: "Admin created successfully",
      user
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message || "Some error occurred while creating the Admin."
    })
  }
}


const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    // Find user & ensure password is retrieved
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has admin access
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Not an Admin account." });
    }

    // Check if password field exists
    if (!user.password) {
      console.error("⚠️ Error: Password field is missing in the database.");
      return res
        .status(500)
        .json({ message: "Server error: Missing user password." });
    }

    // Compare entered password with hashed password
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT Token
    // const generateToken = (user) => {
    //   return jwt.sign(
    //     { user: { id: user._id, role: user.role } },
    //     process.env.ACCESS_TOKEN_SECRET,
    //     { expiresIn: "24h" }
    //   );
    // };

    const token = generateToken(user);

    // Send success response (excluding password)
    return res.status(200).json({
      message: "Admin Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Failed to log in user:", error);
    return res
      .status(500)
      .json({ message: "Unable to log in", error: error.message });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params._id;
    const { username, email, isActive } = req.body;

    if (!userId) {
      return res.status(404).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if another user already has this username
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken by another user" });
      }
      user.username = username;
    }

    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      message: `User Profile updated successfully ${username}...`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ message: "Unable to update profile" });
  }
};


// const getAllActivities = async (req, res) => {
//   try {
//     const wallet = "CtsEHMJAGFws9xyJ2ZerZcuML8fnAZZMbQVpp6bjuzWz";
//     const walletAddress = "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW";
//     const mintAddress = "BjcRmwm8e25RgjkyaFE56fc7bxRgGPw96JUkXRJFEroT";
//     const tokenAddress = "So11111111111111111111111111111111111111112";
//     const pairAddress = "GdxFycQMfy5g1m1Ax2ViF8ZPAv22i27GSza7m9d6Cq4A";
//     const from_time = 1760250600;
//     const to_time = 1760337000;

//     const pageSize = 100;
//     const toTime = 20251014;
//     const chainId = "solana";
//     const symbol = "SOLUSDT";

//     let allData = [];
//     let page = 1;
//     let hasMoreData = true;
//     let USD_MIN = 15.2;

//     const requestOptions = {
//       method: "GET",
//       headers: {
//         token:
//           "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
//       },
//     };

//     const currentDate = new Date();
//     const today = currentDate.toLocaleDateString();

//     currentDate.setDate(currentDate.getDate() - 1);
//     const yesterday = currentDate.toLocaleDateString();
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

//     const pooledTLOOPToday = liquidityData.base;
//     const pooledSOLToday = liquidityData.quote;

//     const pooledTloopAverage = pooledTLOOPToday;

//     const pooledSolAverage = pooledSOLToday;

//     const responsePrice = await fetch(
//       `https://api.binance.com/api/v3/avgPrice?symbol=${symbol}`
//     );
//     if (!responsePrice.ok) {
//       throw new Error("Network response was not ok for Binance");
//     }
//     const priceData = await responsePrice.json();
//     console.log("Average SOL Price:", priceData.price);

//     let filteredData = [];


//     const urll = `https://pro-api.solscan.io/v2.0/account/transfer?address=${walletAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
//     const responsee = await fetch(urll, requestOptions);
//     const dataa = await responsee.json();

//     const filteredTransactions = dataa.data.filter((tx) => {
//       return tx.flow === "out" && tx.from_address === "CrXjC1WkUbxix997s3hA71czVNLmgE7bQKQRqyT7R9XW" && tx.to_address === "CtsEHMJAGFws9xyJ2ZerZcuML8fnAZZMbQVpp6bjuzWz";
//     });

//     //   // Concatenate the filtered transactions to our result array
//     filteredData = filteredData.concat(filteredTransactions);

//     const innerTrasaction = filteredData[0].amount / 10 ** filteredData[0].token_decimals;

//     console.log(innerTrasaction, "innerTrasaction");

//     while (hasMoreData) {
//       const url = `https://pro-api.solscan.io/v2.0/account/transfer?address=${wallet}&token=${mintAddress}&from_time=${from_time}&to_time=${to_time}&page=${page}&page_size=${pageSize}`;
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

//     // Get today's date without the time (set to start of today)
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0); // Set to 00:00:00 (start of the day)

//     // Get the start of tomorrow (for comparison with $lt)
//     const tomorrowStart = new Date(todayStart);
//     tomorrowStart.setDate(todayStart.getDate() + 1); // Set to the start of the next day

//     // Query to find documents where the createdAt's date matches today's date

//     const walletBalance = await WalletData.findOne({
//       createdAt: { $gte: todayStart, $lt: tomorrowStart },
//       tokenAddress: mintAddress // Add the filter for tokenAddress
//     });

//     // Calculate the sum of walletBalance

//     console.log("walletBalance", walletBalance.walletBalance);

//     // Count buys and sells using flow
//     let buys = 0;
//     let sells = 0;

//     allData.forEach((tx) => {
//       if (tx.flow === "in") buys++;
//       else if (tx.flow === "out") sells++;
//     });

//     // const innerTrasaction =allData.

//     const filtered = allData.filter((tx) => tx.value >= USD_MIN);
//     const resetBuys = filtered.filter((tx) => tx.to_address === wallet);
//     const resetSells = filtered.filter((tx) => tx.from_address === wallet);

//     const resetBuyVolume = resetBuys.reduce((s, t) => s + (t.value || 0), 0);
//     const resetSellVolume = resetSells.reduce((s, t) => s + (t.value || 0), 0);
//     const agentBuys = buys - resetBuys.length;
//     const agentSells = sells - resetSells.length;
//     const agentsVolume = agentBuys * 15 + agentSells * 15;
//     const averageVolume = (resetBuyVolume + resetSellVolume) / 2;
//     const totalVolume = agentsVolume + (resetBuyVolume + resetSellVolume);
//     const gasFee = allData.length * 0.000059;
//     const rayFee = (totalVolume * 0.25) / 100;
//     const lpAdd = (totalVolume * 0.22) / 100;
//     const solAverage = priceData.price;
//     const slippage = totalVolume * (15 / solAverage / pooledSolAverage);
//     const walletBalanceValue = walletBalance.walletBalance + innerTrasaction;
//     const walletCost = rayFee + gasFee;
//     // const walletProfit = walletBalanceValue - walletCost;
//     // const cost = rayFee + gasFee;

//     // const walletLoss = rayFee + gasFee -

//     return res.json({
//       wallet,
//       token: mintAddress,
//       total: allData.length,
//       buys,
//       sells,
//       resetBuys: resetBuys.length,
//       resetSells: resetSells.length,
//       solAverage,
//       resetBuyVolumeUSD: resetBuyVolume.toFixed(2),
//       resetSellVolumeUSD: resetSellVolume.toFixed(2),
//       agentBuys,
//       agentSells,
//       pooledTloopAverage,
//       pooledSolAverage,
//       slippage,
//       lpAdd,
//       averageVolume,
//       // cost,
//       walletBalanceValue,
//       walletCost,
//       from_time,
//       to_time,
//       data: allData,
//     });
//   } catch (err) {
//     console.error("Error fetching data:", err);
//     if (!res.headersSent) return res.status(500).send("Internal Server Error");
//   }
// };


const createNetwork = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Name must be a non-empty string.' });
    }

    const networkExists = await Network.exists({ name });
    if (networkExists) {
      return res.status(409).json({ message: 'Network with this name already exists.' });
    }

    const newNetwork = new Network({
      name,
      status: true
    });
    await newNetwork.save();
    return res.status(201).json({
      message: 'Network created successfully.',
      data: newNetwork,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};


// const updateNetwork = async (req, res) => {
//   try {
//     const requestId = req.params._id;
//     const { name, status } = req.body;
//     if (!requestId) {
//       return res.status(400).json({ message: "requestId is required" });
//     }

//     // if(name){
//     //   const networkExists = await Network.exists({_id:requestId,name});
//     //   if(networkExists){
//     //     return res.status(409).json({message:'Network with this name already exists'});
//     //   }
//     // }

//     const updatedNetwork = await Network.findByIdAndUpdate(requestId,
//       { name, status },
//       { new: true });

//     if (!updatedNetwork) {
//       return res.status(404).json({ message: 'Network not found' });
//     }

//     await updatedNetwork.save();

//     return res.status(200).json({
//       message: 'Network updated successfully',
//       data: updatedNetwork,
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: 'An error occurred while processing your request.' });
//   }
// }


const updateNetwork = async (req, res) => {
  try {
    const { _id: requestId } = req.params;
    const { name, status } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Network ID is required." });
    }

    const network = await Network.findById(requestId);
    if (!network) {
      return res.status(404).json({ message: "Network not found." });
    }

    // Prevent duplicate network name (only if name changes)
    if (name && name !== network.name) {
      const nameExists = await Network.exists({ name });
      if (nameExists) {
        return res
          .status(409)
          .json({ message: "Network with this name already exists." });
      }
    }

    // Properly handle false values
    if (typeof name !== "undefined") network.name = name;
    if (typeof status !== "undefined") network.status = status;

    const updatedNetwork = await network.save();

    return res.status(200).json({
      message: "Network updated successfully.",
      data: updatedNetwork,
    });
  } catch (err) {
    console.error("Error updating network:", err.message);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};


// const getNetworks = async (req, res) => {
//   try {
//     const { networkId } = req.query;

//     if (networkId) {
//       // Fetch single network
//       const network = await Network.findById(networkId);
//       if (!network) {
//         return res.status(404).json({ message: "Network not found" });
//       }
//       return res.status(200).json({
//         message: "Network fetched successfully",
//         data: network,
//       });
//     } else {
//       // Fetch all networks
//       const allNetworks = await Network.find();
//       return res.status(200).json({
//         message: "All networks fetched successfully",
//         length: allNetworks.length,
//         data: allNetworks,
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching networks:", error);
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };


const getNetworks = async (req, res) => {
  try {
    const { networkId, page = 1, limit = 10 } = req.query;

    // Parse and validate pagination params
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Fetch single network if ID provided
    if (networkId) {
      const network = await Network.findById(networkId);
      if (!network) {
        return res.status(404).json({ message: "Network not found" });
      }
      return res.status(200).json({
        message: "Network fetched successfully",
        data: network,
      });
    }
    // Count total networks
    const count = await Network.countDocuments();

    // Fetch paginated networks
    const allNetworks = await Network.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!allNetworks.length) {
      return res.status(404).json({
        message: "No networks found.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Final response
    return res.status(200).json({
      message: "All networks fetched successfully",
      count,
      totalPages: Math.max(1, Math.ceil(count / limitNumber)),
      currentPage: pageNumber,
      limit: limitNumber,
      data: allNetworks,
    });
  } catch (error) {
    console.error("Error fetching networks:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// const createPlatform = async (req, res) => {
//   try {
//     const { platform, networkId } = req.body;

//     // Validation
//     if (!platform || typeof platform !== "string") {
//       return res.status(400).json({ message: "Platform name is required and must be a string." });
//     }
//     if (!networkId) {
//       return res.status(400).json({ message: "networkId is required." });
//     }

//     // Check if network exists
//     const network = await Network.findById(networkId);
//     if (!network) {
//       return res.status(404).json({ message: "Network not found." });
//     }

//     // Check if platform with same name already exists for this network
//     const platformExists = await Platform.exists({ name: platform, networkId });
//     if (platformExists) {
//       return res.status(409).json({ message: "Platform with this name already exists in this network." });
//     }

//     // Create platform
//     const doc = await Platform.create({
//       name: platform.trim(),
//       networkId,
//       networkName: network.name, // ← saved in DB
//     });

//     return res.status(201).json({
//       message: "Platform created successfully.",
//       data: doc,
//     });

//   } catch (err) {
//     console.error("Error creating platform:", err);
//     return res.status(500).json({ message: "An error occurred while processing your request." });
//   }
// };


const createPlatform = async (req, res) => {
  try {
    const { platform, networkId, status } = req.body;

    // Validation
    if (!platform || typeof platform !== "string") {
      return res.status(400).json({ message: "Platform name is required and must be a string." });
    }
    if (!networkId) {
      return res.status(400).json({ message: "networkId is required." });
    }

    // Check if network exists
    const network = await Network.findById(networkId);
    if (!network) {
      return res.status(404).json({ message: "Network not found." });
    }

    // Check if platform with same name already exists for this network
    const platformExists = await Platform.exists({ platform, networkId });
    if (platformExists) {
      return res.status(409).json({ message: "Platform with this name already exists in this network." });
    }

    // Create platform
    const doc = await Platform.create({
      platform: platform.trim(),
      networkId,
      networkName: network.name, // ← saved in DB
      status: true
    });

    return res.status(201).json({
      message: "Platform created successfully.",
      data: doc,
    });

  } catch (err) {
    console.error("Error creating platform:", err);
    return res.status(500).json({ message: "An error occurred while processing your request." });
  }
};


// const updatePlatform = async (req, res) => {
//   try {
//     const requestId = req.params._id;
//     const { platform } = req.body;

//     if (!requestId) {
//       return res.status(400).json({ message: "Request ID is required." });
//     }

//     // Check if platform exists
//     const platformm = await Platform.findById(requestId);
//     if (!platformm) {
//       return res.status(404).json({ message: "Platform not found." });
//     }

//     const updatedPlatform = await Platform.findByIdAndUpdate(
//       requestId,
//       { platform: platform },
//       { new: true, runValidators: true }
//     );

//     return res.status(200).json({
//       message: "Platform updated successfully.",
//       data: updatedPlatform,
//     });

//   } catch (err) {
//     console.error("Error updating platform:", err);
//     return res.status(500).json({ message: "An error occurred while processing your request." });
//   }
// };


const updatePlatform = async (req, res) => {
  try {
    const requestId = req.params._id;
    const { platform, status } = req.body;

    if (!requestId) return res.status(400).json({ message: "Platform ID is required." });

    const existing = await Platform.findById(requestId);
    if (!existing) return res.status(404).json({ message: "Platform not found." });

    if (platform && platform !== existing.platform) {
      const duplicate = await Platform.exists({
        platform: platform.trim(),
        networkId: existing.networkId,
        requestId: { $ne: requestId },
      });
      if (duplicate) return res.status(409).json({ message: "Platform name already exists in this network." });
      existing.platform = platform.trim();
    }

    if (typeof status !== "undefined") existing.status = status;

    await existing.save();
    res.status(200).json({ message: "Platform updated successfully.", data: existing });
  } catch (err) {
    res.status(500).json({ message: "Error updating platform.", error: err.message });
  }
};


// const getPlatforms = async (req, res) => {
//   try {
//     const { networkId } = req.query;
//     let platforms;

//     if (networkId) {
//       // Check if network exists
//       const networkExists = await Network.findById(networkId);
//       if (!networkExists) {
//         return res.status(404).json({ message: "Network not found." });
//       }

//       platforms = await Platform.find({ networkId });
//       return res.status(200).json({
//         message: `Network with ${networkExists.name} platforms fetched successfully`,
//         length: platforms.length,
//         data: platforms,
//       });
//     } else {
//       platforms = await Platform.find();
//     }

//     return res.status(200).json({
//       message: "All Platforms fetched successfully",
//       length: platforms.length,
//       data: platforms,
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "An error occurred while processing your request." });
//   }
// };


const getPlatforms = async (req, res) => {
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

    let platforms;
    const filter = {};

    // If networkId is provided
    if (networkId) {
      const networkExists = await Network.findById(networkId);
      if (!networkExists) {
        return res.status(404).json({ message: "Network not found." });
      }

      filter.networkId = networkId;
    }

    // Count total platforms
    const count = await Platform.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated platforms
    platforms = await Platform.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!platforms.length) {
      return res.status(404).json({
        message: networkId
          ? `No platforms found for networkId: ${networkId}`
          : "No platforms found.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    const message = networkId
      ? `Platforms for network fetched successfully.`
      : "All platforms fetched successfully.";

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
    console.error("Error fetching platforms:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};


// const createToken = async (req, res) => {
//   try {
//     const { name, platform, APIKey, tokenAddress, walletAddress, innerWalletAddress, usd_min, chainId, pairAddress, token_logo_url, network } = req.body;

//     if (!name || typeof name !== "string") {
//       return res.status(400).json({ message: "Token name is required and must be a string." });
//     }
//     if (!platform) {
//       return res.status(400).json({ message: "Valid platformId is required." });
//     }

//     // Check if platform exists
//     const platformm = await Platform.findById(platform).select("_id");
//     if (!platformm) {
//       return res.status(404).json({ message: "Platform not found." });
//     }

//     // Check if token with same name already exists in this platform
//     const tokenExists = await Token.exists({ walletAddress });
//     if (tokenExists) {
//       return res.status(409).json({ message: "Token with this walletAddress already exists in this platform." });
//     }

//     // Create token (IMPORTANT: set platform)
//     const newToken = await Token.create({
//       name,
//       platform,
//       APIKey, tokenAddress, walletAddress, innerWalletAddress, usd_min, chainId, pairAddress, token_logo_url, network
//     });

//     return res.status(201).json({
//       message: "Token created successfully.",
//       data: newToken,
//     });
//   } catch (err) {
//     if (err.name === "ValidationError") {
//       return res.status(400).json({ message: "Validation failed.", details: err.message });
//     }
//     console.error("Error creating token:", err);
//     return res.status(500).json({ message: "An error occurred while processing your request." });
//   }
// };


//commented on 20-12-25
// const createToken = async (req, res) => {
//   try {
//     const {
//       name,
//       platformId,
//       APIKey,
//       tokenAddress,
//       // walletAddress,
//       // innerWalletAddress,
//       usd_min,
//       chainId,
//       pairAddress,
//       token_logo_url,
//       symbol,
//       solAddress,
//       url,
//       status

//     } = req.body;

//     // 💥 Basic validations
//     if (!name || typeof name !== "string") {
//       return res.status(400).json({ message: "Token name is required and must be a string." });
//     }

//     if (!platformId) {
//       return res.status(400).json({ message: "Valid platformId is required." });
//     }

//     // 🧠 Find platform and populate its networkId (correct field name)
//     const platformDoc = await Platform.findById(platformId).populate("networkId", "_id name");

//     if (!platformDoc) {
//       return res.status(404).json({ message: "Platform not found." });
//     }

//     // 🧩 Extract networkId from populated platform
//     const networkDoc = platformDoc.networkId?._id;
//     if (!networkDoc) {
//       return res.status(400).json({ message: "Platform does not have a linked network." });
//     }

//     // // ⚡ Check for duplicate wallet
//     // const tokenExists = await Token.exists({ walletAddress });
//     // if (tokenExists) {
//     //   return res.status(409).json({ message: "Token with this walletAddress already exists." });
//     // }

//     // 🚀 Create token and attach both platformId & networkId
//     const newToken = await Token.create({
//       name,
//       platformId,
//       networkId: networkDoc,
//       APIKey,
//       tokenAddress,
//       // walletAddress,
//       // innerWalletAddress,
//       usd_min,
//       chainId,
//       pairAddress,
//       token_logo_url,
//       symbol,
//       solAddress,
//       url,
//       status: true
//     });

//     return res.status(201).json({
//       message: "Token created successfully.",
//       data: newToken,
//     });
//   } catch (err) {
//     console.error("Error creating token:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };


const createToken = async (req, res) => {
  try {
    const {
      name,
      platformId,
      APIKey,
      tokenAddress,
      // walletAddress,
      // innerWalletAddress,
      usd_min,
      chainId,
      pairAddress,
      token_logo_url,
      symbol,
      solAddress,
      url,
      status

    } = req.body;

    // 💥 Basic validations
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Token name is required and must be a string." });
    }

    if (!platformId) {
      return res.status(400).json({ message: "Valid platformId is required." });
    }

    // 🧠 Find platform and populate its networkId (correct field name)
    const platformDoc = await Platform.findById(platformId).populate("networkId", "_id name");

    if (!platformDoc) {
      return res.status(404).json({ message: "Platform not found." });
    }

    // 🧩 Extract networkId from populated platform
    const networkDoc = platformDoc.networkId?._id;
    if (!networkDoc) {
      return res.status(400).json({ message: "Platform does not have a linked network." });
    }

    // // ⚡ Check for duplicate wallet
    // const tokenExists = await Token.exists({ walletAddress });
    // if (tokenExists) {
    //   return res.status(409).json({ message: "Token with this walletAddress already exists." });
    // }

    // 🔍 Fetch lpMint address from Raydium API
    let lpMintAddress = null;
    if (tokenAddress) {
      try {
        const raydiumUrl = `https://api-v3.raydium.io/pools/info/list-v2?mint1=${tokenAddress}&sortType=desc&size=100`;
        const raydiumResponse = await fetch(raydiumUrl, {
          method: "GET",
          headers: {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs"
          }
        });

        if (raydiumResponse.ok) {
          const raydiumData = await raydiumResponse.json();

          if (raydiumData.success && raydiumData.data && raydiumData.data.data) {
            const pools = raydiumData.data.data;

            // Find the pool that matches the pairAddress if provided, otherwise get the first pool
            let matchingPool = null;
            if (pairAddress) {
              matchingPool = pools.find(pool => pool.id === pairAddress);
            }

            // If no match found with pairAddress, use the first pool
            if (!matchingPool && pools.length > 0) {
              matchingPool = pools[0];
            }

            if (matchingPool && matchingPool.lpMint && matchingPool.lpMint.address) {
              lpMintAddress = matchingPool.lpMint.address;
              console.log(`Found lpMint address: ${lpMintAddress} for tokenAddress: ${tokenAddress}`);
            }
          }
        } else {
          console.warn(`Failed to fetch pool info from Raydium API for token: ${tokenAddress}`);
        }
      } catch (error) {
        console.error("Error fetching lpMint address from Raydium API:", error);
        // Continue without lpMint if API call fails
      }
    }

    // 🚀 Create token and attach both platformId & networkId
    const newToken = await Token.create({
      name,
      platformId,
      networkId: networkDoc,
      APIKey,
      tokenAddress,
      // walletAddress,
      // innerWalletAddress,
      usd_min,
      chainId,
      pairAddress,
      token_logo_url,
      symbol,
      solAddress,
      url,
      lpMint: lpMintAddress,
      status: true
    });

    return res.status(201).json({
      message: "Token created successfully.",
      data: newToken,
    });
  } catch (err) {
    console.error("Error creating token:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};



const updateToken = async (req, res) => {
  try {
    const requestId = req.params._id;
    const { name, pairAddress, APIKey, tokenAddress, chainId, usd_min, token_logo_url, platformId, networkId, symbol, solAddress, url, status } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Token ID is required." });
    }

    // Find token by ID
    const token = await Token.findById(requestId);
    if (!token) {
      return res.status(404).json({ message: "Token not found." });
    }

    // Update values only if provided, otherwise keep old
    token.name = name || token.name;
    token.pairAddress = pairAddress || token.pairAddress;
    token.APIKey = APIKey || token.APIKey;
    token.tokenAddress = tokenAddress || token.tokenAddress;
    token.chainId = chainId || token.chainId;
    token.usd_min = usd_min || token.usd_min;
    token.token_logo_url = token_logo_url || token.token_logo_url;
    token.platformId = platformId || token.platformId;
    token.networkId = networkId || token.networkId;
    token.symbol = symbol || token.symbol;
    token.solAddress = solAddress || token.solAddress;
    token.url = url || token.url;
    token.status = status;

    await token.save();

    return res.status(200).json({
      message: "Token updated successfully.",
      data: token,
    });

  } catch (err) {
    console.error("Error updating token:", err);
    return res.status(500).json({ message: "An error occurred while processing your request." });
  }
};


// const getTokens = async (req, res) => {
//   try {
//     const { platformId, networkId, tokenId } = req.query;
//     const filter = {};

//     if (platformId) filter.platformId = platformId;
//     if (networkId) filter.networkId = networkId;

//     if (tokenId) {
//       const token = await Token.findById(tokenId);
//       if (!token) {
//         return res.status(404).json({ message: "Token not found." });
//       }
//       return res.status(200).json({
//         message: "Token fetched successfully.",
//         data: token,
//       });
//     }

//     const tokens = await Token.find(filter);
//     return res.status(200).json({
//       message:
//         platformId && networkId
//           ? "Tokens for platform + network."
//           : platformId
//             ? "Platform tokens."
//             : networkId
//               ? "Network tokens."
//               : "All tokens.",
//       data: tokens,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "An error occurred while processing your request." });
//   }
// };


const getTokens = async (req, res) => {
  try {
    const { platformId, networkId, tokenId, page = 1, limit = 10 } = req.query;

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

    // Filters
    const filter = {};
    if (platformId) filter.platformId = platformId;
    if (networkId) filter.networkId = networkId;

    // Fetch by tokenId (single document)
    if (tokenId) {
      const token = await Token.findById(tokenId);
      if (!token) {
        return res.status(404).json({ message: "Token not found." });
      }
      return res.status(200).json({
        message: "Token fetched successfully.",
        data: token,
      });
    }

    // Count total tokens matching filters
    const count = await Token.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated token list
    const tokens = await Token.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!tokens.length) {
      return res.status(404).json({
        message: "No tokens found for the given filters.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    let message;
    if (platformId && networkId) {
      message = "Tokens for the given platform and network fetched successfully.";
    } else if (platformId) {
      message = "Platform tokens fetched successfully.";
    } else if (networkId) {
      message = "Network tokens fetched successfully.";
    } else {
      message = "All tokens fetched successfully.";
    }

    // Response
    return res.status(200).json({
      message,
      count,
      totalPages,
      currentPage: pageNumber,
      limit: limitNumber,
      data: tokens,
    });
  } catch (err) {
    console.error("Error fetching tokens:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};


// const getSingleAndAllUsers = async (req, res) => {
//   try {
//     const { userId } = req.query;

//     // If a specific user is requested
//     if (userId) {
//       const user = await User.findById(userId).select("-password");
//       if (!user) {
//         return res.status(404).json({ message: "User Not Found" });
//       }
//       return res.status(200).json({
//         message: "User fetched successfully",
//         data: user,
//       });
//     }

//     const users = await User.find().select("-password");
//     return res.status(200).json({
//       message: "All Users fetched successfully",
//       length: users.length,
//       data: users,
//     });
//   } catch (err) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while processing your request." });
//   }
// };


const getSingleAndAllUsers = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

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

    // If a specific user is requested
    if (userId) {
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }
      return res.status(200).json({
        message: "User fetched successfully",
        data: user,
      });
    }

    // Count total users
    const count = await User.countDocuments();

    // Fetch paginated users (excluding passwords)
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!users.length) {
      return res.status(404).json({
        message: "No users found.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Final response
    return res.status(200).json({
      message: "All users fetched successfully.",
      count,
      totalPages: Math.max(1, Math.ceil(count / limitNumber)),
      currentPage: pageNumber,
      limit: limitNumber,
      data: users,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "An error occurred while processing your request."
    });
  }
};


const deleteUserById = async (req, res) => {
  try {
    const userId = req.params._id;
    if (!userId) {
      return res.status(400).json({ message: "User Id is Required!" })
    }

    const deletedUser = await User.findByIdAndDelete({ _id: userId });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while deleting the user." });
  }
}


const updateUserById = async (req, res) => {
  try {
    const userId = req.params._id;
    const { username, email } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) {
      user.username = username;
    }

    await user.save();
    return res.status(200).json({
      message: "User Updated Sucessfully",
      data: user,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "An error occurred while processing your request." });
  }
}


const addWallet = async (req, res) => {
  try {
    const { walletAddress, innerWalletAddress, tokenId, pairAddress, poolType, symbol } = req.body;

    if (!walletAddress || !tokenId || !innerWalletAddress) {
      return res.status(400).json({ message: 'Both walletAddress and tokenId are required.' });
    }

    const token = await Token.findById(tokenId);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    const existingWallet = await Wallet.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(409).json({ message: 'Wallet address already exists' });
    }

    const newWallet = await Wallet.create({
      walletAddress,
      innerWalletAddress,
      tokenId,
      pairAddress,
      poolType,
      symbol
    });

    return res.status(201).json({
      message: 'Wallet added successfully.',
      data: newWallet,
    });

  } catch (err) {
    console.error('Error adding wallet:', err);
    return res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};


//commented 16-12-25
// exports.getWalletOverview = async (walletAddress) => {
//   try {
//     if (!walletAddress) {
//       throw new Error("walletAddress is required");
//     }

//     // console.log("walletAddress in overview",walletAddress);


//     const url = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

//     const response = await fetch(url, {
//       headers: {
//         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs"
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
//     }

//     const result = await response.json();
//     const data = result.data;

//     if (!data) {
//       throw new Error("No data found for this wallet");
//     }

//     // ✅ Fetch the token address from your DB
//     const tokenDoc = await WalletReport.findOne({ walletAddress: walletAddress });
//     const tokenAddress = tokenDoc?.token;

//     if (!tokenAddress) {
//       throw new Error("No token address found in WalletReport for this wallet");
//     }

//     // ✅ Filter only matching token data
//     const matchedToken = data.tokens?.find(
//       (t) => t.token_address.toLowerCase() === tokenAddress.toLowerCase()
//     );

//     // ✅ Prepare response
//     const responseData = {
//       total_value: data.total_value,
//       solValue: data.native_balance.balance,
//       solValueInUSD: data.native_balance.value,
//       valueInTokens: matchedToken?.balance,
//       valueInUSD: matchedToken?.value
//     };

//     return responseData;

//   } catch (err) {
//     console.error("Error fetching wallet overview:", err.message);
//     throw err; // Let the caller (getWallets) handle the error
//   }
// };

//mine 16-12-25


exports.getWalletOverview = async (walletAddress) => {
  try {
    if (!walletAddress) {
      throw new Error("walletAddress is required");
    }

    // console.log("walletAddress in overview",walletAddress);


    const url = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

    const response = await fetch(url, {
      headers: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs"
      }
    });

    if (!response.ok) {
      throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const data = result.data;

    if (!data) {
      throw new Error("No data found for this wallet");
    }

    // ✅ Fetch the token address from your DB
    // First try to get from WalletReport (for wallets with existing reports)
    let tokenDoc = await WalletReport.findOne({ walletAddress: walletAddress });
    let tokenAddress = tokenDoc?.token;

    // If not found in WalletReport, try to get from Wallet schema (for new wallets)
    if (!tokenAddress) {
      const walletDoc = await Wallet.findOne({ walletAddress: walletAddress }).populate('tokenId', 'tokenAddress');
      if (walletDoc && walletDoc.tokenId && walletDoc.tokenId.tokenAddress) {
        tokenAddress = walletDoc.tokenId.tokenAddress;
      }
    }

    // If still not found, return default values instead of throwing error
    if (!tokenAddress) {
      console.warn(`No token address found for wallet ${walletAddress}, returning default overview`);
      return {
        total_value: data.total_value || 0,
        solValue: data.native_balance?.balance || 0,
        solValueInUSD: data.native_balance?.value || 0,
        valueInTokens: null,
        valueInUSD: null
      };
    }

    // ✅ Filter only matching token data
    const matchedToken = data.tokens?.find(
      (t) => t.token_address.toLowerCase() === tokenAddress.toLowerCase()
    );

    // ✅ Prepare response
    const responseData = {
      total_value: data.total_value,
      // solValue: data.native_balance.balance,
      // solValueInUSD: data.native_balance.value,
      solValue: data.native_balance?.balance || 0,
      solValueInUSD: data.native_balance?.value || 0,
      valueInTokens: matchedToken?.balance,
      valueInUSD: matchedToken?.value
    };

    return responseData;

  } catch (err) {
    console.error("Error fetching wallet overview:", err.message);
    throw err; // Let the caller (getWallets) handle the error
  }
};


exports.getWalletLastTransaction = async (walletAddress) => {

  if (!walletAddress) {
    throw new Error("walletAddress is required");
  }

  // console.log("walletAddress in lasttranaction ",walletAddress);

  const requestOptions = {
    method: "GET",
    headers: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MzE0MDQzNDI4NTEsImVtYWlsIjoiaW5mb0BzdHJpbmdtZXRhdmVyc2UuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzMxNDA0MzQyfQ.SMLho5s-_pTBHYlZj2qV3OEq9Qwy8mh859xApQRcoBs",
    },
  };

  try {
    // Fetch wallet activity data
    const walletData = await fetch(
      `https://pro-api.solscan.io/v2.0/account/defi/activities?address=${walletAddress}&page=1&page_size=10&sort_by=block_time&sort_order=desc`,
      requestOptions
    );
    const data = await walletData.json();

    // If the response has data and items
    if (data?.data?.length > 0) {
      const latestTransaction = data.data[0];

      const formattedTransaction = {
        block_id: latestTransaction.block_id,
        trans_id: latestTransaction.trans_id,
        block_time: latestTransaction.block_time,
        activity_type: latestTransaction.activity_type,
        from_address: latestTransaction.from_address,
        sources: latestTransaction.sources || [],
        platform: latestTransaction.platform || [],
        value: latestTransaction.value,
        routers: {
          token1: latestTransaction.routers?.token1 || '',
          token1_decimals: latestTransaction.routers?.token1_decimals || 0,
          amount1: latestTransaction.routers?.amount1 || 0,
          token2: latestTransaction.routers?.token2 || '',
          token2_decimals: latestTransaction.routers?.token2_decimals || 0,
          amount2: latestTransaction.routers?.amount2 || 0,
          pool_address: latestTransaction.routers?.pool_address || '',
          child_routers: latestTransaction.routers?.child_routers || [], // Ensure child_routers is an array
        },
        time: latestTransaction.time,
      };

      const walletTokens = formattedTransaction.routers.amount1 / (10 ** formattedTransaction.routers.token1_decimals);
      const solTokens = formattedTransaction.routers.amount2 / (10 ** formattedTransaction.routers.token2_decimals);
      const walletTokenValueinUsdt = formattedTransaction.value / walletTokens;
      const solValueinUsdt = formattedTransaction.value / solTokens;

      return {
        walletTokens,
        solTokens,
        walletTokenValueinUsdt,
        solValueinUsdt,
        value: formattedTransaction.value,
        time: formattedTransaction.time
      };
    } else {
      // throw new Error("No transaction data found.");
      return null;
    }
  } catch (error) {
    // console.error("❌ Error:", error);
    throw error; // Throw the error to be caught in the caller
  }
};


//commented 16-12-25
// const getWallets = async (req, res) => {
//   try {
//     const { tokenId, walletId, page = 1, limit = 10 } = req.query;

//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     if (isNaN(pageNumber) || pageNumber < 1) {
//       return res.status(400).json({ message: "Invalid page number" });
//     }
//     if (isNaN(limitNumber) || limitNumber < 1) {
//       return res.status(400).json({ message: "Invalid limit" });
//     }

//     // Base filter 
//     const filter = {};
//     if (tokenId) filter.tokenId = tokenId;
//     if (walletId) filter._id = walletId; 

//     // Count total
//     const count = await Wallet.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(count / limitNumber));

//     // Fetch wallets
//     const wallets = await Wallet.find(filter)
//       .populate("tokenId", "name")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     if (!wallets.length) {
//       return res.status(404).json({
//         message: "No wallets found for the given filters.",
//         count: 0,
//         totalPages: 0,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Add overview + last transaction for each wallet
//     for (const wallet of wallets) {
//       const walletOverview = await exports.getWalletOverview(wallet.walletAddress);
//       wallet.overview = walletOverview;

//       const walletTransaction = await exports.getWalletLastTransaction(wallet.walletAddress);
//       wallet.transaction = walletTransaction;
//     }

//     // Message
//     let message = "All wallets fetched successfully.";
//     if (tokenId && walletId)
//       message = "Wallet filtered by both tokenId and walletId fetched successfully.";
//     else if (tokenId)
//       message = `Wallets for token: ${wallets[0]?.tokenId?.name || "Token"} fetched successfully.`;
//     else if (walletId)
//       message = `Wallet with id: ${walletId} fetched successfully.`;

//     // Group by tokenId for totals ---
//     const tokenSummaries = {};

//     for (const wallet of wallets) {
//       const tokenKey = wallet.tokenId?._id?.toString() || "unknown";
//       const o = wallet.overview || {};

//       //calculate totalWallets before usage
//       const totalWallets = wallets.filter(w => w.tokenId?._id?.toString() === tokenKey).length;

//       if (!tokenSummaries[tokenKey]) {
//         tokenSummaries[tokenKey] = {
//           tokenId: tokenKey,
//           tokenName: wallet.tokenId?.name || "Unknown Token",
//           total_value: 0,
//           solValue: 0,
//           solValueInUSD: 0,
//           valueInTokens: 0,
//           valueInUSD: 0,
//           totalWallets
//         };
//       }

//       tokenSummaries[tokenKey].total_value += o.total_value || 0;
//       tokenSummaries[tokenKey].solValue += o.solValue || 0;
//       tokenSummaries[tokenKey].solValueInUSD += o.solValueInUSD || 0;
//       tokenSummaries[tokenKey].valueInTokens += o.valueInTokens || 0;
//       tokenSummaries[tokenKey].valueInUSD += o.valueInUSD || 0;
//     }

//     // Round totals
//     Object.values(tokenSummaries).forEach(sum => {
//       Object.keys(sum).forEach(k => {
//         if (typeof sum[k] === "number") sum[k] = Number(sum[k]
//           // .toFixed(4)
//         );
//       });
//     });

//     // Response
//     return res.status(200).json({
//       message,
//       count,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: wallets,
//       tokenSummaries: Object.values(tokenSummaries),
//     });

//   } catch (err) {
//     console.error("Error fetching wallets:", err);
//     return res.status(500).json({
//       message: "An error occurred while fetching wallets.",
//       error: err.message,
//     });
//   }
// };


//added on 06-01-2026


const getWallets = async (req, res) => {
  // console.log("getWallets");
  try {
    const { tokenId, walletId, walletAddress, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Base filter
    const filter = {};
    if (tokenId) filter.tokenId = tokenId;
    if (walletId) filter._id = walletId;
    if (walletAddress) filter.walletAddress = walletAddress;

    // Fetch ALL wallets first
    let wallets = await Wallet.find(filter)
      .populate("tokenId", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (!wallets.length) {
      return res.status(404).json({
        message: "No wallets found for the given filters.",
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Enrich wallets with overview + last transaction
    for (const wallet of wallets) {
      try {
        const walletOverview = await exports.getWalletOverview(wallet.walletAddress);
        wallet.overview = walletOverview;
      } catch (err) {
        console.error(`Error fetching overview for wallet ${wallet.walletAddress}:`, err.message);
        wallet.overview = {
          total_value: 0,
          solValue: 0,
          solValueInUSD: 0,
          valueInTokens: null,
          valueInUSD: null,
        };
      }

      try {
        const walletTransaction = await exports.getWalletLastTransaction(wallet.walletAddress);
        wallet.transaction = walletTransaction;
      } catch (err) {
        console.error(`Error fetching transaction for wallet ${wallet.walletAddress}:`, err.message);
        wallet.transaction = null;
      }
    }

    // wallets with overview + last transaction for speed optimization
    // wallets = await Promise.all(
    //   wallets.map(async (wallet) => {
    //     try {
    //       wallet.overview = await exports.getWalletOverview(wallet.walletAddress);
    //     } catch {
    //       wallet.overview = { total_value: 0 };
    //     }

    //     try {
    //       wallet.transaction = await exports.getWalletLastTransaction(wallet.walletAddress);
    //     } catch {
    //       wallet.transaction = null;
    //     }

    //     return wallet;
    //   })
    // );

    // GLOBAL SORTING
    //   wallets.sort((a, b) => {
    //   // First, sort by createdAt (newest first)
    //   const aCreated = new Date(a.createdAt || 0).getTime();
    //   const bCreated = new Date(b.createdAt || 0).getTime();

    //   if (aCreated !== bCreated) {
    //     return bCreated - aCreated; 
    //   }

    //   // If createdAt is the same, sort by total_value (highest first)
    //   const aVal = a.overview?.total_value ?? 0;
    //   const bVal = b.overview?.total_value ?? 0;

    //   if (aVal === 0 && bVal !== 0) return 1;
    //   if (aVal !== 0 && bVal === 0) return -1;

    //   return bVal - aVal;
    // });

    wallets.sort((a, b) => {
      const aVal = a.overview?.total_value ?? 0;
      const bVal = b.overview?.total_value ?? 0;

      const aHasBalance = aVal > 0;
      const bHasBalance = bVal > 0;

      // Rule 1: wallets WITH balance come first
      if (aHasBalance && !bHasBalance) return -1;
      if (!aHasBalance && bHasBalance) return 1;

      // Rule 2: both have balance → higher balance first
      if (aHasBalance && bHasBalance && aVal !== bVal) {
        return bVal - aVal;
      }

      // Rule 3: fallback → newest first
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();

      return bCreated - aCreated;
    });

    // AFTER SORTING → PAGINATE
    const start = (pageNumber - 1) * limitNumber;
    const end = start + limitNumber;

    const paginatedWallets = wallets.slice(start, end);

    // Prepare token summaries
    const tokenSummaries = {};

    for (const wallet of wallets) {
      const tokenKey = wallet.tokenId?._id?.toString() || "unknown";

      if (!tokenSummaries[tokenKey]) {
        tokenSummaries[tokenKey] = {
          tokenId: tokenKey,
          tokenName: wallet.tokenId?.name || "Unknown Token",
          total_value: 0,
          solValue: 0,
          solValueInUSD: 0,
          valueInTokens: 0,
          valueInUSD: 0,
          totalWallets: wallets.filter(
            (w) => w.tokenId?._id?.toString() === tokenKey
          ).length,
        };
      }

      const o = wallet.overview || {};

      tokenSummaries[tokenKey].total_value += o.total_value || 0;
      tokenSummaries[tokenKey].solValue += o.solValue || 0;
      tokenSummaries[tokenKey].solValueInUSD += o.solValueInUSD || 0;
      tokenSummaries[tokenKey].valueInTokens += o.valueInTokens || 0;
      tokenSummaries[tokenKey].valueInUSD += o.valueInUSD || 0;
    }

    let message;
    if (tokenId && walletId)
      message = "Wallet filtered by both tokenId and walletId fetched successfully.";
    else if (tokenId)
      message = `Wallets for token: ${wallets[0]?.tokenId?.name || "Token"} fetched successfully.`;
    else if (walletId)
      message = `Wallet with id: ${walletId} fetched successfully.`;
    else if (walletAddress)
      message = `Wallets for wallet address: ${walletAddress} fetched successfully.`;
    else
      message = "All wallets fetched successfully.";

    return res.status(200).json({
      // message: "All wallets fetched successfully.",
      message,
      count: wallets.length,
      totalPages: Math.ceil(wallets.length / limitNumber),
      currentPage: pageNumber,
      limit: limitNumber,
      data: paginatedWallets,
      tokenSummaries: Object.values(tokenSummaries),
    });

  } catch (err) {
    console.error("Error fetching wallets:", err.message);
    return res.status(500).json({
      message: "An error occurred while fetching wallets.",
      error: err.message,
    });
  }
};


//commented on 06-01-2026 
// const getWallets = async (req, res) => {
//   try {
//     const { tokenId, walletId, page = 1, limit = 10 } = req.query;

//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const skip = (pageNumber - 1) * limitNumber;

//     if (isNaN(pageNumber) || pageNumber < 1) {
//       return res.status(400).json({ message: "Invalid page number" });
//     }
//     if (isNaN(limitNumber) || limitNumber < 1) {
//       return res.status(400).json({ message: "Invalid limit" });
//     }

//     // Base filter 
//     const filter = {};
//     if (tokenId) filter.tokenId = tokenId;
//     if (walletId) filter._id = walletId;

//     // Count total
//     const count = await Wallet.countDocuments(filter);
//     const totalPages = Math.max(1, Math.ceil(count / limitNumber));

//     // Fetch wallets
//     const wallets = await Wallet.find(filter)
//       .populate("tokenId", "name")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNumber)
//       .lean();

//     if (!wallets.length) {
//       return res.status(404).json({
//         message: "No wallets found for the given filters.",
//         count: 0,
//         totalPages: 0,
//         currentPage: pageNumber,
//         limit: limitNumber,
//         data: [],
//       });
//     }

//     // Add overview + last transaction for each wallet
//     for (const wallet of wallets) {
//       try {
//         const walletOverview = await exports.getWalletOverview(wallet.walletAddress);
//         wallet.overview = walletOverview;
//       } catch (err) {
//         console.error(`Error fetching overview for wallet ${wallet.walletAddress}:`, err.message);
//         wallet.overview = {
//           total_value: 0,
//           solValue: 0,
//           solValueInUSD: 0,
//           valueInTokens: null,
//           valueInUSD: null
//         };
//       }

//       try {
//         const walletTransaction = await exports.getWalletLastTransaction(wallet.walletAddress);
//         wallet.transaction = walletTransaction;
//       } catch (err) {
//         console.error(`Error fetching transaction for wallet ${wallet.walletAddress}:`, err.message);
//         wallet.transaction = null;
//       }
//     }

//     // Message
//     let message = "All wallets fetched successfully.";
//     if (tokenId && walletId)
//       message = "Wallet filtered by both tokenId and walletId fetched successfully.";
//     else if (tokenId)
//       message = `Wallets for token: ${wallets[0]?.tokenId?.name || "Token"} fetched successfully.`;
//     else if (walletId)
//       message = `Wallet with id: ${walletId} fetched successfully.`;

//     // Group by tokenId for totals ---
//     const tokenSummaries = {};

//     for (const wallet of wallets) {
//       const tokenKey = wallet.tokenId?._id?.toString() || "unknown";
//       const o = wallet.overview || {};

//       //calculate totalWallets before usage
//       const totalWallets = wallets.filter(w => w.tokenId?._id?.toString() === tokenKey).length;

//       if (!tokenSummaries[tokenKey]) {
//         tokenSummaries[tokenKey] = {
//           tokenId: tokenKey,
//           tokenName: wallet.tokenId?.name || "Unknown Token",
//           total_value: 0,
//           solValue: 0,
//           solValueInUSD: 0,
//           valueInTokens: 0,
//           valueInUSD: 0,
//           totalWallets
//         };
//       }

//       tokenSummaries[tokenKey].total_value += o.total_value || 0;
//       tokenSummaries[tokenKey].solValue += o.solValue || 0;
//       tokenSummaries[tokenKey].solValueInUSD += o.solValueInUSD || 0;
//       tokenSummaries[tokenKey].valueInTokens += o.valueInTokens || 0;
//       tokenSummaries[tokenKey].valueInUSD += o.valueInUSD || 0;
//     }

//     // Round totals
//     Object.values(tokenSummaries).forEach(sum => {
//       Object.keys(sum).forEach(k => {
//         if (typeof sum[k] === "number") sum[k] = Number(sum[k]
//           // .toFixed(4)
//         );
//       });
//     });

//     // Response
//     return res.status(200).json({
//       message,
//       count,
//       totalPages,
//       currentPage: pageNumber,
//       limit: limitNumber,
//       data: wallets,
//       tokenSummaries: Object.values(tokenSummaries),
//     });

//   } catch (err) {
//     console.error("Error fetching wallets:", err);
//     return res.status(500).json({
//       message: "An error occurred while fetching wallets.",
//       error: err.message,
//     });
//   }
// };


const getWalletReports = async (req, res) => {
  try {
    const { walletAddress, startTime, page = 1, limit = 10 } = req.query;

    // Convert and validate pagination inputs
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Build filter
    const filter = {};
    if (walletAddress) filter.walletAddress = walletAddress;
    if (startTime) filter.startTime = Number(startTime);

    // Count total reports
    const count = await WalletReport.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated reports
    const reports = await WalletReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!reports.length) {
      return res.status(404).json({
        message: "No wallet reports found for the given filters.",
        count: 0,
        totalPages: 0,
        page: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    let message;
    if (walletAddress && startTime) {
      message = `Reports for wallet ${walletAddress} (startTime: ${startTime}) fetched successfully.`;
    } else if (walletAddress) {
      message = `Reports for wallet ${walletAddress} fetched successfully.`;
    } else if (startTime) {
      message = `All wallet reports for startTime ${startTime} fetched successfully.`;
    } else {
      message = "All wallet reports fetched successfully.";
    }

    return res.status(200).json({
      message,
      count,
      totalPages,
      page: pageNumber,
      limit: limitNumber,
      data: reports,
    });
  } catch (err) {
    console.error("Error fetching wallet reports:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};


// const getTokenReports = async (req, res) => {
//   try {
//     const { tokenAddress, startTime } = req.query;
//     let filter = {};

//     // Filter by tokenAddress
//     if (tokenAddress) {
//       filter.tokenAddress = tokenAddress;
//     }

//     // Filter by from_time (string or number)
//     if (startTime) {
//       filter.from_time = startTime;
//     }

//     // Fetch reports
//     const reports = await TokenReport.find(filter).sort({ createdAt: -1 });

//     if (!reports.length) {
//       return res.status(404).json({
//         message: "No token reports found for the given filters.",
//         data: [],
//       });
//     }

//     // Dynamic message
//     let message;
//     if (tokenAddress && startTime) {
//       message = `Reports for token ${tokenAddress} (from_time: ${startTime}) fetched successfully.`;
//     } else if (tokenAddress) {
//       message = `Reports for token ${tokenAddress} fetched successfully.`;
//     } else if (startTime) {
//       message = `All token reports for from_time ${startTime} fetched successfully.`;
//     } else {
//       message = "All token reports fetched successfully.";
//     }

//     return res.status(200).json({
//       message,
//       count: reports.length,
//       data: reports,
//     });
//   } catch (err) {
//     console.error("Error fetching token reports:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request.",
//       error: err.message,
//     });
//   }
// };


const getTokenReports = async (req, res) => {
  try {
    const { tokenAddress, startTime, page = 1, limit = 10 } = req.query;

    // Validate and parse pagination params
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit" });
    }

    // Build filter
    const filter = {};
    if (tokenAddress) filter.tokenAddress = tokenAddress;
    if (startTime) filter.from_time = startTime;

    // Count total reports
    const count = await TokenReport.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(count / limitNumber));

    // Fetch paginated reports
    const reports = await TokenReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    if (!reports.length) {
      return res.status(404).json({
        message: "No token reports found for the given filters.",
        count: 0,
        totalPages: 0,
        page: pageNumber,
        limit: limitNumber,
        data: [],
      });
    }

    // Dynamic message
    let message;
    if (tokenAddress && startTime) {
      message = `Reports for token ${tokenAddress} (from_time: ${startTime}) fetched successfully.`;
    } else if (tokenAddress) {
      message = `Reports for token ${tokenAddress} fetched successfully.`;
    } else if (startTime) {
      message = `All token reports for from_time ${startTime} fetched successfully.`;
    } else {
      message = "All token reports fetched successfully.";
    }

    // Final response
    return res.status(200).json({
      message,
      count,
      totalPages,
      page: pageNumber,
      limit: limitNumber,
      dataLength: reports.length,
      data: reports,
    });
  } catch (err) {
    console.error("Error fetching token reports:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};


const addCompoundWallet = async (req, res) => {
  try {
    const { walletId, walletAddress, status } = req.body;
    console.log(req.body);

    if (walletId) {
      const existingCompoundWallet = await CompoundWallet.findById(walletId);

      if (!existingCompoundWallet) {
        return res.status(404).json({ message: "Compound wallet not found" });
      }

      existingCompoundWallet.walletAddress = walletAddress;
      existingCompoundWallet.status = status;
      await existingCompoundWallet.save();

      return res.status(200).json({
        message: "Compound wallet updated successfully",
        data: existingCompoundWallet
      });

    } else {
      const alreadyExists = await CompoundWallet.findOne({ walletAddress });
      if (alreadyExists) {
        return res.status(400).json({
          message: "Compound wallet already exists"
        });
      }

      const newCompoundWallet = new CompoundWallet({
        walletAddress,
        status
      });

      await newCompoundWallet.save();

      return res.status(201).json({
        message: "Compound wallet added successfully",
        data: newCompoundWallet
      });
    }

  } catch (error) {
    console.error("Error adding compound wallet:", error);
    return res.status(500).json({
      message: "Failed to add compound wallet",
      error: error.message
    });
  }
};


const getCompoundWallets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const filterConditions = {};
    for (let key in filters) {
      if (filters[key]) {
        filterConditions[key] = { $regex: filters[key], $options: "i" };
      }
    }
    const compoundWallets = await CompoundWallet.find(filterConditions)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const totalCount = await CompoundWallet.countDocuments(filterConditions);

    res.status(200).json({
      totalCount,
      currentPage: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
      data: compoundWallets,
    });
  } catch (error) {
    console.error("Error fetching compound wallets:", error);
    res.status(500).json({ message: "Failed to fetch compound wallets", error: error.message });
  }
};


// const createOrUpdateSettings = async (req, res) => {
//   try {
//     const {
//       settingId,
//       usdMin,
//       usdMax,
//       gasFeePercentage,
//       tierFeePercentage,
//       lpRewardPercentage,
//       tipAmount,
//       amount,
//       status,
//       lpRewardPool
//     } = req.body;
//     console.log("Creating or updating settings:", req.body);


//     // For creation, make sure all fields exist
//     if (!usdMin || !usdMax || !gasFeePercentage || !tierFeePercentage || !lpRewardPercentage || !tipAmount || !amount || !status || !lpRewardPool) {
//       return res.status(400).json({ message: 'All fields are required for creating new settings.' });
//     }

//     // If updating
//     if (settingId) {
//       const updatedSetting = await Settings.findByIdAndUpdate(
//         settingId,
//         {
//           ...(usdMin && { usdMin }),
//           ...(usdMax && { usdMax }),
//           ...(gasFeePercentage && { gasFeePercentage }),
//           ...(tierFeePercentage && { tierFeePercentage }),
//           ...(lpRewardPercentage && { lpRewardPercentage }),
//           ...(tipAmount && { tipAmount }),
//           ...(amount && { amount }),
//           ...(status && { status }),
//           ...(lpRewardPool && { lpRewardPool })
//         },
//         { new: true } // return updated doc
//       );

//       if (!updatedSetting) {
//         return res.status(404).json({ message: 'Setting not found.' });
//       }

//       return res.status(200).json({
//         message: 'Settings updated successfully.',
//         data: updatedSetting,
//       });
//     }

//     // Before creating new, set all old settings to inactive
//     await Settings.updateMany({}, { $set: { status: false } });

//     // If creating new setting
//     const newSetting = await Settings.create({
//       usdMin,
//       usdMax,
//       gasFeePercentage,
//       tierFeePercentage,
//       lpRewardPercentage,
//       tipAmount,
//       amount,
//       status,
//       lpRewardPool
//     });

//     return res.status(201).json({
//       message: 'Settings created successfully.',
//       data: newSetting,
//     });
//   } catch (error) {
//     console.error('Error in createOrUpdateSettings:', error);
//     return res.status(500).json({
//       message: 'An error occurred while processing your request.',
//       error: error.message,
//     });
//   }
// };


const createOrUpdateSettings = async (req, res) => {
  try {
    const {
      settingId,
      usdMin,
      usdMax,
      gasFeePercentage,
      tierFeePercentage,
      lpRewardPercentage,
      tipAmount,
      amount,
      lpRewardPool,
      status
    } = req.body;

    if (settingId) {
      const updated = await Settings.findByIdAndUpdate(
        settingId,
        {
          usdMin,
          usdMax,
          gasFeePercentage,
          tierFeePercentage,
          lpRewardPercentage,
          tipAmount,
          amount,
          lpRewardPool,
          status
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Setting not found" });
      }

      return res.json({
        message: "Updated successfully",
        data: updated
      });
    }

    if (
      usdMin === undefined ||
      usdMax === undefined ||
      gasFeePercentage === undefined ||
      tierFeePercentage === undefined ||
      lpRewardPercentage === undefined ||
      tipAmount === undefined ||
      amount === undefined ||
      lpRewardPool === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await Settings.updateMany(
      { status: true },
      { $set: { status: false } }
    );

    const created = await Settings.create({
      usdMin,
      usdMax,
      gasFeePercentage,
      tierFeePercentage,
      lpRewardPercentage,
      tipAmount,
      amount,
      lpRewardPool,
      status: true
    });

    return res.status(201).json({
      message: "Created successfully",
      data: created
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({ status: true });

    if (!settings) {
      return res.status(404).json({
        status: "error",
        message: "No active settings found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};


const adminLogout = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Admin Logged Out Successfully!"
    })

  } catch (err) {
    console.error("Error logging out admin:", err);
    return res.status(500).json({ message: "An error occurred while processing your request." });

  }
}


// const CreateAndUpdatePoolWalletData = async (req, res) => {
//   try {
//     const { updateId, poolId, poolWalletAddress, innerWalletAddress, } = req.body;

//     if (!poolId || !poolWalletAddress || !innerWalletAddress) {
//       return res.status(400).json({
//         message: "Please provide all required fields."
//       })
//     }

//     if (updateId) {
//       await PoolWalletData.findByIdAndUpdate(updateId, {
//         poolId,
//         poolWalletAddress,
//         innerWalletAddress,
//       }
//       )
//       return res.status(200).json({
//         message: "PoolWalletData Updated Successfully",
//         data: {
//           poolId,
//           poolWalletAddress,
//           innerWalletAddress,
//         }
//       })
//     }

//     const checkLiquidityPool = await rwaPools.find({ poolId })

//     if (!checkLiquidityPool) {
//       return res.status(400).json({
//         message: 'LiquidityPool Not Found'
//       })
//     }

//     await PoolWalletData.create({
//       poolId,
//       poolWalletAddress,
//       innerWalletAddress,
//     })
//     return res.status(200).json({
//       message: "PoolWalletData Created Successfully",
//       data: {
//         poolId,
//         poolWalletAddress,
//         innerWalletAddress,
//       }
//     })

//   } catch (err) {
//     console.error("Error creating/updating pool wallet data:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request."
//     });
//   }
// };


const CreateAndUpdatePoolWalletData = async (req, res) => {
  try {
    const { updateId, poolId, poolWalletAddress, innerWalletAddress } = req.body;

    if (!poolId || !poolWalletAddress || !innerWalletAddress) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const checkLiquidityPool = await rwaPools.findById({ _id: poolId });
    if (!checkLiquidityPool) {
      return res.status(400).json({ message: "LiquidityPool Not Found" });
    }

    if (updateId) {
      await PoolWalletData.findByIdAndUpdate(updateId, {
        poolId,
        poolWalletAddress,
        innerWalletAddress,
      });
      return res.status(200).json({
        message: "PoolWalletData Updated Successfully",
        data: { poolId, poolWalletAddress, innerWalletAddress },
      });
    }

    await PoolWalletData.create({
      poolId,
      poolWalletAddress,
      innerWalletAddress,
    });

    return res.status(200).json({
      message: "PoolWalletData Created Successfully",
      data: { poolId, poolWalletAddress, innerWalletAddress },
    });
  } catch (err) {
    console.error("Error creating/updating pool wallet data:", err);
    return res.status(500).json({ message: "An error occurred while processing your request." });
  }
};


// const getPoolWalletData = async (req, res) => {
//   try {
//     const { poolWalletId } = req.query;
//     let filter = {};
//     if (poolWalletId) {
//       filter._id = poolWalletId
//     }
//     let poolWalletData = await PoolWalletData.find(filter).sort({ createdAt: -1 })
//     // .populate("poolId","poolId");
//     if (!poolWalletData.length) {
//       return res.status(404).json({
//         message: "No Data Found"
//       })
//     }
//     return res.status(200).json({
//       message: "Pool Wallet Data Fetched Successfully",
//       data: poolWalletData
//     })

//   } catch (err) {
//     console.error("Error getting pool wallet data:", err);
//     return res.status(500).json({
//       message: "An error occurred while processing your request."
//     });
//   }
// }


const getPoolWalletData = async (req, res) => {
  try {
    const { poolWalletId, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    let filter = {};
    if (poolWalletId) {
      filter._id = poolWalletId;
    }

    // Get total count for pagination
    const totalCount = await PoolWalletData.countDocuments(filter);

    // Fetch data with pagination and sorting
    const poolWalletData = await PoolWalletData.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    // .populate("poolId", "poolId");

    if (!poolWalletData.length) {
      return res.status(404).json({
        message: "No Data Found",
      });
    }

    return res.status(200).json({
      message: "Pool Wallet Data Fetched Successfully",
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
      totalRecords: totalCount,
      data: poolWalletData,
    });

  } catch (err) {
    console.error("Error getting pool wallet data:", err);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: err.message,
    });
  }
};




module.exports = {
  adminSignup,
  adminLogin,
  updateUserProfile,
  // getAllActivities,
  createNetwork,
  updateNetwork,
  getNetworks,
  createPlatform,
  updatePlatform,
  getPlatforms,
  createToken,
  updateToken,
  getTokens,
  getSingleAndAllUsers,
  deleteUserById,
  updateUserById,
  addWallet,
  getWallets,
  getWalletReports,
  getTokenReports,
  createOrUpdateSettings,
  getSettings,
  adminLogout,
  CreateAndUpdatePoolWalletData,
  getPoolWalletData,
  addCompanyWallet,
  getCompanyWallets,
  addCompoundWallet,
  getCompoundWallets

};