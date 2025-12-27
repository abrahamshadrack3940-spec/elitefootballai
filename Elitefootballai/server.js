require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require ("axios");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;


//Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname)));

let livePredictions = [];

//--- HELPER FUNCTIONS--

//1. Get Daraja OAuth Token async function getDarajaToken() {
    const consumerKey =
  process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`$
  {consumerKey}:${consumerSecret}`).toString
  ("base64");
  
  try {
    const resp = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {headers: {Authorization: `Basic ${auth}` }}
    );
    return resp.data.access_token;
   } catch (err) {
     console.error("Error getting Daraja Token:",err.response?.data || err.message);
     throw err;
   }
}

// 2.Log Transactions to File function logTransaction(type,amount,phone,status) {
  const tx = {
    time: new Date().toLocaleString(),
    type,amount,phone,status
  };
  try{
    let transactions = [];
    if(fs.existsSync('transactions.json'))
    {
      const data =
      fs.readFileSync('transactions.json');
      transactions = JSON.parse(data);
    }
    transactions.push(tx);
    fs.writeFileSync('transactions.json',JSON.stringify(transactions, null,2));
    console.log(`NEW TRANSACTION: 
    ${type} - ${amount} KES from $
    {phone} [${status}]`);
    }catch (err) {
      console.error("Logging error:",err.message);
    }
  }

//Endpoints
app.get("/api/livescores",(req,res)=> {
  const sampleScores = [
    {id: 1,match: "Arsenal vs Chelsea", score: "2-1", minute:"78"},
    {id: 2,match: "Barcelona vs Sevilla",
      score: "1-1", minute: "65"}
      ];
      res.json({status:"ok", data: sampleScores});
});

app.post("/api/mpesa/stkpush", async(req,res)=>{
  const {phone, amount} =req.body;
  if(!phone || !amount) {
    return res.status(400).json({status: "error",message: "Missing phone or amount"});
  }
  try {
    const token = await
    getDarajaToken();
    const timestamp = new
    Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE
      + process.env.MPESA_PASSKEY + timestamp).toString("base64");
      
      const payload = {
        BusinessShortCode:
    process.env.MPESA_SHORTCODE,
        PassWord: password,
        Timestamp: timestamp,
        TransactionType:
        "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB:
    process.env.MPESA_SHORTCODE,
       PhoneNumber: phone,
       CallBackURL:
   process.env.MPESA_CALLBACK_URL,
       AccountReference:
       "EliteFootballAI",
       TransactionDesc: "payment for VIP tips"
      };
      
      const resp = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", payload,
        {headers: {Authorization: `Bearer ${token}`}}
        );
        
        logTransaction("STK_PUSH",
        amount,phone, "pending");
        res.json({status:"ok", message:"STK Push sent successfully", data:resp.data});
  }catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({status: "error", message:"STK Push failed"});
  }
});

// 1. Get Predictions from JSON file
app.get("/api/predictions", (req,res)=>{
  try {
    const data = JSON.parse(fs.readFileSync("predictions.json"));
    res.json({status:"ok", data:data.predictions});
  } catch (err) {
    res.status(500).json({status: "error", message: "Could not load predictions"});
  }
  });

// 2. MPESA Callback (safaricom sends results here)
app.post("/api/mpesa/callback", (req,res)=>{
  const callbackData =
  req.body.Body.stkCallback;
  const phone = callbackData.callbackMetadata?.item.find(i=>i.name=== "PhoneNumber")?.value;
  const amount = callbackData.callbackMetadata?.item.find(i=>i.name === "Amount")?.value;
  
  if(callbackData.ResultCode === 0) {
    logTransaction("STK_CALLBACK", amount,phone, "Success");
    // Here you would typically unlock the tips for the user in a database
  }else {
    logTransaction("STK_CALLBACK", amount,phone, "failed");
     }
     res.json({ResultCode: 0, ResultDesc: "Success"});
  });
  
  const {OpenAI} = require("openai");

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY,});

//Endpoint to generate AI Ads
app.post("/api/generate-ad", async(req,res)=>{
  const {prompt} = req.body;
  if(!prompt) return
  res.status(400).json({error: "Prompt is required"});
  
  try {
    const completion = await
    openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages:[
        {role: "System", content: "You are a marketing expert for a football prediction site."},
        {role: "User", content: Write a short, catchy sports betting ad based on this:  ${prompt}}
        ],
        max_tokens: 100,
    });
    const adText =
    completion.choices[0].message.content;
    res.json({status:"ok", ad: adText});
  } catch(err) {
    console.error("AI Error:", err.message);
    res.status(500).json({status:"error", message:"AI generation failed"});
  }
});

app.listen(PORT, ()=>
console.log(`Server running on port ${PORT}`));
