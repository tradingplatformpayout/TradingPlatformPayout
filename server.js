const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(path.join(__dirname, "tradingplatform...
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 phone TEXT,
 country TEXT,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 deposit_balance REAL NOT NULL DEFAULT 0,
 profit_balance REAL NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bank_details (
 id INTEGER PRIMARY KEY CHECK (id=1),
 bank_name TEXT NOT NULL DEFAULT '',
 account_name TEXT NOT NULL DEFAULT '',
 account_number TEXT NOT NULL DEFAULT '',
 bank_code TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS transactions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 type TEXT NOT NULL,
 amount REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const adminEmail = process.env.ADMIN_EMAIL || "admin@tradingplatformpayout.local";
const adminPassword = process.env.ADMIN_PASSWORD || "CHANGE_THIS_ADMIN_PASSWORD";

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
 secret: process.env.SESSION_SECRET || "change-this-session-secret",
 resave:false, saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"}
}));

function userView(u){
 return {id:u.id,name:u.name,phone:u.phone,country:u.country,email:u.email,status:u.status,
   depositBalance:u.deposit_balance,profitBalance:u.profit_balance,
   totalBalance:u.deposit_balance+u.profit_balance,createdAt:u.created_at};
}
function requireUser(req,res,next){if(!req.session.userId)return res.status(401).json({error:"Login required"});next();}
function requireAdmin(req,res,next){if(!req.session.admin)return res.status(403).json({error:"Administrator access required"});next();}

app.post("/api/register", async (req,res)=>{
 const {name,phone,country,email,password}=req.body;
 if(!name||!email||!password)return res.status(400).json({error:"Name, email and password are required"});
 try{
   const hash=await bcrypt.hash(password,12);
   const info=db.prepare("INSERT INTO users(name,phone,country,email,password_hash) VALUES(?,?,?,?,?)")
     .run(name.trim(),phone||"",country||"",email.trim().toLowerCase(),hash);
   res.json({ok:true,id:info.lastInsertRowid,status:"pending"});
 }catch(e){res.status(400).json({error:e.code==="SQLITE_CONSTRAINT_UNIQUE"?"Email is already registered":"Registration failed"});}
});

app.post("/api/login", async (req,res)=>{
 const {email,password}=req.body;
 if(email===adminEmail && password===adminPassword){
   req.session.admin=true; delete req.session.userId; return res.json({ok:true,role:"admin"});
 }
 const u=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").trim().toLowerCase());
 if(!u || !(await bcrypt.compare(password||"",u.password_hash)))return res.status(401).json({error:"Incorrect email or password"});
 if(u.status!=="approved")return res.status(403).json({error:`Account is ${u.status}.`});
 req.session.userId=u.id; delete req.session.admin;
 res.json({ok:true,role:"user",user:userView(u)});
});

app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/me",(req,res)=>{
 if(req.session.admin)return res.json({role:"admin"});
 if(req.session.userId){const u=db.prepare("SELECT * FROM users WHERE id=?").get(req.session.userId);return res.json({role:"user",user:userView(u)});}
 res.status(401).json({error:"Not logged in"});
});

app.get("/api/admin/users",requireAdmin,(req,res)=>{
 res.json(db.prepare("SELECT * FROM users ORDER BY created_at DESC").all().map(userView));
});
app.post("/api/admin/users/:id/status",requireAdmin,(req,res)=>{
 const {status}=req.body;if(!["approved","rejected","pending"].includes(status))return res.status(400).json({error:"Invalid status"});
 const info=db.prepare("UPDATE users SET status=? WHERE id=?").run(status,req.params.id);
 if(!info.changes)return res.status(404).json({error:"User not found"});
 res.json({ok:true});
});
app.post("/api/admin/users/:id/balance",requireAdmin,(req,res)=>{
 const {type,amount}=req.body;
 if(!["deposit","profit"].includes(type)||!Number.isFinite(Number(amount)))return res.status(400).json({error:"Invalid balance change"});
 const column=type==="deposit"?"deposit_balance":"profit_balance";
 const u=db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
 if(!u)return res.status(404).json({error:"User not found"});
 const next=u[column]+Number(amount);
 if(next<0)return res.status(400).json({error:"Balance cannot go below zero"});
 db.prepare(`UPDATE users SET ${column}=? WHERE id=?`).run(next,u.id);
 const updated=db.prepare("SELECT * FROM users WHERE id=?").get(u.id);
 res.json({ok:true,user:userView(updated)});
});

app.get("/api/admin/bank",requireAdmin,(req,res)=>res.json(db.prepare("SELECT * FROM bank_details WHERE id=1").get()||{}));
app.post("/api/admin/bank",requireAdmin,(req,res)=>{
 const {bankName,accountName,accountNumber,bankCode}=req.body;
 db.prepare(`INSERT INTO bank_details(id,bank_name,account_name,account_number,bank_code)
 VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET bank_name=excluded.bank_name,account_name=excluded.account_name,account_number=excluded.account_number,bank_code=excluded.bank_code`)
 .run(bankName||"",accountName||"",accountNumber||"",bankCode||"");
 res.json({ok:true});
});
app.get("/api/bank",requireUser,(req,res)=>res.json(db.prepare("SELECT bank_name as bankName,account_name as accountName,account_number as accountNumber,bank_code as bankCode FROM bank_details WHERE id=1").get()||{}));

app.get("/api/transactions",requireUser,(req,res)=>res.json(db.prepare("SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC").all(req.session.userId)));
app.use(express.static(path.join(__dirname,"public")));

app.get("/", (req, res) => {
  res.send("TradingPlatformPayout is running!");
});
app.listen(process.env.PORT||3000,()=>console.log("TradingPlatformPayout running on port "+(process.env.PORT||3000)));

