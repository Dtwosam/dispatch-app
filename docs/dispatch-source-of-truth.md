\# Dispatch Source of Truth



Last updated: 2026-06-27

Repo: `Dtwosam/dispatch-app`

Default branch: `main`

Live app: `https://dispatch-arc.vercel.app`



\## Purpose of this document



This document is the working source of truth for Dispatch.



Use it before making product, UX, code, deployment, roadmap, or bug-fix decisions. If older README copy, old hackathon language, or previous chat context conflicts with this file, follow this file unless the user explicitly says otherwise.



\## Product definition



Dispatch is a USDC-powered AI work marketplace on Arc Testnet.



The core product flow is:



1\. A user posts a task.

2\. The user funds the task.

3\. An AI agent completes the work.

4\. The user reviews the submitted work.

5\. Payment is released only after approval.

6\. Revision requests and disputes support the trust layer.



Dispatch is not just an AI agent directory.



Dispatch is a work, payment, review, dispute, and reputation layer for AI agents.



\## Product positioning



Dispatch exists because AI agents need more than prompts and demos before people trust them with paid work.



If agents are going to become useful workers, users need a clear marketplace flow around them:



\* task creation

\* funding

\* agent assignment

\* submitted work

\* review

\* approval

\* revision request

\* dispute

\* payment release

\* reputation



The simplest way to explain Dispatch:



> Post a task. Fund it. Let an agent work. Review the result. Release payment after approval.



\## Current user types



Dispatch should support two main user types.



\### Task posters



Task posters are users who create and fund work.



They need to clearly understand:



\* how to post a task

\* how to choose an agent or post to the marketplace

\* how much they are funding

\* what happens after funding

\* where to see active tasks

\* where to review submitted work

\* how to approve work

\* how to ask for changes

\* how to open a dispute

\* how payment release works



\### Agent owners / builders



Agent owners are users who create, connect, or manage agents.



They need to clearly understand:



\* where their agents are listed

\* whether an agent is ready

\* what setup is missing

\* what packages the agent offers

\* what tasks the agent has worked on

\* what earnings are settled, locked, or disputed

\* how to connect an external agent

\* how to test or verify agent setup



\## Dashboard direction



The dashboard should be a unified user dashboard, not only a builder dashboard.



Use:



\* `Dashboard` in navigation

\* not `Builder Dashboard`



The dashboard should be useful for both task posters and agent owners.



Recommended dashboard structure:



```text

Dashboard



Needs Attention block



Tabs:

My Tasks | My Agents | Earnings

```



\### Needs Attention



Needs Attention should be a top priority block, not a tab.



It should show only items that require action now.



Examples:



\* submitted work waiting for review

\* payment ready to release

\* revision response waiting for review

\* dispute needing attention

\* agent setup incomplete

\* endpoint check needed

\* owner wallet not verified



Each item should have:



\* short status

\* task or agent name

\* one short reason

\* one primary action



Do not make this noisy.



\### My Tasks



My Tasks is for task posters.



It should show tasks the user posted, funded, or needs to review.



It should make these states easy to understand:



\* waiting for agent

\* in progress

\* submitted for review

\* revision requested

\* payment ready

\* completed

\* disputed



Each task row/card should show:



\* task title

\* assigned agent or marketplace route

\* reward amount

\* task status

\* payment status

\* next action



Example actions:



\* View task

\* Review work

\* Ask for changes

\* Release payment

\* View dispute

\* View completed task



\### My Agents



My Agents is for agent owners and builders.



It should show agents the user created, connected, or can manage.



Each agent row/card should show:



\* agent name

\* agent type

\* readiness status

\* packages

\* paid tasks

\* earned USDC

\* next setup action



Example actions:



\* View profile

\* Complete setup

\* Connect agent

\* Run test

\* Create package



\### Earnings



Earnings is mainly for agent owners, but it can also show task-linked payment activity.



Use safe wording:



\* Earnings

\* Payment activity

\* Locked value

\* Settled earnings

\* Disputed value



Avoid calling anything “revenue” unless it is truly revenue.



Each payment row should show:



\* task title

\* agent

\* amount

\* payment state

\* settlement state

\* date if available

\* transaction link only if valid



Example payment states:



\* Locked

\* Ready to release

\* Released

\* Disputed

\* Waiting for payment update



\## UX rules



Dispatch should feel clean, premium, simple, and easy for normal users.



Do:



\* use short labels

\* use short helper text

\* make primary actions obvious

\* show one main action per row/card

\* keep dashboard tabs small

\* group related information clearly

\* make payment/review states easy to understand

\* use honest empty states

\* keep mobile layouts simple



Do not:



\* add noisy dashboards

\* add too many tabs

\* add long explanations everywhere

\* use fake-looking AI copy

\* use technical wording where normal wording works

\* make users guess where their task went after posting

\* hide important task/payment/review actions

\* make builder-only language dominate the full product



\## Typography and visual hierarchy



The homepage hero headline is the largest text in the product.



Do not reuse homepage hero display size on:



\* inner pages

\* dashboard

\* task pages

\* agent profiles

\* forms

\* cards

\* sections

\* subsections



Recommended hierarchy:



\* Homepage hero only: largest text

\* Inner page title: smaller than homepage hero

\* Section heading: smaller than inner page title

\* Card title: smaller again

\* Body/helper text: readable but not loud



\## Data honesty rules



Do not fake data.



Never fake:



\* users

\* task history

\* completed work

\* payments

\* revenue

\* earnings

\* ratings

\* reviews

\* approval rates

\* transaction hashes

\* balances

\* settlement status

\* endpoint health

\* verification status

\* agent performance

\* marketplace volume



If wallet-specific task history or ownership is not fully enabled, say it clearly with short copy.



Example:



> Showing tasks and agents visible in this demo. Wallet-specific history is not fully enabled yet.



Keep honesty notes short and calm.



\## Product logic locks



Do not change these unless explicitly requested:



\* backend routes

\* contracts

\* Arc chain config

\* wallet funding logic

\* settlement logic

\* payment release logic

\* Supabase schema

\* task lifecycle logic

\* review logic

\* revision logic

\* dispute logic

\* package logic

\* dashboard calculations

\* endpoint ownership proof logic

\* private keys

\* environment secrets



UX work should not quietly change product behavior.



\## Current known issues / watch areas



\### Approve work HTTP 429



There is a known issue where clicking `Approve work` can return HTTP 429 from the Render review endpoint.



Before fixing, investigate:



\* whether one click fires multiple requests

\* whether approve work is calling review/evaluation unnecessarily

\* whether duplicate clicks are allowed while approval is pending

\* whether retry logic is too aggressive

\* whether backend rate limiting is too strict

\* whether approval should reuse existing review data



Do not hide this error without fixing the root cause.



\### Startup loading



The long global `Loading Dispatch...` startup screen has been addressed by making route rendering non-blocking and hydrating market/task/wallet data in the background.



Do not reintroduce a full-app blocking loader for agents, tasks, leaderboard, Arc status, or wallet readiness.



\## Deployment rules



Do not deploy to production unless the user explicitly asks.



Production deployment command:



```powershell

npx vercel deploy --prod --yes

```



Live app:



```text

https://dispatch-arc.vercel.app

```



After `build:static`, restore static module churn if modified:



```powershell

git restore -- apps/web/.vercel-static/@modules

```



\## Standard checks



Run these before reporting a code/UX fix complete:



```powershell

node --test apps/web/src/ui-models.test.mjs

node --test apps/web/src/chain-client.test.mjs

npx tsc --project apps/web/tsconfig.json --noEmit

npm --workspace apps/web run build

npm --workspace apps/web run build:static

git restore -- apps/web/.vercel-static/@modules

git diff --check

```



If Windows file locks affect static build, stop Node first:



```powershell

taskkill /IM node.exe /F

npm --workspace apps/web run build:static

git restore -- apps/web/.vercel-static/@modules

```



\## Local preview



Preferred static preview flow:



```powershell

taskkill /IM node.exe /F

npm --workspace apps/web run build

npm --workspace apps/web run build:static

git restore -- apps/web/.vercel-static/@modules

npx serve apps/web/.vercel-static

```



Check:



```text

/

&#x20;/agents

&#x20;/post-task

&#x20;/dashboard

&#x20;/create-agent

&#x20;/connect-agent

```



For dashboard-specific work, check:



```text

/dashboard

```



For buyer task flow, check:



```text

/post-task

/tasks/:taskId

/dashboard

```



\## Agent/Codex instructions



Before making Dispatch changes:



1\. Read this file.

2\. Check the current repo state.

3\. Confirm the intended scope.

4\. Avoid unrelated product logic changes.

5\. Keep UX simple and honest.

6\. Run the required checks.

7\. Report files changed, behavior changed, and tests run.



Final reports should include:



\* root cause, if fixing a bug

\* files changed

\* what changed for users

\* what did not change

\* test/build results

\* preview instructions

\* deployment status



Do not deploy unless explicitly instructed.



