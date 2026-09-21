# OneBank Web: product

OneBank is BCEL's shared-account banking: a **group** holds accounts that several people can see or use. Each person gets a **role** that decides what they may do and who must approve it. OneBank Web is the desktop front end for it.

This build is a **standalone front end on mock data**. It does not talk to the BCEL One core. Every screen works end to end against an in-browser mock backend (`src/lib/api/mock`), which makes it usable as a clickable prototype, a design reference and the base for connecting a real backend.

## Who it is for

| User | Context | What they come to do |
|---|---|---|
| **Business owner / admin** | Office desk, laptop | Sets up the group, adds members, decides who can pay and who approves |
| **Finance staff (maker)** | Office desk, daily | Pays suppliers and salaries, settles bills, writes e-cheques |
| **Approver** | Desk or between meetings | Clears the pending queue: approves, or rejects with a reason |
| **Family / association member** | Home, occasional | Checks the balance and statement, makes the odd transfer |

Lao is the primary language; English, Chinese and Vietnamese are also available.

## Core concepts

- **Group** (OneBank): a named set of accounts and members. A user can belong to several groups and switches between them with the tabs in the top bar.
- **Account**: a real BCEL account added to the group from a personal account. The group can also hold two derived kinds:
  - a **main (virtual)** account, which sits on top of a real account;
  - a **shadow** account, which is a separate ledger.
  Any account can be locked, renamed with an alias, or removed.
- **Member**: a person in the group, added by the member code their app shows. They are the Owner, an Admin, or a Member.
- **Role / permission**: what a set of members may do on a set of accounts:
  - view only, or transact;
  - which functions they may use;
  - spending limits, per transaction and per day;
  - **approval levels**: each level needs either all of its approvers or at least N of them.
- **Pending authorization**: a transaction made under a role with approval levels waits until enough approvers agree. One rejection ends it, and the maker sees the reason.

## What you can do (every screen)

| Area | Route | What happens |
|---|---|---|
| Login | — | QR login (a simulated scan) or username + password; any credentials work in demo mode |
| Home | `/` | Spending chart, spending share, balances, shortcuts, services, week calendar with that day's transactions |
| Messages | `/messages`, `/messages/:id` | Inbox of transaction notifications; a receipt-style detail with Print / Share |
| Pending authorization | `/authorization`, `/authorization/history` | Approve or reject (with a reason) what waits on you; edit, cancel or file away what you made; history of both |
| Manage permissions | `/role` | Create, edit and delete roles: type, accounts, functions, limits, approval levels, members |
| Accounts | `/account` | Group accounts; add from personal, open main or shadow, lock, alias, remove |
| Manage members | `/member` | Search and filter members, change a member's role, see their accounts, remove; add a member (find by code → view or full access → accounts / role) |
| Edit group | `/group` | Picture, name and description |
| Create OneBank | `/register` | Intro → terms → choose accounts → group details |
| Join / leave a group | `/group/join`, `/group/leave` | Show a join code for an owner; leave a group, with a warning |
| Statement | `/statement` | Available balance, date range, category filters, day-grouped table, CSV export |
| Transfer | `/transfer` | One or several recipients, recent / favourite recipients, quick amounts, drafts, scheduling, confirmation |
| International transfer | `/transfer/interbank` | IBAN, SWIFT, address, who pays the fee |
| Transfer to ID card | `/transfer/idcard` | Cash pickup at a BCEL branch or BCOME agent |
| Salary & file transfer | `/salary` | Upload a CSV, preview (bad rows flagged), confirm with an OTP |
| E-Cheque | `/echeque` | Cheque books, write → preview → issue with a QR, cheques received, issued and received history, buy a book |
| Electricity / Water | `/bill/electricity`, `/bill/water` | Look up a bill by customer number and pay all or part of it |
| Top-up phone | `/topup` | Number (carrier detected from the prefix), recent numbers, quick amounts |
| Other services | `/service/:key` | Services the web design doesn't cover (leasing, insurance, taxes…) open an explanatory page, never a blank one |

## Demo behaviour worth knowing

- **Seed data** is generated relative to today, so the calendar, statement and pending queue always look current. It is also seeded deterministically, so a reload shows the same data.
- **State persists per browser tab** (sessionStorage). Logging out resets the demo.
- **Approval.** In *ບໍລິສັດ ນາມສົມມຸດ ຈຳກັດ* your role needs one other approver, so your transfers wait. The groups *ຮ້ານ ພູວົງ* and *ຄອບຄົວ* have no approvers, so transfers there execute at once. Because a demo has no second person:
  - a pending transfer you made offers **"approve as the next approver"**;
  - the Join page offers **"play the owner and let me in"**.
- **Demo values:**
  - Member codes: `2045`, `3312`, `7788`.
  - Group join code: `JG-5050`, or the code the Join page shows.
  - OTP: any 6 digits.

## Out of scope for this build

These are deliberate, not missing work:

- **No real backend.** Replace `mockTransport` in `src/lib/api/client.ts` to connect one.
- **The QR codes are decorative.** They encode nothing.
- **Salary upload reads CSV only.** Save an Excel sheet as CSV first.
- **No mobile app parity.** The mobile app is the separate `onebank-ui` repo.
