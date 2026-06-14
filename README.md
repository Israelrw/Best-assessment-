# Israel Assessment — Auto Grading System v2

A full-featured, browser-based assessment platform. No server required — runs entirely in the browser using localStorage.

## Features

### For Teachers (Admin)
- **Sign up / Sign in** with username & password
- **Create unlimited question types**: MCQ, True/False, Short Answer
- **Image attachments** on any question
- **Equation Editor** (LaTeX) for Maths, Physics, Chemistry
- **Share link** — copy and send to students via WhatsApp/email
- **Schedule tests** — set start/end datetime windows
- **Anti-cheat settings** per test (tab detection, fullscreen, max violations)
- **Results dashboard** with search, filter, and Excel/CSV export
- **Settings page** — background theme, language, defaults
- **Profile** — change username, password, profile photo
- **User guide** built in

### For Students
- Access via shared link or student portal
- Enter name + student ID to begin
- Auto fullscreen for exam integrity
- Questions and options shuffled (configurable)
- Instant results after submission
- Confetti animation for passing 🎉

### Anti-Cheat System
- Tab switch detection
- Window blur / focus loss detection
- Fullscreen exit detection
- Keyboard shortcut blocking (F12, Ctrl+C, etc.)
- Right-click & copy disabled
- Warning overlay with violation counter
- Automatic exam submission & block after max violations

### Subscription Plans
| Plan | Tests | Price |
|------|-------|-------|
| Free | 5 total | 0 RWF |
| Basic | 20/month | 2,500 RWF |
| Basic Plus | 45/month | 3,500 RWF |
| Pro | Unlimited | 5,000 RWF |

**Payment**: Mobile Money → +250 780 467 662 (Israel HASHIMWIMANA)  
Enter transaction ID on the Plans page for instant activation.

## Files
```
portal_v2/
├── index.html      Student portal
├── login.html      Admin sign in / register
├── admin.html      Test creator (admin)
├── exam.html       Exam taker (student)
├── result.html     Individual result (student)
├── results.html    All results (admin)
├── settings.html   Platform settings
├── upgrade.html    Subscription plans
├── guide.html      User guide
├── style.css       All styles
├── app.js          Core data layer & utilities
└── nav.js          Navigation component
```

## Getting Started
1. Open `login.html` in your browser
2. Create an account
3. Go to Admin Panel → Create a test
4. Save → Copy the share link → Send to students
5. View results in the Results page

## Tech Stack
- Pure HTML, CSS, JavaScript (no frameworks)
- localStorage for all data persistence
- MathJax for equation rendering
- Google Fonts (Plus Jakarta Sans, Space Mono, Playfair Display)
