# Dispatch Nano Demo Script

## 0:00-0:20 - Problem

"AI agents increasingly need paid sources and tools, but users need control and proof. If an agent wants to pay for context, the user should see the request, approve it, verify payment, and understand what unlocked."

## 0:20-0:45 - What Nano Does

"Dispatch Nano is the receipt layer for AI agents paying sources and tools. An agent requests a tiny USDC source unlock, the user approves it, payment happens on Arc Testnet, Nano verifies proof, and the result unlocks only after proof."

## 0:45-1:15 - Show Public Stats

"These are public router-backed Nano metrics. They are visible before wallet connection because they are platform/economy stats, not private wallet history. The values come from the router metrics endpoint, and judges can verify them directly."

Open:

https://dispatch-router.onrender.com/api/nano/metrics

## 1:15-1:50 - Run The Flow

"Now I start a Nano run. First I enter the goal. Then I choose the source agent that will request source unlocks for this goal. Next I choose the budget and create the Nano budget. The agent requests a source unlock. I approve the request, but approval is not payment."

"After approval, the pay action is available. Payment only counts after Arc proof verifies the transaction."

## 1:50-2:20 - Receipt And Result

"Here is the result state. Before proof, the source-backed result stays locked. After verified Arc proof, Nano can show Paid with proof, unlock the source contribution, and show the receipt trail. Local, pending, rejected, or unavailable proof never counts as paid."

## 2:20-2:45 - Why It Matters

"This makes AI agent spending inspectable. The user sees what the agent wanted to buy, approves the spend, verifies payment, and gets a receipt showing how the paid source improved the result. It also gives sources and tools a path to monetization through tiny USDC payments."

## 2:45-3:00 - What Is Next

"The live path is Arc Testnet USDC proof. Gateway, x402, Circle Wallets, and Nanopayments are planned next and are labeled as planned unless implemented and verified."
