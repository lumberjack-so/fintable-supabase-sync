# Google Sheets → Supabase Daily Sync

The **goal** of this guide is to help *anyone*—even if you have **zero coding background**—move data from Google Sheets into Supabase automatically **once per day**.

You will:
1. 🏗️ Create a **Supabase** project (free tier is fine).
2. 🛠️ Run a provided SQL script to create the `accounts` & `transactions` tables.
3. 🔑 Grab your **Service Role Key** *and* project URL (a.k.a. Project ID).
4. 📄 Open the **Fintable Google Sheet template** and make your own copy.
5. ✂️ Open that Sheet's **Apps Script** editor.
6. 📋 Paste in the `supabase_sync.gs` script.
7. ✍️ Replace the placeholder `<YOUR_PROJECT_ID>` with your real one.
8. 🔐 Save the Service Role Key as a **script property**.
9. ⏰ Add a *daily* time-based trigger.
10. ▶️ Save & run once to verify everything works.

If you can copy, paste, and click around a UI—you can do this! 💪

---

## 1.  Prerequisites

| What you need         | Why                                      |
|-----------------------|-------------------------------------------|
| A **Fintable** account| Grants access to the official Sheet template |
| A **Supabase** project| The destination database                 |
| **Service Role Key**  | Needed for full read/write permissions   |
| A **Google** account  | To own the Sheet and Apps Script          |
| Basic spreadsheet data| Anything you want to sync (see step 2)    |

> ⚠️ **Security note**: The Service Role key can *bypass* Row-Level Security rules. Treat it like a password—never expose it publicly.

## Why sync to Supabase? 🤔

• **Plug-and-play with AI tools** — Once your data lives in Supabase you can point any Supabase-compatible MCP server at it and instantly query from AI clients such as *Claude Desktop*.

• **Unlimited financial reports on demand** — Claude Desktop's reasoning models can slice, dice, and visualise your `accounts` & `transactions` tables into *any* report or analysis you can describe—no SQL skills required.

• **A real-world example** — I (David) automate my personal finances by piping Slack messages straight to Claude Desktop, which then pulls fresh numbers from Supabase and returns charts, insights, and next-action recommendations. I documented the full workflow here: <https://lumberjack.so/p/how-to-be-ai-first-with-claude-desktop>.

In short: syncing once per day keeps your Sheet as the single source of truth while unlocking **AI-powered dashboards and decision-making** everywhere else.

---

## 2. Create the tables in Supabase

1. Log into the Supabase dashboard.
2. Open **SQL Editor** ➜ click **+ New Query**.
3. Copy-paste the SQL below **exactly as-is** and hit **Run**.
4. You should see "Success" for each statement.

```sql
-- 🔨 ACCOUNTS TABLE
create table if not exists public.accounts (
  account_id   text primary key,
  name         text,
  type         text,
  balances     jsonb,
  created_at   timestamptz default now()
);

-- 🔨 TRANSACTIONS TABLE
create table if not exists public.transactions (
  transaction_id text primary key,
  account_id     text references public.accounts(account_id) on delete cascade,
  amount         numeric,
  currency       text,
  date           date,
  description    text,
  created_at     timestamptz default now()
);
```

Feel free to tweak columns later—just keep **`account_id`** and **`transaction_id`** as the primary keys.

---

## 3. Prepare your Google Sheet

1. Sign up for Fintable to get their **Fintable Google Sheet template**: <https://fintable.io>. 
2. In the top-left menu choose **File → Make a copy…** ➜ give it any name you like.  
   This copy is now *yours*; you can edit it freely.
3. The template already contains `Accounts` and `Transactions` tabs with the correct header rows—no renaming needed.
4. (Optional) Add or modify a few sample rows so you'll see changes after the first sync.
5. Configure your bank connections to Fintable and set up categorization rules if you haven't yet.

---

## 4. Add the Apps Script

1. In the Google Sheet menu click **Extensions → Apps Script**.
2. Delete any placeholder code.
3. Copy **`supabase_sync.gs`** from this repo (or the code block provided) and **paste** it into the editor.
4. Replace the placeholder URL:
   ```js
   const SUPABASE_URL = 'https://<YOUR_PROJECT_ID>.supabase.co';
   ```
   ‑> Example: `https://abcd1234.supabase.co`
5. Click **Save** (floppy-disk icon or `Ctrl/⌘+S`).

### Store the Service Role key (securely)

1. In the left sidebar click **Project Settings (⚙️)**.
2. Scroll to **Script Properties** ➜ click **Add property**.
3. Name: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: *(paste your actual Service Role key)*
5. Click **Save Property**.

⚠️ *Do NOT store the key directly in the code.* Keeping it in properties prevents accidental leaks if you share the sheet.

---

## 5. Authorize & test the sync

1. Back in the editor, select the function **`syncAllFintableData`** from the dropdown.
2. Click the **Run ▶️** button.
3. The first time, Google will ask for **permissions**. Follow the prompts and choose your account. (You may need to click *Advanced → Go to project*.)
4. After it runs, open Supabase **Table Editor**. You should see your rows appear!

---

## 6. Schedule the *daily* trigger

1. Still in Apps Script, click **Triggers (⏱️ clock icon)** in the left sidebar.
2. Click **+ Add Trigger** (bottom-right).
3. Configure:
   - **Choose which function to run**: `syncAllFintableData`
   - **Select event source**: *Time-driven*
   - **Select type of time-based trigger**: *Day timer*
   - **Select time of day**: Pick any hour you like.
4. Click **Save**.

That's it! Your sheet will sync to Supabase once every day.

> Pro-tip: If you want hourly or weekly cadence, simply change the trigger type.

---

## 7. FAQs

**Q: The script says `Sheet "Accounts" not found`.**  
A: Double-check the tab names spell **exactly** `Accounts` & `Transactions` (case matters).

**Q: Can I add more tables?**  
A: Yup! Duplicate one of the objects in `SHEET_CONFIGS` inside the script and adjust `sheetName`, `tableName`, and `primaryKey`.

**Q: Is it safe to use the Service Role key here?**  
A: Apps Script runs server-side under your Google account. As long as your Sheet isn't shared publicly and you store the key in Script Properties, risk is minimal.

**Q: How do I stop syncing?**  
A: Delete or disable the trigger: Apps Script ➜ Triggers ➜ click the 3-dot menu ➜ *Delete/Disable*.

---

## 8. Troubleshooting tips

1. Open **Apps Script → Executions** to see logs & errors.
2. Verify your Supabase project URL & key are correct.
3. Make sure there are *no completely empty rows* in your data range—blank rows are skipped but large gaps can be confusing.
4. Check Supabase **Logs → API** for any rejected requests.

---

## 9. License

Released under the MIT License. Feel free to fork, remix, and share.

### 🪓 Made with love at [Lumberjack](https://lumberjack.so)
Helping non-technical generalists become confident builders, one copy-paste at a time. 